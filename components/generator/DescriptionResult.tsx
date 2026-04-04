"use client"

import {
  AlertTriangle,
  Barcode,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Copy,
  FileText,
  Hash,
  Info,
  Layers,
  Loader2,
  Radar,
  RefreshCw,
  Ruler,
  ScanSearch,
  ShieldCheck,
  Tag,
  Wand2,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"

import { exportToPDF } from "@/components/generator/ExportPDF"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { analyzeQualityGaps } from "@/lib/generation/analyze-quality-gaps"
import {
  isCriticalAuditItem,
  shouldHideResolvedAuditItem,
} from "@/lib/generation/listing-audit-autofix"
import type { ListingAuditResult } from "@/lib/generation/listing-audit"
import { countWordsFromHtml } from "@/lib/generation/count-words-html"
import {
  classifyRefineNoteInsert,
  isRefineNoteRelevantForPlatform,
  REFINE_NOTE_GROUP_ORDER,
  type RefineNoteGroupId,
} from "@/lib/generation/refine-note-suggestions"
import { cn, copyToClipboard } from "@/lib/utils"
import type { GenerateResponse } from "@/lib/types"

type RefineQuickRow = { id: string; label: string; insert: string }

const REFINE_NOTE_GROUP_META: Record<
  RefineNoteGroupId,
  { title: string; hint: string; Icon: typeof Layers }
> = {
  basics: {
    title: "Podstawowe",
    hint: "Najczęściej uzupełniane informacje o produkcie i wariantach.",
    Icon: Layers,
  },
  specs: {
    title: "Parametry",
    hint: "Twarde dane, liczby i informacje techniczne.",
    Icon: Ruler,
  },
  codes: {
    title: "Kody i zgodność",
    hint: "Identyfikatory oferty, normy i zawartość zestawu.",
    Icon: Barcode,
  },
  other: {
    title: "Inne",
    hint: "Pozostałe uwagi do dopisania w instrukcji dopracowania.",
    Icon: Info,
  },
}

function shortenRefineLabel(text: string): string {
  const t = text.trim()
  if (t.length <= 48) return t

  const colonIdx = t.indexOf(":")
  if (colonIdx > 0 && colonIdx <= 40) {
    const afterColon = t.slice(colonIdx + 1).trim()
    const head = t.slice(0, colonIdx).trim()
    if (afterColon.length <= 30) return `${head}: ${afterColon}`
    return head
  }

  const dashIdx = t.indexOf("—")
  if (dashIdx > 0 && dashIdx <= 50) {
    return t.slice(0, dashIdx).trim()
  }

  const firstSentenceEnd = t.search(/[.!?]\s/)
  if (firstSentenceEnd > 0 && firstSentenceEnd <= 55) {
    return t.slice(0, firstSentenceEnd + 1)
  }

  return `${t.slice(0, 45).trimEnd()}…`
}

function stripHtml(html: string): string {
  if (!html) return ""
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html")
    return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? ""
  }
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

/** Parsuje linie audytu z prefiksów [KRYTYCZNE] / [WAŻNE] / [OPCJONALNE] + [WPŁYW: …]. */
function parseAuditBulletLine(raw: string): {
  priority: "critical" | "warning" | "optional" | null
  impactParts: string[]
  body: string
} {
  let t = raw.trim()
  let priority: "critical" | "warning" | "optional" | null = null
  if (t.startsWith("[KRYTYCZNE]")) {
    priority = "critical"
    t = t.slice("[KRYTYCZNE]".length).trim()
  } else if (t.startsWith("[WAŻNE]")) {
    priority = "warning"
    t = t.slice("[WAŻNE]".length).trim()
  } else if (t.startsWith("[OPCJONALNE]")) {
    priority = "optional"
    t = t.slice("[OPCJONALNE]".length).trim()
  }

  let impactParts: string[] = []
  const wm = t.match(/^\[WPŁYW:\s*([^\]]+)\]\s*/)
  if (wm) {
    const inner = wm[1].trim()
    impactParts = inner.split("|").map((s) => s.trim()).filter(Boolean)
    t = t.slice(wm[0].length).trim()
  }

  return { priority, impactParts, body: t }
}

function normalizeAuditBodyForDedup(text: string): string {
  return parseAuditBulletLine(text)
    .body.toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function dedupeAuditItems(items: string[], seen?: Set<string>): string[] {
  const out: string[] = []
  const localSeen = seen ?? new Set<string>()

  for (const item of items) {
    const normalized = normalizeAuditBodyForDedup(item)
    if (!normalized) continue

    const duplicate = Array.from(localSeen).some((existing) => {
      if (existing === normalized) return true
      if (normalized.length < 36 || existing.length < 36) return false
      return existing.includes(normalized) || normalized.includes(existing)
    })

    if (duplicate) continue
    localSeen.add(normalized)
    out.push(item)
  }

  return out
}

function AuditBulletRow({
  text,
  variant = "default",
}: {
  text: string
  variant?: "default" | "positive"
}) {
  const { priority, body } = parseAuditBulletLine(text)
  const Icon =
    priority === "critical"
      ? CircleAlert
      : priority === "warning"
        ? AlertTriangle
        : priority === "optional"
          ? Info
          : variant === "positive"
            ? CheckCircle2
            : null
  const iconClass =
    priority === "critical"
      ? "text-red-400/95"
      : priority === "warning"
        ? "text-amber-400/90"
        : priority === "optional"
          ? "text-slate-400/85"
          : variant === "positive" && Icon
            ? "text-emerald-400/90"
            : "text-muted-foreground/50"

  return (
    <li className="list-none">
      <div className="flex gap-2.5 rounded-lg border border-white/6 bg-white/3 px-2.5 py-2">
        <div className="mt-0.5 shrink-0" aria-hidden>
          {Icon ? <Icon className={cn("h-4 w-4", iconClass)} strokeWidth={2} /> : (
            <span className="inline-block h-4 w-1 rounded-full bg-white/15" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {priority ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
              {priority === "critical"
                ? "Krytyczne"
                : priority === "warning"
                  ? "Ważne"
                  : "Opcjonalne"}
            </p>
          ) : variant === "positive" ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">Plus</p>
          ) : null}
          <p className="text-[12px] leading-snug text-foreground/88">{body}</p>
        </div>
      </div>
    </li>
  )
}

function ListingAuditDetailSections({
  audit,
  result,
}: {
  audit: ListingAuditResult
  result: Pick<
    GenerateResponse,
    "seoTitle" | "shortDescription" | "longDescription" | "metaDescription" | "tags"
  >
}) {
  const visibleStrengths = dedupeAuditItems(audit.strengths)
  const visibleSuggestedManualEdits = dedupeAuditItems(
    audit.suggestedManualEdits.filter((item) => !shouldHideResolvedAuditItem(item, result))
  )

  return (
    <div className="space-y-4 text-[12px] leading-relaxed text-muted-foreground">
      <div className="rounded-xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/8 via-black/20 to-black/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-emerald-400/90" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/85">Podsumowanie</p>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground/92">{audit.complianceSummary}</p>
      </div>

      {visibleStrengths.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/95">Co jest OK</p>
          <ul className="space-y-1.5">
            {visibleStrengths.map((x, i) => (
              <AuditBulletRow key={`ad-s-${i}`} text={x} variant="positive" />
            ))}
          </ul>
        </div>
      ) : null}
      {visibleSuggestedManualEdits.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/85">Sugerowane poprawki</p>
          <ul className="space-y-1.5">
            {visibleSuggestedManualEdits.map((x, i) => (
              <AuditBulletRow key={`ad-e-${i}`} text={x} />
            ))}
          </ul>
        </div>
      ) : null}
      <p className="border-t border-white/6 pt-3 text-[10px] leading-snug text-muted-foreground/75">
        {audit.disclaimer}
      </p>
    </div>
  )
}

function buildInitialRefineGroupOpen(
  grouped: Record<RefineNoteGroupId, RefineQuickRow[]>
): Partial<Record<RefineNoteGroupId, boolean>> {
  const next: Partial<Record<RefineNoteGroupId, boolean>> = {}
  let first = true
  for (const id of REFINE_NOTE_GROUP_ORDER) {
    if (grouped[id].length > 0) {
      next[id] = first
      first = false
    }
  }
  return next
}

function RefineNoteGroupsPanel({
  grouped,
  loading,
  onAppend,
}: {
  grouped: Record<RefineNoteGroupId, RefineQuickRow[]>
  loading: boolean
  onAppend: (text: string) => void
}) {
  const [open, setOpen] = useState(() => buildInitialRefineGroupOpen(grouped))

  return (
    <div className="max-h-[min(420px,56vh)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-linear-to-b from-black/30 via-black/20 to-black/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [-ms-overflow-style:none] [scrollbar-width:thin]">
      <div className="space-y-4">
        {REFINE_NOTE_GROUP_ORDER.map((groupId) => {
          const rows = grouped[groupId]
          if (rows.length === 0) return null
          const meta = REFINE_NOTE_GROUP_META[groupId]
          const SectionIcon = meta.Icon
          const groupOpen = open[groupId] ?? false
          return (
            <div
              key={groupId}
              className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 via-white/3 to-transparent p-3.5 transition-colors hover:border-white/12"
            >
              <button
                type="button"
                onClick={() =>
                  setOpen((prev) => ({
                    ...prev,
                    [groupId]: !groupOpen,
                  }))
                }
                aria-expanded={groupOpen}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/12">
                    <SectionIcon className="h-4 w-4 text-cyan-400/85" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold tracking-tight text-gray-100">{meta.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/70">{meta.hint}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/90">
                    {rows.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 text-muted-foreground/70 transition-transform",
                      groupOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </div>
              </button>
              {groupOpen ? (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/8 pt-3">
                  {rows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => onAppend(row.insert)}
                      disabled={loading}
                      title={row.insert}
                      className="max-w-full rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1.5 text-left text-[10px] font-medium leading-snug text-emerald-100/90 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/14 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SECTION_NAV: { id: string; label: string; Icon: typeof Tag }[] = [
  { id: "section-seo-title", label: "Tytuł SEO", Icon: Hash },
  { id: "section-short-desc", label: "Opis krótki", Icon: FileText },
  { id: "section-long-desc", label: "Opis długi", Icon: Layers },
  { id: "section-tags-meta", label: "Tagi i Meta", Icon: Tag },
]

const PLATFORM_HINTS: Record<string, string> = {
  allegro:
    "Allegro: w wyszukiwarce liczą się tytuł oferty i parametry (filtry). Opis HTML służy konwersji i SEO w Google \u2014 nie zastępuje parametrów w formularzu wystawiania.",
  amazon:
    `Amazon: tytuł (początek, ok. 70\u201380 zn. widoczne w apce) i exact match frazy; Backend ~249 bajtów UTF-8 (nie znaki \u2014 polskie ogonki 2 bajty; nadmiar może wyzerować całe pole; słowa spacją, bez przecinków). \u201eOpis krótki\u201d = styl Bullet Points. A+: tekst na grafice nie indeksuje się jak opis; Alt Text w modułach bywa indeksowany.`,
  woocommerce:
    `WooCommerce / WordPress: opis długi to HTML gotowy do wklejenia (h2, p, listy). Listy: <ul class="wp-block-list"> + <li> (Gutenberg) lub zwykłe <ul><li>. Nie wklejaj shortcodes wtyczek, jeśli ich nie używasz.`,
}

export interface DescriptionResultProps {
  result: GenerateResponse
  productName?: string
  onRegenerate?: () => void
  onRefineQuality?: () => void | Promise<void>
  refineAlreadyUsed?: boolean
  featuresText?: string
  loading?: boolean
  creditsRemaining?: number
  refineNotes?: string
  onRefineNotesChange?: (value: string) => void
  onListingAudit?: () => void | Promise<void>
  listingAuditLoading?: boolean
  listingAudit?: ListingAuditResult | null
}

export function DescriptionResult({
  result,
  productName,
  onRegenerate,
  onRefineQuality,
  refineAlreadyUsed = false,
  featuresText = "",
  loading = false,
  creditsRemaining,
  refineNotes = "",
  onRefineNotesChange,
  onListingAudit,
  listingAuditLoading = false,
  listingAudit = null,
}: DescriptionResultProps) {
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview")
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [clickedTag, setClickedTag] = useState<string | null>(null)
  const [listingAuditSeconds, setListingAuditSeconds] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listingAuditLoading) {
      setListingAuditSeconds(0)
      return
    }
    const startedAt = Date.now()
    const id = setInterval(() => {
      setListingAuditSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [listingAuditLoading])

  const score = result.qualityScore ?? 0
  const ringCirc = 2 * Math.PI * 40

  function trackFeedback(action: string, field?: string) {
    const descriptionId = result.descriptionId
    if (!descriptionId) return
    fetch("/api/description-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptionId, action, field }),
    }).catch(() => {})
  }

  const SECTION_FIELD_MAP: Record<string, string> = {
    title: "seoTitle",
    short: "shortDescription",
    longText: "longDescription",
    longHtml: "longDescription",
    tags: "tags",
    meta: "meta",
  }

  async function handleSectionCopy(text: string, sectionName: string) {
    const ok = await copyToClipboard(text)
    if (!ok) {
      toast.error("Nie udało się skopiować")
      return
    }
    setCopiedSection(sectionName)
    toast.success("Skopiowano!")
    setTimeout(() => setCopiedSection(null), 2000)
    trackFeedback("copy_raw", SECTION_FIELD_MAP[sectionName] ?? sectionName)
  }

  function copyBtnIcon(sectionName: string) {
    return copiedSection === sectionName
      ? <Check className="h-3 w-3" aria-hidden />
      : <Copy className="h-3 w-3" aria-hidden />
  }

  function copyButtonClass(sectionName: string) {
    return copiedSection === sectionName
      ? "inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-400 ring-2 ring-emerald-500/30 transition-all duration-300"
      : "inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-all duration-300 hover:bg-emerald-500/20 hover:text-emerald-400"
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

  const gapAnalysis = useMemo(
    () => analyzeQualityGaps(result, featuresText),
    [result, featuresText]
  )

  const refineQuickSuggestions = useMemo(() => {
    const seen = new Set<string>()
    const out: RefineQuickRow[] = []

    const normKey = (s: string) => s.trim().toLowerCase().slice(0, 160)

    const push = (raw: string, fromAudit: boolean) => {
      const insert = fromAudit ? parseAuditBulletLine(raw).body.trim() : raw.trim()
      if (!insert) return
      const k = normKey(insert)
      if (seen.has(k)) return
      seen.add(k)
      const label = shortenRefineLabel(insert)
      out.push({ id: `rq-${out.length}`, label, insert })
    }

    if (listingAudit) {
      for (const x of listingAudit.suggestedManualEdits) {
        if (isCriticalAuditItem(x)) push(x, true)
      }
      for (const x of listingAudit.missingInfo) {
        if (isCriticalAuditItem(x)) push(x, true)
      }
      return out.slice(0, 16)
    }
    for (const x of gapAnalysis.suggestedFeatureLines) push(x, false)
    for (const x of gapAnalysis.blockingItems.slice(0, 4)) push(x, false)

    return out.slice(0, 16)
  }, [listingAudit, gapAnalysis])

  const platformSlug = result.platformLimits?.slug

  const refineGrouped = useMemo(() => {
    const groups: Record<RefineNoteGroupId, RefineQuickRow[]> = {
      basics: [],
      specs: [],
      codes: [],
      other: [],
    }
    for (const row of refineQuickSuggestions) {
      if (!isRefineNoteRelevantForPlatform(row.insert, platformSlug)) continue
      if (row.insert.trim().length < 6) continue
      groups[classifyRefineNoteInsert(row.insert)].push(row)
    }
    return groups
  }, [refineQuickSuggestions, platformSlug])

  const refineNoteTotal = useMemo(
    () => REFINE_NOTE_GROUP_ORDER.reduce((n, id) => n + refineGrouped[id].length, 0),
    [refineGrouped]
  )

  const refineGroupedSig = useMemo(
    () => REFINE_NOTE_GROUP_ORDER.map((id) => refineGrouped[id].map((r) => r.id).join(",")).join("|"),
    [refineGrouped]
  )

  const [refineTemplatesOpen, setRefineTemplatesOpen] = useState(false)

  function appendRefineNote(insert: string) {
    if (!onRefineNotesChange) return
    const t = insert.trim()
    if (!t) return
    const base = refineNotes.trim()
    if (base.includes(t)) return
    onRefineNotesChange(base ? `${base}\n\n• ${t}` : `• ${t}`)
  }

  const auditGateFlow = typeof onListingAudit === "function"
  const auditCoverActive = auditGateFlow && !listingAudit

  const refineAllowed =
    typeof onRefineQuality === "function" &&
    !loading &&
    !refineAlreadyUsed &&
    (creditsRemaining === undefined || creditsRemaining > 0)

  const notesRequired = typeof onRefineNotesChange === "function"
  const hasRefineNotes = refineNotes.trim().length > 0
  const canClickRefine = refineAllowed && (!notesRequired || hasRefineNotes)

  function handleRegenerate() {
    window.scrollTo({ top: 0, behavior: "smooth" })
    onRegenerate?.()
  }

  async function handleCopyAll() {
    const parts = [seoTitle, shortDescription, stripHtml(longDescription), metaDescription]
    if (tags.length > 0) parts.push(`Tagi: ${tags.join(", ")}`)
    const text = parts.filter(Boolean).join("\n\n")
    const ok = await copyToClipboard(text)
    if (ok) {
      toast.success("Skopiowano cały listing!")
      trackFeedback("copy_raw", "all")
    } else {
      toast.error("Nie udało się skopiować")
    }
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const platformHint = platformSlug ? PLATFORM_HINTS[platformSlug] : null

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={containerRef} className="space-y-5 pb-24">
        {/* ── HERO: Score + Actions ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top_left,hsl(160_84%_39%/0.12)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(187_58%_48%/0.08)_0%,transparent_55%)] p-6 shadow-[0_0_80px_-20px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.07)]">
          {/* noise texture overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-[0.025]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">

            {/* ── Score centerpiece ── */}
            <div className="relative flex flex-col items-center gap-5 rounded-2xl border border-white/8 bg-black/20 p-6 backdrop-blur-sm sm:flex-row sm:items-start">
              {/* glow behind ring */}
              <div
                className="pointer-events-none absolute left-4 top-4 h-28 w-28 rounded-full blur-2xl"
                style={{ background: score >= 80 ? "rgba(16,185,129,0.25)" : score >= 60 ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)" }}
                aria-hidden
              />
              {/* ring — bigger */}
              <div className="relative shrink-0">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={score >= 80 ? "#10B981" : score >= 60 ? "#EAB308" : "#EF4444"}
                    strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={`${ringCirc}`}
                    strokeDashoffset={`${ringCirc * (1 - Math.min(100, Math.max(0, score)) / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: score >= 80 ? "drop-shadow(0 0 6px #10B981)" : score >= 60 ? "drop-shadow(0 0 6px #EAB308)" : "drop-shadow(0 0 6px #EF4444)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold leading-none tracking-tight text-foreground">{score}</span>
                  <span className="mt-0.5 text-[11px] font-medium text-muted-foreground/70">/ 100</span>
                </div>
              </div>

              {!auditCoverActive ? (
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    Quality Score
                  </div>
                  <p className="mt-3 text-xl font-bold tracking-tight text-foreground">
                    {score >= 90
                      ? "Oferta gotowa do publikacji."
                      : score >= 75
                        ? "Świetna baza — drobne szlify wystarczą."
                        : score >= 60
                          ? "Dobry start, warto dopracować szczegóły."
                          : "Wymaga poprawek przed publikacją."}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground/80">
                    {score < 100 && gapAnalysis.pointsTo100 > 0
                      ? `Do wyniku 100/100 brakuje jeszcze ${gapAnalysis.pointsTo100} pkt. — AI poprawi to jednym kliknięciem.`
                      : "Osiągnięto maksymalny wynik 100/100."}
                  </p>
                </div>
              ) : null}

              {auditCoverActive ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/96 px-6 py-8 text-center backdrop-blur-xl">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                    <Radar className="h-7 w-7 text-emerald-400" aria-hidden />
                  </div>
                  <div>
                    <p className="text-lg font-bold tracking-tight text-foreground">Analiza gotowa do uruchomienia.</p>
                    <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground/85">
                      Odblokuj pełny raport jakości i konwersji — kliknij <span className="font-semibold text-emerald-400">Analizuj ofertę</span> obok.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Action cards ── */}
            <div className="flex flex-col gap-4">
              {typeof onListingAudit === "function" ? (
                <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/25 hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.06),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">
                    Analiza jakości oferty
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground/85">
                    Regulamin, ryzyka zwrotów, luki SEO — analiza AI za 1 kredyt.
                  </p>
                  <button
                    type="button"
                    onClick={() => void onListingAudit()}
                    disabled={loading || listingAuditLoading || creditsRemaining === 0}
                    className="group/btn relative mt-4 inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-black shadow-[0_0_24px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-400 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                    {listingAuditLoading ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <ScanSearch className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <span className="flex flex-col items-start leading-tight">
                      <span>{listingAuditLoading ? `Skanowanie oferty… ${listingAuditSeconds}s` : "Skanuj ofertę"}</span>
                      <span className="text-[10px] font-semibold text-black/60">1 kredyt</span>
                    </span>
                  </button>
                  {creditsRemaining === 0 ? (
                    <p className="mt-2.5 text-xs font-medium text-amber-400/90">
                      Brak kredytów do skanowania oferty.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {onRefineQuality ? (
                <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-black/30 p-5 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/35 hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.25)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.07),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                      <Wand2 className="h-4 w-4 text-cyan-400" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
                        AI Upgrade
                      </p>
                      <p className="mt-1 text-base font-bold tracking-tight text-foreground">
                        Optymalizacja do 100% skuteczności
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground/80">
                        {notesRequired
                          ? "Wpisz instrukcję poniżej i uruchom jedno dopracowanie tego wyniku."
                          : "Jedno kliknięcie \u2192 maksymalna konwersja oferty."}
                      </p>
                    </div>
                  </div>
                  {refineAllowed ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void onRefineQuality?.()}
                        disabled={loading || !canClickRefine}
                        title={
                          notesRequired && !hasRefineNotes
                            ? "Najpierw wpisz instrukcj\u0119 do poprawy w polu poni\u017cej."
                            : "Przetwarza ten wygenerowany opis wraz z Twoimi danymi z formularza \u2014 poprawki wg Twojej instrukcji (gpt-4.1-mini, 1 kredyt, raz na ten wynik)"
                        }
                        className="group/btn relative mt-4 inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-linear-to-r from-cyan-500 to-teal-500 px-5 py-3.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(34,211,238,0.35)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(34,211,238,0.55)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                        <Wand2 className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex flex-col items-start leading-tight">
                          <span>Dopracuj do 100</span>
                          <span className="text-[10px] font-semibold text-black/60">1 kredyt</span>
                        </span>
                      </button>
                      {notesRequired && !hasRefineNotes ? (
                        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-400/90">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Wpisz instrukcję poniżej, aby odblokować.
                        </p>
                      ) : (
                        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground/60">
                          AI bazuje wyłącznie na Twoich danych z formularza — nie dodaje faktów spoza kontekstu.
                        </p>
                      )}
                    </>
                  ) : refineAlreadyUsed ? (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground/75">
                      Dopracowanie użyte dla tego opisu. Wygeneruj ponownie, aby go odblokować.
                    </p>
                  ) : !refineAllowed && creditsRemaining === 0 ? (
                    <p className="mt-3 text-xs font-medium text-amber-400/90">Brak kredytów do dopracowania.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Refine notes card ── */}
        {typeof onRefineNotesChange === "function" ? (
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.06),transparent_60%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {/* header */}
            <div className="mb-5 flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
                <Wand2 className="h-4 w-4 text-cyan-400" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-foreground">
                  Instrukcja do AI Upgrade
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground/70">
                  Opisz zmianę — AI wdroży ją, nie wymyślając faktów spoza Twoich danych.
                </p>
              </div>
            </div>

            {/* quick suggestions accordion */}
            {refineQuickSuggestions.length > 0 ? (
              <div className="mb-4 overflow-hidden rounded-2xl border border-white/8 bg-black/20">
                <button
                  type="button"
                  onClick={() => setRefineTemplatesOpen((o) => !o)}
                  aria-expanded={refineTemplatesOpen}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/4"
                >
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-cyan-400/70" aria-hidden />
                    Podpowiedzi AI
                    {refineNoteTotal > 0 ? (
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400/90">
                        {refineNoteTotal}
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform",
                      refineTemplatesOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                {refineTemplatesOpen ? (
                  <div className="border-t border-white/6 px-3 pb-3 pt-2">
                    {refineNoteTotal === 0 ? (
                      <p className="rounded-xl border border-white/8 bg-black/20 px-3 py-4 text-center text-xs leading-relaxed text-muted-foreground/70">
                        Brak podpowiedzi dla tej platformy. Wpisz instrukcję ręcznie poniżej.
                      </p>
                    ) : (
                      <RefineNoteGroupsPanel
                        key={refineGroupedSig}
                        grouped={refineGrouped}
                        loading={loading}
                        onAppend={appendRefineNote}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* textarea — centerpiece */}
            <div className="relative">
              <textarea
                id="refine-notes"
                value={refineNotes}
                onChange={(e) => onRefineNotesChange(e.target.value)}
                disabled={loading}
                placeholder="Np. zmień ton na bardziej luksusowy, uwypuklij trwałość materiału, skróć pierwszy akapit..."
                rows={4}
                className={cn(
                  "w-full resize-y rounded-2xl border bg-black/40 px-4 py-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 disabled:opacity-50",
                  hasRefineNotes
                    ? "border-cyan-500/40 ring-0 focus:border-cyan-400/60 focus:ring-cyan-500/15"
                    : "border-white/10 focus:border-cyan-500/40 focus:ring-cyan-500/10"
                )}
                maxLength={8000}
              />
              {/* char counter */}
              <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] tabular-nums text-muted-foreground/35">
                {refineNotes.length > 0 ? `${refineNotes.length} zn.` : ""}
              </span>
            </div>

            {/* status hint */}
            {!hasRefineNotes ? (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-400/70">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Wpisz instrukcję, aby odblokować przycisk <span className="font-semibold text-amber-300/90">Dopracuj do 100</span>.
              </p>
            ) : (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400/80">
                <Check className="h-3 w-3 shrink-0" />
                Instrukcja gotowa — możesz uruchomić AI Upgrade.
              </p>
            )}
          </div>
        ) : null}

        {/* ── Audit details card ── */}
        {listingAudit && auditGateFlow ? (
          <div className="gradient-border p-5">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                  Szczegóły weryfikacji
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Lista mocnych stron, braków i ryzyk wykrytych w audycie.
                </p>
              </div>
              <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
                <ListingAuditDetailSections audit={listingAudit} result={result} />
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Section nav chips + Copy all ── */}
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Przejdź do sekcji">
            {SECTION_NAV.map(({ id, label, Icon: NavIcon }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/8 hover:text-emerald-200"
              >
                <NavIcon className="h-3 w-3 shrink-0" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => void handleCopyAll()}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400/45 hover:bg-emerald-500/15"
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Kopiuj wszystko
            </button>
          </div>
        </div>

        {/* ── SEO Title (light card) ── */}
        <div id="section-seo-title" className="scroll-mt-20 rounded-2xl border border-white/8 bg-card/50 p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tytuł SEO
              {platformHint ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="rounded-md p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground/80" aria-label="Wskazówka dla platformy">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6} className="max-w-xs text-xs leading-relaxed">
                    {platformHint}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn("flex items-center gap-1 text-xs", seoTitle.length <= titleMax ? "text-emerald-400" : "text-red-400")}>
                {seoTitle.length}/{titleMax}
                {seoTitle.length > titleMax ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
              </span>
              <button type="button" onClick={() => void handleSectionCopy(seoTitle, "title")} className={copyButtonClass("title")}>
                {copyBtnIcon("title")}
                {copiedSection === "title" ? "Skopiowano" : "Kopiuj"}
              </button>
            </div>
          </div>
          <p className="text-base font-semibold text-foreground">{seoTitle}</p>
        </div>

        {/* ── Short description (light card) ── */}
        <div id="section-short-desc" className="scroll-mt-20 rounded-2xl border border-white/8 bg-card/50 p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {shortDescriptionLabel}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn("flex items-center gap-1 text-xs", shortDescription.length <= shortMax ? "text-emerald-400" : "text-red-400")}>
                {shortDescription.length}/{shortMax}
                {shortDescription.length > shortMax ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
              </span>
              <button type="button" onClick={() => void handleSectionCopy(shortDescription, "short")} className={copyButtonClass("short")}>
                {copyBtnIcon("short")}
                {copiedSection === "short" ? "Skopiowano" : "Kopiuj"}
              </button>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{shortDescription}</p>
        </div>

        {/* ── Long description (light card) ── */}
        <div id="section-long-desc" className="scroll-mt-20 rounded-2xl border border-white/8 bg-card/50 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Opis długi
              </span>
              <span
                className={cn("flex items-center gap-1 text-xs", longWordCount >= longMinWords ? "text-emerald-400/90" : "text-amber-400/90")}
                title={
                  result.platformLimits?.slug === "allegro"
                    ? "Cel redakcyjny (jakość / SEO) — Allegro nie narzuca minimalnej liczby słów w opisie HTML."
                    : "Zalecenie jakościowe dla tej platformy — lepsza treść pod konwersję i SEO."
                }
              >
                ~{longWordCount} słów (cel min. {longMinWords})
                {longWordCount < longMinWords ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <div className="inline-flex overflow-hidden rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium transition-all",
                    viewMode === "preview" ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  Podgląd
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("html")}
                  className={cn(
                    "border-l border-white/10 px-2.5 py-1 text-xs font-medium transition-all",
                    viewMode === "html" ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  HTML
                </button>
              </div>
              <button type="button" onClick={() => void handleSectionCopy(stripHtml(longDescription), "longText")} className={copyButtonClass("longText")}>
                {copyBtnIcon("longText")}
                {copiedSection === "longText" ? "Skopiowano" : "Kopiuj tekst"}
              </button>
              <button type="button" onClick={() => void handleSectionCopy(longDescription, "longHtml")} className={copyButtonClass("longHtml")}>
                {copyBtnIcon("longHtml")}
                {copiedSection === "longHtml" ? "Skopiowano" : "Kopiuj HTML"}
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

        {/* ── Tags + Meta combined card (light, 2-col on desktop) ── */}
        <div id="section-tags-meta" className="scroll-mt-20 rounded-2xl border border-white/8 bg-card/50 p-5">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tags column */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Tag className="h-3.5 w-3.5 text-emerald-400/80" aria-hidden />
                  {tagsLabel}
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground/85">
                    {tags.length}
                  </span>
                </span>
                <button type="button" onClick={() => void handleSectionCopy(tags.join(", "), "tags")} className={copyButtonClass("tags")}>
                  {copyBtnIcon("tags")}
                  {copiedSection === "tags" ? "Skopiowano" : "Kopiuj"}
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
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-xs transition-all duration-200",
                      clickedTag === tag
                        ? "scale-110 bg-emerald-500 text-white"
                        : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Meta Description column */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Hash className="h-3.5 w-3.5 text-cyan-400/80" aria-hidden />
                  Meta Description
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn("flex items-center gap-1 text-xs", metaDescription.length <= metaMax ? "text-emerald-400" : "text-red-400")}>
                    {metaDescription.length}/{metaMax}
                    {metaDescription.length > metaMax ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
                  </span>
                  <button type="button" onClick={() => void handleSectionCopy(metaDescription, "meta")} className={copyButtonClass("meta")}>
                    {copyBtnIcon("meta")}
                    {copiedSection === "meta" ? "Skopiowano" : "Kopiuj"}
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{metaDescription}</p>
            </div>
          </div>
        </div>

        {result.promptVersion ? (
          <p className="text-center text-[10px] text-muted-foreground/50">
            Wersja generatora: {result.promptVersion}
          </p>
        ) : null}

        {/* ── Sticky bottom action bar ── */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-background/80 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.06),transparent_70%)]" />
          <div className="relative mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={handleRegenerate}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-muted-foreground/80 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Generuj</span> ponownie
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await exportToPDF(result, productName || "Produkt")
                  toast.success("PDF pobrany!")
                } catch {
                  toast.error("Błąd generowania PDF")
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-muted-foreground/80 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" aria-hidden />
              Eksport PDF
            </button>
            <button
              type="button"
              onClick={() => void handleCopyAll()}
              className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.03] hover:bg-emerald-400 hover:shadow-[0_0_35px_rgba(16,185,129,0.5)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
              <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Kopiuj wszystko
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default DescriptionResult
