"use client"

import { motion } from "framer-motion"
import Link from "next/link"

import { fadeSlideUp } from "@/lib/landing-motion"

export function CTASection() {
  return (
    <section className="relative overflow-hidden px-4 py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-950/30 via-emerald-950/10 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden
      />

      <motion.div
        {...fadeSlideUp}
        className="relative z-10 mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          Gotowy na lepsze opisy?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Dołącz do sprzedawców, którzy oszczędzają godziny każdego tygodnia i
          sprzedają więcej dzięki AI.
        </p>
        <Link
          href="/register"
          className="cta-primary-shimmer mt-8 inline-block rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:bg-emerald-400"
        >
          <span>Zacznij za darmo — 5 opisów gratis →</span>
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          Konfiguracja w 30 sekund. Bez karty kredytowej.
        </p>
      </motion.div>
    </section>
  )
}

export default CTASection
