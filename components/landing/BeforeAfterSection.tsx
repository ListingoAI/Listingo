"use client"

import { motion } from "framer-motion"
import { useCallback, useRef, useState } from "react"

import { fadeSlideUp } from "@/lib/landing-motion"

const GOOD_TAGS = [
  "słuchawki ANC",
  "bezprzewodowe",
  "bluetooth 5.3",
  "40h bateria",
] as const

export function BeforeAfterSection() {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100))
    setSliderPosition(percent)
  }, [])

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    handleMove(e.clientX)
    function onMove(ev: MouseEvent) {
      handleMove(ev.clientX)
    }
    function onUp() {
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
    function onMove(ev: TouchEvent) {
      const t = ev.touches[0]
      if (t) handleMove(t.clientX)
    }
    function onUp() {
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
          TRANSFORMACJA
        </p>
        <h2 className="mt-4 text-3xl font-bold text-foreground md:text-5xl">
          Jeden produkt. Dwa światy.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Przesuń suwak i poczuj różnicę.
        </p>
      </motion.div>

      <motion.div {...fadeSlideUp} className="mx-auto max-w-4xl">
        <div
          ref={containerRef}
          className="landing-card-lift relative min-h-[360px] overflow-hidden rounded-3xl border border-white/6 md:min-h-[420px]"
        >
          {/* Lewa — bez AI */}
          <div
            className="absolute inset-0 z-1 bg-linear-to-br from-red-950/30 to-card"
            style={{ clipPath: leftClip }}
          >
            <div className="p-8 md:p-12">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                  ✗
                </div>
                <span className="font-semibold text-red-400">Bez AI</span>
                <span className="ml-auto rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-400">
                  Score: 31
                </span>
              </div>
              <div className="space-y-3 text-sm text-foreground/60">
                <p className="font-medium text-foreground/80">
                  Słuchawki bezprzewodowe
                </p>
                <p>
                  Słuchawki bluetooth. Kolor czarny. Zasięg 10m. Bateria 40h.
                  Etui w zestawie. Wysyłka 24h.
                </p>
                <p className="mt-6 text-xs italic text-red-400/60">
                  ❌ Zero SEO ❌ Nudne ❌ Brak emocji ❌ 0 konwersji
                </p>
              </div>
            </div>
          </div>

          {/* Prawa — Listingo */}
          <div
            className="absolute inset-0 z-2 bg-linear-to-br from-emerald-950/30 to-card"
            style={{ clipPath: rightClip }}
          >
            <div className="p-8 md:p-12">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  ✓
                </div>
                <span className="font-semibold text-emerald-400">
                  Z Listingo
                </span>
                <span className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                  Score: 96
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <h3 className="font-semibold text-foreground">
                  Słuchawki Bezprzewodowe ANC — 40h Bateria, Redukcja Szumów
                </h3>
                <p className="text-foreground/80">
                  Odkryj nowy poziom dźwięku! Aktywna redukcja szumów ANC wycisza
                  świat wokół Ciebie, a 40 godzin na jednym ładowaniu oznacza
                  muzykę non-stop przez cały tydzień.
                </p>
                <div className="mt-2">
                  <p className="text-xs font-semibold text-emerald-400">
                    ✨ Dlaczego te słuchawki?
                  </p>
                  <ul className="mt-1 space-y-1">
                    <li className="text-xs text-foreground/70">
                      ✓ ANC 3 generacji — cisza nawet w metrze
                    </li>
                    <li className="text-xs text-foreground/70">
                      ✓ 40h bateria — naładuj w poniedziałek, zapomnij do piątku
                    </li>
                    <li className="text-xs text-foreground/70">
                      ✓ Bluetooth 5.3 — zero lagów przy filmach
                    </li>
                  </ul>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {GOOD_TAGS.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Suwak */}
          <div
            className="absolute inset-y-0 z-20 w-12 cursor-col-resize touch-none"
            style={{
              left: `${sliderPosition}%`,
              transform: "translateX(-50%)",
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            role="slider"
            aria-valuenow={Math.round(sliderPosition)}
            aria-valuemin={5}
            aria-valuemax={95}
            aria-label="Porównaj opis bez AI i z Listingo"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault()
                setSliderPosition((p) => Math.max(5, p - 3))
              }
              if (e.key === "ArrowRight") {
                e.preventDefault()
                setSliderPosition((p) => Math.min(95, p + 3))
              }
            }}
          >
            <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/30" />
            <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-white shadow-lg active:cursor-grabbing">
              <span className="text-xs font-bold text-gray-800">⟷</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Ten sam produkt. Ta sama cena. Jedyna różnica? AI które rozumie SEO,
          psychologię i e-commerce.
        </p>
      </motion.div>
    </section>
  )
}

export default BeforeAfterSection
