"use client"

import { useState } from "react"
import toast from "react-hot-toast"

import { copyToClipboard } from "@/lib/utils"
import type { GenerateResponse, QualityTip } from "@/lib/types"

function stripHtml(html: string): string {
  if (!html) return ""
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html")
    return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? ""
  }
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function normalizeTips(tips: GenerateResponse["qualityTips"]): QualityTip[] {
  const list = (tips ?? []) as (QualityTip | string)[]
  const out: QualityTip[] = []
  for (const tip of list) {
    if (typeof tip === "string") {
      try {
        const p = JSON.parse(tip) as unknown
        if (
          p &&
          typeof p === "object" &&
          "type" in p &&
          "text" in p &&
          "points" in p
        ) {
          const o = p as {
            type: string
            text: string
            points: number
          }
          if (
            o.type === "success" ||
            o.type === "warning" ||
            o.type === "error"
          ) {
            out.push({
              type: o.type,
              text: String(o.text),
              points: Number(o.points),
            })
          }
        }
      } catch {
        /* ignore */
      }
      continue
    }
    if (
      tip &&
      typeof tip === "object" &&
      (tip.type === "success" ||
        tip.type === "warning" ||
        tip.type === "error") &&
      typeof tip.text === "string" &&
      typeof tip.points === "number"
    ) {
      out.push(tip)
    }
  }
  return out
}

async function handleCopy(text: string) {
  const ok = await copyToClipboard(text)
  if (ok) toast.success("Skopiowano!")
  else toast.error("Nie udało się skopiować")
}

type DescriptionResultProps = {
  result: GenerateResponse
  /** Rodzic ustawia np. setResult(null) — wymagane do pełnego „Generuj ponownie”. */
  onRegenerate?: () => void
}

export function DescriptionResult({ result, onRegenerate }: DescriptionResultProps) {
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview")

  const score = result.qualityScore ?? 0
  const scoreWidth = `${Math.min(100, Math.max(0, score))}%`
  const scoreColorClass =
    score >= 90
      ? "text-emerald-400"
      : score >= 70
        ? "text-yellow-400"
        : "text-red-400"
  const barColorClass =
    score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-yellow-500" : "bg-red-500"

  const scoreHint =
    score >= 90
      ? "Świetny opis! Gotowy do publikacji. 🎉"
      : score >= 75
        ? "Dobry opis. Drobne poprawki podniosą go do perfekcji."
        : score >= 60
          ? "Przyzwoity opis. Sprawdź wskazówki poniżej."
          : "Opis wymaga poprawek. Sprawdź wskazówki."

  const seoTitle = result.seoTitle ?? ""
  const shortDescription = result.shortDescription ?? ""
  const longDescription = result.longDescription ?? ""
  const metaDescription = result.metaDescription ?? ""
  const tags = Array.isArray(result.tags) ? result.tags : []

  const tips = normalizeTips(result.qualityTips)

  function handleRegenerate() {
    window.scrollTo({ top: 0, behavior: "smooth" })
    onRegenerate?.()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-card/50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            📊 Quality Score
          </span>
          <span className={`text-2xl font-bold ${scoreColorClass}`}>
            {score}/100
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColorClass}`}
            style={{ width: scoreWidth }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{scoreHint}</p>

        {tips.length > 0 ? (
          <div className="mt-4 space-y-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span
                  className={
                    tip.type === "success"
                      ? "text-emerald-400"
                      : tip.type === "warning"
                        ? "text-yellow-400"
                        : "text-red-400"
                  }
                >
                  {tip.type === "success"
                    ? "✅"
                    : tip.type === "warning"
                      ? "⚠️"
                      : "❌"}
                </span>
                <span className="text-muted-foreground">{tip.text}</span>
                <span className="text-muted-foreground/50">
                  (+{tip.points} pkt)
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tytuł SEO
          </span>
          <div className="flex items-center gap-2">
            <span
              className={
                seoTitle.length <= 70 ? "text-xs text-emerald-400" : "text-xs text-red-400"
              }
            >
              {seoTitle.length}/70
              {seoTitle.length > 70 ? " ⚠️" : ""}
            </span>
            <button
              type="button"
              onClick={() => void handleCopy(seoTitle)}
              className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-emerald-500/20 hover:text-emerald-400"
            >
              📋 Kopiuj
            </button>
          </div>
        </div>
        <p className="text-base font-semibold text-foreground">{seoTitle}</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Opis krótki
          </span>
          <button
            type="button"
            onClick={() => void handleCopy(shortDescription)}
            className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-emerald-500/20 hover:text-emerald-400"
          >
            📋 Kopiuj
          </button>
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {shortDescription}
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Opis długi
          </span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                viewMode === "preview"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              Podgląd
            </button>
            <button
              type="button"
              onClick={() => setViewMode("html")}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                viewMode === "html"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => void handleCopy(stripHtml(longDescription))}
              className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-emerald-500/20 hover:text-emerald-400"
            >
              Kopiuj tekst
            </button>
            <button
              type="button"
              onClick={() => void handleCopy(longDescription)}
              className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-emerald-500/20 hover:text-emerald-400"
            >
              Kopiuj HTML
            </button>
          </div>
        </div>

        {viewMode === "preview" ? (
          <div
            className="max-w-none text-foreground [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-emerald-400 [&_li]:text-sm [&_li]:text-foreground/80 [&_p]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/80 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:ml-4 [&_ul]:space-y-1"
            dangerouslySetInnerHTML={{ __html: longDescription }}
          />
        ) : (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-background p-4 font-mono text-xs text-emerald-400">
            {longDescription}
          </pre>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Tagi SEO</span>
          <button
            type="button"
            onClick={() => void handleCopy(tags.join(", "))}
            className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-emerald-500/20 hover:text-emerald-400"
          >
            📋 Kopiuj wszystkie
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <button
              key={`${tag}-${i}`}
              type="button"
              onClick={() => void handleCopy(tag)}
              className="cursor-pointer rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 transition-all hover:bg-emerald-500/20"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Meta Description
          </span>
          <div className="flex items-center gap-2">
            <span
              className={
                metaDescription.length <= 160
                  ? "text-xs text-emerald-400"
                  : "text-xs text-red-400"
              }
            >
              {metaDescription.length}/160
              {metaDescription.length > 160 ? " ⚠️" : ""}
            </span>
            <button
              type="button"
              onClick={() => void handleCopy(metaDescription)}
              className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground transition-all hover:bg-emerald-500/20 hover:text-emerald-400"
            >
              📋 Kopiuj
            </button>
          </div>
        </div>
        <p className="text-sm text-foreground">{metaDescription}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRegenerate}
          className="rounded-xl border-2 border-emerald-500 bg-transparent px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/10"
        >
          🔄 Generuj ponownie
        </button>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400/80 opacity-80"
        >
          💾 Zapisano ✅
        </button>
      </div>
    </div>
  )
}

export default DescriptionResult
