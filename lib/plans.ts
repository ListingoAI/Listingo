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
