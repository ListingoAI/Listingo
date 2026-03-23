"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16">
      {/* Glow */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl animate-pulse-slow"
        aria-hidden
      />

      {/* Siatka */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(217.2 32.6% 17.5% / 0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-0 max-w-4xl flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400"
        >
          🚀 Nowa wersja 2.0 — generowanie ze zdjęć!
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 mb-6 tracking-tight text-foreground"
        >
          <span className="block text-5xl font-bold md:text-6xl lg:text-7xl">
            Opisy produktów
          </span>
          <span className="mt-1 block bg-linear-to-r from-emerald-400 to-emerald-600 bg-clip-text text-5xl font-bold text-transparent md:text-6xl lg:text-7xl">
            w 30 sekund
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl"
        >
          Wrzuć zdjęcie produktu lub wpisz dane — AI wygeneruje tytuł SEO, opis
          krótki, długi i tagi. Zoptymalizowane pod Allegro, Shopify i
          WooCommerce.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-col justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/register"
            className="rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:bg-emerald-600"
          >
            Zacznij za darmo →
          </Link>
          <Link
            href="#jak-dziala"
            className="rounded-xl border border-slate-700 px-8 py-4 text-lg font-medium text-foreground transition-all hover:border-emerald-500/50"
          >
            Zobacz jak działa ▶
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2"
        >
          <span className="text-sm text-muted-foreground">
            ✓ 5 opisów za darmo
          </span>
          <span className="text-sm text-muted-foreground">
            ✓ Bez karty kredytowej
          </span>
          <span className="text-sm text-muted-foreground">
            ✓ Gotowe w 30 sekund
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mx-auto mt-16 w-full max-w-3xl"
        >
          <div className="overflow-hidden rounded-xl shadow-2xl shadow-emerald-500/5 ring-1 ring-emerald-500/10">
            <div className="flex h-8 items-center gap-2 rounded-t-xl border border-border/50 bg-card/80 px-4">
              <div className="flex gap-2">
                <div
                  className="h-3 w-3 rounded-full bg-red-500/60"
                  aria-hidden
                />
                <div
                  className="h-3 w-3 rounded-full bg-yellow-500/60"
                  aria-hidden
                />
                <div
                  className="h-3 w-3 rounded-full bg-green-500/60"
                  aria-hidden
                />
              </div>
              <span className="ml-auto text-xs text-muted-foreground">
                listingo.pl/dashboard
              </span>
            </div>
            <div className="min-h-[200px] rounded-b-xl border border-t-0 border-border/50 bg-card/40 p-6">
              <p className="mb-4 text-lg font-semibold text-foreground">
                ✨ Generuj opis produktu
              </p>
              <div className="mb-3 flex min-h-10 items-center rounded-lg bg-secondary/50 p-3 text-left text-xs text-muted-foreground">
                Koszulka męska bawełniana oversize
              </div>
              <div className="mb-3 flex min-h-10 items-center rounded-lg bg-secondary/50 p-3 text-left text-xs text-muted-foreground">
                👕 Odzież i akcesoria
              </div>
              <div className="mb-3 flex min-h-10 items-center rounded-lg bg-secondary/50 p-3 text-left text-xs text-muted-foreground">
                100% bawełna, rozmiary S-XXL, oversize fit...
              </div>
              <div className="flex h-12 w-full items-center justify-center rounded-lg bg-emerald-500/80 font-medium text-white">
                ✨ Generuj opis
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
