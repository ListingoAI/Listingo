"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

import DescriptionResult from "@/components/generator/DescriptionResult"
import PlatformPreview from "@/components/generator/PlatformPreview"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUser } from "@/hooks/useUser"
import { CATEGORIES, PLATFORMS, TONES } from "@/lib/constants"
import type { GenerateResponse } from "@/lib/types"
import { copyToClipboard } from "@/lib/utils"

type GenerateTabId = "form" | "social" | "price" | "email" | "image" | "url"

type SocialMediaApiResult = {
  instagram: {
    caption: string
    hashtags: string[]
    bestTime: string
    tip: string
  }
  facebook: {
    post: string
    cta: string
    tip: string
  }
  tiktok: {
    hookLine: string
    scriptOutline: string
    hashtags: string[]
    tip: string
  }
}

type PriceAdvisorApiResult = {
  suggestedPrice: number
  minPrice: number
  maxPrice: number
  currency?: string
  confidence: number
  reasoning: string
  tips: string[]
  seasonalNote?: string
}

const TAB_IDS: GenerateTabId[] = [
  "form",
  "social",
  "price",
  "email",
  "image",
  "url",
]

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const { profile, refreshProfile } = useUser()

  const [activeTab, setActiveTab] = useState<GenerateTabId>("form")
  const [productName, setProductName] = useState("")
  const [category, setCategory] = useState("")
  const [features, setFeatures] = useState("")
  const [socialShortDescription, setSocialShortDescription] = useState("")
  const [platform, setPlatform] = useState("allegro")
  const [tone, setTone] = useState("profesjonalny")
  const [useBrandVoice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState("")
  const [socialResult, setSocialResult] = useState<SocialMediaApiResult | null>(
    null
  )
  const [socialLoading, setSocialLoading] = useState(false)
  const [priceResult, setPriceResult] = useState<PriceAdvisorApiResult | null>(
    null
  )
  const [priceLoading, setPriceLoading] = useState(false)

  const plan = profile?.plan ?? "free"
  const creditsUsed = profile?.credits_used ?? 0
  const creditsLimit = profile?.credits_limit ?? 5
  const creditsRemaining = creditsLimit - creditsUsed

  const profileDefaultsAppliedFor = useRef<string | null>(null)

  useEffect(() => {
    const mode = searchParams.get("mode")
    if (mode && TAB_IDS.includes(mode as GenerateTabId)) {
      setActiveTab(mode as GenerateTabId)
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

  const handleGenerate = useCallback(async () => {
    if (!productName.trim() || !features.trim()) return

    const startTime = Date.now()
    setLoading(true)
    setError("")
    setResult(null)
    setShowPreview(false)

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

      const typed = data as GenerateResponse
      setResult(typed)
      setSocialShortDescription(typed.shortDescription?.trim() ?? "")

      if (typed.qualityScore >= 85) {
        import("canvas-confetti").then((confetti) => {
          confetti.default({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
            colors: ["#10B981", "#34D399", "#6EE7B7"],
          })
        })
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      toast.success(`✨ Opis wygenerowany w ${duration}s!`)

      await refreshProfile()
    } catch {
      setError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.")
    } finally {
      setLoading(false)
    }
  }, [
    productName,
    category,
    features,
    platform,
    tone,
    useBrandVoice,
    refreshProfile,
  ])

  const handleGenerateSocial = useCallback(async () => {
    if (!productName.trim() || !socialShortDescription.trim()) {
      toast.error("Uzupełnij nazwę produktu i krótki opis")
      return
    }
    setSocialLoading(true)
    setSocialResult(null)
    try {
      const response = await fetch("/api/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          shortDescription: socialShortDescription.trim(),
          platform,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Nie udało się wygenerować postów"
        )
        return
      }
      setSocialResult(data as SocialMediaApiResult)
      toast.success("Posty gotowe!")
    } catch {
      toast.error("Błąd połączenia. Spróbuj ponownie.")
    } finally {
      setSocialLoading(false)
    }
  }, [productName, socialShortDescription, platform])

  const handleAnalyzePrice = useCallback(async () => {
    if (!productName.trim() || !features.trim()) {
      toast.error("Uzupełnij nazwę produktu i cechy")
      return
    }
    setPriceLoading(true)
    setPriceResult(null)
    try {
      const response = await fetch("/api/price-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          category,
          features: features.trim(),
          platform,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Nie udało się przeanalizować ceny"
        )
        return
      }
      setPriceResult(data as PriceAdvisorApiResult)
      toast.success("Analiza ceny gotowa!")
    } catch {
      toast.error("Błąd połączenia. Spróbuj ponownie.")
    } finally {
      setPriceLoading(false)
    }
  }, [productName, category, features, platform])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (activeTab !== "form") return
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        if (!loading && productName.trim() && features.trim()) {
          void handleGenerate()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    activeTab,
    loading,
    productName,
    features,
    handleGenerate,
  ])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (activeTab === "form" && result) setResult(null)
      if (activeTab === "social" && socialResult) setSocialResult(null)
      if (activeTab === "price" && priceResult) setPriceResult(null)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [activeTab, result, socialResult, priceResult])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">⚡ AI Sales Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wybierz narzędzie — AI zrobi resztę
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { id: "form" as const, label: "✨ Opis" },
            { id: "social" as const, label: "📱 Social" },
            { id: "price" as const, label: "💰 Cena" },
            { id: "email" as const, label: "📧 Email" },
            { id: "image" as const, label: "📸 Zdjęcie", badge: "Starter+" as const },
            { id: "url" as const, label: "🔍 Konkurencja", badge: "Pro" as const },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                : "border-border/50 bg-card/50 text-muted-foreground hover:border-emerald-500/30"
            }`}
          >
            {tab.label}
            {"badge" in tab && tab.badge === "Starter+" && plan === "free" ? (
              <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                Starter+
              </span>
            ) : null}
            {"badge" in tab && tab.badge === "Pro" && plan !== "pro" ? (
              <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                Pro
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "form" ? (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <TooltipProvider delayDuration={300}>
            <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Label
                  htmlFor="productName"
                  className="text-sm font-medium text-foreground"
                >
                  Nazwa produktu *
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex cursor-help text-xs text-muted-foreground/50 hover:text-muted-foreground"
                      aria-label="Podpowiedź"
                    >
                      ℹ️
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs border border-border bg-card text-sm text-foreground">
                    <p>
                      Wpisz pełną nazwę produktu jak w sklepie. Uwzględnij
                      materiał, kolor i wariant. AI użyje tego jako podstawy do
                      tytułu SEO.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
              <div className="mb-2 flex items-center gap-2">
                <Label
                  htmlFor="category"
                  className="text-sm font-medium text-foreground"
                >
                  Kategoria
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex cursor-help text-xs text-muted-foreground/50 hover:text-muted-foreground"
                      aria-label="Podpowiedź"
                    >
                      ℹ️
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs border border-border bg-card text-sm text-foreground">
                    <p>
                      Kategoria pomaga AI lepiej dobrać słowa kluczowe i styl
                      opisu dla Twojej branży.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
              <div className="mb-2 flex items-center gap-2">
                <Label
                  htmlFor="features"
                  className="text-sm font-medium text-foreground"
                >
                  Cechy produktu *
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex cursor-help text-xs text-muted-foreground/50 hover:text-muted-foreground"
                      aria-label="Podpowiedź"
                    >
                      ℹ️
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs border border-border bg-card text-sm text-foreground">
                    <p>
                      Każda cecha w nowej linii. Im więcej szczegółów
                      (materiał, rozmiar, waga, kolor, technologia), tym lepszy
                      i dokładniejszy będzie opis.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Platforma docelowa
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex cursor-help text-xs text-muted-foreground/50 hover:text-muted-foreground"
                      aria-label="Podpowiedź"
                    >
                      ℹ️
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs border border-border bg-card text-sm text-foreground">
                    <p>
                      Wybierz gdzie będziesz publikować opis. AI dostosuje
                      format, długość i słowa kluczowe do wymagań wybranej
                      platformy.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
              <div className="mb-2 flex items-center gap-2">
                <Label
                  htmlFor="tone"
                  className="text-sm font-medium text-foreground"
                >
                  Ton opisu
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex cursor-help text-xs text-muted-foreground/50 hover:text-muted-foreground"
                      aria-label="Podpowiedź"
                    >
                      ℹ️
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs border border-border bg-card text-sm text-foreground">
                    <p>
                      Ton wpływa na język opisu. Profesjonalny = rzeczowy i
                      ekspercki. Przyjazny = konwersacyjny. Luksusowy =
                      elegancki i premium.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
              💡 Skrót:{" "}
              <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                Enter
              </kbd>{" "}
              = Generuj
            </p>

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
          </TooltipProvider>

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
              <>
                <DescriptionResult result={result} productName={productName} />
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="mb-4 flex items-center gap-2 text-sm text-emerald-400 transition-colors hover:text-emerald-300"
                  >
                    {showPreview ? "🔽" : "▶️"} Podgląd na platformie
                  </button>
                  {showPreview ? (
                    <PlatformPreview result={result} platform={platform} />
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "social" ? (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <Label
                htmlFor="socialProductName"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Nazwa produktu
              </Label>
              <input
                id="socialProductName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="np. Słuchawki bezprzewodowe ANC"
                className="h-10 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <Label
                htmlFor="socialShort"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Krótki opis
              </Label>
              <textarea
                id="socialShort"
                value={socialShortDescription}
                onChange={(e) => setSocialShortDescription(e.target.value)}
                placeholder="Wklej lub uzupełnij opis — po wygenerowaniu opisu w zakładce ✨ Opis wypełni się automatycznie."
                rows={6}
                className="w-full resize-none rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleGenerateSocial()}
              disabled={
                socialLoading ||
                !productName.trim() ||
                !socialShortDescription.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {socialLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generuję...
                </>
              ) : (
                "📱 Generuj posty"
              )}
            </button>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            {!socialResult && !socialLoading ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 py-16 text-center">
                <p className="text-sm text-muted-foreground/50">
                  Wynik pojawi się tutaj po kliknięciu „Generuj posty”
                </p>
              </div>
            ) : null}
            {socialLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/30 py-16">
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-sm text-muted-foreground">
                  Tworzę treści pod social media...
                </p>
              </div>
            ) : null}
            {socialResult ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-purple-500/10 bg-linear-to-br from-purple-500/5 to-pink-500/5 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-pink-500 text-sm text-white">
                      📸
                    </div>
                    <span className="font-semibold">Instagram</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {socialResult.instagram?.bestTime ?? ""}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-foreground">
                    {socialResult.instagram?.caption ?? ""}
                  </p>
                  <p className="mt-3 text-xs text-purple-400">
                    {(socialResult.instagram?.hashtags ?? []).join(" ")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          socialResult.instagram?.caption ?? ""
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano caption")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="rounded-lg bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      Kopiuj caption
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          (socialResult.instagram?.hashtags ?? []).join(" ")
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano hashtagi")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="rounded-lg bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      Kopiuj hashtagi
                    </button>
                  </div>
                  {socialResult.instagram?.tip ? (
                    <p className="mt-3 text-xs text-muted-foreground italic">
                      💡 {socialResult.instagram.tip}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-blue-500/10 bg-linear-to-br from-blue-500/5 to-sky-500/5 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/30 text-sm">
                      📘
                    </div>
                    <span className="font-semibold">Facebook</span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-foreground">
                    {socialResult.facebook?.post ?? ""}
                  </p>
                  <p className="mt-3 text-sm font-medium text-blue-400">
                    {socialResult.facebook?.cta ?? ""}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          socialResult.facebook?.post ?? ""
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano post")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="rounded-lg bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      Kopiuj post
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          socialResult.facebook?.cta ?? ""
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano CTA")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="rounded-lg bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      Kopiuj CTA
                    </button>
                  </div>
                  {socialResult.facebook?.tip ? (
                    <p className="mt-3 text-xs text-muted-foreground italic">
                      💡 {socialResult.facebook.tip}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-red-500/15 bg-card/40 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
                      ♪
                    </div>
                    <span className="font-semibold">TikTok</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {socialResult.tiktok?.hookLine ?? ""}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">
                    {socialResult.tiktok?.scriptOutline ?? ""}
                  </p>
                  <p className="mt-3 text-xs text-red-400/90">
                    {(socialResult.tiktok?.hashtags ?? []).join(" ")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          socialResult.tiktok?.hookLine ?? ""
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano hook")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="rounded-lg bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      Kopiuj hook
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          (socialResult.tiktok?.hashtags ?? []).join(" ")
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano hashtagi")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="rounded-lg bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      Kopiuj hashtagi
                    </button>
                  </div>
                  {socialResult.tiktok?.tip ? (
                    <p className="mt-3 text-xs text-muted-foreground italic">
                      💡 {socialResult.tiktok.tip}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "price" ? (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <Label
                htmlFor="priceProductName"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Nazwa produktu
              </Label>
              <input
                id="priceProductName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="h-10 w-full rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <Label
                htmlFor="priceCategory"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Kategoria
              </Label>
              <select
                id="priceCategory"
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
              <Label
                htmlFor="priceFeatures"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Cechy
              </Label>
              <textarea
                id="priceFeatures"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                rows={6}
                className="w-full resize-none rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleAnalyzePrice()}
              disabled={
                priceLoading || !productName.trim() || !features.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-black transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {priceLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analizuję...
                </>
              ) : (
                "💰 Analizuj cenę"
              )}
            </button>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            {!priceResult && !priceLoading ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 py-16 text-center">
                <p className="text-sm text-muted-foreground/50">
                  Wynik analizy pojawi się tutaj
                </p>
              </div>
            ) : null}
            {priceLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/30 py-16">
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-emerald-500" />
                <p className="text-sm text-muted-foreground">
                  Analizuję rynek i marże...
                </p>
              </div>
            ) : null}
            {priceResult ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-500/20 bg-card/50 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Sugerowana cena sprzedaży
                  </p>
                  <p className="mt-2 text-5xl font-bold text-emerald-400">
                    {priceResult.suggestedPrice} zł
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Confidence: {priceResult.confidence}%
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-center">
                    <p className="text-xs text-red-400">Minimalna</p>
                    <p className="text-xl font-bold text-foreground">
                      {priceResult.minPrice} zł
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Ryzyko niskiej marży
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center ring-2 ring-emerald-500/30">
                    <p className="text-xs text-emerald-400">Optymalna</p>
                    <p className="text-xl font-bold text-emerald-400">
                      {priceResult.suggestedPrice} zł
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Najlepsza marża
                    </p>
                  </div>
                  <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4 text-center">
                    <p className="text-xs text-yellow-400">Maksymalna</p>
                    <p className="text-xl font-bold text-foreground">
                      {priceResult.maxPrice} zł
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Premium positioning
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-card/30 p-4">
                  <p className="text-sm text-foreground">
                    {priceResult.reasoning}
                  </p>
                </div>

                <div className="space-y-2">
                  {(priceResult.tips ?? []).map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-400">💡</span>
                      <span className="text-muted-foreground">{tip}</span>
                    </div>
                  ))}
                </div>

                {priceResult.seasonalNote ? (
                  <div className="rounded-lg border border-yellow-500/10 bg-yellow-500/5 p-3">
                    <p className="text-xs text-yellow-400">
                      📅 {priceResult.seasonalNote}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "email" ? (
        <div className="rounded-2xl border border-border/50 bg-card/30 py-16 text-center">
          <p className="mb-3 text-3xl">📧</p>
          <p className="font-medium text-foreground">
            Generator emaili marketingowych
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Wkrótce dostępne
          </p>
          <span className="mt-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            Coming Soon
          </span>
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
