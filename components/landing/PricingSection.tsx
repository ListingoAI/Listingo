"use client"

import { motion } from "framer-motion"
import { CircleHelp } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { fadeSlideUp } from "@/lib/landing-motion"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type FeatureRow = { ok: boolean; text: string; tooltip?: string }

const starterFeatures: FeatureRow[] = [
  { ok: true, text: "5 opisów AI miesięcznie" },
  { ok: true, text: "1 platforma" },
  {
    ok: true,
    text: "Quality Score",
    tooltip:
      "Ocena 0–100 za SEO, czytelność i siłę sprzedaży. Dostajesz też krótkie wskazówki, co poprawić, żeby listing lepiej konwertował.",
  },
  {
    ok: true,
    text: "AI Price Advisor",
    tooltip:
      "Sugestia ceny na podstawie Twoich danych i typowych widełek rynkowych — punkt wyjścia do decyzji, nie gwarancja „jedynej słusznej” kwoty.",
  },
  { ok: false, text: "Social Media Generator" },
  { ok: false, text: "Brand Voice" },
  { ok: false, text: "Multi-language" },
]

const growthFeatures: FeatureRow[] = [
  { ok: true, text: "100 opisów AI" },
  { ok: true, text: "Wszystkie platformy" },
  {
    ok: true,
    text: "📱 Social Media Generator",
    tooltip:
      "Gotowe posty (np. pod Instagram) z hashtagami i wezwaniem do działania, spójne z produktem i — przy włączonym Brand Voice — z tonem marki.",
  },
  {
    ok: true,
    text: "💰 AI Price Advisor",
    tooltip:
      "Sugestia ceny na podstawie Twoich danych i typowych widełek rynkowych — punkt wyjścia do decyzji, nie gwarancja „jedynej słusznej” kwoty.",
  },
  {
    ok: true,
    text: "🎨 Brand Voice",
    tooltip:
      "Profil stylu marki: podajesz przykładowe opisy, a AI uczy się Twojego tonu, słownictwa i długości zdań i stosuje to w kolejnych treściach.",
  },
  {
    ok: true,
    text: "Quality Score + porady",
    tooltip:
      "Ocena 0–100 (SEO, czytelność, sprzedażowość) plus konkretne porady, co dopracować w tytule, bulletach i opisie.",
  },
  {
    ok: true,
    text: "📸 Generowanie ze zdjęć",
    tooltip:
      "Wrzucasz zdjęcie produktu (JPG, PNG, WebP); model rozpoznaje widoczne cechy i na tej podstawie buduje opis.",
  },
  {
    ok: true,
    text: "Historia opisów",
    tooltip:
      "Wygenerowane wersje zapisujemy w koncie — możesz wrócić, porównać wersje i kopiować bez ponownego generowania.",
  },
  {
    ok: false,
    text: "Multi-language",
    tooltip:
      "Opisy i tłumaczenia w kilku językach (np. PL, EN, DE) przy zachowaniu struktury pod dany marketplace.",
  },
  {
    ok: false,
    text: "Analiza konkurencji",
    tooltip:
      "Podgląd tego, jak podobne produkty opisują inni — słowa kluczowe, długość, format — żeby wyjść ponad szablon.",
  },
]

const scaleFeatures: FeatureRow[] = [
  { ok: true, text: "Nielimitowane opisy" },
  {
    ok: true,
    text: "Wszystko z Growth",
    tooltip:
      "Wszystkie funkcje z planu Growth: m.in. social, Brand Voice, generowanie ze zdjęć, Quality Score z poradami, historia opisów i wszystkie platformy.",
  },
  {
    ok: true,
    text: "🔍 Analiza konkurencji",
    tooltip:
      "Podgląd tego, jak podobne produkty opisują inni — słowa kluczowe, długość, format — żeby wyjść ponad szablon.",
  },
  {
    ok: true,
    text: "🌍 Multi-language (PL+EN+DE)",
    tooltip:
      "Generowanie lub tłumaczenie treści w wielu językach z myślą o zagranicznych marketplace’ach i spójności marki.",
  },
  {
    ok: true,
    text: "📦 Bulk mode CSV",
    tooltip:
      "Importujesz CSV z listą produktów (nazwa, cechy); dostajesz zbiór gotowych opisów do eksportu z powrotem do sklepu lub marketplace.",
  },
  {
    ok: true,
    text: "📧 Email Campaign Builder",
    tooltip:
      "Szkice maili (promocja, newsletter, przypomnienie) na podstawie produktu i kampanii — do dopracowania i wysyłki z Twojego narzędzia.",
  },
  {
    ok: true,
    text: "API dostęp",
    tooltip:
      "Dostęp programowy do generowania (HTTP API) — pod integrację z własnym sklepem, ERP lub wewnętrznymi narzędziami.",
  },
  { ok: true, text: "Priorytetowe wsparcie" },
]

/** Tooltips dla pozycji współdzielonych między planami (np. Brand Voice na Starterze jako „brak”). */
const EXTRA_TOOLTIPS: Record<string, string> = {
  "Social Media Generator":
    "Generator postów pod social media (hashtagi, CTA) zamiast ręcznego wymyślania każdej publikacji.",
  "Brand Voice":
    "Profil stylu marki: podajesz przykładowe opisy, a AI uczy się Twojego tonu i stosuje go w kolejnych treściach.",
  "Multi-language":
    "Opisy i tłumaczenia w kilku językach (np. PL, EN, DE) przy zachowaniu struktury pod dany marketplace.",
}

function featureTooltip(item: FeatureRow): string | undefined {
  return item.tooltip ?? EXTRA_TOOLTIPS[item.text]
}

function FeatureList({ items }: { items: FeatureRow[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const tip = featureTooltip(item)
        const label = (
          <span
            className={
              item.ok ? "text-foreground" : "text-muted-foreground/50 line-through"
            }
          >
            {item.text}
          </span>
        )
        return (
          <li key={item.text} className="flex items-start gap-2 text-sm">
            {item.ok ? (
              <span className="shrink-0 text-emerald-400">✓</span>
            ) : (
              <span className="shrink-0 text-muted-foreground/50">✗</span>
            )}
            <span className="flex min-w-0 flex-1 items-start gap-1.5">
              {label}
              {tip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/70 transition-colors hover:border-emerald-500/35 hover:bg-emerald-500/10 hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none"
                      aria-label={`Co to jest: ${item.text}`}
                    >
                      <CircleHelp className="size-3" strokeWidth={2} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="max-w-[min(20rem,calc(100vw-2rem))] text-left leading-snug"
                  >
                    {tip}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false)
  const [productCount, setProductCount] = useState("100")
  const [minutesPerDesc, setMinutesPerDesc] = useState("20")

  const { hoursSaved, zlSaved } = useMemo(() => {
    const pc = Math.max(1, Number.parseInt(productCount, 10) || 1)
    const min = Math.max(1, Number.parseInt(minutesPerDesc, 10) || 1)
    const hours = (pc * min) / 60
    return {
      hoursSaved: Math.round(hours),
      zlSaved: Math.round(hours * 50),
    }
  }, [productCount, minutesPerDesc])

  return (
    <section id="cennik" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeSlideUp} className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            CENNIK
          </p>
          <h2 className="mt-4 text-3xl font-bold text-foreground md:text-5xl">
            Inwestycja, nie koszt.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Jeden opis od copywritera = 15-30 zł. U nas od 0,99 zł. Policz ile
            oszczędzasz.
          </p>
        </motion.div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-3">
            <span
              className={`text-sm ${!isYearly ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              Miesięcznie
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              aria-label="Przełącz rozliczenie roczne"
            />
            <span
              className={`text-sm ${isYearly ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              Rocznie
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
              oszczędź 20%
            </span>
          </div>
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="mx-auto mt-12 max-w-5xl px-1 md:px-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch md:gap-5">
            {/* Starter */}
            <motion.div
              {...fadeSlideUp}
              transition={{ ...fadeSlideUp.transition, delay: 0 }}
              className="landing-card-lift flex flex-col rounded-3xl border border-white/6 bg-card/30 p-8 md:min-h-0"
            >
              <p className="text-lg font-semibold text-foreground">Starter</p>
              <p className="text-xs text-muted-foreground">Na start</p>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-4xl font-bold text-foreground">0 zł</span>
                <span className="text-sm text-muted-foreground">/na zawsze</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Wypróbuj bez ryzyka
              </p>
              <Separator className="my-6 bg-border/50" />
              <FeatureList items={starterFeatures} />
              <Link
                href="/register"
                className="mt-auto block w-full rounded-xl border border-border px-6 py-3 text-center font-medium text-foreground transition-all hover:border-emerald-500/50"
              >
                Zacznij za darmo
              </Link>
            </motion.div>

            {/* Growth — wyróżniony */}
            <motion.div
              {...fadeSlideUp}
              transition={{ ...fadeSlideUp.transition, delay: 0.08 }}
              className="relative z-10 md:-my-3 md:scale-[1.045]"
            >
              <div
                className="pointer-events-none absolute -inset-3 -z-20 rounded-[1.4rem] bg-emerald-500/20 blur-2xl md:-inset-4 md:blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -inset-px -z-10 rounded-3xl bg-linear-to-b from-emerald-400/35 via-emerald-500/12 to-transparent opacity-90 blur-md"
                aria-hidden
              />
              <div
                className="landing-card-lift relative flex min-h-full flex-col rounded-3xl border-2 border-emerald-400/70 bg-linear-to-b from-emerald-500/15 via-emerald-500/6 to-card/90 p-9 shadow-[0_0_0_1px_rgba(52,211,153,0.25),0_8px_40px_-8px_rgba(16,185,129,0.35),0_24px_80px_-20px_rgba(16,185,129,0.28)] md:p-10"
              >
                <span className="pricing-popular-badge absolute -top-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-400 px-5 py-1.5 text-[11px] font-bold tracking-wide text-black shadow-lg shadow-emerald-500/40 md:px-6 md:text-xs">
                  NAJCZĘŚCIEJ WYBIERANY
                </span>
                <p className="text-lg font-semibold text-foreground">Growth</p>
                <p className="text-xs text-emerald-400">
                  Dla aktywnych sprzedawców
                </p>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {isYearly ? (
                    <>
                      <span className="text-4xl font-bold text-emerald-300 md:text-5xl">
                        79 zł
                      </span>
                      <span className="text-sm text-muted-foreground">/mies</span>
                      <span className="ml-1 text-lg text-muted-foreground line-through decoration-muted-foreground/60">
                        99 zł
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-emerald-300 md:text-5xl">
                        99 zł
                      </span>
                      <span className="text-sm text-muted-foreground">/mies</span>
                    </>
                  )}
                </div>
                <Separator className="my-6 bg-emerald-400/25" />
                <FeatureList items={growthFeatures} />
                <Link
                  href="/register"
                  className="cta-primary-shimmer mt-auto block w-full rounded-xl bg-emerald-500 px-6 py-3.5 text-center text-base font-bold text-black shadow-lg shadow-emerald-500/45 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/55"
                >
                  <span>Zacznij z Growth →</span>
                </Link>
              </div>
            </motion.div>

            {/* Scale */}
            <motion.div
              {...fadeSlideUp}
              transition={{ ...fadeSlideUp.transition, delay: 0.16 }}
              className="landing-card-lift flex flex-col rounded-3xl border border-white/6 bg-card/30 p-8 md:min-h-0"
            >
              <p className="text-lg font-semibold text-foreground">Scale</p>
              <p className="text-xs text-muted-foreground">
                Dla poważnych biznesów
              </p>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {isYearly ? (
                  <>
                    <span className="text-4xl font-bold text-foreground">
                      199 zł
                    </span>
                    <span className="text-sm text-muted-foreground">/mies</span>
                    <span className="ml-1 text-lg text-muted-foreground line-through decoration-muted-foreground/60">
                      249 zł
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-foreground">
                      249 zł
                    </span>
                    <span className="text-sm text-muted-foreground">/mies</span>
                  </>
                )}
              </div>
              <Separator className="my-6 bg-border/50" />
              <FeatureList items={scaleFeatures} />
              <Link
                href="/register"
                className="mt-auto block w-full rounded-xl border border-border px-6 py-3 text-center font-medium text-foreground transition-all hover:border-emerald-500/50"
              >
                Zacznij ze Scale →
              </Link>
            </motion.div>
            </div>
          </div>
        </TooltipProvider>

        <motion.div
          {...fadeSlideUp}
          transition={{ ...fadeSlideUp.transition, delay: 0.06 }}
          className="landing-card-lift mx-auto mt-16 max-w-2xl rounded-3xl border border-white/6 bg-card/30 p-8"
        >
          <h3 className="text-center text-lg font-bold text-foreground">
            💰 Policz ile oszczędzasz
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="productCount">Ile produktów masz?</Label>
              <Input
                id="productCount"
                type="number"
                min={1}
                value={productCount}
                onChange={(e) => setProductCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutesPerDesc">Ile minut na jeden opis?</Label>
              <Input
                id="minutesPerDesc"
                type="number"
                min={1}
                value={minutesPerDesc}
                onChange={(e) => setMinutesPerDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">Oszczędzasz</p>
            <p className="text-3xl font-bold text-emerald-400">
              ~{hoursSaved} godzin
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              co równa się ~{zlSaved} zł oszczędności
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              (zakładając koszt godziny pracy 50 zł)
            </p>
          </div>
        </motion.div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
            <span aria-hidden>🛡️</span>
            <span className="text-sm text-emerald-400">
              14-dniowa gwarancja zwrotu pieniędzy
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PricingSection
