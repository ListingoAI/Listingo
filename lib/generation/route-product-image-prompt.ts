import { assertChatJsonContent } from '@/lib/openai/assert-chat-json-content'
import openai from '@/lib/openai'

import {
  DEFAULT_PRODUCT_IMAGE_PROMPT_KIND,
  PRODUCT_IMAGE_PROMPT_KINDS,
  type ProductImagePromptKind,
  parseProductImagePromptKind,
} from '@/lib/generation/product-image-prompt-kinds'

const DEFAULT_ROUTER_MODEL = 'gpt-4o-mini'

function getRouterModel(): string {
  return process.env.OPENAI_PRODUCT_IMAGE_ROUTER_MODEL?.trim() || DEFAULT_ROUTER_MODEL
}

function isRouterEnabled(): boolean {
  const raw = process.env.OPENAI_PRODUCT_IMAGE_ROUTER_ENABLED?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return true
}

function routerTokenParams(model: string): { max_completion_tokens: number } | { max_tokens: number } {
  const isGpt5Family = model.startsWith('gpt-5')
  const raw = process.env.OPENAI_PRODUCT_IMAGE_ROUTER_MAX_COMPLETION_TOKENS?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 120
  const max = Number.isFinite(n) && n >= 32 ? n : 120
  return isGpt5Family ? { max_completion_tokens: max } : { max_tokens: max }
}

const KIND_LIST = PRODUCT_IMAGE_PROMPT_KINDS.join('", "')

const ROUTER_SYSTEM = `Jesteś szybkim klasyfikatorem JEDNEGO zdjęcia produktu (tylko wybór promptu ekstrakcji, bez opisu produktu).

Zwróć WYŁĄCZNIE JSON: {"kind":"..."} gdzie "kind" jest DOKŁADNIE jedną z wartości: "${KIND_LIST}".

Reguły (wybierz jedną):
- "book" — książka, komiks, magazyn, album z okładką/grzbiem; główny przedmiot to publikacja drukowana.
- "furniture" — meble, regał, szafa, stół, krzesło, półka, lampa stojąca (duży przedmiot wyposażenia); często schemat montażu lub ujęcie pokojowe z meblem.
- "electronics" — elektronika: telefon, tablet, laptop, słuchawki, konsola, TV, monitor, sprzęt audio, małe AGD, kable złącza widoczne na urządzeniu.
- "fashion" — odzież, buty, torba, pasek, czapka, biżuteria jako główny produkt (nie rekwizyt na meblu).
- "food_beverage" — żywność, napoje, suplementy w opakowaniu (etykieta, skład, data ważności widoczne lub produkt spożywczy).
- "beauty_health" — kosmetyki, perfumy, higiena, pielęgnacja (flakon, tuba, krem, szampon, makijaż).
- "sports_outdoor" — sprzęt sportowy, fitness, outdoor (piłka, buty sportowe jako główny produkt, namiot, kij, rower jako główny przedmiot).
- "kids_toys" — zabawki, gry dziecięce, produkty dla dzieci z oznaczeniem wieku na opakowaniu.
- "home_garden" — narzędzia ręczne, elektronarzędzia, ogród, majsterkowanie (NIE duże meble — to "furniture").
- "automotive" — części samochodowe, opony, felgi, akcesoria do auta, płyny eksploatacyjne w opakowaniu motoryzacyjnym.
- "general" — MIX, zwierzęta, chemia gospodarcza, inne lub gdy niepewny (bezpieczny fallback).

Jeśli na zdjęciu widać głównie mebel z ubraniami na wieszakach — wybierz "furniture" (meble), nie "fashion".
Żywność vs kosmetyki w podobnym opakowaniu: jedzenie/picie → "food_beverage"; flakon/krem → "beauty_health".

Pole "kind" musi być dokładnie jedną z dozwolonych wartości w cudzysłowie. Bez markdown.`

/**
 * Wybiera tryb promptu ekstrakcji. Wyłącz: OPENAI_PRODUCT_IMAGE_ROUTER_ENABLED=false.
 */
export function isProductImageRouterEnabled(): boolean {
  return isRouterEnabled()
}

function imageUrl(imageBase64: string): string {
  return imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
}

const PLATFORM_CATEGORY_HINTS: Partial<Record<string, ProductImagePromptKind[]>> = {
  vinted: ['fashion'],
  empikplace: ['book', 'electronics'],
  etsy: ['fashion', 'home_garden', 'kids_toys'],
}

/**
 * Jedno wywołanie vision — tani model, mało tokenów.
 * `platformSlug` — opcjonalny hint: jeśli platforma silnie sugeruje kategorię, dopisujemy do user message.
 */
export async function routeProductImagePromptKind(
  imageBase64: string,
  platformSlug?: string
): Promise<ProductImagePromptKind> {
  if (!isRouterEnabled()) {
    return DEFAULT_PRODUCT_IMAGE_PROMPT_KIND
  }

  const model = getRouterModel()
  const isGpt5Family = model.startsWith('gpt-5')
  const temperatureParam = isGpt5Family ? {} : { temperature: 0 }

  const completion = await openai.chat.completions.create({
    model,
    ...temperatureParam,
    messages: [
      { role: 'system', content: ROUTER_SYSTEM },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: platformSlug && PLATFORM_CATEGORY_HINTS[platformSlug]
              ? `Sklasyfikuj zdjęcie. Kontekst: platforma to ${platformSlug} — kategorie ${PLATFORM_CATEGORY_HINTS[platformSlug]!.join(', ')} są tam częstsze, ale wybierz to, co naprawdę widać.`
              : 'Sklasyfikuj zdjęcie według instrukcji systemowej.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl(imageBase64),
              detail: 'auto',
            },
          },
        ],
      },
    ],
    ...routerTokenParams(model),
    response_format: { type: 'json_object' },
  })

  const content = assertChatJsonContent(completion, 'product image prompt router')
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(content) as Record<string, unknown>
  } catch {
    return DEFAULT_PRODUCT_IMAGE_PROMPT_KIND
  }

  return parseProductImagePromptKind(raw.kind)
}
