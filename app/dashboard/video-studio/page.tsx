"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import toast from "react-hot-toast"

import { useUser } from "@/hooks/useUser"

type AspectRatio = "16:9" | "9:16" | "1:1"
type Duration = 5 | 8

const SCENE_PRESETS = [
  {
    id: "packshot-rotate",
    emoji: "🔄",
    name: "Obrót 360°",
    desc: "Kamera okrąża nieruchomy produkt na białym tle — idealny na listing",
    tag: "BESTSELLER" as const,
    qualityTier: "standard" as const,
  },
  {
    id: "packshot-zoom",
    emoji: "🔍",
    name: "Zbliżenie detali",
    desc: "Powolny zoom kamery na detale i teksturę — produkt bez ruchu",
    tag: null,
    qualityTier: "standard" as const,
  },
  {
    id: "lifestyle-desk",
    emoji: "🪵",
    name: "Lifestyle — biurko",
    desc: "Produkt na drewnianym blacie, ciepłe poranne światło",
    tag: null,
    qualityTier: "premium" as const,
  },
  {
    id: "lifestyle-outdoor",
    emoji: "🌿",
    name: "Lifestyle — plener",
    desc: "Złota godzina, bokeh, naturalne otoczenie",
    tag: null,
    qualityTier: "premium" as const,
  },
  {
    id: "luxury-dark",
    emoji: "🖤",
    name: "Dark Premium",
    desc: "Dramatyczne reveal z ciemności — luksusowy efekt",
    tag: "PREMIUM" as const,
    qualityTier: "premium" as const,
  },
  {
    id: "social-dynamic",
    emoji: "⚡",
    name: "Social Dynamic",
    desc: "Energetyczny, eye-catching — idealne na Reels i TikTok",
    tag: "SOCIAL" as const,
    qualityTier: "premium" as const,
  },
] as const

const FORMAT_OPTIONS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: "16:9", label: "16:9", hint: "Listing, YouTube, Facebook" },
  { value: "9:16", label: "9:16", hint: "Reels, TikTok, Stories" },
  { value: "1:1", label: "1:1", hint: "Feed, Allegro, Amazon" },
]

const TAG_STYLES = {
  BESTSELLER: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25",
  PREMIUM: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25",
  SOCIAL: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/25",
  PRO1080: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-500/30",
} as const

export default function VideoStudioPage() {
  const { profile } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [originalFileName, setOriginalFileName] = useState<string>("")
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState<string>("")
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9")
  const [duration, setDuration] = useState<Duration>(5)
  const [productDescription, setProductDescription] = useState("")
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [generatedScene, setGeneratedScene] = useState<string>("")
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null)

  const isFreePlan = profile?.plan === "free" || !profile

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Obsługiwane formaty: JPG, PNG, WebP")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maksymalny rozmiar pliku to 5 MB")
      return
    }
    const base64 = await readFileAsBase64(file)
    setOriginalImage(base64)
    setOriginalFileName(file.name)
    setResultVideoUrl(null)
    setSelectedScene("")
    setGeneratedScene("")
    setLastModelUsed(null)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handleGenerate(sceneId: string) {
    if (!originalImage) return

    setProcessing(true)
    setSelectedScene(sceneId)
    setResultVideoUrl(null)
    setLastModelUsed(null)

    const steps = [
      "Analizuję zdjęcie produktu…",
      "Buduję prompt dla AI…",
      "Genruję wideo (to chwilę potrwa)…",
      "Finalizing…",
    ]
    let stepIdx = 0
    setProcessingStep(steps[0])
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1)
      setProcessingStep(steps[stepIdx])
    }, 8000)

    try {
      const res = await fetch("/api/video-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: originalImage,
          scene: sceneId,
          productDescription: productDescription.trim() || undefined,
          aspectRatio,
          duration,
        }),
      })

      clearInterval(interval)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 403) {
          toast.error("Video Studio dostępne od planu Growth")
        } else {
          toast.error(data.error ?? "Błąd generowania wideo")
        }
        setProcessing(false)
        return
      }

      const data = await res.json() as { videoUrl?: string; modelUsed?: string }
      setResultVideoUrl(data.videoUrl ?? null)
      setGeneratedScene(sceneId)
      setLastModelUsed(
        data.modelUsed === "wan"
          ? "Wan 2.2 (szybki)"
          : data.modelUsed === "seedance"
            ? "Seedance 1 Pro (1080p)"
            : data.modelUsed === "kling"
              ? "Kling (fallback)"
              : data.modelUsed ?? null
      )
      toast.success("Wideo gotowe! 🎬")
    } catch {
      clearInterval(interval)
      toast.error("Błąd połączenia. Spróbuj ponownie.")
    } finally {
      setProcessing(false)
      setProcessingStep("")
    }
  }

  function downloadVideo() {
    if (!resultVideoUrl) return
    const a = document.createElement("a")
    a.href = resultVideoUrl
    a.download = `video-studio-${generatedScene || "produkt"}.mp4`
    a.target = "_blank"
    a.click()
    toast.success("Pobieranie wideo…")
  }

  function resetAll() {
    setOriginalImage(null)
    setOriginalFileName("")
    setResultVideoUrl(null)
    setSelectedScene("")
    setGeneratedScene("")
    setProductDescription("")
    setProcessing(false)
    setProcessingStep("")
    setLastModelUsed(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
      {/* Nagłówek */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🎬 AI Video Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wrzuć zdjęcie produktu → AI wygeneruje profesjonalny film reklamowy
          </p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-400 ring-1 ring-violet-500/30">
          BETA
        </span>
      </div>

      {!originalImage ? (
        <>
          {/* Upload zone */}
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
                ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                : "border-white/15 bg-card/20 hover:border-violet-500/40 hover:bg-card/40"
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
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-violet-500/20 to-violet-500/5">
                <span className="text-4xl" aria-hidden>🎬</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Wrzuć zdjęcie produktu
              </h3>
              <p className="text-muted-foreground">
                AI wygeneruje z niego profesjonalny film produktowy
              </p>
              <p className="text-xs text-muted-foreground/50">
                JPG, PNG lub WebP • Max 5 MB • Zdjęcie prosto z telefonu
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto flex aspect-square w-24 items-center justify-center rounded-2xl border border-white/5 bg-violet-500/10">
                <span className="text-3xl" aria-hidden>📱</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Zdjęcie produktu</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl text-violet-400" aria-hidden>→</span>
            </div>
            <div className="text-center">
              <div className="mx-auto flex aspect-square w-24 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                <span className="text-3xl" aria-hidden>🎬</span>
              </div>
              <p className="mt-2 text-xs font-medium text-violet-400">Film reklamowy</p>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEWA — podgląd */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-white/6 bg-card/30">
              <div className="flex border-b border-white/5 px-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">
                  📂 {originalFileName || "produkt.jpg"}
                </span>
              </div>

              {/* Podgląd oryginału + wynik */}
              <div className="relative flex min-h-[260px] items-center justify-center bg-card/50 p-4">
                {resultVideoUrl ? (
                  <video
                    key={resultVideoUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-h-[400px] w-full rounded-xl object-contain"
                    src={resultVideoUrl}
                  />
                ) : processing ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-500" />
                      <span className="text-2xl" aria-hidden>🎬</span>
                    </div>
                    <p className="text-center text-sm font-medium text-foreground">
                      {processingStep || "Generuję wideo…"}
                    </p>
                    <p className="text-center text-xs text-muted-foreground">
                      Generowanie wideo AI zajmuje ok. 15–60 sekund
                    </p>
                    <div className="h-1 w-48 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full animate-pulse rounded-full bg-violet-500/60" style={{ width: "65%" }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={originalImage}
                      alt="Zdjęcie produktu"
                      className="max-h-[300px] max-w-full rounded-xl object-contain opacity-70"
                    />
                    <p className="text-xs text-muted-foreground/60">
                      Wybierz scenę po prawej, żeby wygenerować wideo
                    </p>
                  </div>
                )}
              </div>

              {/* Akcje po wygenerowaniu */}
              {resultVideoUrl && (
                <div className="space-y-2 border-t border-white/5 p-4">
                  {lastModelUsed ? (
                    <p className="text-center text-[10px] text-muted-foreground/80">
                      Wygenerowano: <span className="text-muted-foreground">{lastModelUsed}</span>
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={downloadVideo}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500/15 px-4 py-2.5 text-sm font-medium text-violet-300 ring-1 ring-violet-500/25 transition-all hover:bg-violet-500/25 hover:text-violet-100"
                    >
                      ⬇️ Pobierz MP4
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResultVideoUrl(null)
                        setGeneratedScene("")
                        setSelectedScene("")
                        setLastModelUsed(null)
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-muted-foreground ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-foreground"
                    >
                      🔄 Nowa scena
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={resetAll}
              className="mt-3 text-xs text-muted-foreground/60 underline-offset-2 hover:text-muted-foreground hover:underline"
            >
              ← Zmień zdjęcie
            </button>
          </div>

          {/* PRAWA — konfiguracja */}
          <div className="space-y-5 lg:col-span-5">
            {/* Plan gate */}
            {isFreePlan ? (
              <div className="rounded-2xl border border-white/5 bg-card/30 p-6 text-center">
                <span className="text-3xl" aria-hidden>🔒</span>
                <p className="mt-3 text-sm text-muted-foreground">
                  Video Studio dostępne od planu Growth
                </p>
                <Link
                  href="/dashboard/settings"
                  className="mt-3 inline-block text-xs text-violet-400 hover:underline"
                >
                  Upgrade (99 zł/mies) →
                </Link>
              </div>
            ) : (
              <>
                {/* Opis produktu */}
                <div className="rounded-2xl border border-white/5 bg-card/30 p-4">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Opis produktu (opcjonalnie — poprawia wyniki)
                  </label>
                  <input
                    type="text"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="np. słuchawki bezprzewodowe TWS ANC"
                    className="w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                    disabled={processing}
                  />
                </div>

                {/* Format i czas trwania */}
                <div className="rounded-2xl border border-white/5 bg-card/30 p-4">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">Format wideo</p>
                  <div className="flex gap-2">
                    {FORMAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={processing}
                        onClick={() => setAspectRatio(opt.value)}
                        className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all disabled:opacity-50 ${
                          aspectRatio === opt.value
                            ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                            : "border-white/8 bg-white/5 text-muted-foreground hover:border-white/15"
                        }`}
                      >
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className="text-[9px] leading-tight text-muted-foreground/70">{opt.hint}</span>
                      </button>
                    ))}
                  </div>

                  <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Długość</p>
                  <div className="flex gap-2">
                    {([5, 8] as Duration[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={processing}
                        onClick={() => setDuration(d)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                          duration === d
                            ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                            : "border-white/8 bg-white/5 text-muted-foreground hover:border-white/15"
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wybór sceny */}
                <div className="rounded-2xl border border-white/5 bg-card/30 p-4">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">
                    Wybierz scenę i kliknij aby wygenerować
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SCENE_PRESETS.map((scene) => {
                      const isActive = selectedScene === scene.id
                      const isDone = generatedScene === scene.id && resultVideoUrl
                      const isGenerating = processing && selectedScene === scene.id

                      return (
                        <button
                          key={scene.id}
                          type="button"
                          disabled={processing}
                          onClick={() => handleGenerate(scene.id)}
                          className={`relative flex flex-col gap-1 rounded-xl border p-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                            isActive
                              ? "border-violet-500/50 bg-violet-500/15"
                              : isDone
                              ? "border-emerald-500/30 bg-emerald-500/8"
                              : "border-white/8 bg-white/5 hover:border-violet-500/25 hover:bg-violet-500/8"
                          }`}
                        >
                          {scene.qualityTier === "premium" ? (
                            <span
                              className={`absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${TAG_STYLES.PRO1080}`}
                              title="Wyższa jakość wideo (Seedance 1 Pro, 1080p)"
                            >
                              PRO 1080p
                            </span>
                          ) : null}
                          {scene.tag ? (
                            <span className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${TAG_STYLES[scene.tag]}`}>
                              {scene.tag}
                            </span>
                          ) : null}
                          <span className="text-lg leading-none" aria-hidden>{scene.emoji}</span>
                          <span
                            className={`text-xs font-semibold text-foreground ${scene.qualityTier === "premium" ? "pl-13" : ""} ${scene.tag ? "pr-10" : "pr-2"}`}
                          >
                            {scene.name}
                          </span>
                          <span className="text-[10px] leading-tight text-muted-foreground/70 line-clamp-2">
                            {isGenerating ? (
                              <span className="animate-pulse text-violet-400">{processingStep || "Generuję…"}</span>
                            ) : isDone ? (
                              <span className="text-emerald-400">✓ Gotowe — kliknij żeby wygenerować ponownie</span>
                            ) : (
                              scene.desc
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/65">
                    Sceny oznaczone <span className="font-semibold text-sky-300/90">PRO 1080p</span> używają wyższej jakości (Seedance) — mogą trwać dłużej i wiązać się z wyższym kosztem API niż packshoty.
                  </p>
                </div>

                {/* Info o kosztach */}
                <p className="text-center text-[10px] text-muted-foreground/50">
                  Generowanie zajmuje ok. 15–60 sekund • Wideo w jakości 1080p
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
