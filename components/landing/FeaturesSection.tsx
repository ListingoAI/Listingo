"use client"

import { AnimatePresence, motion } from "framer-motion"
import type { CSSProperties } from "react"
import { useEffect, useState } from "react"

const viewport = { once: true, margin: "-40px" as const }

const cardTransition = { duration: 0.5 }

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
    <div className="relative mt-4 min-h-[5.5rem] overflow-hidden rounded-2xl border border-white/8 bg-black/25 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
        {LANG_SAMPLES.map((l, idx) => (
          <motion.span
            key={l.code}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors"
            animate={{
              borderColor:
                idx === i ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)",
              backgroundColor:
                idx === i ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
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
          <span className="shrink-0 text-lg" aria-hidden>
            {cur.flag}
          </span>
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

function InstagramPostMockup() {
  return (
    <div className="w-full max-w-[13.5rem] shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-[#0c0c0c] shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-2 border-b border-white/6 px-2.5 py-2">
        <div className="relative h-7 w-7 shrink-0 rounded-full bg-linear-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] p-[2px]">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0c0c0c] text-[10px] font-bold text-emerald-400">
            L
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold tracking-tight">
            listingo.pl
          </p>
          <p className="text-[9px] text-muted-foreground">Sponsored</p>
        </div>
        <span className="text-sm text-white/50" aria-hidden>
          ⋯
        </span>
      </div>
      <div className="relative aspect-square bg-linear-to-br from-zinc-800 via-zinc-900 to-black">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.15), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(120,80,50,0.25), transparent 45%)",
          }}
        />
        <div className="absolute inset-5 flex items-center justify-center">
          <div className="relative w-[72%] max-w-[140px] rounded-lg border border-white/10 bg-linear-to-br from-amber-950/80 via-stone-900 to-stone-950 shadow-lg shadow-black/40">
            <div className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/10" />
            <div className="flex aspect-[4/3] items-end justify-center p-2 pt-5">
              <span className="rounded-md bg-black/55 px-2 py-1 text-[8px] font-medium text-white/95 backdrop-blur-sm">
                Portfel skórzany RFID
              </span>
            </div>
          </div>
        </div>
        <div className="absolute right-2 bottom-2 rounded-full bg-black/50 px-2 py-0.5 text-[8px] text-white/80 backdrop-blur-sm">
          1/3
        </div>
      </div>
      <div className="flex items-center gap-3 px-2.5 py-2 text-[15px] leading-none">
        <span className="hover:opacity-80" aria-hidden>
          ♡
        </span>
        <span className="hover:opacity-80" aria-hidden>
          💬
        </span>
        <span className="hover:opacity-80" aria-hidden>
          ↗
        </span>
        <span className="ml-auto hover:opacity-80" aria-hidden>
          🔖
        </span>
      </div>
      <div className="space-y-1 px-2.5 pb-3">
        <p className="text-[10px] leading-snug">
          <span className="font-semibold text-foreground">listingo.pl</span>{" "}
          <span className="text-muted-foreground">
            Nowy portfel, który robi WOW od pierwszego wejrzenia 👀 Skóra
            naturalna, RFID, idealny na prezent 🎁
          </span>
        </p>
        <p className="text-[9px] text-emerald-400/90">
          #portfel #skórzany #RFID #prezent #mensstyle
        </p>
      </div>
    </div>
  )
}

export function FeaturesSection() {
  return (
    <section
      id="funkcje"
      className="relative overflow-hidden px-6 py-32"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-950/25 via-background to-background"
        aria-hidden
      />

      <div className="relative z-10 mx-auto mb-20 max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={cardTransition}
          className="text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase"
        >
          NARZĘDZIA
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.05 }}
          className="mt-4 text-3xl font-bold tracking-tight md:text-5xl"
        >
          Jeden asystent.
          <br />
          <span className="text-muted-foreground">Dziesięć supermocy.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.1 }}
          className="mt-6 text-lg text-muted-foreground/70"
        >
          Nie kolejny generator opisów. Kompletny AI sales hub.
        </motion.p>
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl auto-rows-[minmax(200px,auto)] grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 1 — DUŻA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0 }}
          className="landing-card-lift group relative min-h-88 overflow-hidden rounded-3xl border border-white/6 bg-linear-to-br from-emerald-950/50 to-card/50 p-8 transition-colors duration-300 hover:border-emerald-500/25 md:col-span-2 lg:min-h-0 lg:col-span-2 lg:row-span-2"
        >
          <motion.div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl"
            animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.05, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute bottom-24 left-6 text-4xl opacity-[0.07]"
            animate={{ y: [0, -6, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          >
            ✨
          </motion.div>
          <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
            CORE FEATURE
          </span>
          <h3 className="mt-3 text-2xl font-bold">Opisy które sprzedają</h3>
          <p className="mt-3 max-w-sm text-muted-foreground">
            Tytuł SEO, opis krótki, długi, tagi i meta — wszystko w 30
            sekund. Pod Allegro, Shopify, WooCommerce.
          </p>
          <div className="pointer-events-none absolute right-4 bottom-4 w-72 translate-x-4 translate-y-4 rounded-xl border border-white/5 bg-card/90 p-4 shadow-2xl transition-transform duration-500 group-hover:translate-x-0 group-hover:translate-y-0">
            <p className="text-xs text-muted-foreground">Quality Score</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-emerald-500">
                <span className="text-sm font-bold text-emerald-400">94</span>
              </div>
              <div>
                <p className="text-sm font-medium">Portfel męski RFID</p>
                <p className="text-xs text-emerald-400">
                  Gotowy do publikacji ✓
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2 — MAŁA zdjęcie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.06 }}
          className="landing-card-lift group flex flex-col rounded-3xl border border-white/5 bg-card/30 p-6 transition-colors duration-300 hover:border-emerald-500/25"
        >
          <h3 className="text-lg font-semibold">📸 Ze zdjęcia</h3>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            Wrzuć zdjęcie — AI rozpozna produkt i zbuduje kompletny opis.
          </p>
          <div className="relative mt-4 flex flex-1 items-center justify-center">
            <span
              className="absolute size-20 rounded-full border border-emerald-500/10"
              aria-hidden
            />
            <span
              className="absolute size-14 rounded-full border border-emerald-500/20"
              aria-hidden
            />
            <motion.span
              className="absolute -top-1 -right-1 text-lg opacity-70"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              aria-hidden
            >
              ✨
            </motion.span>
            <motion.span
              className="absolute bottom-2 left-3 text-sm opacity-50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            >
              💡
            </motion.span>
            <span
              className="absolute size-24 rounded-full border border-emerald-500/15 opacity-40"
              aria-hidden
            />
            <motion.span
              className="relative text-4xl"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              📸
            </motion.span>
          </div>
        </motion.div>

        {/* 3 — MAŁA cena */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.1 }}
          className="landing-card-lift group flex flex-col rounded-3xl border border-white/5 bg-card/30 p-6 transition-colors duration-300 hover:border-emerald-500/25"
        >
          <span className="w-fit rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400">
            NOWE
          </span>
          <h3 className="mt-2 text-lg font-bold">💰 AI Price Advisor</h3>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            AI analizuje rynek i podpowiada optymalną cenę.
          </p>
          <div className="relative mt-4 flex h-20 items-end justify-center gap-3">
            <span
              className="pointer-events-none absolute -top-1 right-2 text-[10px] opacity-30"
              aria-hidden
            >
              zł
            </span>
            {[40, 70, 100].map((h, i) => (
              <div
                key={i}
                className="features-bento-bar w-6 origin-bottom rounded-t-md bg-linear-to-t from-emerald-600 to-emerald-400"
                style={
                  {
                    "--bar-h": `${h}%`,
                    animationDelay: `${i * 0.15}s`,
                  } as CSSProperties
                }
              />
            ))}
            <motion.span
              className="absolute bottom-8 left-2 text-xs opacity-40"
              animate={{ x: [0, 3, 0], opacity: [0.25, 0.5, 0.25] }}
              transition={{ duration: 2.8, repeat: Infinity }}
              aria-hidden
            >
              📈
            </motion.span>
          </div>
        </motion.div>

        {/* 4 — SZEROKA social + email */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.14 }}
          className="landing-card-lift group flex flex-col gap-4 rounded-3xl border border-white/5 bg-card/40 p-6 transition-colors duration-300 hover:border-emerald-500/25 md:col-span-2 lg:col-span-2 md:flex-row md:items-center"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">
              📱 Posty Social Media + 📧 Emaile
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Treści pod Instagram i maile sprzedażowe z jednego miejsca.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-start justify-center gap-5 md:justify-end">
            <InstagramPostMockup />
            <div className="w-full max-w-[13.5rem] rounded-xl border border-white/8 bg-white/[0.04] p-3 shadow-inner">
              <div className="mb-2 flex items-center gap-2 border-b border-white/6 pb-2">
                <span className="text-sm" aria-hidden>
                  📧
                </span>
                <div>
                  <p className="text-[9px] font-semibold">Kampania: Portfel</p>
                  <p className="text-[8px] text-muted-foreground">
                    Otwarcia +42% vs średnia
                  </p>
                </div>
              </div>
              <div className="mb-2 h-3 w-3/4 rounded bg-emerald-500/25" />
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded bg-white/8" />
                <div className="h-2 w-[88%] rounded bg-white/6" />
                <div className="h-2 w-[65%] rounded bg-white/6" />
              </div>
              <motion.div
                className="mt-3 flex h-7 w-full items-center justify-center rounded-lg bg-emerald-500/25"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <span className="text-[9px] font-semibold text-emerald-400">
                  Kup teraz →
                </span>
              </motion.div>
              <p className="mt-2 text-center text-[8px] text-muted-foreground">
                Gotowy szablon 1 klik
              </p>
            </div>
          </div>
        </motion.div>

        {/* 5 — języki */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.18 }}
          className="landing-card-lift group flex flex-col rounded-3xl border border-white/5 bg-card/30 p-6 transition-colors duration-300 hover:border-emerald-500/25"
        >
          <h3 className="text-lg font-semibold">🌍 Multi-Language</h3>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            PL → EN, DE, CZ jednym kliknięciem — ten sam produkt, lokalny język.
          </p>
          <LanguageSwitcherMock />
        </motion.div>

        {/* 6 — A/B */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.22 }}
          className="landing-card-lift group relative flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-card/30 p-6 transition-colors duration-300 hover:border-emerald-500/25"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 80%, rgba(16,185,129,0.5), transparent 40%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.4), transparent 35%)",
            }}
            aria-hidden
          />
          <h3 className="relative text-lg font-semibold">🧪 A/B Opisy</h3>
          <p className="relative mt-2 flex-1 text-sm text-muted-foreground">
            Generuj 2 wersje → porównaj → wybierz lepszą.
          </p>
          <div className="relative z-[1] mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-center transition-transform group-hover:scale-[1.02]">
              <span className="text-[10px] font-bold text-emerald-400">A</span>
              <p className="mt-1 text-[9px] text-muted-foreground line-clamp-2">
                Krótki, dynamiczny ton...
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-center transition-transform group-hover:scale-[1.02]">
              <span className="text-[10px] font-bold text-muted-foreground">
                B
              </span>
              <p className="mt-1 text-[9px] text-muted-foreground line-clamp-2">
                Ekspercki, SEO-heavy...
              </p>
            </div>
          </div>
        </motion.div>

        {/* 7 — SZEROKA persona + trendy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.26 }}
          className="landing-card-lift group flex flex-col gap-4 rounded-3xl border border-white/5 bg-linear-to-br from-card/80 to-emerald-950/20 p-6 transition-colors duration-300 hover:border-emerald-500/25 md:col-span-2 lg:col-span-2 lg:flex-row"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">
              🎯 Buyer Persona + 📅 Trendy sezonowe
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dopasuj ton do odbiorcy i łap szczyty wyszukiwań w kalendarzu.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["👩 Mama 30-40", "👨‍💼 Biznesmen", "🧑‍🎓 Student"].map(
                (label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground"
                  >
                    {label}
                  </span>
                )
              )}
            </div>
          </div>
          <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-3 overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-4 text-xs">
            <motion.span
              className="pointer-events-none absolute -right-2 top-2 text-2xl opacity-[0.12]"
              animate={{ rotate: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            >
              📅
            </motion.span>
            <p className="relative text-muted-foreground">
              <span className="text-foreground">📅 Dzień Matki</span> → +340%
              &quot;prezent dla mamy&quot;
            </p>
            <p className="relative text-muted-foreground">
              <span className="text-foreground">🖤 Black Friday</span> → +800%
            </p>
          </div>
        </motion.div>

        {/* 8 — health gauge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...cardTransition, delay: 0.3 }}
          className="landing-card-lift group flex flex-col rounded-3xl border border-white/5 bg-card/30 p-6 transition-colors duration-300 hover:border-emerald-500/25"
        >
          <h3 className="text-lg font-semibold">📊 Listing Health</h3>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            Wklej istniejący opis → AI oceni → poprawi.
          </p>
          <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="relative z-0 h-full rounded-full bg-linear-to-r from-yellow-500 via-emerald-500 to-emerald-400"
              initial={{ width: "0%" }}
              whileInView={{ width: "78%" }}
              viewport={viewport}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            />
            <motion.div
              className="pointer-events-none absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]"
              style={{ left: "78%" }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity }}
              aria-hidden
            />
          </div>
          <p className="mt-2 text-center text-[10px] font-medium text-emerald-400">
            78% — dobry, ale da się lepiej
          </p>
          <div className="mt-3 flex justify-center gap-3 text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500/80" />
              SEO
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
              Czytelność
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500/70" />
              CTA
            </span>
          </div>
        </motion.div>
      </div>

    </section>
  )
}

export default FeaturesSection
