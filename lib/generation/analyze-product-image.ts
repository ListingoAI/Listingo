import { assertChatJsonContent } from '@/lib/openai/assert-chat-json-content'
import openai from '@/lib/openai'

import type { ProductImagePromptKind } from '@/lib/generation/product-image-prompt-kinds'
import {
  getVisionSystemPrompt,
  getVisionUserMessage,
} from '@/lib/generation/product-image-prompts'
import {
  buildProductImageAnalysisFromExtraction,
  parseTruthExtractionFromRaw,
  type ProductImageAnalysis,
  type EnrichmentSource,
  type TruthExtractionFromImage,
  finalizeTruthExtraction,
} from '@/lib/generation/product-image-analysis'
import { enrichProductExtraction } from '@/lib/generation/enrich-product-data'
import { routeProductImagePromptKind } from '@/lib/generation/route-product-image-prompt'

/** Tylko analiza zdjęcia (vision) — nie wpływa na model generowania opisu. */
const DEFAULT_PRODUCT_IMAGE_ANALYSIS_MODEL = 'gpt-5.3-chat-latest'

function getProductImageAnalysisModel(): string {
  return (
    process.env.OPENAI_PRODUCT_IMAGE_ANALYSIS_MODEL?.trim() ||
    DEFAULT_PRODUCT_IMAGE_ANALYSIS_MODEL
  )
}

function getProductImageAnalysisTokenParams(model: string): {
  max_completion_tokens: number
} | { max_tokens: number } {
  return getProductImageAnalysisTokenParamsWithMode(model, { isRetry: false })
}

function getProductImageAnalysisTokenParamsWithMode(
  model: string,
  options?: { isRetry?: boolean }
): { max_completion_tokens: number } | { max_tokens: number } {
  const isRetry = Boolean(options?.isRetry)
  const isGpt5Family = model.startsWith('gpt-5')
  const baseRaw = process.env.OPENAI_PRODUCT_IMAGE_ANALYSIS_MAX_COMPLETION_TOKENS?.trim()
  const baseParsed = baseRaw ? Number.parseInt(baseRaw, 10) : Number.NaN
  const retryRaw = process.env.OPENAI_PRODUCT_IMAGE_ANALYSIS_RETRY_MAX_COMPLETION_TOKENS?.trim()
  const retryParsed = retryRaw ? Number.parseInt(retryRaw, 10) : Number.NaN

  const fallback = isRetry ? 4500 : 3200
  const candidate = isRetry ? retryParsed : baseParsed
  const max = Number.isFinite(candidate) && candidate >= 256 ? candidate : fallback
  return isGpt5Family ? { max_completion_tokens: max } : { max_tokens: max }
}

/** Wyższa rozdzielzość obrazu = lepszy odczyt małego tekstu (wymiary na schematach). Koszt wyższy — wyłącz: OPENAI_PRODUCT_IMAGE_VISION_DETAIL=low */
function getVisionImageDetail(): 'low' | 'high' | 'auto' {
  const v = process.env.OPENAI_PRODUCT_IMAGE_VISION_DETAIL?.trim().toLowerCase()
  if (v === 'low' || v === 'high' || v === 'auto') return v
  return 'high'
}

function parseStringList(raw: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0 && x.length <= maxLen)
    .slice(0, max)
}

function isNewTruthJsonShape(raw: Record<string, unknown>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(raw, 'product_type') ||
    Object.prototype.hasOwnProperty.call(raw, 'visible_features')
  )
}

/** Stary kształt odpowiedzi — mapujemy do TruthExtraction + opcjonalnie doklejamy linie legacy */
function productImageAnalysisFromLegacyJson(
  raw: Record<string, unknown>,
  promptKind: ProductImagePromptKind
): ProductImageAnalysis {
  const visibleAttributes = Array.isArray(raw.visibleAttributes)
    ? raw.visibleAttributes
        .map((x) => String(x).trim())
        .filter((x) => x.length > 0)
        .slice(0, 12)
    : []

  const name =
    typeof raw.detectedProductName === 'string'
      ? raw.detectedProductName.trim().slice(0, 220)
      : ''

  const extraction = parseTruthExtractionFromRaw({
    product_type: name,
    brand: '',
    model: '',
    category:
      typeof raw.visibleCategoryHint === 'string'
        ? raw.visibleCategoryHint.trim()
        : '',
    color: '',
    material: '',
    visible_features: visibleAttributes,
    condition: '',
    included_items: [],
    defects: [],
    confidence: 'medium',
    listing_product_kind: raw.listing_product_kind,
  })

  const base = buildProductImageAnalysisFromExtraction(extraction)

  const listingSummary =
    typeof raw.listingSummary === 'string' ? raw.listingSummary.trim().slice(0, 900) : ''
  const productDetailLines = parseStringList(raw.productDetailLines, 12, 320)
  const salesImpressionLines = parseStringList(raw.salesImpressionLines, 8, 280)
  const notVisibleOrUncertainLines = parseStringList(raw.notVisibleOrUncertainLines, 10, 240)

  return {
    ...base,
    promptKind,
    ...(listingSummary ? { listingSummary } : {}),
    ...(productDetailLines.length > 0 ? { productDetailLines } : {}),
    ...(salesImpressionLines.length > 0 ? { salesImpressionLines } : {}),
    ...(notVisibleOrUncertainLines.length > 0
      ? { notVisibleOrUncertainLines }
      : {}),
  }
}

export type AnalyzeProductImageResult = {
  analysis: ProductImageAnalysis
  /** Tryb promptu użyty po routingu (lub domyślnie general). */
  promptKind: ProductImagePromptKind
}

export type AnalyzeProductImageOptions = {
  /** Platforma docelowa (slug) — kontekst dla ekstrakcji (np. Allegro → EAN, eBay → item specifics). */
  platformSlug?: string
}

/** Vision: ekstrakcja faktów — tylko po stronie serwera / API */
export async function analyzeProductImage(
  imageBase64: string,
  options?: AnalyzeProductImageOptions
): Promise<AnalyzeProductImageResult> {
  const platformSlug = options?.platformSlug
  const promptKind = await routeProductImagePromptKind(imageBase64, platformSlug)
  const systemPrompt = getVisionSystemPrompt(promptKind, platformSlug)
  const userText = getVisionUserMessage(promptKind, platformSlug)

  const model = getProductImageAnalysisModel()
  const isGpt5Family = model.startsWith('gpt-5')
  const temperatureParam = isGpt5Family ? {} : { temperature: 0.15 }

  const completion = await openai.chat.completions.create({
    model,
    ...temperatureParam,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userText,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`,
              detail: getVisionImageDetail(),
            },
          },
        ],
      },
    ],
    ...getProductImageAnalysisTokenParams(model),
    response_format: { type: 'json_object' },
  })

  const content = assertChatJsonContent(completion, 'image analysis completion')
  const raw = JSON.parse(content) as Record<string, unknown>

  if (!isNewTruthJsonShape(raw)) {
    return {
      analysis: productImageAnalysisFromLegacyJson(raw, promptKind),
      promptKind,
    }
  }

  let finalExtraction = parseTruthExtractionFromRaw(raw)

  if (finalExtraction.confidence === 'low' && isRetryOnLowConfidenceEnabled()) {
    try {
      const retryResult = await retryLowConfidenceExtraction(
        imageBase64,
        finalExtraction,
        { model, promptKind, platformSlug }
      )
      if (retryResult && retryResult.confidence !== 'low') {
        finalExtraction = retryResult
      }
    } catch {
      // retry failed
    }
  }

  // Vision + Retrieval: enrich with external data when 100% certain match
  let enrichmentSource: EnrichmentSource = 'none'
  let enrichmentIdentifier: string | undefined
  try {
    const enrichResult = await enrichProductExtraction(finalExtraction)
    finalExtraction = enrichResult.extraction
    if (enrichResult.enrichment.matched) {
      enrichmentSource = enrichResult.enrichment.source
      enrichmentIdentifier = enrichResult.enrichment.matchedIdentifier
    }
  } catch (err) {
    console.error('[analyze-product-image] enrichment failed, using vision-only:', err)
  }

  const analysis: ProductImageAnalysis = {
    ...buildProductImageAnalysisFromExtraction(finalExtraction),
    promptKind,
    enrichmentSource: enrichmentSource !== 'none' ? enrichmentSource : undefined,
    enrichmentIdentifier,
  }

  return { analysis, promptKind }
}

function isRetryOnLowConfidenceEnabled(): boolean {
  const raw = process.env.OPENAI_PRODUCT_IMAGE_RETRY_ON_LOW?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return true
}

const RETRY_USER_MESSAGE = `Pierwsza analiza tego zdjęcia zwróciła confidence: "low". Przeanalizuj ponownie to samo zdjęcie DOKŁADNIEJ:

1. Przyjrzyj się uważniej detalom — powiększ mentalnie każdy fragment obrazu.
2. Przeczytaj KAŻDY widoczny napis — nawet mały, rozmazany, pod kątem. Jeśli czytelne choć częściowo, wpisz do text_on_product z "[…]" gdzie ucięte.
3. Jeśli coś jest trudne do rozpoznania — wpisz z flagą "Niewidoczne / nie zakładać:" w visible_features zamiast pomijać.
4. Ustal confidence na "medium" lub "high" TYLKO jeśli teraz widzisz więcej; w przeciwnym razie zostaw "low".

Zwróć PEŁNY JSON z WSZYSTKIMI polami (nie tylko zmienionymi).`

async function retryLowConfidenceExtraction(
  imageBase64: string,
  firstPass: TruthExtractionFromImage,
  ctx: { model: string; promptKind: ProductImagePromptKind; platformSlug?: string }
): Promise<TruthExtractionFromImage | null> {
  const isGpt5Family = ctx.model.startsWith('gpt-5')
  const temperatureParam = isGpt5Family ? {} : { temperature: 0.1 }

  const systemPrompt = getVisionSystemPrompt(ctx.promptKind, ctx.platformSlug)

  const firstPassSummary = [
    `Wynik 1. przejścia (confidence: low):`,
    `product_type: ${firstPass.product_type || '(puste)'}`,
    `brand: ${firstPass.brand || '(puste)'}`,
    `model: ${firstPass.model || '(puste)'}`,
    `visible_features: ${firstPass.visible_features.length} wpisów`,
    `text_on_product: ${firstPass.text_on_product.length} wpisów`,
  ].join('\n')

  const completion = await openai.chat.completions.create({
    model: ctx.model,
    ...temperatureParam,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${RETRY_USER_MESSAGE}\n\n${firstPassSummary}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    ...getProductImageAnalysisTokenParamsWithMode(ctx.model, { isRetry: true }),
    response_format: { type: 'json_object' },
  })

  const content = assertChatJsonContent(completion, 'image analysis retry')
  const raw = JSON.parse(content) as Record<string, unknown>
  if (!isNewTruthJsonShape(raw)) return null

  const retryExtraction = parseTruthExtractionFromRaw(raw)

  if (
    retryExtraction.visible_features.length >= firstPass.visible_features.length &&
    retryExtraction.text_on_product.length >= firstPass.text_on_product.length
  ) {
    return retryExtraction
  }

  const merged = mergeFirstAndRetryExtractions(firstPass, retryExtraction)
  return merged
}

function mergeFirstAndRetryExtractions(
  first: TruthExtractionFromImage,
  retry: TruthExtractionFromImage
): TruthExtractionFromImage {
  const pick = (a: string, b: string) => (b.trim().length >= a.trim().length ? b : a)
  const mergeUniq = (a: string[], b: string[], max: number) => {
    const set = new Set([...a.map(s => s.trim()).filter(Boolean), ...b.map(s => s.trim()).filter(Boolean)])
    return [...set].slice(0, max)
  }

  return finalizeTruthExtraction({
    product_type: pick(first.product_type, retry.product_type),
    brand: pick(first.brand, retry.brand),
    model: pick(first.model, retry.model),
    category: pick(first.category, retry.category),
    color: pick(first.color, retry.color),
    material: pick(first.material, retry.material),
    visible_features: mergeUniq(first.visible_features, retry.visible_features, 32),
    condition: pick(first.condition, retry.condition),
    staging_visible: [],
    included_items: mergeUniq(first.included_items, retry.included_items, 14),
    defects: mergeUniq(first.defects, retry.defects, 12),
    text_on_product: mergeUniq(first.text_on_product, retry.text_on_product, 40),
    confidence: retry.confidence !== 'low' ? retry.confidence : first.confidence,
    listing_product_kind: retry.listing_product_kind,
  })
}
