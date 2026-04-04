"use client"

import {
  Camera,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react"


import Link from "next/link"
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  hasSubstantiveImageAnalysis,
  type ProductImageAnalysis,
} from "@/lib/generation/product-image-analysis"
import type { ProductImageEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

const MAX_PRODUCT_IMAGES = 5



type Props = {
  productImages: ProductImageEntry[]
  onAddImages: (files: FileList | null) => void | Promise<void>
  onRemoveImage: (id: string) => void
  imageAnalysis: ProductImageAnalysis | null
  /** @deprecated Inline editing removed — use VisionExtractionEditor. Kept for API compat. */
  setImageAnalysis?: (v: ProductImageAnalysis | null) => void
  imageAnalyzing: boolean
  onAnalyzeClick: () => void
  onClearClick: () => void
  /** Vision w kreatorze — plany Pro i Scale. */
  visionUnlocked: boolean
  /** Opcjonalnie: dopisek pod kroki 1–3 (np. Allegro + etykieta/EAN). */
  platformSlug?: string
  /** Pole „Nazwa produktu” z formularza — porównanie z wykrytą nazwą / marką. */
  userProductName?: string
  /** Ustawia nazwę produktu na wartość z Vision („Użyj wykrytej nazwy”). */
  onApplyVisionProductName?: (name: string) => void
}

type ChecklistItem = { text: string; type: "success" | "warning" | "tip" }

function normalizeProductNameForCompare(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

function isFieldBlank(s: string): boolean {
  const t = s.trim().toLowerCase()
  return !t || t === "nieznane" || t === "unknown" || t === "n/a" || t === "brak"
}

function buildVisionSuggestedProductTitle(a: ProductImageAnalysis): string | null {
  const name = a.detectedProductName.trim()
  if (name.length >= 2) return name
  const brand = a.extraction.brand.trim()
  if (brand.length > 0 && !isFieldBlank(a.extraction.brand)) return brand
  return null
}

function visionReadinessChecklist(a: ProductImageAnalysis, platformSlug?: string): {
  ok: ChecklistItem[]
  check: ChecklistItem[]
} {
  const e = a.extraction
  const ok: ChecklistItem[] = []
  const check: ChecklistItem[] = []
  const nameOk = a.detectedProductName.trim().length >= 2
  const vf = e.visible_features.filter((x) => x.trim().length > 0).length
  const hasOcr = e.text_on_product.filter((x) => x.trim().length > 0).length > 0
  const hasIncluded = e.included_items.filter((x) => x.trim().length > 0).length > 0

  if (hasSubstantiveImageAnalysis(a)) {
    ok.push({ type: "success", text: "Wystarczająco danych do opisu" })
  } else {
    check.push({ type: "warning", text: "Uzupełnij typ produktu lub cechy — inaczej generator ponownie odczyta zdjęcie" })
  }
  if (nameOk) {
    ok.push({ type: "success", text: "Nazwa produktu wykryta" })
  } else {
    check.push({ type: "warning", text: "Brak nazwy — wpisz ręcznie w formularzu" })
  }
  if (vf >= 3) {
    ok.push({ type: "success", text: `${vf} cech widocznych — dobry kontekst dla AI` })
  } else if (vf > 0) {
    check.push({ type: "tip", text: "Mało cech widocznych — dopisz z kadru" })
  } else {
    check.push({ type: "warning", text: "Brak cech widocznych — rozważ dopisanie z obrazu" })
  }
  if (e.confidence === "high") {
    ok.push({ type: "success", text: "Dane odczytane poprawnie" })
  } else if (e.confidence === "medium") {
    check.push({ type: "tip", text: "Pewność: średnia — sprawdź markę i model" })
  } else {
    check.push({ type: "warning", text: "Pewność: niska — zweryfikuj markę, model i stan" })
  }

  if (hasOcr) {
    ok.push({ type: "success", text: "Tekst z etykiety odczytany" })
  }
  if (hasIncluded) {
    ok.push({ type: "success", text: "Elementy zestawu wykryte" })
  }

  if (platformSlug === "allegro") {
    if (!isFieldBlank(e.brand)) ok.push({ type: "success", text: "Marka wykryta — filtry Allegro" })
    else check.push({ type: "warning", text: "Brak marki — Allegro filtruje po marce; dopisz z metki" })
    if (!isFieldBlank(e.color)) ok.push({ type: "success", text: "Kolor rozpoznany" })
    else check.push({ type: "tip", text: "Brak koloru — wpływa na filtry boczne Allegro" })
    if (!isFieldBlank(e.material)) ok.push({ type: "success", text: "Materiał wykryty" })
    else check.push({ type: "tip", text: "Brak materiału — dopisz jeśli na metce" })
  } else if (platformSlug === "amazon") {
    if (!isFieldBlank(e.brand)) ok.push({ type: "success", text: "Marka wykryta — wymagana przez Amazon" })
    else check.push({ type: "warning", text: "Brak marki — Amazon wymaga marki (Brand Registry)" })
    if (vf >= 5) ok.push({ type: "success", text: "Cechy wystarczające na 5 Bullet Points" })
    else check.push({ type: "tip", text: "Mniej niż 5 cech — Amazon potrzebuje 5 Bullet Points" })
  } else if (platformSlug === "etsy") {
    if (!isFieldBlank(e.material)) ok.push({ type: "success", text: "Materiał wykryty — Etsy wymaga deklaracji" })
    else check.push({ type: "warning", text: "Brak materiału — Etsy wymaga deklaracji materiałów" })
    if (vf >= 4) ok.push({ type: "success", text: "Cechy wystarczające na tagi Etsy" })
    else check.push({ type: "tip", text: "Mało cech — każda cecha to potencjalny tag (max 13)" })
  } else if (platformSlug === "vinted") {
    if (!isFieldBlank(e.condition)) ok.push({ type: "success", text: "Stan wykryty — obowiązkowy na Vinted" })
    else check.push({ type: "warning", text: "Brak stanu — Vinted wymaga stanu" })
    if (!isFieldBlank(e.brand)) ok.push({ type: "success", text: "Marka wykryta — Vinted filtruje" })
    else check.push({ type: "tip", text: "Brak marki — Vinted filtruje po markach" })
    if (!isFieldBlank(e.color)) ok.push({ type: "success", text: "Kolor wykryty" })
    else check.push({ type: "warning", text: "Brak koloru — obowiązkowe na Vinted" })
  } else if (platformSlug === "ebay") {
    if (!isFieldBlank(e.brand)) ok.push({ type: "success", text: "Marka wykryta — Item Specific" })
    else check.push({ type: "warning", text: "Brak marki — eBay wymaga Item Specifics" })
    if (!isFieldBlank(e.condition)) ok.push({ type: "success", text: "Stan wykryty — wymagany na eBay" })
    else check.push({ type: "warning", text: "Brak stanu — eBay wymaga pola Condition" })
  } else if (platformSlug === "empikplace") {
    if (!isFieldBlank(e.brand)) ok.push({ type: "success", text: "Marka/wydawca wykryta" })
    else check.push({ type: "warning", text: "Brak marki/wydawcy — Empik Place wymaga" })
  } else if (platformSlug === "shopify" || platformSlug === "woocommerce") {
    if (!isFieldBlank(e.brand)) ok.push({ type: "success", text: "Marka wykryta — SEO i karty produktu" })
    else check.push({ type: "tip", text: "Dopisz markę — wpływa na SEO sklepu" })
    if (!isFieldBlank(e.material)) ok.push({ type: "success", text: "Materiał wykryty" })
    else check.push({ type: "tip", text: "Brak materiału — przydatny w opisie i filtrach" })
    if (vf >= 3) ok.push({ type: "success", text: "Wystarczające cechy na kartę produktu" })
    else check.push({ type: "tip", text: "Dodaj cechy — lepsza karta produktu i SEO" })
  } else if (platformSlug === "olx") {
    if (!isFieldBlank(e.condition)) ok.push({ type: "success", text: "Stan wykryty — kluczowy na OLX" })
    else check.push({ type: "warning", text: "Brak stanu — ogłoszenia na OLX wymagają stanu" })
    if (!isFieldBlank(e.brand)) ok.push({ type: "success", text: "Marka wykryta" })
    else check.push({ type: "tip", text: "Dopisz markę — ułatwia wyszukiwanie na OLX" })
  }

  return { ok, check }
}

export function ProductImageVisionPanel({
  productImages,
  onAddImages,
  onRemoveImage,
  imageAnalysis,
  imageAnalyzing,
  onAnalyzeClick,
  onClearClick,
  visionUnlocked,
  platformSlug,
  userProductName = "",
  onApplyVisionProductName,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const effectiveImages = visionUnlocked ? productImages : []
  const effectiveAnalysis = visionUnlocked ? imageAnalysis : null



  const visionSuggestedTitle = useMemo(
    () => (effectiveAnalysis ? buildVisionSuggestedProductTitle(effectiveAnalysis) : null),
    [effectiveAnalysis]
  )

  const visionNameDiffersFromForm = useMemo(() => {
    if (!visionSuggestedTitle) return false
    return (
      normalizeProductNameForCompare(visionSuggestedTitle) !==
      normalizeProductNameForCompare(userProductName)
    )
  }, [visionSuggestedTitle, userProductName])

  const [visionNameBannerDismissed, setVisionNameBannerDismissed] = useState(false)


  /** Nowa propozycja nazwy z analizy — reset banera gdy AI zwróci inną nazwę. */
  useEffect(() => {
    setVisionNameBannerDismissed(false)
  }, [visionSuggestedTitle])

  const prevAnalyzingRef = useRef(imageAnalyzing)
  /** Po zakończeniu analizy (true→false) pokaż ponownie banner, jeśli użytkownik wcześniej kliknął „Pomiń” przy tej samej nazwie. */
  useEffect(() => {
    if (prevAnalyzingRef.current && !imageAnalyzing && effectiveAnalysis) {
      setVisionNameBannerDismissed(false)
    }
    prevAnalyzingRef.current = imageAnalyzing
  }, [imageAnalyzing, effectiveAnalysis])

  const showVisionNameMismatchBanner =
    Boolean(visionUnlocked && effectiveAnalysis && visionSuggestedTitle && visionNameDiffersFromForm) &&
    !visionNameBannerDismissed

  const userHasProductName = Boolean(userProductName.trim())

  const imageAnalysisRef = useRef(imageAnalysis)
  imageAnalysisRef.current = imageAnalysis
  const autoAnalyzeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (autoAnalyzeTimeoutRef.current) clearTimeout(autoAnalyzeTimeoutRef.current)
    }
  }, [])

  const handleAddImages = useCallback(
    async (files: FileList | null) => {
      await Promise.resolve(onAddImages(files))
      if (!files || files.length === 0) return
      if (autoAnalyzeTimeoutRef.current) clearTimeout(autoAnalyzeTimeoutRef.current)
      autoAnalyzeTimeoutRef.current = setTimeout(() => {
        autoAnalyzeTimeoutRef.current = null
        if (imageAnalysisRef.current === null) void onAnalyzeClick()
      }, 300)
    },
    [onAddImages, onAnalyzeClick]
  )

  const showEmptyDropZone =
    visionUnlocked &&
    effectiveImages.length === 0 &&
    !imageAnalyzing &&
    !effectiveAnalysis

  const visionSteps = [
    { label: "Wrzuć zdjęcia", done: effectiveImages.length > 0 },
    { label: "AI analizuje", done: !!effectiveAnalysis, active: effectiveImages.length > 0 && !effectiveAnalysis },
    { label: "Uzupełnij formularz", done: false },
  ] as const

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 md:p-5",
        visionUnlocked ? "border-[#1a2e1c] bg-[#0d1a0f] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]" : "border-white/10 bg-[#0d1a0f]"
      )}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,197,94,0.6) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,197,94,0.6) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative z-10">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                <Camera className="h-4 w-4 text-emerald-400" aria-hidden />
                <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              </div>
              <div>
                <span className="text-[13px] font-bold uppercase tracking-[.2em] text-white/90">Vision</span>
                <p className="mt-0.5 text-[10px] text-[#3d5e40]">AI rozpoznaje produkt ze zdjęcia</p>
              </div>
            </div>
            {visionUnlocked ? (
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Aktywne
              </span>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground/60">Pro · Scale</span>
            )}
          </div>
          {!effectiveAnalysis && (
            <div className="flex items-center gap-2 mb-5">
              {visionSteps.map((step, i) => (
                <Fragment key={step.label}>
                  <span
                    className={[
                      "text-[10px] font-medium px-3 py-1.5 rounded-full border transition-all duration-300",
                      step.done
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "active" in step && step.active
                          ? "bg-emerald-500/12 border-emerald-400/35 text-emerald-300 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                          : "bg-transparent border-[#162118] text-[#2d3d2f]",
                    ].join(" ")}
                  >
                    {step.done ? "✓ " : ""}
                    {step.label}
                  </span>
                  {i < visionSteps.length - 1 && (
                    <span
                      className={
                        visionSteps[i].done
                          ? "text-[10px] text-emerald-500"
                          : "text-[10px] text-[#1a2e1c]"
                      }
                    >
                      →
                    </span>
                  )}
                </Fragment>
              ))}
            </div>
          )}

          {effectiveAnalysis ? (
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5">
              <svg
                className="h-3.5 w-3.5 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[11px] font-medium text-emerald-400">Analiza zakończona</span>
            </div>
          ) : null}

          {showVisionNameMismatchBanner && visionSuggestedTitle ? (
            <div
              role="status"
              aria-live="polite"
              className="relative z-20 mb-4 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/6 p-4 text-left pointer-events-auto"
            >
              <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-linear-to-b from-emerald-400 to-emerald-600" />
              <div className="space-y-3 pl-3">
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-[.1em] text-emerald-500/70">
                    Wykryty produkt
                  </p>
                  <p className="text-[14px] font-semibold text-white/90">{visionSuggestedTitle}</p>
                </div>
                {userHasProductName ? (
                  <p className="text-[11px] text-[#5a7a5d]">
                    W formularzu masz: <span className="text-[#8aaa8d]">{userProductName.trim()}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-[#5a7a5d]">Pole „Nazwa produktu” jest puste</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-[#050f06] transition-all hover:bg-emerald-400 hover:shadow-[0_0_16px_rgba(34,197,94,0.25)]"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onApplyVisionProductName?.(visionSuggestedTitle)
                      setVisionNameBannerDismissed(true)
                    }}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {userHasProductName ? "Użyj wykrytej" : "Wstaw nazwę"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#1a2e1c] bg-transparent px-4 py-2 text-[12px] text-[#5a7a5d] transition-all hover:bg-white/5 hover:text-[#8aaa8d]"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setVisionNameBannerDismissed(true)
                    }}
                  >
                    Pomiń
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!visionUnlocked ? (
            <p className="mb-4 text-[10px] leading-[1.65] text-muted-foreground/85">
              Po odblokowaniu dodajesz zdjęcia, uruchamiasz ekstrakcję i przenosisz dane do formularza — z pełną kontrolą
              przed generacją opisu.
            </p>
          ) : null}

          {!visionUnlocked ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/25 px-4 py-3.5">
              <p className="text-[11px] leading-relaxed text-emerald-100/90">
                Odczyt z kadru, edycja ekstrakcji, checklista i przenoszenie do nazwy oraz cech — dostępne w planach{" "}
                <span className="font-semibold text-white/95">Pro</span> i{" "}
                <span className="font-semibold text-white/95">Scale</span>.
              </p>
              <Link
                href="/dashboard/settings"
                className="mt-3 inline-flex items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-[12px] font-semibold text-emerald-50 transition-colors hover:bg-emerald-500/25"
              >
                Ustawienia konta — plany
              </Link>
            </div>
          ) : null}

          {visionUnlocked ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleAddImages(e.target.files)
                  e.target.value = ""
                }}
              />

              {showEmptyDropZone ? (
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      fileRef.current?.click()
                    }
                  }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    void handleAddImages(e.dataTransfer.files)
                  }}
                  className="group mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/20 bg-linear-to-b from-emerald-500/3 to-transparent px-8 py-14 text-center transition-all hover:border-emerald-500/35 hover:from-emerald-500/6 hover:shadow-[inset_0_0_40px_rgba(34,197,94,0.04)]"
                >
                  <div className="relative mx-auto mb-6 h-16 w-16">
                    <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/8 [animation-duration:3s]" />
                    <div className="absolute inset-0 rounded-full border border-emerald-500/20" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500/8">
                      <Upload className="h-5 w-5 text-emerald-400 transition-transform group-hover:-translate-y-0.5" aria-hidden />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[14px] font-semibold tracking-[-0.01em] text-white/95">
                      Przeciągnij zdjęcia lub kliknij
                    </p>
                    <p className="text-[11px] text-[#5a8a5e]">
                      Do 5 zdjęć · JPG PNG WEBP ·{" "}
                      <span className="text-emerald-400/70">AI wyciągnie dane w kilka sekund</span>
                    </p>
                  </div>
                </div>
              ) : null}

              {effectiveImages.length > 0 ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {effectiveImages.map((img) => (
                      <div key={img.id} className="relative group inline-block mt-1 mb-2">
                        <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                        <div className="relative overflow-hidden rounded-2xl bg-[#111f13] p-1.5 ring-1 ring-white/10 group-hover:ring-emerald-500/25 transition-all duration-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.dataUrl}
                            alt={img.id}
                            className={cn(
                              "rounded-xl object-cover",
                              effectiveAnalysis ? "h-24 w-24" : "h-36 w-36"
                            )}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveImage(img.id)}
                          className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#1a2e1c] bg-[#0d1a0f] text-[#5a7a5d] shadow-lg transition-all duration-200 hover:border-red-500/25 hover:bg-red-500/15 hover:text-red-400"
                          aria-label={`Usuń zdjęcie${img.name ? `: ${img.name}` : ""}`}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      {effectiveImages.length >= MAX_PRODUCT_IMAGES ? (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled
                          title={`Osiągnięto limit ${MAX_PRODUCT_IMAGES} zdjęć — usuń miniatury, aby dodać inne ujęcia.`}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#1a2e1c] bg-[#0d1a0f] px-4 py-2.5 text-[11px] font-medium text-[#8aaa8d] transition-all duration-200 hover:border-emerald-500/25 hover:bg-emerald-500/5 hover:text-emerald-400 hover:shadow-[0_0_12px_rgba(34,197,94,0.08)] disabled:opacity-60"
                        >
                          <Upload className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
                          Dodaj kolejne{" "}
                          <span className="tabular-nums">
                            ({effectiveImages.length}/{MAX_PRODUCT_IMAGES})
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#1a2e1c] bg-[#0d1a0f] px-4 py-2.5 text-[11px] font-medium text-[#8aaa8d] transition-all duration-200 hover:border-emerald-500/25 hover:bg-emerald-500/5 hover:text-emerald-400 hover:shadow-[0_0_12px_rgba(34,197,94,0.08)]"
                        >
                          <Upload className="h-3 w-3 shrink-0" aria-hidden />
                          Dodaj kolejne{" "}
                          <span className="tabular-nums text-muted-foreground">
                            ({effectiveImages.length}/{MAX_PRODUCT_IMAGES})
                          </span>
                        </button>
                      )}
                      {effectiveAnalysis ? (
                        <button
                          type="button"
                          onClick={() => void onAnalyzeClick()}
                          disabled={imageAnalyzing}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#3d5e40] transition-all hover:text-emerald-400 disabled:opacity-50"
                        >
                          {imageAnalyzing ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              Analizuję…
                            </span>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 shrink-0" aria-hidden />
                              Ponowna analiza
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={onClearClick}
                      className="text-[11px] text-[#2d3d2f] font-medium transition-all duration-200 hover:text-red-400/70"
                      title="Usuwa miniatury zdjęć oraz wynik ekstrakcji AI"
                    >
                      Wyczyść
                    </button>
                  </div>

                  {!effectiveAnalysis ? (
                    <button
                      type="button"
                      onClick={() => void onAnalyzeClick()}
                      disabled={imageAnalyzing}
                      className="group relative mt-4 w-full overflow-hidden rounded-2xl py-4 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-45 disabled:hover:translate-y-0"
                      style={{
                        background: "linear-gradient(90deg, #22c55e 0%, #4ade80 30%, #86efac 50%, #4ade80 70%, #22c55e 100%)",
                        backgroundSize: "300% 100%",
                      }}
                    >
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                      <div className="pointer-events-none absolute -bottom-3 inset-x-8 h-8 rounded-full bg-emerald-400/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                      <span className="relative flex items-center justify-center gap-2.5 text-[14px] font-bold tracking-[-0.01em] text-[#052e16]">
                        <Sparkles className="h-[18px] w-[18px]" />
                        {imageAnalyzing ? "Analizuję zdjęcie..." : "Wyciągnij dane ze zdjęcia"}
                      </span>
                    </button>
                  ) : null}
                </>
              ) : null}

              {effectiveImages.length === 0 && effectiveAnalysis !== null ? (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={onClearClick}
                    className="text-[11px] text-[#2d3d2f] font-medium transition-all duration-200 hover:text-red-400/70"
                    title="Usuwa miniatury zdjęć oraz wynik ekstrakcji AI"
                  >
                    Wyczyść
                  </button>
                </div>
              ) : null}



            </>
          ) : null}
      </div>
    </div>
  )
}
