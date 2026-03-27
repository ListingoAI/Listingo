/** Typy i formatowanie analizy zdjęcia — bez importu OpenAI (bezpieczne dla „use client”). */

export type ProductImageAnalysis = {
  detectedProductName: string
  visibleAttributes: string[]
  visibleCategoryHint: string
  /** Krótki lead pod listing (1–3 zdania), tylko widoczne fakty */
  listingSummary?: string
  /** Punktowane szczegóły produktu widać na zdjęciu */
  productDetailLines?: string[]
  /** Ton sprzedażowy wyłącznie z tego co widać (bez zmyślonych certyfikatów) */
  salesImpressionLines?: string[]
  /** Jawne: czego NIE widać albo co jest niepewne — bez zgadywania parametrów */
  notVisibleOrUncertainLines?: string[]
}

/** Czy jest sens doklejać blok „ANALIZA ZE ZDJĘCIA” do promptu generowania */
export function hasSubstantiveImageAnalysis(a: ProductImageAnalysis): boolean {
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

/** Tekst do pola „Cechy” po „Weryfikuj AI” — struktura zbliżona do opisu listingowego */
export function formatProductImageAnalysisForFeaturesField(
  a: ProductImageAnalysis
): string {
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

/** Łączy wiele analiz (np. z kilku zdjęć) w jeden obiekt do formularza i generatora. */
export function mergeProductImageAnalyses(
  analyses: ProductImageAnalysis[]
): ProductImageAnalysis {
  const list = analyses.filter((a) => a && hasSubstantiveImageAnalysis(a))
  if (list.length === 0) {
    return {
      detectedProductName: '',
      visibleAttributes: [],
      visibleCategoryHint: '',
    }
  }
  if (list.length === 1) return list[0]

  const names = list
    .map((a) => a.detectedProductName.trim())
    .filter((s) => s.length > 0)
  const detectedProductName =
    names.length === 0
      ? ''
      : [...names].sort((a, b) => b.length - a.length)[0]

  const hints = [
    ...new Set(
      list
        .map((a) => a.visibleCategoryHint.trim())
        .filter((s) => s.length > 0)
    ),
  ]
  const visibleCategoryHint = hints.join(' · ')

  const attrSet = new Set<string>()
  for (const a of list) {
    for (const x of a.visibleAttributes) {
      const t = x.trim()
      if (t) attrSet.add(t)
    }
  }
  const visibleAttributes = [...attrSet].slice(0, 15)

  const summaries = list
    .map((a) => (a.listingSummary ?? '').trim())
    .filter((s) => s.length > 0)
  const listingSummary =
    summaries.length > 0 ? summaries.join('\n\n') : undefined

  const detailAcc: string[] = []
  for (const a of list) {
    for (const line of a.productDetailLines ?? []) {
      detailAcc.push(line)
    }
  }
  const productDetailLines = dedupeLines(detailAcc, 22)

  const salesAcc: string[] = []
  for (const a of list) {
    for (const line of a.salesImpressionLines ?? []) {
      salesAcc.push(line)
    }
  }
  const salesImpressionLines =
    salesAcc.length > 0 ? dedupeLines(salesAcc, 12) : undefined

  const uncertainAcc: string[] = []
  for (const a of list) {
    for (const line of a.notVisibleOrUncertainLines ?? []) {
      uncertainAcc.push(line)
    }
  }
  const notVisibleOrUncertainLines =
    uncertainAcc.length > 0 ? dedupeLines(uncertainAcc, 16) : undefined

  return {
    detectedProductName,
    visibleAttributes,
    visibleCategoryHint,
    ...(listingSummary ? { listingSummary } : {}),
    ...(productDetailLines.length > 0 ? { productDetailLines } : {}),
    ...(salesImpressionLines && salesImpressionLines.length > 0
      ? { salesImpressionLines }
      : {}),
    ...(notVisibleOrUncertainLines && notVisibleOrUncertainLines.length > 0
      ? { notVisibleOrUncertainLines }
      : {}),
  }
}
