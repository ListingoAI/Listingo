/**
 * Limity znaków z PlatformProfile: `0` = pole nieużywane / brak eksportu (np. OLX short, Vinted meta).
 * Nie używaj `|| fallback` — w JS `0` jest falsy i psuje semantykę.
 */

/** Pole wyłączone — generator ma zwrócić pusty string i nie liczyć limitu jak 250/160. */
export function isCharFieldDisabled(limit: number): boolean {
  return limit === 0
}

/**
 * Skuteczny limit do walidacji i promptów: `0` zostaje `0`; `undefined`/nieprawidłowe → fallback.
 */
export function effectiveCharMax(
  limit: number | undefined,
  fallback: number
): number {
  if (limit === 0) return 0
  if (limit == null || !Number.isFinite(limit) || limit < 0) return fallback
  return limit
}

const AMAZON_BACKEND_SEARCH_TERMS_MAX_BYTES = 249

/** Łączna długość UTF-8 w bajtach (np. Amazon Backend Search Terms). */
export function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length
}

/**
 * Przycina string tak, by mieścił się w maxBytes (UTF-8), bez łamania środka znaku wielobajtowego.
 */
export function truncateUtf8Bytes(s: string, maxBytes: number): string {
  if (maxBytes <= 0) return ""
  if (utf8ByteLength(s) <= maxBytes) return s
  let lo = 0
  let hi = s.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (utf8ByteLength(s.slice(0, mid)) <= maxBytes) lo = mid
    else hi = mid - 1
  }
  return s.slice(0, lo).trimEnd()
}

/**
 * Dopasowuje listę tagów (frazy oddzielone spacją) do limitu bajtów Amazon Backend Search Terms.
 * Usuwa całe tagi od końca; pojedynczy zbyt długi tag jest przycinany po bajtach.
 */
export function fitAmazonBackendSearchTerms(
  tags: string[],
  maxBytes: number = AMAZON_BACKEND_SEARCH_TERMS_MAX_BYTES
): { tags: string[]; joinedBytes: number; trimmed: boolean } {
  const cleaned = tags.map((t) => t.trim()).filter(Boolean)
  if (cleaned.length === 0) {
    return { tags: [], joinedBytes: 0, trimmed: false }
  }

  let working = [...cleaned]
  let trimmed = false

  const join = (arr: string[]) => arr.join(" ")

  while (working.length > 0) {
    const s = join(working)
    const b = utf8ByteLength(s)
    if (b <= maxBytes) {
      return { tags: working, joinedBytes: b, trimmed }
    }
    if (working.length > 1) {
      working.pop()
      trimmed = true
      continue
    }
    const one = truncateUtf8Bytes(working[0]!, maxBytes)
    if (one !== working[0]) trimmed = true
    working = one ? [one] : []
    break
  }

  const finalJoin = join(working)
  return {
    tags: working,
    joinedBytes: utf8ByteLength(finalJoin),
    trimmed,
  }
}
