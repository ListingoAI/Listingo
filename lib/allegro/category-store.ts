import fs from "fs"
import path from "path"

import type {
  AllegroCategoriesFile,
  AllegroCategoryNode,
  AllegroLeafCategory,
} from "./types"

let cachedLeaves: AllegroLeafCategory[] | null = null
let cachedById: Map<string, AllegroLeafCategory> | null = null
let cachedNodes: AllegroCategoryNode[] | null = null
let cachedChildrenByParent: Map<string | null, AllegroCategoryNode[]> | null =
  null

function loadFile(): AllegroCategoriesFile {
  const root = process.cwd()
  const primary = path.join(root, "data", "allegro-categories.json")
  if (!fs.existsSync(primary)) {
    throw new Error(
      "Brak data/allegro-categories.json — uruchom: node scripts/fetch-allegro-categories.mjs (wymaga ALLEGRO_CLIENT_ID/SECRET w .env.local)"
    )
  }
  return JSON.parse(fs.readFileSync(primary, "utf-8")) as AllegroCategoriesFile
}

function buildLeaves(nodes: AllegroCategoryNode[]): AllegroLeafCategory[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  function pathNames(id: string): string[] {
    const names: string[] = []
    let cur: AllegroCategoryNode | undefined = byId.get(id)
    const guard = new Set<string>()
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id)
      names.unshift(cur.name)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return names
  }

  const leaves: AllegroLeafCategory[] = []
  for (const n of nodes) {
    if (!n.leaf) continue
    const path = pathNames(n.id)
    if (path.length === 0) continue
    leaves.push({
      id: n.id,
      name: n.name,
      path,
      pathLabel: path.join(" › "),
    })
  }
  return leaves
}

function getNodesRaw(): AllegroCategoryNode[] {
  if (cachedNodes) return cachedNodes
  const file = loadFile()
  cachedNodes = file.nodes
  return cachedNodes
}

function buildChildrenIndex(
  nodes: AllegroCategoryNode[]
): Map<string | null, AllegroCategoryNode[]> {
  const m = new Map<string | null, AllegroCategoryNode[]>()
  for (const n of nodes) {
    const key = n.parentId
    if (!m.has(key)) m.set(key, [])
    m.get(key)!.push(n)
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name, "pl"))
  }
  return m
}

/** Węzły potomne danego rodzica (`null` = kategorie główne). */
export function getAllegroChildren(
  parentId: string | null
): AllegroCategoryNode[] {
  if (!cachedChildrenByParent) {
    cachedChildrenByParent = buildChildrenIndex(getNodesRaw())
  }
  return cachedChildrenByParent.get(parentId) ?? []
}

export function getAllegroLeafCategories(): AllegroLeafCategory[] {
  if (cachedLeaves) return cachedLeaves
  const file = loadFile()
  cachedLeaves = buildLeaves(file.nodes)
  return cachedLeaves
}

export function getAllegroLeafById(id: string): AllegroLeafCategory | undefined {
  if (!cachedById) {
    const m = new Map<string, AllegroLeafCategory>()
    for (const l of getAllegroLeafCategories()) {
      m.set(l.id, l)
    }
    cachedById = m
  }
  return cachedById.get(id)
}

/** Zapobiega dopasowaniu np. „stal” wewnątrz „Instalacje”. */
const WORD_CHAR = /[a-ząćęłńóśźż0-9]/i

function includesAsWholeWord(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  if (n.length === 0) return false
  let from = 0
  while (from <= h.length) {
    const i = h.indexOf(n, from)
    if (i === -1) return false
    const before = i === 0 ? "" : h[i - 1]!
    const after = i + n.length >= h.length ? "" : h[i + n.length]!
    if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) return true
    from = i + 1
  }
  return false
}

/** Krótkie zapytania i pojedyncze słowa: tylko granice słów; dłuższe frazy: podciąg (np. „narzędzia ręczne”). */
function pathMatchesSearchQuery(hay: string, q: string): boolean {
  const h = hay.toLowerCase()
  const n = q.trim().toLowerCase()
  if (!n) return false
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    return parts.every((p) =>
      p.length >= 8 ? h.includes(p) : includesAsWholeWord(hay, p)
    )
  }
  if (n.length >= 8) return h.includes(n)
  return includesAsWholeWord(hay, n)
}

/**
 * Wyszukiwanie po nazwie liścia i fragmentach ścieżki (case-insensitive).
 */
export function searchAllegroLeaves(
  query: string,
  limit = 50
): AllegroLeafCategory[] {
  const q = query.trim().toLowerCase()
  const all = getAllegroLeafCategories()
  if (!q) return all.slice(0, limit)

  const scored: { leaf: AllegroLeafCategory; score: number }[] = []
  for (const leaf of all) {
    const hay = `${leaf.pathLabel} ${leaf.name}`.toLowerCase()
    if (!pathMatchesSearchQuery(hay, q)) continue
    let score = 0
    if (leaf.name.toLowerCase().includes(q)) score += 10
    if (leaf.pathLabel.toLowerCase().startsWith(q)) score += 5
    const idx = hay.indexOf(q)
    score += Math.max(0, 50 - idx / 10)
    scored.push({ leaf, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.leaf)
}

/**
 * Prosta sugestia kategorii na podstawie nazwy i cech (heurystyka tokenów).
 * Zwraca najlepszego kandydata lub null.
 */
export function suggestAllegroLeaf(
  productName: string,
  features: string
): AllegroLeafCategory | null {
  const top = suggestTopCandidates(productName, features, 1)
  return top.length > 0 ? top[0].leaf : null
}

export type ScoredLeaf = { leaf: AllegroLeafCategory; score: number }

/** Kategorie główne (poziom 0) — do wyboru gałęzi przez AI. */
export function getMainCategoryRoots(): AllegroCategoryNode[] {
  return getAllegroChildren(null)
}

/** Wszystkie liście należące do danej kategorii głównej (po id korzenia). */
export function getLeavesUnderMainCategory(mainCategoryId: string): AllegroLeafCategory[] {
  const nodes = getNodesRaw()
  const main = nodes.find((n) => n.id === mainCategoryId)
  if (!main || main.parentId !== null) return []
  const mainName = main.name
  return getAllegroLeafCategories().filter((l) => l.path[0] === mainName)
}

/**
 * Wykrywa główny produkt z kategorii piśmiennej/biurowej (nie etui na telefon itp.).
 * Używane, by słowo „etui” w zestawie (np. długopis + etui) nie ciągnęło kategorii GSM.
 */
const STATIONERY_PRIMARY_RE =
  /\b(długopis|dlugopis|długopisy|dlugopisy|ołówek|olowek|ołówki|olowki|pióro|pioro|pióra|piora|marker|markery|zakreślacz|zakreslacz|cienkopis|zeszyt|zeszyty|notes|blok\s+techniczny|temperówka|temperowka|linijka|gumka\s+do\s+ścierania)\b/i

/**
 * Suwmiarka / narzędzia pomiarowe — „cyfrowy” ≠ telefon; unikaj Elektronika › Telefony › Etui.
 */
const MEASURING_TOOL_RE =
  /\b(suwmiark|mikrometr|multimetr|omomierz|poziomic|przymiar|kątownik|katownik|ślusarski|slusarski|stolarski|narzędzia\s+pomiar|narzedzia\s+pomiar)\w*\b/i

/** Głośnik / BT / soundbar — nie mylić z filmami DVD ani „kulturą”. */
const CONSUMER_AUDIO_DEVICE_RE =
  /\b(głośnik|glosnik|speaker|soundbar|sound\s?bar|słuchawk|sluchawk|tws|earbuds|subwoofer)\b/i

/** Korekta score: kara za GSM przy narzędziach pomiarowych; bonus za narzędzia/remont. */
export function scoreAdjustmentForMeasuringToolContext(
  leaf: AllegroLeafCategory,
  hayLower: string
): number {
  if (!MEASURING_TOOL_RE.test(hayLower)) return 0
  const pl = leaf.pathLabel.toLowerCase()
  let delta = 0
  if (
    pl.includes("elektronika") &&
    pl.includes("telefon") &&
    (pl.includes("etui") ||
      pl.includes("pokrowce") ||
      pl.includes("akcesoria gsm") ||
      pl.includes("smartfony") ||
      pl.includes("smartwatche"))
  ) {
    delta -= 150
  }
  if (
    pl.includes("fotografia") ||
    (pl.includes("aparaty") && pl.includes("cyfrowe"))
  ) {
    delta -= 90
  }
  if (
    pl.includes("narzędzia") ||
    pl.includes("remont") ||
    pl.includes("elektronarzędzia")
  ) {
    delta += 60
  }
  return delta
}

/** Korekta score: sprzęt audio użytkowy → Elektronika › audio; kara za DVD/filmy/kulturę. */
export function scoreAdjustmentForConsumerAudioContext(
  leaf: AllegroLeafCategory,
  hayLower: string
): number {
  if (!CONSUMER_AUDIO_DEVICE_RE.test(hayLower)) return 0
  const pl = leaf.pathLabel.toLowerCase()
  let delta = 0
  if (
    pl.includes("kultura i rozrywka") ||
    pl.includes("filmy i seriale") ||
    pl.includes("dvd") ||
    pl.includes("blu-ray") ||
    pl.includes("blu ray") ||
    (pl.includes("kultura") && (pl.includes("film") || pl.includes("serial")))
  ) {
    delta -= 180
  }
  if (
    /audiobook|e-book|ebook|książk|ksiazk|komiks|muzycz/i.test(pl)
  ) {
    delta -= 130
  }
  if (
    pl.includes("elektronika") &&
    (pl.includes("audio") ||
      pl.includes("głoś") ||
      pl.includes("glos") ||
      pl.includes("soundbar") ||
      pl.includes("słuchawk") ||
      pl.includes("sluchawk") ||
      pl.includes("video"))
  ) {
    delta += 80
  }
  return delta
}

/** Korekta score: kara za „etui GSM” przy produkcie piśmiennym, bonus za ścieżki biurowe/szkolne. */
export function scoreAdjustmentForPrimaryProductContext(
  leaf: AllegroLeafCategory,
  hayLower: string
): number {
  if (!STATIONERY_PRIMARY_RE.test(hayLower)) return 0
  const pl = leaf.pathLabel.toLowerCase()
  let delta = 0
  if (
    pl.includes("elektronika") &&
    pl.includes("telefon") &&
    (pl.includes("etui") || pl.includes("pokrowce"))
  ) {
    delta -= 120
  }
  if (
    pl.includes("artykuły biurowe") ||
    pl.includes("artykuły szkolne") ||
    (pl.includes("sprzęt biurowy") && pl.includes("biurowe"))
  ) {
    delta += 45
  }
  return delta
}

/** Tokeny z nazwy i cech do wyszukiwania po fragmencie ścieżki (np. „kubek”, „barbie”). */
export function tokenizeProductText(text: string): string[] {
  const raw = text
    .toLowerCase()
    .split(/[\s,;.]+/)
    .map((w) => w.replace(/[^a-ząćęłńóśźż0-9]/gi, ""))
    .filter((w) => w.length >= 3)
  const uniq = [...new Set(raw)]
  return uniq.slice(0, 10)
}

/**
 * Zbiera kandydatów przez searchAllegroLeaves dla każdego słowa z opisu
 * (łapie dopasowania częściowe w ścieżce, nie tylko słowa z drzewa).
 */
export function collectLeavesFromKeywordSearch(
  productName: string,
  features: string,
  perQueryLimit = 12,
  totalLimit = 28
): AllegroLeafCategory[] {
  const combined = `${productName} ${features}`
  const hayLower = combined.toLowerCase()
  let tokens = tokenizeProductText(combined)
  // Przy produkcie piśmiennym „etui” często znaczy opakowanie zestawu — nie szukaj po tym tokenu (unikaj Etui GSM).
  if (STATIONERY_PRIMARY_RE.test(hayLower)) {
    tokens = tokens.filter((t) => t !== "etui" && t !== "pokrowiec")
  }
  const priority: string[] = []
  if (STATIONERY_PRIMARY_RE.test(hayLower)) {
    priority.push("biurowe", "szkolne")
  }
  if (MEASURING_TOOL_RE.test(hayLower)) {
    priority.push("narzędzia ręczne", "narzędzia", "elektronarzędzia")
  }
  if (CONSUMER_AUDIO_DEVICE_RE.test(hayLower)) {
    priority.push("głośniki i soundbary", "głośniki", "audio", "słuchawki")
  }
  const ordered = [...new Set([...priority, ...tokens])]
  const seen = new Set<string>()
  const out: AllegroLeafCategory[] = []
  for (const t of ordered) {
    for (const leaf of searchAllegroLeaves(t, perQueryLimit)) {
      if (seen.has(leaf.id)) continue
      seen.add(leaf.id)
      out.push(leaf)
      if (out.length >= totalLimit) return out
    }
  }
  return out
}

/**
 * Łączy heurystykę + wyszukiwanie słów kluczowych, deduplikuje (priorytet: kolejność heurystyki).
 */
export function mergeHeuristicAndKeywordCandidates(
  productName: string,
  features: string,
  heuristicLimit = 12,
  keywordTotal = 24
): AllegroLeafCategory[] {
  const scored = suggestTopCandidates(productName, features, heuristicLimit)
  const fromKw = collectLeavesFromKeywordSearch(
    productName,
    features,
    12,
    keywordTotal
  )
  const seen = new Set<string>()
  const merged: AllegroLeafCategory[] = []
  for (const s of scored) {
    if (seen.has(s.leaf.id)) continue
    seen.add(s.leaf.id)
    merged.push(s.leaf)
  }
  for (const leaf of fromKw) {
    if (seen.has(leaf.id)) continue
    seen.add(leaf.id)
    merged.push(leaf)
  }
  return merged
}

/** Prosty ranking liści wg pokrycia słów z opisu (przed skróceniem listy do AI). */
export function rankLeavesByInputOverlap(
  leaves: AllegroLeafCategory[],
  productName: string,
  features: string,
  limit: number
): AllegroLeafCategory[] {
  const tokens = tokenizeProductText(`${productName} ${features}`)
  if (tokens.length === 0) return leaves.slice(0, limit)
  const hay = `${productName} ${features}`.toLowerCase()
  const scored = leaves.map((leaf) => {
    const pl = `${leaf.pathLabel} ${leaf.name}`.toLowerCase()
    let score = 0
    for (const t of tokens) {
      if (includesAsWholeWord(pl, t)) score += 2
      if (includesAsWholeWord(hay, t) && includesAsWholeWord(pl, t)) score += 1
    }
    score += scoreAdjustmentForPrimaryProductContext(leaf, hay)
    score += scoreAdjustmentForMeasuringToolContext(leaf, hay)
    score += scoreAdjustmentForConsumerAudioContext(leaf, hay)
    return { leaf, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.leaf)
}

/**
 * Zwraca top-N kandydatów posortowanych malejąco wg score (heurystyka tokenów).
 * Używane jako tani pre-filter przed opcjonalnym AI.
 */
export function suggestTopCandidates(
  productName: string,
  features: string,
  limit = 8
): ScoredLeaf[] {
  const hay = `${productName} ${features}`.toLowerCase()
  if (hay.trim().length < 3) return []

  const leaves = getAllegroLeafCategories()
  const scored: ScoredLeaf[] = []

  for (const leaf of leaves) {
    const blob = `${leaf.path.join(" ")} ${leaf.name}`.toLowerCase()
    const words = blob.split(/[\s/,\-]+/).filter((w) => w.length >= 3)
    let score = 0
    for (const w of words) {
      if (hay.includes(w)) score += w.length > 5 ? 3 : 2
    }
    if (leaf.name.length >= 4 && hay.includes(leaf.name.toLowerCase())) {
      score += 8
    }
    score += scoreAdjustmentForPrimaryProductContext(leaf, hay)
    score += scoreAdjustmentForMeasuringToolContext(leaf, hay)
    score += scoreAdjustmentForConsumerAudioContext(leaf, hay)
    if (score >= 2) scored.push({ leaf, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
