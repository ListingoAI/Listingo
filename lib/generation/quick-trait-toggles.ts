/** Szybkie cechy — jedna linia = jedna wartość kanoniczna w polu „Cechy”. */
export type QuickTraitToggle = {
  id: string
  label: string
  /** Pełna linia wstawiana / usuwana (nagłówek przed „:” służy do dopasowania przy usuwaniu). */
  line: string
}

export const QUICK_TRAIT_TOGGLES: QuickTraitToggle[] = [
  { id: 'waterproof', label: 'Wodoodporny', line: 'Wodoodporny: tak' },
  { id: 'warranty24', label: 'Gwarancja 24 mc', line: 'Gwarancja: 24 miesiące' },
  { id: 'oem', label: 'Oryginał / OEM', line: 'Pochodzenie: oryginał (OEM)' },
  { id: 'new_sealed', label: 'Nowy, folia', line: 'Stan: nowy, zapieczętowany' },
  { id: 'eu_plug', label: 'Wtyczka EU', line: 'Zasilanie: wtyczka EU' },
  { id: 'battery_incl', label: 'Baterie w zestawie', line: 'Zasilanie: baterie w zestawie' },
]
