"use client"

import { motion } from "framer-motion"

const features = [
  {
    emoji: "📸",
    name: "Ze zdjęcia do opisu",
    description:
      "Wrzuć zdjęcie produktu. AI rozpozna co to, wyciągnie cechy i wygeneruje pełny opis. Zero pisania.",
    badge: "UNIKALNE" as const,
  },
  {
    emoji: "🔍",
    name: "Analiza konkurencji",
    description:
      "Wklej URL produktu konkurenta. AI przeanalizuje ich opis i stworzy lepszy. Z lepszym SEO i konwersją.",
    badge: "UNIKALNE" as const,
  },
  {
    emoji: "⚡",
    name: "30 sekund na opis",
    description:
      "GPT-4 generuje profesjonalny opis szybciej niż zdążysz zaparzić kawę. Tytuł, opis, tagi — wszystko na raz.",
    badge: undefined,
  },
  {
    emoji: "🎨",
    name: "Twój styl, Twoja marka",
    description:
      "AI uczy się Twojego stylu pisania. Wklej swoje najlepsze opisy — każdy następny będzie brzmiał jak Twoja marka.",
    badge: "UNIKALNE" as const,
  },
  {
    emoji: "📊",
    name: "Wynik jakości",
    description:
      "Każdy opis dostaje ocenę 0-100 z konkretnymi wskazówkami jak go poprawić. Cel: zawsze 90+.",
    badge: "UNIKALNE" as const,
  },
  {
    emoji: "📦",
    name: "Masowe generowanie",
    description:
      "Masz 500 produktów? Wrzuć CSV — AI wygeneruje wszystkie opisy na raz. Eksport do Allegro lub Shopify.",
    badge: undefined,
  },
] as const

export function FeaturesSection() {
  return (
    <section id="funkcje" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <span className="mb-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            Funkcje
          </span>
          <h2 className="text-center text-3xl font-bold text-foreground md:text-4xl">
            Wszystko czego potrzebujesz
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            I kilka rzeczy, o których nie wiedziałeś że potrzebujesz
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-2xl border border-border/50 bg-card/50 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              {feature.badge ? (
                <span className="absolute top-4 right-4 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                  {feature.badge}
                </span>
              ) : null}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <span className="text-2xl" aria-hidden>
                  {feature.emoji}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.name}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
