import openai from '@/lib/openai'
import { assertChatJsonContent } from '@/lib/openai/assert-chat-json-content'

const MAX_HTML_BYTES = 1_200_000
const MAX_TEXT_FOR_MODEL = 18_000
const FETCH_TIMEOUT_MS = 18_000

const SYSTEM = `Jesteś ekspertem e-commerce (PL) i audytorem listingów marketplace / sklepów.
Dostajesz SUROWY TEKST strony (po uproszczonym pobraniu) lub wklejkę od użytkownika — może być niepełny (np. strona renderowana w JS).

ZADANIE: Oceń listing jak dla sprzedawcy uczącego się na przykładzie konkurencji — bez kopiowania treści 1:1, bez podawania danych osobowych sprzedawcy.

ZASADY:
- Odpowiedź WYŁĄCZNIE JSON (bez markdown), schemat dokładnie jak w instrukcji użytkownika.
- overallScore: 0–100 (całość: tytuł, opis, struktura, przekonanie; jeśli mało danych — niższa pewność i krótsze listy).
- summary: 2–4 zdania po polsku.
- strengths / weaknesses / suggestions: po 2–6 krótkich punktów (konkret, nie ogólniki).
- platformGuess: jedna z: allegro, amazon, shopify, woocommerce, ebay, etsy, vinted, olx, empikplace, unknown.
- titleGuess: wykryty tytuł oferty lub krótki fragment nagłówka, max 200 znaków; jeśli niepewny — "".
- dataQuality: "good" | "partial" | "poor" — jak bardzo wiarygodny był materiał wejściowy.
- disclaimer: jedno zdanie, że to szacunek edukacyjny, nie gwarancja widoczności w wyszukiwarce.`

export type CompetitorListingAnalysis = {
  overallScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  titleGuess: string
  platformGuess: string
  dataQuality: 'good' | 'partial' | 'poor'
  disclaimer: string
}

export type PreparedListingContent = {
  text: string
  titleTag: string
  source: 'fetch' | 'paste'
  url?: string
  fetchOk?: boolean
  fetchError?: string
}

/** Podstawowa ochrona przed SSRF — tylko publiczne http(s), bez localhost i prywatnych zakresów. */
export function assertPublicHttpUrl(raw: string): URL {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    throw new Error('Nieprawidłowy adres URL.')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Dozwolone są tylko linki http(s).')
  }
  const host = u.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    throw new Error('Ten adres nie może być analizowany.')
  }
  if (/^(10\.|192\.168\.|127\.)/.test(host)) {
    throw new Error('Ten adres nie może być analizowany.')
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error('Ten adres nie może być analizowany.')
  }
  return u
}

function stripHtmlToText(html: string): string {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const noTags = noScript.replace(/<[^>]+>/g, ' ')
  return noTags.replace(/\s+/g, ' ').trim()
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m?.[1]) return ''
  return stripHtmlToText(m[1]).slice(0, 300)
}

export async function fetchListingPageText(url: string): Promise<{
  text: string
  titleTag: string
  ok: boolean
  error?: string
}> {
  assertPublicHttpUrl(url)
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl,en;q=0.8',
      },
    })
    if (!res.ok) {
      const status = res.status
      let hint = `Serwer strony zwrócił ${status} — nie udało się pobrać treści automatycznie.`
      if (status === 403 || status === 401) {
        hint =
          'Ta strona blokuje automatyczne pobieranie (częste na marketplace’ach). Wklej tytuł i opis oferty ręcznie w pole „Albo wklej…” poniżej — analiza AI i tak zadziała.'
      } else if (status === 429) {
        hint =
          'Serwer tymczasowo ogranicza zapytania. Spróbuj za chwilę albo wklej treść oferty ręcznie.'
      }
      return {
        text: '',
        titleTag: '',
        ok: false,
        error: hint,
      }
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_HTML_BYTES) {
      return {
        text: '',
        titleTag: '',
        ok: false,
        error: 'Strona jest zbyt duża do pobrania.',
      }
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf)
    const titleTag = extractTitle(html)
    let text = stripHtmlToText(html)
    if (text.length > MAX_TEXT_FOR_MODEL) {
      text = text.slice(0, MAX_TEXT_FOR_MODEL)
    }
    if (text.length < 80) {
      return {
        text,
        titleTag,
        ok: false,
        error:
          'Z pobranej strony wyszło mało tekstu (często przy ofertach ładowanych w przeglądarce). Wklej treść oferty ręcznie w polu poniżej.',
      }
    }
    return { text, titleTag, ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort')) {
      return { text: '', titleTag: '', ok: false, error: 'Przekroczono czas pobierania strony.' }
    }
    return { text: '', titleTag: '', ok: false, error: 'Nie udało się pobrać strony. Spróbuj wkleić tekst oferty.' }
  } finally {
    clearTimeout(t)
  }
}

export async function analyzeCompetitorListing(
  content: PreparedListingContent
): Promise<CompetitorListingAnalysis> {
  const body = [
    content.source === 'fetch' && content.url ? `ŹRÓDŁO: URL ${content.url}` : 'ŹRÓDŁO: wklejka użytkownika',
    content.titleTag ? `TYTUŁ_STRONY (meta/title): ${content.titleTag}` : '',
    content.fetchOk === false && content.fetchError ? `UWAGA_POBIERANIA: ${content.fetchError}` : '',
    '',
    'TREŚĆ DO ANALIZY:',
    content.text.slice(0, MAX_TEXT_FOR_MODEL),
  ]
    .filter(Boolean)
    .join('\n')

  const model = process.env.OPENAI_COMPETITOR_ANALYZE_MODEL?.trim() || 'gpt-4o-mini'

  const user = `${body}

Zwróć WYŁĄCZNIE JSON:
{
  "overallScore": <number 0-100>,
  "summary": "<string>",
  "strengths": ["<string>", "..."],
  "weaknesses": ["<string>", "..."],
  "suggestions": ["<string>", "..."],
  "titleGuess": "<string lub pusty>",
  "platformGuess": "<jedna wartość ze zbioru>",
  "dataQuality": "good" | "partial" | "poor",
  "disclaimer": "<jedno zdanie>"
}`

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.35,
    max_tokens: 2000,
  })

  const raw = assertChatJsonContent(completion, 'analyzeCompetitorListing')
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error('Nieprawidłowy JSON od AI.')
  }

  const score = Number(parsed.overallScore)
  const overallScore = Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : 50

  const asStrArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : []

  return {
    overallScore,
    summary: String(parsed.summary ?? '').trim() || 'Brak podsumowania.',
    strengths: asStrArr(parsed.strengths),
    weaknesses: asStrArr(parsed.weaknesses),
    suggestions: asStrArr(parsed.suggestions),
    titleGuess: String(parsed.titleGuess ?? '').trim().slice(0, 200),
    platformGuess: String(parsed.platformGuess ?? 'unknown').trim() || 'unknown',
    dataQuality:
      parsed.dataQuality === 'good' || parsed.dataQuality === 'partial' || parsed.dataQuality === 'poor'
        ? parsed.dataQuality
        : 'partial',
    disclaimer:
      String(parsed.disclaimer ?? '').trim() ||
      'To szacunek edukacyjny — nie gwarancja pozycji w wyszukiwarce.',
  }
}
