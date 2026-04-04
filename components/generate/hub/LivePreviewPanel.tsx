"use client"

import { Copy, Loader2, Pencil, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

import PlatformPreview from "@/components/generator/PlatformPreview"
import type { GenerateResponse } from "@/lib/types"
import { cn, copyToClipboard } from "@/lib/utils"

type Props = {
  loading: boolean
  loadingStep: number
  loadingMessages: string[]
  result: GenerateResponse | null
  error: string | null
  productName: string
  /** Slug platformy z formularza — podgląd „jak na platformie”. */
  platformSlug: string
}

type PanelView = "content" | "platform"

export function LivePreviewPanel({
  loading,
  loadingStep,
  loadingMessages,
  result,
  error,
  productName,
  platformSlug,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [draftLong, setDraftLong] = useState("")
  const [elapsedSec, setElapsedSec] = useState(0)
  const [panelView, setPanelView] = useState<PanelView>("platform")

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0)
      return
    }
    setElapsedSec(0)
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [loading])

  useEffect(() => {
    if (result) setPanelView("platform")
  }, [result?.seoTitle, result?.longDescription])

  const effectivePlatformSlug = result?.platformLimits?.slug ?? platformSlug

  const displayLong = editOpen ? draftLong : (result?.longDescription ?? "")
  const seoTitle = result?.seoTitle ?? ""
  const shortDescription = result?.shortDescription ?? ""
  const shortDescriptionLabel =
    effectivePlatformSlug === "amazon" ? "Bullet Points" : "Opis krótki"

  const stepCount = Math.max(1, loadingMessages.length)
  const safeStep = Math.min(loadingStep, stepCount - 1)
  const currentMessage = loadingMessages[safeStep] ?? loadingMessages[0] ?? "Generuję…"
  const stepProgressPct = ((safeStep + 1) / stepCount) * 100

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
          <div className="flex min-h-0 flex-1 flex-col gap-5 py-1" aria-busy="true" aria-live="polite">
            {/* Nagłówek + czas */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" aria-hidden />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300/90">
                    Generuję opis
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Krok {safeStep + 1} z {stepCount}
                    <span className="mx-1.5 text-white/15" aria-hidden>
                      ·
                    </span>
                    <span className="tabular-nums text-cyan-200/75">{elapsedSec}s</span>
                    <span className="text-muted-foreground"> upłynęło</span>
                  </p>
                </div>
              </div>
              <p className="max-w-[220px] text-right text-[10px] leading-snug text-muted-foreground/90">
                Zwykle trwa to{" "}
                <span className="text-muted-foreground">ok. 15–60 s</span> — zależy od obciążenia i
                złożoności produktu.
              </p>
            </div>

            {/* Pasek postępu (fazy, nie % API) */}
            <div className="space-y-2">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-linear-to-r from-cyan-500/80 via-emerald-500/75 to-teal-500/70 transition-[width] duration-700 ease-out"
                  style={{ width: `${stepProgressPct}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent opacity-40 animate-pulse"
                  aria-hidden
                />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-y-2" role="list" aria-label="Etapy generowania">
                {loadingMessages.map((msg, i) => {
                  const done = i < safeStep
                  const active = i === safeStep
                  return (
                    <div key={i} className="flex items-center" role="listitem">
                      {i > 0 ? (
                        <span
                          className={cn(
                            "mx-1.5 h-px w-5 sm:mx-2 sm:w-8",
                            i <= safeStep ? "bg-emerald-500/30" : "bg-white/10"
                          )}
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-colors sm:h-9 sm:w-9",
                          done && "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30",
                          active &&
                            "bg-cyan-500/20 text-cyan-100 shadow-[0_0_20px_-6px_rgba(34,211,238,0.35)] ring-2 ring-cyan-400/50",
                          !done && !active && "bg-white/6 text-muted-foreground/50"
                        )}
                        title={msg}
                        aria-current={active ? "step" : undefined}
                      >
                        {i + 1}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Aktualna faza — jeden wyraźny komunikat (bez duplikatu) */}
            <div className="rounded-xl border border-white/7 bg-black/25 px-4 py-3">
              <p className="text-sm font-medium leading-relaxed text-gray-100/95">{currentMessage}</p>
            </div>

            {/* Szkielety jak docelowy układ */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 pt-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  Tytuł SEO
                </p>
                <div className="mt-2 space-y-2">
                  <div className="h-3.5 w-[92%] animate-pulse rounded-md bg-white/9" />
                  <div className="h-3.5 w-[55%] animate-pulse rounded-md bg-white/6" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  {shortDescriptionLabel}
                </p>
                <div className="mt-2 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded-md bg-white/7" />
                  <div className="h-3 w-[88%] animate-pulse rounded-md bg-white/6" />
                  <div className="h-3 w-[72%] animate-pulse rounded-md bg-white/5" />
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  Opis długi
                </p>
                <div className="mt-2 space-y-2 rounded-xl border border-white/5 bg-black/15 p-3">
                  {[100, 95, 88, 92, 78, 85, 70].map((w, j) => (
                    <div
                      key={j}
                      className="h-2.5 animate-pulse rounded-md bg-white/6"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {result && !loading ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Widok podglądu">
              <button
                type="button"
                role="tab"
                aria-selected={panelView === "platform"}
                onClick={() => setPanelView("platform")}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors sm:text-xs",
                  panelView === "platform"
                    ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-100"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                )}
              >
                Jak na platformie
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panelView === "content"}
                onClick={() => setPanelView("content")}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors sm:text-xs",
                  panelView === "content"
                    ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-100"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                )}
              >
                Treść (kopiowanie)
              </button>
            </div>

            {panelView === "platform" ? (
              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/8 bg-background/40 p-2 scrollbar-hub">
                <PlatformPreview result={result} platform={effectivePlatformSlug} />
              </div>
            ) : (
              <>
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
              </>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => void handleCopyAll()}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/18 hover:shadow-[0_0_20px_-6px_rgba(34,211,238,0.12)]"
              >
                <Copy className="h-3.5 w-3.5" />
                Kopiuj pełny opis
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
