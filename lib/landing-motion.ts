/**
 * Wspólne presety scroll-in dla sekcji landingu (fade + slide-up).
 */
export const LANDING_VIEWPORT = { once: true, margin: "-60px" as const }

export const fadeSlideUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: LANDING_VIEWPORT,
  transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
} as const
