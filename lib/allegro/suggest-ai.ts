import openai from "@/lib/openai"
import type { AllegroLeafCategory } from "./types"

const SYSTEM_LEAF = `Jesteś klasyfikatorem kategorii na polskim marketplace (Allegro).
- Rozumiesz sens produktu, nie tylko dosłowne słowa (np. „kubek porcelanowy z napisem” → naczynia/kuchnia, nie zabawki ani elektronika).
- Najpierw określ GŁÓWNY przedmiot sprzedaży (np. długopis, laptop, sukienka). Słowa typu „etui”, „pokrowiec”, „+ zestaw” przy produkcie piśmiennym/biurowym oznaczają opakowanie lub dodatek — NIE wybieraj kategorii etui na telefon w Elektronice, jeśli główny produkt to np. długopis (wtedy pasują artykuły biurowe/szkolne).
- Suwmiarka, mikrometr, multimetr, narzędzia pomiarowe / warsztatowe → Dom i ogród lub Firma i usługi (narzędzia, remont), NIGDY Elektronika › Telefony › Etui tylko dlatego, że przyrząd jest „cyfrowy” (to nie smartfon ani etui).
- Głośnik Bluetooth, soundbar, słuchawki → Elektronika › TV, audio i video (np. Głośniki i soundbary / Słuchawki), NIGDY Kultura i rozrywka › Filmy › DVD/Blu-ray — nawet jeśli w nazwie są słowa pokretyczne (np. „Sonic”, „Blast”).
- Z listy wybierasz dokładnie jedną kategorię końcową, która najlepiej pasuje do sprzedaży tego towaru.
- Odpowiadasz WYŁĄCZNIE jednym numerem (1–N), bez tekstu, bez uzasadnienia.`

const SYSTEM_MAIN = `Jesteś ekspertem od kategorii e-commerce na Allegro.
- Wybierasz jedną GŁÓWNĄ gałąź (np. Dom i ogród, Moda, Elektronika, Firma i usługi) według sensu produktu — najpierw typ głównego towaru, nie pojedynczego słowa z akcesoriów (np. długopis z etui → raczej Firma i usługi / artykuły piśmienne niż Elektronika przez słowo „etui”).
- Suwmiarka cyfrowa, narzędzia pomiarowe, elektronarzędzia warsztatowe → zwykle Dom i ogród (narzędzia i remont) lub Firma i usługi — nie wybieraj Elektroniki przez słowo „cyfrowa”, jeśli to nie elektronika użytkowa (telefony, audio, AGD itd.).
- Głośnik / audio przenośne → Elektronika (audio), nie filmy ani płyty DVD.
- Odpowiadasz WYŁĄCZNIE jednym numerem (1–N), bez tekstu.`

export type MainBranchOption = { id: string; name: string }

/**
 * Wybór głównej gałęzi drzewa (np. gdy heurystyka i wyszukiwanie słów nie dają kandydatów).
 */
export async function pickMainBranchAI(
  productName: string,
  features: string,
  roots: MainBranchOption[]
): Promise<string | null> {
  if (roots.length === 0) return null
  if (roots.length === 1) return roots[0].id

  const numbered = roots
    .map((r, i) => `${i + 1}. [${r.id}] ${r.name}`)
    .join("\n")

  const prompt = `Produkt: "${productName}"
Cechy: "${features}"

Która główna kategoria najlepiej pasuje do tego produktu? Odpowiedz TYLKO numerem (1-${roots.length}).

${numbered}`

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_MAIN },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 10,
    })

    const raw = res.choices[0]?.message?.content?.trim() ?? ""
    const num = parseInt(raw.replace(/\D/g, ""), 10)
    if (num >= 1 && num <= roots.length) {
      return roots[num - 1].id
    }
    return null
  } catch (err) {
    console.error("[suggest-ai] pickMainBranchAI:", err)
    return null
  }
}

/**
 * AI wybiera najlepszą kategorię z krótkiej listy kandydatów (liście Allegro).
 */
export async function pickBestCategoryAI(
  productName: string,
  features: string,
  candidates: AllegroLeafCategory[]
): Promise<AllegroLeafCategory | null> {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const numbered = candidates
    .map((c, i) => `${i + 1}. [${c.id}] ${c.pathLabel}`)
    .join("\n")

  const prompt = `Produkt: "${productName}"
Cechy: "${features}"

Która kategoria końcowa pasuje najlepiej do GŁÓWNEGO produktu (nie tylko do słowa z opakowania/dodatku)? Odpowiedz TYLKO numerem (1-${candidates.length}).

${numbered}`

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_LEAF },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 10,
    })

    const raw = res.choices[0]?.message?.content?.trim() ?? ""
    const num = parseInt(raw.replace(/\D/g, ""), 10)
    if (num >= 1 && num <= candidates.length) {
      return candidates[num - 1]
    }
    return candidates[0]
  } catch (err) {
    console.error("[suggest-ai] pickBestCategoryAI:", err)
    return candidates[0]
  }
}
