"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  Check,
  Copy,
  Pencil,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wand2,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"

import { fadeSlideUp } from "@/lib/landing-motion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { splitProductTags } from "@/lib/utils/tagBuckets"
import { cn, copyToClipboard } from "@/lib/utils"

type ActiveTool = "opis" | "social" | "cena" | "studio" | "brand"

/** Kroki „magii” podczas generowania */
const GENERATION_STEPS = [
  "Analizuję trendy na rynku…",
  "Dopasowuję słowa kluczowe…",
  "Buduję propozycję sprzedażową…",
  "Liczę potencjał Twojej oferty…",
] as const

/* ── inline SVG icons (narzędzia) ── */
function IcoDoc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M5 2h7l3 3v13H5V2z" />
      <path stroke="currentColor" d="M12 2v3h3" />
      <path stroke="currentColor" d="M7.5 9h5M7.5 12h5M7.5 15h3" />
    </svg>
  )
}
function IcoPhone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect stroke="currentColor" x="5" y="1" width="10" height="18" rx="2" />
      <circle fill="currentColor" stroke="none" cx="10" cy="16" r="1" />
    </svg>
  )
}
function IcoTag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M3 3h6l8 8-6 6-8-8V3z" />
      <circle fill="currentColor" stroke="none" cx="7" cy="7" r="1.25" />
    </svg>
  )
}
function IcoCamera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M2 7h3l2-2h6l2 2h3v9H2V7z" />
      <circle stroke="currentColor" cx="10" cy="11" r="2.5" />
    </svg>
  )
}
function IcoBrand({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
      <path stroke="currentColor" d="M17 14v4H3v-4" />
    </svg>
  )
}
function IcoCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M3 8l3.5 3.5L13 4.5" />
    </svg>
  )
}

const TOOLS: { id: ActiveTool; Icon: React.FC<{ className?: string }>; label: string; sub: string }[] = [
  { id: "opis", Icon: IcoDoc, label: "Opis", sub: "30 sek" },
  { id: "social", Icon: IcoPhone, label: "Social", sub: "15 sek" },
  { id: "cena", Icon: IcoTag, label: "Cena", sub: "5 sek" },
  { id: "studio", Icon: IcoCamera, label: "Studio", sub: "Starter+" },
  { id: "brand", Icon: IcoBrand, label: "Brand", sub: "Pro" },
]

const DEMO_PRODUCT: Record<ActiveTool, string> = {
  opis: "Portfel męski skórzany premium",
  social: "Portfel męski skórzany premium",
  cena: "Portfel męski skórzany premium",
  studio: "Smartwatch sportowy — zdjęcie z telefonu",
  brand: "Portfel męski skórzany premium",
}

const OPIS_DEMO = {
  score: 94,
  scoreInsight:
    "Tytuł idealnej długości pod Allegro. Zawiera mocne słowa kluczowe (RFID, Premium, skóra naturalna). Wysoki potencjał klikalności w wyszukiwarce i na liście ofert.",
  sellingBullets: [
    "Tytuł zawiera mocne frazy wyszukiwania (RFID, skóra naturalna).",
    "Ton premium buduje zaufanie i podkreśla jakość wykonania.",
    "Struktura pod marketplace — łatwe skanowanie oferty przez kupującego.",
  ],
  seoTitle: "Portfel Męski Skórzany RFID | Skóra Naturalna Premium",
  shortDesc:
    "Elegancki portfel z prawdziwej skóry z ochroną kart RFID. Idealny na co dzień i na prezent — pakowany w pudełko.",
  tags: ["skórzany", "RFID", "premium", "prezent"],
  micro: {
    seo: { ok: true, detail: "48/50" },
    meta: { ok: true, detail: "142/160" },
    read: { ok: true, label: "Dobra" },
    tone: "Premium",
  },
}

/** Fragmenty tytułu: zwykły tekst vs słowo podświetlone przez AI */
const TITLE_PARTS: { text: string; ai?: boolean }[] = [
  { text: "Portfel Męski Skórzany " },
  { text: "RFID", ai: true },
  { text: " | Skóra " },
  { text: "Naturalna", ai: true },
  { text: " " },
  { text: "Premium", ai: true },
]

const SCORE_RING_R = 38
const SCORE_RING_LEN = 2 * Math.PI * SCORE_RING_R

function AnimatedScoreRing({ score, active }: { score: number; active: boolean }) {
  const targetOffset = SCORE_RING_LEN - (SCORE_RING_LEN * score) / 100
  return (
    <motion.svg
      width="104"
      height="104"
      viewBox="0 0 104 104"
      className="shrink-0 [filter:drop-shadow(0_0_14px_rgba(52,211,153,0.45))_drop-shadow(0_0_28px_rgba(16,185,129,0.2))]"
      aria-hidden
    >
      <circle
        cx="52"
        cy="52"
        r={SCORE_RING_R}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="7"
      />
      <g transform="rotate(-90 52 52)">
        <motion.circle
          cx="52"
          cy="52"
          r={SCORE_RING_R}
          fill="none"
          stroke="url(#demoScoreGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={SCORE_RING_LEN}
          initial={{ strokeDashoffset: SCORE_RING_LEN }}
          animate={{ strokeDashoffset: active ? targetOffset : SCORE_RING_LEN }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </g>
      <defs>
        <linearGradient id="demoScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </motion.svg>
  )
}

function MicroTile({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-2.5 py-2 text-[10px] shadow-sm backdrop-blur-sm",
        ok
          ? "border-emerald-400/20 bg-emerald-500/[0.12]"
          : "border-amber-400/25 bg-amber-500/10"
      )}
    >
      <p className="font-normal text-muted-foreground/90">{label}</p>
      <p className="mt-0.5 font-semibold text-foreground">{value}</p>
    </div>
  )
}

function demoCardClass(extra?: string) {
  return cn(
    "rounded-2xl border border-white/[0.09] bg-white/[0.05] shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-md",
    extra
  )
}

export function DemoSection() {
  const [activeTool, setActiveTool] = useState<ActiveTool>("opis")
  const [generatingDemo, setGeneratingDemo] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [demoResult, setDemoResult] = useState(false)
  const [copiedOpis, setCopiedOpis] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<null | "up" | "down">(null)
  const [showScoreRing, setShowScoreRing] = useState(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const opisTagBuckets = useMemo(() => splitProductTags(OPIS_DEMO.tags), [])

  const clearAnimationTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  useEffect(() => () => clearAnimationTimeouts(), [clearAnimationTimeouts])

  useEffect(() => {
    setDemoResult(false)
    setDemoStep(0)
    setShowScoreRing(false)
    setCopiedOpis(false)
    setAiFeedback(null)
  }, [activeTool])

  useEffect(() => {
    if (demoResult && activeTool === "opis") {
      const t = setTimeout(() => setShowScoreRing(true), 80)
      return () => clearTimeout(t)
    }
    setShowScoreRing(false)
  }, [demoResult, activeTool])

  const startAnimation = useCallback(() => {
    if (generatingDemo) return
    clearAnimationTimeouts()
    setDemoResult(false)
    setGeneratingDemo(true)
    setDemoStep(1)

    const push = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      timeoutsRef.current.push(id)
    }
    push(() => setDemoStep(2), 900)
    push(() => setDemoStep(3), 1800)
    push(() => setDemoStep(4), 2700)
    push(() => {
      setGeneratingDemo(false)
      setDemoResult(true)
    }, 3500)
  }, [generatingDemo, clearAnimationTimeouts])

  async function copyOpisBundle() {
    const text = [OPIS_DEMO.seoTitle, "", OPIS_DEMO.shortDesc].join("\n")
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedOpis(true)
      toast.success("Skopiowano!")
      setTimeout(() => setCopiedOpis(false), 2200)
    } else {
      toast.error("Nie udało się skopiować")
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <section id="jak-dziala" className="relative overflow-hidden px-6 py-32">
        {/* Mesh + grid */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 left-[10%] h-[420px] w-[420px] rounded-full bg-emerald-600/18 blur-[100px]" />
          <div className="absolute bottom-0 right-[-5%] h-[380px] w-[380px] rounded-full bg-teal-900/35 blur-[110px]" />
          <div className="absolute top-1/2 left-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-950/40 blur-[90px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <motion.div {...fadeSlideUp} className="relative mx-auto mb-16 max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase">Demo</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Wypróbuj. Teraz.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Bez rejestracji — kliknij i zobacz jak AI tworzy treści w kilka sekund.
          </p>
        </motion.div>

        <motion.div
          {...fadeSlideUp}
          transition={{ ...fadeSlideUp.transition, delay: 0.08 }}
          className="relative mx-auto max-w-4xl"
        >
          <div
            className={cn(
              "landing-card-lift overflow-hidden rounded-3xl",
              "border border-white/10 bg-card/45 shadow-[0_40px_100px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)_inset]",
              "backdrop-blur-xl"
            )}
          >
            <div className="flex h-11 items-center gap-3 border-b border-white/10 bg-black/20 px-5 backdrop-blur-sm">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <div className="flex flex-1 justify-center">
                <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-muted-foreground/70 shadow-sm">
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden>
                    <circle stroke="currentColor" strokeWidth="1" cx="6" cy="6" r="4" />
                    <path stroke="currentColor" strokeWidth="1" d="M6 2v2M6 8v2M2 6h2M8 6h2" />
                  </svg>
                  listingo.pl/dashboard
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
              <div className={cn("space-y-5 p-6 md:border-r", "border-white/10")}>
                <div>
                  <h3 className="mb-3.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/25 text-[10px] font-bold text-emerald-400">1</span>
                    Centrum dowodzenia
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {TOOLS.map((t) => {
                      const active = activeTool === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTool(t.id)}
                          disabled={generatingDemo}
                          className={cn(
                            "group relative flex flex-col items-start gap-1 overflow-hidden rounded-xl border p-3 text-left transition-all duration-200",
                            active
                              ? "border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.12)]"
                              : "border-white/10 bg-white/[0.04] shadow-sm hover:border-white/15 hover:bg-white/[0.07]",
                            generatingDemo && "pointer-events-none opacity-50"
                          )}
                        >
                          {active && (
                            <motion.div
                              layoutId="tool-glow"
                              className="pointer-events-none absolute inset-0 rounded-xl bg-emerald-500/8"
                              transition={{ type: "spring", stiffness: 350, damping: 28 }}
                              aria-hidden
                            />
                          )}
                          <div
                            className={cn(
                              "relative flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                              active
                                ? "border-emerald-400/35 bg-emerald-500/20 text-emerald-300"
                                : "border-white/10 bg-white/5 text-muted-foreground/60"
                            )}
                          >
                            <t.Icon className="h-4 w-4" />
                          </div>
                          <span className={cn("relative flex items-center gap-1 text-[11px] font-semibold leading-tight", active ? "text-foreground" : "text-foreground/75")}>
                            {t.label}
                            {active && t.id === "opis" ? (
                              <Sparkles className="h-3 w-3 text-emerald-400" aria-hidden />
                            ) : null}
                          </span>
                          <span className="relative text-[10px] font-normal text-muted-foreground/55">{t.sub}</span>
                          {active && (
                            <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/30 text-emerald-300">
                              <IcoCheck className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/25 text-[10px] font-bold text-emerald-400">2</span>
                    Twój pomysł
                  </h3>
                  <p className="mb-2 text-[10px] text-muted-foreground/50">Baza do optymalizacji — wpiszesz to samo w aplikacji</p>
                  <div className={cn(demoCardClass(), "flex items-center gap-2 px-3 py-3")}>
                    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/35" aria-hidden>
                      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M2 8h4m4 0h4M8 4v4m0 0v4" />
                    </svg>
                    <span className="text-sm font-semibold leading-snug text-foreground">{DEMO_PRODUCT[activeTool]}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startAnimation}
                  disabled={generatingDemo}
                  className="relative w-full overflow-hidden rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(52,211,153,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generatingDemo ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" aria-hidden />
                      Generuję…
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Wand2 className="h-4 w-4" aria-hidden />
                      Generuj magię
                    </span>
                  )}
                </button>
              </div>

              <div className="relative min-h-80 p-6">
                <h3 className="mb-5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/25 text-[10px] font-bold text-emerald-400">3</span>
                  Propozycja AI
                </h3>

                <AnimatePresence mode="wait">
                  {!generatingDemo && !demoResult && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-52 flex-col items-center justify-center gap-3"
                    >
                      <div className={cn(demoCardClass("flex h-14 w-14 items-center justify-center"), "border-dashed")}>
                        <Sparkles className="h-7 w-7 text-emerald-400/40" aria-hidden />
                      </div>
                      <p className="text-sm text-muted-foreground/50">Kliknij „Generuj magię”, żeby zobaczyć wynik</p>
                    </motion.div>
                  )}

                  {generatingDemo && (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(demoCardClass(), "space-y-3 p-4")}
                    >
                      {GENERATION_STEPS.map((msg, idx) => {
                        const stepNum = idx + 1
                        const done = demoStep > stepNum
                        const active = demoStep === stepNum
                        return (
                          <motion.div
                            key={msg}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: done || active ? 1 : 0.35, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="flex items-center gap-2.5 text-sm"
                          >
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                done
                                  ? "border-emerald-400/50 bg-emerald-500/25 text-emerald-300"
                                  : active
                                    ? "border-emerald-400/40 bg-emerald-500/15"
                                    : "border-white/10 bg-white/5 text-muted-foreground/30"
                              )}
                            >
                              {done ? (
                                <IcoCheck className="h-3 w-3 text-emerald-300" />
                              ) : active ? (
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                              ) : (
                                <span className="h-1 w-1 rounded-full bg-white/20" />
                              )}
                            </span>
                            <span
                              className={cn(
                                active ? "font-medium text-foreground" : done ? "text-muted-foreground/55 line-through" : "text-muted-foreground/30"
                              )}
                            >
                              {msg}
                            </span>
                          </motion.div>
                        )
                      })}
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400"
                          initial={{ width: "0%" }}
                          animate={{ width: `${(demoStep / 4) * 100}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {demoResult && !generatingDemo && (
                    <motion.div
                      key={`result-${activeTool}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="space-y-4"
                    >
                      {activeTool === "opis" && (
                        <div className="space-y-3">
                          <div className={demoCardClass("p-3.5")}>
                            <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.18em] text-emerald-400/85">
                              Dlaczego ten wynik sprzedaje
                            </p>
                            <ul className="list-inside list-disc space-y-1.5 text-[11px] font-normal leading-relaxed text-foreground/80 marker:text-emerald-400">
                              {OPIS_DEMO.sellingBullets.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>

                          <div className={demoCardClass("flex flex-wrap items-center gap-4 p-4")}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="relative flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                                >
                                  <AnimatedScoreRing score={OPIS_DEMO.score} active={showScoreRing} />
                                  <span className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
                                    <span className="text-xl font-bold tabular-nums text-white">{OPIS_DEMO.score}</span>
                                    <span className="text-[9px] font-medium text-muted-foreground/80">/ 100</span>
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[260px] border-white/10 bg-zinc-900/95 text-xs leading-relaxed text-zinc-100">
                                {OPIS_DEMO.scoreInsight}
                              </TooltipContent>
                            </Tooltip>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                                Twój wynik jakości
                              </p>
                              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/85">
                                {OPIS_DEMO.scoreInsight}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <MicroTile label="SEO — tytuł" value={`OK (${OPIS_DEMO.micro.seo.detail})`} ok={OPIS_DEMO.micro.seo.ok} />
                            <MicroTile label="Meta" value={`OK (${OPIS_DEMO.micro.meta.detail})`} ok={OPIS_DEMO.micro.meta.ok} />
                            <MicroTile label="Czytelność" value={OPIS_DEMO.micro.read.label} ok={OPIS_DEMO.micro.read.ok} />
                            <MicroTile label="Ton" value={OPIS_DEMO.micro.tone} ok />
                          </div>

                          <div className={demoCardClass("p-4")}>
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                              <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/55">
                                Tytuł sprzedażowy
                              </p>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => void copyOpisBundle()}
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                                    copiedOpis
                                      ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-emerald-400/30 hover:text-emerald-300"
                                  )}
                                  aria-label="Kopiuj"
                                >
                                  <AnimatePresence mode="wait" initial={false}>
                                    {copiedOpis ? (
                                      <motion.span
                                        key="check"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                      >
                                        <Check className="h-4 w-4" />
                                      </motion.span>
                                    ) : (
                                      <motion.span key="copy" initial={false}>
                                        <Copy className="h-4 w-4" />
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toast("W aplikacji edytujesz każde pole jednym kliknięciem")}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
                                  aria-label="Edytuj"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={startAnimation}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:border-emerald-400/30 hover:text-emerald-300"
                                  aria-label="Inna wersja"
                                >
                                  <Wand2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-lg font-bold leading-snug tracking-tight text-white md:text-xl">
                              {TITLE_PARTS.map((part) =>
                                part.ai ? (
                                  <span
                                    key={part.text}
                                    className="rounded-sm bg-emerald-400/15 px-0.5 font-extrabold text-emerald-300"
                                  >
                                    {part.text}
                                  </span>
                                ) : (
                                  <span key={part.text}>{part.text}</span>
                                )
                              )}
                            </p>
                            <p className="mt-2 text-[10px] font-normal text-muted-foreground/60">
                              Słowo w szmaragdzie = dopisane przez AI, żebyś więcej sprzedał
                            </p>
                          </div>

                          <div className={demoCardClass("p-4")}>
                            <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/55">
                              Krótki opis pod listing
                            </p>
                            <p className="text-sm font-normal leading-relaxed text-foreground/85">{OPIS_DEMO.shortDesc}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void copyOpisBundle()}
                              className="inline-flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-2.5 text-[11px] font-semibold text-emerald-300 shadow-sm transition-colors hover:bg-emerald-500/25"
                            >
                              {copiedOpis ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              {copiedOpis ? "Skopiowano!" : "Kopiuj zestaw"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTool("social")}
                              className="inline-flex min-w-[100px] flex-1 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-[11px] font-semibold text-foreground/90 shadow-sm transition-colors hover:bg-white/10"
                            >
                              Post social
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTool("cena")}
                              className="inline-flex min-w-[100px] flex-1 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-[11px] font-semibold text-foreground/90 shadow-sm transition-colors hover:bg-white/10"
                            >
                              Sprawdź cenę
                            </button>
                          </div>

                          <div className="flex items-center justify-center gap-2 py-1">
                            <span className="text-[10px] text-muted-foreground/50">Pomogło?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAiFeedback("up")
                                toast.success("Dzięki — tak trenujesz swoje AI")
                              }}
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                                aiFeedback === "up"
                                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-emerald-400/25"
                              )}
                              aria-label="Kciuk w górę"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAiFeedback("down")
                                toast("Zapisane — w aplikacji dopracujemy styl")
                              }}
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                                aiFeedback === "down"
                                  ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                              )}
                              aria-label="Kciuk w dół"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>

                          {opisTagBuckets.features.length > 0 ? (
                            <div>
                              <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/50">Cechy produktu</p>
                              <div className="flex flex-wrap gap-1.5">
                                {opisTagBuckets.features.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[11px] font-semibold text-emerald-100 shadow-sm"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {opisTagBuckets.sales.length > 0 ? (
                            <div>
                              <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/50">Frazy sprzedażowe</p>
                              <div className="flex flex-wrap gap-1.5">
                                {opisTagBuckets.sales.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-amber-400/25 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold text-amber-100 shadow-sm"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {activeTool === "social" && (
                        <div className="space-y-3">
                          <div className={cn(demoCardClass("overflow-hidden p-0"))}>
                            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
                              <div className="h-6 w-6 shrink-0 rounded-full bg-linear-to-br from-purple-500 to-pink-500" />
                              <div>
                                <p className="text-[11px] font-semibold">twój_sklep</p>
                                <p className="text-[9px] font-normal text-muted-foreground/70">Instagram</p>
                              </div>
                            </div>
                            <div className="space-y-2 p-3">
                              <p className="text-xs leading-relaxed text-foreground/85">
                                Nowy portfel RFID w ofercie — skóra naturalna, świetny na prezent. Dostawa 24h.
                              </p>
                              <p className="text-[10px] text-emerald-300/90">#nowość #prezent #RFID #skóra #premium</p>
                            </div>
                          </div>
                          <div className={cn(demoCardClass("overflow-hidden border-blue-400/20 p-0"))}>
                            <div className="flex items-center gap-2 border-b border-white/10 bg-blue-500/5 px-3 py-2.5">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">f</div>
                              <div>
                                <p className="text-[11px] font-semibold">twój_sklep</p>
                                <p className="text-[9px] font-normal text-muted-foreground/70">Facebook</p>
                              </div>
                            </div>
                            <div className="space-y-2 p-3">
                              <p className="text-xs leading-relaxed text-foreground/85">
                                Szukasz prezentu, który naprawdę się przyda? Portfel skórzany z blokadą RFID — klasyka, która nie wychodzi z mody.
                              </p>
                              <p className="text-[10px] text-blue-300/90">CTA: Zobacz ofertę w sklepie</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTool === "cena" && (
                        <div className="space-y-3">
                          <div className={cn(demoCardClass("border-emerald-400/20 bg-emerald-500/10 p-4 text-center"))}>
                            <p className="text-[11px] font-normal text-muted-foreground/80">Sugerowana cena</p>
                            <p className="mt-1 text-4xl font-bold text-emerald-300">189 zł</p>
                            <p className="mt-1 text-[11px] text-muted-foreground/70">Przedział rynkowy: 149–249 zł</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Min", value: "149 zł", active: false },
                              { label: "Optimal", value: "189 zł", active: true },
                              { label: "Max", value: "249 zł", active: false },
                            ].map((c) => (
                              <div
                                key={c.label}
                                className={cn(
                                  demoCardClass("p-2.5 text-center"),
                                  c.active ? "border-emerald-400/30 bg-emerald-500/12" : ""
                                )}
                              >
                                <p className={cn("text-[10px] font-normal", c.active ? "text-emerald-300" : "text-muted-foreground")}>{c.label}</p>
                                <p className={cn("mt-0.5 text-sm font-bold", c.active ? "text-emerald-300" : "text-foreground/75")}>{c.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTool === "studio" && (
                        <div className="space-y-3">
                          <div className={cn(demoCardClass("overflow-hidden p-0"))}>
                            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
                              <div className="relative flex min-h-[160px] flex-col justify-end bg-gradient-to-b from-zinc-600/40 to-zinc-800/80 p-3 md:min-h-[200px]">
                                <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/55 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-200">
                                  Surowe
                                </span>
                                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-zinc-400/30 to-zinc-700/50 ring-2 ring-white/10 md:h-28 md:w-28">
                                  <span className="text-3xl opacity-60" aria-hidden>
                                    ⌚
                                  </span>
                                </div>
                                <p className="mt-2 text-center text-[9px] font-normal text-zinc-400">Przed — telefon, szum, płaski kolor</p>
                              </div>
                              <div className="relative flex w-10 shrink-0 items-center justify-center bg-white/5">
                                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/15" />
                                <span className="relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-900/90 text-sm text-white shadow-lg">
                                  →
                                </span>
                              </div>
                              <div className="relative flex min-h-[160px] flex-col justify-end bg-gradient-to-b from-white/95 to-zinc-100 p-3 md:min-h-[200px]">
                                <span className="absolute right-2 top-2 rounded-md border border-emerald-400/40 bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black shadow-[0_0_12px_rgba(52,211,153,0.5)]">
                                  Po AI
                                </span>
                                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-zinc-100 to-white shadow-inner ring-2 ring-emerald-400/30 md:h-28 md:w-28">
                                  <span className="text-3xl" aria-hidden>
                                    ⌚
                                  </span>
                                </div>
                                <p className="mt-2 text-center text-[9px] font-medium text-zinc-600">Światło · kolor · czyste tło</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-center text-[11px] font-normal text-muted-foreground/75">
                            Ta sama karta produktu — tylko obróbka w Photo Studio
                          </p>
                        </div>
                      )}

                      {activeTool === "brand" && (
                        <div className="space-y-3">
                          <div className={demoCardClass("p-4")}>
                            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/55">Brand Voice</p>
                            <p className="mt-2 text-xs font-normal leading-relaxed text-foreground/85">
                              Wykryty ton: <strong className="font-semibold text-emerald-300">elegancki, rzeczowy</strong>. Unikamy żargonu — krótkie zdania, korzyści zamiast suchych parametrów.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {["Premium", "Zaufanie", "Polski klient", "Bez „hitów”"].map((chip) => (
                              <span
                                key={chip}
                                className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold text-violet-100"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className={cn(
                          demoCardClass("flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"),
                          "border-white/[0.07] bg-white/[0.03]"
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground/55">
                          Gotowe w 3,2 s — tak szybko działa AI w Listingo
                        </span>
                        <Link href="/register" className="text-[11px] font-semibold text-emerald-400 hover:underline">
                          Wypróbuj za darmo →
                        </Link>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 text-center text-xs text-muted-foreground/45"
          >
            Bez karty kredytowej · Bezpłatny plan na zawsze · Konfiguracja w 2 minuty
          </motion.p>
        </motion.div>
      </section>
    </TooltipProvider>
  )
}

export default DemoSection
