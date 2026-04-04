"use client"

import { stripSummaryPrefix } from "@/lib/generation/strip-summary-prefix"
import {
  getVisionExtractionSummaryRows,
  patchProductImageAnalysis,
  type ProductImageAnalysis,
  type TruthExtractionFromImage,
} from "@/lib/generation/product-image-analysis"
import {
  DEFAULT_PRODUCT_IMAGE_PROMPT_KIND,
  PRODUCT_IMAGE_PROMPT_KINDS,
  getProductImagePromptKindLabelPl,
  parseProductImagePromptKind,
} from "@/lib/generation/product-image-prompt-kinds"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScanText, BookOpen, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

const CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: "nieznane", label: "Nieznane" },
  { value: "nowy", label: "Nowy" },
  { value: "nowy w opakowaniu", label: "Nowy w opakowaniu" },
  { value: "używany", label: "Używany" },
  { value: "powystawowy", label: "Powystawowy" },
  { value: "uszkodzony", label: "Uszkodzony" },
  { value: "refurbished", label: "Odświeżony (refurbished)" },
  { value: "otwarte opakowanie", label: "Otwarte opakowanie" },
]

function normalizeConditionValue(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (!t || t === "nieznany" || t === "unknown" || t === "n/a" || t === "brak") return "nieznane"
  const hit = CONDITION_OPTIONS.find((o) => o.value.toLowerCase() === t)
  if (hit) return hit.value
  return raw.trim()
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-[13px] text-gray-100 outline-none transition-all placeholder:text-white/25 hover:border-white/20 focus:border-emerald-500/50 focus:bg-white/6 focus:ring-1 focus:ring-emerald-500/20"

const selectTriggerClass =
  "h-auto w-full rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-[13px] text-gray-100 transition-all hover:border-white/20 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 data-placeholder:text-white/30"

const labelClass = "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-white/40"

const sectionHeadingClass =
  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30"


const ENRICHMENT_LABELS: Record<string, { icon: "book" | "globe"; label: string }> = {
  google_books: { icon: "book", label: "Google Books" },
  open_library: { icon: "globe", label: "Open Library" },
}

function EnrichmentBadge({ source, identifier }: { source?: string; identifier?: string }) {
  if (!source || source === "none") return null
  const info = ENRICHMENT_LABELS[source]
  if (!info) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300/90"
      title={identifier ? `Wzbogacono danymi z ${info.label} (ID: ${identifier})` : `Wzbogacono danymi z ${info.label}`}
    >
      {info.icon === "book" ? (
        <BookOpen className="h-3 w-3" aria-hidden />
      ) : (
        <Globe className="h-3 w-3" aria-hidden />
      )}
      {info.label}
    </span>
  )
}

type Props = {
  analysis: ProductImageAnalysis
  onChange: (next: ProductImageAnalysis) => void
}

export function VisionExtractionEditor({ analysis, onChange }: Props) {
  if (getVisionExtractionSummaryRows(analysis).length === 0) return null

  const e = analysis.extraction
  const promptKind = analysis.promptKind ?? DEFAULT_PRODUCT_IMAGE_PROMPT_KIND

  const apply = (patch: Parameters<typeof patchProductImageAnalysis>[1]) => {
    onChange(patchProductImageAnalysis(analysis, patch))
  }

  const patchExt = (extractionPatch: Partial<TruthExtractionFromImage>) => {
    apply({ extractionPatch })
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-br from-emerald-950/40 via-black/20 to-cyan-950/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_40px_-20px_rgba(16,185,129,0.15)]"
      role="region"
      aria-label="Edycja podstawowych pól z ekstrakcji ze zdjęcia"
    >
      {/* subtle radial glow in corner */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)" }}
        aria-hidden
      />

      {/* header */}
      <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10">
          <ScanText className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-tight text-white/85">
            Dane ze zdjęcia
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-white/35">
            Popraw jeśli AI się pomyliło — wpłynie na wynik generatora
          </p>
          {analysis.enrichmentSource && analysis.enrichmentSource !== "none" && (
            <EnrichmentBadge source={analysis.enrichmentSource} identifier={analysis.enrichmentIdentifier} />
          )}
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* Product name — full row */}
        <div>
          <span className={labelClass}>Wykryta nazwa produktu</span>
          <input
            type="text"
            className={inputClass}
            value={analysis.detectedProductName}
            onChange={(ev) => onChange({ ...analysis, detectedProductName: ev.target.value.slice(0, 220) })}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Classification section */}
        <div>
          <div className={sectionHeadingClass}>
            <span className="h-px flex-1 bg-white/8" />
            Klasyfikacja
            <span className="h-px flex-1 bg-white/8" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <StyledSelect
              label="Kategoria AI"
              value={promptKind}
              onValueChange={(v) => apply({ promptKind: parseProductImagePromptKind(v) })}
              triggerClass={selectTriggerClass}
            >
              {PRODUCT_IMAGE_PROMPT_KINDS.map((k) => (
                <SelectItem key={k} value={k} className="text-[13px] text-gray-200 focus:bg-emerald-500/12 focus:text-emerald-100">
                  {getProductImagePromptKindLabelPl(k)}
                </SelectItem>
              ))}
            </StyledSelect>
          </div>
        </div>

        {/* Product details section */}
        <div>
          <div className={sectionHeadingClass}>
            <span className="h-px flex-1 bg-white/8" />
            Szczegóły produktu
            <span className="h-px flex-1 bg-white/8" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Typ produktu" value={e.product_type} onChange={(v) => patchExt({ product_type: v })} />
            <Field label="Marka" value={e.brand} onChange={(v) => patchExt({ brand: v })} />
            <Field label="Model" value={e.model} onChange={(v) => patchExt({ model: v })} />
            <Field label="Kolor" value={e.color} onChange={(v) => patchExt({ color: v })} />
            <Field label="Materiał" value={e.material} onChange={(v) => patchExt({ material: v })} />
            <ConditionField value={e.condition} onChange={(v) => patchExt({ condition: v })} />
          </div>
        </div>

        {/* Lists section */}
        <div>
          <div className={sectionHeadingClass}>
            <span className="h-px flex-1 bg-white/8" />
            Cechy i zawartość
            <span className="h-px flex-1 bg-white/8" />
          </div>
          <div className="mt-3 space-y-3">
            <ListField
              label="Cechy widoczne na zdjęciu"
              values={e.visible_features}
              onChange={(next) => patchExt({ visible_features: next })}
              placeholder="np. numer seryjny na obudowie"
              minRows={3}
              stripDisplayPrefix
            />
            <ListField
              label="Zawartość zestawu"
              values={e.included_items}
              onChange={(next) => patchExt({ included_items: next })}
              placeholder="np. kabel w zestawie"
              minRows={2}
            />
            <ListField
              label="Wady / uwagi"
              values={e.defects}
              onChange={(next) => patchExt({ defects: next })}
              placeholder=""
              minRows={2}
              accent="rose"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── sub-components ─────────────────────── */

function StyledSelect({
  label,
  value,
  onValueChange,
  triggerClass,
  children,
}: {
  label: string
  value: string
  onValueChange: (v: string) => void
  triggerClass: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <span className={labelClass}>{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-[hsl(222_40%_7%)] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
          {children}
        </SelectContent>
      </Select>
    </div>
  )
}

function ListField({
  label,
  values,
  onChange,
  placeholder,
  minRows,
  accent = "emerald",
  stripDisplayPrefix = false,
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
  minRows: number
  accent?: "emerald" | "rose"
  /** Ucina prefiksy typu „Fakt:” w textarea (dane w stanie mogą nadal je mieć). */
  stripDisplayPrefix?: boolean
}) {
  const text = stripDisplayPrefix ? values.map(stripSummaryPrefix).join("\n") : values.join("\n")
  const accentFocus =
    accent === "rose"
      ? "focus:border-rose-500/50 focus:ring-rose-500/20"
      : "focus:border-emerald-500/50 focus:ring-emerald-500/20"
  const accentLabel = accent === "rose" ? "text-rose-400/60" : "text-white/40"
  return (
    <label className="block">
      <span className={cn("mb-1.5 block text-[10px] font-semibold uppercase tracking-widest", accentLabel)}>
        {label}{" "}
        <span className="font-normal normal-case opacity-70">(jedna linia = jeden punkt)</span>
      </span>
      <textarea
        className={cn(inputClass, "min-h-12 resize-y", accentFocus)}
        rows={minRows}
        placeholder={placeholder}
        value={text}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        onBlur={(e) => {
          const cleaned = e.target.value.split("\n").filter((l) => l.trim().length > 0)
          if (cleaned.length !== values.length || cleaned.some((l, i) => l !== values[i])) {
            onChange(cleaned)
          }
        }}
        spellCheck={false}
      />
    </label>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <input
        type="text"
        className={inputClass}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  )
}

function ConditionField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const raw = value.trim()
  const normalized = normalizeConditionValue(value)
  const isStandard = CONDITION_OPTIONS.some((o) => o.value === normalized)
  const selectValue = isStandard ? normalized : raw

  return (
    <StyledSelect
      label="Stan produktu"
      value={selectValue}
      onValueChange={onChange}
      triggerClass={selectTriggerClass}
    >
      {CONDITION_OPTIONS.map((o) => (
        <SelectItem
          key={o.value}
          value={o.value}
          className="text-[13px] text-gray-200 focus:bg-emerald-500/12 focus:text-emerald-100"
        >
          {o.label}
        </SelectItem>
      ))}
      {raw && !isStandard ? (
        <SelectItem
          value={raw}
          className="text-[13px] text-gray-200 focus:bg-emerald-500/12 focus:text-emerald-100"
        >
          {raw} (z AI)
        </SelectItem>
      ) : null}
    </StyledSelect>
  )
}
