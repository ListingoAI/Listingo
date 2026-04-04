/** Typy i formatowanie analizy zdjęcia — bez importu OpenAI (bezpieczne dla „use client”). */

import type { ProductImagePromptKind } from '@/lib/generation/product-image-prompt-kinds'
import {
  DEFAULT_PRODUCT_IMAGE_PROMPT_KIND,
  getProductImagePromptKindLabelPl,
  parseProductImagePromptKind,
} from '@/lib/generation/product-image-prompt-kinds'

export type EnrichmentSource = 'google_books' | 'open_library' | 'none'

/** ETAP 1 — ekstrakcja faktów (vision); bez marketingu */
export type TruthExtractionConfidence = 'low' | 'medium' | 'high'

/** Klasyfikacja oferty pod listingu — ustalana ze zdjęcia przed generowaniem opisu. */
export type ListingProductKind = 'FUNCTIONAL' | 'EMOTIONAL' | 'HYBRID'

export function listingProductKindLabelPl(k: ListingProductKind): string {
  switch (k) {
    case 'FUNCTIONAL':
      return 'funkcjonalny — rozwiązuje problem (użyteczność)'
    case 'EMOTIONAL':
      return 'emocjonalny — odczucie / styl / nastrój'
    case 'HYBRID':
      return 'hybrydowy — funkcja i emocja (np. premium + użyteczność)'
  }
}

export type TruthExtractionFromImage = {
  product_type: string
  brand: string
  model: string
  category: string
  color: string
  material: string
  visible_features: string[]
  condition: string
  /**
   * Zastrzeżone — pipeline zeruje po parsowaniu; model ma nie opisywać tła/UI (skupienie na produkcie).
   */
  staging_visible: string[]
  /**
   * Tylko części sprzedażowe / montażowe (śruby, osobne elementy zestawu), nie rekwizyty ze zdjęcia lifestyle.
   */
  included_items: string[]
  defects: string[]
  /**
   * Dosłownie przepisane napisy z produktu/opakowania/metki (OCR) — bez interpretacji.
   */
  text_on_product: string[]
  confidence: TruthExtractionConfidence
  /**
   * Z obrazu: FUNCTIONAL = rozwiązuje problem; EMOTIONAL = odczucie/styl; HYBRID = oba — zwracane w JSON Vision przed opisem.
   */
  listing_product_kind: ListingProductKind
}

export const EMPTY_TRUTH_EXTRACTION: TruthExtractionFromImage = {
  product_type: '',
  brand: '',
  model: '',
  category: '',
  color: '',
  material: '',
  visible_features: [],
  condition: '',
  staging_visible: [],
  included_items: [],
  defects: [],
  text_on_product: [],
  confidence: 'low',
  listing_product_kind: 'HYBRID',
}

export type ProductImageAnalysis = {
  /** Surowe fakty z ETAPU 1 (truth extraction) */
  extraction: TruthExtractionFromImage
  /** Klasyfikacja ze zdjęcia (to samo co extraction.listing_product_kind — wygodniej w generatorze). */
  listingProductKind: ListingProductKind
  /** Kategoria promptu użyta przy ekstrakcji (router); przy merge może być general jeśli mix zdjęć */
  promptKind?: ProductImagePromptKind
  /** Pola zunifikowane pod generator / formularz (mapowanie z extraction lub legacy) */
  detectedProductName: string
  visibleAttributes: string[]
  visibleCategoryHint: string
  /** Krótki lead faktualny (bez marketingu), opcjonalnie */
  listingSummary?: string
  productDetailLines?: string[]
  /** ETAP 1: zwykle brak — marketing dopiero w generatorze */
  salesImpressionLines?: string[]
  notVisibleOrUncertainLines?: string[]
  /** Zrodlo enrichmentu (google_books, open_library, none) */
  enrichmentSource?: EnrichmentSource
  enrichmentIdentifier?: string
}

function isUnknownToken(s: string): boolean {
  const t = s.trim().toLowerCase()
  return !t || t === 'nieznane' || t === 'unknown' || t === 'n/a' || t === 'brak'
}

function normField(s: unknown): string {
  if (typeof s !== 'string') return ''
  return s.trim()
}

function parseConfidence(raw: unknown): TruthExtractionConfidence {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'low' || s === 'medium' || s === 'high') return s
  if (s.includes('low')) return 'low'
  if (s.includes('medium')) return 'medium'
  if (s.includes('high')) return 'high'
  return 'low'
}

function parseListingProductKind(raw: unknown): ListingProductKind {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (s === 'FUNCTIONAL' || s === 'EMOTIONAL' || s === 'HYBRID') return s
  const lower = s.toLowerCase()
  if (lower.includes('funkcj') || lower.includes('functional')) return 'FUNCTIONAL'
  if (lower.includes('emocj') || lower.includes('emotional')) return 'EMOTIONAL'
  if (lower.includes('hybryd') || lower.includes('hybrid')) return 'HYBRID'
  return 'HYBRID'
}

function parseStringList(raw: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0 && x.length <= maxLen)
    .slice(0, max)
}

/** Usuwa duplikaty i krótsze frazy zawarte w dłuższej (np. „boczne półki” vs „boczne półki w formie drabinki”). */
function dedupeSimilarStrings(items: string[], max: number): string[] {
  const arr = [...new Set(items.map((x) => x.trim()).filter(Boolean))]
  arr.sort((a, b) => b.length - a.length)
  const out: string[] = []
  for (const x of arr) {
    const lx = x.toLowerCase()
    const subsumed = out.some((o) => {
      const lo = o.toLowerCase()
      return lo.includes(lx) && lo.length > lx.length
    })
    if (!subsumed) out.push(x)
    if (out.length >= max) break
  }
  return out
}

/** Wyraźne rekwizyty lifestyle — jeśli model wpisze je do included_items, przenosimy tu. */
const STAGING_ITEM_HINT =
  /\b(ubran|odzie|koszul|spodn|marynar|kurt|sukien|but|obuw|toreb|torba|kapelusz|czap|parasol|parasolk|pudełko|materiałowe|materialow|kosmetycz|dyfuzor|prezent|wieszaków|wieszaki\s+drewn)/i

function moveStagingOutOfIncluded(
  productType: string,
  included: string[],
  staging: string[]
): { included: string[]; staging: string[] } {
  const pt = productType.trim().toLowerCase()
  const nextInc: string[] = []
  const nextStaging = [...staging]
  for (const raw of included) {
    const t = raw.trim()
    if (!t) continue
    const l = t.toLowerCase()
    if (pt && (l === pt || (l.length < 80 && pt.includes(l)) || (l.length < 80 && l.includes(pt)))) {
      nextStaging.push(t)
      continue
    }
    if (STAGING_ITEM_HINT.test(t)) {
      nextStaging.push(t)
      continue
    }
    nextInc.push(t)
  }
  return {
    included: dedupeSimilarStrings(nextInc, 14),
    staging: dedupeSimilarStrings(nextStaging, 18),
  }
}

/**
 * Linie zaczynające się od FUNCTIONAL / EMOTIONAL / HYBRID to zwykle echo
 * `listing_product_kind` (pole JSON jest źródłem prawdy) — nie pokazujemy ich w cechach widocznych.
 */
function isListingProductKindEchoLine(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  return /^(HYBRID|FUNCTIONAL|EMOTIONAL)\b/i.test(t)
}

export function filterListingKindEchoFromVisibleFeatures(lines: string[]): string[] {
  return lines.filter((line) => !isListingProductKindEchoLine(line))
}

/** Normalizacja po parsowaniu: deduplikacja, rozdział rekwizytów od zestawu */
export function finalizeTruthExtraction(
  e: TruthExtractionFromImage
): TruthExtractionFromImage {
  const vf = dedupeSimilarStrings(
    filterListingKindEchoFromVisibleFeatures(e.visible_features),
    24
  )
  const staging0 = dedupeSimilarStrings(e.staging_visible, 16)
  const { included } = moveStagingOutOfIncluded(
    e.product_type,
    dedupeSimilarStrings(e.included_items, 14),
    staging0
  )
  return {
    ...e,
    visible_features: vf,
    staging_visible: [],
    included_items: included,
    defects: dedupeSimilarStrings(e.defects, 12),
    text_on_product: dedupeSimilarStrings(e.text_on_product, 40),
  }
}

/** Parsuje JSON z modelu (ETAP 1) do struktury TruthExtraction */
export function parseTruthExtractionFromRaw(
  raw: Record<string, unknown>
): TruthExtractionFromImage {
  const base: TruthExtractionFromImage = {
    product_type: normField(raw.product_type).slice(0, 400),
    brand: normField(raw.brand).slice(0, 200),
    model: normField(raw.model).slice(0, 200),
    category: normField(raw.category).slice(0, 280),
    color: normField(raw.color).slice(0, 120),
    material: normField(raw.material).slice(0, 160),
    visible_features: parseStringList(raw.visible_features, 28, 220),
    condition: normField(raw.condition).slice(0, 160),
    staging_visible: parseStringList(raw.staging_visible, 16, 200),
    included_items: parseStringList(raw.included_items, 12, 200),
    defects: parseStringList(raw.defects, 12, 240),
    text_on_product: parseStringList(raw.text_on_product, 40, 500),
    confidence: parseConfidence(raw.confidence),
    listing_product_kind: parseListingProductKind(raw.listing_product_kind),
  }
  return finalizeTruthExtraction(base)
}

function displayValue(s: string): string {
  return isUnknownToken(s) ? '' : s.trim()
}

/** Tytuł z linii typu „tytuł: …” w visible_features (książka). */
export function tryBookTitleFromVisibleFeatures(features: string[]): string {
  for (const line of features) {
    const t = line.trim()
    const m = t.match(/^tytuł\s*:\s*(.+)$/i)
    if (m && m[1].trim().length >= 2) {
      return m[1].trim().slice(0, 220)
    }
  }
  for (const line of features) {
    const m = line.match(/tytuł\s*:\s*(.+)/i)
    if (m && m[1].trim().length >= 3) {
      return m[1].trim().slice(0, 220)
    }
  }
  return ''
}

function isGenericBookProductLabel(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (!t) return false
  return /^(książka|ksiazka|publikacja|publikacja\s+książkowa|komiks|magazyn|album)$/.test(t)
}

/** Składa nazwę produktu do pola „Nazwa” — bez zgadywania; typ produktu gdy brak marki */
export function buildDetectedProductNameFromExtraction(
  e: TruthExtractionFromImage
): string {
  const brand = displayValue(e.brand)
  const model = displayValue(e.model)
  const pt = displayValue(e.product_type)

  const head =
    brand && model
      ? `${brand} ${model}`.trim()
      : brand || model || ''

  let out: string
  if (head && pt) {
    const hl = head.toLowerCase()
    const pl = pt.toLowerCase()
    if (pl.includes(hl) || hl.includes(pl)) out = head.slice(0, 220)
    else out = `${head} — ${pt}`.slice(0, 220)
  } else if (head) {
    out = head.slice(0, 220)
  } else if (pt) {
    out = pt.slice(0, 220)
  } else {
    out = ''
  }

  if (out && isGenericBookProductLabel(out)) {
    const fromFeat = tryBookTitleFromVisibleFeatures(e.visible_features)
    if (fromFeat) return fromFeat
  }
  if (!head && pt && isGenericBookProductLabel(pt)) {
    const fromFeat = tryBookTitleFromVisibleFeatures(e.visible_features)
    if (fromFeat) return fromFeat
  }
  return out
}

/**
 * Mapuje truth extraction → pola używane przez formularz i generator.
 * ETAP 1: zero linii sprzedażowych; tylko fakty i jawne ograniczenia pewności.
 */
export function buildProductImageAnalysisFromExtraction(
  e: TruthExtractionFromImage
): ProductImageAnalysis {
  const detectedProductName = buildDetectedProductNameFromExtraction(e)

  const visibleAttributes = [...e.visible_features]
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .slice(0, 22)

  const detailLines: string[] = []
  const col = displayValue(e.color)
  if (col) detailLines.push(`Kolor (widać): ${col}`)
  const mat = displayValue(e.material)
  if (mat) detailLines.push(`Materiał (widać): ${mat}`)
  const cond = displayValue(e.condition)
  if (cond) detailLines.push(`Stan (widać): ${cond}`)

  for (const item of e.included_items) {
    const t = item.trim()
    if (t) detailLines.push(`Części zestawu / montażu (widać): ${t}`)
  }
  for (const d of e.defects) {
    const t = d.trim()
    if (t) detailLines.push(`Wada / uwaga widoczna: ${t}`)
  }
  for (const txt of e.text_on_product) {
    const t = txt.trim()
    if (t) detailLines.push(`Napis na produkcie (OCR): ${t}`)
  }

  for (const f of visibleAttributes) {
    if (!detailLines.some((line) => line.includes(f))) {
      detailLines.push(f)
    }
  }

  const uncertain: string[] = []
  if (e.confidence === 'low') {
    uncertain.push(
      'Pewność ekstrakcji (AI): niska — zweryfikuj markę, model i stan względem zdjęcia.'
    )
  } else if (e.confidence === 'medium') {
    uncertain.push(
      'Pewność ekstrakcji (AI): średnia — sprawdź krytyczne pola (marka, model, stan).'
    )
  }

  const pt = displayValue(e.product_type)
  const listingSummary = pt ? pt.slice(0, 900) : undefined

  return {
    extraction: e,
    listingProductKind: e.listing_product_kind,
    detectedProductName,
    visibleAttributes,
    visibleCategoryHint: displayValue(e.category),
    ...(listingSummary ? { listingSummary } : {}),
    productDetailLines: dedupeLines(detailLines, 24),
    salesImpressionLines: undefined,
    notVisibleOrUncertainLines:
      uncertain.length > 0 ? uncertain : undefined,
  }
}

function extractionHasContent(e: TruthExtractionFromImage): boolean {
  if (
    displayValue(e.product_type) ||
    displayValue(e.brand) ||
    displayValue(e.model) ||
    displayValue(e.category) ||
    displayValue(e.color) ||
    displayValue(e.material) ||
    displayValue(e.condition)
  ) {
    return true
  }
  if (e.visible_features.some((x) => x.trim().length > 0)) return true
  if (e.included_items.some((x) => x.trim().length > 0)) return true
  if (e.defects.some((x) => x.trim().length > 0)) return true
  if (e.text_on_product.some((x) => x.trim().length > 0)) return true
  return false
}

/**
 * Waliduje JSON z klienta (np. po edycji w UI) i składa ProductImageAnalysis.
 * Zwraca null, gdy brak sensownej ekstrakcji — wtedy generator może ponownie wywołać Vision.
 */
export function parseProductImageAnalysisFromClientJson(
  raw: unknown
): ProductImageAnalysis | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!o.extraction || typeof o.extraction !== 'object') return null
  const rawEx = o.extraction as Record<string, unknown>
  const extraction = parseTruthExtractionFromRaw({
    ...rawEx,
    listing_product_kind:
      rawEx.listing_product_kind ?? o.listingProductKind ?? o.listing_product_kind,
  })
  const base = buildProductImageAnalysisFromExtraction(extraction)
  const nameOverride =
    typeof o.detectedProductName === 'string' && o.detectedProductName.trim()
      ? o.detectedProductName.trim().slice(0, 220)
      : null
  const attrsOverride = Array.isArray(o.visibleAttributes)
    ? o.visibleAttributes
        .map((x) => String(x).trim())
        .filter((x) => x.length > 0)
        .slice(0, 12)
    : null
  const out: ProductImageAnalysis = {
    ...base,
    ...(nameOverride ? { detectedProductName: nameOverride } : {}),
    ...(attrsOverride && attrsOverride.length > 0
      ? { visibleAttributes: attrsOverride }
      : {}),
  }
  if (o.promptKind !== undefined && o.promptKind !== null) {
    out.promptKind = parseProductImagePromptKind(o.promptKind)
  }
  if (!hasSubstantiveImageAnalysis(out)) return null
  return out
}

/** Czy jest sens doklejać blok „ANALIZA ZE ZDJĘCIA” do promptu generowania */
export function hasSubstantiveImageAnalysis(a: ProductImageAnalysis): boolean {
  if (a.extraction && extractionHasContent(a.extraction)) return true
  return (
    Boolean(a.detectedProductName?.trim()) ||
    Boolean(a.visibleCategoryHint?.trim()) ||
    a.visibleAttributes.length > 0 ||
    Boolean(a.listingSummary?.trim()) ||
    (a.productDetailLines?.length ?? 0) > 0 ||
    (a.salesImpressionLines?.length ?? 0) > 0 ||
    (a.notVisibleOrUncertainLines?.length ?? 0) > 0
  )
}

function resolvePromptKind(a: ProductImageAnalysis): ProductImagePromptKind {
  return a.promptKind ?? DEFAULT_PRODUCT_IMAGE_PROMPT_KIND
}

/** Usuwa powtarzalne etykiety z linii Vision — czytelniejsze pole „Cechy”. */
function stripVisionFeaturePrefix(line: string): string {
  return line
    .replace(/^(Fakt|Wniosek|Interpretacja obrazu)\s*:\s*/iu, '')
    .replace(/^Korzyść\s*\([^)]*\)\s*:\s*/iu, '')
    .trim()
}

/** Grupuje obserwacje: liczby/wymiary vs fakty konstrukcyjne vs wnioski modelu. */
function classifyVisionFeatureLine(
  raw: string
): 'dimensionMeta' | 'inference' | 'construction' {
  const t = raw.trim()
  if (
    /^wniosek\s*:/i.test(t) ||
    /^korzyść\s*\(/i.test(t) ||
    /^interpretacja obrazu\s*:/i.test(t)
  ) {
    return 'inference'
  }
  if (/^fakt:\s*/i.test(t)) {
    const rest = t.replace(/^fakt:\s*/i, '')
    const rl = rest.toLowerCase()
    if (/\b(waga|gwarancja|zwrot)\b/i.test(rl)) return 'dimensionMeta'
    if (/\b(wysokość|szerokość|głębokość|wymiar|wymiary)\b/i.test(rl) && /\d/.test(rest)) {
      return 'dimensionMeta'
    }
    if (/\(z grafiki\)/i.test(t) && /\d/.test(t)) return 'dimensionMeta'
    return 'construction'
  }
  if (/^waga\s*:/i.test(t) || /^gwarancja\s*:/i.test(t)) return 'dimensionMeta'
  if (/\b(wysokość|szerokość|głębokość)\b.*\(z grafiki\)/i.test(t)) return 'dimensionMeta'
  return 'construction'
}

function observationSectionTitleSimple(kind: ProductImagePromptKind): string {
  switch (kind) {
    case 'book':
      return 'Okładka / grzbiet (widać):'
    case 'furniture':
      return 'Konstrukcja (widać):'
    case 'electronics':
      return 'Obudowa i detale (widać):'
    case 'fashion':
      return 'Fason i metka (widać):'
    case 'food_beverage':
      return 'Opakowanie i etykieta (widać):'
    case 'beauty_health':
      return 'Opakowanie (widać):'
    case 'sports_outdoor':
      return 'Produkt sportowy (widać):'
    case 'kids_toys':
      return 'Zabawka (widać):'
    case 'home_garden':
      return 'Narzędzie (widać):'
    case 'automotive':
      return 'Część / opona (widać):'
    default:
      return 'Obserwacje (widać):'
  }
}

function formatVisibleFeaturesForFeaturesField(
  features: string[],
  kind: ProductImagePromptKind
): string[] {
  const dimensionMeta: string[] = []
  const inference: string[] = []
  const construction: string[] = []

  for (const raw of features) {
    const bucket = classifyVisionFeatureLine(raw)
    const display = stripVisionFeaturePrefix(raw) || raw.trim()
    if (!display) continue
    if (bucket === 'inference') inference.push(display)
    else if (bucket === 'dimensionMeta') dimensionMeta.push(display)
    else construction.push(display)
  }

  const out: string[] = []
  const pushSection = (title: string, items: string[]) => {
    if (items.length === 0) return
    out.push(title)
    for (const x of items) out.push(`- ${x}`)
    out.push('')
  }

  pushSection('Wymiary i parametry:', dimensionMeta)
  pushSection(observationSectionTitleSimple(kind), construction)
  pushSection('Wnioski (nie jako gwarancja):', inference)

  return out
}

function includedSectionTitle(kind: ProductImagePromptKind): string {
  switch (kind) {
    case 'book':
      return 'Elementy dodatkowe publikacji (widać w zestawie):'
    case 'electronics':
      return 'Zawartość zestawu (widać osobno):'
    case 'fashion':
      return 'Dodatki w zestawie (widać osobno):'
    case 'furniture':
      return 'Części zestawu / montaż (widać osobno):'
    case 'food_beverage':
    case 'beauty_health':
      return 'W zestawie / osobno w kadrze (widać):'
    case 'sports_outdoor':
    case 'kids_toys':
    case 'home_garden':
    case 'automotive':
      return 'Elementy zestawu (widać osobno):'
    default:
      return 'Części zestawu (widać osobno):'
  }
}

export type VisionExtractionSummaryRow = { label: string; value: string }

/** Pola podstawowe z Vision — wyświetlane nad polem „Cechy”; nie duplikują treści w textarea. */
export function getVisionExtractionSummaryRows(
  a: ProductImageAnalysis | null
): VisionExtractionSummaryRow[] {
  if (!a?.extraction || !extractionHasContent(a.extraction)) return []
  const e = a.extraction
  const kind = resolvePromptKind(a)
  const nz = (label: string, val: string): VisionExtractionSummaryRow => {
    const v = val.trim()
    return { label, value: v.length ? v : 'nieznane' }
  }
  return [
    nz('Kategoria (AI)', getProductImagePromptKindLabelPl(kind)),
    nz('Typ oferty', `${e.listing_product_kind} — ${listingProductKindLabelPl(e.listing_product_kind)}`),
    nz('Typ produktu', e.product_type),
    nz('Marka', e.brand),
    nz('Model', e.model),
    nz('Kategoria (wizualna)', e.category),
    nz('Kolor', e.color),
    nz('Materiał', e.material),
    nz('Stan', e.condition),
    nz('Pewność', e.confidence),
  ]
}

/**
 * Aktualizacja pól ekstrakcji z formularza (bez ponownego Vision).
 * Odtwarza pola wyprowadzone przez buildProductImageAnalysisFromExtraction.
 */
export function patchProductImageAnalysis(
  a: ProductImageAnalysis,
  updates: {
    extractionPatch?: Partial<TruthExtractionFromImage>
    promptKind?: ProductImagePromptKind
  }
): ProductImageAnalysis {
  const extractionPatch = updates.extractionPatch ?? {}
  const mergedEx: TruthExtractionFromImage = {
    ...a.extraction,
    ...extractionPatch,
  }
  const finalized = finalizeTruthExtraction(mergedEx)
  const rebuilt = buildProductImageAnalysisFromExtraction(finalized)
  return {
    ...rebuilt,
    promptKind: updates.promptKind !== undefined ? updates.promptKind : a.promptKind,
  }
}

/** Tekst do pola „Cechy” po „Weryfikuj AI” — ETAP 1: fakty, potem dopiero listing */
export function formatProductImageAnalysisForFeaturesField(
  a: ProductImageAnalysis,
  platformSlug?: string
): string {
  const e = a.extraction
  if (e && extractionHasContent(e)) {
    const kind = resolvePromptKind(a)
    const lines: string[] = []
    if (e.visible_features.length > 0) {
      lines.push(...formatVisibleFeaturesForFeaturesField(e.visible_features, kind))
    }
    if (e.included_items.length > 0) {
      lines.push(includedSectionTitle(kind))
      for (const x of e.included_items) lines.push(`- ${stripVisionFeaturePrefix(x) || x}`)
      lines.push('')
    }
    if (e.defects.length > 0) {
      lines.push('Wady / uwagi widoczne:')
      for (const x of e.defects) lines.push(`- ${stripVisionFeaturePrefix(x) || x}`)
      lines.push('')
    }
    if (e.text_on_product.length > 0) {
      lines.push('Napisy odczytane z produktu (OCR):')
      for (const x of e.text_on_product) lines.push(`- ${x}`)
      lines.push('')
    }
    lines.push(...buildPlatformMetaBlock(e, platformSlug))
    const rest = formatProductImageAnalysisLegacyTail(a)
    if (rest) {
      lines.push(rest)
    }
    return lines.join('\n').trim()
  }

  return formatProductImageAnalysisLegacyOnly(a)
}

function buildPlatformMetaBlock(e: TruthExtractionFromImage, platformSlug?: string): string[] {
  if (!platformSlug) return []
  const meta: string[] = []
  const push = (label: string, val: string) => {
    const v = val.trim()
    if (v && v.toLowerCase() !== 'nieznane' && v.toLowerCase() !== 'brak') meta.push(`${label}: ${v}`)
  }
  if (platformSlug === 'allegro') {
    push('Marka', e.brand)
    push('Model', e.model)
    push('Kolor', e.color)
    push('Materiał', e.material)
    push('Stan', e.condition)
  } else if (platformSlug === 'amazon') {
    push('Brand', e.brand)
    push('Model', e.model)
    push('Color', e.color)
    push('Material', e.material)
    push('Condition', e.condition)
  } else if (platformSlug === 'ebay') {
    push('Brand', e.brand)
    push('MPN / Model', e.model)
    push('Color', e.color)
    push('Material', e.material)
    push('Condition', e.condition)
  } else if (platformSlug === 'etsy') {
    push('Materiał', e.material)
    push('Kolor', e.color)
    push('Marka', e.brand)
  } else if (platformSlug === 'vinted') {
    push('Marka', e.brand)
    push('Rozmiar / model', e.model)
    push('Kolor', e.color)
    push('Materiał', e.material)
    push('Stan', e.condition)
  } else {
    push('Marka', e.brand)
    push('Model', e.model)
    push('Kolor', e.color)
    push('Materiał', e.material)
    push('Stan', e.condition)
  }
  return meta.length > 0 ? ['', ...meta] : []
}

function formatProductImageAnalysisLegacyTail(a: ProductImageAnalysis): string {
  const uncertain = a.notVisibleOrUncertainLines ?? []
  if (uncertain.length === 0) return ''
  const out: string[] = ['Uwagi (niepewność / weryfikacja):']
  for (const line of uncertain) out.push(`- ${line}`)
  return out.join('\n')
}

function formatProductImageAnalysisLegacyOnly(a: ProductImageAnalysis): string {
  const hint = (a.visibleCategoryHint ?? '').trim()
  const summary = (a.listingSummary ?? '').trim()
  const details = a.productDetailLines ?? []
  const sales = a.salesImpressionLines ?? []
  const uncertain = a.notVisibleOrUncertainLines ?? []
  const shortAttrs = a.visibleAttributes

  const hasRich =
    summary.length > 0 || details.length > 0 || sales.length > 0

  const out: string[] = []
  out.push('Opis ze zdjęcia (pod listing — tylko widoczne fakty, bez zgadywania parametrów)')
  out.push('')

  if (hasRich) {
    if (summary) {
      out.push(summary)
      out.push('')
    }
    if (details.length > 0) {
      out.push('Szczegóły produktu (widać na zdjęciu):')
      for (const line of details) out.push(`- ${line}`)
      out.push('')
    }
    if (sales.length > 0) {
      out.push('Wrażenie sprzedażowe (na podstawie kadru):')
      for (const line of sales) out.push(`- ${line}`)
      out.push('')
    }
  }

  if (uncertain.length > 0) {
    out.push('Nie widać na zdjęciu / niepewne (nie używaj jako faktów):')
    for (const line of uncertain) out.push(`- ${line}`)
    out.push('')
  }

  if (!hasRich && shortAttrs.length > 0) {
    for (const x of shortAttrs) out.push(`- ${x}`)
    out.push('')
  }

  if (hint) {
    out.push(`Podpowiedź kategorii (ze zdjęcia): ${hint}`)
  }

  const joined = out.join('\n').trim()

  if (!hasRich && !shortAttrs.length && !hint && uncertain.length === 0) {
    return (
      'Dopisz cechy ręcznie lub zrób wyraźniejsze zdjęcie — na tym ujęciu AI nie wyciągnęło widocznych szczegółów.'
    )
  }

  return joined
}

/** Linie wklejane do promptu generatora (bez nagłówka ANALIZA ZE ZDJĘCIA) */
export function buildImageAnalysisLinesForGeneratePrompt(
  a: ProductImageAnalysis
): string[] {
  const lines: string[] = []
  const e = a.extraction

  if (e && extractionHasContent(e)) {
    lines.push('--- Ekstrakcja faktów ze zdjęcia (ETAP 1, bez marketingu) ---')
    const nz = (s: string) => (isUnknownToken(s) ? 'nieznane' : s.trim())
    lines.push(
      `- Typ oferty (ze zdjęcia, ustal PRZED opisem; trzymaj się tego w ETAP 2–3 ramy): ${e.listing_product_kind} — ${listingProductKindLabelPl(e.listing_product_kind)}`
    )
    lines.push(`- Typ produktu: ${nz(e.product_type)}`)
    lines.push(`- Marka: ${nz(e.brand)}`)
    lines.push(`- Model: ${nz(e.model)}`)
    lines.push(`- Kategoria (wizualna): ${nz(e.category)}`)
    lines.push(`- Kolor: ${nz(e.color)}`)
    lines.push(`- Materiał: ${nz(e.material)}`)
    lines.push(`- Stan: ${nz(e.condition)}`)
    lines.push(`- Pewność ekstrakcji: ${e.confidence}`)
    if (e.visible_features.length > 0) {
      lines.push('- Cechy konstrukcji / obserwacje:')
      for (const x of e.visible_features) lines.push(`  • ${x}`)
    }
    if (e.included_items.length > 0) {
      lines.push('- Części zestawu / montażu (widać):')
      for (const x of e.included_items) lines.push(`  • ${x}`)
    }
    if (e.defects.length > 0) {
      lines.push('- Wady widoczne:')
      for (const x of e.defects) lines.push(`  • ${x}`)
    }
    if (e.text_on_product.length > 0) {
      lines.push('- Napisy odczytane z produktu/opakowania (OCR — dosłowne):')
      for (const x of e.text_on_product) lines.push(`  • ${x}`)
    }
    lines.push(
      'Zasady: używaj wyłącznie faktów o samym produkcie (oferta); nie dopisuj tła, UI sklepu ani aranżacji z kadru.'
    )
    return lines
  }

  if (a.detectedProductName.trim()) {
    lines.push(`- Rozpoznany produkt: ${a.detectedProductName.trim()}`)
  }
  if (a.visibleCategoryHint.trim()) {
    lines.push(`- Kontekst kategorii: ${a.visibleCategoryHint.trim()}`)
  }

  const summary = (a.listingSummary ?? '').trim()
  const details = a.productDetailLines ?? []
  const sales = a.salesImpressionLines ?? []
  const uncertain = a.notVisibleOrUncertainLines ?? []
  const hasRich =
    summary.length > 0 || details.length > 0 || sales.length > 0

  if (hasRich) {
    if (summary) {
      lines.push('')
      lines.push('Podsumowanie widoczne na zdjęciu:')
      lines.push(summary)
    }
    if (details.length > 0) {
      lines.push('')
      lines.push('Szczegóły widoczne na zdjęciu:')
      for (const line of details) lines.push(`- ${line}`)
    }
    if (sales.length > 0) {
      lines.push('')
      lines.push('Wrażenie sprzedażowe (tylko z kadru):')
      for (const line of sales) lines.push(`- ${line}`)
    }
  } else if (a.visibleAttributes.length > 0) {
    lines.push(...a.visibleAttributes.map((x) => `- ${x}`))
  }

  if (uncertain.length > 0) {
    lines.push('')
    lines.push('Nie widać / niepewne (nie traktuj jako potwierdzonych parametrów):')
    for (const line of uncertain) lines.push(`- ${line}`)
  }

  return lines
}

function dedupeLines(lines: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= max) break
  }
  return out
}

function pickLongest(a: string, b: string): string {
  const ta = a.trim()
  const tb = b.trim()
  if (!ta) return tb
  if (!tb) return ta
  return ta.length >= tb.length ? ta : tb
}

function mergeListingKinds(extractions: TruthExtractionFromImage[]): ListingProductKind {
  const kinds = extractions.map((e) => e.listing_product_kind)
  const uniq = [...new Set(kinds)]
  if (uniq.length === 1) return uniq[0]
  return 'HYBRID'
}

function mergeTruthExtractions(
  list: TruthExtractionFromImage[]
): TruthExtractionFromImage {
  if (list.length === 0) return { ...EMPTY_TRUTH_EXTRACTION }
  if (list.length === 1) return list[0]

  const order: Record<TruthExtractionConfidence, number> = {
    low: 0,
    medium: 1,
    high: 2,
  }
  let worst: TruthExtractionConfidence = 'high'
  for (const e of list) {
    if (order[e.confidence] < order[worst]) worst = e.confidence
  }

  let product_type = ''
  let brand = ''
  let model = ''
  let category = ''
  let color = ''
  let material = ''
  let condition = ''
  for (const e of list) {
    product_type = pickLongest(product_type, e.product_type)
    brand = pickLongest(brand, e.brand)
    model = pickLongest(model, e.model)
    category = pickLongest(category, e.category)
    color = pickLongest(color, e.color)
    material = pickLongest(material, e.material)
    condition = pickLongest(condition, e.condition)
  }

  const featSet = new Set<string>()
  const incSet = new Set<string>()
  const defSet = new Set<string>()
  const textSet = new Set<string>()
  for (const e of list) {
    for (const x of e.visible_features) {
      const t = x.trim()
      if (t) featSet.add(t)
    }
    for (const x of e.included_items) {
      const t = x.trim()
      if (t) incSet.add(t)
    }
    for (const x of e.defects) {
      const t = x.trim()
      if (t) defSet.add(t)
    }
    for (const x of e.text_on_product) {
      const t = x.trim()
      if (t) textSet.add(t)
    }
  }

  const mergedPre: TruthExtractionFromImage = {
    product_type: product_type.slice(0, 400),
    brand: brand.slice(0, 200),
    model: model.slice(0, 200),
    category: category.slice(0, 280),
    color: color.slice(0, 120),
    material: material.slice(0, 160),
    visible_features: [...featSet].slice(0, 20),
    condition: condition.slice(0, 160),
    staging_visible: [],
    included_items: [...incSet].slice(0, 14),
    defects: [...defSet].slice(0, 14),
    text_on_product: [...textSet].slice(0, 40),
    confidence: worst,
    listing_product_kind: mergeListingKinds(list),
  }
  return finalizeTruthExtraction(mergedPre)
}

function mergePromptKindsFromAnalyses(
  list: ProductImageAnalysis[]
): ProductImagePromptKind | undefined {
  const kinds = list.map((a) => a.promptKind).filter((k): k is ProductImagePromptKind => Boolean(k))
  if (kinds.length === 0) return undefined
  const first = kinds[0]
  if (kinds.every((k) => k === first)) return first
  return DEFAULT_PRODUCT_IMAGE_PROMPT_KIND
}

/** Łączy wiele analiz (np. z kilku zdjęć) w jeden obiekt do formularza i generatora. */
export function mergeProductImageAnalyses(
  analyses: ProductImageAnalysis[]
): ProductImageAnalysis {
  const list = analyses.filter((a) => a && hasSubstantiveImageAnalysis(a))
  if (list.length === 0) {
    return buildProductImageAnalysisFromExtraction({ ...EMPTY_TRUTH_EXTRACTION })
  }
  if (list.length === 1) return list[0]

  const mergedExtraction = mergeTruthExtractions(
    list.map((a) => a.extraction ?? EMPTY_TRUTH_EXTRACTION)
  )
  const base = buildProductImageAnalysisFromExtraction(mergedExtraction)
  // Propagate enrichment source from the first enriched analysis
  const enrichedAnalysis = list.find((a) => a.enrichmentSource && a.enrichmentSource !== 'none')
  const enrichmentSource = enrichedAnalysis?.enrichmentSource
  const enrichmentIdentifier = enrichedAnalysis?.enrichmentIdentifier
  const mergedKind = mergePromptKindsFromAnalyses(list)
  const distinctKinds = [
    ...new Set(list.map((a) => a.promptKind).filter((k): k is ProductImagePromptKind => Boolean(k))),
  ]
  if (distinctKinds.length > 1) {
    const note =
      'Wiele zdjęć: różne kategorie ekstrakcji (' +
      distinctKinds.map((k) => getProductImagePromptKindLabelPl(k)).join('; ') +
      '). Połączono w jedną listę — doprecyzuj ręcznie, jeśli produkty się różnią.'
    const uncertain = [...(base.notVisibleOrUncertainLines ?? []), note]
    return {
      ...base,
      promptKind: mergedKind,
      notVisibleOrUncertainLines: uncertain,
      ...(enrichmentSource ? { enrichmentSource, enrichmentIdentifier } : {}),
    }
  }
  return {
    ...base,
    ...(mergedKind ? { promptKind: mergedKind } : {}),
    ...(enrichmentSource ? { enrichmentSource, enrichmentIdentifier } : {}),
  }
}
