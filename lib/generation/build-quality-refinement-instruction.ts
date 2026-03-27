import type { QualityTip } from "@/lib/types"
import { normalizeToneKey } from "@/lib/prompts/description-generator"
import {
  getLongDescriptionStructureInstruction,
  getPlatformBoostHints,
  getPlatformFieldMapHints,
  isLongDescriptionPlainText,
} from "@/lib/generation/platform-boost-hints"

export type RefinementOpts = {
  longMinWords: number
  longWordCount: number
  titleMaxChars?: number
  shortDescMax?: number
  metaDescMax?: number
  /** np. amazon — doprecyzowanie w instrukcji */
  platformSlug?: string
  /** Ten sam ton co pierwsza generacja (opcjonalnie) */
  tone?: string
}

/**
 * Instrukcja dla „Dopracuj do 100”:
 * - sprzedażowy boost (konwersja > SEO > długość),
 * - zero halucynacji,
 * - naprawy wg qualityTips bez psucia już dobrych elementów.
 */
export function buildQualityRefinementInstruction(
  tips: QualityTip[],
  opts: RefinementOpts
): string {
  const {
    longMinWords,
    longWordCount,
    titleMaxChars,
    shortDescMax,
    metaDescMax,
    platformSlug = "",
    tone,
  } = opts
  const wordsGap = Math.max(0, longMinWords - longWordCount)
  const nonSuccess = tips.filter((t) => t.type === "warning" || t.type === "error")
  const successes = tips.filter((t) => t.type === "success")
  const isPlainTextLong = isLongDescriptionPlainText(platformSlug)

  const lines: string[] = [
    "🔥 BOOST LISTING (TRYB DOPRACUJ DO 100)",
    "Priorytet: SPRZEDAŻ > SEO > długość tekstu.",
    "Zwróć pełny JSON od nowa (wszystkie pola), ale bez dodawania nowych faktów spoza NAZWY/CECH i poprzedniego JSON-a.",
    "Najpierw napraw ostrzeżenia/błędy; nie osłabiaj elementów już oznaczonych jako sukces.",
    ...(typeof tone === "string" && tone.trim()
      ? [
          `Zachowaj ten sam ton komunikacji: „${normalizeToneKey(tone)}” (spójnie we wszystkich polach).`,
        ]
      : []),
    "",
    "=== ZASADY KRYTYCZNE ===",
    "1) ZERO HALUCYNACJI: nie dopisuj parametrów, certyfikatów, liczb, zawartości zestawu ani obietnic, których nie ma w danych.",
    "2) Każdą cechę tłumacz na korzyść użytkownika (cecha -> efekt).",
    "3) Język: prosty, konkretny, dynamiczny, mobile-first.",
    "4) Zero pustych ogólników typu: „wysoka jakość”, „innowacyjny”, „najlepszy” bez dowodu.",
    "5) Usuń „AI vibe”: powtórzenia, lanie wody, sztuczne ozdobniki.",
    "6) Tekst ma być skanowalny w 3-5 sekund (krótkie akapity, listy, czytelne sekcje).",
    "",
    "=== ZASADY PLATFORMY (obowiązkowo) ===",
  ]

  if (typeof titleMaxChars === "number" && titleMaxChars > 0) {
    lines.push(`- seoTitle <= ${titleMaxChars} znaków.`)
  }
  if (typeof shortDescMax === "number" && shortDescMax > 0) {
    lines.push(`- shortDescription <= ${shortDescMax} znaków.`)
  }
  if (typeof metaDescMax === "number" && metaDescMax > 0) {
    lines.push(`- metaDescription <= ${metaDescMax} znaków.`)
  }
  lines.push(
    `- longDescription ma być ${isPlainTextLong ? "plain text (bez HTML)." : "HTML semantyczny (h2/p/ul/li)."}`
  )
  lines.push("", "=== BOOST DLA TEJ PLATFORMY (jak Allegro: sprzedaż + limity) ===")
  lines.push(...getPlatformBoostHints(platformSlug))
  lines.push("", ...getLongDescriptionStructureInstruction(platformSlug, isPlainTextLong))
  lines.push(
    "",
    "=== MAPA PÓL JSON ===",
    "- seoTitle: mocne frazy od początku, maksymalnie wykorzystaj limit znaków bez keyword-stuffingu.",
    "- shortDescription: dopasuj formę do kanału (Shopify = HOOK w skrócie; Amazon = bullets — patrz sekcje struktury i hint poniżej).",
    "- longDescription: zgodnie z sekcją struktury powyżej (dla Shopify — 6× h2 + kolejność jak w instrukcji).",
    "- tags: zróżnicowane frazy kluczowe (bez duplikatów i bez odmian tego samego słowa).",
    "- metaDescription: główna fraza + korzyść + CTA, w limicie znaków (jeśli limit > 0).",
    ...getPlatformFieldMapHints(platformSlug),
    "",
    "=== CO NAPRAWIĆ TERAZ (PRIORYTET) ==="
  )

  const seen = new Set<string>()

  if (wordsGap > 0) {
    seen.add("long_words")
    const plat =
      platformSlug === "amazon"
        ? " (Amazon: cel redakcyjny jakościowy, nie twardy wymóg platformy)."
        : platformSlug === "allegro" || platformSlug === "ebay" || platformSlug === "etsy"
          ? " (cel pod konwersję i czytelność)."
          : platformSlug === "shopify" || platformSlug === "shoper" || platformSlug === "woocommerce"
            ? " (cel pod SEO w Google i konwersję na karcie produktu)."
            : ""
    lines.push(
      `- longDescription: obecnie ~${longWordCount} słów, cel minimum ${longMinWords} słów${plat}. Dodaj co najmniej ${wordsGap} słów treści użytecznej (konkrety, zastosowania, korzyści), bez lania wody.`
    )
  }

  const tagPlatformHint = (() => {
    switch (platformSlug) {
      case "etsy":
        return "Dokładnie 13 tagów, każdy max 20 znaków — pokryj frazy z tytułu i synonimy."
      case "vinted":
        return "5–8 hashtagów z #, bez duplikatów między sobą."
      case "amazon":
        return "8–12 krótkich fraz pod wyszukiwanie; synonimy i long-tail, nie kopiuj 1:1 bulletów ani tytułu (backend ~249 B UTF-8)."
      case "shopify":
        return "10–15 krótkich fraz (2–4 słowa): mix głównych + long-tail; synonimy i zastosowania; nie duplikuj tytułu."
      default:
        return "Minimum 10–12 różnych, krótkich fraz (2–4 słowa), chyba że limit tagów w profilu jest niższy — wtedy wypełnij limit maksymalnie."
    }
  })()

  for (const t of nonSuccess) {
    const x = t.text.toLowerCase()

    if (/opis długi|ok\.\s*\d+\s*słów|min\.\s*\d+\s*słów|rozważ\s+(dopisanie|rozbudow)/i.test(x)) {
      if (seen.has("long_tip")) continue
      seen.add("long_tip")
      if (!seen.has("long_words")) {
        lines.push(`- longDescription: uwzględnij uwagę: „${t.text}”`)
      }
    }

    if (/wezwania|cta|działania/i.test(x) && !/zawiera\s+cta|zawiera\s+wezwanie/i.test(x)) {
      if (seen.has("cta")) continue
      seen.add("cta")
      lines.push(
        "- Dodaj wyraźne CTA (naturalne, krótkie, bez agresywnej sprzedaży), jeśli brakuje."
      )
    }

    if (
      /słów\s+kluczowych|wariant(ów|y)|synonim|tag(i|ów)?(\s|$)|tagi\s+seo|hashtag|keyword|search\s+terms|backend/i.test(
        x
      ) ||
      /tagi seo/i.test(x)
    ) {
      if (seen.has("tags")) continue
      seen.add("tags")
      lines.push(
        "- tags (OBOWIĄZKOWO — popraw to w tej iteracji):",
        `  • Zwróć w JSON NOWĄ, DŁUŻSZĄ tablicę "tags" niż w poprzednim wyniku: dodaj co najmniej 4–6 NOWYCH, niepowtarzalnych fraz względem poprzedniej listy (nie „podmień” jedną linię — realnie zwiększ pokrycie).`,
        `  • ${tagPlatformHint}`,
        `  • Każdy tag inny sensownie: synonim kategorii, zastosowanie, grupa docelowa, cecha z CECH (np. materiał, rozmiar), long-tail bez kopiowania całego tytułu ani tej samej frazy z bulletów.`,
        `  • Zakaz: 5 odmian tego samego słowa („koszulka koszulki koszulkami…”) — to nie są „warianty”.`,
        `  • W qualityTips: jeśli lista jest już pełna i zróżnicowana, oznacz sukces zamiast powtarzać ostrzeżenie.`
      )
    }

    if (/tytuł/i.test(x) && (/słowo kluczowe|seo|fraza|słab/i.test(x) || /tytuł.*\+/i.test(x))) {
      if (seen.has("title")) continue
      seen.add("title")
      lines.push(
        "- seoTitle: wzmocnij frazę na początku, wykorzystaj możliwie pełny limit znaków platformy."
      )
    }

    if (/meta\b|opis meta|meta description/i.test(x)) {
      if (seen.has("meta")) continue
      seen.add("meta")
      lines.push(`- metaDescription: CTA + główna fraza, w limicie znaków.`)
    }
  }

  if (nonSuccess.length > 0) {
    lines.push("")
    lines.push("Pełna lista ostrzeżeń/błędów (odnieś się do każdej sensownej linii):")
    for (const t of nonSuccess) {
      lines.push(`• [${t.type}] ${t.text}`)
    }
  }

  if (successes.length > 0) {
    lines.push("")
    lines.push("=== ZACHOWAJ (nie psuj — już sukces w ocenie) ===")
    lines.push(successes.map((s) => `✅ ${s.text}`).join("\n"))
  }

  lines.push("")
  lines.push("=== AUTOKONTROLA PRZED ODPOWIEDZIĄ ===")
  lines.push("- Czy każda sekcja zwiększa szansę zakupu?")
  lines.push("- Czy każda ważna cecha ma przełożenie na korzyść użytkownika?")
  lines.push("- Czy tekst jest skanowalny mobile-first i bez powtórzeń?")
  lines.push("- Czy nie dodano żadnych nowych faktów spoza danych?")
  lines.push("")
  lines.push(
    "Odpowiedz pełnym JSON; qualityScore i qualityTips zaktualizuj po poprawkach."
  )

  return lines.join("\n")
}
