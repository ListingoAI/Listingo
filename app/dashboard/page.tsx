"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

import { useUser } from "@/hooks/useUser"
import { PLATFORMS } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Description } from "@/lib/types"
import { formatDate } from "@/lib/utils"

function platformEmoji(platform: string): string {
  return (
    PLATFORMS.find((p) => p.value === platform)?.emoji ?? "📝"
  )
}

function creditsBarColor(pct: number): string {
  if (pct < 50) return "bg-emerald-500"
  if (pct <= 80) return "bg-yellow-500"
  return "bg-red-500"
}

export default function DashboardPage() {
  const { user, profile, loading: userLoading } = useUser()
  const [stats, setStats] = useState({
    totalDescriptions: 0,
    avgQuality: 0,
  })
  const [recentDescriptions, setRecentDescriptions] = useState<Description[]>(
    []
  )
  const [statsLoading, setStatsLoading] = useState(true)
  const [hasBrandVoice, setHasBrandVoice] = useState(false)

  useEffect(() => {
    // Sprawdź czy to pierwsze wejście po onboardingu
    const justOnboarded = sessionStorage.getItem("justOnboarded")
    if (!justOnboarded && profile?.onboarding_completed) {
      // Sprawdź czy to "świeże" konto (stworzone w ostatnich 5 minutach)
      const createdAt = new Date(profile.created_at)
      const now = new Date()
      const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60

      if (diffMinutes < 60) {
        // Pokaż powitanie tylko raz
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

  const creditsUsed = profile?.credits_used ?? 0
  const creditsLimit = profile?.credits_limit ?? 5
  const plan = profile?.plan ?? "free"
  const safeLimit = Math.max(creditsLimit, 1)
  const creditsPct = (creditsUsed / safeLimit) * 100
  const creditsBarClass = creditsBarColor(creditsPct)

  useEffect(() => {
    if (userLoading || !user) {
      return
    }

    const userId = user.id
    let cancelled = false

    async function load() {
      setStatsLoading(true)
      const supabase = createClient()

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
            <div
              className="animate-fade-in rounded-2xl border border-border/50 bg-card/50 p-5"
              style={{ animationDelay: "0s" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-lg">
                  📝
                </div>
                <span className="text-xs text-muted-foreground">Wszystkie</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.totalDescriptions}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Wygenerowane opisy
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-lg">
                  ⚡
                </div>
                <span className="text-xs text-muted-foreground">Limit</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {creditsLimit - creditsUsed}
              </p>
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
            </div>

            <div
              className="animate-fade-in rounded-2xl border border-border/50 bg-card/50 p-5"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-lg">
                  📊
                </div>
                <span className="text-xs text-muted-foreground">Jakość</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.avgQuality ? stats.avgQuality : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Średnia jakość
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.avgQuality >= 80
                  ? "Świetna jakość! 🎉"
                  : "Cel: 80+"}
              </p>
            </div>

            <div
              className="animate-fade-in rounded-2xl border border-border/50 bg-card/50 p-5"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-lg">
                  👑
                </div>
                <span className="text-xs text-muted-foreground">Subskrypcja</span>
              </div>
              <p className="text-2xl font-bold capitalize text-foreground">
                {plan}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Twój plan</p>
              {plan !== "pro" ? (
                <Link
                  href="/dashboard/settings"
                  className="mt-2 inline-block text-xs text-emerald-400 hover:underline"
                >
                  Upgrade →
                </Link>
              ) : null}
            </div>
          </div>

          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Szybki start
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link href="/dashboard/generate?mode=form">
                <div className="group cursor-pointer rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-emerald-500/30">
                  <div className="mb-3 text-3xl">📝</div>
                  <p className="font-medium text-foreground transition-colors group-hover:text-emerald-400">
                    Generuj z formularza
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Wpisz dane produktu
                  </p>
                </div>
              </Link>

              <Link href="/dashboard/generate?mode=image" className="block">
                <div className="group relative cursor-pointer rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-emerald-500/30">
                  {plan === "free" ? (
                    <span className="absolute top-3 right-3 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                      Starter+
                    </span>
                  ) : null}
                  <div className="mb-3 text-3xl">📸</div>
                  <p className="font-medium text-foreground transition-colors group-hover:text-emerald-400">
                    Generuj ze zdjęcia
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Wrzuć zdjęcie produktu
                  </p>
                </div>
              </Link>

              <Link href="/dashboard/generate?mode=url" className="block">
                <div className="group relative cursor-pointer rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-emerald-500/30">
                  {plan !== "pro" ? (
                    <span className="absolute top-3 right-3 rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                      Pro
                    </span>
                  ) : null}
                  <div className="mb-3 text-3xl">🔍</div>
                  <p className="font-medium text-foreground transition-colors group-hover:text-emerald-400">
                    Analizuj konkurencję
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Wklej URL konkurenta
                  </p>
                </div>
              </Link>
            </div>
          </section>

          <section className="mt-8">
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
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 py-12 text-center">
                <p className="mb-3 text-3xl">📝</p>
                <p className="text-muted-foreground">
                  Nie masz jeszcze żadnych opisów
                </p>
                <Link
                  href="/dashboard/generate"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                >
                  Wygeneruj pierwszy opis →
                </Link>
                <div className="mx-auto mt-4 max-w-sm space-y-3 text-left">
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
                {recentDescriptions.map((desc) => {
                  const score = desc.quality_score
                  const badgeClass =
                    score >= 80
                      ? "bg-emerald-500/20 text-emerald-400"
                      : score >= 60
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                  return (
                    <div
                      key={desc.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-emerald-500/20"
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
                        {score > 0 ? (
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass}`}
                          >
                            {score}/100
                          </span>
                        ) : null}
                      </div>
                    </div>
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
