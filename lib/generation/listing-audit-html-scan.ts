/**
 * Lekka heurystyka błędów HTML w opisie — bez pełnego parsera DOM.
 * Łapie typowe błędy generatorów: zbędne </p>, nierównowaga <p></p>.
 */
export function scanListingHtmlForObviousIssues(html: string): string[] {
  const h = html.trim()
  if (!h || h.length < 3) return []

  const issues: string[] = []
  const sample = h.length > 400_000 ? h.slice(0, 400_000) : h

  // Zbędny </p> tuż po nagłówku (częsty błąd UX)
  if (/<\/h[1-6][^>]*>\s*<\/p>/i.test(sample)) {
    issues.push(
      'Błąd HTML: zbędny znacznik </p> zaraz po nagłówku (h2/h3 itd.) — usuń go albo popraw strukturę akapitów.',
    )
  }

  if (/<\/(?:ul|ol|div|section|table)[^>]*>\s*<\/p>/i.test(sample)) {
    issues.push(
      'Błąd HTML: zbędny </p> po zamknięciu listy lub bloku — usuń, żeby opis renderował się poprawnie.',
    )
  }

  const openP = (sample.match(/<p\b[^>]*>/gi) ?? []).length
  const closeP = (sample.match(/<\/p>/gi) ?? []).length
  if (closeP > openP) {
    issues.push(
      `Błąd HTML: więcej zamknięć </p> (${closeP}) niż otwarć <p> (${openP}) — popraw w edytorze (zbędne </p> lub brakujące <p>).`,
    )
  }

  if (/<\/p>\s*<\/p>/i.test(sample)) {
    issues.push('Błąd HTML: podwójne zamknięcia </p> — usuń nadmiarowe tagi.')
  }

  if (/<\/li>\s*<\/li>/i.test(sample)) {
    issues.push(
      'Błąd HTML: podwójne </li> — nadmiarowe zamknięcie punktu listy (usuń zbędne </li>).',
    )
  }

  if (/<\/h2>\s*<\/p>/i.test(sample)) {
    issues.push(
      'Błąd HTML: samotne </p> zaraz po nagłówku h2 — usuń lub dodaj treść w <p>…</p>.',
    )
  }

  return issues
}
