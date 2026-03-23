// Profil użytkownika
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: 'free' | 'starter' | 'pro'
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

// Request do API generowania
export interface GenerateRequest {
  productName: string
  category: string
  features: string
  platform: string
  tone: string
  useBrandVoice?: boolean
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
}

// Wskazówka jakości
export interface QualityTip {
  type: 'success' | 'warning' | 'error'
  text: string
  points: number
}
