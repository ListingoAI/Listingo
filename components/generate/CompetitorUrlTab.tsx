"use client"

import { Loader2, Search, Sparkles } from "lucide-react"
import Link from "next/link"
import { useCallback, useState } from "react"
import toast from "react-hot-toast"

import { Label } from "@/components/ui/label"
import type { CompetitorListingAnalysis } from "@/lib/generation/competitor-listing-analysis"
import { cn } from "@/lib/utils"

type Props = {
  /** Użytkownik ma plan Pro lub Scale */
  canUse: boolean
}

export function CompetitorUrlTab({ canUse }: Props) {
  const [url, setUrl] = useState("")
  const [pastedText, setPastedText] = useState("")
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<CompetitorListingAnalysis | null>(null)
  const [meta, setMeta] = useState<{ source?: string; url?: string } | null>(null)

  const run = useCallback(async () => {
    if (!canUse) return
    const u = url.trim()
    const p = pastedText.trim()
    if (!u && p.length < 45) {
      toast.error("Wpisz link lub wklej treść oferty (min. ok. 45 znaków).")
      return
    }
    setLoading(true)
    setAnalysis(null)
    setMeta(null)
    try {
      const res = await fetch("/api/competitor-listing-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: u || undefined,
          pastedText: p || undefined,
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        analysis?: CompetitorListingAnalysis
        meta?: { source?: string; url?: string }
        error?: string
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się przeanalizować.")
        return
      }
      if (data.analysis) {
        setAnalysis(data.analysis)
        setMeta(data.meta ?? null)
        toast.success("Analiza gotowa.")
      }
    } catch {
      toast.error("Błąd połączenia.")
    } finally {
      setLoading(false)
    }
  }, [canUse, url, pastedText])

  if (!canUse) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/30 py-16 text-center">
        <p className="mb-3 text-3xl">🔒</p>
        <p className="font-medium text-foreground">Analiza konkurencji</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Wklej link do oferty lub treść — AI oceni listing (tytuł, struktura, mocne i słabe strony).
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Dostępne w planie Pro lub Scale.</p>
        <Link
          href="/dashboard/settings"
          className="mt-4 inline-flex items-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
        >
          Przejdź na wyższy plan →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-linear-to-br from-cyan-950/20 via-card/40 to-emerald-950/15 p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Analiza oferty konkurencji</p>
              <p className="text-[11px] text-muted-foreground">
                Link publiczny (http/https) lub wklejka — część stron ładuje treść w JS; wtedy wklej opis ręcznie.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="competitorUrl" className="text-xs font-medium text-muted-foreground">
                URL oferty (opcjonalnie)
              </Label>
              <input
                id="competitorUrl"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/45 focus:border-emerald-500/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>
            <div>
              <Label htmlFor="competitorPaste" className="text-xs font-medium text-muted-foreground">
                Albo wklej tytuł + opis (gdy link nie działa)
              </Label>
              <textarea
                id="competitorPaste"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={6}
                placeholder="Wklej widoczny tytuł i opis z karty produktu..."
                className="mt-1.5 min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/45 focus:border-emerald-500/45 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading || (!url.trim() && pastedText.trim().length < 45)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all",
                "hover:bg-emerald-400 hover:shadow-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-45"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizuję…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analizuj listing
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[200px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/30 py-20">
            <Loader2 className="mb-3 h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">Pobieram treść i oceniam listing…</p>
          </div>
        ) : null}

        {!loading && !analysis ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 py-16 text-center">
            <p className="text-sm text-muted-foreground/80">
              Wynik analizy pojawi się tutaj — punkty mocne, słabe strony i konkretne sugestie.
            </p>
          </div>
        ) : null}

        {analysis ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/25 bg-linear-to-br from-emerald-500/10 to-cyan-950/20 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                    Ocena całkowita
                  </p>
                  <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">{analysis.overallScore}</p>
                  <p className="text-[10px] text-muted-foreground">/ 100</p>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  {meta?.source ? <span className="mr-2">Źródło: {meta.source}</span> : null}
                  {analysis.platformGuess !== "unknown" ? (
                    <span className="block">Platforma: {analysis.platformGuess}</span>
                  ) : null}
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                      analysis.dataQuality === "good" && "bg-emerald-500/15 text-emerald-300",
                      analysis.dataQuality === "partial" && "bg-amber-500/15 text-amber-200",
                      analysis.dataQuality === "poor" && "bg-red-500/10 text-red-300/90"
                    )}
                  >
                    Dane: {analysis.dataQuality}
                  </span>
                </div>
              </div>
              {analysis.titleGuess ? (
                <p className="mt-3 border-t border-white/10 pt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/90">Wykryty tytuł: </span>
                  {analysis.titleGuess}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-relaxed text-foreground/95">{analysis.summary}</p>
              <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{analysis.disclaimer}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-card/40 p-4">
                <p className="text-xs font-semibold text-emerald-400/95">Mocne strony</p>
                <ul className="mt-2 list-inside list-disc space-y-1.5 text-[13px] leading-relaxed text-foreground/90">
                  {analysis.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-card/40 p-4">
                <p className="text-xs font-semibold text-amber-400/95">Do poprawy</p>
                <ul className="mt-2 list-inside list-disc space-y-1.5 text-[13px] leading-relaxed text-foreground/90">
                  {analysis.weaknesses.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-4">
              <p className="text-xs font-semibold text-cyan-300/95">Sugestie działań</p>
              <ul className="mt-2 list-inside list-decimal space-y-1.5 text-[13px] leading-relaxed text-foreground/90">
                {analysis.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
