"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Copy, Keyboard, Sparkles } from "lucide-react"
import Link from "next/link"
import type { CSSProperties } from "react"
import { useCallback, useEffect, useRef, useState } from "react"

const viewport = { once: true, margin: "-40px" as const }
const cardTransition = { duration: 0.5 }

/** Badge statusu — karty LIVE w aplikacji */
const statusLiveClass =
  "shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400"

/** Badge statusu — roadmapa */
const statusSoonClass =
  "shrink-0 rounded-full border border-zinc-500/35 bg-zinc-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400"

const miniCtaClass =
  "relative z-10 mt-auto inline-flex items-center gap-0.5 pt-4 text-xs font-medium text-emerald-400/90 transition-colors hover:text-emerald-300"

/** Powierzchnia kart LIVE: mocniejszy kontrast, emerald hover glow */
const liveCardSurface =
  "border border-white/10 bg-card/40 transition-all duration-300 hover:border-emerald-500/35 hover:shadow-[0_0_40px_-12px_rgba(16,185,129,0.25)]"

/** Video Studio — fioletowy akcent (spójny z dashboardem) */
const videoLiveCardSurface =
  "border border-white/10 bg-card/40 transition-all duration-300 hover:border-violet-500/35 hover:shadow-[0_0_40px_-12px_rgba(139,92,246,0.22)]"

/** Powierzchnia kart roadmapy — bez emerald glow */
const soonCardSurface =
  "border border-white/5 bg-card/20 opacity-75 transition-[opacity,border-color] duration-300 hover:opacity-100 hover:border-zinc-500/25"

/* ────────────────────────────────────────────────
   SVG icon set — consistent stroke style, 24×24 grid
   ──────────────────────────────────────────────── */

function IconDoc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M6 2h8l4 4v16H6V2z" />
      <path stroke="currentColor" d="M14 2v4h4" />
      <path stroke="currentColor" d="M9 11h6M9 14h6M9 17h4" />
      <circle fill="currentColor" cx="9" cy="11" r="0.6" />
      <circle fill="currentColor" cx="9" cy="14" r="0.6" />
      <circle fill="currentColor" cx="9" cy="17" r="0.6" />
    </svg>
  )
}

function IconCamera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect stroke="currentColor" x="2" y="7" width="20" height="14" rx="3" />
      <circle stroke="currentColor" cx="12" cy="14" r="3.5" />
      <path stroke="currentColor" d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <circle fill="currentColor" cx="18" cy="11" r="1" />
    </svg>
  )
}

function IconTrendUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline stroke="currentColor" points="3 17 9 11 13 15 21 7" />
      <polyline stroke="currentColor" points="15 7 21 7 21 13" />
      <line stroke="currentColor" x1="3" y1="21" x2="21" y2="21" />
    </svg>
  )
}

function IconBubbles({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path stroke="currentColor" d="M9 10h.01M12 10h.01M15 10h.01" strokeWidth={2} />
    </svg>
  )
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect stroke="currentColor" x="2" y="4" width="20" height="16" rx="2" />
      <polyline stroke="currentColor" points="2 8 12 13 22 8" />
    </svg>
  )
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle stroke="currentColor" cx="12" cy="12" r="9" />
      <path stroke="currentColor" d="M12 3c-3.5 4-3.5 14 0 18M12 3c3.5 4 3.5 14 0 18" />
      <path stroke="currentColor" d="M3 12h18" />
      <path stroke="currentColor" d="M4.5 7.5h15M4.5 16.5h15" />
    </svg>
  )
}

function IconSplit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M12 3v4M12 7l-4 4M12 7l4 4" />
      <rect stroke="currentColor" x="2" y="13" width="8" height="8" rx="2" />
      <rect stroke="currentColor" x="14" y="13" width="8" height="8" rx="2" />
    </svg>
  )
}

function IconTarget({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle stroke="currentColor" cx="12" cy="12" r="9" />
      <circle stroke="currentColor" cx="12" cy="12" r="5" />
      <circle fill="currentColor" stroke="none" cx="12" cy="12" r="1.5" />
      <path stroke="currentColor" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  )
}

function IconPulse({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline stroke="currentColor" points="2 12 6 12 8 5 11 19 14 9 16 15 18 12 22 12" />
    </svg>
  )
}

function IconPalette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path
        stroke="currentColor"
        d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"
      />
      <circle stroke="currentColor" cx="9.5" cy="8.5" r="1" fill="currentColor" />
      <circle stroke="currentColor" cx="15" cy="9.5" r="1" fill="currentColor" />
      <circle stroke="currentColor" cx="14" cy="14.5" r="1" fill="currentColor" />
      <circle stroke="currentColor" cx="10" cy="13.5" r="1" fill="currentColor" />
    </svg>
  )
}

function IconArchive({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M4 7V4a2 2 0 0 1 2-2h8.5L19 6.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
      <polyline stroke="currentColor" points="14 2 14 7 19 7" />
      <path stroke="currentColor" d="M2 12h10M8 9l3 3-3 3" />
    </svg>
  )
}

function IconVideo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect stroke="currentColor" x="2" y="5" width="15" height="14" rx="2" />
      <path stroke="currentColor" d="M17 9l5-3v12l-5-3" />
      <path stroke="currentColor" d="M8 10l3 2-3 2z" fill="currentColor" strokeWidth={0} />
    </svg>
  )
}

/* ─── reusable icon badge ─── */
function IconBadge({
  icon,
  glow = "emerald",
  className,
}: {
  icon: React.ReactNode
  glow?: "emerald" | "orange" | "indigo" | "violet"
  className?: string
}) {
  const colors = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/15",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-orange-500/15",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-500/15",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-400 shadow-violet-500/15",
  }
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-lg ${colors[glow]} ${className ?? ""}`}
    >
      {icon}
    </div>
  )
}

/** Nazwy platform z przecinkami i odstępem — bez zlewania się w jeden ciąg. */
function PlatformInlineList({ names }: { names: readonly string[] }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-0">
      {names.map((name, i) => (
        <span key={name} className="inline-flex items-baseline whitespace-nowrap">
          {i > 0 ? (
            <span className="select-none text-muted-foreground" aria-hidden>
              ,{" "}
            </span>
          ) : null}
          <span className="font-medium text-foreground/90">{name}</span>
        </span>
      ))}
    </span>
  )
}

/* ─── LANG SAMPLES ─── */
const LANG_SAMPLES = [
  { code: "PL", flag: "🇵🇱", text: "Skórzany portfel RFID — premium" },
  { code: "EN", flag: "🇬🇧", text: "Leather RFID wallet — premium" },
  { code: "DE", flag: "🇩🇪", text: "Premium-RFID-Lederbörse" },
  { code: "CZ", flag: "🇨🇿", text: "Kožená peněženka RFID — premium" },
] as const

function LanguageSwitcherMock() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const n = LANG_SAMPLES.length
    const t = setInterval(() => setI((i) => (i + 1) % n), 2800)
    return () => clearInterval(t)
  }, [])
  const cur = LANG_SAMPLES[i]

  return (
    <div className="relative mt-4 min-h-22 overflow-hidden rounded-2xl border border-white/8 bg-black/25 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
        {LANG_SAMPLES.map((l, idx) => (
          <motion.span
            key={l.code}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors"
            animate={{
              borderColor: idx === i ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)",
              backgroundColor: idx === i ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
              scale: idx === i ? 1.06 : 1,
            }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            aria-hidden
          >
            {l.flag}
          </motion.span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={cur.code}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex items-start gap-2"
        >
          <span className="shrink-0 text-lg" aria-hidden>{cur.flag}</span>
          <p className="text-xs leading-relaxed text-foreground/85">
            <span className="mr-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
              {cur.code}
            </span>
            {cur.text}
          </p>
        </motion.div>
      </AnimatePresence>
      <motion.div
        className="pointer-events-none absolute right-3 bottom-3 h-16 w-16 rounded-full bg-emerald-500/5 blur-2xl"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
    </div>
  )
}

/**
 * Interaktywne demo Photo Studio: zdjęcie wejściowe → packshot (suwak).
 *
 * Ramka: **3∶4** (jak **900×1200** px) — `aspect-[3/4]` na wszystkich szerokościach (bez osobnych `h-24` na mobile).
 * Oba pliki w tym samym kadrze; `object-cover` przy dokładnie 3∶4 wypełnia ramkę bez ucinania kadru.
 */
function PhotoStudioCompareDemo() {
  const [pos, setPos] = useState(48)
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    setPos(Math.max(8, Math.min(92, (x / rect.width) * 100)))
  }, [])

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    handleMove(e.clientX)
    const move = (ev: MouseEvent) => handleMove(ev.clientX)
    const up = () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    handleMove(t.clientX)
    const move = (ev: TouchEvent) => {
      const u = ev.touches[0]
      if (u) handleMove(u.clientX)
    }
    const up = () => {
      window.removeEventListener("touchmove", move)
      window.removeEventListener("touchend", up)
      window.removeEventListener("touchcancel", up)
    }
    window.addEventListener("touchmove", move, { passive: true })
    window.addEventListener("touchend", up)
    window.addEventListener("touchcancel", up)
  }

  const leftClip = `inset(0 ${100 - pos}% 0 0)`
  const rightClip = `inset(0 0 0 ${pos}%)`

  return (
    <div className="mt-5 w-full lg:mt-6 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
      <p className="mb-2 text-[10px] font-medium text-muted-foreground/55">
        Przesuń suwak — efekt jak w Photo Studio
      </p>
      <div
        ref={ref}
        className="relative aspect-3/4 w-full max-w-full cursor-ew-resize touch-none overflow-hidden rounded-xl border border-white/10 bg-black/20 select-none lg:rounded-2xl"
        role="slider"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={8}
        aria-valuemax={92}
        aria-label="Podgląd przed i po edycji zdjęcia w AI Photo Studio"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            setPos((p) => Math.max(8, p - 4))
          }
          if (e.key === "ArrowRight") {
            e.preventDefault()
            setPos((p) => Math.min(92, p + 4))
          }
        }}
      >
        {/* Warstwa „po” — pełna, przycinana z prawej */}
        <div
          className="absolute inset-0 z-1"
          style={{
            clipPath: rightClip,
          }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lokalne demo statyczne, object-cover w suwaku */}
          <img
            src="/hero-studio/PO1.webp"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
            draggable={false}
          />
          <span className="absolute top-2 right-2 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-emerald-600 uppercase backdrop-blur-sm">
            Po
          </span>
          <span className="absolute bottom-2 right-2 text-[8px] font-medium text-zinc-700 drop-shadow-sm">Białe tło · listing</span>
        </div>

        {/* Warstwa „przed” — zdjęcie wejściowe, przycinane z lewej */}
        <div
          className="absolute inset-0 z-2"
          style={{
            clipPath: leftClip,
          }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lokalne demo statyczne, object-cover w suwaku */}
          <img
            src="/hero-studio/przed1.webp"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
            draggable={false}
          />
          <span className="absolute top-2 left-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white/95 uppercase backdrop-blur-sm">
            Przed
          </span>
          <span className="absolute bottom-2 left-2 text-[8px] text-white/90 drop-shadow-md">Zdjęcie z telefonu</span>
        </div>

        {/* Suwak */}
        <div
          className="absolute inset-y-0 z-10 w-10 -translate-x-1/2"
          style={{ left: `${pos}%` }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/50 shadow-sm" />
          <div className="absolute top-1/2 left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-zinc-900/90 shadow-lg sm:h-7 sm:w-7 lg:h-9 lg:w-9">
            <svg viewBox="0 0 24 12" fill="none" className="h-2 w-4 text-white sm:h-2.5 sm:w-5 lg:h-3 lg:w-6" aria-hidden>
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M2 6h20M6 2L2 6l4 4M18 2l4 4-4 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Demo Video Studio: to samo ujęcie co Photo Studio — **statyczne zdjęcie** vs **klatka „po”** (packshot / gotowe pod wideo).
 * Ramka **3∶4** (900×1200), ten sam wzorzec suwaka co {@link PhotoStudioCompareDemo}.
 */
function VideoStudioCompareDemo() {
  const [pos, setPos] = useState(48)
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    setPos(Math.max(8, Math.min(92, (x / rect.width) * 100)))
  }, [])

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    handleMove(e.clientX)
    const move = (ev: MouseEvent) => handleMove(ev.clientX)
    const up = () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    handleMove(t.clientX)
    const move = (ev: TouchEvent) => {
      const u = ev.touches[0]
      if (u) handleMove(u.clientX)
    }
    const up = () => {
      window.removeEventListener("touchmove", move)
      window.removeEventListener("touchend", up)
      window.removeEventListener("touchcancel", up)
    }
    window.addEventListener("touchmove", move, { passive: true })
    window.addEventListener("touchend", up)
    window.addEventListener("touchcancel", up)
  }

  const leftClip = `inset(0 ${100 - pos}% 0 0)`
  const rightClip = `inset(0 0 0 ${pos}%)`

  return (
    <div className="mt-5 w-full lg:mt-6 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
      <p className="mb-2 text-[10px] font-medium text-muted-foreground/55">
        Przesuń suwak — zdjęcie wejściowe vs klatka pod film (AI Video Studio)
      </p>
      <div
        ref={ref}
        className="relative aspect-3/4 w-full max-w-full cursor-ew-resize touch-none overflow-hidden rounded-xl border border-white/10 bg-black/20 select-none lg:rounded-2xl"
        role="slider"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={8}
        aria-valuemax={92}
        aria-label="Podgląd zdjęcia produktu i klatki wideo w AI Video Studio"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            setPos((p) => Math.max(8, p - 4))
          }
          if (e.key === "ArrowRight") {
            e.preventDefault()
            setPos((p) => Math.min(92, p + 4))
          }
        }}
      >
        {/* Warstwa „wideo” — prawa strona suwaka: ta sama scena „po” + akcent wideo */}
        <div
          className="absolute inset-0 z-1"
          style={{ clipPath: rightClip }}
          aria-hidden
        >
          <div className="pointer-events-none absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokalne demo statyczne */}
            <img
              src="/hero-studio/PO1.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center select-none"
              draggable={false}
            />
            <div
              className="absolute inset-0 bg-linear-to-br from-violet-950/35 via-transparent to-violet-900/25"
              aria-hidden
            />
          </div>
          <span className="absolute top-2 right-2 z-2 rounded-md border border-violet-400/30 bg-violet-500/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-violet-100 uppercase backdrop-blur-sm">
            Film
          </span>
          <span className="absolute bottom-2 right-2 z-2 text-[8px] font-medium text-white drop-shadow-md">
            Reels · ruch kamery
          </span>
          <div className="pointer-events-none absolute inset-0 z-1 flex items-center justify-center">
            <motion.div
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/45 shadow-lg backdrop-blur-sm sm:h-12 sm:w-12"
              animate={{ scale: [1, 1.06, 1], opacity: [0.88, 1, 0.88] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 translate-x-0.5 text-white"
                aria-hidden
              >
                <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A1 1 0 0 0 8 6.82z" />
              </svg>
            </motion.div>
          </div>
          <div className="absolute right-0 bottom-0 left-0 z-2 h-1 bg-white/10">
            <motion.div
              className="h-full bg-violet-400/70"
              animate={{ width: ["12%", "88%", "12%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Warstwa „zdjęcie” — lewa strona: wejście statyczne */}
        <div
          className="absolute inset-0 z-2"
          style={{ clipPath: leftClip }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lokalne demo statyczne */}
          <img
            src="/hero-studio/przed1.webp"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
            draggable={false}
          />
          <span className="absolute top-2 left-2 rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white/95 uppercase backdrop-blur-sm">
            Zdjęcie
          </span>
          <span className="absolute bottom-2 left-2 text-[8px] text-white/90 drop-shadow-md">Wejście · jedna klatka</span>
        </div>

        <div
          className="absolute inset-y-0 z-10 w-10 -translate-x-1/2"
          style={{ left: `${pos}%` }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/50 shadow-sm" />
          <div className="absolute top-1/2 left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-zinc-900/90 shadow-lg sm:h-7 sm:w-7 lg:h-9 lg:w-9">
            <svg viewBox="0 0 24 12" fill="none" className="h-2 w-4 text-white sm:h-2.5 sm:w-5 lg:h-3 lg:w-6" aria-hidden>
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M2 6h20M6 2L2 6l4 4M18 2l4 4-4 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function InstagramPostMockup({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0c] shadow-lg shadow-black/40 ${compact ? "w-37" : "w-full max-w-54"}`}
    >
      <div className={`flex items-center gap-1.5 border-b border-white/6 ${compact ? "px-2 py-1.5" : "px-2.5 py-2"}`}>
        <div className={`relative shrink-0 rounded-full bg-linear-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] p-[2px] ${compact ? "h-5 w-5" : "h-7 w-7"}`}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0c0c0c] text-[8px] font-bold text-emerald-400">
            L
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold tracking-tight ${compact ? "text-[9px]" : "text-[11px]"}`}>listingo.pl</p>
          <p className="text-[7px] text-muted-foreground">Sponsored</p>
        </div>
        <svg viewBox="0 0 16 4" fill="currentColor" className={`text-white/40 ${compact ? "h-2 w-3" : "h-3 w-4"}`} aria-hidden>
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="14" cy="2" r="1.5" />
        </svg>
      </div>
      <div className={`relative bg-linear-to-br from-zinc-800 via-zinc-900 to-black ${compact ? "aspect-square max-h-26" : "aspect-square"}`}>
        <div className="absolute inset-0 opacity-90" style={{ backgroundImage: "radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.15), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(120,80,50,0.25), transparent 45%)" }} />
        <div className={`absolute flex items-center justify-center ${compact ? "inset-2" : "inset-5"}`}>
          <div className={`relative rounded-md border border-white/10 bg-linear-to-br from-amber-950/80 via-stone-900 to-stone-950 shadow-md shadow-black/40 ${compact ? "w-[78%] pt-3 pb-1.5" : "w-[72%] max-w-[140px]"}`}>
            <div className={`absolute inset-x-1.5 rounded-full bg-white/10 ${compact ? "top-1 h-0.5" : "top-2 h-1"}`} />
            <div className={`flex items-end justify-center ${compact ? "aspect-4/3 px-1 pt-3 pb-1" : "aspect-4/3 p-2 pt-5"}`}>
              <span className={`rounded bg-black/55 font-medium text-white/95 backdrop-blur-sm ${compact ? "px-1 py-0.5 text-[6px]" : "px-2 py-1 text-[8px]"}`}>
                Portfel RFID
              </span>
            </div>
          </div>
        </div>
        <div className={`absolute rounded-full bg-black/50 text-white/80 backdrop-blur-sm ${compact ? "right-1 bottom-1 px-1 py-0.5 text-[6px]" : "right-2 bottom-2 px-2 py-0.5 text-[8px]"}`}>
          1/3
        </div>
      </div>
      <div className={`flex items-center text-white/70 ${compact ? "gap-2 px-2 py-1 text-[10px]" : "gap-3 px-2.5 py-2 text-[13px]"}`}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden>
          <path stroke="currentColor" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden>
          <path stroke="currentColor" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden>
          <line stroke="currentColor" x1="22" y1="2" x2="11" y2="13" /><polygon stroke="currentColor" points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`ml-auto ${compact ? "h-3 w-3" : "h-4 w-4"}`} aria-hidden>
          <path stroke="currentColor" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      {!compact && (
        <div className="space-y-1 px-2.5 pb-3">
          <p className="text-[10px] leading-snug">
            <span className="font-semibold text-foreground">listingo.pl</span>{" "}
            <span className="text-muted-foreground">Nowy portfel, który robi WOW od pierwszego wejrzenia. Skóra naturalna, RFID, idealny na prezent.</span>
          </p>
          <p className="text-[9px] text-emerald-400/90">#portfel #skórzany #RFID #prezent #mensstyle</p>
        </div>
      )}
      {compact && (
        <div className="px-2 pb-2">
          <p className="text-[7px] leading-tight text-muted-foreground line-clamp-2">
            <span className="font-semibold text-foreground">listingo.pl</span> Nowy portfel — skóra, RFID.
          </p>
        </div>
      )}
    </div>
  )
}

export function FeaturesSection() {
  return (
    <section id="funkcje" className="relative overflow-hidden px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-950/25 via-background to-background" aria-hidden />

      {/* Header */}
      <div className="relative z-10 mx-auto mb-14 max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={cardTransition}
          className="text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase"
        >
          Narzędzia
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.05 }}
          className="mt-4 text-4xl font-bold tracking-tight md:text-5xl"
        >
          Jeden asystent.
          <br />
          <span className="text-muted-foreground">
            Sześć supermocy. I to dopiero początek.
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.1 }}
          className="mt-5 text-lg text-muted-foreground/70"
        >
          Nie kolejny generator opisów. Kompletny asystent sprzedaży AI.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.12 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden>✅</span>
            Działa teraz: 6 modułów
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden>🧪</span>
            Wkrótce: kolejne rozszerzenia
          </span>
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-14">
        {/* ——— BLOK: Działa teraz ——— */}
        <div>
          <h3 className="mb-4 text-lg font-bold tracking-tight text-foreground">Działa teraz</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:items-stretch lg:gap-5">
        {/* Opisy (CORE) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0 }}
          className={`landing-card-lift group relative flex h-full min-h-64 flex-col overflow-hidden rounded-3xl bg-linear-to-br from-emerald-950/50 to-card/50 p-5 pb-32 text-left sm:p-6 sm:pb-36 md:col-span-2 md:p-7 md:pb-36 lg:col-span-4 lg:min-h-0 lg:pb-7 ${liveCardSurface}`}
        >
          <motion.div
            className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"
            animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.05, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          {/* Background geometric accent */}
          <svg viewBox="0 0 200 200" fill="none" className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 -translate-x-1/4 translate-y-1/4 opacity-[0.035]" aria-hidden>
            <circle stroke="white" strokeWidth="1" cx="100" cy="100" r="90" />
            <circle stroke="white" strokeWidth="1" cx="100" cy="100" r="65" />
            <circle stroke="white" strokeWidth="1" cx="100" cy="100" r="40" />
            <line stroke="white" strokeWidth="1" x1="10" y1="100" x2="190" y2="100" />
            <line stroke="white" strokeWidth="1" x1="100" y1="10" x2="100" y2="190" />
          </svg>
          <motion.div
            className="pointer-events-none absolute -right-12 -bottom-12 z-0 h-40 w-40 rounded-full bg-teal-500/6 blur-3xl"
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />

          <div className="relative z-10 flex items-start gap-4">
            <div className="flex w-10 shrink-0 justify-center pt-1">
              <IconBadge icon={<IconDoc className="h-5 w-5" />} glow="emerald" />
            </div>
            <div className="min-w-0 max-w-full flex-1 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-xl font-bold sm:text-2xl">Od nazwy produktu do gotowej oferty</h3>
                <span className={statusLiveClass}>LIVE</span>
              </div>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
                Wpisz nazwę produktu — dostaniesz tytuł SEO, opis krótki i długi, tagi i meta. Gotowe w
                30 sekund, zoptymalizowane pod <PlatformInlineList names={["Allegro", "Amazon", "Shopify"]} />.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-4 mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-lg border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] italic text-muted-foreground/60">
              <Keyboard className="mr-1 inline h-3 w-3 shrink-0 text-muted-foreground/40" strokeWidth={1.5} aria-hidden />
              słuchawki bluetooth douszne
            </span>
            <motion.span
              className="inline-flex text-emerald-400"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            >
              <Sparkles className="h-4 w-4" strokeWidth={2} />
            </motion.span>
            <div className="flex flex-wrap gap-1">
              {["Tytuł SEO ✓", "Opis krótki ✓", "Opis długi ✓", "Tagi ✓"].map((label, idx) => (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 400, damping: 24, delay: idx * 0.08 }}
                  className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-400"
                >
                  {label}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Floating quality card */}
          <div className="pointer-events-none absolute right-3 bottom-14 z-10 w-54 translate-x-2 translate-y-2 overflow-hidden rounded-xl border border-white/8 bg-card/90 p-3 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35),0_0_30px_-8px_rgba(16,185,129,0.15)] backdrop-blur-sm transition-transform duration-500 sm:right-4 sm:bottom-16 group-hover:translate-x-0 group-hover:translate-y-0 lg:static lg:right-auto lg:bottom-auto lg:mt-5 lg:mb-0 lg:w-full lg:max-w-sm lg:translate-x-0 lg:translate-y-0">
            <motion.div
              className="pointer-events-none absolute -left-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/8 blur-2xl"
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />
            <div className="relative z-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted-foreground">Quality Score</p>
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                <svg viewBox="0 0 8 8" fill="currentColor" className="h-1 w-1" aria-hidden><circle cx="4" cy="4" r="4" /></svg>
                Gotowy
              </span>
            </div>
            <div className="relative mt-2 flex items-center gap-2">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/35 blur-md"
                  animate={{ opacity: [0.35, 0.75, 0.35], scale: [1.15, 1.45, 1.15] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                />
                <svg viewBox="0 0 44 44" fill="none" className="absolute inset-0 z-1 h-full w-full -rotate-90" aria-hidden>
                  <circle stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" cx="22" cy="22" r="18" />
                  <circle stroke="rgba(16,185,129,0.85)" strokeWidth="2.5" strokeLinecap="round" cx="22" cy="22" r="18" strokeDasharray={`${2 * Math.PI * 18 * 0.96} ${2 * Math.PI * 18}`} />
                </svg>
                <span className="relative z-2 text-xs font-bold text-emerald-400">96</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">Słuchawki TWS ANC · Bateria 40h</p>
                <p className="mt-0.5 text-[10px] text-emerald-400">Gotowy do publikacji</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-0.5 text-[9px] text-muted-foreground/60">
              {[["SEO", "98"], ["CTA", "93"], ["Czytelność", "96"]].map(([k, v]) => (
                <div key={k} className="flex flex-col items-center gap-0.5 rounded-md bg-white/3 py-1">
                  <span className="font-semibold text-foreground/80">{v}</span>
                  <span className="text-center leading-tight">{k}</span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-center text-[9px] text-muted-foreground/70">
              Wynik lepszy niż 95% ofert na Allegro
            </p>
            </div>
          </div>
          <Link
            href="/dashboard/generate"
            className="group pointer-events-auto relative z-30 mt-auto mb-24 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-2.5 text-sm font-medium text-emerald-300 shadow-sm shadow-black/20 transition-all duration-200 hover:border-emerald-400/35 hover:bg-emerald-500/15 hover:text-emerald-100 hover:shadow-[0_0_28px_-10px_rgba(16,185,129,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.99] sm:mb-28 lg:mb-0"
          >
            Przejdź do generatora
            <span
              className="text-emerald-400/80 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </Link>
        </motion.div>

        {/* AI Video Studio — obok Photo Studio (drugi rząd na lg po CORE full-width) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.055 }}
          className={`landing-card-lift group relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-card/30 p-5 text-left sm:p-6 md:col-span-2 lg:col-span-2 lg:p-7 ${videoLiveCardSurface}`}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 20%, rgba(139,92,246,0.55), transparent 50%), radial-gradient(circle at 20% 80%, rgba(124,58,237,0.35), transparent 40%)",
            }}
            aria-hidden
          />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div className="flex items-start gap-4">
              <div className="flex w-10 shrink-0 justify-center pt-0.5">
                <IconBadge icon={<IconVideo className="h-5 w-5" />} glow="violet" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">AI Video Studio</h3>
                  <span className={statusLiveClass}>LIVE</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Zamień packshot w krótki film produktowy. Gotowy na Reels, TikTok i reklamy Meta — bez montażu, bez
                  kamery.
                </p>
              </div>
            </div>
            <VideoStudioCompareDemo />
            <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
              {["9:16 Reels", "16:9 Listing", "1:1 Feed"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-violet-500/20 bg-violet-500/8 px-2 py-0.5 text-[9px] font-medium text-violet-400/80"
                >
                  {pill}
                </span>
              ))}
              <span className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[9px] font-medium text-muted-foreground/60">
                5s / 8s
              </span>
            </div>
            <Link
              href="/dashboard/video-studio"
              className="relative z-10 mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/[0.07] px-4 py-2.5 text-sm font-medium text-violet-300 shadow-sm transition-all duration-200 hover:border-violet-400/35 hover:bg-violet-500/15 hover:text-violet-100 hover:shadow-[0_0_28px_-10px_rgba(139,92,246,0.35)] active:scale-[0.99]"
            >
              Otwórz Video Studio →
            </Link>
          </div>
        </motion.div>

        {/* AI Photo Studio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.07 }}
          className={`landing-card-lift group relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-card/30 p-5 text-left sm:p-6 md:col-span-2 lg:col-span-2 lg:p-7 ${liveCardSurface}`}
        >
          <motion.div
            className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-orange-500/8 blur-3xl"
            animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.06, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-amber-500/6 blur-2xl"
            animate={{ opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div className="flex items-start gap-4">
              <div className="flex w-10 shrink-0 justify-center pt-0.5">
                <IconBadge icon={<IconCamera className="h-5 w-5" />} glow="orange" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">AI Photo Studio</h3>
                  <span className={statusLiveClass}>LIVE</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Wrzuć amatorskie zdjęcie. Dostaniesz packshot gotowy na Allegro, Amazon i Instagram — bez
                  fotografa, bez studia.
                </p>
              </div>
            </div>
            <p className="mt-4 mb-1 text-[10px] font-medium text-muted-foreground/45">
              ✨ Przeciągnij suwak — efekt AI Photo Studio na żywo
            </p>
            <PhotoStudioCompareDemo />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["14 scen", "5 formatów eksportu", "Białe tło ✓", "Własny prompt"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-orange-500/20 bg-orange-500/8 px-2 py-0.5 text-[9px] font-medium text-orange-400/80"
                >
                  {pill}
                </span>
              ))}
            </div>
            <Link
              href="/dashboard/photo-studio"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-orange-500/25 bg-orange-500/[0.07] px-4 py-2.5 text-sm font-medium text-orange-300 shadow-sm transition-all duration-200 hover:border-orange-400/35 hover:bg-orange-500/15 hover:text-orange-100 hover:shadow-[0_0_28px_-10px_rgba(251,146,60,0.35)] active:scale-[0.99]"
            >
              Otwórz Photo Studio →
            </Link>
          </div>
        </motion.div>

        {/* AI Price Advisor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.1 }}
          className={`landing-card-lift group flex h-full flex-col rounded-3xl bg-card/30 p-5 text-left sm:p-6 md:col-span-1 lg:col-span-1 ${liveCardSurface}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex w-10 shrink-0 justify-center pt-0.5">
              <IconBadge icon={<IconTrendUp className="h-5 w-5" />} glow="emerald" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-bold">AI Price Advisor</h3>
                <span className={statusLiveClass}>LIVE</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                AI analizuje rynek i podpowiada cenę, która balansuje konwersję i marżę.
              </p>
            </div>
          </div>
          <div className="relative mt-3 flex h-14 items-end justify-center gap-2.5 sm:mt-4 sm:h-16 sm:gap-3 lg:flex-1" aria-hidden>
            <span className="pointer-events-none absolute -top-1 right-2 text-[10px] font-medium text-muted-foreground/40">
              zł
            </span>
            {([40, 70, 100] as const).map((h, i) => (
              <div
                key={i}
                className="features-bento-bar w-6 origin-bottom rounded-t-md bg-linear-to-t from-emerald-600 to-emerald-400"
                style={{ "--bar-h": `${h}%`, animationDelay: `${i * 0.15}s` } as CSSProperties}
              />
            ))}
            <motion.div
              className="absolute bottom-10 left-2 flex items-center gap-1"
              animate={{ x: [0, 3, 0], opacity: [0.3, 0.55, 0.3] }}
              transition={{ duration: 2.8, repeat: Infinity }}
            >
              <IconTrendUp className="h-3 w-3 text-emerald-400" />
            </motion.div>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium text-emerald-400/70">
            449 zł — sugerowana cena
          </p>
          <Link href="/dashboard/generate" className={miniCtaClass}>
            Sprawdź sugerowaną cenę →
          </Link>
        </motion.div>

        {/* Brand Voice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.12 }}
          className={`landing-card-lift group flex h-full flex-col rounded-3xl bg-card/30 p-5 text-left sm:p-6 md:col-span-1 lg:col-span-1 ${liveCardSurface}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex w-10 shrink-0 justify-center pt-0.5">
              <IconBadge icon={<IconPalette className="h-5 w-5" />} glow="emerald" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-bold">Brand Voice</h3>
                <span className={statusLiveClass}>LIVE</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Wklej swoje próbki — AI wykryje ton i styl marki. Ustaw zakazane i ulubione słowa.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span className="text-[10px] text-muted-foreground/50">Ton:</span>
              <span className="text-[11px] font-medium text-emerald-400">
                Konkretny, pewny siebie
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["premium", "rzemieślniczy", "bezpośrednio"].map((w) => (
                <span
                  key={w}
                  className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-400"
                >
                  {w}
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["tani", "najtańszy"].map((w) => (
                <span
                  key={w}
                  className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] text-red-400/70 line-through"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
          <Link href="/dashboard/brand" className={miniCtaClass}>
            Skonfiguruj Brand Voice →
          </Link>
        </motion.div>

        {/* Social Media */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.14 }}
          className={`landing-card-lift group flex h-full flex-col gap-4 rounded-3xl bg-card/40 p-5 text-left sm:gap-5 sm:p-6 md:col-span-2 md:flex-row md:items-stretch md:justify-between lg:col-span-2 ${liveCardSurface}`}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-4 overflow-hidden">
            <div className="flex w-full items-start gap-4">
              <div className="flex w-10 shrink-0 justify-center pt-0.5">
                <IconBadge icon={<IconBubbles className="h-5 w-5" />} glow="indigo" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">Social Media</h3>
                  <span className={statusLiveClass}>LIVE</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Posty pod Instagram, Facebook i TikTok z gotowym tonem i hashtagami.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["Instagram", "Facebook", "TikTok"].map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-medium text-indigo-400"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link href="/dashboard/generate" className={`${miniCtaClass} mt-0 pt-0 md:pl-14`}>
              Generuj posty social →
            </Link>
          </div>
          <div className="flex shrink-0 items-center justify-center md:justify-end md:self-stretch">
            <InstagramPostMockup compact />
          </div>
        </motion.div>

        {/* Moje opisy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.16 }}
          className={`landing-card-lift group flex h-full flex-col rounded-3xl bg-card/30 p-5 text-left sm:p-6 md:col-span-2 lg:col-span-2 lg:col-start-2 ${liveCardSurface}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex w-10 shrink-0 justify-center pt-0.5">
              <IconBadge icon={<IconArchive className="h-5 w-5" />} glow="emerald" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-bold">Moje opisy</h3>
                <span className={statusLiveClass}>LIVE</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Biblioteka wygenerowanych treści: wyszukuj, filtruj, kopiuj i wracaj do najlepszych ofert.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 rounded-xl border border-white/8 bg-black/20 p-3">
            {[
              { title: "Marynarka wełniana · Slim fit", when: "Dziś, 14:32" },
              { title: "Portfel skórzany RFID", when: "Wczoraj" },
              { title: "Buty trekkingowe — opis długi", when: "22 mar" },
            ].map((row) => (
              <div
                key={row.title}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/3 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-foreground/90">{row.title}</p>
                  <p className="text-[9px] text-muted-foreground">{row.when}</p>
                </div>
                <Copy className="pointer-events-none h-3.5 w-3.5 shrink-0 text-muted-foreground/40" aria-hidden />
              </div>
            ))}
          </div>
          <Link href="/dashboard/descriptions" className={miniCtaClass}>
            Otwórz bibliotekę opisów →
          </Link>
        </motion.div>
          </div>
        </div>

        {/* ——— BLOK: Wkrótce ——— */}
        <hr className="border-white/5" />
        <div>
          <h3 className="mt-2 text-lg font-bold tracking-tight">Wkrótce</h3>
          <p className="mt-1 text-sm text-muted-foreground">Nad tym pracujemy</p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:items-stretch lg:gap-5">
        {/* Multi-Language */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.18 }}
          className={`landing-card-lift group flex h-full flex-col rounded-3xl p-4 text-left sm:p-5 md:col-span-1 lg:col-span-1 ${soonCardSurface}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex w-10 shrink-0 justify-center pt-0.5">
              <IconBadge icon={<IconGlobe className="h-5 w-5" />} glow="emerald" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold">Multi-Language</h3>
                <span className={statusSoonClass}>WKRÓTCE</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Tłumaczenia opisów na kolejne języki bez ręcznego przepisywania — w planach.
              </p>
            </div>
          </div>
          <LanguageSwitcherMock />
        </motion.div>

        {/* Testy A/B */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.22 }}
          className={`landing-card-lift group relative flex h-full flex-col overflow-hidden rounded-3xl p-4 text-left sm:p-5 md:col-span-1 lg:col-span-1 ${soonCardSurface}`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, rgba(16,185,129,0.5), transparent 40%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.4), transparent 35%)" }} aria-hidden />
          <div className="relative flex items-start gap-4">
            <div className="flex w-10 shrink-0 justify-center pt-0.5">
              <IconBadge icon={<IconSplit className="h-5 w-5" />} glow="indigo" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold">Testy A/B opisów</h3>
                <span className={statusSoonClass}>WKRÓTCE</span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                Dwie wersje opisu obok siebie, żeby testować komunikat na liście — w przygotowaniu.
              </p>
            </div>
          </div>
          <div className="relative z-1 mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-zinc-500/25 bg-zinc-500/10 p-3 text-center transition-transform group-hover:scale-[1.02]">
              <span className="text-[11px] font-bold text-zinc-300">Wersja A</span>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground line-clamp-2">Krótki, dynamiczny ton…</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center transition-transform group-hover:scale-[1.02]">
              <span className="text-[11px] font-bold text-muted-foreground">Wersja B</span>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground line-clamp-2">Ekspercki, SEO-heavy…</p>
            </div>
          </div>
        </motion.div>

        {/* Listing Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.24 }}
          className={`landing-card-lift group flex h-full flex-col rounded-3xl p-4 text-left sm:p-5 md:col-span-1 lg:col-span-1 ${soonCardSurface}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex w-10 shrink-0 justify-center pt-0.5">
              <IconBadge icon={<IconPulse className="h-5 w-5" />} glow="emerald" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold">Listing Health</h3>
                <span className={statusSoonClass}>WKRÓTCE</span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                Wklejasz tekst — dostajesz checklistę i propozycje poprawek pod marketplace (wizualna symulacja).
              </p>
            </div>
          </div>
          <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="relative z-0 h-full rounded-full bg-linear-to-r from-yellow-500/90 via-zinc-400 to-zinc-500"
              initial={{ width: "0%" }}
              whileInView={{ width: "72%" }}
              viewport={viewport}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            />
            <motion.div
              className="pointer-events-none absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-zinc-300 shadow-[0_0_10px_rgba(161,161,170,0.45)]"
              style={{ left: "72%" }}
              animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity }}
              aria-hidden
            />
          </div>
          <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground/70">Przykładowy pasek postępu — nie jest oceną realnej oferty</p>
          <div className="mt-3 flex justify-center gap-3 text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500/80" />SEO</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />Czytelność</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500/70" />CTA</span>
          </div>
        </motion.div>

        {/* Email Marketing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.25 }}
          className={`landing-card-lift group flex h-full flex-col rounded-3xl p-4 text-left sm:p-5 md:col-span-1 lg:col-span-1 ${soonCardSurface}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex w-10 shrink-0 justify-center pt-0.5">
              <IconBadge icon={<IconMail className="h-5 w-5" />} glow="emerald" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold">Email Marketing</h3>
                <span className={statusSoonClass}>WKRÓTCE</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Szablony mailingowe zsynchronizowane z ofertami — bez integracji w tej chwili.
              </p>
            </div>
          </div>
          <div className="mt-3 w-full max-w-37 shrink-0 rounded-lg border border-white/8 bg-white/3 p-2 shadow-inner">
            <div className="mb-1.5 flex items-center gap-1.5 border-b border-white/6 pb-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-500/20 text-zinc-400">
                <IconMail className="h-3 w-3" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[8px] font-semibold">Kampania: Portfel</p>
                <p className="text-[7px] text-muted-foreground">Szkic wiadomości</p>
              </div>
            </div>
            <div className="mb-1.5 h-2 w-3/4 rounded bg-emerald-500/25" />
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded bg-white/8" />
              <div className="h-1.5 w-[88%] rounded bg-white/6" />
              <div className="h-1.5 w-[65%] rounded bg-white/6" />
            </div>
            <motion.div
              className="mt-2 flex h-6 w-full items-center justify-center rounded-md bg-zinc-500/20"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <span className="text-[8px] font-semibold text-zinc-400">Przykładowe CTA</span>
            </motion.div>
            <p className="mt-1.5 text-center text-[7px] text-muted-foreground">1 klik</p>
          </div>
        </motion.div>

        {/* Buyer Persona + Trendy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.26 }}
          className={`landing-card-lift group flex flex-col gap-5 rounded-3xl bg-linear-to-br from-card/50 to-zinc-950/30 p-4 text-left sm:p-5 md:col-span-2 lg:col-span-4 lg:flex-row lg:gap-6 ${soonCardSurface}`}
        >
          <div className="flex min-w-0 flex-1 items-start gap-4 overflow-hidden">
            <div className="flex w-10 shrink-0 justify-center pt-0.5">
              <IconBadge icon={<IconTarget className="h-5 w-5" />} glow="emerald" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold">Buyer Persona i Trendy sezonowe</h3>
                <span className={statusSoonClass}>WKRÓTCE</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Persony odbiorców i sezonowe szczyty wyszukiwań w jednym widoku — w przygotowaniu.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: "Mama 30–40", color: "border-pink-500/20 bg-pink-500/8 text-pink-300" },
                  { label: "Biznesmen", color: "border-sky-500/20 bg-sky-500/8 text-sky-300" },
                  { label: "Student", color: "border-violet-500/20 bg-violet-500/8 text-violet-300" },
                ].map(({ label, color }) => (
                  <span key={label} className={`rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-3 overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-4 text-left text-xs">
            <motion.div
              className="pointer-events-none absolute -right-2 top-2 text-muted-foreground/10"
              animate={{ rotate: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16" aria-hidden>
                <rect stroke="currentColor" strokeWidth="1" x="2" y="4" width="20" height="16" rx="2" />
                <path stroke="currentColor" strokeWidth="1" d="M8 2v4M16 2v4M2 10h20" />
              </svg>
            </motion.div>
            <p className="relative text-muted-foreground">
              <span className="font-semibold text-foreground">Dzień Matki</span>
              <span className="ml-2 rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] text-zinc-400">wyższy popyt</span>
              <span className="ml-1 text-muted-foreground/60">&quot;prezent dla mamy&quot;</span>
            </p>
            <p className="relative text-muted-foreground">
              <span className="font-semibold text-foreground">Black Friday</span>
              <span className="ml-2 rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] text-zinc-400">sezonowy szczyt</span>
            </p>
          </div>
        </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
