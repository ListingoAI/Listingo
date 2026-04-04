/**
 * Kategorie onboarding / uproszczone etykiety (nie taksonomia Allegro).
 * Generator opisów używa pełnych kategorii Allegro — zob. data/allegro-categories.json
 */
export const CATEGORIES = [
  { value: "moda_meska", label: "👔 Moda męska" },
  { value: "moda_damska", label: "👗 Moda damska" },
  { value: "moda_dziecieca", label: "🧒 Moda dziecięca" },
  { value: "obuwie", label: "👟 Obuwie" },
  { value: "bielizna", label: "🩱 Bielizna i stroje kąpielowe" },
  { value: "akcesoria_modowe", label: "🧢 Akcesoria modowe" },
  /** Legacy / gdy brak pewnej podkategorii */
  { value: "odziez", label: "👕 Moda (ogólne)" },
  { value: "elektronika", label: "📱 Elektronika" },
  { value: "dom", label: "🏠 Dom i ogród" },
  { value: "zdrowie", label: "💊 Zdrowie i uroda" },
  { value: "sport", label: "⚽ Sport i rekreacja" },
  { value: "motoryzacja", label: "🚗 Motoryzacja" },
  { value: "dzieciece", label: "🧸 Zabawki i dziecięce" },
  { value: "bizuteria", label: "💎 Biżuteria i zegarki" },
  { value: "ksiazki", label: "📚 Książki i multimedia" },
  { value: "spozywcze", label: "🍎 Spożywcze" },
  { value: "inne", label: "📦 Inne" },
] as const

/** Grupa UI kroku „Platforma” — marketplace, silniki sklepu, tryby ogólne */
export type PlatformGroupId = "marketplace" | "store" | "universal"

// Platformy sprzedażowe
export const PLATFORMS = [
  { value: "allegro", label: "Allegro", emoji: "🛒", group: "marketplace" satisfies PlatformGroupId },
  { value: "amazon", label: "Amazon", emoji: "📦", group: "marketplace" satisfies PlatformGroupId },
  { value: "shopify", label: "Shopify", emoji: "🛍️", group: "store" satisfies PlatformGroupId },
  { value: "woocommerce", label: "WooCommerce", emoji: "🌐", group: "store" satisfies PlatformGroupId },
  { value: "ebay", label: "eBay", emoji: "🏷️", group: "marketplace" satisfies PlatformGroupId },
  { value: "etsy", label: "Etsy", emoji: "🧶", group: "marketplace" satisfies PlatformGroupId },
  { value: "vinted", label: "Vinted", emoji: "👚", group: "marketplace" satisfies PlatformGroupId },
  { value: "empikplace", label: "Empik Place", emoji: "📚", group: "marketplace" satisfies PlatformGroupId },
  { value: "olx", label: "OLX", emoji: "📋", group: "marketplace" satisfies PlatformGroupId },
  { value: "ogolny", label: "Ogólny", emoji: "📝", group: "universal" satisfies PlatformGroupId },
  { value: "ogolny_plain", label: "Ogólny (tekst)", emoji: "📄", group: "universal" satisfies PlatformGroupId },
] as const

export const PLATFORM_GROUP_LABELS: Record<PlatformGroupId, string> = {
  marketplace: "Marketplace i ogłoszenia",
  store: "Sklepy (SaaS / wtyczki)",
  universal: "Uniwersalne",
}

// Tony opisów
export const TONES = [
  {
    value: "profesjonalny",
    label: "Profesjonalny",
    description: "Rzeczowy, ekspercki ton",
    emoji: "👔",
  },
  {
    value: "przyjazny",
    label: "Przyjazny",
    description: "Konwersacyjny, ciepły",
    emoji: "😊",
  },
  {
    value: "luksusowy",
    label: "Luksusowy",
    description: "Elegancki, premium",
    emoji: "✨",
  },
  {
    value: "mlodziezowy",
    label: "Młodzieżowy",
    description: "Dynamiczny, energiczny",
    emoji: "🔥",
  },
  {
    value: "techniczny",
    label: "Techniczny",
    description: "Precyzyjny, szczegółowy",
    emoji: "🔧",
  },
  {
    value: "sprzedazowy",
    label: "Sprzedażowy",
    description: "Perswazyjny, CTA, pilność bez fałszu",
    emoji: "📣",
  },
  {
    value: "narracyjny",
    label: "Narracyjny",
    description: "Historia, emocje, scenariusze użycia",
    emoji: "📖",
  },
  {
    value: "zwiezly",
    label: "Zwięzły",
    description: "Krótkie zdania, na temat, bez lania wody",
    emoji: "✂️",
  },
] as const
