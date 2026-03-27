"use client"

import { FileText, Sparkles } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"

import { exportToPDF } from "@/components/generator/ExportPDF"
import { countWordsFromHtml } from "@/lib/generation/count-words-html"
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

export interface DescriptionResultProps {
  result: GenerateResponse
  productName?: string
  /** Rodzic ustawia np. setResult(null) — wymagane do pełnego „Generuj ponownie”. */
  onRegenerate?: () => void
  /** Druga generacja z poprzednim wynikiem + instrukcja z Quality Score (1 kredyt). */
  onRefineQuality?: () => void | Promise<void>
  /** Blokuje przyciski podczas generacji */
  loading?: boolean
  creditsRemaining?: number
}

export function DescriptionResult({
  result,
  productName,
  onRegenerate,
  onRefineQuality,
  loading = false,
  creditsRemaining,
}: DescriptionResultProps) {
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview")
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [clickedTag, setClickedTag] = useState<string | null>(null)

  const score = result.qualityScore ?? 0
  const ringCirc = 2 * Math.PI * 40

  async function handleSectionCopy(text: string, sectionName: string) {
    const ok = await copyToClipboard(text)
    if (!ok) {
      toast.error("Nie udało się skopiować")
      return
    }
    setCopiedSection(sectionName)
    toast.success("Skopiowano!")
    setTimeout(() => setCopiedSection(null), 2000)
  }

  function copyButtonClass(sectionName: string) {
    return copiedSection === sectionName
      ? "rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400 ring-2 ring-emerald-500/30 transition-all duration-300"
      : "rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground transition-all duration-300 hover:bg-emerald-500/20 hover:text-emerald-400"
  }

  const seoTitle = result.seoTitle ?? ""
  const shortDescription = result.shortDescription ?? ""
  const longDescription = result.longDescription ?? ""
  const metaDescription = result.metaDescription ?? ""
  const tags = Array.isArray(result.tags) ? result.tags : []

  const titleMax = result.platformLimits?.titleMaxChars ?? 70
  const shortMax = result.platformLimits?.shortDescMax ?? 250
  const metaMax = result.platformLimits?.metaDescMax ?? 160
  const longMinWords = result.platformLimits?.longDescMinWords ?? 150
  const longWordCount = countWordsFromHtml(longDescription)
  const shortDescriptionLabel =
    result.platformLimits?.slug === "amazon" ? "Bullet Points" : "Opis krótki"
  const tagsLabel = result.platformLimits?.slug === "vinted" ? "Hashtagi" : "Tagi SEO"

  const tips = normalizeTips(result.qualityTips)
  const hasNegativeTips = tips.some(
    (t) => t.type === "warning" || t.type === "error"
  )
  /** Uwzględnij też lukę słów (np. sanitize dodał ostrzeżenie tylko po stronie serwera w innym przebiegu). */
  const belowLongMin = longWordCount < longMinWords
  const hasRoomToImprove =
    hasNegativeTips ||
    belowLongMin ||
    (result.qualityScore ?? 0) < 100
  const canRefine =
    typeof onRefineQuality === "function" &&
    !loading &&
    (creditsRemaining === undefined || creditsRemaining > 0)

  function handleRegenerate() {
    window.scrollTo({ top: 0, behavior: "smooth" })
    onRegenerate?.()
  }

  return (
    <div className="space-y-6">
      <div className="gradient-border p-5">
        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 shrink-0">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="hsl(217.2 32.6% 17.5%)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={
                  score >= 80
                    ? "#10B981"
                    : score >= 60
                      ? "#EAB308"
                      : "#EF4444"
                }
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${ringCirc}`}
                strokeDashoffset={`${ringCirc * (1 - Math.min(100, Math.max(0, score)) / 100)}`}
                className="transition-all duration-1000 ease-out"
                style={{ animation: "score-fill 1s ease-out forwards" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{score}</span>
              <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">
              Quality Score
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {score >= 90
                ? "🏆 Doskonały! Gotowy do publikacji."
                : score >= 75
                  ? "✅ Bardzo dobry. Drobne szlify i perfekcja!"
                  : score >= 60
                    ? "⚡ Przyzwoity. Sprawdź wskazówki."
                    : "⚠️ Wymaga poprawek. Sprawdź wskazówki poniżej."}
            </p>
          </div>
        </div>

        {tips.length > 0 || (canRefine && hasRoomToImprove) ? (
          <div className="mt-4 space-y-2">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/90">
                {tips.length > 0 ? "Szczegóły oceny" : "Możliwa poprawa"}
              </p>
              {canRefine && hasRoomToImprove ? (
                <button
                  type="button"
                  onClick={() => void onRefineQuality?.()}
                  disabled={loading}
                  title="Każde użycie pobiera 1 kredyt — jak kolejne pełne generowanie opisu."
                  className="inline-flex max-w-[min(100%,220px)] shrink-0 items-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-left transition-all hover:border-cyan-400/50 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-200" aria-hidden />
                  <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
                    <span className="text-[11px] font-medium text-cyan-100">
                      Ulepsz AI wg wskazówek
                    </span>
                    <span className="text-[10px] font-semibold text-amber-200/95">
                      1 kredyt za każde użycie
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-secondary/20 p-3 text-xs"
              >
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
                <span className="min-w-0 flex-1 text-muted-foreground">
                  {tip.text}
                </span>
                <span className="shrink-0 text-muted-foreground/50">
                  (+{tip.points} pkt)
                </span>
              </div>
            ))}
            {canRefine && hasRoomToImprove ? (
              <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                <span className="font-medium text-foreground/90">
                  Płatność: 1 kredyt za każde kliknięcie
                </span>{" "}
                (tak samo jak „Generuj opis”). Model dostaje poprzedni JSON + listę ostrzeżeń i sukcesów —
                stara się naprawić luki (np. długość opisu), nie psując tego, co już jest OK.
              </p>
            ) : null}
            {!canRefine && onRefineQuality && creditsRemaining === 0 ? (
              <p className="text-[10px] text-amber-400/90">
                Brak kredytów — ulepszanie AI niedostępne do odnowienia limitu.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="gradient-border p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tytuł SEO
          </span>
          <div className="flex items-center gap-2">
            <span
              className={
                seoTitle.length <= titleMax ? "text-xs text-emerald-400" : "text-xs text-red-400"
              }
            >
              {seoTitle.length}/{titleMax}
              {seoTitle.length > titleMax ? " ⚠️" : ""}
            </span>
            <button
              type="button"
              onClick={() => void handleSectionCopy(seoTitle, "title")}
              className={copyButtonClass("title")}
            >
              {copiedSection === "title" ? "✅ Skopiowano!" : "📋 Kopiuj"}
            </button>
          </div>
        </div>
        <p className="text-base font-semibold text-foreground">{seoTitle}</p>
        {result.platformLimits?.slug === "allegro" ? (
          <p className="mt-3 rounded-lg border border-cyan-500/10 bg-cyan-500/5 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            Allegro: w wyszukiwarce liczą się tytuł oferty i parametry (filtry). Opis HTML służy konwersji i SEO w Google — nie zastępuje parametrów w formularzu wystawiania.
          </p>
        ) : null}
        {result.platformLimits?.slug === "amazon" ? (
          <p className="mt-3 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            Amazon: tytuł (początek, ok. 70–80 zn. widoczne w apce) i exact match frazy; Backend ~249 bajtów UTF-8 (nie znaki — polskie ogonki 2 bajty; nadmiar może wyzerować całe pole; słowa spacją, bez przecinków). „Opis krótki” = styl Bullet Points. A+: tekst na grafice nie indeksuje się jak opis; Alt Text w modułach bywa indeksowany.
          </p>
        ) : null}
        {result.platformLimits?.slug === "shoper" ? (
          <p className="mt-3 rounded-lg border border-violet-500/10 bg-violet-500/5 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            Shoper: tytuł w wyniku to propozycja pod SEO (~60–70 zn.); pełna nazwa produktu w panelu może mieć do 255 zn. Opis krótki — plain text (bez HTML), bez powielania zdań z opisu długiego. Ceneo domyślnie bierze skrót; uzupełnij atrybuty (m.in. EAN, marka) w sklepie pod feedy.
          </p>
        ) : null}
        {result.platformLimits?.slug === "woocommerce" ? (
          <p className="mt-3 rounded-lg border border-purple-500/10 bg-purple-500/5 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            WooCommerce / WordPress: opis długi to HTML gotowy do wklejenia (h2, p, listy). Listy:{" "}
            <code className="rounded bg-white/5 px-1">&lt;ul class=&quot;wp-block-list&quot;&gt;</code> +{" "}
            <code className="rounded bg-white/5 px-1">&lt;li&gt;</code> (Gutenberg) lub zwykłe{" "}
            <code className="rounded bg-white/5 px-1">&lt;ul&gt;&lt;li&gt;</code>. Nie wklejaj shortcodes wtyczek, jeśli ich nie używasz.
          </p>
        ) : null}
      </div>

      <div className="gradient-border p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {shortDescriptionLabel}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={
                shortDescription.length <= shortMax
                  ? "text-xs text-emerald-400"
                  : "text-xs text-red-400"
              }
            >
              {shortDescription.length}/{shortMax}
              {shortDescription.length > shortMax ? " ⚠️" : ""}
            </span>
            <button
              type="button"
              onClick={() => void handleSectionCopy(shortDescription, "short")}
              className={copyButtonClass("short")}
            >
              {copiedSection === "short" ? "✅ Skopiowano!" : "📋 Kopiuj"}
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {shortDescription}
        </p>
      </div>

      <div className="gradient-border p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Opis długi
            </span>
            <span
              className={
                longWordCount >= longMinWords ? "text-[10px] text-emerald-400/90" : "text-[10px] text-amber-400/90"
              }
              title={
                result.platformLimits?.slug === "allegro"
                  ? "Cel redakcyjny (jakość / SEO) — Allegro nie narzuca minimalnej liczby słów w opisie HTML."
                  : "Zalecenie jakościowe dla tej platformy — lepsza treść pod konwersję i SEO."
              }
            >
              ~{longWordCount} słów (cel min. {longMinWords})
              {longWordCount < longMinWords ? " ⚠️" : ""}
            </span>
          </div>
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
              onClick={() =>
                void handleSectionCopy(stripHtml(longDescription), "longText")
              }
              className={copyButtonClass("longText")}
            >
              {copiedSection === "longText" ? "✅ Skopiowano!" : "Kopiuj tekst"}
            </button>
            <button
              type="button"
              onClick={() => void handleSectionCopy(longDescription, "longHtml")}
              className={copyButtonClass("longHtml")}
            >
              {copiedSection === "longHtml" ? "✅ Skopiowano!" : "Kopiuj HTML"}
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

      <div className="gradient-border p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{tagsLabel}</span>
          <button
            type="button"
            onClick={() => void handleSectionCopy(tags.join(", "), "tags")}
            className={copyButtonClass("tags")}
          >
            {copiedSection === "tags" ? "✅ Skopiowano!" : "📋 Kopiuj wszystkie"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <button
              key={`${tag}-${i}`}
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(tag)
                if (!ok) {
                  toast.error("Nie udało się skopiować")
                  return
                }
                setClickedTag(tag)
                toast.success("Skopiowano!")
                setTimeout(() => setClickedTag(null), 400)
              }}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-all duration-200 ${
                clickedTag === tag
                  ? "scale-110 bg-emerald-500 text-white"
                  : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="gradient-border p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Meta Description
          </span>
          <div className="flex items-center gap-2">
            <span
              className={
                metaDescription.length <= metaMax
                  ? "text-xs text-emerald-400"
                  : "text-xs text-red-400"
              }
            >
              {metaDescription.length}/{metaMax}
              {metaDescription.length > metaMax ? " ⚠️" : ""}
            </span>
            <button
              type="button"
              onClick={() => void handleSectionCopy(metaDescription, "meta")}
              className={copyButtonClass("meta")}
            >
              {copiedSection === "meta" ? "✅ Skopiowano!" : "📋 Kopiuj"}
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
          onClick={async () => {
            try {
              await exportToPDF(result, productName || "Produkt")
              toast.success("PDF pobrany! 📄")
            } catch {
              toast.error("Błąd generowania PDF")
            }
          }}
          className="hover-glow gradient-border flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:shadow-[0_0_24px_hsl(160_84%_39%/0.12)]"
        >
          <FileText className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          Eksport PDF
        </button>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400/80 opacity-80"
        >
          💾 Zapisano ✅
        </button>
      </div>

      {result.promptVersion ? (
        <p className="text-center text-[10px] text-muted-foreground/50">
          Wersja generatora: {result.promptVersion}
        </p>
      ) : null}
    </div>
  )
}

export default DescriptionResult
