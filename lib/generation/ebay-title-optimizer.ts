/**
 * Title Optimizer (eBay): wykrywa powtórzenia tego samego słowa w tytule
 * i zamienia kolejne wystąpienia na synonimy z bezpiecznej listy.
 * Nie używa zewnętrznych API — deterministyczne, przewidywalne zachowanie.
 */

/** Słowa krótkie / spójniki — powtórzenia rzadko są „śmieciem”, pomijamy deduplikację. */
const SKIP_DEDUP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "of",
  "in",
  "on",
  "to",
  "x",
  "xl",
  "xxl",
  "i",
  "z",
  "w",
  "na",
  "od",
  "do",
  "po",
])

/**
 * Klucz = małe litery (rdzeń słowa). Wartość = możliwe zamienniki (preferowane pierwsze).
 * Tylko sensowne pary pod tytuły e-commerce / ogólne EN + część PL.
 */
const SYNONYMS: Record<string, string[]> = {
  bag: ["handbag", "pouch", "carryall"],
  backpack: ["rucksack", "daypack", "knapsack"],
  black: ["dark", "jet", "charcoal"],
  blue: ["navy", "azure", "cobalt"],
  case: ["cover", "shell", "sleeve"],
  charger: ["adapter", "power brick"],
  cover: ["case", "shell", "skin"],
  dress: ["gown", "frock"],
  gift: ["present", "bundle"],
  jacket: ["coat", "blazer", "outerwear"],
  jeans: ["denim", "trousers"],
  laptop: ["notebook", "ultrabook"],
  large: ["big", "roomy", "oversized"],
  leather: ["genuine hide", "real leather"],
  men: ["mens", "male", "gents"],
  new: ["unused", "sealed", "mint"],
  phone: ["handset", "mobile", "smartphone"],
  red: ["crimson", "burgundy", "scarlet"],
  shirt: ["tee", "top", "blouse"],
  shoe: ["sneaker", "boot", "footwear"],
  shoes: ["sneakers", "boots", "footwear"],
  small: ["compact", "mini", "petite"],
  strap: ["band", "belt"],
  watch: ["timepiece", "wristwatch"],
  water: ["aqua", "H2O"],
  white: ["ivory", "pearl", "off-white"],
  women: ["womens", "female", "ladies"],
  // PL
  czarny: ["grafitowy", "antracytowy"],
  duży: ["obszerny", "pojemny"],
  mały: ["kompaktowy", "mini"],
  nowy: ["nieużywany", "fabrycznie zapakowany"],
  plecak: ["torba", "bagaż"],
  skóra: ["skórzany", "naturalna skóra"],
  torba: ["saszetka", "nerka"],
}

function extractWordCore(token: string): { core: string; lower: string; prefix: string; suffix: string } {
  const match = token.match(/^([^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż0-9]*)([A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż0-9]+(?:['-][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż0-9]+)?)(.*)$/u)
  if (!match) {
    return { core: "", lower: "", prefix: token, suffix: "" }
  }
  const [, pre, core, rest] = match
  return {
    core,
    lower: core.toLowerCase(),
    prefix: pre ?? "",
    suffix: rest ?? "",
  }
}

function pickSynonym(
  lower: string,
  titleSoFarLower: string
): string | null {
  const candidates = SYNONYMS[lower]
  if (candidates?.length) {
    for (const c of candidates) {
      if (!titleSoFarLower.includes(c.toLowerCase())) return c
    }
    return null
  }
  const singular = lower.replace(/s$/i, "")
  if (singular !== lower) {
    const alt = SYNONYMS[singular]
    if (alt?.length) {
      for (const c of alt) {
        if (!titleSoFarLower.includes(c.toLowerCase())) return c
      }
      return null
    }
  }
  return null
}

export type EbayTitleOptimizerResult = {
  title: string
  changed: boolean
  /** Krótkie opisy zamian, np. „bag → handbag” */
  replacements: string[]
}

/**
 * Usuwa powtórzenia słów w tytule eBay, zamieniając kolejne wystąpienia na synonimy.
 * Zachowuje ogólny układ tokenów (spacje).
 */
export function optimizeEbayTitle(title: string): EbayTitleOptimizerResult {
  const trimmed = title.trim()
  if (!trimmed) {
    return { title: "", changed: false, replacements: [] }
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  const seen = new Set<string>()
  const replacements: string[] = []
  const out: string[] = []

  for (const token of tokens) {
    const { core, lower, prefix, suffix } = extractWordCore(token)
    if (!core || lower.length < 2 || SKIP_DEDUP.has(lower)) {
      out.push(token)
      continue
    }

    if (!seen.has(lower)) {
      seen.add(lower)
      out.push(token)
      continue
    }

    const soFar = out.join(" ")
    const alt = pickSynonym(lower, soFar.toLowerCase())
    if (alt) {
      const newToken = `${prefix}${alt}${suffix}`.trim() || alt
      out.push(newToken)
      seen.add(alt.toLowerCase())
      replacements.push(`${core} → ${alt}`)
    } else {
      // Brak synonimu w słowniku — pomiń drugie wystąpienie (oszczędność znaków + mniej szumu)
      replacements.push(`${core} (usunięto powtórzenie)`)
    }
  }

  const result = out.join(" ").replace(/\s+/g, " ").trim()
  const changed = replacements.length > 0 && result !== trimmed
  return {
    title: result,
    changed,
    replacements,
  }
}
