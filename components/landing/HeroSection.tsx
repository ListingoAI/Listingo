"use client"

import { AnimatePresence, motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  Ban,
  BarChart3,
  Bookmark,
  Calculator,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Copy,
  Crown,
  Download,
  Edit2,
  FileEdit,
  FileText,
  GripVertical,
  Hash,
  Heart,
  Lightbulb,
  MessageCircle,
  MoreHorizontal,
  Palette,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Wand2,
  XCircle,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

import { IntegrationLogosMarquee } from "@/components/landing/IntegrationLogosMarquee"
import { cn } from "@/lib/utils"

/** Skrót ze składem w tekście, ale bez koloru w formie pod listing (typowy chaos sprzedawcy). */
const TYPEWRITER_FULL =
  "Marynarka damska wełniana slim fit 100% wełna merynos"

const RESULT_TAGS = ["żółta", "Merino 100%", "slim fit", "Roz. 34–42"] as const

/** Warianty zoptymalizowanego tytułu — demo „Generuj warianty”; stringi = kopiowanie do schowka. */
const HERO_OPTIMIZED_TITLES = [
  "Marynarka Damska Wełniana Slim Fit | Wełna 100% Merino | [Żółta] | Roz. 34–42",
  "Marynarka Damska Wełniana | Krój ołówkowy | Żółta · Wełna Merino | Roz. 34–42",
  "Marynarka Wełniana Slim Fit Żółta | Office & Casual | Rozmiary 34–42",
  "Marynarka Wełniana Damska Żółta | Zapinana na 1 guzik | Wełna 100% | Roz. 34–42",
] as const

const titleEm = (children: ReactNode) => (
  <strong className="font-semibold text-white">{children}</strong>
)
const titleAm = (children: ReactNode) => (
  <span className="font-semibold text-amber-400">{children}</span>
)

type HeroSceneDef = {
  id: string
  label: string
  icon: LucideIcon
}

const HERO_SCENES: readonly HeroSceneDef[] = [
  { id: "description", label: "Opis", icon: FileText },
  { id: "social", label: "Social", icon: Share2 },
  { id: "price", label: "Cena", icon: TrendingUp },
  { id: "photo", label: "Studio", icon: Camera },
  { id: "brand", label: "Brand", icon: Crown },
] as const satisfies readonly HeroSceneDef[]

/** Zdjęcia demo Photo Studio — prawdziwe „przed” (telefon) i „po” (packshot). */
const HERO_STUDIO_BEFORE_SRC = "/hero-studio/przed.webp"
const HERO_STUDIO_AFTER_SRC = "/hero-studio/po.webp"

const STUDIO_FEATURE_LINES = [
  "Automatyczne usunięcie tła",
  "Korekta oświetlenia i balansu bieli",
  "Wygeneruje idealne tło pod Twój produkt",
] as const

const HERO_SOCIAL_POST_TEXT =
  "Żółta marynarka wełniana już w kolekcji — slim fit, Merino ✨ Od biura po wieczór wyjściowy. Wysyłka 24h."

const HERO_SOCIAL_HASHTAGS = [
  "#nowość",
  "#żółta",
  "#modadamska",
  "#office",
  "#wełna",
] as const

/** Demo zakładki Cena — zakres rynku i sugerowana cena (pozycja na pasku). */
const HERO_PRICE_MIN = 389
const HERO_PRICE_MAX = 519
const HERO_PRICE_SUGGESTED = 449
const HERO_PRICE_BAR_PCT =
  ((HERO_PRICE_SUGGESTED - HERO_PRICE_MIN) /
    (HERO_PRICE_MAX - HERO_PRICE_MIN)) *
  100

function HeroStudioComparisonSlider() {
  const [pct, setPct] = useState(10)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const duration = 1400
    const from = 10
    const to = 50
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - u) ** 3
      setPct(from + (to - from) * eased)
      if (u < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-emerald-500/20 bg-black/40 shadow-[inset_0_0_24px_rgba(16,185,129,0.06)]">
      <div className="relative aspect-4/5 w-full">
        {/* Warstwa „po” — pełna, packshot */}
        <Image
          src={HERO_STUDIO_AFTER_SRC}
          alt="Packshot produktu po obróbce w Photo Studio"
          fill
          sizes="(max-width: 1024px) 92vw, 520px"
          className="object-cover object-center"
          priority={false}
          draggable={false}
        />

        {/* Warstwa „przed” — oryginał z telefonu, przycinana od lewej */}
        <div
          className="absolute inset-0 z-1"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        >
          <Image
            src={HERO_STUDIO_BEFORE_SRC}
            alt="Zdjęcie z telefonu — wersja przed obróbką AI"
            fill
            sizes="(max-width: 1024px) 92vw, 520px"
            className="object-cover object-center"
            draggable={false}
          />
        </div>

        {/* Uchwyt + linia */}
        <div
          className="pointer-events-none absolute inset-y-0 z-2 w-0"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          aria-hidden
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.45)]" />
          <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/90 bg-background/85 text-emerald-400 shadow-lg backdrop-blur-sm">
            <GripVertical className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          </div>
        </div>

        <label className="absolute inset-0 z-3 cursor-ew-resize">
          <span className="sr-only">Przesuń, by porównać zdjęcie przed i po obróbce</span>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            onChange={(e) => setPct(Number(e.target.value))}
            aria-valuetext={`Widoczne ${pct} procent oryginału z lewej`}
          />
        </label>

        <span className="pointer-events-none absolute bottom-2 left-2 z-4 flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-[10px] font-medium tracking-wide text-white shadow-md backdrop-blur-sm">
          <Smartphone className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
          Oryginał
        </span>
        <span className="pointer-events-none absolute right-2 bottom-2 z-4 flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-semibold tracking-wide text-white shadow-md shadow-emerald-500/30">
          <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
          Gotowe
        </span>
      </div>
    </div>
  )
}

const TYPE_MS = 95
const DELETE_MS = 58
/** Czas na przeczytanie karty wyniku (tytuł, tagi, „Dlaczego to zadziała?”) przed schowaniem. */
const PAUSE_FULL_MS = 15_000
const PAUSE_EMPTY_MS = 2200

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
    title: "5 narzędzi w jednym",
    sub: "Opis, social, cena, zdjęcia, brand",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden>
        <path stroke="currentColor" d="M10 3v4M10 13v4M3 10h4M13 10h4" />
        <circle stroke="currentColor" cx="10" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Ocena jakości w czasie rzeczywistym",
    sub: "SEO i czytelność na bieżąco",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden>
        <circle stroke="currentColor" cx="10" cy="10" r="7" />
        <path stroke="currentColor" d="M6.5 10l2.2 2.2L13.5 7.5" />
      </svg>
    ),
  },
] as const

function HeroOptimizedTitleLine({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <>
          Marynarka Damska Wełniana {titleEm("Slim Fit")} |{" "}
          {titleEm("Wełna 100%")} Merino | {titleAm("[Żółta]")} |{" "}
          {titleEm("Roz. 34–42")}
        </>
      )
    case 1:
      return (
        <>
          Marynarka Damska Wełniana | {titleEm("Krój ołówkowy")} |{" "}
          {titleAm("Żółta")} · {titleEm("Wełna Merino")} | {titleEm("Roz. 34–42")}
        </>
      )
    case 2:
      return (
        <>
          Marynarka Wełniana {titleEm("Slim Fit")} {titleAm("Żółta")} |{" "}
          {titleEm("Office & Casual")} | {titleEm("Rozmiary 34–42")}
        </>
      )
    case 3:
      return (
        <>
          Marynarka Wełniana Damska {titleAm("Żółta")} | Zapinana na 1 guzik |{" "}
          {titleEm("Wełna 100%")} | {titleEm("Roz. 34–42")}
        </>
      )
    default:
      return <>{HERO_OPTIMIZED_TITLES[0]}</>
  }
}

const STUDIO_STYLE_CATEGORIES = [
  { key: "ecommerce", label: "E-commerce", seasonalChip: false },
  { key: "lifestyle", label: "Lifestyle", seasonalChip: false },
  { key: "premium", label: "Premium", seasonalChip: false },
  { key: "seasonal", label: "Sezonowe", seasonalChip: true },
  { key: "social", label: "Social Media", seasonalChip: false },
] as const

type StudioStyleKey = (typeof STUDIO_STYLE_CATEGORIES)[number]["key"]

const STUDIO_CATEGORY_SCENES: Record<
  StudioStyleKey,
  { title: string; badge?: { text: string; className: string } }[]
> = {
  ecommerce: [
    {
      title: "Allegro / OLX",
      badge: {
        text: "ALLEGRO",
        className: "bg-orange-500/20 text-orange-400",
      },
    },
    {
      title: "Amazon",
      badge: {
        text: "AMAZON",
        className: "bg-sky-500/20 text-sky-300",
      },
    },
    { title: "Jasne szare" },
  ],
  lifestyle: [
    { title: "Salon · dom", badge: { text: "HOME", className: "bg-emerald-500/15 text-emerald-400" } },
    { title: "Miasto / outdoor" },
    { title: "Flat lay" },
  ],
  premium: [
    { title: "Marmur + akcent" },
    { title: "Ciemna scena" },
    { title: "Luksusowe tło" },
  ],
  seasonal: [
    { title: "Święta · zima" },
    { title: "Walentynki" },
    { title: "Black Friday" },
  ],
  social: [
    { title: "Feed 4:5" },
    { title: "Stories 9:16" },
    { title: "Karuzela produktowa" },
  ],
}

export function HeroSection() {
  const [heroScene, setHeroScene] = useState(0)
  const [typedText, setTypedText] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [optimizedTitleIndex, setOptimizedTitleIndex] = useState(0)
  const [studioStyleCategory, setStudioStyleCategory] = useState(0)

  useEffect(() => {
    if (!showResult) setOptimizedTitleIndex(0)
  }, [showResult])

  useEffect(() => {
    const isOpis = heroScene === 0
    /** Opis: dłużej niż jeden cykl typewriter + pauza na wynik, żeby nie przełączać zakładki w trakcie czytania. */
    const ms = isOpis ? 32_000 : 10_000
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
        <div className="grid grid-cols-1 items-start gap-12 md:gap-16 lg:grid-cols-2">
          {/* Tekst pierwszy — na mobile mockup zawsze pod kopią (kolejność w DOM). */}
          <motion.div
            className="order-1 min-w-0 lg:order-0"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 backdrop-blur-sm">
              <Sparkles
                className="h-4 w-4 shrink-0 text-emerald-400"
                strokeWidth={2}
                aria-hidden
              />
              <span className="text-sm font-medium text-emerald-400">
                Napędzane przez AI nowej generacji
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
              Tworzenie opisów, zdjęć i postów zajmuje godziny. Listingo robi to w
              sekundach — a Twoje oferty sprzedają lepiej niż kiedykolwiek.
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
                aria-label="Jak to działa? — przejdź do sekcji Jak działa"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-400">
                  <ChevronDown
                    className="h-4 w-4 text-emerald-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
                Jak to działa?
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
                  {HERO_SCENES.map((s, i) => {
                    const Icon = s.icon
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={i === heroScene}
                        onClick={() => setHeroScene(i)}
                        className={cn(
                          "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                          i === heroScene
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/5 text-muted-foreground/60 hover:bg-white/10 hover:text-muted-foreground"
                        )}
                      >
                        <Icon
                          className="h-3 w-3 shrink-0"
                          strokeWidth={2}
                          aria-hidden
                        />
                        {s.label}
                      </button>
                    )
                  })}
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
                        <div className="rounded-xl border border-white/5 bg-white/3 p-4 shadow-[inset_0_0_15px_rgba(255,255,255,0.02)]">
                          <p className="mb-1.5 text-xs font-medium text-emerald-400/70">
                            Surowy opis produktu
                          </p>
                          <p className="typing-cursor min-h-7 text-lg font-semibold text-foreground">
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
                            <div className="relative mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 shadow-[inset_0_0_20px_rgba(16,185,129,0.05),0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md">
                              {/* Header & Score */}
                              <div className="mb-4 flex items-start justify-between gap-4">
                                <div>
                                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Zoptymalizowany tytuł pod sprzedaż
                                  </span>
                                  <div className="mt-2 min-h-14">
                                    <AnimatePresence mode="wait">
                                      <motion.p
                                        key={optimizedTitleIndex}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.38, ease: "easeOut" }}
                                        className="text-xl font-bold leading-tight text-foreground drop-shadow-sm"
                                      >
                                        <HeroOptimizedTitleLine
                                          index={optimizedTitleIndex}
                                        />
                                      </motion.p>
                                    </AnimatePresence>
                                  </div>
                                </div>
                                
                                {/* Circular Score */}
                                <div className="flex shrink-0 flex-col items-center justify-center gap-1.5">
                                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <svg
                                      className="absolute inset-0 h-full w-full -rotate-90 transform"
                                      viewBox="0 0 48 48"
                                      aria-hidden
                                    >
                                      <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        fill="transparent"
                                        className="text-emerald-950/50"
                                      />
                                      <motion.circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        fill="transparent"
                                        strokeLinecap="round"
                                        strokeDasharray="125"
                                        className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                        initial={{ strokeDashoffset: 125 }}
                                        animate={{ strokeDashoffset: 2.5 }}
                                        transition={{
                                          duration: 1.15,
                                          ease: [0.22, 1, 0.36, 1],
                                        }}
                                      />
                                    </svg>
                                    <span className="text-sm font-bold text-white tabular-nums">
                                      98
                                    </span>
                                  </div>
                                  <div
                                    className="flex items-center gap-1 text-emerald-400"
                                    aria-label="Ocena tytułu: doskonała"
                                  >
                                    <motion.span
                                      className="inline-flex"
                                      aria-hidden
                                      animate={{
                                        opacity: [0.45, 1, 0.45],
                                        scale: [0.94, 1.06, 0.94],
                                      }}
                                      transition={{
                                        duration: 2.5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                      }}
                                    >
                                      <Sparkles
                                        className="h-3 w-3 text-emerald-300"
                                        strokeWidth={2}
                                      />
                                    </motion.span>
                                    <span className="text-[9px] font-semibold tracking-wide text-emerald-400/95">
                                      Doskonały
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Tags */}
                              <div className="mb-5 flex flex-wrap gap-2">
                                {RESULT_TAGS.map((tag, idx) => (
                                  <motion.span
                                    key={tag}
                                    initial={{ opacity: 0, y: 14, scale: 0.88 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 420, damping: 24, delay: idx * 0.07 }}
                                    className="inline-block"
                                  >
                                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 shadow-sm transition-transform duration-200 hover:scale-105 hover:bg-emerald-500/20 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                      {tag}
                                    </span>
                                  </motion.span>
                                ))}
                              </div>

                              <hr className="my-4 border-white/5" />

                              {/* Why it works section */}
                              <div className="mb-4">
                                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80">
                                  <ClipboardList
                                    className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                                    aria-hidden
                                  />
                                  Dlaczego to zadziała?
                                </p>
                                <ul className="space-y-1.5">
                                  <li className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                                    <AlertTriangle
                                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400"
                                      aria-hidden
                                    />
                                    <span>
                                      Brak koloru w oryginalnym tekście — AI
                                      dodało{" "}
                                      <span className="font-medium text-emerald-300">
                                        [Żółta]
                                      </span>{" "}
                                      na końcu. Kolor w tytule zwiększa CTR o{" "}
                                      <span className="font-medium text-emerald-300">
                                        35%
                                      </span>
                                      .
                                    </span>
                                  </li>
                                  <li className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                    <span>
                                      <span className="font-medium text-emerald-300">
                                        Slim Fit
                                      </span>{" "}
                                      + zakres{" "}
                                      <span className="font-medium text-emerald-300">
                                        34–42
                                      </span>{" "}
                                      filtrują klientki od razu — mniej zwrotów,
                                      wyższa konwersja.
                                    </span>
                                  </li>
                                  <li className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                    <span>
                                      Fraza{" "}
                                      <span className="font-medium text-emerald-300">
                                        Merino 100%
                                      </span>{" "}
                                      dopasowana do wyszukiwań kupujących —
                                      uzasadnia cenę premium.
                                    </span>
                                  </li>
                                </ul>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  aria-label="Kopiuj"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                                  onClick={async () => {
                                    const text =
                                      HERO_OPTIMIZED_TITLES[optimizedTitleIndex]
                                    try {
                                      await navigator.clipboard.writeText(text)
                                      toast.success("Skopiowano!")
                                    } catch {
                                      toast.error("Nie udało się skopiować")
                                    }
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Edytuj"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                                  onClick={() =>
                                    toast("Pełna edycja tytułu po zalogowaniu w aplikacji.", {
                                      icon: (
                                        <Edit2 className="h-4 w-4 text-emerald-400" aria-hidden />
                                      ),
                                    })
                                  }
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Generuj warianty"
                                  className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                                  onClick={() =>
                                    setOptimizedTitleIndex(
                                      (i) => (i + 1) % HERO_OPTIMIZED_TITLES.length
                                    )
                                  }
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Generuj warianty
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ) : null}
                      </>
                    ) : null}

                    {heroScene === 1 ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-white/5 bg-white/3 p-4 shadow-[inset_0_0_15px_rgba(255,255,255,0.02)]">
                          <p className="mb-1.5 text-xs font-medium text-muted-foreground/70">
                            💬 Twój brief
                          </p>
                          <p className="text-sm font-semibold leading-snug text-foreground">
                            Nowa marynarka wełniana, slim fit, Merino. Post na
                            Instagram.
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-white/3 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500/50 to-teal-600/35 text-xs font-bold text-white"
                              aria-hidden
                            >
                              T
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1 truncate text-xs font-medium text-foreground">
                                <span className="truncate">@twoj.sklep</span>
                                <CheckCircle2
                                  className="h-3 w-3 shrink-0 text-blue-400"
                                  aria-label="Zweryfikowany profil"
                                  strokeWidth={2}
                                />
                              </p>
                              <p className="text-[10px] text-muted-foreground/60">
                                Sponsored · Instagram
                              </p>
                            </div>
                            <div className="ml-auto flex shrink-0 items-center gap-2">
                              <span className="text-[10px] text-muted-foreground/40">
                                2 min
                              </span>
                              <MoreHorizontal
                                className="h-4 w-4 text-muted-foreground/40"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {HERO_SOCIAL_POST_TEXT}
                          </p>
                          <div
                            className="mt-3 flex items-center gap-5"
                            aria-hidden
                          >
                            <Heart
                              className="h-4 w-4 text-muted-foreground/40"
                              strokeWidth={1.75}
                            />
                            <MessageCircle
                              className="h-4 w-4 text-muted-foreground/40"
                              strokeWidth={1.75}
                            />
                            <Send
                              className="h-4 w-4 text-muted-foreground/40"
                              strokeWidth={1.75}
                            />
                            <Bookmark
                              className="h-4 w-4 text-muted-foreground/40"
                              strokeWidth={1.75}
                            />
                          </div>
                          <p className="mt-2 text-[10px] text-muted-foreground/50">
                            ~120–180 polubień (szacunek AI)
                          </p>
                          <p className="mt-3 text-[10px] text-muted-foreground/60">
                            Wyselekcjonowane hashtagi (mix zasięgowy)
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {HERO_SOCIAL_HASHTAGS.map((h) => (
                              <span
                                key={h}
                                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-emerald-950/10 p-4 shadow-[inset_0_0_16px_rgba(16,185,129,0.04)]">
                          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80">
                            <Lightbulb
                              className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                              aria-hidden
                            />
                            Analiza posta
                          </p>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-[11px] text-muted-foreground/80">
                              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              <span>
                                Optymalny czas publikacji:{" "}
                                <span className="font-medium text-foreground/90">
                                  Środa, 18:30
                                </span>
                              </span>
                            </li>
                            <li className="flex items-start gap-2 text-[11px] text-muted-foreground/80">
                              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              <span>
                                Szacowany zasięg:{" "}
                                <span className="font-medium text-emerald-400">
                                  Wysoki
                                </span>
                              </span>
                            </li>
                            <li className="flex items-start gap-2 text-[11px] text-muted-foreground/80">
                              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              <span>
                                Ton:{" "}
                                <span className="font-medium text-foreground/90">
                                  Sprzedażowy z emocją
                                </span>
                              </span>
                            </li>
                          </ul>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  HERO_SOCIAL_POST_TEXT
                                )
                                toast.success("Skopiowano treść!")
                              } catch {
                                toast.error("Nie udało się skopiować")
                              }
                            }}
                          >
                            <Copy className="h-3 w-3 shrink-0" />
                            Kopiuj treść
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  HERO_SOCIAL_HASHTAGS.join(" ")
                                )
                                toast.success("Skopiowano hashtagi!")
                              } catch {
                                toast.error("Nie udało się skopiować")
                              }
                            }}
                          >
                            <Hash className="h-3 w-3 shrink-0" />
                            Kopiuj hashtagi
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                            onClick={() =>
                              toast("Zmiana tonu — pełna wersja po zalogowaniu.", {
                                icon: (
                                  <Sparkles
                                    className="h-4 w-4 text-emerald-400"
                                    aria-hidden
                                  />
                                ),
                              })
                            }
                          >
                            <Sparkles className="h-3 w-3 shrink-0" />
                            Zmień ton
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {heroScene === 2 ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-white/5 bg-white/3 p-4">
                          <p className="text-xs font-medium text-muted-foreground/70">
                            💰 Optymalna cena sprzedaży
                          </p>
                          <div className="mt-2 flex items-baseline justify-between gap-3">
                            <p className="text-2xl font-bold tracking-tight text-foreground">
                              {HERO_PRICE_SUGGESTED} zł
                            </p>
                            <span className="shrink-0 text-sm line-through text-muted-foreground/40">
                              549 zł
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground/50">
                            Sugerowana cena z efektem promocji
                          </p>

                          <div className="mt-4">
                            <div className="relative pt-2 pb-1">
                              <div className="relative h-2 overflow-visible rounded-full bg-white/5">
                                <div
                                  className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-emerald-600/85 to-emerald-400"
                                  style={{
                                    width: `${HERO_PRICE_BAR_PCT}%`,
                                  }}
                                />
                                <div
                                  className="absolute top-1/2 z-1 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]"
                                  style={{ left: `${HERO_PRICE_BAR_PCT}%` }}
                                  aria-hidden
                                />
                              </div>
                            </div>
                            <div className="mt-3 flex justify-between gap-2 text-[10px]">
                              <div className="min-w-0 text-left">
                                <p className="font-medium text-muted-foreground/40">
                                  {HERO_PRICE_MIN} zł
                                </p>
                                <p className="text-muted-foreground/50">
                                  Najtańsza
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 text-center">
                                <p className="font-medium text-foreground/80">
                                  459 zł
                                </p>
                                <p className="text-muted-foreground/50">
                                  Średnia
                                </p>
                              </div>
                              <div className="min-w-0 text-right">
                                <p className="font-medium text-muted-foreground/40">
                                  {HERO_PRICE_MAX} zł
                                </p>
                                <p className="text-muted-foreground/50">
                                  Najdroższa
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                            <CheckCircle2
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                            Marża bezpieczna · Pozycja: lekko poniżej średniej
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-emerald-950/10 p-3 shadow-[inset_0_0_12px_rgba(16,185,129,0.04)]">
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/85">
                            <ClipboardList
                              className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                              aria-hidden
                            />
                            Strategia cenowa AI
                          </p>
                          <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-[11px] text-foreground/85">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              <span>
                                Cena {HERO_PRICE_SUGGESTED} zł plasuje produkt w
                                top 30% ofert — optymalnie dla premium.
                              </span>
                            </li>
                            <li className="flex items-start gap-2 text-[11px] text-foreground/85">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              <span>
                                Efekt przekreślonej ceny (549→{HERO_PRICE_SUGGESTED}{" "}
                                zł) zwiększa konwersję o ~20%.
                              </span>
                            </li>
                          </ul>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  `${HERO_PRICE_SUGGESTED} zł`
                                )
                                toast.success("Skopiowano cenę!")
                              } catch {
                                toast.error("Nie udało się skopiować")
                              }
                            }}
                          >
                            <Copy className="h-3 w-3 shrink-0" />
                            Kopiuj cenę
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                            onClick={() =>
                              toast(
                                "Kalkulator marży — dostępny po zalogowaniu w aplikacji.",
                                {
                                  icon: (
                                    <Calculator
                                      className="h-4 w-4 text-emerald-400"
                                      aria-hidden
                                    />
                                  ),
                                }
                              )
                            }
                          >
                            <Calculator className="h-3 w-3 shrink-0" />
                            Przelicz marżę
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {heroScene === 3 ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-white/5 bg-white/3 p-3">
                          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                            <Smartphone
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                              aria-hidden
                            />
                            Wrzucono: Zdjęcie z telefonu, 3.2 MB
                          </p>
                          <p className="mt-1 text-[10px] italic text-muted-foreground/40">
                            Marynarka-żółta.jpg
                          </p>
                        </div>

                        <HeroStudioComparisonSlider />

                        <div>
                          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/85">
                            <Sparkles
                              className="h-3.5 w-3.5 shrink-0 text-emerald-400/90"
                              aria-hidden
                            />
                            Wybierz styl zdjęcia
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {STUDIO_STYLE_CATEGORIES.map((cat, idx) => {
                              const active = studioStyleCategory === idx
                              return (
                                <button
                                  key={cat.key}
                                  type="button"
                                  role="tab"
                                  aria-selected={active}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-medium transition-colors",
                                    active
                                      ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                                      : "bg-white/5 text-muted-foreground/60 hover:bg-white/10"
                                  )}
                                  onClick={() => {
                                    if (idx !== studioStyleCategory) {
                                      setStudioStyleCategory(idx)
                                      toast("Dostępne w aplikacji.", {
                                        icon: (
                                          <Sparkles
                                            className="h-4 w-4 text-emerald-400"
                                            aria-hidden
                                          />
                                        ),
                                      })
                                    }
                                  }}
                                >
                                  {cat.label}
                                  {cat.seasonalChip ? (
                                    <span className="text-[7px] font-semibold tracking-wide text-orange-400">
                                      SEZONOWE
                                    </span>
                                  ) : null}
                                </button>
                              )
                            })}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {STUDIO_CATEGORY_SCENES[
                              STUDIO_STYLE_CATEGORIES[studioStyleCategory].key
                            ].map((scene, si) => (
                              <div
                                key={`${STUDIO_STYLE_CATEGORIES[studioStyleCategory].key}-${scene.title}`}
                                className={cn(
                                  "flex min-w-0 flex-1 flex-col rounded-lg border border-white/5 bg-white/3 px-2.5 py-2 sm:min-w-[5.5rem] sm:flex-1",
                                  si === 0 && "ring-1 ring-emerald-400"
                                )}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-[10px] font-medium text-foreground/80">
                                    {scene.title}
                                  </span>
                                  {scene.badge ? (
                                    <span
                                      className={cn(
                                        "shrink-0 rounded px-1 text-[8px] font-semibold tracking-wide",
                                        scene.badge.className
                                      )}
                                    >
                                      {scene.badge.text}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/5 bg-emerald-950/10 p-2.5">
                          <p className="flex gap-2 text-[10px] leading-snug text-muted-foreground/70">
                            <Calendar
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/70"
                              aria-hidden
                            />
                            <span>
                              Sezonowe zdjęcia zwiększają sprzedaż o 15-40% w
                              okresach świątecznych. Przygotuj je z
                              wyprzedzeniem!
                            </span>
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-white/5 bg-white/3 p-2">
                            <span className="text-[9px] text-muted-foreground/50">
                              Rozmiar
                            </span>
                            <span className="mt-0.5 text-[11px] font-medium text-foreground/90">
                              3.2→0.4 MB
                            </span>
                            <span className="mt-0.5 text-[9px] text-emerald-400">
                              -87%
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-white/5 bg-white/3 p-2">
                            <span className="text-[9px] text-muted-foreground/50">
                              Format
                            </span>
                            <span className="mt-0.5 text-[11px] font-medium text-foreground/90">
                              1:1
                            </span>
                            <span className="mt-0.5 text-[9px] text-emerald-400">
                              Allegro
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-white/5 bg-white/3 p-2">
                            <span className="text-[9px] text-muted-foreground/50">
                              Eksport
                            </span>
                            <span className="mt-0.5 text-[11px] font-medium text-foreground/90">
                              5 rozmiarów
                            </span>
                            <span className="mt-0.5 text-[9px] text-emerald-400">
                              Auto
                            </span>
                          </div>
                        </div>

                        <p className="flex gap-2 text-[10px] leading-snug text-muted-foreground/50">
                          <Lightbulb
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/50"
                            aria-hidden
                          />
                          <span>
                            Zdjęcie spełnia wymagania: Allegro · Amazon · OLX ·
                            Shopify · Instagram · Pinterest · Facebook
                          </span>
                        </p>

                        <div className="rounded-xl border border-white/5 bg-emerald-950/10 p-3 shadow-[inset_0_0_16px_rgba(16,185,129,0.04)]">
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/85">
                            <Wand2
                              className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                              aria-hidden
                            />
                            Co zrobiło AI?
                          </p>
                          <ul className="space-y-1.5">
                            {STUDIO_FEATURE_LINES.map((line) => (
                              <li
                                key={line}
                                className="flex items-start gap-2 text-[11px] text-foreground/85"
                              >
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
                          <button
                            type="button"
                            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-foreground/90 transition-colors hover:bg-white/10"
                            onClick={() =>
                              toast.success("W pełnej wersji pobierzesz plik w wysokiej rozdzielczości.")
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                            Pobierz w wysokiej jakości
                          </button>
                          <button
                            type="button"
                            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
                            onClick={() =>
                              toast("Generowanie nowego tła — dostępne po zalogowaniu.", {
                                icon: (
                                  <Sparkles
                                    className="h-4 w-4 text-emerald-400"
                                    aria-hidden
                                  />
                                ),
                              })
                            }
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                            Generuj inne tło
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {heroScene === 4 ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-white/5 bg-white/3 p-3">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                              <FileEdit
                                className="h-3 w-3 shrink-0 text-muted-foreground/50"
                                aria-hidden
                              />
                              Twoja próbka
                            </p>
                            <span className="text-[9px] text-muted-foreground/40">
                              (1 z 3)
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-foreground/80">
                            „Żółta marynarka wełniana slim fit, 100% Merino. Bez
                            kompromisów. Wysyłka tego samego dnia.”
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 shadow-[inset_0_0_16px_rgba(16,185,129,0.04)]">
                          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
                            Wykryty Brand Voice
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-2.5">
                              <p className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">
                                Ton
                              </p>
                              <p className="text-[11px] font-medium text-emerald-400">
                                Konkretny, pewny siebie
                              </p>
                            </div>
                            <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-2.5">
                              <p className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">
                                Styl
                              </p>
                              <p className="text-[11px] font-medium text-emerald-400">
                                Minimalistyczny, premium
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 border-l-2 border-emerald-500/40 pl-3 text-[11px] italic leading-relaxed text-foreground/75">
                            Krótkie zdania, mocne benefity — bez zbędnych
                            przymiotników. Ton sugeruje markę premium z
                            bezpośrednim podejściem do klienta.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70">
                              <Ban
                                className="h-3 w-3 shrink-0 text-red-400/70"
                                aria-hidden
                              />
                              Zakazane
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {["tani", "najtańszy", "super okazja"].map((w) => (
                                <span
                                  key={w}
                                  className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-medium text-red-400/80"
                                >
                                  {w}
                                </span>
                              ))}
                            </div>
                            <p className="mt-1 text-[9px] text-muted-foreground/35">
                              AI nigdy nie użyje tych słów
                            </p>
                          </div>
                          <div>
                            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70">
                              <Star
                                className="h-3 w-3 shrink-0 fill-amber-400/25 text-amber-400/80"
                                aria-hidden
                              />
                              Ulubione
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                "premium",
                                "rzemieślniczy",
                                "bezpośrednio",
                              ].map((w) => (
                                <span
                                  key={w}
                                  className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400"
                                >
                                  {w}
                                </span>
                              ))}
                            </div>
                            <p className="mt-1 text-[9px] text-muted-foreground/35">
                              AI będzie preferować te frazy
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="rounded-xl border border-white/5 bg-white/3 p-3">
                            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70">
                              <Sparkles
                                className="h-3 w-3 shrink-0 text-emerald-400/80"
                                aria-hidden
                              />
                              Jak Brand Voice zmienia Twoje teksty
                            </p>
                            <div className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2">
                              <p className="flex gap-1.5 text-[10px] leading-relaxed text-muted-foreground/50 line-through">
                                <XCircle
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/60"
                                  aria-hidden
                                />
                                <span>
                                  Super tania marynarka w najniższej cenie! HIT!
                                  Kup teraz!
                                </span>
                              </p>
                            </div>
                            <div className="mt-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
                              <p className="flex gap-1.5 text-[10px] font-medium leading-relaxed text-foreground/90">
                                <CheckCircle2
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                                  aria-hidden
                                />
                                <span>
                                  Marynarka z wełny Merino. Precyzja kroju.
                                  Wysyłka 24h.
                                </span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="mt-1 cursor-pointer text-left text-[10px] font-medium text-emerald-400/80 transition-colors hover:text-emerald-400"
                            onClick={() =>
                              toast(
                                "Brand Voice — dostępny po zalogowaniu w aplikacji.",
                                {
                                  icon: (
                                    <Palette
                                      className="h-4 w-4 text-emerald-400"
                                      aria-hidden
                                    />
                                  ),
                                }
                              )
                            }
                          >
                            Skonfiguruj swój Brand Voice →
                          </button>
                        </div>
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
              Logotypy partnerów: Allegro, Amazon, Shopify, WooCommerce, eBay i inne.
            </p>
            <IntegrationLogosMarquee />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default HeroSection
