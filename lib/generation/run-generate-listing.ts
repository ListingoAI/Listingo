/**
 * Generowanie listingu — mapowanie na pipeline:
 * IMAGE → [1] Vision/fakty (analyze-product-image lub precomputed) → [2] klasyfikacja w prompcie (typ oferty, kategoria)
 * → [3] interpretacja w modelu → [4] jedna odpowiedź JSON (generator) → [5] sanitize + qualityTips (linter programowy, ewentualny retry)
 * → [6] profil platformy (limity, HTML) → OUTPUT.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildCategoryContextForPrompt } from '@/lib/allegro/category-prompt'
import { parseCategoryField } from '@/lib/allegro/category-selection'
import { analyzeProductImage } from '@/lib/generation/analyze-product-image'
import {
  BOOK_LISTING_SPECIALIZATION_BLOCK,
  buildBookListingDataFieldsFromContext,
  buildBookListingDataUserBlock,
} from '@/lib/generation/book-listing-generation-prompt'
import {
  buildImageAnalysisLinesForGeneratePrompt,
  hasSubstantiveImageAnalysis,
  mergeProductImageAnalyses,
  parseProductImageAnalysisFromClientJson,
  type ProductImageAnalysis,
} from '@/lib/generation/product-image-analysis'
import { buildAllegroListingEmojiUserBlock } from '@/lib/generation/allegro-listing-emoji-prompt'
import {
  buildDescriptionImageUrlsUserBlock,
  parseAndValidateDescriptionImageUrls,
} from '@/lib/generation/parse-description-image-urls'
import { buildSmartTitleTrimmingUserBlock } from '@/lib/generation/smart-title-trimming'
import { getDescriptionChatModel } from '@/lib/generation/description-model'
import {
  sanitizeGenerateResult,
  type AllegroSanitizeMode,
} from '@/lib/generation/sanitize-generate-result'
import openai from '@/lib/openai'
import { assertChatJsonContent } from '@/lib/openai/assert-chat-json-content'
import { getPlatformProfile } from '@/lib/platforms'
import { hasProductImageVisionAccess, PRODUCT_IMAGE_VISION_UPGRADE_MESSAGE } from '@/lib/plans'
import {
  DESCRIPTION_PROMPT_VERSION,
  getFragranceNoteFromNameSpecializationBlock,
  getListingConversionRequirementsReminderUserBlock,
  getPerfumeZapachSellingBlock,
  getSensoryEmotionSpecializationBlock,
  getSystemPrompt,
  getToneReinforcementUserBlock,
  normalizeToneKey,
  shouldUseFragranceNoteFromNamePrompt,
  shouldUsePerfumeZapachSellingBlock,
  shouldUseSensoryEmotionCopy,
} from '@/lib/prompts/description-generator'
import { getCategoryOverrideDynamic } from '@/lib/prompts/category-overrides'
import type { QualityTip } from '@/lib/types'

const BUNDLE_PATTERN = /zestaw|komplet|bundle|set\b|kit\b|pack\b|\d\s*szt\.?|\d\s*(?:x|×)\s*\d|w zestawie|\+\s*\w+.*\+/i

function detectIsBundle(productName: string, features: string): boolean {
  return BUNDLE_PATTERN.test(`${productName} ${features}`)
}

const GPT5_DEFAULT_MAX_COMPLETION_TOKENS = 9000
const GPT5_RETRY_MAX_COMPLETION_TOKENS = 12_000
const NON_GPT5_DEFAULT_MAX_TOKENS = 2800
const NON_GPT5_RETRY_MAX_TOKENS = 3600

function getTokenLimitParam(
  isGpt5Family: boolean,
  options?: { isRetry?: boolean }
): { max_completion_tokens: number } | { max_tokens: number } {
  const isRetry = Boolean(options?.isRetry)
  const envRaw = process.env.OPENAI_DESCRIPTION_MAX_COMPLETION_TOKENS ?? ''
  const envParsed = Number.parseInt(envRaw, 10)
  const retryEnvRaw = process.env.OPENAI_DESCRIPTION_RETRY_MAX_COMPLETION_TOKENS ?? ''
  const retryEnvParsed = Number.parseInt(retryEnvRaw, 10)
  if (isGpt5Family) {
    const defaultMax = isRetry
      ? GPT5_RETRY_MAX_COMPLETION_TOKENS
      : GPT5_DEFAULT_MAX_COMPLETION_TOKENS
    const max = Number.isFinite(isRetry ? retryEnvParsed : envParsed)
      ? Number(isRetry ? retryEnvParsed : envParsed)
      : defaultMax
    const min = isRetry ? 3072 : 2048
    const normalized = max >= min ? max : defaultMax
    return { max_completion_tokens: normalized }
  }
  // Dla modeli bez max_completion_tokens pozwalamy zwiększyć limit tym samym env-em.
  if (isRetry) {
    const retryMax = Number.isFinite(retryEnvParsed) && retryEnvParsed >= 1024
      ? retryEnvParsed
      : NON_GPT5_RETRY_MAX_TOKENS
    return { max_tokens: retryMax }
  }
  const max = Number.isFinite(envParsed) && envParsed >= 1024
    ? envParsed
    : NON_GPT5_DEFAULT_MAX_TOKENS
  return { max_tokens: max }
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
    /vinted:|etsy:|woocommerce|ebay|empik place/i.test(x) ||
    /tagów|max\s*20|5-8 hashtag|13 tag/i.test(x) ||
    /tytuł.*przekroczył.*limit|awaryjn(y|e)\s+skrócen|smart trimming/i.test(x) ||
    (/tytuł/i.test(x) && /słowo kluczowe|seo|fraza|słab/i.test(x))
  )
}

export type GenerateListingBody = {
  productName?: string
  category?: string
  /** Parametry oferty z panelu (filtry / atrybuty), np. jak w Allegro „Parametry”. */
  marketplaceParameters?: string
  features?: string
  imageBase64?: string
  /** Wiele zdjęć (max 5) — preferowane nad pojedynczym imageBase64. */
  imageBase64Images?: string[]
  productRating?: number | null
  platform?: string
  tone?: string
  brandVoice?: { tone?: string; style?: string }
  /** Krótki kierunek sprzedażowy od użytkownika (opcjonalnie). */
  listingIntent?: string
  refinementOf?: {
    seoTitle?: string
    shortDescription?: string
    longDescription?: string
    tags?: string[]
    metaDescription?: string
  }
  refinementInstruction?: string
  /** Jedna linia = jeden URL (http/https) do opisu HTML — tylko te adresy w <img>. */
  descriptionImageUrls?: string
  /** false = wygeneruj listing bez emoji; true / undefined = dotychczasowe zasady (emoji z umiarem wg tonu). */
  listingEmojis?: boolean
  /**
   * Opcjonalnie: agresywność sanitize dla Allegro.
   * - hard (domyślnie): auto-czyści wykryte naruszenia z opisu.
   * - soft: tylko ostrzega w qualityTips, bez automatycznego usuwania.
   */
  allegroSanitizeMode?: AllegroSanitizeMode
  /**
   * Opcjonalnie: wcześniejsza analiza Vision (JSON z /api/analyze-product-image) — pomija ponowne wywołanie analyzeProductImage.
   */
  imageAnalysisPrecomputed?: unknown
  /** Kontekst poprzedniej odrzuconej generacji (smart retry). */
  retryContext?: {
    previousSeoTitle: string
    previousShortDescription: string
    previousQualityScore: number
    retryHints?: string[]
  }
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
    imageBase64Images: rawImageBase64Images,
    productRating,
    platform,
    tone,
    brandVoice,
    listingIntent,
    marketplaceParameters,
    refinementOf,
    refinementInstruction,
    descriptionImageUrls: rawDescriptionImageUrls,
    listingEmojis: rawListingEmojis,
    allegroSanitizeMode: rawAllegroSanitizeMode,
    imageAnalysisPrecomputed: rawImageAnalysisPrecomputed,
    retryContext: rawRetryContext,
  } = body

  const listingEmojisAllowed =
    rawListingEmojis === undefined ? true : Boolean(rawListingEmojis)
  const allegroSanitizeMode: AllegroSanitizeMode =
    rawAllegroSanitizeMode === 'soft' ? 'soft' : 'hard'

  const isRefinement =
    Boolean(refinementOf) &&
    typeof refinementInstruction === 'string' &&
    refinementInstruction.trim().length > 0

  const rawProductName = productName?.trim() ?? ''
  const rawMarketplace = typeof marketplaceParameters === 'string' ? marketplaceParameters.trim() : ''
  const rawFeatures = features?.trim() ?? ''
  const rawImageBase64 = imageBase64?.trim() ?? ''
  const rawImageBase64List = Array.isArray(rawImageBase64Images)
    ? rawImageBase64Images
        .map((x) => String(x ?? '').trim())
        .filter((s) => s.length > 0)
        .slice(0, 5)
    : []
  const imagesForVision =
    rawImageBase64List.length > 0
      ? rawImageBase64List
      : rawImageBase64.length > 0
        ? [rawImageBase64]
        : []
  const combinedRawForContext = [rawMarketplace, rawFeatures].filter(Boolean).join('\n\n')

  const validatedDescriptionImageUrls = parseAndValidateDescriptionImageUrls(
    typeof rawDescriptionImageUrls === 'string' ? rawDescriptionImageUrls : undefined
  )

  if (
    !rawProductName &&
    !rawFeatures &&
    !rawMarketplace &&
    imagesForVision.length === 0 &&
    validatedDescriptionImageUrls.length === 0 &&
    !isRefinement
  ) {
    throw new Error('Dodaj nazwę, cechy lub zdjęcie produktu.')
  }

  const platformSlug = (platform || 'allegro') as string
  const visionAllowed = hasProductImageVisionAccess(profile.plan)

  let imageAnalysis: ProductImageAnalysis | null = options.imageAnalysisPrecomputed ?? null

  if (!imageAnalysis && visionAllowed) {
    imageAnalysis =
      parseProductImageAnalysisFromClientJson(rawImageAnalysisPrecomputed) ?? null
  }

  if (!imageAnalysis && imagesForVision.length > 0) {
    if (!visionAllowed) {
      throw new Error(PRODUCT_IMAGE_VISION_UPGRADE_MESSAGE)
    }
    try {
      const visionOpts = { platformSlug }
      if (imagesForVision.length === 1) {
        imageAnalysis = (await analyzeProductImage(imagesForVision[0], visionOpts)).analysis
      } else {
        const analyses: ProductImageAnalysis[] = []
        for (const img of imagesForVision) {
          analyses.push((await analyzeProductImage(img, visionOpts)).analysis)
        }
        imageAnalysis = mergeProductImageAnalyses(analyses)
      }
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
  const toneReinforcementBlock = getToneReinforcementUserBlock(toneKey, {
    listingEmojisAllowed,
    platform: platformSlug,
  })

  const isBookListing =
    imageAnalysis?.promptKind === 'book' ||
    /\b(książk|isbn|ISBN|wydawnictw|lektur|komiks|powieś|album\s+ksi)\b/i.test(
      `${rawProductName}\n${combinedRawForContext}`
    )

  const sensoryEmotionBlock =
    !isBookListing &&
    shouldUseSensoryEmotionCopy(
      typeof category === 'string' ? category : '',
      rawProductName,
      rawFeatures
    )
      ? getSensoryEmotionSpecializationBlock()
      : ''

  const perfumeZapachSellingBlock =
    !isBookListing &&
    shouldUsePerfumeZapachSellingBlock(
      typeof category === 'string' ? category : '',
      rawProductName,
      rawFeatures
    )
      ? getPerfumeZapachSellingBlock()
      : ''

  const fragranceNoteFromNameBlock =
    !isBookListing &&
    shouldUseFragranceNoteFromNamePrompt(
      typeof category === 'string' ? category : '',
      rawProductName,
      rawFeatures
    )
      ? getFragranceNoteFromNameSpecializationBlock()
      : ''

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

  // Pobierz specjalizację kategorii jeśli istnieje
  let categoryOverrideBlock = ''
  if (catParsed.type === 'category' && catParsed.selection?.categoryPath) {
    const override = await getCategoryOverrideDynamic(catParsed.selection.categoryPath)
    if (override) {
      categoryOverrideBlock = '\n\n' + override
    }
  }

  console.log('[OVERRIDE]', categoryOverrideBlock.slice(0, 150) || 'BRAK')

  const systemPrompt =
    getSystemPrompt(platformSlug, toneKey, brandVoice) +
    sensoryEmotionBlock +
    perfumeZapachSellingBlock +
    fragranceNoteFromNameBlock +
    (isBookListing ? BOOK_LISTING_SPECIALIZATION_BLOCK : '') +
    (!listingEmojisAllowed
      ? `\n\nEMOJI W POLACH JSON: WYŁĄCZONE przez użytkownika — zero emoji i emotikonów Unicode w seoTitle, shortDescription, longDescription, metaDescription i tags. Ma pierwszeństwo przed ogólnymi wskazówkami tonu.`
      : platformSlug === 'allegro'
        ? `\n\nEMOJI (Allegro): Włączone — seoTitle (tytuł oferty w JSON) NIGDY bez emoji; emoji wyłącznie w treści opisu HTML zgodnie z regułami w wiadomości użytkownika (nagłówki, listy, CTA, limit ~10–15 ikon w typowym opisie, max 3–4 typy ikon).`
        : `\n\nEMOJI: WŁĄCZONE przez użytkownika — w odpowiedzi JSON muszą znaleźć się co najmniej 1–2 emoji (łącznie we wszystkich polach), o ile nie są sprzeczne z twardym zakazem platformy; nie zwracaj wariantu „bez żadnego emoji”.`) +
    categoryOverrideBlock

  function structuredLineHasNonEmptyValue(line: string): boolean {
    const t = line.trim()
    const colon = t.indexOf(':')
    if (colon <= 0) return false
    return t.slice(colon + 1).trim().length > 0
  }

  function splitStructuredLines(text: string): { structured: string[]; freeform: string[] } {
    const lines = text.split('\n').filter((l: string) => l.trim())
    const structured: string[] = []
    const freeform: string[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]+\s*:/.test(trimmed)) {
        if (structuredLineHasNonEmptyValue(trimmed)) {
          structured.push(trimmed)
        }
      } else {
        freeform.push(trimmed)
      }
    }
    return { structured, freeform }
  }

  const fpSplit = splitStructuredLines(rawFeatures)

  let featuresBlock = ''
  if (rawMarketplace.length > 0) {
    featuresBlock += `PARAMETRY MARKETPLACE (z formularza oferty / atrybuty — muszą być spójne z opisem; nie zmieniaj wartości):\n${rawMarketplace}\n\n`
  }
  if (fpSplit.structured.length > 0) {
    featuresBlock += `CECHY OPISOWE (strukturalne — UŻYWAJ TYLKO TYCH WARTOŚCI):\n${fpSplit.structured.join('\n')}\n`
  }
  if (fpSplit.freeform.length > 0) {
    featuresBlock += `${fpSplit.structured.length > 0 ? '\n' : ''}DODATKOWE CECHY:\n${fpSplit.freeform.join('\n')}\n`
  }

  const featureLines = combinedRawForContext.split('\n').filter((l: string) => l.trim())

  if (imageAnalysis && hasSubstantiveImageAnalysis(imageAnalysis)) {
    const imageLines = buildImageAnalysisLinesForGeneratePrompt(imageAnalysis)
    featuresBlock += `${featuresBlock ? '\n' : ''}ANALIZA ZE ZDJĘCIA (UŻYWAJ WYŁĄCZNIE JAKO DODATKOWEGO KONTEKSTU WIDOCZNYCH CECH — NIE ZGADUJ BRAKUJĄCYCH PARAMETRÓW):\n${imageLines.join('\n')}\n`
  }

  const productRatingBlock =
    typeof productRating === 'number' && productRating >= 1 && productRating <= 5
      ? `\nOCENA PRODUKTU OD UŻYTKOWNIKA: ${productRating}/5\nUżyj tej oceny jako sygnału copywriterskiego (jak mocno podbić premium/atrakcyjność), ale NIE wpisuj tej oceny dosłownie do treści oferty, chyba że użytkownik podał ją jawnie jako fakt do publikacji.\n`
      : ''

  const rawListingIntent = typeof listingIntent === 'string' ? listingIntent.trim() : ''
  const listingIntentBlock =
    rawListingIntent.length > 0
      ? `\nKĄT SPRZEDAŻY / PRIORYTET (od użytkownika — stosuj w tytule i narracji, bez nowych obietnic ani faktów):\n${JSON.stringify(rawListingIntent.slice(0, 500))}\n`
      : ''

  const imageUrlsBlock = buildDescriptionImageUrlsUserBlock(validatedDescriptionImageUrls, platformSlug)

  const currentIsBundle = detectIsBundle(effectiveProductName, combinedRawForContext)

  const bundleRulesBlock = currentIsBundle
    ? `\n=== REGUŁY ZESTAWU (is_bundle=true — OBOWIĄZKOWE) ===
- WYMUŚ sekcję h2 „📦 Gotowy zestaw" lub „📦 W komplecie" z pełną listą elementów zestawu (każdy element = osobny bullet z mini-korzyścią, nie sucha lista nazw).
- shortDescription: zacznij od „Kompletny zestaw:" lub „W zestawie:" — podkreśl wartość pakietu vs kupowanie osobno.
- CTA: użyj frazy zestawowej: „zestaw startowy od razu gotowy do użycia", „wszystko w jednym zamówieniu", „oszczędzasz kupując razem" (dopasuj do danych).
- seoTitle: MUSI zawierać słowo „Zestaw" lub „Komplet" (to fraza wyszukiwania kupujących bundle).
- Hook: podkreśl wygodę zestawu („Jeden zakup — masz wszystko") zamiast opisywania każdego elementu osobno.
===\n`
    : ''

  const retryContextBlock = (() => {
    if (
      !rawRetryContext ||
      typeof rawRetryContext.previousSeoTitle !== 'string' ||
      !rawRetryContext.previousSeoTitle.trim()
    ) return ''

    const hints = Array.isArray(rawRetryContext.retryHints) ? rawRetryContext.retryHints : []
    const hintsBlock = hints.length > 0
      ? `\nKonkretne zadania poprawy (WYKONAJ WSZYSTKIE):\n${hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
      : ''

    return `\n--- SMART RETRY (poprzednia wersja odrzucona przez użytkownika) ---
Poprzedni tytuł: "${rawRetryContext.previousSeoTitle}"
Poprzedni opis krótki: "${rawRetryContext.previousShortDescription ?? ''}"
Poprzedni wynik: ${rawRetryContext.previousQualityScore ?? '?'}/100
Użytkownik NIE był zadowolony z tej wersji i chce INNY, LEPSZY listing. Zasady:
- Zmień perspektywę sprzedażową — inny hook, inna kolejność korzyści, inny CTA.
- NIE kopiuj tytułu ani opisu krótkiego z poprzedniej wersji.
- Zachowaj te same fakty z danych, ale podaj je w nowym ujęciu.
${hintsBlock}---\n`
  })()

  const sparseInput =
    featureLines.length < 2 && combinedRawForContext.replace(/\s/g, '').length < 90
  const sparseDataBlock = sparseInput
    ? '\nUWAGA: Dane wejściowe są skąpe — trzymaj się faktów, nie dopisuj parametrów; w qualityTips zasugeruj uzupełnienie cech przez sprzedawcę (bez wymyślania wartości).\n'
    : ''

  const emojiPreferenceBlock = listingEmojisAllowed
    ? platformSlug === 'allegro'
      ? buildAllegroListingEmojiUserBlock()
      : `\nEMOJI W LISTINGU: WŁĄCZONE przez użytkownika (obowiązkowo użyj, nie pomijaj):
- W całej odpowiedzi JSON umieść łącznie co najmniej 1 i co najwyżej ok. 5 emoji (typowo 2–3), w miejscach, które pomagają skanować ofertę (np. przy jednym nagłówku h2 w longDescription, w pierwszym akapicie hooku, przy początku jednego punktu listy lub w shortDescription — nie wszędzie naraz).
- Nie stawiaj wielu emoji pod rząd ani zamiast faktów; nie zastępuj słów kluczowych łańcuchem symboli.
- Przy tonie „profesjonalny” lub „techniczny”: nie wstawiaj emoji w seoTitle ani w metaDescription; w longDescription (i ewentualnie shortDescription) zostaw co najmniej 1 emoji.
- Przy tonie „przyjazny”, „młodzieżowy”, „sprzedażowy”, „narracyjny”: możesz rozłożyć 2–4 emoji w całym JSON.\n`
    : `\nFORMATOWANIE — EMOJI WYŁĄCZONE (priorytet nad tonem i „SPÓJNOŚĆ TONU”):
- Nie używaj żadnych znaków emoji (Unicode pictographic) ani emotikonów w seoTitle, shortDescription, longDescription, metaDescription ani w elementach tablicy tags.
- W longDescription (HTML) nie wstawiaj emoji w treści ani w alt przy <img>.
- Jeśli w „POPRZEDNI WYNIK DO ULEPSZENIA” są emoji — usuń je i zastąp merytorycznym tekstem (to samo przy retry/walidacji).\n`

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

--- POPRZEDNI WYNIK DO ULEPSZENIA (to jest dokładnie listing z ostatniego przycisku „Generuj” w tym formularzu; nie zastępuj go treścią z pamięci) ---
Popraw go pod sprzedaż, skanowalność i zgodność z platformą — ale NIE dodawaj nowych faktów spoza NAZWY/CECH/PARAMETRÓW/ANALIZY ZE ZDJĘCIA powyżej ani ponad to, co już wynika z pól poniżej (możesz usuwać błędy, skracać, lepiej strukturyzować, mocniej sprzedać uczciwie z tych samych danych).
seoTitle: ${String(refinementOf.seoTitle ?? '')}
shortDescription: ${String(refinementOf.shortDescription ?? '')}
longDescription (HTML): ${longRef}
tags: ${JSON.stringify(refinementOf.tags ?? [])}
metaDescription: ${String(refinementOf.metaDescription ?? '')}

POLECENIE POPRAWY (Quality Score / użytkownik):
${refinementInstruction.trim()}
`
      : ''

  const bookListingBlock = isBookListing
    ? `${buildBookListingDataUserBlock(
        buildBookListingDataFieldsFromContext(
          effectiveProductName,
          combinedRawForContext,
          imageAnalysis
        )
      )}\n\n`
    : ''

  const conversionReminderBlock = isBookListing
    ? ''
    : getListingConversionRequirementsReminderUserBlock()

  let fewShotBlock = ''
  if (!isRefinement) {
    try {
      const cooldownThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()

      // Lazy promote: descriptions copied_all_at > 10 min ago without retry/refine → high_quality
      const { data: pendingPromotions } = await supabase
        .from('descriptions')
        .select('id')
        .eq('high_quality', false)
        .eq('platform', platformSlug)
        .not('copied_all_at', 'is', null)
        .lt('copied_all_at', cooldownThreshold)
        .limit(10)

      if (pendingPromotions && pendingPromotions.length > 0) {
        const idsToCheck = pendingPromotions.map(d => d.id)
        const { data: tainted } = await supabase
          .from('description_feedback')
          .select('description_id')
          .in('description_id', idsToCheck)
          .in('action', ['retry', 'refine'])

        const taintedSet = new Set((tainted ?? []).map(t => t.description_id))
        const cleanIds = idsToCheck.filter(id => !taintedSet.has(id))
        if (cleanIds.length > 0) {
          await supabase
            .from('descriptions')
            .update({ high_quality: true })
            .in('id', cleanIds)
        }
      }

      const { data: winners } = await supabase
        .from('descriptions')
        .select('seo_title, short_description, quality_score')
        .eq('platform', platformSlug)
        .eq('high_quality', true)
        .eq('is_bundle', currentIsBundle)
        .gte('quality_score', 80)
        .order('quality_score', { ascending: false })
        .limit(2)

      if (winners && winners.length > 0) {
        const examples = winners.map((w, i) =>
          `Przykład ${i + 1} (score ${w.quality_score}/100):\n  Tytuł: ${w.seo_title}\n  Opis krótki: ${w.short_description}`
        ).join('\n')
        fewShotBlock = `\n=== PRZYKŁADY WYSOKIEJ JAKOŚCI (z tej platformy — użytkownicy skopiowali je bez poprawek) ===\n${examples}\nInspiruj się stylem i strukturą, ale NIE kopiuj treści — Twój listing dotyczy INNEGO produktu.\n===\n`
      }
    } catch {
      // few-shot is best-effort, ignore errors
    }
  }

  const userPrompt = `Wygeneruj opis produktu:

${bookListingBlock}NAZWA: ${effectiveProductName}
${categoryBlock}
PLATFORMA: ${platformSlug}
TON: ${toneKey}

${featuresBlock}
${productRatingBlock}${listingIntentBlock}${imageUrlsBlock}${sparseDataBlock}${emojiPreferenceBlock}${bundleRulesBlock}${fewShotBlock}
WAŻNE: Nie wymyślaj parametrów ani cech, których nie ma powyżej. Bazuj WYŁĄCZNIE na podanych danych.
${conversionReminderBlock}
${smartTitleBlock}
${retryContextBlock}${refinementBlock}
${toneReinforcementBlock}

Odpowiedz WYŁĄCZNIE czystym JSON.`

  const chatModel = getDescriptionChatModel(profile.plan as string, {
    isRefinement,
  })
  const isGpt5Family = chatModel.startsWith('gpt-5')
  const modelCallStartedAt = Date.now()
  const tokenLimitParam = getTokenLimitParam(isGpt5Family)
  const retryTokenLimitParam = getTokenLimitParam(isGpt5Family, { isRetry: true })

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
  const sanitizeOpts = {
    stripListingEmojis: !listingEmojisAllowed,
    allegroSanitizeMode,
    fallbackTitleFromProductName: effectiveProductName,
  }
  let sanitized = sanitizeGenerateResult(raw, platformProfile, sanitizeOpts)

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
        ...retryTokenLimitParam,
        response_format: { type: 'json_object' },
      })
      retryElapsedMs = Date.now() - retryStartedAt
      const retryContent = assertChatJsonContent(retryCompletion, 'quality retry completion')
      const retryRaw = JSON.parse(retryContent) as Record<string, unknown>
      const retrySanitized = sanitizeGenerateResult(retryRaw, platformProfile, sanitizeOpts)
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

  const { data: description, error: insertError } = await supabase
    .from('descriptions')
    .insert({
      user_id: userId,
      product_name: effectiveProductName,
      category: category || null,
      features:
        rawMarketplace && rawFeatures
          ? `${rawMarketplace}\n\n---\n${rawFeatures}`
          : rawMarketplace || rawFeatures || null,
      platform: platformSlug,
      tone: tone || 'profesjonalny',
      source_type: imagesForVision.length > 0 ? 'image' : 'form',
      source_image_url: null,
      is_bundle: currentIsBundle,
      seo_title: sanitized.seoTitle,
      short_description: sanitized.shortDescription,
      long_description: sanitized.longDescription,
      tags: sanitized.tags,
      meta_description: sanitized.metaDescription,
      quality_score: sanitized.qualityScore,
      high_quality: (sanitized.qualityScore ?? 0) >= 80,
      quality_tips: sanitized.qualityTips.map((t: QualityTip) => JSON.stringify(t)),
      prompt_version: DESCRIPTION_PROMPT_VERSION,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[runGenerateListing] descriptions insert failed', {
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
    })
    const technical = [insertError.message, insertError.code, insertError.details]
      .filter(Boolean)
      .join(' · ')
    const isDev = process.env.NODE_ENV === 'development'
    throw new Error(
      isDev && technical
        ? `Nie udało się zapisać opisu. ${technical}`
        : 'Nie udało się zapisać opisu. Sprawdź połączenie i spróbuj ponownie.'
    )
  }

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
