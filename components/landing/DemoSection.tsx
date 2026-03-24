"use client"

import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import { fadeSlideUp } from "@/lib/landing-motion"
import { cn } from "@/lib/utils"

type ActiveTool = "opis" | "social" | "cena" | "email"

const STEP_MESSAGES: Record<number, string> = {
  1: "Analizuję produkt…",
  2: "Optymalizuję pod SEO…",
  3: "Generuję treść…",
  4: "Obliczam Quality Score…",
}

/* ── inline SVG icons ── */
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
function IcoMail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect stroke="currentColor" x="2" y="4" width="16" height="12" rx="2" />
      <polyline stroke="currentColor" points="2 7 10 12 18 7" />
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
function IcoSpark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path stroke="currentColor" d="M10 2v4M10 14v4M2 10h4M14 10h4M4.93 4.93l2.83 2.83M12.24 12.24l2.83 2.83M4.93 15.07l2.83-2.83M12.24 7.76l2.83-2.83" />
    </svg>
  )
}

const TOOLS: { id: ActiveTool; Icon: React.FC<{ className?: string }>; label: string; sub: string }[] = [
  { id: "opis",   Icon: IcoDoc,   label: "Opis produktu", sub: "30 sek" },
  { id: "social", Icon: IcoPhone, label: "Post Instagram", sub: "15 sek" },
  { id: "cena",   Icon: IcoTag,   label: "Price Advisor",  sub: "5 sek" },
  { id: "email",  Icon: IcoMail,  label: "Email sprzedaż", sub: "20 sek" },
]

/* ── progress steps ── */
const STEPS = Object.values(STEP_MESSAGES)

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

  useEffect(() => () => clearAnimationTimeouts(), [clearAnimationTimeouts])

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
    push(() => setDemoStep(2), 900)
    push(() => setDemoStep(3), 1800)
    push(() => setDemoStep(4), 2700)
    push(() => { setGeneratingDemo(false); setDemoResult(true) }, 3500)
  }, [generatingDemo, clearAnimationTimeouts])

  return (
    <section id="jak-dziala" className="relative px-6 py-32">
      {/* faint grid bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "48px 48px" }}
        aria-hidden
      />

      <motion.div {...fadeSlideUp} className="mx-auto mb-16 max-w-3xl text-center">
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
        className="mx-auto max-w-4xl"
      >
        {/* Browser chrome */}
        <div className="landing-card-lift overflow-hidden rounded-3xl border border-white/8 bg-card/60 shadow-[0_40px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {/* Tab bar */}
          <div className="flex h-11 items-center gap-3 border-b border-white/5 bg-card/80 px-5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <div className="flex flex-1 justify-center">
              <span className="flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/4 px-3 py-1 font-mono text-[11px] text-muted-foreground/60">
                <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden>
                  <circle stroke="currentColor" strokeWidth="1" cx="6" cy="6" r="4" />
                  <path stroke="currentColor" strokeWidth="1" d="M6 2v2M6 8v2M2 6h2M8 6h2" />
                </svg>
                listingo.pl/dashboard
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
            {/* ── LEFT PANEL ── */}
            <div className="space-y-5 border-white/5 p-6 md:border-r">
              {/* Step 1 */}
              <div>
                <h3 className="mb-3.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-[10px] font-bold text-emerald-400">1</span>
                  Wybierz narzędzie
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
                            ? "border-emerald-500/50 bg-emerald-500/8"
                            : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5",
                          generatingDemo && "pointer-events-none opacity-50"
                        )}
                      >
                        {active && (
                          <motion.div
                            layoutId="tool-glow"
                            className="pointer-events-none absolute inset-0 rounded-xl bg-emerald-500/5"
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            aria-hidden
                          />
                        )}
                        <div className={cn("relative flex h-7 w-7 items-center justify-center rounded-lg border transition-colors", active ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : "border-white/8 bg-white/5 text-muted-foreground/60")}>
                          <t.Icon className="h-4 w-4" />
                        </div>
                        <span className={cn("relative text-[11px] font-semibold leading-tight", active ? "text-foreground" : "text-foreground/70")}>
                          {t.label}
                        </span>
                        <span className="relative text-[10px] text-muted-foreground/50">{t.sub}</span>
                        {active && (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                            <IcoCheck className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Step 2 */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-[10px] font-bold text-emerald-400">2</span>
                  Wpisz produkt
                </h3>
                <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-sm text-foreground/80">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" aria-hidden>
                    <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M2 8h4m4 0h4M8 4v4m0 0v4" />
                  </svg>
                  Bezprzewodowe słuchawki ANC z etui
                </div>
              </div>

              <button
                type="button"
                onClick={startAnimation}
                disabled={generatingDemo}
                className="relative w-full overflow-hidden rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingDemo ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" aria-hidden />
                    Generuję…
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <IcoSpark className="h-4 w-4" />
                    Generuj
                  </span>
                )}
              </button>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="relative min-h-80 p-6">
              <h3 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-[10px] font-bold text-emerald-400">3</span>
                Wynik
              </h3>

              <AnimatePresence mode="wait">
                {/* Idle */}
                {!generatingDemo && !demoResult && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-52 flex-col items-center justify-center gap-3"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/3 text-muted-foreground/25">
                      <IcoSpark className="h-6 w-6" />
                    </div>
                    <p className="text-sm text-muted-foreground/40">Kliknij „Generuj" żeby zobaczyć wynik</p>
                  </motion.div>
                )}

                {/* Generating */}
                {generatingDemo && (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {STEPS.map((msg, idx) => {
                      const stepNum = idx + 1
                      const done = demoStep > stepNum
                      const active = demoStep === stepNum
                      return (
                        <motion.div
                          key={msg}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: done || active ? 1 : 0.3, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="flex items-center gap-2.5 text-sm"
                        >
                          <span className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                            done ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400" : active ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/3 text-muted-foreground/30"
                          )}>
                            {done ? (
                              <IcoCheck className="h-3 w-3 text-emerald-400" />
                            ) : active ? (
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            ) : (
                              <span className="h-1 w-1 rounded-full bg-white/20" />
                            )}
                          </span>
                          <span className={cn(active ? "text-foreground" : done ? "text-muted-foreground/60 line-through" : "text-muted-foreground/30")}>
                            {msg}
                          </span>
                        </motion.div>
                      )
                    })}
                    {/* Animated progress bar */}
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={{ width: "0%" }}
                        animate={{ width: `${(demoStep / 4) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Result */}
                {demoResult && !generatingDemo && (
                  <motion.div
                    key={`result-${activeTool}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-4"
                  >
                    {/* ── opis ── */}
                    {activeTool === "opis" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Quality Score</span>
                          <span className="text-sm font-bold text-emerald-400">92 / 100</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <motion.div
                            className="h-full rounded-full bg-linear-to-r from-emerald-600 to-emerald-400"
                            initial={{ width: 0 }}
                            animate={{ width: "92%" }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                        <div className="rounded-xl border border-white/6 bg-white/3 p-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Tytuł SEO</p>
                          <p className="text-sm font-medium leading-snug">
                            Słuchawki Bezprzewodowe ANC z Redukcją Szumów | 40h Bateria
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/6 bg-white/3 p-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Opis</p>
                          <p className="text-xs leading-relaxed text-foreground/75">
                            Odkryj nowy poziom dźwięku dzięki aktywnej redukcji szumów ANC. Do 40 godzin słuchania na jednym ładowaniu…
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {["słuchawki ANC", "bezprzewodowe", "bluetooth", "40h"].map((tag) => (
                            <span key={tag} className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/15">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── social ── */}
                    {activeTool === "social" && (
                      <div className="overflow-hidden rounded-xl border border-white/8 bg-white/2">
                        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
                          <div className="h-6 w-6 rounded-full bg-linear-to-br from-purple-500 to-pink-500 shrink-0" />
                          <div>
                            <p className="text-[11px] font-semibold">twojsklep</p>
                            <p className="text-[9px] text-muted-foreground">Instagram</p>
                          </div>
                          <svg viewBox="0 0 24 24" fill="none" className="ml-auto h-4 w-4 text-muted-foreground/40" aria-hidden>
                            <rect stroke="currentColor" strokeWidth="1.5" x="2" y="2" width="20" height="20" rx="5" />
                            <circle stroke="currentColor" strokeWidth="1.5" cx="12" cy="12" r="4" />
                            <circle fill="currentColor" stroke="none" cx="17.5" cy="6.5" r="1.2" />
                          </svg>
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-xs leading-relaxed text-foreground/85">
                            Cisza w miejskim chaosie? To możliwe. Nasze słuchawki ANC z 40h baterią to game changer dla każdego, kto ceni skupienie. Link w bio.
                          </p>
                          <p className="text-[10px] leading-relaxed text-emerald-400/90">
                            #słuchawki #ANC #muzyka #technologia #bezprzewodowe
                          </p>
                          <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground/50">
                            <span className="flex items-center gap-1">
                              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden><path stroke="currentColor" strokeWidth="1.5" d="M8 13.5S2 9.5 2 5.5A4 4 0 0 1 8 3a4 4 0 0 1 6 2.5C14 9.5 8 13.5 8 13.5z" /></svg>
                              Polub
                            </span>
                            <span className="flex items-center gap-1">
                              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden><path stroke="currentColor" strokeWidth="1.5" d="M14 9a2 2 0 0 1-2 2H5l-3 3V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" /></svg>
                              Komentuj
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── cena ── */}
                    {activeTool === "cena" && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                          <p className="text-[11px] text-muted-foreground">Sugerowana cena</p>
                          <p className="mt-1 text-4xl font-bold text-emerald-400">189 zł</p>
                          <p className="mt-1 text-[11px] text-muted-foreground/70">Przedział rynkowy: 149–249 zł</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Min", value: "149 zł", active: false },
                            { label: "Optimal", value: "189 zł", active: true },
                            { label: "Max", value: "249 zł", active: false },
                          ].map((c) => (
                            <div key={c.label} className={cn("rounded-xl p-2.5 text-center border", c.active ? "border-emerald-500/25 bg-emerald-500/10" : "border-white/6 bg-white/2")}>
                              <p className={cn("text-[10px]", c.active ? "text-emerald-400" : "text-muted-foreground")}>{c.label}</p>
                              <p className={cn("mt-0.5 text-sm font-bold", c.active ? "text-emerald-400" : "text-foreground/70")}>{c.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl border border-white/6 bg-white/2 px-3 py-2.5 text-[11px] text-muted-foreground/60">
                          Analiza na podstawie 84 ofert z Allegro i Amazon
                        </div>
                      </div>
                    )}

                    {/* ── email ── */}
                    {activeTool === "email" && (
                      <div className="overflow-hidden rounded-xl border border-white/8 bg-white/2">
                        <div className="border-b border-white/5 px-3 py-2.5 space-y-1">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-muted-foreground/50 w-10 shrink-0">Od:</span>
                            <span className="font-medium">twojsklep@listingo.pl</span>
                          </div>
                          <div className="flex items-start gap-2 text-[11px]">
                            <span className="text-muted-foreground/50 w-10 shrink-0">Temat:</span>
                            <span className="font-semibold text-foreground leading-snug">-30% na słuchawki ANC — tylko do niedzieli</span>
                          </div>
                        </div>
                        <div className="p-3 space-y-2 text-xs text-foreground/70 leading-relaxed">
                          <p>Cześć,</p>
                          <p>Mamy dla Ciebie wyjątkową ofertę na nasze bestsellery z aktywną redukcją szumów…</p>
                          <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 border border-emerald-500/20">
                            <span className="text-[11px] font-semibold text-emerald-400">Skorzystaj z oferty</span>
                            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-emerald-400" aria-hidden><path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M2 6h8M6 3l3 3-3 3" /></svg>
                          </div>
                        </div>
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/2 px-3 py-2"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                        <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" aria-hidden><circle stroke="currentColor" strokeWidth="1.2" cx="7" cy="7" r="5.5" /><path stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" d="M7 4.5v3l1.5 1.5" /></svg>
                        Wygenerowano w 3.2s
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

        {/* Social proof below card */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 text-center text-xs text-muted-foreground/40"
        >
          Bez karty kredytowej · Bezpłatny plan na zawsze · Konfiguracja w 2 minuty
        </motion.p>
      </motion.div>
    </section>
  )
}

export default DemoSection
