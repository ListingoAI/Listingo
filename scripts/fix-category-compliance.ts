/**
 * Regeneruje wybrane wpisy w lib/prompts/generated-category-overrides.json
 * (klucze pasujące do COMPLIANCE_KEYWORDS) tym samym pipeline co generate-category-overrides.
 * Uruchomienie: npx tsx scripts/fix-category-compliance.ts
 * Wymaga: OPENAI_API_KEY
 */
import fs from "node:fs"
import path from "node:path"

const OUT_PATH = path.join(
  process.cwd(),
  "lib",
  "prompts",
  "generated-category-overrides.json"
)

const COMPLIANCE_KEYWORDS = [
  // Elektronika podłączona do internetu (Data Act)
  "smartfon",
  "telefon",
  "smartwatch",
  "tablet",
  "laptop",
  "router",
  "telewizor",
  "smart tv",
  "głośnik",
  "kamera ip",
  "monitoring",
  "inteligentny dom",
  "agd smart",
  // Napoje (kaucja)
  "napoje",
  "woda",
  "sok",
  "piwo",
  "cola",
  "energetyk",
  "napój",
  // Kosmetyki (INCI)
  "kosmetyki",
  "perfumy",
  "krem",
  "szampon",
  "balsam",
  "serum",
  "makijaż",
  "podkład",
  "pomadka",
  "tusz",
  // Suplementy (EFSA)
  "witaminy",
  "minerały",
  "probiotyki",
  "suplementy",
  "omega",
  // Elektronika ogólna (CE)
  "ładowarki",
  "słuchawki",
  "powerbank",
  "kabel",
  "adapter",
  // Zabawki (CE + EN71)
  "zabawki",
  "zabawka",
  "puzzle",
  "klocki",
  // AGD (etykieta energetyczna)
  "lodówka",
  "pralka",
  "zmywarka",
  "piekarnik",
  "kuchenka",
  "frytkownica",
  // Żywność
  "żywność",
  "spożywcze",
  "przekąski",
  "kawy",
  "herbaty",
  "produkty spożywcze",
  // Rośliny i środki ochrony
  "rośliny",
  "nasiona",
  "środki ochrony",
  "nawozy",
  // Leki i wyroby medyczne
  "leki",
  "apteka",
  "medyczne",
  "ciśnieniomierz",
  "glukometr",
]

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

function loadOverrides(): Record<string, string> {
  if (!fs.existsSync(OUT_PATH)) {
    throw new Error(`Brak pliku: ${OUT_PATH}`)
  }
  const raw = fs.readFileSync(OUT_PATH, "utf-8")
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === "string" && v.trim()) out[k] = v
  }
  return out
}

function saveResults(data: Record<string, string>): void {
  const dir = path.dirname(OUT_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2), "utf-8")
}

function pathMatchesCompliance(key: string): boolean {
  const lower = key.toLowerCase()
  return COMPLIANCE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
}

function leafNameFromPathLabel(pathLabel: string): string {
  const parts = pathLabel.split(" › ")
  return parts[parts.length - 1]!.trim() || pathLabel
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

async function main(): Promise<void> {
  let data = loadOverrides()
  const allKeys = Object.keys(data)
  const keysToFix = allKeys.filter(pathMatchesCompliance)
  const total = keysToFix.length

  if (total === 0) {
    console.log("Brak kluczy pasujących do COMPLIANCE_KEYWORDS — nic do zrobienia.")
    return
  }

  console.log(`Znaleziono ${total} kategorii do regeneracji (compliance).`)

  const batches = chunk(keysToFix, 10)
  let offset = 0

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (key, i) => {
        const num = offset + i + 1
        try {
          const leaf = leafNameFromPathLabel(key)
          const user = buildUserPrompt(key, leaf)
          const text = await callOpenAI(user)
          data[key] = text
          console.log(`[Fix ${num}/${total}] ${key} — zaktualizowano`)
        } catch (err) {
          console.error(
            `[Fix ${num}/${total}] ${key} — BŁĄD:`,
            err instanceof Error ? err.message : err
          )
        }
      })
    )
    offset += batch.length
    saveResults(data)
  }

  console.log(`Gotowe. Przetworzono do ${total} wpisów (batch zapis co 10).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
