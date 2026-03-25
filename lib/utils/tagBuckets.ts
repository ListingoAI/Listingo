/** Słowa wskazujące na frazę sprzedażową (nie cechę materiałową). */
const SALES_SUBSTRINGS = [
  "prezent",
  "nowość",
  "nowosc",
  "promocja",
  "hit",
  "bestseller",
  "wyprzedaż",
  "wyprzedaz",
  "gratis",
  "dostawa",
  "gwarancja",
  "komplet",
  "zestaw",
  "okazja",
  "rabat",
  "taniej",
  "darmow",
  "outlet",
  "mega",
  "super",
  "limitow",
]

/**
 * Dzieli tagi zwrócone przez model na cechy produktu vs frazy sprzedażowe (heurystyka).
 */
export function splitProductTags(tags: string[]): {
  features: string[]
  sales: string[]
} {
  const features: string[] = []
  const sales: string[] = []

  for (const raw of tags) {
    const tag = raw.trim()
    if (!tag) continue

    if (tag.startsWith("#")) {
      sales.push(tag)
      continue
    }

    const lower = tag.toLowerCase()
    const isSales = SALES_SUBSTRINGS.some((h) => lower.includes(h))
    if (isSales) sales.push(tag)
    else features.push(tag)
  }

  return { features, sales }
}
