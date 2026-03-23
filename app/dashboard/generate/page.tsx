"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

import DescriptionResult from "@/components/generator/DescriptionResult"
import { useUser } from "@/hooks/useUser"
import { CATEGORIES, PLATFORMS, TONES } from "@/lib/constants"
import type { GenerateResponse } from "@/lib/types"

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const { profile, refreshProfile } = useUser()

  const [activeTab, setActiveTab] = useState<"form" | "image" | "url">("form")
  const [productName, setProductName] = useState("")
  const [category, setCategory] = useState("")
  const [features, setFeatures] = useState("")
  const [platform, setPlatform] = useState("allegro")
  const [tone, setTone] = useState("profesjonalny")
  const [useBrandVoice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState("")

  const plan = profile?.plan ?? "free"
  const creditsUsed = profile?.credits_used ?? 0
  const creditsLimit = profile?.credits_limit ?? 5
  const creditsRemaining = creditsLimit - creditsUsed

  const profileDefaultsAppliedFor = useRef<string | null>(null)

  useEffect(() => {
    const mode = searchParams.get("mode")
    if (mode === "form" || mode === "image" || mode === "url") {
      setActiveTab(mode)
    }
  }, [searchParams])

  useEffect(() => {
    if (!profile) {
      profileDefaultsAppliedFor.current = null
      return
    }
    if (profileDefaultsAppliedFor.current === profile.id) return
    setCategory(profile.default_category ?? "")
    setPlatform(profile.default_platform || "allegro")
    setTone(profile.default_tone || "profesjonalny")
    profileDefaultsAppliedFor.current = profile.id
  }, [profile])

  async function handleGenerate() {
    if (!productName.trim() || !features.trim()) return

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          category,
          features: features.trim(),
          platform,
          tone,
          useBrandVoice,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setError(
            "Wykorzystałeś limit opisów w tym miesiącu. Przejdź na wyższy plan."
          )
        } else {
          setError(data.error || "Wystąpił błąd. Spróbuj ponownie.")
        }
        return
      }

      setResult(data as GenerateResponse)
      await refreshProfile()
    } catch {
      setError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          ✨ Generuj opis produktu
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wypełnij formularz — AI zrobi resztę
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "form"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
              : "border-border/50 bg-card/50 text-muted-foreground hover:border-emerald-500/30"
          }`}
        >
          📝 Formularz
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("image")}
          className={`flex items-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "image"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
              : "border-border/50 bg-card/50 text-muted-foreground hover:border-emerald-500/30"
          }`}
        >
          📸 Ze zdjęcia
          {plan === "free" ? (
            <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
              Starter+
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("url")}
          className={`flex items-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "url"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
              : "border-border/50 bg-card/50 text-muted-foreground hover:border-emerald-500/30"
          }`}
        >
          🔍 Z URL konkurencji
          {plan !== "pro" ? (
            <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
              Pro
            </span>
          ) : null}
        </button>
      </div>

      {activeTab === "form" ? (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="productName"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Nazwa produktu *
              </label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="np. Koszulka męska bawełniana oversize"
                maxLength={200}
                className="h-10 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="mt-1 flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {productName.length}/200
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Kategoria
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Wybierz kategorię...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="features"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Cechy produktu *
              </label>
              <textarea
                id="features"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder={`Wymień najważniejsze cechy, każda w nowej linii:

Materiał: 100% bawełna organiczna
Rozmiary: S, M, L, XL, XXL
Kolory: czarny, biały, szary
Gramatura: 200g/m²
Produkcja: Polska`}
                rows={8}
                className="w-full resize-none rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                💡 Im więcej szczegółów podasz, tym lepszy opis wygeneruje AI
              </p>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">
                Platforma docelowa
              </span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {PLATFORMS.map((p) => {
                  const active = platform === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlatform(p.value)}
                      className={`rounded-xl p-3 text-center transition-all ${
                        active
                          ? "border-2 border-emerald-500 bg-emerald-500/10"
                          : "border border-border/50 bg-card/30 hover:border-emerald-500/30"
                      }`}
                    >
                      <div className="text-xl">{p.emoji}</div>
                      <p className="mt-1 text-xs font-medium">{p.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="tone"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Ton opisu
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="h-10 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.emoji} {t.label} — {t.description}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || !productName.trim() || !features.trim()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generuję... (ok. 15 sek)
                </>
              ) : (
                "✨ Generuj opis"
              )}
            </button>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              {creditsRemaining > 0 ? (
                `Pozostało: ${creditsRemaining} kredytów w tym miesiącu`
              ) : (
                <span className="text-red-400">
                  Wykorzystałeś limit.{" "}
                  <Link
                    href="/dashboard/settings"
                    className="text-emerald-400 hover:underline"
                  >
                    Upgrade →
                  </Link>
                </span>
              )}
            </p>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            {error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="mt-2 text-sm text-emerald-400 hover:underline"
                >
                  Spróbuj ponownie
                </button>
              </div>
            ) : null}

            {result === null && !loading && !error ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 py-20 text-center">
                <p className="mb-3 text-4xl">✨</p>
                <p className="text-muted-foreground">
                  Tu pojawi się wygenerowany opis
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Wypełnij formularz i kliknij Generuj
                </p>
              </div>
            ) : null}

            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/30 py-20">
                <div
                  className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
                  aria-hidden
                />
                <p className="font-medium text-foreground">Generuję opis...</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  To potrwa około 15 sekund
                </p>
              </div>
            ) : null}

            {result !== null && !loading ? (
              <DescriptionResult result={result} />
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "image" ? (
        <div className="rounded-2xl border border-border/50 bg-card/30 py-16 text-center">
          {plan === "free" ? (
            <>
              <p className="mb-3 text-3xl">🔒</p>
              <p className="font-medium text-foreground">
                Generowanie ze zdjęcia
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Dostępne od planu Starter (99 zł/mies)
              </p>
              <Link
                href="/dashboard/settings"
                className="mt-4 inline-flex items-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                Przejdź na Starter →
              </Link>
            </>
          ) : (
            <>
              <p className="mb-3 text-3xl">📸</p>
              <p className="font-medium text-foreground">Wkrótce dostępne</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pracujemy nad tą funkcją
              </p>
            </>
          )}
        </div>
      ) : null}

      {activeTab === "url" ? (
        <div className="rounded-2xl border border-border/50 bg-card/30 py-16 text-center">
          {plan !== "pro" ? (
            <>
              <p className="mb-3 text-3xl">🔒</p>
              <p className="font-medium text-foreground">Analiza konkurencji</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Dostępne w planie Pro (249 zł/mies)
              </p>
              <Link
                href="/dashboard/settings"
                className="mt-4 inline-flex items-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                Przejdź na Pro →
              </Link>
            </>
          ) : (
            <>
              <p className="mb-3 text-3xl">🔍</p>
              <p className="font-medium text-foreground">Wkrótce dostępne</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pracujemy nad tą funkcją
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <GeneratePageContent />
    </Suspense>
  )
}
