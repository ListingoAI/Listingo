import { countWordsFromHtml } from "@/lib/generation/count-words-html"
import {
  featuresHasSizeSectionHeader,
  featuresHasWeightHeader,
  featuresLikelyHasColorInfo,
} from "@/lib/generation/feature-section-detect"
import type { GenerateResponse, QualityTip } from "@/lib/types"

function parseTipsList(raw: GenerateResponse["qualityTips"]): QualityTip[] {
  const list = (raw ?? []) as (QualityTip | string)[]
  const out: QualityTip[] = []
  for (const tip of list) {
    if (typeof tip === "string") {
      try {
        const p = JSON.parse(tip) as unknown
        if (
          p &&
          typeof p === "object" &&
          "type" in p &&
          "text" in p &&
          "points" in p
        ) {
          const o = p as { type: string; text: string; points: number }
          if (
            o.type === "success" ||
            o.type === "warning" ||
            o.type === "error"
          ) {
            out.push({
              type: o.type,
              text: String(o.text),
              points: Number(o.points),
            })
          }
        }
      } catch {
        /* ignore */
      }
      continue
    }
    if (
      tip &&
      typeof tip === "object" &&
      (tip.type === "success" ||
        tip.type === "warning" ||
        tip.type === "error") &&
      typeof tip.text === "string" &&
      typeof tip.points === "number"
    ) {
      out.push(tip)
    }
  }
  return out
}

export type QualityGapAnalysis = {
  score: number
  pointsTo100: number
  /** Co wg oceny blokuje lub utrudnia pełne 100/100 */
  blockingItems: string[]
  /** Propozycje linii do dopisania w cechach (nie wymuszają formatu — użytkownik edytuje) */
  suggestedFeatureLines: string[]
}

/**
 * Skraca rozwlekłe wskazówki (np. disclaimery Allegro) do jednej linii „co poprawić”.
 * Pełny tekst nadal trafia do API przy ulepszaniu — to tylko warstwa UI.
 */
export function compactQualityTipForDisplay(text: string): string {
  const raw = text.trim()
  if (!raw) return ""

  const isAllegroParamsBoilerplate =
    /formularz|parametr|filtr|atrybut|allegro|wystawiania|nie zastępuje|dodatkowe zdję|zdjęć produktu/i.test(
      raw
    )

  if (isAllegroParamsBoilerplate && raw.length > 72) {
    return "Brakuje parametrów oferty w formularzu Allegro (filtry) — np. kolor, rozmiar, zdjęcia; sam opis ich nie zastąpi."
  }

  if (/Ceneo|Google Shopping|Merchant|Shoper|WooCommerce|Etsy|OLX|Vinted/i.test(raw) && raw.length > 100) {
    const first = raw.split(/(?<=[.!?])\s+/)[0]?.trim()
    if (first && first.length >= 24 && first.length < raw.length) return first
  }

  if (raw.length <= 130) return raw

  const firstSentence = raw.split(/(?<=[.!?])\s+/)[0]?.trim()
  if (firstSentence && firstSentence.length >= 20 && firstSentence.length < raw.length) {
    return firstSentence
  }

  return `${raw.slice(0, 127).trimEnd()}…`
}

/** Krótka lista braków pod UI (max kilka pozycji, bez duplikatów). */
export function perfectionBulletLines(
  result: GenerateResponse,
  featuresText: string
): string[] {
  const { blockingItems } = analyzeQualityGaps(result, featuresText)
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of blockingItems) {
    const line = compactQualityTipForDisplay(raw)
    if (!line || seen.has(line)) continue
    seen.add(line)
    out.push(line)
    if (out.length >= 6) break
  }
  return out
}

/**
 * Podpowiedzi pod cel 100/100 + sugerowane linie cech na podstawie ostrzeżeń i luk.
 */
export function analyzeQualityGaps(
  result: GenerateResponse,
  featuresText: string
): QualityGapAnalysis {
  const score = Math.min(100, Math.max(0, Number(result.qualityScore) || 0))
  const pointsTo100 = Math.max(0, 100 - score)
  const tips = parseTipsList(result.qualityTips)
  const blocking = tips.filter((t) => t.type === "warning" || t.type === "error")
  const ft = featuresText.toLowerCase()

  const blockingItems: string[] = []

  const longHtml = result.longDescription ?? ""
  const longWords = countWordsFromHtml(longHtml)
  const longMin = result.platformLimits?.longDescMinWords ?? 150
  if (longWords < longMin) {
    blockingItems.push(
      `Opis długi: ~${longWords} słów (cel min. ${longMin}) — warto rozbudować treść lub dopisać cechy, żeby AI miało materiał.`
    )
  }

  for (const t of blocking) {
    blockingItems.push(t.text)
  }

  if (score < 100 && blocking.length === 0 && longWords >= longMin) {
    blockingItems.push(
      "Brak ostrzeżeń — zostały drobne szlify (np. tagi, CTA, meta). Ulepsz AI może podnieść spójność i wypełnić luki redakcyjne."
    )
  }

  const suggestedFeatureLines: string[] = []
  const combinedTips = blocking.map((b) => b.text).join(" ").toLowerCase()
  const platformSlug = (result.platformLimits?.slug ?? "").toLowerCase()

  const pushUnique = (line: string) => {
    if (!suggestedFeatureLines.includes(line)) suggestedFeatureLines.push(line)
  }

  if (
    /kolor|barwa|odcie/i.test(combinedTips) &&
    !featuresLikelyHasColorInfo(featuresText)
  ) {
    pushUnique("Kolor: np. czarny / grafitowy (dopisz dokładnie, jak w ofercie).")
  }
  if (
    /wymiar|rozmiar|szer|wysok|głęb|cm\b/i.test(combinedTips) &&
    !featuresHasSizeSectionHeader(featuresText) &&
    !/\b\d+\s*[×x]\s*\d+/i.test(featuresText) &&
    !/\b\d+\s*(cm|mm)\b/i.test(featuresText)
  ) {
    pushUnique("Wymiary (np. S×W×G w cm): dopisz realne wartości z pomiaru.")
  }
  if (
    /waga|\bkg\b|gram/i.test(combinedTips) &&
    !featuresHasWeightHeader(featuresText) &&
    !/\b\d+[,.]?\d*\s*kg\b/i.test(featuresText)
  ) {
    pushUnique("Waga: np. 450 g lub 1,2 kg (dopisz faktyczną wartość).")
  }
  if (
    /parametr|filtr|allegro|formularz/i.test(combinedTips) &&
    platformSlug === "allegro"
  ) {
    pushUnique(
      "Parametry oferty (Allegro): uzupełnij w formularzu wystawiania — kolor, rozmiar, stan, kod producenta (jeśli dotyczy)."
    )
  }
  if (/ean|kod kresk|gtin/i.test(combinedTips) && !/\bean\b/i.test(ft)) {
    pushUnique("EAN / kod producenta: wpisz numer, jeśli go masz (ważne pod wyszukiwarkę i katalog).")
  }
  if (/materiał|skład/i.test(combinedTips) && !/materiał|skład/i.test(ft)) {
    pushUnique("Materiał / skład: np. ABS, stal nierdzewna, bawełna 100% — konkretnie, bez dopisków „od sprzedawcy”.")
  }

  if (suggestedFeatureLines.length === 0 && pointsTo100 > 0) {
    const tail =
      platformSlug === "allegro"
        ? "w opisie, cechach lub parametrach formularza Allegro."
        : "w opisie lub w polu cech poniżej."
    suggestedFeatureLines.push(
      `Dopisz konkretne cechy (np. kolor, wymiary, waga), których brakuje — ${tail}`
    )
  }

  const seen = new Set<string>()
  const uniqueBlocking = blockingItems.filter((x) => {
    const k = x.trim()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })

  return {
    score,
    pointsTo100,
    blockingItems: uniqueBlocking,
    suggestedFeatureLines,
  }
}
