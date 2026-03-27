/**
 * Liczenie słów w HTML/plain — ta sama logika co w sanitize-generate-result,
 * żeby UI (min. słów) i serwer / qualityScore nie rozjechały się o kilka słów.
 */
export function countWordsFromHtml(htmlOrText: string): number {
  const plain = htmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return 0
  return plain.split(/\s+/).filter(Boolean).length
}
