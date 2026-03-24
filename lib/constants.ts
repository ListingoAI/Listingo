// Kategorie produktów
export const CATEGORIES = [
  { value: "odziez", label: "👕 Odzież i akcesoria" },
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

// Platformy sprzedażowe
export const PLATFORMS = [
  { value: "allegro", label: "Allegro", emoji: "🛒" },
  { value: "amazon", label: "Amazon", emoji: "📦" },
  { value: "shopify", label: "Shopify", emoji: "🛍️" },
  { value: "shoper", label: "Shoper", emoji: "🏪" },
  { value: "woocommerce", label: "WooCommerce", emoji: "🌐" },
  { value: "ebay", label: "eBay", emoji: "🏷️" },
  { value: "olx", label: "OLX", emoji: "📋" },
  { value: "ogolny", label: "Ogólny", emoji: "📝" },
] as const

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
] as const
