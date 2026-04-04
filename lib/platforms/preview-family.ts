import { getPlatformProfile } from '@/lib/platforms'

/** Rodzina szablonu wizualnego podglądu — nie 1:1 z każdym slugiem. */
export type PreviewFrameId =
  | 'allegro'
  | 'store'
  | 'global_marketplace'
  | 'plain_classified'
  | 'generic_html'
  | 'google'
  | 'mobile'

/** Które karty pokazują długi opis jako HTML vs zwykły tekst. */
export function longDescriptionIsHtml(slug: string): boolean {
  return getPlatformProfile(slug).descriptionFormat === 'html'
}

/**
 * Mapuje slug platformy z formularza na szablon podglądu „jak na platformie”.
 */
export function getPreviewFrameIdForSlug(slug: string): PreviewFrameId {
  const p = slug.toLowerCase().trim()
  if (p === 'allegro' || p === 'empikplace') return 'allegro'
  if (p === 'shopify' || p === 'woocommerce') return 'store'
  if (p === 'amazon' || p === 'ebay' || p === 'etsy') return 'global_marketplace'
  if (p === 'olx' || p === 'vinted' || p === 'ogolny_plain') return 'plain_classified'
  if (p === 'ogolny') return 'generic_html'
  return 'generic_html'
}
