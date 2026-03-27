/** Węzeł taksonomii (flat list z parentId). */
export type AllegroCategoryNode = {
  id: string
  name: string
  parentId: string | null
  leaf: boolean
}

export type AllegroCategoriesFile = {
  version: number
  source?: string
  generatedAt?: string
  nodes: AllegroCategoryNode[]
}

/** Kategoria końcowa z pełną ścieżką — wyszukiwanie / sugestia. */
export type AllegroLeafCategory = {
  id: string
  name: string
  path: string[]
  pathLabel: string
}

// ---------------------------------------------------------------------------
// Wartość wyboru kategorii (serializowana jako JSON w polu formularza)
// ---------------------------------------------------------------------------

/** Kategoria wybrana z drzewa. */
export type CategorySelectionTree = {
  kind: "category"
  id: string
  mainCategory: string
  categoryPath: string[]
  leafCategory: string
}

/** Kategoria wpisana ręcznie (Inne / Własna). */
export type CategorySelectionCustom = {
  kind: "custom"
  customCategory: string
}

export type CategorySelection = CategorySelectionTree | CategorySelectionCustom

/**
 * @deprecated Stary format — obsługiwany w parsowaniu dla kompatybilności.
 */
export type AllegroCategorySelection = {
  kind: "allegro"
  id: string
  leafName: string
  path: string[]
}
