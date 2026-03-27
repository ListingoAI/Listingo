import { assertChatJsonContent } from '@/lib/openai/assert-chat-json-content'
import openai from '@/lib/openai'

import type { ProductImageAnalysis } from '@/lib/generation/product-image-analysis'

function parseStringList(raw: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0 && x.length <= maxLen)
    .slice(0, max)
}

const VISION_SYSTEM = `Jesteś analitykiem zdjęć produktowych dla e-commerce. Twoje odpowiedzi muszą być konserwatywne: ZERO zgadywania materiałów, gramatur, rozmiarów, SKU, certyfikatów, roku produkcji ani funkcji, jeśli nie są czytelnie widoczne na zdjęciu lub nie wynikają jednoznacznie z kadru.

ZASADY:
- Nie rozpoznawaj marki ani modelu „po kształcie” — tylko jeśli czytelny napis, logo lub metka na produkcie.
- Nie dopisuj „typowych dla kategorii” parametrów (np. skład bawełny przy koszulce), jeśli nie ma czytelnej metki/tkaniny w kadrze.
- Każda cecha w productDetailLines / listingSummary / sales musi wynikać z tego, co faktycznie widać.
- Jeśli czegoś nie da się ustalić z kadru — wpisz to w notVisibleOrUncertainLines (np. „nie widać metki z rozmiarem”, „materiał nieczytelny”), zamiast wymyślać.
- visibleAttributes: krótkie frazy tylko z obserwacji.
- Nie podawaj cen, recenzji, gwiazdek.

Odpowiedz WYŁĄCZNIE JSON-em o polach:
{"detectedProductName":string,"visibleCategoryHint":string,"visibleAttributes":string[],"listingSummary":string,"productDetailLines":string[],"salesImpressionLines":string[],"notVisibleOrUncertainLines":string[]}

Pola:
- detectedProductName: nazwa jak do sklepu; jeśli niepewne — ogólny typ produktu bez marki, której nie widać.
- visibleCategoryHint: krótka podpowiedź branży (bez ID Allegro).
- visibleAttributes: 3–8 krótkich fraz z obserwacji.
- listingSummary: 1–3 zdania jak lead — tylko to, co widać.
- productDetailLines: 4–10 punktów — detale wizualne (kroje, guziki, kieszenie…).
- salesImpressionLines: 2–5 punktów — ton sprzedażowy wyłącznie z tego, co widać.
- notVisibleOrUncertainLines: 2–8 punktów — czego NIE widać albo co jest niepewne; NIE uzupełniaj wymyślonymi parametrami.

Puste tablice lub puste stringi tam, gdzie brak treści.`

/** Vision: widoczne fakty + jawne luki — tylko po stronie serwera / API */
export async function analyzeProductImage(
  imageBase64: string
): Promise<ProductImageAnalysis> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.25,
    messages: [
      {
        role: 'system',
        content: VISION_SYSTEM,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Przeanalizuj zdjęcie i wypełnij JSON. Zakaz uzupełniania luk „domyślnymi” parametrami branżowymi — jeśli czegoś nie widać, idzie wyłącznie do notVisibleOrUncertainLines.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`,
              detail: 'low',
            },
          },
        ],
      },
    ],
    max_tokens: 1100,
    response_format: { type: 'json_object' },
  })

  const content = assertChatJsonContent(completion, 'image analysis completion')
  const raw = JSON.parse(content) as Record<string, unknown>

  const visibleAttributes = Array.isArray(raw.visibleAttributes)
    ? raw.visibleAttributes
        .map((x) => String(x).trim())
        .filter((x) => x.length > 0)
        .slice(0, 10)
    : []

  const listingSummary =
    typeof raw.listingSummary === 'string' ? raw.listingSummary.trim().slice(0, 900) : ''

  return {
    detectedProductName:
      typeof raw.detectedProductName === 'string'
        ? raw.detectedProductName.trim().slice(0, 220)
        : '',
    visibleAttributes,
    visibleCategoryHint:
      typeof raw.visibleCategoryHint === 'string'
        ? raw.visibleCategoryHint.trim().slice(0, 280)
        : '',
    ...(listingSummary ? { listingSummary } : {}),
    productDetailLines: parseStringList(raw.productDetailLines, 12, 320),
    salesImpressionLines: parseStringList(raw.salesImpressionLines, 8, 280),
    notVisibleOrUncertainLines: parseStringList(raw.notVisibleOrUncertainLines, 10, 240),
  }
}
