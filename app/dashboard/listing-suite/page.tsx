"use client"

import Link from "next/link"
import { useCallback, useRef, useState } from "react"
import toast from "react-hot-toast"

import { DescriptionResult } from "@/components/generator/DescriptionResult"
import { LISTING_SUITE_BUNDLE_CREDIT_COST } from "@/lib/listing-suite/constants"
import { PLATFORMS } from "@/lib/constants"
import type { GenerateResponse } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/useUser"
import { Download, ImageIcon, Loader2, Sparkles, Video } from "lucide-react"

type SuiteImage = {
  sceneId: string
  label: string
  url: string
  note?: string
}

type SuiteResponse = {
  ok: boolean
  bundleCreditsCharged?: number
  creditsRemaining?: number
  images?: SuiteImage[]
  video?: { url: string; scene: string; modelUsed: string }
  description?: GenerateResponse
  error?: string
}

async function downloadFileFromUrl(url: string, filename: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error("fetch failed")
    const blob = await res.blob()
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success("Pobrano plik.")
  } catch {
    toast.error("Nie udało się pobrać pliku. Otwórz link w nowej karcie lub spróbuj ponownie.")
  }
}

export default function ListingSuitePage() {
  const { profile, refreshProfile } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [platform, setPlatform] = useState("allegro")
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState("")
  const [result, setResult] = useState<SuiteResponse | null>(null)

  const isFree = profile?.plan === "free" || !profile
  const creditsRemaining = (profile?.credits_limit ?? 0) - (profile?.credits_used ?? 0)
  const canAfford = creditsRemaining >= LISTING_SUITE_BUNDLE_CREDIT_COST

  const readFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Użyj pliku JPG, PNG lub WebP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maks. 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageBase64(String(reader.result ?? ""))
      setFileName(file.name)
      setResult(null)
    }
    reader.readAsDataURL(file)
  }, [])

  async function runSuite() {
    if (!imageBase64?.trim()) {
      toast.error("Dodaj zdjęcie produktu.")
      return
    }
    if (!canAfford) {
      toast.error(`Potrzebujesz ${LISTING_SUITE_BUNDLE_CREDIT_COST} kredytów.`)
      return
    }

    setProcessing(true)
    setStep("Analiza zdjęcia i generowanie 6 wariantów…")
    setResult(null)

    try {
      const res = await fetch("/api/listing-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, platform, tone: "profesjonalny" }),
      })
      const data = (await res.json()) as SuiteResponse

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Nie udało się wygenerować pakietu.")
        return
      }

      setResult(data)
      setStep("")
      toast.success(
        `Pakiet gotowy. Pobrano ${data.bundleCreditsCharged ?? LISTING_SUITE_BUNDLE_CREDIT_COST} kredytów.`
      )
      await refreshProfile()
    } catch {
      toast.error("Błąd sieci. Spróbuj ponownie.")
    } finally {
      setProcessing(false)
      setStep("")
    }
  }

  const desc = result?.description

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          Growth / Scale
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Listing na gotowo
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Jedno surowe zdjęcie →{" "}
          <span className="text-foreground/90">6 profesjonalnych ujęć</span> (Flux),{" "}
          <span className="text-foreground/90">1 film produktowy</span> i{" "}
          <span className="text-foreground/90">pełny opis</span> pod marketplace. Koszt pakietu:{" "}
          <span className="font-medium text-emerald-400/95">{LISTING_SUITE_BUNDLE_CREDIT_COST} kredytów</span>.
        </p>
      </div>

      {isFree ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm text-amber-100">
          Ta funkcja jest dostępna od planu <strong>Growth</strong> lub <strong>Scale</strong> (jak Photo Studio i
          Video Studio).{" "}
          <Link href="/dashboard/settings" className="font-medium text-amber-200 underline underline-offset-2">
            Ustawienia planu
          </Link>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-card/40 p-5 shadow-lg shadow-black/20 backdrop-blur-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Zdjęcie produktu</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) readFile(f)
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
              >
                <ImageIcon className="h-4 w-4" />
                {imageBase64 ? "Zmień zdjęcie" : "Wybierz plik"}
              </button>
              {fileName ? (
                <span className="truncate text-xs text-muted-foreground">{fileName}</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Platforma opisu</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={processing}
              className="w-full min-w-[180px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-auto"
            >
              {PLATFORMS.slice(0, 8).map((p) => (
                <option key={p.value} value={p.value}>
                  {p.emoji} {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Pozostało kredytów: <span className="text-foreground/90">{creditsRemaining}</span>
            {!canAfford ? (
              <span className="text-amber-400"> — za mało na pakiet ({LISTING_SUITE_BUNDLE_CREDIT_COST} wymagane).</span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={runSuite}
            disabled={processing || isFree || !imageBase64 || !canAfford}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition",
              "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500",
              "disabled:cursor-not-allowed disabled:opacity-45"
            )}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generuj pakiet
          </button>
        </div>

        {processing && step ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-cyan-200/90">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            {step}
          </p>
        ) : null}
      </div>

      {result?.images && result.images.length > 0 ? (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ImageIcon className="h-5 w-5 text-cyan-400" />
            Zdjęcia pod listing
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.images.map((img, i) => (
              <div
                key={img.sceneId}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-inner"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- zewnętrzne URL z Replicate */}
                <img
                  src={img.url}
                  alt={img.label}
                  className="aspect-square w-full object-cover"
                />
                <div className="space-y-2 p-3">
                  <p className="text-xs font-medium text-foreground/95">
                    {i + 1}. {img.label}
                  </p>
                  {img.note ? <p className="text-[10px] text-amber-200/80">{img.note}</p> : null}
                  <button
                    type="button"
                    onClick={() =>
                      downloadFileFromUrl(
                        img.url,
                        `listing-${img.sceneId}-${i + 1}.jpg`
                      )
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Pobierz
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {result?.video?.url ? (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Video className="h-5 w-5 text-violet-400" />
            Film produktowy
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-3">
            <video
              src={result.video.url}
              controls
              playsInline
              className="w-full max-h-[420px] rounded-xl bg-black"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadFileFromUrl(result.video!.url, "listing-produktowe-wideo.mp4")}
                className="inline-flex items-center gap-2 rounded-lg border border-violet-500/35 bg-violet-500/12 px-3 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/18"
              >
                <Download className="h-3.5 w-3.5" />
                Pobierz wideo
              </button>
              <span className="text-[11px] text-muted-foreground">
                Scena: {result.video.scene} · {result.video.modelUsed}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {desc ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Wygenerowany opis</h2>
          <DescriptionResult
            result={desc}
            productName={desc.seoTitle}
            creditsRemaining={result?.creditsRemaining}
          />
          <p className="text-xs text-muted-foreground">
            Pełną edycję i dopracowanie znajdziesz w{" "}
            <Link href="/dashboard/generate" className="text-emerald-400 underline underline-offset-2">
              AI Sales Hub
            </Link>
            .
          </p>
        </section>
      ) : null}
    </div>
  )
}
