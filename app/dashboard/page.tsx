"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react"
import toast from "react-hot-toast"

import {
  MiniAreaSpark,
  MiniBarSpark,
  MiniQualitySpark,
  PlanTierSpark,
} from "@/components/dashboard/StatMiniCharts"
import { QualityScoreRing } from "@/components/shared/QualityScoreRing"
import { useUser } from "@/hooks/useUser"
import { PLATFORMS } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Description } from "@/lib/types"
import { isProOrScale, planLabel as planLabelFromPlans } from "@/lib/plans"
import { cn, formatDate } from "@/lib/utils"

function platformEmoji(platform: string): string {
  return PLATFORMS.find((p) => p.value === platform)?.emoji ?? "📝"
}

function creditsBarColor(pct: number): string {
  if (pct < 50) return "bg-emerald-500"
  if (pct <= 80) return "bg-yellow-500"
  return "bg-red-500"
}

function formatLocalDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function last7LocalDayKeys(): string[] {
  const keys: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    keys.push(formatLocalDayKey(d))
  }
  return keys
}

function buildWeeklyActivity(
  rows: { created_at: string; quality_score: number | null }[],
  keys: string[]
): { counts: number[]; qualityTrend: number[] } {
  const m = new Map<string, { count: number; sumQ: number; qn: number }>()
  for (const k of keys) {
    m.set(k, { count: 0, sumQ: 0, qn: 0 })
  }
  for (const row of rows) {
    const d = new Date(row.created_at)
    const k = formatLocalDayKey(d)
    const b = m.get(k)
    if (!b) continue
    b.count++
    if (typeof row.quality_score === "number") {
      b.sumQ += row.quality_score
      b.qn++
    }
  }
  const counts = keys.map((k) => m.get(k)!.count)
  const dailyAvg = keys.map((k) => {
    const b = m.get(k)!
    return b.qn > 0 ? Math.round(b.sumQ / b.qn) : null
  })
  let lastQ = 0
  const qualityTrend = dailyAvg.map((v) => {
    if (v != null) lastQ = v
    return lastQ
  })
  return { counts, qualityTrend }
}

function SpotlightSurface({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mouse-x", `${e.clientX - r.left}px`)
    el.style.setProperty("--mouse-y", `${e.clientY - r.top}px`)
  }, [])

  const onLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--mouse-x", "-100px")
    el.style.setProperty("--mouse-y", "-100px")
  }, [])

  return (
    <div
      ref={ref}
      className={cn("spotlight", className)}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { user, profile, loading: userLoading } = useUser()
  const [stats, setStats] = useState({
    totalDescriptions: 0,
    avgQuality: 0,
    thisMonth: 0,
  })
  const [recentDescriptions, setRecentDescriptions] = useState<Description[]>(
    []
  )
  const [statsLoading, setStatsLoading] = useState(true)
  const [hasBrandVoice, setHasBrandVoice] = useState(false)
  const [weeklyActivity, setWeeklyActivity] = useState<{
    counts: number[]
    qualityTrend: number[]
  }>(() => ({
    counts: [0, 0, 0, 0, 0, 0, 0],
    qualityTrend: [0, 0, 0, 0, 0, 0, 0],
  }))

  useEffect(() => {
    const justOnboarded = sessionStorage.getItem("justOnboarded")
    if (!justOnboarded && profile?.onboarding_completed) {
      const createdAt = new Date(profile.created_at)
      const now = new Date()
      const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60

      if (diffMinutes < 60) {
        sessionStorage.setItem("justOnboarded", "true")
        setTimeout(() => {
          toast.success(
            "🎉 Wszystko gotowe! Wygeneruj swój pierwszy opis.",
            { duration: 5000 }
          )
        }, 500)
      }
    }
  }, [profile])

  useEffect(() => {
    if (
      stats.totalDescriptions !== 10 &&
      stats.totalDescriptions !== 50 &&
      stats.totalDescriptions !== 100
    ) {
      return
    }
    const key = `celebrated-${stats.totalDescriptions}`
    const justCelebrated = sessionStorage.getItem(key)
    if (justCelebrated) return
    sessionStorage.setItem(key, "true")
    void import("canvas-confetti").then((confetti) => {
      confetti.default({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    })
    toast.success(
      `🎉 Brawo! ${stats.totalDescriptions} opisów wygenerowanych!`,
      { duration: 5000 }
    )
  }, [stats.totalDescriptions])

  const creditsUsed = profile?.credits_used ?? 0
  const creditsLimit = profile?.credits_limit ?? 5
  const plan = profile?.plan ?? "free"
  const safeLimit = Math.max(creditsLimit, 1)
  const creditsPct = (creditsUsed / safeLimit) * 100
  const creditsBarClass = creditsBarColor(creditsPct)
  const creditsRemaining = creditsLimit - creditsUsed

  useEffect(() => {
    if (userLoading || !user) {
      return
    }

    const userId = user.id
    let cancelled = false

    async function load() {
      setStatsLoading(true)
      const supabase = createClient()

      const startOfMonth = new Date()
      startOfMonth.setUTCDate(1)
      startOfMonth.setUTCHours(0, 0, 0, 0)

      const { count: monthCount, error: monthError } = await supabase
        .from("descriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString())

      if (monthError) {
        console.error("Descriptions month count:", monthError)
      }

      const { data: recent, count, error: recentError } = await supabase
        .from("descriptions")
        .select(
          "id, quality_score, product_name, platform, created_at",
          { count: "exact" }
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (recentError) {
        console.error("Descriptions fetch:", recentError)
      }

      const { data: scoreRows, error: scoresError } = await supabase
        .from("descriptions")
        .select("quality_score")
        .eq("user_id", userId)

      if (scoresError) {
        console.error("Quality scores fetch:", scoresError)
      }

      const dayKeys = last7LocalDayKeys()
      const weekStart = new Date()
      weekStart.setHours(0, 0, 0, 0)
      weekStart.setDate(weekStart.getDate() - 6)

      const { data: weekRows, error: weekError } = await supabase
        .from("descriptions")
        .select("created_at, quality_score")
        .eq("user_id", userId)
        .gte("created_at", weekStart.toISOString())

      if (weekError) {
        console.error("Weekly activity fetch:", weekError)
      }

      const weekly = buildWeeklyActivity(
        (weekRows ?? []) as {
          created_at: string
          quality_score: number | null
        }[],
        dayKeys
      )

      const { data: existingBrandVoice, error: brandVoiceError } = await supabase
        .from("brand_voices")
        .select("id, sample_descriptions, detected_tone")
        .eq("user_id", userId)
        .maybeSingle()

      if (brandVoiceError) {
        console.error("Brand voice fetch:", brandVoiceError)
      }

      let avgQuality = 0
      if (scoreRows?.length) {
        const nums = scoreRows
          .map((r) => r.quality_score)
          .filter((n): n is number => typeof n === "number")
        if (nums.length > 0) {
          avgQuality = Math.round(
            nums.reduce((a, b) => a + b, 0) / nums.length
          )
        }
      }

      if (!cancelled) {
        setStats({
          totalDescriptions: count ?? 0,
          avgQuality,
          thisMonth: monthCount ?? 0,
        })
        setRecentDescriptions((recent ?? []) as Description[])
        const bv = existingBrandVoice as {
          sample_descriptions?: string[] | null
          detected_tone?: string | null
        } | null
        const hasSamples =
          Array.isArray(bv?.sample_descriptions) &&
          bv.sample_descriptions.some((s) => String(s).trim().length > 0)
        setHasBrandVoice(
          Boolean(
            bv &&
              (hasSamples || Boolean(bv.detected_tone?.trim()))
          )
        )
        setWeeklyActivity(weekly)
        setStatsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userLoading, user])

  const firstName =
    profile?.full_name?.split(" ").filter(Boolean)[0] ?? "Użytkownik"

  const planLabel = planLabelFromPlans(plan)

  if (userLoading || !user) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Witaj, {firstName}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Oto podsumowanie Twojego konta
          </p>
        </div>
        <Link
          href="/dashboard/generate"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25"
        >
          ✨ Generuj nowy opis
        </Link>
      </div>

      {statsLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
            aria-hidden
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SpotlightSurface
              className={cn(
                "premium-card gradient-border stagger-item rounded-2xl p-5",
                "animate-fade-in"
              )}
              style={{ animationDelay: "0s" }}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/20 to-emerald-500/5 text-xl">
                  📝
                </div>
                <MiniAreaSpark
                  values={weeklyActivity.counts}
                  tone="emerald"
                  ariaLabel="Trend: liczba wygenerowanych opisów w ostatnich 7 dniach"
                  className="opacity-95"
                />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-bold text-foreground">
                  <span
                    key={`td-${stats.totalDescriptions}`}
                    className="animate-count-up inline-block"
                    style={{ animationDelay: "0s" }}
                  >
                    {stats.totalDescriptions}
                  </span>
                </p>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  7 dni
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Wygenerowane opisy
              </p>
              <p className="mt-2 text-xs">
                {stats.thisMonth > 0 ? (
                  <span className="text-emerald-400">
                    ↑ {stats.thisMonth} w tym miesiącu
                  </span>
                ) : stats.totalDescriptions > 0 ? (
                  <span className="text-emerald-400">
                    ↑ Twój katalog rośnie
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Zacznij generować →
                  </span>
                )}
              </p>
            </SpotlightSurface>

            <SpotlightSurface
              className={cn(
                "premium-card gradient-border stagger-item rounded-2xl p-5",
                "animate-fade-in"
              )}
              style={{ animationDelay: "0.08s" }}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-yellow-500/25 to-yellow-500/5 text-xl">
                  ⚡
                </div>
                <MiniBarSpark
                  values={weeklyActivity.counts}
                  tone="amber"
                  ariaLabel="Intensywność generacji w ostatnich 7 dniach (ok. zużycia kredytów)"
                  className="opacity-95"
                />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-bold text-foreground">
                  <span
                    key={`cr-${creditsRemaining}`}
                    className="animate-count-up inline-block"
                    style={{ animationDelay: "0.1s" }}
                  >
                    {creditsRemaining}
                  </span>
                </p>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  7 dni
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pozostałe kredyty
              </p>
              <div className="mt-3 h-2 w-full rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${creditsBarClass}`}
                  style={{
                    width: `${Math.min(100, (creditsUsed / safeLimit) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {creditsRemaining > 0
                  ? "↑ Wykorzystuj mądrze limity"
                  : "Limit wyczerpany — zobacz plan w ustawieniach"}
              </p>
            </SpotlightSurface>

            <SpotlightSurface
              className={cn(
                "premium-card gradient-border stagger-item rounded-2xl p-5",
                "animate-fade-in"
              )}
              style={{ animationDelay: "0.16s" }}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500/25 to-blue-500/5 text-xl">
                  📊
                </div>
                {stats.totalDescriptions > 0 ? (
                  <MiniQualitySpark
                    values={weeklyActivity.qualityTrend}
                    ariaLabel="Trend średniego Quality Score w ostatnich 7 dniach"
                    className="opacity-95"
                  />
                ) : (
                  <div
                    className="flex h-11 w-27 items-center justify-center rounded-lg border border-dashed border-muted-foreground/20 text-[10px] text-muted-foreground/60"
                    role="img"
                    aria-label="Brak danych jakości — wygeneruj pierwszy opis"
                  >
                    —
                  </div>
                )}
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-bold text-foreground">
                  {stats.avgQuality ? (
                    <span
                      key={`aq-${stats.avgQuality}`}
                      className="animate-count-up inline-block"
                      style={{ animationDelay: "0.2s" }}
                    >
                      {stats.avgQuality}
                    </span>
                  ) : (
                    "—"
                  )}
                </p>
                {stats.totalDescriptions > 0 ? (
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    0–100
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Średnia jakość
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.avgQuality >= 80
                  ? "↑ Świetna jakość! 🎉"
                  : "Cel: 80+"}
              </p>
            </SpotlightSurface>

            <SpotlightSurface
              className={cn(
                "premium-card gradient-border stagger-item rounded-2xl p-5",
                "animate-fade-in"
              )}
              style={{ animationDelay: "0.24s" }}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-purple-500/25 to-purple-500/5 text-xl">
                  👑
                </div>
                <PlanTierSpark
                  plan={
                    plan === "scale"
                      ? "scale"
                      : plan === "starter"
                        ? "starter"
                        : plan === "pro"
                          ? "pro"
                          : "free"
                  }
                />
              </div>
              <p className="text-2xl font-bold capitalize text-foreground">
                {planLabel}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Twój plan</p>
              {plan !== "scale" ? (
                <p className="mt-2 text-xs">
                  <Link
                    href="/dashboard/settings"
                    className="text-emerald-400 hover:underline"
                  >
                    ↑ Upgrade →
                  </Link>
                </p>
              ) : (
                <p className="mt-2 text-xs text-emerald-400">Pełen pakiet ✓</p>
              )}
            </SpotlightSurface>
          </div>

          <section className="stagger-item mt-8 animate-fade-in" style={{ animationDelay: "0.28s" }}>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Szybki start
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link
                href="/dashboard/generate?mode=form"
                className="stagger-item block animate-fade-in"
                style={{ animationDelay: "0.32s" }}
              >
                <SpotlightSurface className="premium-card group relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-6">
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative z-1">
                    <span className="mb-4 block text-4xl transition-transform duration-300 group-hover:-translate-y-1">
                      📝
                    </span>
                    <p className="font-medium text-foreground transition-colors group-hover:text-emerald-400">
                      Generuj z formularza{" "}
                      <span className="inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Wpisz dane produktu
                    </p>
                  </div>
                </SpotlightSurface>
              </Link>

              <Link
                href="/dashboard/generate?mode=image"
                className="stagger-item block animate-fade-in"
                style={{ animationDelay: "0.4s" }}
              >
                <SpotlightSurface className="premium-card group relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-6">
                  {plan === "free" ? (
                    <span className="absolute top-3 right-3 z-10 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                      Starter+
                    </span>
                  ) : null}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative z-1">
                    <span className="mb-4 block text-4xl transition-transform duration-300 group-hover:-translate-y-1">
                      📸
                    </span>
                    <p className="font-medium text-foreground transition-colors group-hover:text-emerald-400">
                      Generuj ze zdjęcia{" "}
                      <span className="inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Wrzuć zdjęcie produktu
                    </p>
                  </div>
                </SpotlightSurface>
              </Link>

              <Link
                href="/dashboard/generate?mode=url"
                className="stagger-item block animate-fade-in"
                style={{ animationDelay: "0.48s" }}
              >
                <SpotlightSurface className="premium-card group relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-6">
                  {!isProOrScale(plan) ? (
                    <span className="absolute top-3 right-3 z-10 rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                      Pro
                    </span>
                  ) : null}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative z-1">
                    <span className="mb-4 block text-4xl transition-transform duration-300 group-hover:-translate-y-1">
                      🔍
                    </span>
                    <p className="font-medium text-foreground transition-colors group-hover:text-emerald-400">
                      Analizuj konkurencję{" "}
                      <span className="inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Wklej URL konkurenta
                    </p>
                  </div>
                </SpotlightSurface>
              </Link>
            </div>
          </section>

          <section className="stagger-item mt-8 animate-fade-in" style={{ animationDelay: "0.52s" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Ostatnie opisy
              </h2>
              <Link
                href="/dashboard/descriptions"
                className="text-sm text-emerald-400 hover:underline"
              >
                Zobacz wszystkie →
              </Link>
            </div>

            {recentDescriptions.length === 0 ? (
              <div className="premium-card gradient-border rounded-2xl border border-dashed border-border/40 p-8 text-center">
                <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl"
                    aria-hidden
                  />
                  <span className="relative float text-6xl" aria-hidden>
                    ✨
                  </span>
                  <span className="absolute -right-1 -bottom-1 text-4xl" aria-hidden>
                    📝
                  </span>
                </div>
                <p className="text-lg font-medium text-foreground">
                  Jeszcze tu pusto
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nie masz jeszcze żadnych opisów — zacznij od jednego kliknięcia.
                </p>
                <Link
                  href="/dashboard/generate"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-600"
                >
                  Wygeneruj pierwszy opis →
                </Link>
                <div className="mx-auto mt-8 max-w-sm space-y-3 text-left">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Checklista startu
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                        stats.totalDescriptions > 0
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                          : "border-muted-foreground/35 bg-transparent"
                      }`}
                      aria-hidden
                    >
                      {stats.totalDescriptions > 0 ? "✓" : ""}
                    </span>
                    <span className="text-sm text-foreground">
                      Wygeneruj pierwszy opis
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                        hasBrandVoice
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                          : "border-muted-foreground/35 bg-transparent"
                      }`}
                      aria-hidden
                    >
                      {hasBrandVoice ? "✓" : ""}
                    </span>
                    <span className="text-sm text-foreground">
                      Skonfiguruj Brand Voice
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                        stats.totalDescriptions >= 3
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                          : "border-muted-foreground/35 bg-transparent"
                      }`}
                      aria-hidden
                    >
                      {stats.totalDescriptions >= 3 ? "✓" : ""}
                    </span>
                    <span className="text-sm text-foreground">
                      Wygeneruj 3 opisy
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDescriptions.map((desc, index) => {
                  const score = desc.quality_score ?? 0
                  return (
                    <SpotlightSurface
                      key={desc.id}
                      className="premium-card stagger-item flex items-center justify-between rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-emerald-500/20"
                      style={{ animationDelay: `${index * 0.08}s` }}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="text-lg">
                          {platformEmoji(desc.platform)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {desc.product_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(desc.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <QualityScoreRing score={score} />
                      </div>
                    </SpotlightSurface>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
