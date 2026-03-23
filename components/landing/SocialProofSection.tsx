"use client"

import { motion } from "framer-motion"
import Image from "next/image"

import { fadeSlideUp, LANDING_VIEWPORT } from "@/lib/landing-motion"

const cardMotion = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: LANDING_VIEWPORT,
  transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
}

type MarketplaceId = "allegro" | "shopify" | "amazon"

const marketplaceBadge: Record<
  MarketplaceId,
  { label: string; className: string }
> = {
  allegro: {
    label: "Allegro",
    className: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  },
  shopify: {
    label: "Shopify",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  },
  amazon: {
    label: "Amazon",
    className: "border-amber-500/25 bg-amber-500/15 text-amber-200",
  },
}

/**
 * Stałe URL-e portretów (Unsplash) — spójne między buildami.
 * Gdy pojawi się prawdziwy beta: podmień na photo + cytat + zgodę na wizerunek.
 */
const testimonials = [
  {
    quote:
      "„Scenariusz: 400 pozycji na Allegro — opisy zjadały mi weekendy. Z automatem robię batch w przerwach; liczę, że po pełnym wdrożeniu odzyskam te godziny na sourcing.”",
    name: "Anna K.",
    storeLabel: "sklep odzieżowy • Kraków",
    marketplace: "allegro" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=face&q=80",
    photoAlt: "Portret kobiety — zdjęcie ilustracyjne",
  },
  {
    quote:
      "„Testuję sugestie cenowe vs moja intuicja — na próbce SKU widzę sensowny spread. Czekam na więcej danych z rynku PL, żeby traktować to jako twardą podpowiedź, nie zabawkę.”",
    name: "Marcin N.",
    storeLabel: "Techbit.pl • elektronika",
    marketplace: "shopify" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face&q=80",
    photoAlt: "Portret mężczyzny — zdjęcie ilustracyjne",
  },
  {
    quote:
      "„Potrzebuję PL + EN pod DE — tłumacz agencyjny jest drogi. Szukam narzędzia, które utrzyma ton marki; na razie weryfikuję jakość na kilkunastu listingach.”",
    name: "Karolina W.",
    storeLabel: "import • B2C",
    marketplace: "amazon" as const,
    photoUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=face&q=80",
    photoAlt: "Portret kobiety — zdjęcie ilustracyjne",
  },
] as const

const metrics = [
  { value: "—", label: "Publiczne case studies (wkrótce)" },
  { value: "Beta", label: "Zbieramy pierwsze opinie" },
  { value: "PL", label: "Język i platformy lokalne" },
  { value: "24/7", label: "Generator dostępny po zalogowaniu" },
] as const

function MarketplacePill({ id }: { id: MarketplaceId }) {
  const m = marketplaceBadge[id]
  return (
    <span
      className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${m.className}`}
    >
      {m.label}
    </span>
  )
}

export function SocialProofSection() {
  return (
    <section className="relative overflow-hidden px-6 py-32">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-950/15 via-transparent to-transparent"
        aria-hidden
      />

      <motion.div
        {...fadeSlideUp}
        className="relative z-10 mx-auto mb-16 max-w-3xl text-center"
      >
        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase">
          OPINIE
        </p>
        <h2 className="mt-4 text-3xl font-bold md:text-5xl">
          Głosy sprzedawców — na start w formie scenariuszy
        </h2>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          Poniżej{" "}
          <span className="text-foreground/90">
            przykładowe sytuacje
          </span>{" "}
          (nie są to cytaty z konkretnych osób). Gdy tylko beta testerzy
          zgodzą się na publikację, podmienimy je na{" "}
          <span className="text-emerald-400/90">prawdziwe case studies</span> ze
          zdjęciem i marką sklepu.
        </p>
      </motion.div>

      <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            {...cardMotion}
            transition={{ ...cardMotion.transition, delay: i * 0.1 }}
            className="relative rounded-3xl border border-white/6 bg-card/30 p-6 backdrop-blur-sm transition-all duration-500 hover:border-emerald-500/10"
          >
            <span
              className="pointer-events-none absolute top-4 right-4 text-4xl text-emerald-500/10"
              aria-hidden
            >
              ❝
            </span>
            <p className="mb-3 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Scenariusz / ilustracja
            </p>
            <p className="text-sm leading-relaxed text-foreground/80 italic">
              {t.quote}
            </p>
            <div className="mt-6 flex items-start gap-3 border-t border-white/5 pt-4">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10">
                <Image
                  src={t.photoUrl}
                  alt={t.photoAlt}
                  width={48}
                  height={48}
                  className="h-12 w-12 object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <MarketplacePill id={t.marketplace} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.storeLabel}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
        {metrics.map((m, i) => (
          <div key={m.label} className="text-center">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={LANDING_VIEWPORT}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="text-3xl font-bold text-foreground md:text-4xl"
            >
              {m.value}
            </motion.p>
            <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <p className="relative z-10 mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
        Jesteś na beta liście i chcesz, żeby Twoja opinia tu trafiła? Napisz z
        panelu konta lub na adres w stopce — cytujemy tylko za wyraźną zgodą.
      </p>
    </section>
  )
}

export default SocialProofSection
