import type { CategorySelectionCustom, CategorySelectionTree } from "./types"

type AnySelection = CategorySelectionTree | CategorySelectionCustom | null

/**
 * Blok tekstowy do user promptu — ustrukturyzowany kontekst kategorii.
 * Nie wrzuca całej taksonomii, tylko wybraną ścieżkę.
 */
export function buildCategoryContextForPrompt(selection: AnySelection): string {
  if (!selection) {
    return `KATEGORIA: nie podano (traktuj ogólnie branżowo wg nazwy i cech produktu).`
  }

  if (selection.kind === "custom") {
    return `KATEGORIA (wpisana ręcznie przez użytkownika):
- Kategoria: ${selection.customCategory}
Potraktuj jako kontekst branżowy — dopasuj język, słownictwo i styl do tej kategorii.`
  }

  const { mainCategory, categoryPath, leafCategory, id } = selection
  const fullPath = categoryPath.join(" › ")

  return `KATEGORIA (wybrana z taksonomii — użyj jako kontekstu branżowego i do doboru słów kluczowych):
- Kategoria główna: ${mainCategory}
- Pełna ścieżka: ${fullPath}
- Kategoria końcowa: ${leafCategory}
- ID kategorii: ${id}
Dopasuj słownictwo, tytuł SEO, tagi i strukturę opisu do tej ścieżki i typu produktu. Nie wymyślaj innej kategorii.`
}
