export const SUMMARY_PREFIXES = [
  "Korzyść (widać z konstrukcji):",
  "Fakt:",
  "Wniosek:",
  "Interpretacja obrazu:",
  "Wniosek wizualny:",
]

export function stripSummaryPrefix(line: string): string {
  const t = line.trim()
  for (const prefix of SUMMARY_PREFIXES) {
    if (t.startsWith(prefix)) {
      return t.slice(prefix.length).trim()
    }
  }
  return t
}
