"use client"

import { Copy, Loader2, Pencil, Sparkles, Star } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"

import type { GenerateResponse } from "@/lib/types"
import { cn, copyToClipboard } from "@/lib/utils"

type Props = {
  loading: boolean
  loadingStep: number
  loadingMessages: string[]
  result: GenerateResponse | null
  error: string | null
  productName: string
  /** streamed-style text while generating */
  streamingText: string
}

export function LivePreviewPanel({
  loading,
  loadingStep,
  loadingMessages,
  result,
  error,
  productName,
  streamingText,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [draftLong, setDraftLong] = useState("")
  const [rating, setRating] = useState(0)

  const displayLong = editOpen ? draftLong : (result?.longDescription ?? "")
  const seoTitle = result?.seoTitle ?? ""
  const shortDescription = result?.shortDescription ?? ""
  const shortDescriptionLabel =
    result?.platformLimits?.slug === "amazon" ? "Bullet Points" : "Opis krótki"

  async function handleCopyAll() {
    if (!result) return
    const text = [seoTitle, shortDescription, displayLong].filter(Boolean).join("\n\n")
    const ok = await copyToClipboard(text)
    if (ok) toast.success("Skopiowano pełny opis")
    else toast.error("Nie udało się skopiować")
  }

  return (
    <div
      className={cn(
        "relative flex min-h-[min(520px,70vh)] flex-col overflow-hidden rounded-[24px]",
        "border border-white/8 bg-linear-to-b from-white/4 via-white/2 to-emerald-950/15 shadow-2xl backdrop-blur-[20px]",
        "transition-transform duration-200 will-change-transform hover:-translate-y-px hover:border-white/12 hover:shadow-[0_0_44px_-12px_rgba(16,185,129,0.14),0_0_36px_-14px_rgba(34,211,238,0.08)]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.07)_0%,transparent_52%),radial-gradient(ellipse_at_100%_0%,rgba(34,211,238,0.06)_0%,transparent_45%)]" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-5 md:p-6">
        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {!loading && !result && !error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-linear-to-br from-cyan-500/12 to-emerald-500/10 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Sparkles className="h-7 w-7 text-cyan-400/90" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium tracking-wide text-gray-200">
                Twój opis pojawi się tutaj
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-400/90 align-middle" />
              </p>
              <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
                Wypełnij formularz i wygeneruj — podgląd na żywo pokaże tytuł SEO i treść.
              </p>
            </div>
            <div className="flex w-56 flex-col gap-2">
              <div className="h-2 w-full animate-pulse rounded-full bg-white/15" />
              <div className="h-2 w-4/5 animate-pulse rounded-full bg-white/12" />
              <div className="h-2 w-3/5 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-1 flex-col gap-4 py-4">
            <div className="flex items-center gap-2 text-cyan-400/85">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
                Generuję…
              </span>
            </div>
            <div className="min-h-[120px] whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-200/90">
              {streamingText}
              <span className="inline-block h-4 w-0.5 animate-pulse bg-cyan-400/80 align-middle" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {loadingMessages[loadingStep] ?? loadingMessages[0]}
            </p>
          </div>
        ) : null}

        {result && !loading ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Tytuł SEO
              </p>
              <h2 className="mt-1 text-base font-semibold leading-snug text-gray-100">
                {seoTitle || productName}
              </h2>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {shortDescriptionLabel}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-300">{shortDescription}</p>
            </div>
            <div className="min-h-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Opis długi
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!editOpen) setDraftLong(result?.longDescription ?? "")
                    setEditOpen((e) => !e)
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-emerald-200"
                >
                  <Pencil className="h-3 w-3" />
                  {editOpen ? "Podgląd" : "Edytuj"}
                </button>
              </div>
              {editOpen ? (
                <textarea
                  value={draftLong}
                  onChange={(e) => setDraftLong(e.target.value)}
                  className="max-h-64 min-h-40 w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-gray-200 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/12"
                />
              ) : displayLong.includes("<") && displayLong.includes(">") ? (
                <div
                  className="max-h-64 max-w-none overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-3 text-xs leading-relaxed text-gray-300 scrollbar-hub [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4"
                  dangerouslySetInnerHTML={{ __html: displayLong }}
                />
              ) : (
                <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/5 bg-black/20 p-3 text-xs leading-relaxed text-gray-300 scrollbar-hub">
                  {displayLong}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => void handleCopyAll()}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/18 hover:shadow-[0_0_20px_-6px_rgba(34,211,238,0.12)]"
              >
                <Copy className="h-3.5 w-3.5" />
                Kopiuj pełny opis
              </button>
              <div className="flex items-center gap-1" role="group" aria-label="Oceń opis">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="rounded p-0.5 transition-transform hover:scale-110 active:scale-95"
                    aria-label={`${n} gwiazdek`}
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        n <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-600"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
