/** Sekcje „nagłówek + lista - …” z pola Cechy — pod czytelny podgląd UI. */
export type ParsedFeatureSection = { title: string; items: string[] }

/**
 * Parsuje tekst z liniami nagłówków kończących się na `:` oraz punktorów `-` / `•`.
 */
export function parseFeaturesBulletSections(text: string): ParsedFeatureSection[] {
  const lines = text.split(/\r?\n/)
  const sections: ParsedFeatureSection[] = []
  let cur: ParsedFeatureSection | null = null

  const isHeader = (t: string) => {
    if (!t.endsWith(':')) return false
    if (t.startsWith('-') || t.startsWith('•')) return false
    if (t.length > 160) return false
    return true
  }

  const flush = () => {
    if (cur && cur.items.length > 0) {
      sections.push(cur)
    }
    cur = null
  }

  for (const raw of lines) {
    const t = raw.trim()
    if (!t) continue

    const bullet = t.match(/^[-•]\s+(.+)$/)
    if (bullet) {
      if (!cur) cur = { title: '', items: [] }
      cur.items.push(bullet[1])
      continue
    }

    if (isHeader(t)) {
      flush()
      cur = { title: t.replace(/:\s*$/, '').trim(), items: [] }
      continue
    }

    if (cur && cur.items.length > 0) {
      cur.items[cur.items.length - 1] += ' ' + t
    }
  }
  flush()
  return sections
}
