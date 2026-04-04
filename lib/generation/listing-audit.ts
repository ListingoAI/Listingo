import openai from '@/lib/openai'
import { assertChatJsonContent } from '@/lib/openai/assert-chat-json-content'
import { scanListingHtmlForObviousIssues } from '@/lib/generation/listing-audit-html-scan'
import { getPlatformProfile } from '@/lib/platforms'

const MAX_LONG_PLAIN = 14_000
const MAX_FEATURES = 12_000

/** Domyślnie jak główny generator opisów — nadpisz przez OPENAI_LISTING_AUDIT_MODEL. */
const DEFAULT_LISTING_AUDIT_MODEL = 'gpt-5-mini'

/** gpt-5 to modele reasoning — completion_tokens zawiera ZARÓWNO reasoning jak i output.
 *  3500 było za mało (model zużywał wszystko na myślenie, 0 na odpowiedź).
 *  Optymalizacja kosztu: pierwsza próba niższa, retry wyższy tylko gdy potrzeba. */
const LISTING_AUDIT_GPT5_MAX_TOKENS = 9000
const LISTING_AUDIT_GPT5_RETRY_MAX_TOKENS = 12_000
const LISTING_AUDIT_OTHER_MAX_TOKENS = 3500
const LISTING_AUDIT_OTHER_RETRY_MAX_TOKENS = 4500

/** Nowsze modele gpt-5 wymagają max_completion_tokens zamiast max_tokens (Chat Completions API). */
function getListingAuditTokenParams(
  model: string,
  options?: { isRetry?: boolean }
): { max_completion_tokens: number } | { max_tokens: number } {
  const isRetry = Boolean(options?.isRetry)
  const baseEnvRaw = process.env.OPENAI_LISTING_AUDIT_MAX_COMPLETION_TOKENS?.trim()
  const baseEnvParsed = baseEnvRaw ? Number.parseInt(baseEnvRaw, 10) : Number.NaN
  const retryEnvRaw = process.env.OPENAI_LISTING_AUDIT_RETRY_MAX_COMPLETION_TOKENS?.trim()
  const retryEnvParsed = retryEnvRaw ? Number.parseInt(retryEnvRaw, 10) : Number.NaN
  const isGpt5Family = model.trim().toLowerCase().startsWith('gpt-5')
  if (isGpt5Family) {
    const fallback = isRetry ? LISTING_AUDIT_GPT5_RETRY_MAX_TOKENS : LISTING_AUDIT_GPT5_MAX_TOKENS
    const parsed = isRetry ? retryEnvParsed : baseEnvParsed
    const max = Number.isFinite(parsed) && parsed >= 2048 ? parsed : fallback
    return { max_completion_tokens: max }
  }

  const fallback = isRetry ? LISTING_AUDIT_OTHER_RETRY_MAX_TOKENS : LISTING_AUDIT_OTHER_MAX_TOKENS
  const parsed = isRetry ? retryEnvParsed : baseEnvParsed
  const max = Number.isFinite(parsed) && parsed >= 1024 ? parsed : fallback
  return { max_tokens: max }
}

function truncateForPrompt(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** Reguły z profilu platformy (limity, zakazy, sekcje) — audyt ma trzymać się realnych ograniczeń marketplace. */
function buildPlatformComplianceRules(platformSlug: string): string {
  const p = getPlatformProfile(platformSlug)
  const lines: string[] = []

  lines.push(`DOCELOWA PLATFORMA: ${p.name} (slug: ${p.slug}). Audytuj pod typowe ograniczenia tej platformy — nie twierdź „pełnej zgodności z regulaminem”, tylko ryzyka i sugestie.`)

  if (p.titleMaxChars) {
    lines.push(
      `- Tytuł (pole seoTitle): typowy limit ok. ${p.titleMaxChars} znaków — policz znaki w dostarczonym seoTitle; jeśli przekracza limit, zgłoś w risks lub suggestedManualEdits.`,
    )
  }

  if (p.forbiddenPatterns?.length) {
    lines.push(
      `- Typowe tematy ryzyka / zakazy opisów na ${p.name}: ${p.forbiddenPatterns.join(' · ')} — jeśli coś z tego widać w treści listingu, umieść w risks (nie dopisuj problemów spoza danych).`,
    )
  }

  if (p.requiredSections?.length) {
    lines.push(
      `- Czytelność treści: warto, by opis wspierał m.in. obszary: ${p.requiredSections.join(', ')} — oceń pokrycie z treści (masz tekst bez HTML; nie wymagaj dosłownych nagłówków).`,
    )
  }

  lines.push(`- Skrót dobrych praktyk (${p.name}): ${truncateForPrompt(p.bestPractices, 950)}`)

  if (p.slug === 'allegro') {
    lines.push(
      `- Allegro: filtry wyników biorą się z parametrów w formularzu oferty, nie z opisu HTML — opis nie zastępuje pól atrybutów.`,
    )
    lines.push(
      `- Allegro — KRYTYCZNE dla audytu: jeśli w tekście długiego opisu (masz go jako plain text) są już podane konkretne wartości (np. kolor, materiał, wymiary, waga), NIE zgłaszaj ich jako „brak informacji” i NIE pisz sugestii w stylu „Uzupełnij atrybuty: Color = …; Materiał = …” tak, jakby trzeba było te dane dopiero dopisać do treści. W takim przypadku dane SĄ w opisie — problem dotyczy wyłącznie przeniesienia ich do parametrów w panelu. Użyj co najwyżej jednego punktu [WAŻNE] lub [OPCJONALNE] w stylu: przenieś do odpowiednich pól parametrów Allegro wartości już obecne w opisie, żeby działały filtry — bez powtarzania listy „Color/Materiał/…” z wartościami, jeśli są już czytelne w opisie.`,
    )
    lines.push(
      `- Allegro: sugestię „uzupełnij atrybuty w formularzu” z konkretnymi wartościami zapisuj TYLKO wtedy, gdy tej samej informacji naprawdę nie ma w tytule, krótkim opisie ani w długim opisie (plain text).`,
    )
    lines.push(
      `- Błędy struktury HTML (zbędne </p>, nierównowaga <p>) są wykrywane osobno i dołączane do wyniku — Ty skup się na merytoryce, copy i zasadach platformy w treści tekstowej.`,
    )
    lines.push(
      `- CTA na Allegro: pojedyncze, neutralne CTA (np. „Dodaj do koszyka”, „Sprawdź szczegóły”) jest zwykle akceptowalne; zgłaszaj ryzyko dopiero przy spamie CTA, agresywnej presji czasowej bez pokrycia, obietnicach „ostatnie sztuki” bez danych lub próbach wyprowadzenia użytkownika poza Allegro.`,
    )
  }

  return lines.join('\n')
}

export type ListingAuditResult = {
  /** Krótkie podsumowanie zgodności / jakości (2–4 zdania) */
  complianceSummary: string
  /** Co jest OK */
  strengths: string[]
  /** Ryzyko reklamacji, wątpliwe obietnice, potencjalne nieścisłości techniczne */
  risks: string[]
  /** Czego brakuje do „pełnego” opisu (konkretnie) */
  missingInfo: string[]
  /** Tytuł / tagi / meta — krótkie wskazówki SEO pod platformę */
  seoNotes: string[]
  /** Konkretne rzeczy do dopisania lub poprawy ręcznie (bullet) */
  suggestedManualEdits: string[]
  disclaimer: string
}

export type ListingAuditInput = {
  platformSlug: string
  productName: string
  category: string
  features: string
  seoTitle: string
  shortDescription: string
  longDescriptionHtml: string
  tags: string[]
  metaDescription: string
}

function stripHtmlToPlain(html: string): string {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const noTags = noScript.replace(/<[^>]+>/g, ' ')
  return noTags.replace(/\s+/g, ' ').trim()
}

/** Wyniki skanera HTML na początek list (priorytet UX / zgodność wyświetlania). */
function mergeHtmlScanIntoAudit(
  risks: string[],
  suggestedManualEdits: string[],
  htmlIssues: string[]
): { risks: string[]; suggestedManualEdits: string[] } {
  if (htmlIssues.length === 0) return { risks, suggestedManualEdits }
  const prefix = '[KRYTYCZNE] [WPŁYW: konwersja 5/10 | SEO 2/10 | compliance 9/10] '
  const prefixedRisks = htmlIssues.map((s) => (s.startsWith('[') ? s : `${prefix}${s}`))
  return {
    risks: [...prefixedRisks, ...risks],
    suggestedManualEdits: [
      '[KRYTYCZNE] [WPŁYW: konwersja 6/10 | SEO 2/10 | compliance 8/10] Otwórz edytor opisu HTML: usuń zbędne </p> i wyrównaj pary <p>…</p> zgodnie z komunikatami powyżej.',
      ...suggestedManualEdits,
    ],
  }
}

function systemPrompt(platformSlug: string): string {
  const platformBlock = buildPlatformComplianceRules(platformSlug)

  return `Jesteś ekspertem e-commerce (PL) i audytorem treści ofert. Dostajesz gotowy listing (tytuł, krótki, długi opisu jako TEKST BEZ TAGÓW HTML — tak otrzymujesz go celowo), tagi, meta oraz cechy z formularza.

ZADANIE: Oceń listing jak narzędzie decyzyjne dla sprzedawcy — konkretnie, bez lania wody, bez kopiowania długich cytatów z opisu.

TON (OBOWIĄZKOWY — „SaaS”, nie ogólny chat):
- ZAKAZ słabych formuł: „może być”, „warto rozważyć”, „może wymagać”, „warto uzupełnić” (bez trybu rozkazującego).
- ZAMIAST: tryb rozkazujący lub krótka diagnoza + działanie: „Usuń / dopisz / skróć / popraw / zastąp …”.
- complianceSummary: 2–4 zdania jak executive summary: stan + 1–2 najważniejsze działania (bez ogólników).

${platformBlock}

SPÓJNOŚĆ (OBOWIĄZKOWE):
- strengths nie może zaprzeczać risks ani missingInfo: nie chwal „dobrze zdefiniowanych parametrów / kompletnej specyfikacji”, jeśli w tej samej odpowiedzi wskazujesz brak kluczowych liczb, wymiarów, oznaczeń (wiek, CE, zestaw, itp.) — wtedy strengths opisuj tylko to, co naprawdę, spójnie wynika z treści.
- missingInfo / suggestedManualEdits: nie zgłaszaj „braku” materiału, koloru, wymiarów itp. w kontekście „dopisz do opisu”, jeśli te same fakty są już w tekście długiego opisu (plain text) — wtedy ewentualnie jedna uwaga o przeniesieniu do pól parametrów marketplace, nie o uzupełnianiu treści.
- seoNotes: konkret pod widoczność (tytuł, intencja, meta) — bez pustych fraz typu „dodaj słowa kluczowe”; podaj nazwę pola i sensowną frazę tylko jeśli wynika z produktu.
- Nie twierdz, że oferta „na pewno” spełnia regulamin — ale unikaj bezładnego „może”; używaj: „Ryzyko: …”, „Do poprawy: …”.
- Audyt ma być action-first: użytkownik wie CO zrobić i w jakiej kolejności.

MAPOWANIE PRIORYTETÓW (używaj prefiksów jak poniżej):
- [KRYTYCZNE] = MUST FIX — blokuje sprzedaż / wysokie ryzyko reklamacji lub platformy.
- [WAŻNE] = SHOULD FIX — wyraźny wpływ na konwersję lub SEO.
- [OPCJONALNE] = NICE TO HAVE — drobna optymalizacja.
- Łącznie punkty [OPCJONALNE] w risks + missingInfo: max 3 — nie rozmywaj uwagi drobiazgami (np. kraj produkcji, masa, jeśli nie są kluczowe dla decyzji w tej kategorii lub nie wynikają z ryzyka).

PRIORYTETY I WPŁYW (OBOWIĄZKOWE W TRESCI PUNKTÓW):
- W KAŻDYM punkcie tablic risks, missingInfo i suggestedManualEdits dodaj prefix:
  [KRYTYCZNE] albo [WAŻNE] albo [OPCJONALNE]
  + [WPŁYW: konwersja X/10 | SEO X/10 | compliance X/10]
- W suggestedManualEdits posortuj punkty od najwyższego priorytetu do najniższego.
- FORMAT (PRZYKŁADY — kopiuj ten styl, twardy ton):
  - "[KRYTYCZNE] [WPŁYW: konwersja 8/10 | SEO 2/10 | compliance 9/10] Brak oznaczenia wieku i informacji bezpieczeństwa dla produktu dziecięcego — dopisz w opisie i/lub parametrach przed publikacją."
  - "[WAŻNE] [WPŁYW: konwersja 7/10 | SEO 5/10 | compliance 3/10] Tytuł bez kluczowego parametru zakupu (np. liczby elementów) — dodaj na początku lub tuż po głównej frazie produktu."
  - "[OPCJONALNE] [WPŁYW: konwersja 3/10 | SEO 4/10 | compliance 1/10] Rozbuduj jedno zastosowanie produktu jednym zdaniem — tylko jeśli masz podstawę w cechach."

ANALIZA SPRZEDAŻOWA (COPY) — OBOWIĄZKOWE:
- Oceń siłę sprzedażową: hook, konkret korzyści, przełożenie cech na efekt, czytelność mobile, wiarygodność obietnic.
- Jeśli copy jest słabe, wpisz to w risks/missingInfo oraz konkretne poprawki w suggestedManualEdits (czasowniki: usuń, zastąp, skróć).
- ZAUFANIE PRZY PARAMETRACH: wykrywaj dopiski sugerujące niepewność lub „drugie źródło” informacji, np. „(informacja od sprzedawcy)”, „(według sprzedawcy)”, „(dane od sprzedawcy)” — to obniża konwersję. Zgłoś to w risks lub suggestedManualEdits: usuń dopisek i podaj parametr wprost (np. „Materiał: tworzywo ABS”), bez komentarzy meta o pochodzeniu danych.

TYTUŁ (OBOWIĄZKOWE, GŁĘBIEJ):
- Oceń kolejność słów, intencję zakupową, długość vs limit, potencjał CTR.
- W suggestedManualEdits: minimum 1 gotowy wariant tytułu w cudzysłowie (≤ limit platformy), tylko z faktów wejścia.

ZASADY JSON:
- Odpowiedź WYŁĄCZNIE JSON (bez markdown), dokładnie wg schematu użytkownika.
- strengths / risks / missingInfo / seoNotes / suggestedManualEdits: po 2–8 krótkich punktów (jedna myśl na punkt).
- risks: nieścisłości, ryzyko zwrotu, marketing bez pokrycia, naruszenia typowych zasad platformy — nie halucynuj.
- suggestedManualEdits: tylko wykonalne polecenia (np. „Skróć seoTitle do ≤ N znaków”, „Usuń telefon z opisu”).
- complianceSummary: 2–4 zdania, ton decyzyjny.
- disclaimer: jedno zdanie — wsparcie edukacyjne, nie porada prawna ani gwarancja zgodności z regulaminem.`
}

export async function generateListingAudit(input: ListingAuditInput): Promise<ListingAuditResult> {
  const longPlain = stripHtmlToPlain(input.longDescriptionHtml).slice(0, MAX_LONG_PLAIN)
  const tagsJoined = Array.isArray(input.tags) ? input.tags.join(', ') : ''
  const model = process.env.OPENAI_LISTING_AUDIT_MODEL?.trim() || DEFAULT_LISTING_AUDIT_MODEL

  const user = `PLATFORMA (slug): ${input.platformSlug}
NAZWA PRODUKTU (formularz): ${input.productName.slice(0, 500)}
KATEGORIA: ${input.category.slice(0, 400)}
CECHY / PARAMETRY (formularz, skrót):
${input.features.slice(0, MAX_FEATURES)}

--- WYGENEROWANY LISTING ---
seoTitle: ${input.seoTitle.slice(0, 500)}
shortDescription: ${input.shortDescription.slice(0, 1200)}
longDescription (tekst bez tagów HTML — do audytu merytorycznego i zgodności z platformą, nie do walidacji składni HTML):
${longPlain}
tags: ${tagsJoined.slice(0, 2000)}
metaDescription: ${input.metaDescription.slice(0, 500)}

Zwróć WYŁĄCZNIE JSON:
{
  "complianceSummary": "<string>",
  "strengths": ["<string>", "..."],
  "risks": ["<string>", "..."],
  "missingInfo": ["<string>", "..."],
  "seoNotes": ["<string>", "..."],
  "suggestedManualEdits": ["<string>", "..."],
  "disclaimer": "<string>"
}`

  const isGpt5Family = model.trim().toLowerCase().startsWith('gpt-5')
  const temperatureParam = isGpt5Family ? {} : { temperature: 0.35 }

  const runAuditCompletion = async (isRetry: boolean): Promise<string> => {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt(input.platformSlug) },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      ...temperatureParam,
      ...getListingAuditTokenParams(model, { isRetry }),
    })
    return assertChatJsonContent(completion, isRetry ? 'generateListingAudit retry' : 'generateListingAudit')
  }

  let parsed: Record<string, unknown> | null = null
  try {
    const raw = await runAuditCompletion(false)
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    // Retry with higher token ceiling only when first parse/completion fails
    try {
      const retryRaw = await runAuditCompletion(true)
      parsed = JSON.parse(retryRaw) as Record<string, unknown>
    } catch {
      throw new Error('Nieprawidłowy JSON od AI.')
    }
  }
  if (!parsed) {
    throw new Error('Nieprawidłowy JSON od AI.')
  }

  const asStrArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : []

  const htmlIssues = scanListingHtmlForObviousIssues(input.longDescriptionHtml)
  let risksOut = asStrArr(parsed.risks)
  let editsOut = asStrArr(parsed.suggestedManualEdits)
  if (htmlIssues.length > 0) {
    const merged = mergeHtmlScanIntoAudit(risksOut, editsOut, htmlIssues)
    risksOut = merged.risks
    editsOut = merged.suggestedManualEdits
  }

  return {
    complianceSummary:
      String(parsed.complianceSummary ?? '').trim() || 'Brak podsumowania.',
    strengths: asStrArr(parsed.strengths),
    risks: risksOut,
    missingInfo: asStrArr(parsed.missingInfo),
    seoNotes: asStrArr(parsed.seoNotes),
    suggestedManualEdits: editsOut,
    disclaimer:
      String(parsed.disclaimer ?? '').trim() ||
      'To wsparcie edukacyjne — nie zastępuje własnej weryfikacji regulaminu marketplace.',
  }
}
