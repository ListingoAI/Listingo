"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useState } from "react"

import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

type FeatureItem = { ok: boolean; text: string }

const freeFeatures: FeatureItem[] = [
  { ok: true, text: "5 opisów miesięcznie" },
  { ok: true, text: "Tryb formularzowy" },
  { ok: true, text: "1 platforma (Allegro)" },
  { ok: true, text: "Tytuł SEO + opis + tagi" },
  { ok: true, text: "Quality Score" },
  { ok: false, text: "Analiza zdjęć" },
  { ok: false, text: "Analiza konkurencji" },
  { ok: false, text: "Brand Voice" },
  { ok: false, text: "Bulk mode" },
]

const starterFeatures: FeatureItem[] = [
  { ok: true, text: "100 opisów miesięcznie" },
  { ok: true, text: "Tryb formularzowy" },
  { ok: true, text: "📸 Analiza zdjęć" },
  { ok: true, text: "Wszystkie platformy" },
  { ok: true, text: "Tytuł SEO + opis + tagi + meta" },
  { ok: true, text: "Quality Score + porady" },
  { ok: true, text: "Brand Voice" },
  { ok: true, text: "Historia opisów" },
  { ok: false, text: "Analiza konkurencji" },
  { ok: false, text: "Bulk mode" },
]

const proFeatures: FeatureItem[] = [
  { ok: true, text: "Nielimitowane opisy" },
  { ok: true, text: "Wszystko ze Starter" },
  { ok: true, text: "🔍 Analiza konkurencji (URL)" },
  { ok: true, text: "📦 Bulk mode (CSV)" },
  { ok: true, text: "API dostęp" },
  { ok: true, text: "Priorytetowe generowanie" },
  { ok: true, text: "Dedykowane wsparcie" },
]

function FeatureList({ items }: { items: FeatureItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.text}
          className="flex items-start gap-2 text-sm"
        >
          {item.ok ? (
            <>
              <span className="shrink-0 text-emerald-400">✓</span>
              <span className="text-foreground">{item.text}</span>
            </>
          ) : (
            <>
              <span className="shrink-0 text-muted-foreground/50">✗</span>
              <span className="text-muted-foreground/50 line-through">
                {item.text}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section id="cennik" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <span className="mb-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            Cennik
          </span>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Prosty cennik. Bez haczyków.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Zacznij za darmo. Skaluj gdy rośniesz.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-3">
            <span
              className={`text-sm ${!isYearly ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              Miesięcznie
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              aria-label="Przełącz rozliczenie roczne"
            />
            <span
              className={`text-sm ${isYearly ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              Rocznie
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
              oszczędź 20%
            </span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 pt-4 md:grid-cols-3 md:items-start">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border/50 bg-card/30 p-8 transition-all hover:border-border"
          >
            <p className="text-lg font-semibold text-foreground">Free</p>
            <p className="mt-2 text-4xl font-bold text-foreground">0 zł</p>
            <p className="text-sm text-muted-foreground">/na zawsze</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Na start i testowanie
            </p>
            <Separator className="my-6 bg-border/50" />
            <FeatureList items={freeFeatures} />
            <Link
              href="/register"
              className="mt-8 block w-full rounded-xl border border-border px-6 py-3 text-center font-medium text-foreground transition-all hover:border-emerald-500/50"
            >
              Zacznij za darmo
            </Link>
          </motion.div>

          {/* Starter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative z-10 scale-105 rounded-2xl border-2 border-emerald-500/50 bg-card/50 p-8 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/20"
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-medium whitespace-nowrap text-white">
              ⭐ Najpopularniejszy
            </span>
            <p className="text-lg font-semibold text-foreground">Starter</p>
            <p className="mt-2 text-4xl font-bold text-emerald-400">
              {isYearly ? "79 zł" : "99 zł"}
              <span className="text-2xl font-bold">/mies</span>
            </p>
            {isYearly ? (
              <p className="text-sm text-muted-foreground">(948 zł/rok)</p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              Dla aktywnych sprzedawców
            </p>
            <Separator className="my-6 bg-border/50" />
            <FeatureList items={starterFeatures} />
            <Link
              href="/register"
              className="mt-8 block w-full rounded-xl bg-emerald-500 px-6 py-3 text-center font-semibold text-white transition-all hover:scale-105 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25"
            >
              Wybierz Starter →
            </Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-border/50 bg-card/30 p-8 transition-all hover:border-border"
          >
            <p className="text-lg font-semibold text-foreground">Pro</p>
            <p className="mt-2 text-4xl font-bold text-foreground">
              {isYearly ? "199 zł" : "249 zł"}
              <span className="text-2xl font-bold">/mies</span>
            </p>
            {isYearly ? (
              <p className="text-sm text-muted-foreground">(2388 zł/rok)</p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              Dla poważnych biznesów
            </p>
            <Separator className="my-6 bg-border/50" />
            <FeatureList items={proFeatures} />
            <Link
              href="/register"
              className="mt-8 block w-full rounded-xl border border-border px-6 py-3 text-center font-medium text-foreground transition-all hover:border-emerald-500/50"
            >
              Wybierz Pro →
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
