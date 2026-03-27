import {
  formatCategoryFieldForDisplay,
  parseCategoryField,
} from "@/lib/allegro/category-selection"
import {
  categoryPathSuggestsAutomotiveParts,
  isLikelyRcToyOrModelProduct,
} from "@/lib/generation/rc-toy-context"

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

/**
 * Heurystyka UX: gdy nazwa mocno sugeruje inny typ produktu niż liść kategorii Allegro.
 * Nie blokuje generacji — tylko podpowiedź.
 */
export function getCategoryProductNameHint(
  productName: string,
  categoryRaw: string,
  features: string = ""
): string | null {
  const combinedInput = `${productName} ${features}`.trim()
  if (combinedInput.length < 3) return null

  const parsed = parseCategoryField(categoryRaw)
  if (parsed.type === "empty" || parsed.type === "custom") return null

  const cat = fold(formatCategoryFieldForDisplay(categoryRaw))
  if (cat.length < 3) return null

  /** Nazwa + cechy — spójne wykrywanie typu produktu */
  const name = fold(combinedInput)

  const catSuggestsOuter =
    /kurtki|kurtka|plaszcz|plaszcze|parki\b|parka\b|okrycia\s+wierzchnie|przejsciow/i.test(
      cat
    )
  const catSuggestsSweater =
    /swetr|pulower|golf|cardigan|\bdzianin|bluz(y|a)(\s|$)/i.test(cat)

  const nameSuggestsOuter =
    /\b(kurtka|kurtk|plaszcz|parka|ramonesk|bomber|parki\b|kamizelka\s+wierzchn)/i.test(
      name
    )
  const nameSuggestsSweater =
    !nameSuggestsOuter &&
    (/\b(sweter|swetry|pulower|golf|cardigan)\b/i.test(name) ||
      (/\bdzianin/i.test(name) && /\b(sweter|swetr|bluz|golf)\b/i.test(name)))

  if (nameSuggestsSweater && catSuggestsOuter && !catSuggestsSweater) {
    return "Nazwa brzmi jak sweter lub dzianina, a kategoria wskazuje na kurtki / płaszcze. Rozważ zmianę kategorii (np. ścieżkę ze „Swetry”), żeby listing był spójny z Allegro i SEO."
  }
  if (nameSuggestsOuter && catSuggestsSweater && !catSuggestsOuter) {
    return "Nazwa brzmi jak kurtka lub płaszcz, a kategoria wskazuje na swetry / dzianinę. Sprawdź, czy wybrana ścieżka Allegro jest właściwa."
  }

  if (
    isLikelyRcToyOrModelProduct(combinedInput) &&
    categoryPathSuggestsAutomotiveParts(cat)
  ) {
    return "Nazwa brzmi jak zabawka lub model zdalnie sterowany (RC), a kategoria wskazuje na części motoryzacyjne (np. akumulatory). Wybierz ścieżkę Dziecko › Zabawki › Pojazdy i tory (lub inną zabawkową), nie Motoryzację."
  }

  return null
}
