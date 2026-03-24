"use client"

import Link from "next/link"
import { useRef, useState, type CSSProperties } from "react"
import toast from "react-hot-toast"

import { useUser } from "@/hooks/useUser"

const presets = [
  { id: "none", label: "Oryginał", brightness: 100, contrast: 100, saturation: 100, warmth: 0 },
  { id: "bright", label: "Jasne", brightness: 110, contrast: 105, saturation: 105, warmth: 5 },
  { id: "warm", label: "Ciepłe", brightness: 105, contrast: 100, saturation: 110, warmth: 15 },
  { id: "cool", label: "Chłodne", brightness: 100, contrast: 105, saturation: 90, warmth: -10 },
  { id: "vivid", label: "Żywe", brightness: 105, contrast: 115, saturation: 130, warmth: 0 },
  { id: "muted", label: "Stonowane", brightness: 105, contrast: 95, saturation: 70, warmth: 5 },
  { id: "dramatic", label: "Dramatyczne", brightness: 95, contrast: 125, saturation: 110, warmth: 0 },
] as const

const sceneCategories = [
  {
    category: "E-commerce",
    icon: "🛒",
    description: "Czyste tła pod sprzedaż online",
    scenes: [
      { id: "allegro-main", name: "Allegro / OLX", emoji: "🛒", desc: "Białe tło, standard e-commerce", tag: "ALLEGRO" as const },
      { id: "amazon-main", name: "Amazon", emoji: "📦", desc: "Czysto białe #FFF, wymogi Amazon", tag: "AMAZON" as const },
      { id: "ecommerce-clean", name: "Jasne szare", emoji: "🔲", desc: "Delikatne szare, uniwersalne", tag: null },
      { id: "ecommerce-gradient", name: "Gradient", emoji: "🌫️", desc: "Biały→szary, premium sklep", tag: null },
    ],
  },
  {
    category: "Lifestyle",
    icon: "📸",
    description: "Produkt w kontekście życiowym",
    scenes: [
      { id: "lifestyle-table", name: "Drewniany stół", emoji: "🪵", desc: "Ciepłe światło, kawa w tle", tag: null },
      { id: "lifestyle-minimal", name: "Minimalizm", emoji: "🤍", desc: "Jasne, skandynawskie, czyste", tag: null },
      { id: "lifestyle-outdoor", name: "Outdoor", emoji: "🌿", desc: "Ogród, złota godzina", tag: null },
    ],
  },
  {
    category: "Premium",
    icon: "✨",
    description: "Luksusowe tła dla marek premium",
    scenes: [
      { id: "luxury-marble", name: "Marmur", emoji: "🏛️", desc: "Biały marmur, studio light", tag: "BESTSELLER" as const },
      { id: "luxury-dark", name: "Dark Premium", emoji: "🖤", desc: "Aksamit, dramatyczne światło", tag: "PREMIUM" as const },
      { id: "luxury-silk", name: "Jedwab", emoji: "🎀", desc: "Kremowy jedwab, eleganckie", tag: null },
    ],
  },
  {
    category: "Sezonowe",
    icon: "📅",
    description: "Dopasowane do pory roku i okazji",
    scenes: [
      { id: "seasonal-christmas", name: "Święta", emoji: "🎄", desc: "Aksamit, światełka, prezent", tag: "SEZONOWE" as const },
      { id: "seasonal-spring", name: "Wiosna", emoji: "🌸", desc: "Kwiaty, pastele, świeżość", tag: null },
      { id: "seasonal-summer", name: "Lato", emoji: "☀️", desc: "Plaża, słońce, wakacje", tag: null },
    ],
  },
  {
    category: "Social Media",
    icon: "📱",
    description: "Eye-catching dla Instagram/TikTok",
    scenes: [
      { id: "social-aesthetic", name: "Aesthetic", emoji: "🎨", desc: "Trendy, kolorowe, Instagram", tag: "INSTA" as const },
      { id: "social-flatlay", name: "Flat Lay", emoji: "📐", desc: "Widok z góry, props wokół", tag: null },
    ],
  },
] as const

const EXPORT_PRESETS = [
  {
    w: 1000,
    h: 1000,
    file: "1x1-1000-allegro-amazon-shopify",
    label: "1:1 — 1000×1000",
    hint: "Allegro, Amazon, Shopify",
  },
  {
    w: 2000,
    h: 2000,
    file: "1x1-2000-amazon-hd",
    label: "1:1 — 2000×2000",
    hint: "Amazon HD (zalecane)",
  },
  {
    w: 1080,
    h: 1350,
    file: "4x5-1080x1350-instagram-pinterest",
    label: "4:5 — 1080×1350",
    hint: "Instagram, Pinterest",
  },
  {
    w: 1920,
    h: 1080,
    file: "16x9-1920x1080-shopify-facebook",
    label: "16:9 — 1920×1080",
    hint: "Shopify banner, Facebook cover",
  },
  {
    w: 900,
    h: 1200,
    file: "3x4-900x1200-pinterest",
    label: "3:4 — 900×1200",
    hint: "Pinterest optimal",
  },
] as const

const RANGE_CLASS =
  "w-full h-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-500 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"

function resultImageFilterStyle(
  brightness: number,
  contrast: number,
  saturation: number,
  warmth: number
): CSSProperties {
  return {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${warmth > 0 ? `sepia(${warmth}%)` : ""} ${warmth < 0 ? `hue-rotate(${warmth * 2}deg)` : ""}`.trim(),
  }
}

function canvasFilterString(
  brightness: number,
  contrast: number,
  saturation: number,
  warmth: number
): string {
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)${warmth > 0 ? ` sepia(${warmth}%)` : ""}${warmth < 0 ? ` hue-rotate(${warmth * 2}deg)` : ""}`
}

type PreviewTab = "original" | "result" | "compare"

export default function PhotoStudioPage() {
  const { profile } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const compareContainerRef = useRef<HTMLDivElement>(null)

  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewTab, setPreviewTab] = useState<PreviewTab>("original")
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)

  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [warmth, setWarmth] = useState(0)
  const [activePreset, setActivePreset] = useState("none")

  const [activeCategory, setActiveCategory] = useState("E-commerce")
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) loadImage(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadImage(file)
  }

  function loadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB. Spróbuj mniejsze zdjęcie.")
      return
    }
    setOriginalFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setOriginalImage(ev.target?.result as string)
      setResultImage(null)
      setSelectedScene("")
      setPreviewTab("original")
      setSliderPosition(50)
      setIsDraggingSlider(false)
      setActiveCategory("E-commerce")
      setShowCustomPrompt(false)
      setCustomPrompt("")
    }
    reader.readAsDataURL(file)
  }

  async function handleGenerate(sceneId: string) {
    if (!originalImage) return

    setProcessing(true)
    setSelectedScene(sceneId)
    setProcessingStep("Wysyłam do Nano Banana Pro...")

    try {
      const response = await fetch("/api/photo-studio-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: originalImage,
          scene: sceneId,
          productDescription: productDescription || undefined,
          customPrompt:
            sceneId === "custom" ? customPrompt.trim() || undefined : undefined,
        }),
      })

      setProcessingStep("AI przetwarza zdjęcie...")

      const data = (await response.json()) as { error?: string; resultImage?: string }

      if (!response.ok) {
        toast.error(data.error || "Błąd generowania")
        return
      }

      if (!data.resultImage) {
        toast.error("Brak obrazu w odpowiedzi")
        return
      }

      setResultImage(data.resultImage)
      setPreviewTab("compare")
      setSliderPosition(50)
      toast.success("Profesjonalne zdjęcie gotowe! ✨")

      try {
        const confettiModule = await import("canvas-confetti")
        confettiModule.default({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.7 },
          colors: ["#10B981", "#34D399"],
        })
      } catch {
        /* ignore */
      }
    } catch (error) {
      console.error(error)
      toast.error("Błąd połączenia. Sprawdź internet.")
    } finally {
      setProcessing(false)
      setProcessingStep("")
    }
  }

  function applyPreset(preset: (typeof presets)[number]) {
    setBrightness(preset.brightness)
    setContrast(preset.contrast)
    setSaturation(preset.saturation)
    setWarmth(preset.warmth)
    setActivePreset(preset.id)
  }

  function resetFilters() {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setWarmth(0)
    setActivePreset("none")
  }

  function handleCompareMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!compareContainerRef.current) return
    if (!isDraggingSlider && e.buttons !== 1) return
    const rect = compareContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(2, Math.min(98, (x / rect.width) * 100))
    setSliderPosition(percent)
  }

  function handleCompareTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!compareContainerRef.current) return
    const touch = e.touches[0]
    const rect = compareContainerRef.current.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const percent = Math.max(2, Math.min(98, (x / rect.width) * 100))
    setSliderPosition(percent)
  }

  function applyFiltersAndDownload(width: number, height: number, name: string) {
    if (!resultImage) return

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.filter = canvasFilterString(brightness, contrast, saturation, warmth)

    const img = new Image()
    if (
      resultImage.startsWith("http://") ||
      resultImage.startsWith("https://")
    ) {
      img.crossOrigin = "anonymous"
    }
    img.onload = () => {
      const imgRatio = img.width / img.height
      const canvasRatio = width / height
      let sx = 0
      let sy = 0
      let sw = img.width
      let sh = img.height
      if (imgRatio > canvasRatio) {
        sw = img.height * canvasRatio
        sx = (img.width - sw) / 2
      } else {
        sh = img.width / canvasRatio
        sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)

      const link = document.createElement("a")
      link.download = `${name}.jpg`
      link.href = canvas.toDataURL("image/jpeg", 0.92)
      link.click()
      toast.success(`Pobrano ${name}! 📸`)
    }
    img.onerror = () => toast.error("Nie udało się przygotować pliku.")
    img.src = resultImage
  }

  function downloadImage() {
    if (!resultImage) return
    applyFiltersAndDownload(1024, 1024, "photo-studio")
  }

  function downloadWithSize(width: number, height: number, name: string) {
    applyFiltersAndDownload(width, height, name)
  }

  async function downloadAll() {
    for (let i = 0; i < EXPORT_PRESETS.length; i++) {
      const p = EXPORT_PRESETS[i]
      downloadWithSize(p.w, p.h, p.file)
      if (i < EXPORT_PRESETS.length - 1) {
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }

  function resetAll() {
    setOriginalImage(null)
    setOriginalFile(null)
    setResultImage(null)
    setSelectedScene("")
    setProductDescription("")
    setPreviewTab("original")
    setSliderPosition(50)
    setIsDraggingSlider(false)
    setActiveCategory("E-commerce")
    setShowCustomPrompt(false)
    setCustomPrompt("")
    resetFilters()
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const isFreePlan = profile?.plan === "free" || !profile

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
      {/* Nagłówek */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            📸 AI Photo Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wrzuć zdjęcie z telefonu → AI zamieni je w profesjonalną fotkę
          </p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-400 ring-1 ring-orange-500/30">
          BETA
        </span>
      </div>

      {!originalImage ? (
        <>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 md:p-16 ${
              isDragOver
                ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                : "border-white/15 bg-card/20 hover:border-emerald-500/40 hover:bg-card/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="mx-auto space-y-5">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                <span className="text-4xl" aria-hidden>
                  📸
                </span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Wrzuć surowe zdjęcie produktu
              </h3>
              <p className="text-muted-foreground">
                AI przerobi je w profesjonalną fotkę produktową
              </p>
              <p className="text-xs text-muted-foreground/50">
                JPG lub PNG • Max 5MB • Zdjęcie prosto z telefonu
              </p>
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto flex aspect-square w-24 items-center justify-center rounded-2xl border border-white/5 bg-orange-500/10">
                <span className="text-3xl" aria-hidden>
                  📱
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Surowe zdjęcie</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl text-emerald-400" aria-hidden>
                →
              </span>
            </div>
            <div className="text-center">
              <div className="mx-auto flex aspect-square w-24 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                <span className="text-3xl" aria-hidden>
                  ✨
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-emerald-400">
                Profesjonalne
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEWA — podgląd */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-card/30">
              <div className="flex border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setPreviewTab("original")}
                  className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${
                    previewTab === "original"
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📱 Oryginał
                </button>
                <button
                  type="button"
                  disabled={!resultImage}
                  onClick={() => setPreviewTab("result")}
                  className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    previewTab === "result"
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ✨ Gotowe
                </button>
                {resultImage ? (
                  <button
                    type="button"
                    onClick={() => setPreviewTab("compare")}
                    className={`flex-1 border-b-2 px-4 py-3 text-xs font-medium transition-all ${
                      previewTab === "compare"
                        ? "border-emerald-500 text-emerald-400"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⚡ Porównaj
                  </button>
                ) : null}
              </div>

              <div className="relative flex aspect-square items-center justify-center bg-card/50 p-4">
                {previewTab === "original" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={originalImage}
                    alt="Oryginał"
                    className="max-h-full max-w-full rounded-xl object-contain"
                  />
                ) : null}
                {previewTab === "result" && resultImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resultImage}
                    alt="Wynik AI"
                    className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                    style={resultImageFilterStyle(
                      brightness,
                      contrast,
                      saturation,
                      warmth
                    )}
                  />
                ) : null}
                {previewTab === "compare" && resultImage && originalImage ? (
                  <div
                    ref={compareContainerRef}
                    className="relative aspect-square w-full max-h-full min-h-0 cursor-col-resize select-none overflow-hidden"
                    onMouseMove={handleCompareMove}
                    onMouseDown={() => setIsDraggingSlider(true)}
                    onMouseUp={() => setIsDraggingSlider(false)}
                    onMouseLeave={() => setIsDraggingSlider(false)}
                    onTouchMove={handleCompareTouchMove}
                    onTouchStart={() => setIsDraggingSlider(true)}
                    onTouchEnd={() => setIsDraggingSlider(false)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resultImage}
                      alt="Po"
                      className="absolute inset-0 h-full w-full object-contain p-4"
                      style={{
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                      }}
                      draggable={false}
                    />
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={originalImage}
                        alt="Przed"
                        className="absolute inset-0 h-full w-full object-contain p-4"
                        draggable={false}
                      />
                    </div>
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                      style={{ left: `${sliderPosition}%` }}
                    />
                    <div
                      className="pointer-events-none absolute top-1/2 z-20 flex w-10 -translate-x-1/2 -translate-y-1/2 cursor-col-resize items-center justify-center rounded-full bg-white shadow-xl"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <span className="select-none text-xs font-bold text-gray-800">
                        ⟷
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/40 px-2 py-1 backdrop-blur-sm">
                      <span className="text-xs font-medium text-white">
                        📱 Przed
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 z-10 rounded-lg bg-emerald-500/80 px-2 py-1 backdrop-blur-sm">
                      <span className="text-xs font-medium text-white">
                        ✨ Po
                      </span>
                    </div>
                  </div>
                ) : null}

                {processing ? (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div
                      className="mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent"
                      aria-hidden
                    />
                    <p className="text-base font-medium text-foreground">
                      {processingStep}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Nano Banana Pro przetwarza zdjęcie...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      To może potrwać 20-40 sekund
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-white/5 p-4">
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-sm text-muted-foreground transition-colors hover:text-red-400"
                >
                  🗑️ Nowe zdjęcie
                </button>
                <div className="flex gap-2">
                  {resultImage ? (
                    <button
                      type="button"
                      onClick={downloadImage}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
                    >
                      ⬇️ Pobierz
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* PRAWA — narzędzia */}
          <div className="space-y-5 lg:col-span-5">
            <div className="rounded-2xl border border-white/5 bg-card/30 p-4">
              <label
                htmlFor="product-desc"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Co jest na zdjęciu? (opcjonalnie)
              </label>
              <input
                id="product-desc"
                type="text"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="np. Portfel skórzany brązowy, kubek ceramiczny biały..."
                className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Pomaga AI lepiej rozpoznać i zachować produkt
              </p>
              {originalFile ? (
                <p className="mt-2 truncate text-[10px] text-muted-foreground/70">
                  {originalFile.name}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/5 bg-card/30 p-4">
              {isFreePlan ? (
                <div className="py-6 text-center">
                  <span className="text-3xl" aria-hidden>
                    🔒
                  </span>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Photo Studio dostępne od planu Growth
                  </p>
                  <Link
                    href="/dashboard/settings"
                    className="mt-3 inline-block text-xs text-emerald-400 hover:underline"
                  >
                    Upgrade (99 zł/mies) →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      ✨ Wybierz styl zdjęcia
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                        AI
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground transition-all hover:border-white/20 hover:text-foreground"
                      >
                        {showCustomPrompt
                          ? "Gotowe style ←"
                          : "Własny prompt →"}
                      </button>
                    </div>
                  </div>

                  {showCustomPrompt ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Opisz jak ma wyglądać zdjęcie. AI zachowa produkt i zmieni
                        otoczenie.
                      </p>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        rows={4}
                        placeholder="np. Postaw produkt na marmurowym blacie kuchennym. W tle rozmyte zielone rośliny. Ciepłe światło z okna po lewej stronie. Profesjonalna fotka lifestyle do sklepu Shopify."
                        className="w-full resize-none rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />

                      <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3">
                        <p className="mb-1 text-[10px] font-medium text-emerald-400">
                          💡 Wskazówki:
                        </p>
                        <ul className="space-y-0.5 text-[10px] text-muted-foreground">
                          <li>
                            • Opisz GDZIE ma stać produkt (na czym, jaka
                            powierzchnia)
                          </li>
                          <li>
                            • Opisz ŚWIATŁO (ciepłe/zimne, z której strony,
                            jasne/ciemne)
                          </li>
                          <li>
                            • Opisz ATMOSFERĘ (luksusowa, codzienna, świąteczna)
                          </li>
                          <li>
                            • Opisz TŁO (co jest za produktem, ostre czy rozmyte)
                          </li>
                          <li>
                            • NIE opisuj samego produktu — AI go zachowa z
                            oryginału
                          </li>
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleGenerate("custom")}
                        disabled={processing || !customPrompt.trim()}
                        className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:opacity-40"
                      >
                        {processing ? "AI przetwarza..." : "✨ Generuj z własnym promptem"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-2">
                        {sceneCategories.map((cat) => (
                          <button
                            key={cat.category}
                            type="button"
                            onClick={() => setActiveCategory(cat.category)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                              activeCategory === cat.category
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                : "border-white/5 text-muted-foreground hover:border-white/10"
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.category}</span>
                          </button>
                        ))}
                      </div>

                      <p className="mb-3 text-[10px] text-muted-foreground">
                        {
                          sceneCategories.find((c) => c.category === activeCategory)
                            ?.description
                        }
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {sceneCategories
                          .find((c) => c.category === activeCategory)
                          ?.scenes.map((scene) => (
                            <button
                              key={scene.id}
                              type="button"
                              onClick={() => void handleGenerate(scene.id)}
                              disabled={processing}
                              className={`relative rounded-xl border p-3 text-left transition-all disabled:opacity-40 ${
                                selectedScene === scene.id
                                  ? "border-emerald-500 bg-emerald-500/5"
                                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
                              }`}
                            >
                              {scene.tag ? (
                                <span className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] leading-none font-bold text-black">
                                  {scene.tag}
                                </span>
                              ) : null}
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">{scene.emoji}</span>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-foreground">
                                    {scene.name}
                                  </p>
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {scene.desc}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>

                      <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                        {activeCategory === "E-commerce" ? (
                          <p className="text-[10px] text-muted-foreground">
                            📋 Allegro wymaga: białe tło, min 800×800, brak tekstu
                            i watermark. Amazon wymaga: #FFFFFF, min 85% kadru.
                          </p>
                        ) : null}
                        {activeCategory === "Lifestyle" ? (
                          <p className="text-[10px] text-muted-foreground">
                            📸 Zdjęcia lifestyle zwiększają konwersję o 20-30%.
                            Idealne jako dodatkowe zdjęcia obok głównego białego.
                          </p>
                        ) : null}
                        {activeCategory === "Premium" ? (
                          <p className="text-[10px] text-muted-foreground">
                            ✨ Luksusowe tła podnoszą postrzeganą wartość produktu.
                            Idealne dla biżuterii, zegarków, skórzanych produktów.
                          </p>
                        ) : null}
                        {activeCategory === "Sezonowe" ? (
                          <p className="text-[10px] text-muted-foreground">
                            📅 Sezonowe zdjęcia zwiększają sprzedaż o 15-40% w
                            okresach świątecznych. Przygotuj je z wyprzedzeniem!
                          </p>
                        ) : null}
                        {activeCategory === "Social Media" ? (
                          <p className="text-[10px] text-muted-foreground">
                            📱 Instagram preferuje format 4:5. Użyj żywych kolorów
                            i kontekstu użycia. Eksportuj w rozmiarze portret.
                          </p>
                        ) : null}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {resultImage ? (
              <div className="rounded-2xl border border-white/5 bg-card/30 p-4">
                <h3 className="mb-3 text-sm font-semibold">🎛️ Dostosuj</h3>

                <div className="mb-4">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Szybkie filtry
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                          activePreset === preset.id
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-white/5 text-muted-foreground hover:border-white/10"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between">
                      <label className="text-xs text-muted-foreground">
                        Jasność
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {brightness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={80}
                      max={120}
                      value={brightness}
                      onChange={(e) => {
                        setBrightness(Number(e.target.value))
                        setActivePreset("custom")
                      }}
                      className={RANGE_CLASS}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <label className="text-xs text-muted-foreground">
                        Kontrast
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {contrast}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={80}
                      max={120}
                      value={contrast}
                      onChange={(e) => {
                        setContrast(Number(e.target.value))
                        setActivePreset("custom")
                      }}
                      className={RANGE_CLASS}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <label className="text-xs text-muted-foreground">
                        Nasycenie
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {saturation}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      value={saturation}
                      onChange={(e) => {
                        setSaturation(Number(e.target.value))
                        setActivePreset("custom")
                      }}
                      className={RANGE_CLASS}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <label className="text-xs text-muted-foreground">
                        Ciepłota
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {warmth < 0
                          ? "Chłodne"
                          : warmth > 0
                            ? "Ciepłe"
                            : "Neutralne"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      value={warmth}
                      onChange={(e) => {
                        setWarmth(Number(e.target.value))
                        setActivePreset("custom")
                      }}
                      className={RANGE_CLASS}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 w-full rounded-lg border border-white/5 py-2 text-xs text-muted-foreground hover:border-white/10 hover:text-foreground"
                >
                  ↺ Resetuj
                </button>
              </div>
            ) : null}

            {resultImage ? (
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-emerald-400">
                  ⬇️ Eksport
                </h3>
                <div className="space-y-2">
                  {EXPORT_PRESETS.map((p) => (
                    <button
                      key={p.file}
                      type="button"
                      onClick={() => downloadWithSize(p.w, p.h, p.file)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/5 p-2.5 text-left text-sm transition-all hover:border-emerald-500/20"
                    >
                      <span className="min-w-0 font-medium text-foreground">
                        {p.label}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {p.hint}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void downloadAll()}
                    className="mt-2 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-medium text-black hover:bg-emerald-400"
                  >
                    📦 Pobierz wszystkie (5 rozmiarów)
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
