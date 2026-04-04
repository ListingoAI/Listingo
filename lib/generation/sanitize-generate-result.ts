import { countWordsFromHtml } from "@/lib/generation/count-words-html"
import { repairListingHtmlDescription } from "@/lib/generation/repair-listing-html"
import { optimizeEbayTitle } from "@/lib/generation/ebay-title-optimizer"
import {
  effectiveCharMax,
  fitAmazonBackendSearchTerms,
} from "@/lib/generation/platform-char-limits"
import type { PlatformProfile } from "@/lib/platforms"
import type { QualityTip } from "@/lib/types"

/** Model czasem zwraca samo CTA zamiast tytułu oferty — to nie jest seoTitle. */
function looksLikeCtaOnlySeoTitle(title: string): boolean {
  const t = title
    .trim()
    .toLowerCase()
    .replace(/[!?.…]+$/g, "")
    .replace(/\s+/g, " ")
  if (!t || t.length > 52) return false

  const exact = new Set([
    "dodaj do koszyka",
    "dodaj do koszyka teraz",
    "kup teraz",
    "zamów teraz",
    "zamow teraz",
    "kup online",
    "zamów online",
    "zamow online",
    "sprawdź ofertę",
    "sprawdz oferte",
    "złóż zamówienie",
    "zloz zamowienie",
    "kup już dziś",
    "kup juz dzis",
    "zobacz więcej",
    "zobacz wiecej",
    "sprawdź szczegóły",
    "sprawdz szczegoly",
  ])
  if (exact.has(t)) return true

  if (t.length <= 32 && /^(dodaj|kup|zamów|zamow|sprawdź|sprawdz|zobacz|weź|wez)\b/i.test(t)) {
    if (/\d/.test(t)) return false
    return /koszyka|teraz|online|ofert|zamówienie|szczegół|wiecej/i.test(t)
  }
  return false
}

function truncateSmart(s: string, max: number): string {
  if (!s || s.length <= max) return s
  if (max <= 1) return "…"
  const slice = s.slice(0, max - 1).trimEnd()
  const lastSpace = slice.lastIndexOf(" ")
  const base =
    lastSpace > max * 0.5 ? slice.slice(0, lastSpace) : slice
  return `${base}…`
}

/**
 * Awaryjny smart trim tytułu (bez brutalnego cięcia środka słowa).
 * Używany, gdy model przekroczył limit znaków.
 */
function emergencySmartTrimTitle(title: string, max: number): string {
  const normalized = title.replace(/\s+/g, " ").trim()
  if (normalized.length <= max) return normalized

  let work = normalized
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (work.length <= max) return work

  const rawTokens = work.split(" ").filter(Boolean)
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const t of rawTokens) {
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    deduped.push(t)
  }
  work = deduped.join(" ")
  if (work.length <= max) return work

  const stopwords = new Set([
    "i",
    "oraz",
    "z",
    "ze",
    "na",
    "do",
    "dla",
    "w",
    "we",
    "o",
    "od",
    "pod",
    "przez",
    "u",
    "a",
  ])
  const tokens = deduped.filter((t, idx) => {
    if (idx === 0) return true
    return !stopwords.has(t.toLowerCase())
  })
  work = tokens.join(" ")
  if (work.length <= max) return work

  // Ostatecznie: skracaj od końca całe tokeny, zachowując sens początku.
  while (tokens.length > 3 && tokens.join(" ").length > max) {
    tokens.pop()
  }
  work = tokens.join(" ")
  if (work.length <= max) return work

  return truncateSmart(work, max)
}

function parseQualityTipsRaw(raw: unknown): QualityTip[] {
  if (!Array.isArray(raw)) return []
  const out: QualityTip[] = []
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "type" in item &&
      "text" in item &&
      "points" in item
    ) {
      const t = item as { type: string; text: unknown; points: unknown }
      if (
        t.type === "success" ||
        t.type === "warning" ||
        t.type === "error"
      ) {
        out.push({
          type: t.type,
          text: String(t.text),
          points: Number.isFinite(Number(t.points)) ? Number(t.points) : 0,
        })
      }
    }
  }
  return out
}

/**
 * Usuwa dopiski osłabiające zaufanie przy parametrach (częsty błąd modelu), np.
 * „Materiał: ABS (informacja od sprzedawcy)” — kupujący czyta to jako niepewność.
 * Usuwa też meta-notatki o źródle (okładka, zdjęcie, etykieta) — nie są treścią dla kupującego.
 */
function stripSellerTrustWeakeningDisclaimers(text: string): {
  cleaned: string
  changed: boolean
} {
  if (!text.trim()) return { cleaned: text, changed: false }
  const original = text
  let next = text
  const patterns: RegExp[] = [
    /\s*[\(（]\s*(?:informacja|info|dane)\s+(?:od\s+)?sprzedawcy\s*[\)）]/gi,
    /\s*[\(（]\s*według\s+sprzedawcy\s*[\)）]/gi,
    /\s*[\(（]\s*zgodnie\s+z\s+informacją\s+sprzedawcy\s*[\)）]/gi,
    /\s*[\(（]\s*na\s+podstawie\s+informacji\s+od\s+sprzedawcy\s*[\)）]/gi,
    /\s*[\(（]\s*dane\s+pochodzą\s+od\s+sprzedawcy\s*[\)）]/gi,
    /\s*[\(（]\s*podane\s+przez\s+sprzedawcę\s*[\)）]/gi,
    /\s+—\s*informacja\s+od\s+sprzedawcy\.?/gi,
    /\s*,\s*informacja\s+od\s+sprzedawcy/gi,
    // Meta o źródle z okładki / zdjęcia / etykiety — zbędne dla kupującego (częsty błąd przy książkach i Vision).
    /\s*[\(（]\s*informacja\s+widoczna\s+na\s+okładce\s*[\)）]/gi,
    /\s*[\(（]\s*informacja\s+widoczna\s+na\s+okladce\s*[\)）]/gi,
    /\s*[\(（]\s*informacja\s+na\s+okładce\s*[\)）]/gi,
    /\s*[\(（]\s*informacja\s+na\s+okladce\s*[\)）]/gi,
    /\s*[\(（]\s*widoczne\s+na\s+okładce\s*[\)）]/gi,
    /\s*[\(（]\s*widoczne\s+na\s+okladce\s*[\)）]/gi,
    /\s*[\(（]\s*z\s+okładki\s*[\)）]/gi,
    /\s*[\(（]\s*z\s+okladki\s*[\)）]/gi,
    /\s*[\(（]\s*ze\s+zdjęcia\s*(?:produktu)?\s*[\)）]/gi,
    /\s*[\(（]\s*z\s+zdjęcia\s*(?:produktu)?\s*[\)）]/gi,
    /\s*[\(（]\s*z\s+etykiety\s*[\)）]/gi,
    /\s*[\(（]\s*informacja\s+z\s+analizy\s+(?:obrazu|zdjęcia)\s*[\)）]/gi,
    /\s*[\(（]\s*z\s+analizy\s+obrazu\s*[\)）]/gi,
  ]
  for (const re of patterns) {
    next = next.replace(re, "")
  }
  next = next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/>\s{2,}</g, ">\n<")
    .trim()
  return { cleaned: next, changed: next !== original }
}

function stripHtmlToPlainText(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function countWordsPlainFromHtml(html: string): number {
  const t = stripHtmlToPlainText(html)
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

/** Usuwa z HTML sekcję „Do formularza (atrybuty)” — treść tylko dla sprzedawcy, nie dla klienta. */
function stripSellerFormAttributesSectionFromHtml(html: string): string {
  if (!html || !/do\s+formularza/i.test(html)) return html
  return html
    .replace(
      /<h[23][^>]*>[\s\S]*?Do\s+formularza[\s\S]*?<\/h[23]>[\s\S]*?(?=<h[12]\b|$)/gi,
      ""
    )
    .replace(/>\s{2,}</g, ">\n<")
    .trim()
}

/** Usuwa z opisu krótkiego zdanie-instrukcję o parametrach w panelu Allegro (częsty błąd modelu). */
function stripAllegroSellerMetaFromShortDescription(text: string): string {
  const t = text.trim()
  if (!/\b(?:Uzupełnij|uzupełnij)\s+parametry\b/i.test(t)) return t
  return t
    .replace(
      /^[^.!?]*\b(?:Uzupełnij|uzupełnij)\s+parametry[^.!?]*(?:formularzu\s+Allegro|Allegro|formularzu)[^.!?]*[.!?]\s*/i,
      ""
    )
    .trim()
}

/**
 * Usuwa z treści Allegro fragmenty, które zwykle nie powinny być w opisie dla kupującego:
 * - dane kontaktowe / URL,
 * - polityki zwrotów i reklamacji,
 * - promocje czasowe / ceny kampanii,
 * - identyfikatory magazynowe (EAN/SKU/Kod),
 * - wzmianki o wadze brutto.
 */
function stripAllegroForbiddenBuyerContent(text: string): { cleaned: string; changed: boolean } {
  if (!text.trim()) return { cleaned: text, changed: false }

  let next = text

  // Linijki "parametrowe" (często kopiowane do opisu przez błąd promptu/modelu).
  next = next.replace(/(^|\n)\s*(?:EAN|SKU|Kod(?:\s+produktu|\s+wewnętrzny)?|Indeks)\s*[:#-][^\n]*/gi, "$1")

  // Kontakt i linki (w opisie Allegro to ryzyko naruszenia zasad sekcji oferty).
  next = next.replace(
    /[^.!?\n]*\b(?:telefon|tel\.?|e-?mail|mail|kontakt(?:uj)?|zadzwoń|zadzwońcie|napisz|napiszcie|www\.|https?:\/\/)[^.!?\n]*[.!?]?/gi,
    " "
  )
  next = next.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")

  // Zwroty / reklamacje / polityki posprzedażowe (powinny być w dedykowanych sekcjach Allegro).
  next = next.replace(
    /[^.!?\n]*\b(?:zwrot(?:y|u|em|om)?|reklamacj(?:a|e|i|ę)|odstąpieni[ea]|14\s*dni(?:\s+na\s+zwrot)?|30\s*dni(?:\s+na\s+zwrot)?|warunki\s+zwrot(?:u|ów)|warunki\s+reklamacj(?:i|e)|polityka\s+zwrot(?:u|ów))\b[^.!?\n]*[.!?]?/gi,
    " "
  )

  // Promocje czasowe i ceny kampanijne osadzone w opisie.
  next = next.replace(
    /[^.!?\n]*\b(?:tylko\s+teraz|promocja(?:\s+do)?|okazja\s+dnia|do\s+niedzieli|rabat(?:\s+\d+%|\s+czasowy)?|za\s*\d+(?:[.,]\d+)?\s*zł)\b[^.!?\n]*[.!?]?/gi,
    " "
  )

  // "Dane technicznie martwe" dla opisu sprzedażowego.
  next = next.replace(/[^.!?\n]*\bwaga\s+brutto\b[^.!?\n]*[.!?]?/gi, " ")

  next = next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim()

  return { cleaned: next, changed: next !== text.trim() }
}

/**
 * Wykrywa sytuację, gdy tekst po odsianiu HTML to dokładnie ta sama sekwencja słów powtórzona 2×
 * (typowy błąd modelu — „podwójny” opis).
 */
function isDuplicateWordHalves(html: string): boolean {
  const plain = stripHtmlToPlainText(html).replace(/\s+/g, " ").trim()
  if (plain.length < 200) return false
  const words = plain.split(" ").filter(Boolean)
  if (words.length < 40 || words.length % 2 !== 0) return false
  const h = words.length / 2
  for (let i = 0; i < h; i++) {
    if (words[i] !== words[h + i]) return false
  }
  return true
}

/**
 * Próbuje uciąć HTML do pierwszej połowy słów (gdy isDuplicateWordHalves).
 * Zwraca null, gdy nie da się bezpiecznie przytnąć.
 */
function tryTrimHtmlAfterFirstHalfWords(html: string): string | null {
  const plain = stripHtmlToPlainText(html).replace(/\s+/g, " ").trim()
  const words = plain.split(" ").filter(Boolean)
  if (words.length < 40 || words.length % 2 !== 0) return null
  const h = words.length / 2
  for (let i = 0; i < h; i++) {
    if (words[i] !== words[h + i]) return null
  }

  let lo = 0
  let hi = html.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    const w = countWordsPlainFromHtml(html.slice(0, mid))
    if (w <= h) lo = mid
    else hi = mid - 1
  }
  let cut = lo
  const lastLt = html.lastIndexOf("<", cut)
  const lastGt = html.lastIndexOf(">", cut)
  if (lastLt !== -1 && lastGt !== -1 && lastLt > lastGt) {
    cut = lastLt
  }
  const trimmed = html.slice(0, cut).trimEnd()
  if (trimmed.length < 80) return null
  const afterWords = countWordsPlainFromHtml(trimmed)
  if (afterWords < h * 0.85 || afterWords > h * 1.15) return null
  return trimmed
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function stripLinks(s: string): string {
  return s.replace(/(?:https?:\/\/|www\.)\S+/gi, "").replace(/\s+/g, " ").trim()
}

/** Usuwa emoji (Unicode Extended_Pictographic) — gdy użytkownik wyłączył emoji w generatorze. */
function stripUnicodeEmojiFromString(s: string): string {
  if (!s) return s
  return s
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\u200D/g, "")
}

/** Czy opis krótki zawiera rozpoznawalne wezwanie do działania (PL + typowe sklepy). */
export function shortDescriptionHasCta(text: string): boolean {
  const t = text.toLowerCase()
  if (t.length < 3) return false
  const patterns: RegExp[] = [
    /dodaj\s+do\s+koszyka/,
    /dodaj\s+do\s+koszyka!/,
    /zamów\s+teraz/,
    /zamow\s+teraz/,
    /kup\s+teraz/,
    /wybierz\s+teraz/,
    /kup\s+już\s+dziś/,
    /kup\s+juz\s+dzis/,
    /złóż\s+zamówienie/,
    /zloz\s+zamowienie/,
    /sprawdź\s+w\s+ofercie/,
    /sprawdz\s+w\s+ofercie/,
    /sprawdź\s+cenę/,
    /obejrzyj\s+szczegóły/,
    /przejdź\s+do\s+zakupu/,
    /przejdz\s+do\s+zakupu/,
    /zarezerwuj/,
    /zapisz\s+się/,
    /napisz\s+do\s+nas/,
    /kup\s+online/,
    /zamów\s+online/,
    /zamow\s+online/,
    /cta\s*[:\-]/i,
  ]
  return patterns.some((re) => re.test(t))
}

function isFalseCtaMissingTip(tip: QualityTip): boolean {
  const x = tip.text.toLowerCase()
  return (
    (tip.type === "error" || tip.type === "warning") &&
    (/brak\s+wezwania\s+do\s+działania/.test(x) ||
      /brak\s+cta/.test(x) ||
      /wezwania\s+do\s+działania\s+w\s+opisie\s+krótkim/.test(x))
  )
}

export type SanitizedGeneratePayload = {
  seoTitle: string
  shortDescription: string
  longDescription: string
  tags: string[]
  metaDescription: string
  qualityScore: number
  qualityTips: QualityTip[]
}

export type AllegroSanitizeMode = "soft" | "hard"

/**
 * Normalizuje odpowiedź modelu do limitów platformy (tytuł, opisy, tagi).
 * Dodaje ostrzeżenia do qualityTips przy przycięciu lub za krótkim opisie długim.
 */
export function sanitizeGenerateResult(
  raw: Record<string, unknown>,
  profile: PlatformProfile,
  options?: {
    stripListingEmojis?: boolean
    allegroSanitizeMode?: AllegroSanitizeMode
    /** Gdy model zwróci samo CTA jako seoTitle — podstaw skróconą nazwę produktu. */
    fallbackTitleFromProductName?: string
  }
): SanitizedGeneratePayload {
  const extraTips: QualityTip[] = []
  const allegroSanitizeMode: AllegroSanitizeMode =
    options?.allegroSanitizeMode === "soft" ? "soft" : "hard"

  let trustDisclaimerStripped = false
  const applyTrustDisclaimers = (s: string): string => {
    const { cleaned, changed } = stripSellerTrustWeakeningDisclaimers(s)
    if (changed) trustDisclaimerStripped = true
    return cleaned
  }

  // Strip internal-only _buyerIntent field (forces model to think about buyer before writing)
  delete raw._buyerIntent

  let seoTitle = applyTrustDisclaimers(String(raw.seoTitle ?? "").trim())
  const fbTitle = options?.fallbackTitleFromProductName?.trim()
  if (seoTitle && fbTitle && looksLikeCtaOnlySeoTitle(seoTitle)) {
    seoTitle = truncateSmart(fbTitle, profile.titleMaxChars)
    extraTips.push({
      type: "warning",
      text: "Tytuł oferty zastąpiono nazwą produktu — wyjście modelu to było samo wezwanie do działania (CTA), a nie tytuł SEO.",
      points: 6,
    })
  }
  if (profile.slug === "ebay" && seoTitle) {
    const opt = optimizeEbayTitle(seoTitle)
    if (opt.changed && opt.title) {
      seoTitle = opt.title
      const detail =
        opt.replacements.length <= 3
          ? opt.replacements.join("; ")
          : `${opt.replacements.slice(0, 3).join("; ")}… (+${opt.replacements.length - 3})`
      extraTips.push({
        type: "success",
        text: `eBay Title Optimizer: usunięto lub zamieniono powtórzenia słów w tytule${detail ? ` (${detail})` : ""}.`,
        points: 3,
      })
    }
  }
  if (profile.slug === "empikplace" && seoTitle) {
    const cleanedExclam = seoTitle.replace(/!{2,}/g, "!")
    if (cleanedExclam !== seoTitle) {
      seoTitle = cleanedExclam
      extraTips.push({
        type: "warning",
        text: "Empik Place: zredukowano nadmiar wykrzykników w tytule.",
        points: 3,
      })
    }
    if (/[A-ZĄĆĘŁŃÓŚŹŻ]{4,}/.test(seoTitle)) {
      extraTips.push({
        type: "warning",
        text: "Empik Place: unikaj CAPS LOCK w tytule — czytelność wpływa na akceptację oferty.",
        points: 4,
      })
    }
  }
  if (profile.slug === "allegro" && seoTitle) {
    const collapsed = seoTitle.replace(/!{2,}/g, "!")
    if (collapsed !== seoTitle) {
      seoTitle = collapsed
      extraTips.push({
        type: "warning",
        text: "Allegro: zredukowano nadmiar wykrzykników w tytule — lepsza czytelność i mniejsze ryzyko odrzucenia.",
        points: 3,
      })
    }
    if (/(?:https?:\/\/|www\.)\S+/i.test(seoTitle)) {
      seoTitle = seoTitle
        .replace(/(?:https?:\/\/|www\.)\S+/gi, "")
        .replace(/\s{2,}/g, " ")
        .replace(/^\s+|\s+$/g, "")
        .trim()
      extraTips.push({
        type: "warning",
        text: "Allegro: usunięto adres URL z tytułu (linki w tytule są niedozwolone).",
        points: 5,
      })
    }
    const letterChars = seoTitle.replace(/[^A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/g, "")
    if (letterChars.length >= 12) {
      const upper = letterChars.replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, "").length
      if (upper / letterChars.length >= 0.85) {
        extraTips.push({
          type: "warning",
          text: "Allegro: tytuł wygląda na pisany CAPS LOCK — rozważ edycję na normalną pisownię (lepszy odbiór i zgodność z dobrymi praktykami).",
          points: 4,
        })
      }
    }
  }
  if (seoTitle.length > profile.titleMaxChars) {
    const trimmed = emergencySmartTrimTitle(seoTitle, profile.titleMaxChars)
    if (trimmed.length <= profile.titleMaxChars) {
      seoTitle = trimmed
      extraTips.push({
        type: "warning",
        text: `Tytuł przekroczył limit — zastosowano awaryjny Smart Trimming do ${profile.titleMaxChars} znaków (${profile.name}), bez urywania losowej końcówki.`,
        points: 4,
      })
    } else {
      extraTips.push({
        type: "warning",
        text: `Tytuł przekroczył limit — zastosowano awaryjne skrócenie do ${profile.titleMaxChars} znaków (${profile.name}). Docelowo powinien być Smart Trimming w odpowiedzi modelu; spróbuj wygenerować ponownie.`,
        points: 5,
      })
      seoTitle = truncateSmart(seoTitle, profile.titleMaxChars)
    }
  }

  const shortMax = effectiveCharMax(profile.charLimits.shortDesc, 250)
  let shortDescription = applyTrustDisclaimers(
    String(raw.shortDescription ?? "").trim()
  )
  if (shortMax === 0) {
    if (shortDescription.length > 0) {
      extraTips.push({
        type: "success",
        text: `${profile.name}: pole „opis krótki” nie jest używane na tej platformie — wyczyszczono treść.`,
        points: 1,
      })
    }
    shortDescription = ""
  }
  if (profile.slug === "vinted" && /(?:https?:\/\/|www\.)\S+/i.test(shortDescription)) {
    shortDescription = stripLinks(shortDescription)
    extraTips.push({
      type: "warning",
      text: "Vinted: usunięto link z opisu krótkiego (linki zewnętrzne nie są zalecane).",
      points: 3,
    })
  }
  if (profile.slug === "allegro" && shortMax > 0 && shortDescription.length > 0) {
    shortDescription = stripAllegroSellerMetaFromShortDescription(shortDescription)
    const stripped = stripAllegroForbiddenBuyerContent(shortDescription)
    if (stripped.changed) {
      extraTips.push({
        type: "warning",
        text:
          allegroSanitizeMode === "hard"
            ? "Allegro: usunięto z opisu krótkiego treści niezalecane w sekcji produktu (kontakt/zwroty/promocje/ceny lub dane technicznie martwe)."
            : "Allegro (tryb soft): wykryto w opisie krótkim treści niezalecane w sekcji produktu (kontakt/zwroty/promocje/ceny lub dane technicznie martwe) — popraw ręcznie.",
        points: 6,
      })
      if (allegroSanitizeMode === "hard") {
        shortDescription = stripped.cleaned
      }
    }
  }
  if (shortMax > 0 && shortDescription.length > shortMax) {
    extraTips.push({
      type: "warning",
      text: `Opis krótki skrócono do ${shortMax} znaków (limit ${profile.name}).`,
      points: 5,
    })
    shortDescription = truncateSmart(shortDescription, shortMax)
  }

  let longDescription = applyTrustDisclaimers(String(raw.longDescription ?? ""))
  if (profile.descriptionFormat === "plain_text" && /<[^>]+>/.test(longDescription)) {
    longDescription = stripHtmlToPlainText(longDescription)
    extraTips.push({
      type: "warning",
      text: `${profile.name}: usunięto tagi HTML z opisu długiego — ta platforma wymaga plain text.`,
      points: 4,
    })
  }
  if (profile.slug === "vinted" && /(?:https?:\/\/|www\.)\S+/i.test(longDescription)) {
    longDescription = stripLinks(longDescription)
    extraTips.push({
      type: "warning",
      text: "Vinted: usunięto link z opisu długiego (platforma nie lubi linków zewnętrznych).",
      points: 4,
    })
  }
  if (profile.descriptionFormat === "html" && profile.slug === "allegro") {
    longDescription = stripSellerFormAttributesSectionFromHtml(longDescription)
    const stripped = stripAllegroForbiddenBuyerContent(longDescription)
    if (stripped.changed) {
      extraTips.push({
        type: "warning",
        text:
          allegroSanitizeMode === "hard"
            ? "Allegro: usunięto z opisu długiego treści niedozwolone lub niskowartościowe (kontakt, zwroty/reklamacje, promocje czasowe, EAN/SKU, waga brutto)."
            : "Allegro (tryb soft): wykryto w opisie długim treści niedozwolone lub niskowartościowe (kontakt, zwroty/reklamacje, promocje czasowe, EAN/SKU, waga brutto) — popraw ręcznie.",
        points: 8,
      })
      if (allegroSanitizeMode === "hard") {
        longDescription = stripped.cleaned
      }
    }
  }

  if (profile.descriptionFormat === "html" && isDuplicateWordHalves(longDescription)) {
    const repaired = tryTrimHtmlAfterFirstHalfWords(longDescription)
    if (repaired) {
      longDescription = repaired
      extraTips.push({
        type: "warning",
        text: "Wykryto podwójne powtórzenie całego opisu w HTML — zastosowano automatyczne usunięcie drugiej kopii. Sprawdź podgląd; w razie potrzeby wygeneruj opis ponownie.",
        points: 10,
      })
    } else {
      extraTips.push({
        type: "warning",
        text: "Treść opisu długiego wygląda na wklejoną dwukrotnie (ta sama sekwencja słów). Usuń duplikat ręcznie lub wygeneruj ponownie — powielenie wygląda nieprofesjonalnie.",
        points: 10,
      })
    }
  }

  if (profile.descriptionFormat === "html" && longDescription.trim()) {
    const beforeHtmlRepair = longDescription
    longDescription = repairListingHtmlDescription(longDescription)
    if (longDescription !== beforeHtmlRepair) {
      extraTips.push({
        type: "success",
        text: "Dopasowano brakujące zamknięcia tagów HTML (np. </strong> w listach), żeby opis nie był urwany w edytorze.",
        points: 2,
      })
    }
  }

  const minWords = profile.charLimits.longDescMinWords
  const wc = countWordsFromHtml(longDescription)
  if (longDescription.trim().length > 0 && wc < minWords) {
    const longHint =
      profile.slug === "allegro"
        ? `Opis długi ma ok. ${wc} słów (cel redakcyjny min. ${minWords} — lepsza konwersja i Google; Allegro nie wymaga minimalnej liczby słów w opisie). Rozważ dopisanie.`
        : profile.slug === "amazon"
          ? `Opis długi ma ok. ${wc} słów (cel min. ${minWords} pod jakość i Google — Amazon nie wymaga technicznie 200 słów). Rozważ rozbudowę.`
          : `Opis długi ma ok. ${wc} słów (zalecane min. ${minWords} dla ${profile.name}). Rozważ regenerację lub dopisanie.`
    extraTips.push({
      type: "warning",
      text: longHint,
      points: 8,
    })
  }
  if (
    profile.slug === "vinted" &&
    !/(wada|wady|ślad|slad|stan|uszkodzen|otarci|przetar|zarys)/i.test(longDescription)
  ) {
    extraTips.push({
      type: "warning",
      text: "Vinted: dodaj sekcję o stanie i placeholder: [Tu opisz ewentualne ślady użytkowania].",
      points: 5,
    })
  }

  const metaMax = effectiveCharMax(profile.charLimits.metaDesc, 160)
  let metaDescription = applyTrustDisclaimers(
    String(raw.metaDescription ?? "").trim()
  )
  if (metaMax === 0) {
    if (metaDescription.length > 0) {
      extraTips.push({
        type: "success",
        text: `${profile.name}: pole meta description nie jest używane na tej platformie — wyczyszczono treść.`,
        points: 1,
      })
    }
    metaDescription = ""
  } else if (
    profile.slug === "etsy" &&
    !metaDescription &&
    longDescription.trim()
  ) {
    metaDescription = truncateSmart(stripHtmlToPlainText(longDescription), metaMax)
    extraTips.push({
      type: "success",
      text: "Etsy: uzupełniono meta z pierwszych 160 znaków opisu.",
      points: 2,
    })
  }
  if (metaMax > 0 && metaDescription.length > metaMax) {
    extraTips.push({
      type: "warning",
      text: `Meta description skrócono do ${metaMax} znaków.`,
      points: 3,
    })
    metaDescription = truncateSmart(metaDescription, metaMax)
  }

  let tags: string[] = []
  if (Array.isArray(raw.tags)) {
    tags = dedupePreserveOrder(
      raw.tags
        .map((t) => applyTrustDisclaimers(String(t).trim()))
        .filter(Boolean)
    )
  }
  const tagMaxCount = profile.slug === "etsy" ? 13 : profile.slug === "vinted" ? 8 : 12
  const tagMaxLength = profile.slug === "etsy" ? 20 : profile.slug === "vinted" ? 24 : 40
  tags = tags.map((t) => truncateSmart(t, tagMaxLength)).slice(0, tagMaxCount)
  if (profile.slug === "vinted") {
    tags = tags.map((t) => (t.startsWith("#") ? t : `#${t}`))
  }
  if (profile.slug === "amazon" && tags.length > 0) {
    const fit = fitAmazonBackendSearchTerms(tags)
    tags = fit.tags
    if (tags.length === 0) {
      extraTips.push({
        type: "warning",
        text:
          "Amazon: nie udało się zachować fraz w tags pod limit ~249 bajtów UTF-8 — uzupełnij Backend Search Terms ręcznie w panelu.",
        points: 5,
      })
    } else if (fit.trimmed) {
      extraTips.push({
        type: "warning",
        text:
          "Amazon: zestaw fraz (tags) dopasowano do limitu ~249 bajtów UTF-8 (Backend Search Terms). Skrócono lub usunięto końcowe frazy, aby Seller Central nie odrzucił całego pola.",
        points: 4,
      })
    } else {
      extraTips.push({
        type: "success",
        text: `Amazon: Backend Search Terms (łącznie) ~${fit.joinedBytes}/249 bajtów UTF-8.`,
        points: 2,
      })
    }
  }
  if (profile.slug === "etsy" && tags.length > 0 && tags.length < 13) {
    extraTips.push({
      type: "warning",
      text: "Etsy: dodaj pełny zestaw 13 tagów (max 20 znaków każdy) dla lepszej trafności.",
      points: 6,
    })
  }
  if (profile.slug === "vinted" && tags.length > 0 && tags.length < 5) {
    extraTips.push({
      type: "warning",
      text: "Vinted: dodaj 5-8 hashtagów na końcu opisu dla lepszej widoczności.",
      points: 5,
    })
  }
  if (
    profile.slug === "vinted" &&
    tags.length >= 5 &&
    !/\B#[\p{L}\p{N}_]+/u.test(longDescription)
  ) {
    longDescription = `${longDescription.trim()}\n\n${tags.join(" ")}`
    extraTips.push({
      type: "success",
      text: "Vinted: dodano hashtagi na końcu opisu.",
      points: 2,
    })
  }

  if (trustDisclaimerStripped) {
    extraTips.push({
      type: "success",
      text: "Usunięto dopiski osłabiające zaufanie (np. „informacja od sprzedawcy”) — parametry podawaj wprost, bez komentarzy o źródle informacji.",
      points: 2,
    })
  }

  if (options?.stripListingEmojis) {
    const before = `${seoTitle}\n${shortDescription}\n${longDescription}\n${metaDescription}\n${tags.join("\n")}`
    seoTitle = stripUnicodeEmojiFromString(seoTitle)
    shortDescription = stripUnicodeEmojiFromString(shortDescription)
    longDescription = stripUnicodeEmojiFromString(longDescription)
    metaDescription = stripUnicodeEmojiFromString(metaDescription)
    tags = tags.map((t) => stripUnicodeEmojiFromString(t).trim()).filter(Boolean)
    const after = `${seoTitle}\n${shortDescription}\n${longDescription}\n${metaDescription}\n${tags.join("\n")}`
    if (before !== after) {
      extraTips.push({
        type: "success",
        text: 'Ustawienie „Emoji w listingu”: wyłączone — usunięto znaki emoji z treści, aby wynik był zgodny z preferencją.',
        points: 1,
      })
    }
  }

  let qualityScore = Number(raw.qualityScore)
  if (!Number.isFinite(qualityScore)) qualityScore = 0
  qualityScore = Math.min(100, Math.max(0, qualityScore))

  const baseTips = parseQualityTipsRaw(raw.qualityTips)
  let qualityTips = [...baseTips, ...extraTips]

  const hadFalseCtaTip =
    shortDescriptionHasCta(shortDescription) &&
    qualityTips.some((tip) => isFalseCtaMissingTip(tip))
  if (hadFalseCtaTip) {
    qualityTips = qualityTips.filter((tip) => !isFalseCtaMissingTip(tip))
    qualityTips.push({
      type: "success",
      text: "Opis krótki zawiera wezwanie do działania (CTA) — rozpoznano frazę sklepową.",
      points: 5,
    })
    qualityScore = Math.min(100, qualityScore + 5)
  }

  return {
    seoTitle,
    shortDescription,
    longDescription,
    tags,
    metaDescription,
    qualityScore,
    qualityTips,
  }
}
