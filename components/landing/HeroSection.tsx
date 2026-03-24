"use client"

import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { IntegrationLogosMarquee } from "@/components/landing/IntegrationLogosMarquee"
import { cn } from "@/lib/utils"

const TYPEWRITER_FULL = "Portfel męski skórzany premium"

const RESULT_TAGS = ["skórzany", "RFID", "premium", "prezent"] as const

const HERO_SCENES = [
  { id: "description", label: "Opis" },
  { id: "social", label: "Social" },
  { id: "price", label: "Cena" },
  { id: "photo", label: "Studio" },
  { id: "brand", label: "Brand" },
] as const

/** To samo zdjęcie produktu (Unsplash) — „przed” i „po” różnią się obróbką (filtry CSS). */
const HERO_STUDIO_PRODUCT_SRC =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=480&q=80"

const TYPE_MS = 72
const DELETE_MS = 42
const PAUSE_FULL_MS = 2600
const PAUSE_EMPTY_MS = 800

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

const AVATAR_INITIALS = ["AK", "MN", "PW", "JS", "KL"] as const
const AVATAR_COLORS = [
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
] as const

/** Szybkie „pill” pod nagłówkiem — spójne z kanałami w opisie (Allegro, Shopify, WooCommerce). */
const HERO_TRUST_PILLS = [
  {
    title: "Allegro · Amazon · Shopify · eBay",
    titleMobile: "Allegro · Amazon · Shopify",
    sub: "Formaty pod Twoje kanały",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden>
        <path stroke="currentColor" d="M3 7h14M3 7v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7M3 7l2-3h10l2 3" />
        <path stroke="currentColor" d="M10 10v4" />
      </svg>
    ),
  },
  {
    title: "Jedno konto, wiele narzędzi",
    sub: "Opis, social, cena, zdjęcia",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden>
        <path stroke="currentColor" d="M10 3v4M10 13v4M3 10h4M13 10h4" />
        <circle stroke="currentColor" cx="10" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Quality score wbudowany",
    sub: "SEO i czytelność na bieżąco",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden>
        <circle stroke="currentColor" cx="10" cy="10" r="7" />
        <path stroke="currentColor" d="M6.5 10l2.2 2.2L13.5 7.5" />
      </svg>
    ),
  },
] as const

export function HeroSection() {
  const [heroScene, setHeroScene] = useState(0)
  const [typedText, setTypedText] = useState("")
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    const isOpis = heroScene === 0
    const ms = isOpis ? 12_000 : 6500
    const t = window.setTimeout(() => {
      setHeroScene((i) => (i + 1) % HERO_SCENES.length)
    }, ms)
    return () => window.clearTimeout(t)
  }, [heroScene])

  useEffect(() => {
    if (heroScene !== 0) {
      setTypedText("")
      setShowResult(false)
      return
    }

    let cancelled = false

    async function typewriterLoop() {
      while (!cancelled) {
        for (let i = 1; i <= TYPEWRITER_FULL.length && !cancelled; i++) {
          setTypedText(TYPEWRITER_FULL.slice(0, i))
          await sleep(TYPE_MS)
        }
        if (cancelled) return

        setShowResult(true)
        await sleep(PAUSE_FULL_MS)
        if (cancelled) return

        setShowResult(false)
        for (
          let i = TYPEWRITER_FULL.length - 1;
          i >= 0 && !cancelled;
          i--
        ) {
          setTypedText(TYPEWRITER_FULL.slice(0, i))
          await sleep(DELETE_MS)
        }
        if (cancelled) return

        await sleep(PAUSE_EMPTY_MS)
      }
    }

    void typewriterLoop()
    return () => {
      cancelled = true
    }
  }, [heroScene])

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-20 pb-24">
      {/* 1. Main gradient */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,#0a2818_0%,#030712_50%,#030712_100%)]"
        aria-hidden
      />

      {/* 2. Perspective grid */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "perspective(800px) rotateX(12deg)",
          transformOrigin: "center top",
        }}
        aria-hidden
      />

      {/* 3. Glow top */}
      <div
        className="pointer-events-none absolute top-[-20%] left-1/2 z-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/8 blur-[120px]"
        aria-hidden
      />

      {/* 4. Glow bottom-right */}
      <div
        className="pointer-events-none absolute right-[-10%] bottom-[-10%] z-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[100px]"
        aria-hidden
      />

      {/* 5. Noise */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.015]"
        style={{ backgroundImage: NOISE_SVG }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 md:gap-16 lg:grid-cols-2">
          {/* Tekst pierwszy — na mobile mockup zawsze pod kopią (kolejność w DOM). */}
          <motion.div
            className="order-1 min-w-0 lg:order-0"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm font-medium text-emerald-400">
                Hub sprzedażowy AI dla e-commerce
              </span>
            </div>

            <h1 className="mt-8">
              <span className="block text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Sprzedawaj więcej.
              </span>
              <span className="mt-2 block text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
                <span className="bg-linear-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                  Rób mniej.
                </span>
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-300">
              Opisy, posty social media, e-maile, optymalne ceny — jeden asystent AI
              zamiast dziesiątek narzędzi. Zyskaj czas całego zespołu marketingu i skup
              się na skalowaniu. Gotowe formaty dla Allegro, Shopify i WooCommerce.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {HERO_TRUST_PILLS.map((pill) => (
                <div
                  key={pill.title}
                  className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 backdrop-blur-sm"
                >
                  {pill.icon}
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-semibold leading-snug text-foreground/95 sm:text-[13px]">
                      <span className="sm:hidden">
                        {"titleMobile" in pill && pill.titleMobile
                          ? pill.titleMobile
                          : pill.title}
                      </span>
                      <span className="hidden sm:inline">{pill.title}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-400 sm:text-xs">
                      {pill.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex w-full max-w-lg flex-col gap-3 md:flex-row md:max-w-none md:flex-wrap md:gap-4">
              <Link
                href="/register"
                className="cta-primary-shimmer group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-400 hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] md:w-auto"
              >
                <span>Zacznij za darmo</span>
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                href="#jak-dziala"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-medium text-foreground/85 backdrop-blur-sm transition-all duration-200 hover:border-emerald-400/40 hover:bg-white/12 hover:text-foreground hover:shadow-[0_0_24px_rgba(16,185,129,0.12)] active:scale-[0.99] md:w-auto"
                aria-label="Zobacz demo — przejdź do sekcji Jak działa"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-400">
                  ▶
                </span>
                Zobacz demo
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6">
              <div className="flex -space-x-3" aria-hidden>
                {AVATAR_INITIALS.map((initials, i) => (
                  <div
                    key={initials}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background text-xs font-semibold text-white"
                    style={{
                      backgroundColor: AVATAR_COLORS[i],
                      zIndex: 5 - i,
                    }}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Wczesny dostęp
                </p>
                <p className="text-xs text-muted-foreground">
                  Zbieramy opinie od pierwszych sklepów — przetestuj za darmo i
                  powiedz, czego Ci brakuje.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Mockup pod treścią przy jednej kolumnie (poniżej breakpointu lg). */}
          <motion.div
            className="relative order-2 w-full min-w-0 lg:order-0"
            initial={{ opacity: 0, x: 30, rotateY: -5 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ perspective: "1200px" }}
          >
            <div
              className="pointer-events-none absolute -inset-8 z-[-1] rounded-4xl bg-emerald-500/12 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -inset-3 z-[-1] rounded-[1.35rem] bg-emerald-500/8 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -inset-px z-[-1] rounded-2xl bg-linear-to-b from-emerald-500/25 via-emerald-500/5 to-transparent"
              aria-hidden
            />

            <div
              className="relative transform-[rotateY(-2deg)] overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-[0_24px_90px_rgba(0,0,0,0.55),0_0_80px_rgba(16,185,129,0.15),0_0_1px_rgba(16,185,129,0.35)_inset] backdrop-blur-xl transition-transform duration-700 hover:transform-[rotateY(0deg)]"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex h-10 items-center gap-2 border-b border-white/5 bg-card px-4">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-red-500/70"
                  aria-hidden
                />
                <span
                  className="h-2.5 w-2.5 rounded-full bg-yellow-500/70"
                  aria-hidden
                />
                <span
                  className="h-2.5 w-2.5 rounded-full bg-emerald-500/70"
                  aria-hidden
                />
                <div className="flex-1 text-center">
                  <span className="font-mono text-xs text-muted-foreground/50">
                    listingo.pl/dashboard
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div
                  className="flex flex-wrap items-center gap-1"
                  role="tablist"
                  aria-label="Podgląd modułów aplikacji"
                >
                  {HERO_SCENES.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={i === heroScene}
                      onClick={() => setHeroScene(i)}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        i === heroScene
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-white/5 text-muted-foreground/60 hover:bg-white/10 hover:text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={HERO_SCENES[heroScene].id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-4"
                  >
                    {heroScene === 0 ? (
                      <>
                        <div className="rounded-xl border border-white/5 bg-white/3 p-4">
                          <p className="mb-1 text-xs text-muted-foreground/50">
                            Nazwa produktu
                          </p>
                          <p className="typing-cursor min-h-[1.35rem] text-sm text-foreground">
                            {typedText}
                          </p>
                        </div>

                        {showResult ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.5 }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-medium text-emerald-400">
                                  Wygenerowano
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                                    <span className="text-[10px] font-bold text-white">
                                      94
                                    </span>
                                  </div>
                                  <span className="text-xs text-emerald-400">
                                    /100
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                Portfel Męski Skórzany RFID | Skóra Naturalna
                                Premium
                              </p>
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {RESULT_TAGS.map((tag, idx) => (
                                  <motion.span
                                    key={tag}
                                    initial={{ opacity: 0, y: 14, scale: 0.88 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 420,
                                      damping: 24,
                                      delay: idx * 0.07,
                                    }}
                                    className="inline-block"
                                  >
                                    <motion.span
                                      className="inline-block rounded-md border border-emerald-500/15 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400/85 shadow-sm shadow-emerald-500/10"
                                      animate={{ y: [0, -3, 0] }}
                                      transition={{
                                        duration: 3.2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 0.35 + idx * 0.14,
                                      }}
                                    >
                                      {tag}
                                    </motion.span>
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ) : null}
                      </>
                    ) : null}

                    {heroScene === 1 ? (
                      <div className="rounded-xl border border-white/5 bg-white/3 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <div
                            className="h-8 w-8 shrink-0 rounded-full bg-linear-to-br from-emerald-500/50 to-teal-600/35"
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">
                              twój_sklep
                            </p>
                            <p className="text-[10px] text-muted-foreground/60">
                              Post · Instagram / Facebook
                            </p>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">
                          Nowy portfel RFID w ofercie — skóra naturalna,
                          świetny na prezent 🎁 Dostawa 24h.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {["#nowość", "#prezent", "#RFID"].map((h) => (
                            <span
                              key={h}
                              className="text-[10px] font-medium text-emerald-400/90"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {heroScene === 2 ? (
                      <div className="rounded-xl border border-white/5 bg-white/3 p-4">
                        <p className="text-xs text-muted-foreground/60">
                          Sugestia ceny · marketplace
                        </p>
                        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                          189 zł
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Średnia na liście:{" "}
                          <span className="text-foreground/80">165 – 210 zł</span>
                        </p>
                        <div className="mt-3 inline-flex rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                          Marża w bezpiecznym zakresie
                        </div>
                      </div>
                    ) : null}

                    {heroScene === 3 ? (
                      <div className="space-y-2">
                        <div className="relative grid grid-cols-2 gap-1.5">
                          <div
                            className="group relative aspect-4/5 overflow-hidden rounded-lg border border-white/15 bg-neutral-900/80"
                            title="Surowe zdjęcie — słabe światło, szary produkt"
                          >
                            <Image
                              src={HERO_STUDIO_PRODUCT_SRC}
                              alt=""
                              fill
                              sizes="(max-width: 1024px) 42vw, 220px"
                              className="object-cover brightness-[0.58] contrast-[0.88] saturate-[0.42] hue-rotate-[-10deg] transition-transform duration-700 group-hover:scale-[1.03]"
                              aria-hidden
                            />
                            <div
                              className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/55 via-neutral-900/15 to-amber-950/25 mix-blend-multiply"
                              aria-hidden
                            />
                            <div
                              className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
                              style={{
                                backgroundImage:
                                  "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.12) 1px, rgba(0,0,0,0.12) 2px)",
                              }}
                              aria-hidden
                            />
                            <span className="absolute top-1.5 left-1.5 rounded border border-white/10 bg-black/50 px-1 py-px text-[7px] font-medium tracking-wide text-white/90 uppercase backdrop-blur-sm">
                              Surowe
                            </span>
                            <span className="absolute right-1.5 bottom-1.5 left-1.5 text-center text-[8px] font-medium text-white/95 drop-shadow-md">
                              Przed · telefon, szum, płaski kolor
                            </span>
                          </div>

                          <div
                            className="group relative aspect-4/5 overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_24px_rgba(16,185,129,0.18)]"
                            title="Po obróbce — światło, kolor, tło pod listing"
                          >
                            <Image
                              src={HERO_STUDIO_PRODUCT_SRC}
                              alt=""
                              fill
                              sizes="(max-width: 1024px) 42vw, 220px"
                              className="object-cover brightness-[1.08] contrast-[1.08] saturate-[1.22] transition-transform duration-700 group-hover:scale-[1.03]"
                              aria-hidden
                            />
                            <div
                              className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/12 via-transparent to-emerald-500/10"
                              aria-hidden
                            />
                            <div
                              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-emerald-400/30"
                              aria-hidden
                            />
                            <span className="absolute top-1.5 right-1.5 rounded bg-emerald-500 px-1 py-px text-[7px] font-bold tracking-wide text-black uppercase shadow-sm shadow-emerald-500/40">
                              Po AI
                            </span>
                            <span className="absolute right-1.5 bottom-1.5 left-1.5 text-center text-[8px] font-medium text-emerald-100 drop-shadow-md">
                              Światło · kolor · czyste tło
                            </span>
                          </div>

                          <span
                            className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-background/90 text-[10px] text-emerald-400 shadow-lg backdrop-blur-md"
                            aria-hidden
                          >
                            →
                          </span>
                        </div>
                        <p className="text-center text-[10px] text-muted-foreground/75">
                          Ta sama karta produktu — tylko obróbka w Photo Studio
                        </p>
                      </div>
                    ) : null}

                    {heroScene === 4 ? (
                      <div className="rounded-xl border border-white/5 bg-white/3 p-4">
                        <p className="mb-2 text-xs font-medium text-emerald-400">
                          Brand Voice
                        </p>
                        <div className="mb-3 flex flex-wrap gap-1">
                          {["Konkretnie", "Premium", "Bez lania wody"].map(
                            (t) => (
                              <span
                                key={t}
                                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {t}
                              </span>
                            )
                          )}
                        </div>
                        <p className="border-l-2 border-emerald-500/40 pl-3 text-xs leading-relaxed text-foreground/85 italic">
                          „Krótkie zdania, mocne benefity — ten sam ton w opisie,
                          mailu i na socialu.”
                        </p>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative mt-20"
        >
          <div className="text-center">
            <div className="mb-8 flex items-center justify-center gap-3 sm:gap-4">
              <span
                className="h-px w-10 bg-linear-to-r from-transparent to-border/80 sm:w-16"
                aria-hidden
              />
              <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground/45 uppercase">
                Zintegrowany z
              </p>
              <span
                className="h-px w-10 bg-linear-to-l from-transparent to-border/80 sm:w-16"
                aria-hidden
              />
            </div>
            <p className="sr-only">
              Logotypy partnerów: Allegro, Amazon, Shopify, Shoper, WooCommerce, eBay i inne.
            </p>
            <IntegrationLogosMarquee />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default HeroSection
