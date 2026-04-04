import {
  formatProductImageAnalysisForFeaturesField,
  type ProductImageAnalysis,
} from '@/lib/generation/product-image-analysis'
import {
  DEFAULT_PRODUCT_IMAGE_PROMPT_KIND,
  type ProductImagePromptKind,
} from '@/lib/generation/product-image-prompt-kinds'

export const MANUAL_FIELD_PLACEHOLDER = '[do uzupełnienia]'

function resolveKind(a: ProductImageAnalysis): ProductImagePromptKind {
  return a.promptKind ?? DEFAULT_PRODUCT_IMAGE_PROMPT_KIND
}

/** Linie „Klucz: placeholder” per kategoria — od najważniejszych dla oferty. */
export function getManualCompletionLines(kind: ProductImagePromptKind): string[] {
  const p = MANUAL_FIELD_PLACEHOLDER
  const header =
    '--- Uzupełnij samodzielnie (często niewidoczne na zdjęciu / parametry oferty) ---'

  switch (kind) {
    case 'book':
      return [
        header,
        `ISBN / EAN: ${p}`,
        `Liczba stron: ${p}`,
        `Format (np. A5): ${p}`,
        `Wymiary: ${p}`,
        `Waga: ${p}`,
        `Rok wydania: ${p}`,
        `Wydawnictwo: ${p}`,
        `Seria: ${p}`,
        `Autor (jeśli nie w nazwie): ${p}`,
        `Stan (nowy/używany): ${p}`,
      ]
    case 'fashion':
      return [
        header,
        `Rozmiar: ${p}`,
        `Skład materiału (%): ${p}`,
        `Kolor (katalogowy): ${p}`,
        `Długość / szerokość: ${p}`,
        `Kraj produkcji: ${p}`,
      ]
    case 'electronics':
      return [
        header,
        `EAN / kod producenta: ${p}`,
        `Moc / parametry techniczne: ${p}`,
        `Gwarancja: ${p}`,
        `Numer seryjny (jeśli dotyczy): ${p}`,
        `Kompatybilność: ${p}`,
      ]
    case 'furniture':
      return [
        header,
        `Wymiary (szer. × gł. × wys.): ${p}`,
        `Waga: ${p}`,
        `Kolor / wykończenie (katalogowe): ${p}`,
        `Materiał: ${p}`,
        `Montaż / zestaw: ${p}`,
      ]
    case 'food_beverage':
      return [
        header,
        `EAN: ${p}`,
        `Data ważności / LOT: ${p}`,
        `Masa / objętość: ${p}`,
        `Skład (z etykiety): ${p}`,
        `Alergeny: ${p}`,
        `Kraj pochodzenia: ${p}`,
      ]
    case 'beauty_health':
      return [
        header,
        `Pojemność (ml / g): ${p}`,
        `SPF / typ skóry: ${p}`,
        `Skład INCI (z etykiety): ${p}`,
        `EAN: ${p}`,
        `Data ważności / PAO: ${p}`,
      ]
    case 'sports_outdoor':
      return [
        header,
        `Rozmiar / długość: ${p}`,
        `Waga produktu: ${p}`,
        `Materiał (z etykiety): ${p}`,
        `Norma / certyfikat: ${p}`,
        `EAN: ${p}`,
      ]
    case 'kids_toys':
      return [
        header,
        `Wiek zalecany: ${p}`,
        `EAN: ${p}`,
        `Liczba elementów / baterie: ${p}`,
        `Norma bezpieczeństwa: ${p}`,
      ]
    case 'home_garden':
      return [
        header,
        `Moc (W) / napięcie (V): ${p}`,
        `Wymiary / rozmiar: ${p}`,
        `Kompatybilność: ${p}`,
        `EAN: ${p}`,
      ]
    case 'automotive':
      return [
        header,
        `Indeks opony / rozmiar: ${p}`,
        `OEM / numer katalogowy: ${p}`,
        `Rok / homologacja: ${p}`,
        `EAN: ${p}`,
      ]
    default:
      return [
        header,
        `Wymiary: ${p}`,
        `Waga: ${p}`,
        `Kolor: ${p}`,
        `Materiał: ${p}`,
        `Marka: ${p}`,
        `Model: ${p}`,
        `EAN / kod: ${p}`,
      ]
  }
}

const FALLBACK_TAIL =
  '\n\n--- Uzupełnij samodzielnie — dopisz parametry oferty (rozmiar, waga, kody) w kolejnych liniach, np. Rozmiar: [do uzupełnienia] ---'

/**
 * Tekst do pola „Cechy” po weryfikacji zdjęcia: ekstrakcja + szablon pól do dopisania (limit zgodny z UI).
 * Priorytet: nie obcinać bloku ekstrakcji — skraca szablon lub dodaje krótką stopkę.
 */
export function buildFeaturesAfterImageVerification(
  analysis: ProductImageAnalysis,
  maxChars: number
): string {
  const base = formatProductImageAnalysisForFeaturesField(analysis)
  if (base.length >= maxChars) {
    return base.slice(0, maxChars)
  }

  const kind = resolveKind(analysis)
  let lines = getManualCompletionLines(kind)
  let template = '\n\n' + lines.join('\n')

  while (base.length + template.length > maxChars && lines.length > 2) {
    lines = lines.slice(0, -1)
    template = '\n\n' + lines.join('\n')
  }

  if (base.length + template.length <= maxChars) {
    return base + template
  }

  if (base.length + FALLBACK_TAIL.length <= maxChars) {
    return base + FALLBACK_TAIL
  }

  return base.slice(0, maxChars)
}
