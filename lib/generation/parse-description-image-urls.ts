import { getPlatformProfile } from '@/lib/platforms'

/** Maks. liczba poprawnych URL-i wczytywanych z pola (jeden na linię). */
export const MAX_DESCRIPTION_IMAGE_URLS = 12

const MAX_URLS = MAX_DESCRIPTION_IMAGE_URLS
const MAX_URL_LEN = 2048

/** Walidacja jak przy fetch konkurencji — tylko publiczne http(s). */
function isSafeHttpUrl(line: string): string | null {
  const s = line.trim()
  if (!s || s.length > MAX_URL_LEN) return null
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    const host = u.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local')
    ) {
      return null
    }
    if (/^(10\.|192\.168\.|127\.)/.test(host)) return null
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null
    return s
  } catch {
    return null
  }
}

/**
 * Parsuje wieloliniowy tekst (jeden URL na linię) do listy bezpiecznych adresów.
 */
export function parseAndValidateDescriptionImageUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  const out: string[] = []
  for (const line of raw.split('\n')) {
    if (out.length >= MAX_URLS) break
    const ok = isSafeHttpUrl(line)
    if (ok) out.push(ok)
  }
  return out
}

/** Ile grafik może zostać osadzonych w HTML opisu (wg promptu) — tylko sens dla platform embed. */
export function getDescriptionImageEmbedCap(platformSlug: string): number {
  if (platformSlug === 'amazon') return 3
  return 6
}

/**
 * Blok do user promptu — tylko dla platform z HTML; plain text bez osadzania <img>.
 */
export function buildDescriptionImageUrlsUserBlock(
  urls: string[],
  platformSlug: string
): string {
  if (urls.length === 0) return ''
  const profile = getPlatformProfile(platformSlug)
  const list = urls.map((u, i) => `${i + 1}. ${u}`).join('\n')

  // eBay: descriptionFormat=html, ale regulamin zabrania zewnętrznych zasobów graficznych (obrazy muszą być hostowane na serwerach eBay)
  if (platformSlug === 'ebay') {
    return `\nADRESY GRAFIK (od użytkownika — eBay zabrania zewnętrznych/zewnętrznie hostowanych obrazów w opisie (zasada: eBay-hosted images only); NIE wstawiaj <img> z tymi URL-ami; możesz wspomnieć o zestawie zdjęć lub dodatkowych fotkach tekstowo, bez osadzania zewnętrznych linków):\n${list}\n`
  }

  if (profile.descriptionFormat !== 'html') {
    return `\nADRESY GRAFIK (od użytkownika — ${profile.name} używa plain text; NIE wstawiaj tagów <img>; możesz zawrzeć sensowną wzmiankę o zestawie zdjęć bez linków, zgodnie z regulaminem ${profile.name}):\n${list}\n`
  }

  // Amazon: HTML, ale <img> w opisie Products jest ograniczone — linki mogą trafić do A+ Alt Text; maksymalnie 3 obrazy
  if (platformSlug === 'amazon') {
    const cap = Math.min(urls.length, getDescriptionImageEmbedCap('amazon'))
    return `\nZDJĘCIA DO OPISU HTML — Amazon (TYLKO TE ADRESY — w polu longDescription możesz osadzić co najwyżej ${cap} obrazków przez <img src="dokładnie_ten_URL" alt="zwięzły opis EN/PL">; pamiętaj: tekst na grafice A+ nie jest indeksowany jak opis; Alt Text modułów A+ bywa indeksowany — użyj sensownych fraz; NIE wymyślaj URL-i):\n${list}\n`
  }

  const cap = Math.min(urls.length, getDescriptionImageEmbedCap(platformSlug))
  return `\nZDJĘCIA DO OPISU HTML (TYLKO TE ADRESY — w polu longDescription możesz osadzić wybrane zdjęcia przez <img src="dokładnie_ten_URL" alt="zwięzły opis po polsku">; użyj co najwyżej ${cap} obrazków w całym opisie; NIE wymyślaj innych URL-i, base64 ani placeholderów; sensowny układ np. po pierwszym akapicie lub przy sekcji z cechami):\n${list}\n`
}
