/** Wyciąga src z tagów <img> w HTML (podgląd oferty, miniatury). */
export function extractImgSrcsFromHtml(html: string, max = 8): string[] {
  if (!html?.trim()) return []
  const out: string[] = []
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && out.length < max) {
    const u = m[1].trim()
    if (u) out.push(u)
  }
  return [...new Set(out)]
}
