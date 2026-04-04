// TUTAJ DODAWAJ NOWE SPECJALIZACJE KATEGORII
// Nie musisz znać ID — wystarczą słowa kluczowe ze ścieżki kategorii

let pregenerated: Record<string, string> = {}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pregenerated = require("./generated-category-overrides.json") as Record<string, string>
} catch {
  pregenerated = {}
}

const dynamicCache = new Map<string, string>()

const CATEGORY_DYNAMIC_SYSTEM_PROMPT =
  "Jesteś ekspertem e-commerce i copywritingu. Zwróć TYLKO blok instrukcji — bez wstępów, bez wyjaśnień, bez cudzysłowów."

function buildCategoryDynamicUserPrompt(pathLabel: string, leafName: string): string {
  const upper = leafName.toUpperCase()
  return `Stwórz zwięzły blok instrukcji dla AI generującego opisy produktów w kategorii: ${pathLabel}

Zwróć dokładnie w tym formacie:
SPECJALIZACJA — ${upper}:
Kluczowe parametry: [3-5 parametrów które zawsze muszą być w opisie tej kategorii]
Oś sprzedaży: [co kupujący ceni najbardziej — max 1 zdanie]
Unikaj: [1-2 błędy typowe dla tej kategorii]
SEO frazy: [5-7 fraz które kupujący wpisuje szukając tego produktu po polsku]`
}

async function callOpenAIForCategoryDynamic(userContent: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error("Brak OPENAI_API_KEY")
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
        { role: "system", content: CATEGORY_DYNAMIC_SYSTEM_PROMPT },
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

export type CategoryOverride = {
  categoryId: string
  /** Słowa kluczowe ze ścieżki kategorii (np. fragment nazwy liścia lub segmentu). */
  categoryNames: string[]
  /** Dodatkowe instrukcje doklejane do system promptu. */
  instructions: string
}

export const CATEGORY_OVERRIDES: CategoryOverride[] = [
  {
    categoryId: "powerbank",
    categoryNames: ["powerbank", "power bank"],
    instructions: `
     SPECJALIZACJA KATEGORII — POWERBANKI:
     Zawsze uwzględnij w opisie: pojemność (mAh), moc ładowania (W), 
     liczbę i typy portów, kompatybilność z urządzeniami, wagę i wymiary.
     Unikaj ogólników — kupujący porównują specyfikacje technicznie.
     Główna oś sprzedaży: ile naładowań telefonu + jak szybko.
   `,
  },
  {
    categoryId: "brama-garazowa",
    categoryNames: ["brama garażowa", "bramy garażowe", "napęd do bramy"],
    instructions: `
     SPECJALIZACJA KATEGORII — BRAMY GARAŻOWE:
     Zawsze uwzględnij: wymiary (szerokość x wysokość), materiał, 
     typ napędu (ręczny/automatyczny), kolor, gwarancję.
     Główna oś sprzedaży: bezpieczeństwo + łatwość obsługi + trwałość.
     Kupujący szuka długoterminowej inwestycji — podkreśl jakość wykonania.
   `,
  },
  {
    categoryId: "sluchawki",
    categoryNames: [
      "słuchawki",
      "słuchawka",
      "headphones",
      "douszne",
      "nauszne",
    ],
    instructions: `
     SPECJALIZACJA KATEGORII — SŁUCHAWKI:
     Zawsze uwzględnij: typ (douszne/nauszne/przewodowe/bezprzewodowe), 
     pasmo przenoszenia, impedancję, łączność (Bluetooth wersja/jack), 
     czas pracy na baterii, redukcję szumów (ANC tak/nie).
     Główna oś sprzedaży: jakość dźwięku + komfort długiego noszenia.
     Kupujący porównuje: czy ANC działa, ile godzin baterii, czy pasuje do ucha.
   `,
  },
  {
    categoryId: "felgi",
    categoryNames: ["felgi", "obręcze", "koła aluminiowe"],
    instructions: `
SPECJALIZACJA — FELGI I OBRĘCZE:
Kluczowe parametry: średnica (cale), szerokość z oznaczeniem J (np. 7,5J),
ET/offset, rozstaw śrub (np. 5x112), średnica centralna (np. 57,1mm).
Zawsze podaj liczbę sztuk w zestawie (2 szt. / 4 szt.).
Oś sprzedaży: kompatybilność z konkretnym autem — kupujący sprawdza
czy felga pasuje do jego samochodu.
Unikaj: pisania "komplet" bez podania ile sztuk,
pomijania średnicy centralnej (ET bez średnicy = ryzyko niezgodności).
SEO frazy: felgi aluminiowe, felgi 18 cali, felgi używane,
obręcze aluminiowe, felgi [marka], komplet felg.
   `,
  },
]

function segmentMatchesKeyword(segmentLower: string, keywordLower: string): boolean {
  if (!keywordLower) return false
  if (segmentLower.includes(keywordLower)) return true
  const words = keywordLower.split(/\s+/).filter((w) => w.length > 0)
  if (words.length <= 1) return false
  return words.every((w) => segmentLower.includes(w))
}

/**
 * Zwraca dodatkowe instrukcje system promptu, gdy ścieżka kategorii zawiera
 * którekolwiek słowo kluczowe z wpisu (case-insensitive, dopasowanie podciągu w segmencie).
 */
export function getCategoryOverride(categoryPath: string[]): string | null {
  if (!categoryPath?.length) return null
  const segments = categoryPath.map((s) => s.toLowerCase().trim()).filter(Boolean)

  for (const override of CATEGORY_OVERRIDES) {
    for (const name of override.categoryNames) {
      const kw = name.toLowerCase().trim()
      if (!kw) continue
      for (const seg of segments) {
        if (segmentMatchesKeyword(seg, kw)) {
          return override.instructions.trim()
        }
      }
    }
  }
  return null
}

/**
 * Priorytet: ręczne CATEGORY_OVERRIDES → cache w pamięci → pregenerated JSON → OpenAI (fallback).
 */
export async function getCategoryOverrideDynamic(categoryPath: string[]): Promise<string> {
  const cacheKey = categoryPath.join(" › ")

  const manual = getCategoryOverride(categoryPath)
  if (manual) return manual

  const cached = dynamicCache.get(cacheKey)
  if (cached !== undefined) return cached

  const pre = pregenerated[cacheKey]
  if (pre) {
    dynamicCache.set(cacheKey, pre)
    return pre
  }

  const leafName = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1]! : ""

  try {
    const user = buildCategoryDynamicUserPrompt(cacheKey, leafName)
    const text = await callOpenAIForCategoryDynamic(user)
    dynamicCache.set(cacheKey, text)
    return text
  } catch (err) {
    console.error("[getCategoryOverrideDynamic]", cacheKey, err)
    return ""
  }
}
