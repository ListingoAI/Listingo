/** Identyfikatory planów (zgodne z kolumną profiles.plan w Supabase). */
export type PlanId = "free" | "starter" | "pro" | "scale"

export function planLabel(plan: string | undefined | null): string {
  switch (plan) {
    case "starter":
      return "Starter"
    case "pro":
      return "Pro"
    case "scale":
      return "Scale"
    default:
      return "Free"
  }
}

/** Płatne plany (dostęp m.in. do Photo Studio AI). */
export function isPaidPlan(plan: string | undefined | null): boolean {
  return plan === "starter" || plan === "pro" || plan === "scale"
}

/** Najwyższe plany — funkcje zarezerwowane wcześniej tylko dla Pro. */
export function isProOrScale(plan: string | undefined | null): boolean {
  return plan === "pro" || plan === "scale"
}

/**
 * Vision w kreatorze: analiza zdjęcia produktu, ekstrakcja do formularza — Pro i Scale.
 * (Pakiet „Listing na gotowo” może nadal wywołać analizę po stronie serwera z własnej ścieżki.)
 */
export function hasProductImageVisionAccess(plan: string | undefined | null): boolean {
  return isProOrScale(plan)
}

export const PRODUCT_IMAGE_VISION_UPGRADE_MESSAGE =
  "Analiza zdjęcia produktu (Vision) jest dostępna w planach Pro i Scale. Dodaj nazwę i cechy tekstowo lub przejdź na wyższy plan."
