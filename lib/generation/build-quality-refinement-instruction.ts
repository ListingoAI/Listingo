import type { QualityTip } from "@/lib/types"
import { normalizeToneKey } from "@/lib/prompts/description-generator"

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
 * Instrukcja dla drugiej generacji — konkretne naprawy wg luk (ostrzeżenia/błędy),
 * bez psucia pól już oznaczonych jako sukces.
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

  const lines: string[] = [
    "TRYB POPRAWY: zwróć pełny JSON od nowa (wszystkie pola). Baza: CECHY + NAZWA — nie wymyślaj nowych faktów.",
    "Najpierw usuń problemy z ostrzeżeń i błędów; nie osłabiaj treści, które w ocenie są już oznaczone jako ✅ sukces.",
    ...(typeof tone === "string" && tone.trim()
      ? [
          `Zachowaj ten sam ton opisu co pierwsza generacja: „${normalizeToneKey(tone)}” (spójnie we wszystkich polach).`,
        ]
      : []),
    "",
    "=== CO NAPRAWIĆ (priorytet) ===",
  ]

  const nonSuccess = tips.filter((t) => t.type === "warning" || t.type === "error")
  const successes = tips.filter((t) => t.type === "success")

  const seen = new Set<string>()
  const isPlainTextLong =
    platformSlug === "vinted" || platformSlug === "ogolny_plain"

  lines.push(
    "- ZASADY PLATFORMY (obowiązkowo):"
  )
  if (typeof titleMaxChars === "number" && titleMaxChars > 0) {
    lines.push(`  • seoTitle <= ${titleMaxChars} znaków.`)
  }
  if (typeof shortDescMax === "number" && shortDescMax > 0) {
    lines.push(`  • shortDescription <= ${shortDescMax} znaków.`)
  }
  if (typeof metaDescMax === "number" && metaDescMax > 0) {
    lines.push(`  • metaDescription <= ${metaDescMax} znaków.`)
  }
  lines.push(
    `  • longDescription ma być ${isPlainTextLong ? "plain text (bez HTML)." : "HTML semantyczny (h2/p/ul/li)."}`
  )
  if (platformSlug === "allegro") {
    lines.push("  • Allegro: opis ma wspierać konwersję i SEO; bez linków zewnętrznych i bez fikcyjnych obietnic.")
  }
  if (platformSlug === "amazon") {
    lines.push("  • Amazon: unikaj marketingowego lania wody i powtórzeń; stawiaj na konkret i zgodność z danymi.")
  }
  if (platformSlug === "etsy") {
    lines.push("  • Etsy: styl listingu handmade/vintage/supplies, bez ogólników niepopartych cechami.")
  }
  if (platformSlug === "vinted") {
    lines.push("  • Vinted: ton prosty i uczciwy, bez przesadnych claimów sprzedażowych.")
  }
  lines.push("")

  // 1) Twarde kryterium: liczba słów w opisie długim (nie tylko regex po tekście tipa)
  if (wordsGap > 0) {
    seen.add("long_words")
    const plat =
      platformSlug === "amazon"
        ? " (Amazon: cel redakcyjny pod jakość i Google — technicznie nie wymaga 200 słów, ale tu MUSISZ dobić objętość)."
        : platformSlug === "allegro"
          ? " (cel pod Google / konwersję)."
          : ""
    lines.push(
      `- longDescription (HTML): obecnie ~${longWordCount} słów, wymagane MINIMUM ${longMinWords} słów${plat} DODAJ co najmniej ${wordsGap} słów: nowe akapity lub sekcje h2 (np. „Dla kogo?”, „Zastosowanie”, scenariusze prezentowe/biurowe) — tylko sensowne ogólniki zgodne z cechami, bez „lania wody” i bez fikcyjnych liczb.`
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
        lines.push(
          `- longDescription: rozbuduj zgodnie z uwagą: „${t.text}”`
        )
      }
    }

    if (/wezwania|cta|działania/i.test(x) && !/zawiera\s+cta|zawiera\s+wezwanie/i.test(x)) {
      if (seen.has("cta")) continue
      seen.add("cta")
      lines.push(
        `- shortDescription: dodaj wyraźne CTA (np. Zamów teraz, Dodaj do koszyka, Kup teraz) jeśli jeszcze go brak.`
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
        `- tags (OBOWIĄZKOWO — to ostrzeżenie musi zniknąć po tej generacji):`,
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
        `- seoTitle: wzmocnij frazę na początku, w limicie znaków platformy.`
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
    lines.push("Pełna lista ostrzeżeń/błędów (dopasuj odpowiedź JSON do każdej linii, która nadal ma sens):")
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
  lines.push(
    "Odpowiedz pełnym JSON; qualityScore i qualityTips zaktualizuj po poprawkach."
  )

  return lines.join("\n")
}
