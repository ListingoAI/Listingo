/** Tryb ekstrakcji vision — router wybiera prompt pod kategorię produktu. */
export const PRODUCT_IMAGE_PROMPT_KINDS = [
  'book',
  'furniture',
  'electronics',
  'fashion',
  'food_beverage',
  'beauty_health',
  'sports_outdoor',
  'kids_toys',
  'home_garden',
  'automotive',
  'general',
] as const

export type ProductImagePromptKind = (typeof PRODUCT_IMAGE_PROMPT_KINDS)[number]

export const DEFAULT_PRODUCT_IMAGE_PROMPT_KIND: ProductImagePromptKind = 'general'

const KIND_LABELS_PL: Record<ProductImagePromptKind, string> = {
  book: 'Książka / publikacja',
  furniture: 'Meble / wyposażenie wnętrz',
  electronics: 'Elektronika / sprzęt',
  fashion: 'Odzież / obuwie / akcesoria',
  food_beverage: 'Żywność / napoje',
  beauty_health: 'Kosmetyki / higiena / pielęgnacja',
  sports_outdoor: 'Sport / outdoor / fitness',
  kids_toys: 'Zabawki / artykuły dziecięce',
  home_garden: 'Dom / ogród / narzędzia',
  automotive: 'Motoryzacja / części / opony',
  general: 'Ogólne (inne kategorie)',
}

export function getProductImagePromptKindLabelPl(kind: ProductImagePromptKind): string {
  return KIND_LABELS_PL[kind] ?? KIND_LABELS_PL.general
}

export function isProductImagePromptKind(s: string): s is ProductImagePromptKind {
  return (PRODUCT_IMAGE_PROMPT_KINDS as readonly string[]).includes(s)
}

export function parseProductImagePromptKind(raw: unknown): ProductImagePromptKind {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (isProductImagePromptKind(s)) return s
  return DEFAULT_PRODUCT_IMAGE_PROMPT_KIND
}
