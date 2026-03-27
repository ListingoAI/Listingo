/**
 * Rozróżnienie zabawki / modelu RC (zdalnie sterowany) od prawdziwej motoryzacji.
 * Używane w sugestii kategorii Allegro i w podpowiedzi UX (bez importu fs).
 */

const REAL_AUTOMOTIVE_PARTS_RE =
  /\b(akumulator\s+(?:12v|60ah|70ah|100ah|samochod)|części\s+samochod|olej\s+silnik|rozrusznik|filtr\s+powietrza\s+samoch|opon(y|a)\s+(?:let|zim|całorocz)|świec|swiec\s+zapłon|skok\s+rozrządu|chłodnic|chlodnic\s+samoch)\b/i

/**
 * Czy nazwa/cechy brzmią jak zabawka, model RC lub pojazd zdalnie sterowany (nie części zamienne).
 */
export function isLikelyRcToyOrModelProduct(text: string): boolean {
  const h = text.toLowerCase()
  if (h.length < 6) return false
  if (REAL_AUTOMOTIVE_PARTS_RE.test(h)) return false

  const zdalnie = /\bzdalnie\s+sterow\w*/i.test(h)
  const rcWord = /\brc\b/i.test(h)
  const autoCar = /\b(auto|samoch[oó]d|pojazd)\b/i.test(h)
  const toyHint =
    /\b(zabawk|dla\s+dzieci|model\s+rc|helikopter\s+zdalnie|quad\s+zdalnie)\b/i.test(
      h
    )

  if (toyHint && (autoCar || rcWord)) return true
  if (zdalnie && autoCar) return true
  if (rcWord && autoCar) return true
  return false
}

/** Czy ścieżka kategorii Allegro wygląda na części / serwis pojazdu (nie zabawki). */
export function categoryPathSuggestsAutomotiveParts(categoryPathLower: string): boolean {
  if (!/\bmotoryzacja\b/i.test(categoryPathLower)) return false
  return /akumulator|części\s+samochodowe|opon(y|a)\b|filtry\b|klocki\s+hamulcowe|oleje\s+silnikowe|chemia\s+samochodowa|części\s+motocyklowe/i.test(
    categoryPathLower
  )
}
