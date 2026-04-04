// Profil użytkownika
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: 'free' | 'starter' | 'pro' | 'scale'
  credits_used: number
  credits_limit: number
  credits_reset_at: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  onboarding_completed: boolean
  default_platform: string
  default_tone: string
  default_category: string | null
  created_at: string
  updated_at: string
}

// Wygenerowany opis
export interface Description {
  id: string
  user_id: string
  product_name: string
  category: string | null
  features: string | null
  platform: string
  tone: string
  source_type: 'form' | 'image' | 'url'
  source_image_url: string | null
  source_url: string | null
  seo_title: string | null
  short_description: string | null
  long_description: string | null
  tags: string[]
  meta_description: string | null
  quality_score: number
  quality_tips: string[]
  /** Wersja szablonu promptu (jeśli kolumna w bazie) */
  prompt_version?: string | null
  is_favorite: boolean
  folder: string
  created_at: string
}

// Brand Voice
export interface BrandVoice {
  id: string
  user_id: string
  brand_name: string | null
  sample_descriptions: string[]
  detected_tone: string | null
  detected_style: string | null
  custom_instructions: string | null
  forbidden_words: string[]
  preferred_words: string[]
  created_at: string
  updated_at: string
}

/** Jedno zdjęcie produktu w formularzu (wiele do max 5). */
export type ProductImageEntry = {
  id: string
  dataUrl: string
  name: string
}

// Request do API generowania
export interface GenerateRequest {
  productName: string
  /** JSON CategorySelection (kind:"category"|"custom") albo stary slug tekstowy */
  category: string
  features: string
  platform: string
  tone: string
  /** Opcjonalne zdjęcie produktu jako data URL/base64 do Vision. */
  imageBase64?: string
  /** Opcjonalnie wiele zdjęć (max 5) — łączone przy analizie jak w /api/analyze-product-image. */
  imageBase64Images?: string[]
  /**
   * Opcjonalnie: JSON analizy Vision z /api/analyze-product-image (po edycji w UI) —
   * pomija ponowną analizę zdjęcia przy generacji.
   */
  imageAnalysisPrecomputed?: unknown
  /** Subiektywna ocena produktu od użytkownika (1-5) jako dodatkowy sygnał dla copy. */
  productRating?: number | null
  /**
   * Opcjonalny kierunek copy (np. „prezent”, „dla alergików”, „najtańszy start”) —
   * model traktuje jako priorytet bez wymyślania nowych faktów.
   */
  listingIntent?: string
  brandVoice?: { tone?: string; style?: string }
  /**
   * Opcjonalnie: jeden adres https/http na linię — do osadzenia w HTML opisu (np. Allegro) jako <img src="…">.
   */
  descriptionImageUrls?: string
  /**
   * false = bez emoji/emotikonów w wygenerowanym listingu; true lub brak = zgodnie z tonem (domyślnie dozwolone z umiarem).
   */
  listingEmojis?: boolean
  /**
   * Agresywność sanitize dla Allegro:
   * - "hard" (domyślnie): automatyczne usuwanie wykrytych naruszeń z opisu.
   * - "soft": tylko ostrzeżenia w qualityTips, bez automatycznej ingerencji.
   */
  allegroSanitizeMode?: "soft" | "hard"
  /** Kontekst poprzedniej generacji (przy retry) — model dostaje info o odrzuconej wersji. */
  retryContext?: {
    previousSeoTitle: string
    previousShortDescription: string
    previousQualityScore: number
    retryHints?: string[]
  }
}

/** Limity docelowe dla UI (z profilu platformy) — zwracane z API generate. */
export type GeneratePlatformLimits = {
  slug: string
  titleMaxChars: number
  shortDescMax: number
  metaDescMax: number
  longDescMinWords: number
}

// Odpowiedź z API generowania
export interface GenerateResponse {
  seoTitle: string
  shortDescription: string
  longDescription: string
  tags: string[]
  metaDescription: string
  qualityScore: number
  qualityTips: QualityTip[]
  descriptionId?: string
  creditsRemaining?: number
  /** Wersja promptu / reguł użyta przy generacji */
  promptVersion?: string
  /** Limity platformy — liczniki znaków w wyniku */
  platformLimits?: GeneratePlatformLimits
}

// Wskazówka jakości
export interface QualityTip {
  type: 'success' | 'warning' | 'error'
  text: string
  points: number
}
