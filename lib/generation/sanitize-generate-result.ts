import { countWordsFromHtml } from "@/lib/generation/count-words-html"
import { optimizeEbayTitle } from "@/lib/generation/ebay-title-optimizer"
import {
  effectiveCharMax,
  fitAmazonBackendSearchTerms,
} from "@/lib/generation/platform-char-limits"
import type { PlatformProfile } from "@/lib/platforms"
import type { QualityTip } from "@/lib/types"

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
  let tokens = deduped.filter((t, idx) => {
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

/**
 * Normalizuje odpowiedź modelu do limitów platformy (tytuł, opisy, tagi).
 * Dodaje ostrzeżenia do qualityTips przy przycięciu lub za krótkim opisie długim.
 */
export function sanitizeGenerateResult(
  raw: Record<string, unknown>,
  profile: PlatformProfile
): SanitizedGeneratePayload {
  const extraTips: QualityTip[] = []

  let seoTitle = String(raw.seoTitle ?? "").trim()
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
  let shortDescription = String(raw.shortDescription ?? "").trim()
  if (shortMax === 0) {
    if (shortDescription.length > 0) {
      extraTips.push({
        type: "success",
        text: `${profile.name}: pole „opis krótki” nie jest używane na tej platformie — wyczyszczono treść.`,
        points: 1,
      })
    }
    shortDescription = ""
  } else if (profile.slug === "shoper" && shortDescription && /<[^>]+>/.test(shortDescription)) {
    const plain = stripHtmlToPlainText(shortDescription)
    extraTips.push({
      type: "warning",
      text: `Shoper: w opisie skróconym usunięto tagi HTML — to pole powinno być plain text.`,
      points: 3,
    })
    shortDescription = plain
  }
  if (profile.slug === "vinted" && /(?:https?:\/\/|www\.)\S+/i.test(shortDescription)) {
    shortDescription = stripLinks(shortDescription)
    extraTips.push({
      type: "warning",
      text: "Vinted: usunięto link z opisu krótkiego (linki zewnętrzne nie są zalecane).",
      points: 3,
    })
  }
  if (shortMax > 0 && shortDescription.length > shortMax) {
    extraTips.push({
      type: "warning",
      text: `Opis krótki skrócono do ${shortMax} znaków (limit ${profile.name}).`,
      points: 5,
    })
    shortDescription = truncateSmart(shortDescription, shortMax)
  }

  let longDescription = String(raw.longDescription ?? "")
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

  const minWords = profile.charLimits.longDescMinWords
  const wc = countWordsFromHtml(longDescription)
  if (longDescription.trim().length > 0 && wc < minWords) {
    const longHint =
      profile.slug === "allegro"
        ? `Opis długi ma ok. ${wc} słów (cel redakcyjny min. ${minWords} — lepsza konwersja i Google; Allegro nie wymaga minimalnej liczby słów w opisie). Rozważ dopisanie.`
        : profile.slug === "amazon"
          ? `Opis długi ma ok. ${wc} słów (cel min. ${minWords} pod jakość i Google — Amazon nie wymaga technicznie 200 słów). Rozważ rozbudowę.`
          : profile.slug === "shoper"
            ? `Opis długi ma ok. ${wc} słów (min. ${minWords}; Shoper zaleca ok. 1000–1500 znaków treści z nagłówkami — nie powielaj opisu skróconego). Rozważ dopisanie.`
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
  let metaDescription = String(raw.metaDescription ?? "").trim()
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
        .map((t) => String(t).trim())
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
