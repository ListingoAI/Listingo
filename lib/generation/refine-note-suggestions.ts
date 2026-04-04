/** Grupy jak w hubie „Fakty i parametry” — do listy podpowiedzi pod „Dopracuj do 100”. */
export type RefineNoteGroupId = "basics" | "specs" | "codes" | "other"

export const REFINE_NOTE_GROUP_ORDER: RefineNoteGroupId[] = [
  "basics",
  "specs",
  "codes",
  "other",
]

export function classifyRefineNoteInsert(text: string): RefineNoteGroupId {
  const t = text.toLowerCase()
  if (
    /\bean\b|\bsku\b|\bgtin\b|kod producenta|kod kresk|cert|ce\b|norm|zestaw|zawartość|gwaranc/i.test(t)
  ) {
    return "codes"
  }
  if (
    /waga|wymiar|gram\b|\bmm\b|\bcm\b|parametr|materiał|skład|montaż|napięcie|moc\b|pojemno|kompat/i.test(t)
  ) {
    return "specs"
  }
  if (
    /kolor|rozmiar|pielęgnacja|pranie|zastosowanie|stan |rozmiarów|tabela|rozmiar/i.test(t)
  ) {
    return "basics"
  }
  return "other"
}

/** Ukrywa podpowiedzi specyficzne dla innej platformy (np. Allegro tylko przy slug allegro). */
export function isRefineNoteRelevantForPlatform(
  insert: string,
  platformSlug: string | undefined
): boolean {
  const s = (platformSlug ?? "").toLowerCase()
  const t = insert.toLowerCase()

  if (
    /parametr(y|ów)?\s+oferty\s*\(allegro\)|filtr(ów)?\s+boczn|formularz\w*\s+wystawiania\s+—\s+kolor/i.test(
      t
    ) ||
    (/\ballegro\b/i.test(t) && /parametr|formularz|filtr|wystawiania/i.test(t))
  ) {
    return s === "allegro"
  }

  if (/\bbackend\s+search\s+terms\b|seller central|\b249\b.*\butf-?8/i.test(t)) {
    return s === "amazon"
  }

  if (/\bhashtag\w*\s+na\s+końcu|\bpanelu\s+vinted\b/i.test(t)) {
    return s === "vinted"
  }

  return true
}
