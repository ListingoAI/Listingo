/**
 * Pakiet „Listing na gotowo”: jednorazowe pobranie kredytów po pełnym sukcesie (6 zdjęć + wideo + opis).
 * Dostosuj do ekonomii produktu / planów.
 */
export const LISTING_SUITE_BUNDLE_CREDIT_COST = 10

/**
 * 6 presetów Photo Studio Premium (Flux Kontext) — używane po kolei w pakiecie.
 * Kolejność = galeria pod listing (e-commerce + lifestyle + premium).
 */
export const LISTING_SUITE_SCENE_IDS = [
  'allegro-main',
  'amazon-main',
  'ecommerce-clean',
  'lifestyle-table',
  'lifestyle-outdoor',
  'luxury-marble',
] as const

export type ListingSuiteSceneId = (typeof LISTING_SUITE_SCENE_IDS)[number]

/** Krótkie etykiety PL pod UI i odpowiedź API */
export const LISTING_SUITE_SCENE_LABELS: Record<ListingSuiteSceneId, string> = {
  'allegro-main': 'Allegro — białe tło',
  'amazon-main': 'Amazon — białe tło',
  'ecommerce-clean': 'Szare tło e-commerce',
  'lifestyle-table': 'Lifestyle — stół',
  'lifestyle-outdoor': 'Lifestyle — plener',
  'luxury-marble': 'Premium — marmur',
}
