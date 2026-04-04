"use client"

import { motion } from "framer-motion"
import {
  Camera,
  FileText,
  Loader2,
  Mail,
  Search,
  Share2,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

import { CompetitorUrlTab } from "@/components/generate/CompetitorUrlTab"
import { FormTabPremium } from "@/components/generate/hub/FormTabPremium"
import { Label } from "@/components/ui/label"
import { useUser } from "@/hooks/useUser"
import { CATEGORIES, PLATFORMS } from "@/lib/constants"
import { hasProductImageVisionAccess, isProOrScale } from "@/lib/plans"
import { buildQualityRefinementInstruction } from "@/lib/generation/build-quality-refinement-instruction"
import { countWordsFromHtml } from "@/lib/generation/count-words-html"
import { hasSubstantiveImageAnalysis } from "@/lib/generation/product-image-analysis"
import type { ProductImageAnalysis } from "@/lib/generation/product-image-analysis"
import { createClient } from "@/lib/supabase/client"
import type { ListingAuditResult } from "@/lib/generation/listing-audit"
import type { GenerateRequest, GenerateResponse, ProductImageEntry } from "@/lib/types"
import { cn, copyToClipboard } from "@/lib/utils"

import type React from "react"

type GenerateTabId = "form" | "social" | "price" | "email" | "image" | "url"

const MAX_PRODUCT_IMAGES = 5

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function buildGenerateImagePayload(
  images: ProductImageEntry[]
): Pick<GenerateRequest, "imageBase64" | "imageBase64Images"> {
  const urls = images.map((p) => p.dataUrl.trim()).filter(Boolean)
  if (urls.length === 0) return {}
  if (urls.length === 1) return { imageBase64: urls[0] }
  return { imageBase64Images: urls }
}

const TAB_IDS: GenerateTabId[] = [
  "form",
  "social",
  "price",
  "email",
  "image",
  "url",
]

const TABS: { id: GenerateTabId; label: string; icon: React.ElementType; sub: string }[] = [
  { id: "form",   label: "Opis",        icon: FileText,   sub: "SEO · e-commerce" },
  { id: "social", label: "Social",      icon: Share2,     sub: "Instagram · TikTok" },
  { id: "price",  label: "Cena",        icon: TrendingUp, sub: "Analiza rynku" },
  { id: "email",  label: "Email",       icon: Mail,       sub: "Kampania" },
  { id: "image",  label: "Zdjęcie",     icon: Camera,     sub: "Packshot AI" },
  { id: "url",    label: "Konkurencja", icon: Search,     sub: "Analiza URL" },
]

const LOADING_STEPS = [
  "Analizuję produkt…",
  "Buduję tytuł SEO…",
  "Tworzę opis…",
  "Finalizuję…",
]

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const { profile, refreshProfile } = useUser()

  const [activeTab, setActiveTab] = useState<GenerateTabId>("form")
  /** Kreator zakładki Opis: 1 = platforma, 2 = dane produktu, 3 = ustawienia + generuj */
  const [descriptionWizardStep, setDescriptionWizardStep] = useState<1 | 2 | 3>(1)
  const [productName, setProductName] = useState("")
  const [category, setCategory] = useState("")
  const [features, setFeatures] = useState("")
  const [platform, setPlatform] = useState("allegro")
  const [tone, setTone] = useState("profesjonalny")
  const [listingEmojis, setListingEmojis] = useState(true)
  const [listingIntent, setListingIntent] = useState("")
  const [descriptionImageUrls, setDescriptionImageUrls] = useState("")
  const [useBrandVoice, setUseBrandVoice] = useState(false)
  const [brandVoiceData, setBrandVoiceData] = useState<{ tone?: string; style?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  /** Jedno dopracowanie „do 100” na wygenerowany opis; reset przy nowej generacji. */
  const [refineAlreadyUsed, setRefineAlreadyUsed] = useState(false)
  /** Uwagi wklejane do instrukcji „Dopracuj do 100” (opcjonalnie). */
  const [refineNotes, setRefineNotes] = useState("")
  /** Audyt listingu (osobne wywołanie AI, bez kredytu). */
  const [listingAudit, setListingAudit] = useState<ListingAuditResult | null>(null)
  const [listingAuditLoading, setListingAuditLoading] = useState(false)
  const [error, setError] = useState("")
  /* eslint-disable @typescript-eslint/no-explicit-any -- wyniki API social-media / price-advisor */
  const [socialResult, setSocialResult] = useState<any>(null)
  const [socialLoading, setSocialLoading] = useState(false)
  const [priceResult, setPriceResult] = useState<any>(null)
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const [priceLoading, setPriceLoading] = useState(false)
  const [productImages, setProductImages] = useState<ProductImageEntry[]>([])
  const productImagesRef = useRef<ProductImageEntry[]>([])
  productImagesRef.current = productImages
  const [imageAnalysis, setImageAnalysis] = useState<ProductImageAnalysis | null>(null)
  const [imageAnalyzing, setImageAnalyzing] = useState(false)

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

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase
      .from("brand_voices")
      .select("detected_tone, detected_style")
      .eq("user_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setBrandVoiceData({
            tone: data.detected_tone ?? undefined,
            style: data.detected_style ?? undefined,
          })
      })
  }, [profile])

  const handleAddProductImages = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    const toAppend: ProductImageEntry[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error("Wybierz pliki JPG, PNG lub WebP.")
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: maks. 5 MB na plik.`)
        continue
      }
      try {
        const dataUrl = await readFileAsDataUrl(file)
        toAppend.push({
          id: crypto.randomUUID(),
          dataUrl,
          name: file.name,
        })
      } catch {
        toast.error(`Nie udało się wczytać: ${file.name}`)
      }
    }
    if (toAppend.length === 0) return
    setProductImages((prev) => {
      const room = MAX_PRODUCT_IMAGES - prev.length
      if (room <= 0) {
        toast.error(`Maksymalnie ${MAX_PRODUCT_IMAGES} zdjęć.`)
        return prev
      }
      const slice = toAppend.slice(0, room)
      if (slice.length < toAppend.length) {
        toast.error(
          `Możesz mieć max ${MAX_PRODUCT_IMAGES} zdjęć — dodano ${slice.length} z ${toAppend.length}.`
        )
      }
      return [...prev, ...slice]
    })
    setImageAnalysis(null)
  }, [])

  const handleRemoveProductImage = useCallback((id: string) => {
    setProductImages((prev) => prev.filter((p) => p.id !== id))
    setImageAnalysis(null)
  }, [])

  const handleAnalyzeProductImage = useCallback(async () => {
    const urls = productImagesRef.current.map((p) => p.dataUrl.trim()).filter(Boolean)
    if (urls.length === 0) {
      toast.error("Najpierw wybierz zdjęcie produktu.")
      return
    }
    setImageAnalyzing(true)
    try {
      const payload =
        urls.length === 1
          ? { imageBase64: urls[0], platform }
          : { images: urls, platform }
      const res = await fetch("/api/analyze-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as Record<string, unknown> & { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Analiza nie powiodła się."
        if (res.status === 403 && data.upgradeRequired) {
          toast.error(msg, { duration: 6000 })
        } else {
          toast.error(msg)
        }
        return
      }
      const { ok: _ok, creditsCharged: _c, creditsRemaining: _r, promptKinds: _p, ...rest } =
        data as Record<string, unknown> & {
          ok?: boolean
          creditsCharged?: number
          creditsRemaining?: number
          promptKinds?: unknown
        }
      setImageAnalysis(rest as ProductImageAnalysis)
      toast.success("Dane ze zdjęcia gotowe — sprawdź i wstaw do formularza.")
      await refreshProfile()
    } catch {
      toast.error("Błąd sieci.")
    } finally {
      setImageAnalyzing(false)
    }
  }, [platform, refreshProfile])

  const handleClearProductImageAnalysis = useCallback(() => {
    setProductImages([])
    setImageAnalysis(null)
  }, [])

  const handleGenerate = useCallback(async () => {
    const hasTextInput = Boolean(
      productName.trim() || features.trim() || descriptionImageUrls.trim()
    )
    const hasImage = productImages.length > 0
    if (!hasTextInput && !hasImage) return

    if (result?.descriptionId) {
      fetch("/api/description-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionId: result.descriptionId, action: "retry", field: "all" }),
      }).catch(() => {})
    }

    const startTime = Date.now()
    setLoading(true)
    setError("")
    setResult(null)
    setRefineAlreadyUsed(false)
    setRefineNotes("")
    setListingAudit(null)
    setLoadingStep(0)
    const stepInterval = setInterval(
      () =>
        setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      3000
    )

    const retryCtx = result ? (() => {
      const hints: string[] = []
      if (/\d{3,}\s*[x×]\s*\d{3,}|\d+\s*mm\b|\d+\s*px\b/i.test(result.seoTitle)) {
        hints.push('Tytuł SEO: usuń surowe specs (piksele, mm, wymiary) — wstaw frazy intencji zakupowej (marka + typ + korzyść)')
      }
      if (result.shortDescription && /^[^.!?]+,\s*[^.!?]+,\s*[^.!?]+/.test(result.shortDescription) && !result.shortDescription.includes('.')) {
        hints.push('Opis krótki: zamień listę z przecinkami na jedno zdanie sprzedażowe z perspektywy kupującego')
      }
      if (result.qualityScore < 75) {
        hints.push('Wynik poniżej 75 — przenieś najsilniejszą korzyść na 1. miejsce listy i do hooka')
      }
      const tipTexts = (result.qualityTips ?? []).filter(t => typeof t === 'object' && (t.type === 'warning' || t.type === 'error')).slice(0, 2)
      for (const t of tipTexts) {
        if (typeof t === 'object' && 'text' in t) hints.push(`Napraw: ${t.text}`)
      }
      return {
        retryContext: {
          previousSeoTitle: result.seoTitle,
          previousShortDescription: result.shortDescription,
          previousQualityScore: result.qualityScore,
          retryHints: hints.length > 0 ? hints.slice(0, 4) : undefined,
        },
      }
    })() : {}

    try {
      const payload: GenerateRequest = {
        productName: productName.trim(),
        category,
        features: features.trim(),
        platform,
        tone,
        listingEmojis,
        listingIntent: listingIntent.trim() || undefined,
        descriptionImageUrls: descriptionImageUrls.trim() || undefined,
        brandVoice:
          useBrandVoice && brandVoiceData ? brandVoiceData : undefined,
        ...buildGenerateImagePayload(productImages),
        ...(imageAnalysis && hasSubstantiveImageAnalysis(imageAnalysis)
          ? { imageAnalysisPrecomputed: imageAnalysis }
          : {}),
        ...retryCtx,
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setError(
            data.upgradeRequired && typeof data.error === "string"
              ? data.error
              : "Wykorzystałeś limit opisów w tym miesiącu. Przejdź na wyższy plan."
          )
        } else {
          setError(data.error || "Wystąpił błąd. Spróbuj ponownie.")
        }
        return
      }

      const typed = data as GenerateResponse
      setResult(typed)

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
      clearInterval(stepInterval)
      setLoadingStep(0)
      setLoading(false)
    }
  }, [
    productName,
    category,
    features,
    platform,
    tone,
    listingEmojis,
    listingIntent,
    descriptionImageUrls,
    useBrandVoice,
    brandVoiceData,
    refreshProfile,
    productImages,
    imageAnalysis,
    result,
  ])

  const handleRefineWithQuality = useCallback(async () => {
    if (!result) return
    if (refineAlreadyUsed) {
      toast.error("Dopracowanie można użyć tylko raz na ten opis. Wygeneruj opis ponownie, aby użyć ponownie.")
      return
    }
    if (
      !productName.trim() &&
      !features.trim() &&
      !descriptionImageUrls.trim() &&
      productImages.length === 0
    ) {
      toast.error("Dodaj nazwę, parametry lub cechy produktu przed dopracowaniem.")
      return
    }

    if (!refineNotes.trim()) {
      toast.error("Wpisz instrukcję do poprawy w polu „Uwagi do dopracowania”.")
      return
    }

    const longHtml = result.longDescription ?? ""
    const longWordCount = countWordsFromHtml(longHtml)
    const longMinWords = result.platformLimits?.longDescMinWords ?? 150
    const hasNegativeTips = (result.qualityTips ?? []).some((tip) => {
      if (typeof tip === "string") {
        try { return (JSON.parse(tip) as { type?: string }).type === "warning" || (JSON.parse(tip) as { type?: string }).type === "error" } catch { return false }
      }
      return (tip as { type?: string })?.type === "warning" || (tip as { type?: string })?.type === "error"
    })
    const belowLongMin = longWordCount < longMinWords

    const polishHint = !hasNegativeTips && !belowLongMin
      ? [{ type: "warning" as const, text: "Polish pass: podkręć konwersję i czytelność bez zmiany faktów (mocniejszy hook, skanowalne sekcje, naturalne CTA).", points: 0 }]
      : []

    const instruction = buildQualityRefinementInstruction(
      [...(result.qualityTips ?? []), ...polishHint] as Parameters<typeof buildQualityRefinementInstruction>[0],
      {
        longMinWords,
        longWordCount,
        titleMaxChars: result.platformLimits?.titleMaxChars,
        shortDescMax: result.platformLimits?.shortDescMax,
        metaDescMax: result.platformLimits?.metaDescMax,
        platformSlug: result.platformLimits?.slug,
        tone,
        listingEmojis,
        listingIntent: listingIntent.trim() || undefined,
        brandVoice: useBrandVoice && brandVoiceData ? brandVoiceData : undefined,
        productName: productName.trim() || undefined,
        category: category || undefined,
        features: features.trim() || undefined,
      }
    )

    const notes = refineNotes.trim()
    const instructionWithNotes = `${instruction}\n\n=== UWAGI SPRZEDAWCY (uwzględnij w redakcji; nie dodawaj nowych faktów spoza danych produktu i formularza) ===\n${notes}\n`

    if (result.descriptionId) {
      fetch("/api/description-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionId: result.descriptionId, action: "refine", field: "all" }),
      }).catch(() => {})
    }

    const startTime = Date.now()
    setLoading(true)
    setError("")
    setLoadingStep(0)
    const stepInterval = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 3000)

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
          listingEmojis,
          listingIntent: listingIntent.trim() || undefined,
          descriptionImageUrls: descriptionImageUrls.trim() || undefined,
          brandVoice: useBrandVoice && brandVoiceData ? brandVoiceData : undefined,
          ...buildGenerateImagePayload(productImages),
          ...(imageAnalysis && hasSubstantiveImageAnalysis(imageAnalysis)
            ? { imageAnalysisPrecomputed: imageAnalysis }
            : {}),
          refinementOf: {
            seoTitle: result.seoTitle,
            shortDescription: result.shortDescription,
            longDescription: result.longDescription,
            tags: result.tags,
            metaDescription: result.metaDescription,
          },
          refinementInstruction: instructionWithNotes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const msg =
          response.status === 403
            ? (typeof data?.error === "string" && data.error.trim()) || "Limit opisów wyczerpany."
            : (typeof data?.error === "string" && data.error.trim()) || "Wystąpił błąd. Spróbuj ponownie."
        setError(msg)
        toast.error(msg)
        return
      }

      const typed = data as GenerateResponse
      setResult(typed)
      setRefineAlreadyUsed(true)
      setRefineNotes("")
      setListingAudit(null)

      if (typed.qualityScore >= 85) {
        import("canvas-confetti").then((confetti) => {
          confetti.default({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ["#10B981", "#34D399", "#6EE7B7"] })
        })
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      toast.success(`✨ Dopracowano w ${duration}s — zużyto 1 kredyt.`)
      await refreshProfile()
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : "Błąd połączenia."
      setError(msg)
      toast.error(msg)
    } finally {
      clearInterval(stepInterval)
      setLoadingStep(0)
      setLoading(false)
    }
  }, [
    result,
    refineAlreadyUsed,
    productName,
    category,
    features,
    platform,
    tone,
    listingEmojis,
    listingIntent,
    descriptionImageUrls,
    useBrandVoice,
    brandVoiceData,
    refreshProfile,
    productImages,
    imageAnalysis,
    refineNotes,
  ])

  const handleListingAudit = useCallback(async () => {
    if (!result) return
    const startedAt = Date.now()
    setListingAuditLoading(true)
    try {
      const response = await fetch("/api/listing-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          category,
          features: features.trim(),
          platform,
          listing: {
            seoTitle: result.seoTitle,
            shortDescription: result.shortDescription,
            longDescription: result.longDescription,
            tags: result.tags,
            metaDescription: result.metaDescription,
          },
        }),
      })
      const data = (await response.json()) as {
        audit?: ListingAuditResult
        error?: string
        creditsCharged?: number
      }
      if (!response.ok) {
        toast.error(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : "Nie udało się przeanalizować listingu."
        )
        return
      }
      if (data.audit) {
        setListingAudit(data.audit)
        const duration = ((Date.now() - startedAt) / 1000).toFixed(1)
        const charged = typeof data.creditsCharged === "number" ? data.creditsCharged : 1
        toast.success(`Analiza listingu gotowa w ${duration}s. Zużyto ${charged} kredyt.`)
        await refreshProfile()
      }
    } catch {
      toast.error("Błąd połączenia.")
    } finally {
      setListingAuditLoading(false)
    }
  }, [result, productName, category, features, platform, refreshProfile])

  async function handleGenerateSocial() {
    if (!productName.trim()) {
      toast.error("Wpisz nazwę produktu")
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
          shortDescription: features.trim() || productName.trim(),
          platform,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setSocialResult(data)
        toast.success("Posty wygenerowane! 📱")
      } else {
        toast.error(data.error || "Błąd generowania postów")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleAnalyzePrice() {
    if (!productName.trim()) {
      toast.error("Wpisz nazwę produktu")
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
      if (response.ok) {
        setPriceResult(data)
        toast.success("Analiza ceny gotowa! 💰")
      } else {
        toast.error(data.error || "Błąd analizy ceny")
      }
    } catch {
      toast.error("Błąd połączenia")
    } finally {
      setPriceLoading(false)
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (activeTab !== "form") return
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        if (descriptionWizardStep !== 3) return
        if (
          !loading &&
          (productName.trim() ||
            features.trim() ||
            descriptionImageUrls.trim() ||
            productImages.length > 0)
        ) {
          void handleGenerate()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    activeTab,
    descriptionWizardStep,
    loading,
    productName,
    features,
    descriptionImageUrls,
    productImages,
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
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-5 sm:space-y-6">
      <header className="mb-6 space-y-3 sm:mb-8 sm:space-y-4">
        <div className="inline-flex items-center gap-2.5 rounded-lg border border-white/10 bg-linear-to-r from-white/4 via-cyan-950/20 to-emerald-950/15 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <span className="h-3 w-px shrink-0 bg-linear-to-b from-cyan-400/50 to-emerald-500/50" aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100/75">
            Narzędzia AI
          </span>
        </div>
        <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
          AI Sales{" "}
          <span className="bg-linear-to-br from-white via-emerald-100/95 to-emerald-400/80 bg-clip-text text-transparent">
            Hub
          </span>
        </h1>
        <p className="max-w-xl wrap-break-word text-[13px] leading-relaxed text-muted-foreground/90 sm:text-sm">
          Wybierz moduł poniżej —{" "}
          <span className="bg-linear-to-r from-cyan-400/80 to-emerald-400/85 bg-clip-text text-transparent">
            AI dopasuje treść
          </span>{" "}
          do kanału,
          formatu i tonu marki.
        </p>
      </header>

      <div
        className="w-full snap-x snap-mandatory overflow-x-auto overflow-y-visible pb-2 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
        role="tablist"
        aria-label="Narzędzia AI Sales Hub"
      >
        <div className="inline-flex w-max gap-1 rounded-2xl border border-white/10 bg-linear-to-br from-white/7 via-cyan-950/12 to-emerald-950/18 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_40px_-18px_rgba(0,0,0,0.5),0_0_36px_-14px_rgba(16,185,129,0.08)] backdrop-blur-md">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "group relative flex shrink-0 snap-start items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-out will-change-transform sm:gap-2.5 sm:px-4 sm:py-2.5 sm:text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? [
                        "text-white",
                        "bg-linear-to-br from-cyan-500/15 via-emerald-500/22 to-emerald-950/35",
                        "shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_6px_22px_-6px_rgba(16,185,129,0.2),0_0_28px_-10px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.11)]",
                      ]
                    : [
                        "border border-white/8 bg-white/5 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                        "hover:border-cyan-500/18 hover:bg-white/9 hover:text-foreground",
                        "hover:shadow-[0_4px_20px_-8px_rgba(16,185,129,0.12),0_0_24px_-12px_rgba(34,211,238,0.08)]",
                      ]
                )}
              >
                {isActive ? (
                  <span
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-transparent via-white/5 to-white/8 opacity-80"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn(
                    "relative z-10 h-4 w-4 shrink-0 transition-colors duration-300",
                    isActive
                      ? "text-emerald-50/95"
                      : "text-muted-foreground/85 group-hover:text-cyan-100/85"
                  )}
                  aria-hidden
                />
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="min-w-0">
      {activeTab === "form" ? (
        <FormTabPremium
          wizardStep={descriptionWizardStep}
          setWizardStep={setDescriptionWizardStep}
          productName={productName}
          setProductName={setProductName}
          category={category}
          setCategory={setCategory}
          features={features}
          setFeatures={setFeatures}
          platform={platform}
          setPlatform={setPlatform}
          tone={tone}
          setTone={setTone}
          listingEmojis={listingEmojis}
          setListingEmojis={setListingEmojis}
          listingIntent={listingIntent}
          setListingIntent={setListingIntent}
          descriptionImageUrls={descriptionImageUrls}
          setDescriptionImageUrls={setDescriptionImageUrls}
          useBrandVoice={useBrandVoice}
          setUseBrandVoice={setUseBrandVoice}
          brandVoiceData={brandVoiceData}
          loading={loading}
          loadingStep={loadingStep}
          loadingMessages={LOADING_STEPS}
          handleGenerate={handleGenerate}
          handleRefineQuality={handleRefineWithQuality}
          refineAlreadyUsed={refineAlreadyUsed}
          refineNotes={refineNotes}
          setRefineNotes={setRefineNotes}
          onListingAudit={handleListingAudit}
          listingAuditLoading={listingAuditLoading}
          listingAudit={listingAudit}
          result={result}
          error={error}
          creditsRemaining={creditsRemaining}
          productImages={productImages}
          onAddProductImages={handleAddProductImages}
          onRemoveProductImage={handleRemoveProductImage}
          imageAnalysis={imageAnalysis}
          setImageAnalysis={setImageAnalysis}
          imageAnalyzing={imageAnalyzing}
          onAnalyzeProductImage={handleAnalyzeProductImage}
          onClearProductImageAnalysis={handleClearProductImageAnalysis}
          productImageVisionUnlocked={hasProductImageVisionAccess(plan)}
          onClearResult={() => {
            setResult(null)
            setRefineNotes("")
            setListingAudit(null)
            setDescriptionWizardStep(3)
          }}
        />
      ) : null}
      {activeTab === "social" ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
                placeholder="np. Koszulka męska bawełniana oversize"
                maxLength={200}
                className="w-full rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors"
              />
            </div>
            <div>
              <Label
                htmlFor="socialFeatures"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Krótki opis / cechy
              </Label>
              <textarea
                id="socialFeatures"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="Wpisz cechy produktu — AI stworzy z nich posty"
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors"
              />
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">
                Platforma sprzedaży
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
            <button
              type="button"
              onClick={() => void handleGenerateSocial()}
              disabled={socialLoading || !productName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {socialLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generuję posty...
                </>
              ) : (
                "📱 Generuj posty social media"
              )}
            </button>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            {!socialResult && !socialLoading ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 py-16 text-center">
                <p className="text-sm text-muted-foreground/50">
                  Wynik pojawi się tutaj po kliknięciu „Generuj posty social media”
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
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-purple-500/20 bg-linear-to-br from-purple-500/5 to-pink-500/5 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
                      IG
                    </div>
                    <span className="text-sm font-semibold">Instagram</span>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          `${socialResult.instagram?.caption ?? ""}\n\n${(socialResult.instagram?.hashtags ?? []).join(" ")}`
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="ml-auto rounded-lg bg-white/5 px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-purple-500/10 hover:text-purple-400"
                    >
                      📋 Kopiuj
                    </button>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {socialResult.instagram?.caption ?? ""}
                  </p>
                  <p className="mt-3 text-xs text-purple-400/80">
                    {(socialResult.instagram?.hashtags ?? []).join(" ")}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                    <p className="text-[10px] text-muted-foreground">
                      ⏰ Najlepszy czas:{" "}
                      {socialResult.instagram?.bestTime ?? "—"}
                    </p>
                    <p className="text-[10px] italic text-muted-foreground">
                      💡 {socialResult.instagram?.tip ?? ""}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold text-white">
                      f
                    </div>
                    <span className="text-sm font-semibold">Facebook</span>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          socialResult.facebook?.post ?? ""
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="ml-auto rounded-lg bg-white/5 px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-purple-500/10 hover:text-purple-400"
                    >
                      📋 Kopiuj
                    </button>
                  </div>
                  <p className="whitespace-pre-line text-sm text-foreground">
                    {socialResult.facebook?.post ?? ""}
                  </p>
                  <div className="mt-3 border-t border-white/5 pt-3">
                    <p className="text-xs text-blue-400">
                      CTA: {socialResult.facebook?.cta ?? ""}
                    </p>
                    <p className="mt-1 text-[10px] italic text-muted-foreground">
                      💡 {socialResult.facebook?.tip ?? ""}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-black text-xs font-bold text-white">
                      TT
                    </div>
                    <span className="text-sm font-semibold">TikTok</span>
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          `🎬 ${socialResult.tiktok?.hookLine ?? ""}\n\n${socialResult.tiktok?.scriptOutline ?? ""}\n\n${(socialResult.tiktok?.hashtags ?? []).join(" ")}`
                        ).then((ok) =>
                          ok
                            ? toast.success("Skopiowano")
                            : toast.error("Nie udało się skopiować")
                        )
                      }
                      className="ml-auto rounded-lg bg-white/5 px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-purple-500/10 hover:text-purple-400"
                    >
                      📋 Kopiuj
                    </button>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-400">
                      🎬 Hook (pierwsze zdanie):
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {socialResult.tiktok?.hookLine ?? ""}
                    </p>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      📋 Zarys scenariusza:
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">
                      {socialResult.tiktok?.scriptOutline ?? ""}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {(socialResult.tiktok?.hashtags ?? []).join(" ")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "price" ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
                className="w-full rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors"
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
                className="w-full rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors"
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
                Cechy / specyfikacja
              </Label>
              <textarea
                id="priceFeatures"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors"
              />
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">
                Platforma
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
            <button
              type="button"
              onClick={() => void handleAnalyzePrice()}
              disabled={priceLoading || !productName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {priceLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analizuję rynek...
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
                  Analizuję rynek...
                </p>
              </div>
            ) : null}
            {priceResult ? (
              <div className="mt-6 space-y-6">
                <div className="gradient-border rounded-2xl p-8 text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Sugerowana cena sprzedaży
                  </p>
                  <p className="mt-3 text-5xl font-bold text-emerald-400">
                    {priceResult.suggestedPrice} zł
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <p className="text-sm text-muted-foreground">
                      Pewność: {priceResult.confidence}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-red-400">
                      Minimalna
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {priceResult.minPrice} zł
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Niska marża
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 text-center ring-1 ring-emerald-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                      ★ Optymalna
                    </p>
                    <p className="mt-1 text-xl font-bold text-emerald-400">
                      {priceResult.suggestedPrice} zł
                    </p>
                    <p className="mt-1 text-[10px] text-emerald-400/60">
                      Najlepsza marża
                    </p>
                  </div>
                  <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-yellow-400">
                      Maksymalna
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {priceResult.maxPrice} zł
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Premium
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-card/30 p-5">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Analiza AI
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {priceResult.reasoning}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Wskazówki
                  </p>
                  {(priceResult.tips ?? []).map(
                    (tip: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-xl bg-white/2 p-3"
                      >
                        <span className="text-sm text-emerald-400">💡</span>
                        <p className="text-sm text-foreground/70">{tip}</p>
                      </div>
                    )
                  )}
                </div>

                {priceResult.seasonalNote ? (
                  <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <p className="text-sm text-yellow-400">
                        {priceResult.seasonalNote}
                      </p>
                    </div>
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

      {activeTab === "url" ? <CompetitorUrlTab canUse={isProOrScale(plan)} /> : null}
      </div>
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
