"use client"

import { motion } from "framer-motion"
import { useCallback, useRef, useState } from "react"

import { fadeSlideUp } from "@/lib/landing-motion"

const GOOD_TAGS = ["słuchawki ANC", "bezprzewodowe", "bluetooth 5.3", "40h bateria"] as const

const BAD_ISSUES = ["Brak słów kluczowych SEO", "Zero emocji ani CTA", "Nudna, sucha lista cech"]
const GOOD_POINTS = [
  "ANC 3. generacji — cisza nawet w metrze",
  "40h bateria — naładuj w poniedziałek, zapomnij do piątku",
  "Bluetooth 5.3 — zero lagów przy filmach",
]

function ScoreRing({ score, color }: { score: number; color: "red" | "emerald" }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const stroke = color === "emerald" ? "rgba(52,211,153,0.85)" : "rgba(239,68,68,0.75)"
  const trackStroke = color === "emerald" ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)"
  const textColor = color === "emerald" ? "text-emerald-400" : "text-red-400"
  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <svg viewBox="0 0 40 40" fill="none" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle stroke={trackStroke} strokeWidth="3" cx="20" cy="20" r={r} />
        <motion.circle
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          cx="20" cy="20" r={r}
          strokeDasharray={`${fill} ${circ}`}
          initial={{ strokeDasharray: `0 ${circ}` }}
          whileInView={{ strokeDasharray: `${fill} ${circ}` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <span className={`relative text-xs font-bold ${textColor}`}>{score}</span>
    </div>
  )
}

export function BeforeAfterSection() {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    setSliderPosition(Math.max(5, Math.min(95, (x / rect.width) * 100)))
  }, [])

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    handleMove(e.clientX)
    const onMove = (ev: MouseEvent) => handleMove(ev.clientX)
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    handleMove(touch.clientX)
    const onMove = (ev: TouchEvent) => { const t = ev.touches[0]; if (t) handleMove(t.clientX) }
    const onUp = () => {
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onUp)
      window.removeEventListener("touchcancel", onUp)
    }
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend", onUp)
    window.addEventListener("touchcancel", onUp)
  }

  const leftClip = `inset(0 ${100 - sliderPosition}% 0 0)`
  const rightClip = `inset(0 0 0 ${sliderPosition}%)`

  return (
    <section className="px-6 py-32">
      <motion.div {...fadeSlideUp} className="mx-auto mb-16 max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Transformacja
        </p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
          Jeden produkt. Dwa światy.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Przesuń suwak i poczuj różnicę.
        </p>
      </motion.div>

      <motion.div {...fadeSlideUp} className="mx-auto max-w-4xl">
        {/* Always-visible labels above the slider */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ScoreRing score={31} color="red" />
            <div>
              <p className="text-xs font-semibold text-red-400">Bez Listingo</p>
              <p className="text-[10px] text-muted-foreground/50">Score 31/100</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-xs font-semibold text-emerald-400">Z Listingo AI</p>
              <p className="text-[10px] text-muted-foreground/50">Score 96/100</p>
            </div>
            <ScoreRing score={96} color="emerald" />
          </div>
        </div>

        {/* Slider container */}
        <div
          ref={containerRef}
          className="landing-card-lift relative min-h-[360px] overflow-hidden rounded-3xl border border-white/6 md:min-h-[420px]"
        >
          {/* ── LEFT: bez AI ── */}
          <div
            className="absolute inset-0 z-1"
            style={{
              clipPath: leftClip,
              background: "linear-gradient(135deg, rgba(127,29,29,0.25) 0%, hsl(var(--card)) 100%)",
            }}
          >
            <div className="p-8 md:p-12">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5">
                <svg viewBox="0 0 16 16" fill="none" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5 text-red-400" aria-hidden>
                  <path stroke="currentColor" d="M3 3l10 10M13 3L3 13" />
                </svg>
                <span className="text-xs font-semibold text-red-400">Bez Listingo</span>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <p className="text-base font-medium text-foreground/50">
                  Słuchawki bezprzewodowe
                </p>
                <p className="text-sm leading-relaxed text-foreground/35">
                  Słuchawki bluetooth. Kolor czarny. Zasięg 10m. Bateria 40h. Etui w zestawie. Wysyłka 24h.
                </p>
                <div className="mt-5 space-y-2">
                  {BAD_ISSUES.map((issue) => (
                    <div key={issue} className="flex items-center gap-2">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                        <svg viewBox="0 0 10 10" fill="none" strokeWidth="2" strokeLinecap="round" className="h-2.5 w-2.5 text-red-400" aria-hidden>
                          <path stroke="currentColor" d="M2 2l6 6M8 2L2 8" />
                        </svg>
                      </div>
                      <span className="text-xs text-red-400/70">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: z Listingo ── */}
          <div
            className="absolute inset-0 z-2"
            style={{
              clipPath: rightClip,
              background: "linear-gradient(135deg, rgba(6,78,59,0.3) 0%, hsl(var(--card)) 100%)",
            }}
          >
            <div className="p-8 md:p-12">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5">
                <svg viewBox="0 0 16 16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-400" aria-hidden>
                  <path stroke="currentColor" d="M3 8l3.5 3.5L13 4.5" />
                </svg>
                <span className="text-xs font-semibold text-emerald-400">Z Listingo AI</span>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="text-base font-bold leading-snug text-foreground">
                  Słuchawki Bezprzewodowe ANC — 40h Bateria, Redukcja Szumów
                </h3>
                <p className="text-sm leading-relaxed text-foreground/75">
                  Odkryj nowy poziom dźwięku. Aktywna redukcja szumów ANC wycisza świat wokół Ciebie, a 40 godzin na jednym ładowaniu oznacza muzykę non-stop przez cały tydzień.
                </p>

                <div className="mt-1 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70">
                    Dlaczego te słuchawki?
                  </p>
                  {GOOD_POINTS.map((point) => (
                    <div key={point} className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                        <svg viewBox="0 0 10 10" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-emerald-400" aria-hidden>
                          <path stroke="currentColor" d="M2 5l2.5 2.5L8 3" />
                        </svg>
                      </div>
                      <span className="text-xs leading-relaxed text-foreground/70">{point}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {GOOD_TAGS.map((tag) => (
                    <span key={tag} className="rounded-md border border-emerald-500/15 bg-emerald-500/8 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Slider handle ── */}
          <div
            className="absolute inset-y-0 z-20 w-12 cursor-col-resize touch-none"
            style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            role="slider"
            aria-valuenow={Math.round(sliderPosition)}
            aria-valuemin={5}
            aria-valuemax={95}
            aria-label="Porównaj opis bez AI i z Listingo"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") { e.preventDefault(); setSliderPosition((p) => Math.max(5, p - 3)) }
              if (e.key === "ArrowRight") { e.preventDefault(); setSliderPosition((p) => Math.min(95, p + 3)) }
            }}
          >
            {/* Line */}
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/20" />
            {/* Handle */}
            <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border border-white/20 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.45)] active:cursor-grabbing">
              <svg viewBox="0 0 24 12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-6 text-gray-700" aria-hidden>
                <path stroke="currentColor" d="M2 6h20M6 2L2 6l4 4M18 2l4 4-4 4" />
              </svg>
            </div>
            {/* Top gradient fade */}
            <div className="pointer-events-none absolute inset-x-1/2 top-0 h-16 w-px -translate-x-1/2 bg-linear-to-b from-white/0 via-white/15 to-white/0" aria-hidden />
          </div>
        </div>

        {/* Caption */}
        <p className="mt-6 text-center text-sm text-muted-foreground/60">
          Ten sam produkt · Ta sama cena · Jedyna różnica to AI, które rozumie SEO, psychologię i e-commerce.
        </p>
      </motion.div>
    </section>
  )
}

export default BeforeAfterSection
