import type { SupabaseClient } from '@supabase/supabase-js'
import { buildCategoryContextForPrompt } from '@/lib/allegro/category-prompt'
import { parseCategoryField } from '@/lib/allegro/category-selection'
import { analyzeProductImage } from '@/lib/generation/analyze-product-image'
import {
  buildImageAnalysisLinesForGeneratePrompt,
  hasSubstantiveImageAnalysis,
  type ProductImageAnalysis,
} from '@/lib/generation/product-image-analysis'
import { buildSmartTitleTrimmingUserBlock } from '@/lib/generation/smart-title-trimming'
import { getDescriptionChatModel } from '@/lib/generation/description-model'
import { sanitizeGenerateResult } from '@/lib/generation/sanitize-generate-result'
import openai from '@/lib/openai'
import { assertChatJsonContent } from '@/lib/openai/assert-chat-json-content'
import { getPlatformProfile } from '@/lib/platforms'
import {
  DESCRIPTION_PROMPT_VERSION,
  getSystemPrompt,
  getToneReinforcementUserBlock,
  normalizeToneKey,
} from '@/lib/prompts/description-generator'
import type { QualityTip } from '@/lib/types'

const GPT5_DEFAULT_MAX_COMPLETION_TOKENS = 16_384

function getTokenLimitParam(
  isGpt5Family: boolean
): { max_completion_tokens: number } | { max_tokens: number } {
  if (isGpt5Family) {
    const n = Number.parseInt(process.env.OPENAI_DESCRIPTION_MAX_COMPLETION_TOKENS ?? '', 10)
    const max = Number.isFinite(n) && n >= 2048 ? n : GPT5_DEFAULT_MAX_COMPLETION_TOKENS
    return { max_completion_tokens: max }
  }
  return { max_tokens: 3000 }
}

function isRefinementBlockingTip(tip: QualityTip): boolean {
  if (tip.type !== 'warning' && tip.type !== 'error') return false
  const x = tip.text.toLowerCase()
  return (
    /dodaj więcej wariant|słów kluczowych|tag(i|ów)? seo|hashtag|backend/i.test(x) ||
    /opis długi|ok\.\s*\d+\s*słów|min\.\s*\d+\s*słów|rozważ\s+(dopisanie|rozbudow)/i.test(x) ||
    /meta\b|meta description/i.test(x) ||
    /wezwania|cta|działania/i.test(x) ||
    /opis krótki skrócono|shortdescription|opis skrocony/i.test(x) ||
    /usunięto tagi html|wymaga plain text|bez html/i.test(x) ||
    /vinted:|etsy:|shoper:|woocommerce|ebay|empik place/i.test(x) ||
    /tagów|max\s*20|5-8 hashtag|13 tag/i.test(x) ||
    /tytuł.*przekroczył.*limit|awaryjn(y|e)\s+skrócen|smart trimming/i.test(x) ||
    (/tytuł/i.test(x) && /słowo kluczowe|seo|fraza|słab/i.test(x))
  )
}

export type GenerateListingBody = {
  productName?: string
  category?: string
  features?: string
  imageBase64?: string
  productRating?: number | null
  platform?: string
  tone?: string
  brandVoice?: { tone?: string; style?: string }
  refinementOf?: {
    seoTitle?: string
    shortDescription?: string
    longDescription?: string
    tags?: string[]
    metaDescription?: string
  }
  refinementInstruction?: string
}

export type GenerateListingResult = {
  seoTitle: string
  shortDescription: string
  longDescription: string
  tags: string[]
  metaDescription: string
  qualityScore: number
  qualityTips: QualityTip[]
  promptVersion: string
  platformLimits: {
    slug: string
    titleMaxChars: number
    shortDescMax: number
    metaDescMax: number
    longDescMinWords: number
  }
  descriptionId: string | null
  creditsRemaining: number
}

/**
 * Rdzeń generatora opisu. `skipCreditCharge`: np. pakiet Listing na gotowo (kredyt zdejmowany osobno).
 * `imageAnalysisPrecomputed`: pomiń ponowną analizę wizji (użyj wyniku z wcześniejszego wywołania).
 */
export async function runGenerateListing(
  supabase: SupabaseClient,
  userId: string,
  profile: { plan: string; credits_used: number; credits_limit: number },
  body: GenerateListingBody,
  options: {
    skipCreditCharge: boolean
    imageAnalysisPrecomputed: ProductImageAnalysis | null
  }
): Promise<GenerateListingResult> {
  const reqStartedAt = Date.now()
  const {
    productName,
    category,
    features,
    imageBase64,
    productRating,
    platform,
    tone,
    brandVoice,
    refinementOf,
    refinementInstruction,
  } = body

  const isRefinement =
    Boolean(refinementOf) &&
    typeof refinementInstruction === 'string' &&
    refinementInstruction.trim().length > 0

  const rawProductName = productName?.trim() ?? ''
  const rawFeatures = features?.trim() ?? ''
  const rawImageBase64 = imageBase64?.trim() ?? ''

  if (!rawProductName && !rawFeatures && !rawImageBase64 && !isRefinement) {
    throw new Error('Dodaj nazwę, cechy lub zdjęcie produktu.')
  }

  const platformSlug = (platform || 'allegro') as string
  let imageAnalysis: ProductImageAnalysis | null = options.imageAnalysisPrecomputed

  if (!imageAnalysis && rawImageBase64.length > 0) {
    try {
      imageAnalysis = await analyzeProductImage(rawImageBase64)
    } catch (imageErr) {
      console.warn(
        '[runGenerateListing] image analysis skipped:',
        imageErr instanceof Error ? imageErr.message : imageErr
      )
    }
  }

  const effectiveProductName =
    rawProductName || imageAnalysis?.detectedProductName || 'Produkt'

  const platformProfileForTrim = getPlatformProfile(platformSlug)
  const smartTitleBlock = buildSmartTitleTrimmingUserBlock(
    effectiveProductName,
    platformProfileForTrim.titleMaxChars,
    platformProfileForTrim.name,
    platformSlug
  )

  const toneKey = normalizeToneKey(tone || 'profesjonalny')
  const toneReinforcementBlock = getToneReinforcementUserBlock(toneKey)

  const systemPrompt = getSystemPrompt(platformSlug, toneKey, brandVoice)

  const catParsed = parseCategoryField(typeof category === 'string' ? category : '')

  let categoryBlock: string
  if (catParsed.type === 'category') {
    categoryBlock = buildCategoryContextForPrompt(catParsed.selection)
  } else if (catParsed.type === 'custom') {
    categoryBlock = buildCategoryContextForPrompt(catParsed.selection)
  } else if (catParsed.type === 'legacy') {
    categoryBlock = `KATEGORIA (wcześniejszy zapis tekstowy): „${catParsed.label}". Traktuj jako ogólny kontekst branżowy.`
  } else {
    categoryBlock = buildCategoryContextForPrompt(null)
  }

  const featureLines = rawFeatures.split('\n').filter((l: string) => l.trim())
  const structured: string[] = []
  const freeform: string[] = []
  for (const line of featureLines) {
    if (/^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]+\s*:/.test(line.trim())) {
      structured.push(line.trim())
    } else {
      freeform.push(line.trim())
    }
  }

  let featuresBlock = ''
  if (structured.length > 0) {
    featuresBlock += `SPECYFIKACJA (dane strukturalne — UŻYWAJ TYLKO TYCH WARTOŚCI):\n${structured.join('\n')}\n`
  }
  if (freeform.length > 0) {
    featuresBlock += `${structured.length > 0 ? '\n' : ''}DODATKOWE CECHY:\n${freeform.join('\n')}\n`
  }

  if (imageAnalysis && hasSubstantiveImageAnalysis(imageAnalysis)) {
    const imageLines = buildImageAnalysisLinesForGeneratePrompt(imageAnalysis)
    featuresBlock += `${featuresBlock ? '\n' : ''}ANALIZA ZE ZDJĘCIA (UŻYWAJ WYŁĄCZNIE JAKO DODATKOWEGO KONTEKSTU WIDOCZNYCH CECH — NIE ZGADUJ BRAKUJĄCYCH PARAMETRÓW):\n${imageLines.join('\n')}\n`
  }

  const productRatingBlock =
    typeof productRating === 'number' && productRating >= 1 && productRating <= 5
      ? `\nOCENA PRODUKTU OD UŻYTKOWNIKA: ${productRating}/5\nUżyj tej oceny jako sygnału copywriterskiego (jak mocno podbić premium/atrakcyjność), ale NIE wpisuj tej oceny dosłownie do treści oferty, chyba że użytkownik podał ją jawnie jako fakt do publikacji.\n`
      : ''

  const MAX_REFINE_LONG = 14_000
  const longRef =
    typeof refinementOf?.longDescription === 'string'
      ? refinementOf.longDescription.length > MAX_REFINE_LONG
        ? `${refinementOf.longDescription.slice(0, MAX_REFINE_LONG)}\n…[ucięto do ${MAX_REFINE_LONG} zn.]`
        : refinementOf.longDescription
      : ''

  const refinementBlock =
    refinementOf &&
    typeof refinementInstruction === 'string' &&
    refinementInstruction.trim()
      ? `

--- POPRZEDNI WYNIK DO ULEPSZENIA (nie kopiuj ślepo — popraw zgodnie z poleceniem; zachowaj zgodność z CECHAMI) ---
seoTitle: ${String(refinementOf.seoTitle ?? '')}
shortDescription: ${String(refinementOf.shortDescription ?? '')}
longDescription (HTML): ${longRef}
tags: ${JSON.stringify(refinementOf.tags ?? [])}
metaDescription: ${String(refinementOf.metaDescription ?? '')}

POLECENIE POPRAWY (Quality Score / użytkownik):
${refinementInstruction.trim()}
`
      : ''

  const userPrompt = `Wygeneruj opis produktu:

NAZWA: ${effectiveProductName}
${categoryBlock}
PLATFORMA: ${platformSlug}
TON: ${toneKey}

${featuresBlock}
${productRatingBlock}
WAŻNE: Nie wymyślaj parametrów ani cech, których nie ma powyżej. Bazuj WYŁĄCZNIE na podanych danych.
${smartTitleBlock}
${refinementBlock}
${toneReinforcementBlock}

Odpowiedz WYŁĄCZNIE czystym JSON.`

  const chatModel = getDescriptionChatModel(profile.plan as string, {
    isRefinement,
  })
  const isGpt5Family = chatModel.startsWith('gpt-5')
  const modelCallStartedAt = Date.now()
  const tokenLimitParam = getTokenLimitParam(isGpt5Family)

  const temperatureParam = isGpt5Family ? {} : { temperature: isRefinement ? 0.34 : 0.68 }
  const completion = await openai.chat.completions.create({
    model: chatModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    ...temperatureParam,
    ...tokenLimitParam,
    response_format: { type: 'json_object' },
  })
  const modelCallElapsedMs = Date.now() - modelCallStartedAt

  const content = assertChatJsonContent(completion, 'primary completion')

  const platformProfile = getPlatformProfile(platformSlug)
  const raw = JSON.parse(content) as Record<string, unknown>
  let sanitized = sanitizeGenerateResult(raw, platformProfile)

  const blockingTips = sanitized.qualityTips.filter(isRefinementBlockingTip)
  let retryElapsedMs: number | null = null
  let retryImproved = false
  let retryBlockingCount: number | null = null
  const shouldAutoRetry = blockingTips.length > 0
  if (shouldAutoRetry) {
    const retryPrompt = `${userPrompt}

--- WALIDACJA PO 1 PRÓBIE (musisz poprawić i zwrócić NOWY JSON) ---
Pierwsza wersja nadal ma luki:
${blockingTips.map((t) => `• [${t.type}] ${t.text}`).join('\n')}

Zasady retry:
- Napraw KAŻDY punkt powyżej, nie psując sekcji oznaczonych jako sukces.
- Jeśli problem dotyczy tags: rozszerz listę o nowe, sensowne frazy i usuń duplikaty znaczeniowe.
- Jeśli problem dotyczy długości opisu: dobij wymagane minimum słów.
- Dopilnuj limitów platformy i formatu (HTML/plain text).
Odpowiedz WYŁĄCZNIE czystym JSON.`

    try {
      const retryStartedAt = Date.now()
      const retryTemperatureParam = isGpt5Family ? {} : { temperature: 0.24 }
      const retryCompletion = await openai.chat.completions.create({
        model: chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: retryPrompt },
        ],
        ...retryTemperatureParam,
        ...tokenLimitParam,
        response_format: { type: 'json_object' },
      })
      retryElapsedMs = Date.now() - retryStartedAt
      const retryContent = assertChatJsonContent(retryCompletion, 'quality retry completion')
      const retryRaw = JSON.parse(retryContent) as Record<string, unknown>
      const retrySanitized = sanitizeGenerateResult(retryRaw, platformProfile)
      const retryBlocking = retrySanitized.qualityTips.filter(isRefinementBlockingTip).length
      retryBlockingCount = retryBlocking
      const currentBlocking = blockingTips.length
      if (
        retryBlocking < currentBlocking ||
        (retryBlocking === currentBlocking && retrySanitized.qualityScore > sanitized.qualityScore)
      ) {
        sanitized = retrySanitized
        retryImproved = true
      }
    } catch (retryErr) {
      console.warn('Refinement retry skipped:', retryErr)
    }
  }

  const { data: description } = await supabase
    .from('descriptions')
    .insert({
      user_id: userId,
      product_name: effectiveProductName,
      category: category || null,
      features: rawFeatures || null,
      platform: platformSlug,
      tone: tone || 'profesjonalny',
      source_type: rawImageBase64 ? 'image' : 'form',
      source_image_url: null,
      seo_title: sanitized.seoTitle,
      short_description: sanitized.shortDescription,
      long_description: sanitized.longDescription,
      tags: sanitized.tags,
      meta_description: sanitized.metaDescription,
      quality_score: sanitized.qualityScore,
      quality_tips: sanitized.qualityTips.map((t: QualityTip) => JSON.stringify(t)),
      prompt_version: DESCRIPTION_PROMPT_VERSION,
    })
    .select()
    .single()

  if (!options.skipCreditCharge) {
    await supabase
      .from('profiles')
      .update({ credits_used: profile.credits_used + 1 })
      .eq('id', userId)
  }

  console.info('[runGenerateListing] model metrics', {
    model: chatModel,
    plan: String(profile.plan ?? 'free'),
    platform: platformSlug,
    isRefinement,
    modelCallElapsedMs,
    retryElapsedMs,
    retryImproved,
    shouldAutoRetry,
    blockingTipsInitial: blockingTips.length,
    blockingTipsRetry: retryBlockingCount,
    qualityScoreFinal: sanitized.qualityScore,
    totalElapsedMs: Date.now() - reqStartedAt,
    skipCreditCharge: options.skipCreditCharge,
  })

  const creditsDelta = options.skipCreditCharge ? 0 : 1
  const creditsRemaining = profile.credits_limit - profile.credits_used - creditsDelta

  return {
    seoTitle: sanitized.seoTitle,
    shortDescription: sanitized.shortDescription,
    longDescription: sanitized.longDescription,
    tags: sanitized.tags,
    metaDescription: sanitized.metaDescription,
    qualityScore: sanitized.qualityScore,
    qualityTips: sanitized.qualityTips,
    promptVersion: DESCRIPTION_PROMPT_VERSION,
    platformLimits: {
      slug: platformProfile.slug,
      titleMaxChars: platformProfile.titleMaxChars,
      shortDescMax: platformProfile.charLimits.shortDesc,
      metaDescMax: platformProfile.charLimits.metaDesc,
      longDescMinWords: platformProfile.charLimits.longDescMinWords,
    },
    descriptionId: description?.id || null,
    creditsRemaining,
  }
}
