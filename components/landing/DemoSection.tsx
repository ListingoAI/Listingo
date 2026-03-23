"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import { fadeSlideUp } from "@/lib/landing-motion"
import { cn } from "@/lib/utils"

type ActiveTool = "opis" | "social" | "cena" | "email"

const STEP_MESSAGES: Record<number, string> = {
  1: "Analizuję produkt...",
  2: "Optymalizuję pod SEO...",
  3: "Generuję treść...",
  4: "Obliczam Quality Score...",
}

const TOOLS: {
  id: ActiveTool
  emoji: string
  label: string
  sub: string
}[] = [
  { id: "opis", emoji: "✨", label: "Opis", sub: "30 sek" },
  { id: "social", emoji: "📱", label: "Post IG", sub: "15 sek" },
  { id: "cena", emoji: "💰", label: "Cena", sub: "5 sek" },
  { id: "email", emoji: "📧", label: "Email", sub: "20 sek" },
]

export function DemoSection() {
  const [activeTool, setActiveTool] = useState<ActiveTool>("opis")
  const [generatingDemo, setGeneratingDemo] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [demoResult, setDemoResult] = useState(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearAnimationTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  useEffect(() => {
    return () => clearAnimationTimeouts()
  }, [clearAnimationTimeouts])

  useEffect(() => {
    setDemoResult(false)
    setDemoStep(0)
  }, [activeTool])

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

    push(() => setDemoStep(2), 800)
    push(() => setDemoStep(3), 1600)
    push(() => setDemoStep(4), 2400)
    push(() => {
      setGeneratingDemo(false)
      setDemoResult(true)
    }, 3200)
  }, [generatingDemo, clearAnimationTimeouts])

  return (
    <section id="jak-dziala" className="relative px-6 py-32">
      <motion.div {...fadeSlideUp} className="mx-auto mb-16 max-w-3xl text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase">
          DEMO
        </p>
        <h2 className="mt-4 text-3xl font-bold md:text-5xl">Wypróbuj. Teraz.</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Bez rejestracji. Kliknij i zobacz jak AI tworzy opisy.
        </p>
      </motion.div>

      <motion.div
        {...fadeSlideUp}
        transition={{ ...fadeSlideUp.transition, delay: 0.08 }}
        className="mx-auto max-w-4xl"
      >
        <div className="landing-card-lift overflow-hidden rounded-3xl border border-white/8 bg-card/60 shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="flex h-12 items-center border-b border-white/5 bg-card/80 px-5">
            <div className="flex gap-2">
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
            </div>
            <span className="flex-1 text-center font-mono text-xs text-muted-foreground/50">
              listingo.pl/dashboard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* LEWA */}
            <div className="border-white/5 p-6 md:border-r">
              <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-xs">
                  1
                </span>
                Wybierz narzędzie
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTool(t.id)}
                    disabled={generatingDemo}
                    className={cn(
                      "rounded-xl border p-3 text-center text-sm transition-all",
                      activeTool === t.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20",
                      generatingDemo && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <span className="block">{t.emoji}</span>
                    <span className="mt-1 block font-medium">{t.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t.sub}
                    </span>
                  </button>
                ))}
              </div>

              <div className="my-5 border-t border-white/5" />

              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-xs">
                  2
                </span>
                Wpisz produkt
              </h3>

              <div className="rounded-xl border border-white/5 bg-white/3 p-3 text-sm text-foreground">
                Bezprzewodowe słuchawki ANC z etui
              </div>

              <button
                type="button"
                onClick={() => startAnimation()}
                disabled={generatingDemo}
                className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {generatingDemo ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"
                      aria-hidden
                    />
                    Generuję...
                  </span>
                ) : (
                  "✨ Generuj"
                )}
              </button>
            </div>

            {/* PRAWA */}
            <div className="relative min-h-[300px] p-6">
              <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-xs">
                  3
                </span>
                Wynik
              </h3>

              {!generatingDemo && !demoResult ? (
                <div className="flex h-[min(240px,50vh)] items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground/50">
                    Kliknij &apos;Generuj&apos; żeby zobaczyć
                  </p>
                </div>
              ) : null}

              {generatingDemo ? (
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
                    aria-hidden
                  />
                  <span className="text-sm text-emerald-400">
                    {STEP_MESSAGES[demoStep] ?? STEP_MESSAGES[1]}
                  </span>
                </div>
              ) : null}

              {demoResult && !generatingDemo ? (
                <motion.div
                  key={`${activeTool}-result`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  {activeTool === "opis" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Quality Score
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-emerald-400">
                            92/100
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5">
                        <motion.div
                          className="h-full rounded-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: "92%" }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                      <div className="mt-4">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Tytuł SEO
                        </p>
                        <p className="text-sm font-medium">
                          Słuchawki Bezprzewodowe ANC z Redukcją Szumów | 40h
                          Bateria
                        </p>
                      </div>
                      <div className="mt-3">
                        <p className="mb-1 text-xs text-muted-foreground">Opis</p>
                        <p className="text-xs text-foreground/80">
                          Odkryj nowy poziom dźwięku dzięki aktywnej redukcji
                          szumów ANC. Do 40 godzin słuchania na jednym ładowaniu...
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {[
                          "słuchawki ANC",
                          "bezprzewodowe",
                          "bluetooth",
                          "40h",
                        ].map((tag) => (
                          <span
                            key={tag}
                            className="rounded px-2 py-0.5 text-[10px] text-emerald-400 bg-emerald-500/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeTool === "social" ? (
                    <div className="rounded-xl border border-white/5 bg-white/2 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-linear-to-br from-purple-500 to-pink-500" />
                        <span className="text-xs font-semibold">twojsklep</span>
                      </div>
                      <p className="text-xs text-foreground">
                        🎧 Cisza w miejskim chaosie? To możliwe! Nasze słuchawki
                        ANC z 40h baterią to game changer. Link w bio 👆
                      </p>
                      <p className="mt-2 text-[10px] text-emerald-400">
                        #słuchawki #ANC #muzyka #technologia #bezprzewodowe
                      </p>
                    </div>
                  ) : null}

                  {activeTool === "cena" ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          Sugerowana cena
                        </p>
                        <p className="mt-1 text-3xl font-bold text-emerald-400">
                          189 zł
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Przedział rynkowy: 149-249 zł
                        </p>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-white/2 p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Min</p>
                          <p className="text-sm font-semibold">149 zł</p>
                        </div>
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-center">
                          <p className="text-[10px] text-emerald-400">Optimal</p>
                          <p className="text-sm font-semibold text-emerald-400">
                            189 zł
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/2 p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Max</p>
                          <p className="text-sm font-semibold">249 zł</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeTool === "email" ? (
                    <div className="rounded-xl border border-white/5 bg-white/2 p-4">
                      <p className="text-xs text-muted-foreground">Temat:</p>
                      <p className="text-sm font-medium">
                        🎧 -30% na słuchawki ANC — tylko do niedzieli!
                      </p>
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-foreground/70">Cześć!</p>
                        <p className="mt-1 text-xs text-foreground/70">
                          Mamy dla Ciebie wyjątkową ofertę na nasze bestsellery...
                        </p>
                        <div className="mt-2 inline-block rounded bg-emerald-500/30 px-3 py-1.5">
                          <span className="text-xs font-medium text-emerald-400">
                            Skorzystaj z oferty →
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 text-center text-xs text-muted-foreground"
                  >
                    ⏱ Wygenerowano w 3.2s • Bez rejestracji •{" "}
                    <Link
                      href="/register"
                      className="text-emerald-400 hover:underline"
                    >
                      Wypróbuj za darmo →
                    </Link>
                  </motion.p>
                </motion.div>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export default DemoSection
