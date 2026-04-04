import type { ListingAuditResult } from "@/lib/generation/listing-audit"
import type { GenerateResponse } from "@/lib/types"

const AGGRESSIVE_CTA_PATTERNS: RegExp[] = [
  /\bdodaj\s+do\s+koszyka\b/gi,
  /\bkup\s+teraz\b/gi,
  /\bzam[oó]w\s+teraz\b/gi,
  /\bkup\s+online\b/gi,
  /\bzam[oó]w\s+online\b/gi,
  /\bzł[oó]ż\s+zam[oó]wienie\b/gi,
  /\bnie\s+czekaj\b/gi,
]

function stripUnicodeEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\u200D/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function textHasEmoji(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text)
}

function textHasAggressiveCta(text: string): boolean {
  return AGGRESSIVE_CTA_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0
    return pattern.test(text)
  })
}

function softenAggressiveCta(text: string): string {
  let next = text

  for (const pattern of AGGRESSIVE_CTA_PATTERNS) {
    next = next.replace(pattern, "sprawdź szczegóły")
  }

  return next
    .replace(/\bCTA\s*:\s*/gi, "")
    .replace(/\bsprawdź szczegóły(?:\s+i\s+sprawdź szczegóły)+\b/gi, "sprawdź szczegóły")
    .replace(/!{2,}/g, "!")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function extractQuotedTitleCandidate(text: string): string | null {
  const patterns = [/"([^"\n]{12,160})"/g, /„([^”\n]{12,160})”/g]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (!match?.[1]) continue
    const candidate = match[1].replace(/\s+/g, " ").trim()
    if (candidate) return candidate
  }

  return null
}

function collectAuditTexts(audit: ListingAuditResult): string[] {
  return [
    ...audit.risks,
    ...audit.missingInfo,
    ...audit.suggestedManualEdits,
  ]
}

export function isCriticalAuditItem(text: string): boolean {
  return /^\s*\[KRYTYCZNE\]/i.test(text)
}

export function shouldHideResolvedAuditItem(
  text: string,
  result: Pick<GenerateResponse, "seoTitle" | "shortDescription" | "longDescription" | "metaDescription" | "tags">
): boolean {
  const lower = text.toLowerCase()

  const titleCandidate = extractQuotedTitleCandidate(text)
  if (
    titleCandidate &&
    /seotitle|seo title|tytuł/i.test(lower) &&
    result.seoTitle.trim() === titleCandidate
  ) {
    return true
  }

  if (
    /emoji|emotikon/i.test(lower) &&
    !textHasEmoji(
      [
        result.seoTitle,
        result.shortDescription,
        result.longDescription,
        result.metaDescription,
        result.tags.join(" "),
      ].join("\n")
    )
  ) {
    return true
  }

  if (
    /\bcta\b|wezwan(?:ia|ie)\s+do\s+działania|wezwan(?:ia|ie)\s+sprzedażow/i.test(lower) &&
    !textHasAggressiveCta(
      [result.shortDescription, result.longDescription, result.metaDescription].join("\n")
    )
  ) {
    return true
  }

  return false
}

export function applyListingAuditAutofixes(
  result: GenerateResponse,
  audit: ListingAuditResult
): { nextResult: GenerateResponse; appliedKinds: string[] } {
  const texts = collectAuditTexts(audit)
  const nextResult: GenerateResponse = {
    ...result,
    tags: [...result.tags],
    qualityTips: [...(result.qualityTips ?? [])],
  }
  const appliedKinds: string[] = []

  const titleMax = result.platformLimits?.titleMaxChars ?? 0
  const titleCandidate = texts
    .map((text) => extractQuotedTitleCandidate(text))
    .find(
      (candidate): candidate is string =>
        Boolean(candidate) &&
        candidate !== nextResult.seoTitle &&
        (titleMax <= 0 || candidate.length <= titleMax)
    )

  if (titleCandidate) {
    nextResult.seoTitle = titleCandidate
    appliedKinds.push("seoTitle")
  }

  if (texts.some((text) => /emoji|emotikon/i.test(text))) {
    const before = [
      nextResult.seoTitle,
      nextResult.shortDescription,
      nextResult.longDescription,
      nextResult.metaDescription,
      nextResult.tags.join("\n"),
    ].join("\n")

    nextResult.seoTitle = stripUnicodeEmoji(nextResult.seoTitle)
    nextResult.shortDescription = stripUnicodeEmoji(nextResult.shortDescription)
    nextResult.longDescription = stripUnicodeEmoji(nextResult.longDescription)
    nextResult.metaDescription = stripUnicodeEmoji(nextResult.metaDescription)
    nextResult.tags = nextResult.tags.map((tag) => stripUnicodeEmoji(tag)).filter(Boolean)

    const after = [
      nextResult.seoTitle,
      nextResult.shortDescription,
      nextResult.longDescription,
      nextResult.metaDescription,
      nextResult.tags.join("\n"),
    ].join("\n")

    if (before !== after) {
      appliedKinds.push("emoji")
    }
  }

  if (
    texts.some(
      (text) =>
        /\bcta\b|wezwan(?:ia|ie)\s+do\s+działania|wezwan(?:ia|ie)\s+sprzedażow/i.test(
          text.toLowerCase()
        )
    )
  ) {
    const before = [
      nextResult.shortDescription,
      nextResult.longDescription,
      nextResult.metaDescription,
    ].join("\n")

    nextResult.shortDescription = softenAggressiveCta(nextResult.shortDescription)
    nextResult.longDescription = softenAggressiveCta(nextResult.longDescription)
    nextResult.metaDescription = softenAggressiveCta(nextResult.metaDescription)

    const after = [
      nextResult.shortDescription,
      nextResult.longDescription,
      nextResult.metaDescription,
    ].join("\n")

    if (before !== after) {
      appliedKinds.push("cta")
    }
  }

  return { nextResult, appliedKinds }
}
