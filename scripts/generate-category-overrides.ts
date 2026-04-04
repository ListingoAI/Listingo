/**
 * Generuje lib/prompts/generated-category-overrides.json na podstawie drzewa Allegro.
 * Uruchomienie: npx tsx scripts/generate-category-overrides.ts
 * Wymaga: OPENAI_API_KEY w środowisku (np. .env.local — załaduj ręcznie lub node --env-file=.env.local)
 */
import fs from "node:fs"
import path from "node:path"

type AllegroCategoryNode = {
  id: string
  name: string
  parentId: string | null
  leaf: boolean
}

type AllegroCategoriesFile = {
  version?: number
  nodes: AllegroCategoryNode[]
}

type AllegroLeafCategory = {
  id: string
  name: string
  path: string[]
  pathLabel: string
}

const OUT_PATH = path.join(
  process.cwd(),
  "lib",
  "prompts",
  "generated-category-overrides.json"
)
const DATA_PATH = path.join(process.cwd(), "data", "allegro-categories.json")

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
    const p = pathNames(n.id)
    if (p.length === 0) continue
    leaves.push({
      id: n.id,
      name: n.name,
      path: p,
      pathLabel: p.join(" › "),
    })
  }
  return leaves
}

function loadExisting(): Record<string, string> {
  if (!fs.existsSync(OUT_PATH)) return {}
  try {
    const raw = fs.readFileSync(OUT_PATH, "utf-8")
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function saveResults(data: Record<string, string>): void {
  const dir = path.dirname(OUT_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2), "utf-8")
}

const SYSTEM_PROMPT = `Jesteś ekspertem e-commerce i prawa konsumenckiego w Polsce (2026). 
Zwróć TYLKO blok instrukcji — bez wstępów, bez wyjaśnień, bez cudzysłowów.

Znasz aktualne przepisy obowiązujące sprzedawców na Allegro:
- Data Act UE (od 12.09.2025): urządzenia elektroniczne podłączone do internetu (smartfony, smartwatche, TV, routery, AGD smart, głośniki smart, kamery IP itp.) MUSZĄ zawierać informację o przetwarzaniu danych osobowych przez urządzenie
- System kaucyjny (od końca 2025): napoje w butelkach plastikowych do 3L i szklanych do 1.5L oraz puszki aluminiowe do 1L MUSZĄ zawierać informację o możliwości zwrotu opakowania i odzyskania kaucji
- Środki ochrony roślin (od 06.03.2026): nowe zasady — wymagane pozwolenie na obrót, numer rejestracji środka
- Kosmetyki: wymagany pełny skład INCI, data ważności lub PAO (okres po otwarciu)
- Suplementy diety: zakaz oświadczeń zdrowotnych niezatwierdzonych przez EFSA, wymagany skład i dawkowanie
- Elektronika: certyfikat CE obowiązkowy, dla urządzeń radiowych dodatkowo deklaracja zgodności RE
- Zabawki: certyfikat CE + norma EN 71, oznaczenie wieku
- AGD: etykieta energetyczna (klasa energetyczna A-G)
- Żywność: data ważności, skład, wartości odżywcze, alergeny
- Leki i wyroby medyczne: numer pozwolenia, producent, wskazania`

function buildUserPrompt(pathLabel: string, leafName: string): string {
  const upper = leafName.toUpperCase()
  return `Stwórz zwięzły blok instrukcji dla AI generującego opisy produktów na Allegro w kategorii: ${pathLabel}

Zwróć dokładnie w tym formacie (bez żadnych dodatkowych komentarzy):
SPECJALIZACJA — ${upper}:
Kluczowe parametry: [3-5 parametrów które ZAWSZE muszą być w opisie tej kategorii]
Oś sprzedaży: [co kupujący w tej kategorii ceni najbardziej — 1 zdanie]
Unikaj: [1-2 błędy typowe dla tej kategorii na Allegro]
SEO frazy: [5-7 fraz które kupujący wpisuje szukając tego produktu po polsku]
Allegro compliance: [specyficzne wymogi prawne lub regulaminowe dla tej kategorii — np. certyfikat CE dla elektroniki, Data Act dla urządzeń IoT podłączonych do internetu, skład INCI dla kosmetyków, data ważności dla żywności, informacja o systemie kaucyjnym dla napojów w opakowaniach, CE i normy bezpieczeństwa dla zabawek, oznaczenia energetyczne dla AGD. Napisz konkretnie co dotyczy tej kategorii. Jeśli brak specyficznych wymogów napisz: Brak dodatkowych wymogów.]`
}

async function callOpenAI(userContent: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error("Brak OPENAI_API_KEY — ustaw zmienną środowiskową.")
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 300,
    }),
  })

  const rawText = await res.text()
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${rawText.slice(0, 500)}`)
  }

  const data = JSON.parse(rawText) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim() ?? ""
  if (!content) throw new Error("Pusta odpowiedź z OpenAI")
  return content
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

async function main(): Promise<void> {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Brak pliku: ${DATA_PATH}`)
  }

  const file = JSON.parse(
    fs.readFileSync(DATA_PATH, "utf-8")
  ) as AllegroCategoriesFile
  const allLeaves = buildLeaves(file.nodes)
  const total = allLeaves.length

  let existing = loadExisting()

  const pending: { leaf: AllegroLeafCategory; indexInAll: number }[] = []
  for (let i = 0; i < allLeaves.length; i++) {
    const leaf = allLeaves[i]!
    if (existing[leaf.pathLabel]) continue
    pending.push({ leaf, indexInAll: i + 1 })
  }

  if (pending.length === 0) {
    console.log(`Gotowe! Wygenerowano ${Object.keys(existing).length} / ${total} kategorii (wszystko już było).`)
    return
  }

  const batches = chunk(pending, 20)

  for (const batch of batches) {
    await Promise.all(
      batch.map(async ({ leaf, indexInAll }) => {
        try {
          const user = buildUserPrompt(leaf.pathLabel, leaf.name)
          const text = await callOpenAI(user)
          existing[leaf.pathLabel] = text
          console.log(
            `[${indexInAll}/${total}] ${leaf.pathLabel} — OK`
          )
        } catch (err) {
          console.error(
            `[${indexInAll}/${total}] ${leaf.pathLabel} — BŁĄD:`,
            err instanceof Error ? err.message : err
          )
        }
      })
    )

    saveResults(existing)
  }

  const done = Object.keys(existing).length
  console.log(`Gotowe! Wygenerowano ${done} / ${total} kategorii`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
