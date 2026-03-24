import {
  getPlatformProfile,
  type PlatformProfile,
} from "@/lib/platforms"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSystemPrompt(platform: string, tone: string): string {
  const profile = getPlatformProfile(platform)

  return `Jesteś OpisAI — najlepszym copywriterem e-commerce w Polsce.
Tworzysz opisy produktów, które SPRZEDAJĄ.

TWOJE ZASADY:
1. ZAWSZE pisz po polsku (poprawna gramatyka, polskie znaki: ą, ę, ś, ć, ż, ź, ó, ł, ń)
2. Każdy opis jest UNIKALNY
3. Używaj języka KORZYŚCI, nie cech:
   ❌ "Ma gramaturę 200g/m²"
   ✅ "Przyjemna gramatura 200g/m² zapewnia komfort przez cały dzień"
4. Wplataj słowa kluczowe NATURALNIE (nie keyword stuffing)
5. Stosuj techniki copywriterskie: social proof, storytelling, CTA
6. Opis długi: formatuj w ${profile.descriptionFormat === "html" ? "HTML (h2, h3, p, ul, li, strong, em)" : "czystym tekście (plain text, bez HTML)"}

PLATFORMA: ${profile.name.toUpperCase()}
${buildPlatformBlock(profile)}

TON: ${tone}
${getToneRules(tone)}

${buildQualityScoring(profile)}

Odpowiedz WYŁĄCZNIE czystym JSON (bez markdown, bez code blocks):
{
  "seoTitle": "tytuł max ${profile.titleMaxChars} znaków",
  "shortDescription": "2-3 zdania sprzedażowe (max ${profile.charLimits.shortDesc || 250} znaków)",
  "longDescription": "rozbudowany ${profile.descriptionFormat === "html" ? "HTML" : "tekst"} opis min ${profile.charLimits.longDescMinWords} słów${profile.descriptionFormat === "html" ? " z h2, h3, p, ul, li, strong" : ""}",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "metaDescription": "meta opis max ${profile.charLimits.metaDesc || 160} znaków",
  "qualityScore": 87,
  "qualityTips": [
    {"type": "success", "text": "Tytuł zawiera główne słowo kluczowe", "points": 15},
    {"type": "success", "text": "Opis używa języka korzyści", "points": 15},
    {"type": "warning", "text": "Dodaj więcej wariantów słów kluczowych", "points": 8},
    {"type": "error", "text": "Brak wezwania do działania w opisie krótkim", "points": 5}
  ]
}`
}

/** Kontekst platformowy do wstrzyknięcia w social-media / price-advisor. */
export function getPlatformContext(platform: string): string {
  const p = getPlatformProfile(platform)
  return `Platforma sprzedaży: ${p.name} (${p.slug}).
Tytuł: max ${p.titleMaxChars} zn. Format opisu: ${p.descriptionFormat}.
Uwagi SEO: ${p.seoNotes}`
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function buildPlatformBlock(p: PlatformProfile): string {
  const lines: string[] = []

  lines.push(`ZASADY ${p.name.toUpperCase()}:`)
  lines.push(`- Tytuł: max ${p.titleMaxChars} znaków`)
  lines.push(`- Wzór tytułu: ${p.titlePattern}`)
  lines.push(
    `- Format opisu: ${p.descriptionFormat === "html" ? "HTML (h2, ul, strong, tabele)" : "plain text (bez HTML)"}`
  )

  if (p.requiredSections.length > 0) {
    lines.push(`- Wymagane sekcje:`)
    for (const s of p.requiredSections) {
      lines.push(`  • ${s}`)
    }
  }

  if (p.forbiddenPatterns.length > 0) {
    lines.push(`- ZAKAZANE:`)
    for (const f of p.forbiddenPatterns) {
      lines.push(`  ✗ ${f}`)
    }
  }

  lines.push("")
  lines.push("BEST PRACTICES:")
  lines.push(p.bestPractices)

  lines.push("")
  lines.push(`SEO: ${p.seoNotes}`)

  lines.push("")
  lines.push(`Przykładowy tytuł: „${p.exampleTitle}"`)

  return lines.join("\n")
}

function buildQualityScoring(p: PlatformProfile): string {
  return `QUALITY SCORING — oceń swój opis (platforma: ${p.name}):
- Tytuł SEO: ${p.titleMaxChars > 80 ? "80-200" : "40-" + p.titleMaxChars} znaków, zawiera główne keyword (+15 pkt)
- Tytuł MUSI mieścić się w limicie ${p.titleMaxChars} znaków — przekroczenie = -10 pkt
- Opis krótki: 2-3 zdania, hook + korzyść + CTA (+10 pkt)
- Opis długi: min ${p.charLimits.longDescMinWords} słów, ${p.descriptionFormat === "html" ? "HTML, min 2x h2, min 1x ul" : "czytelne akapity"} (+25 pkt)
- Tagi: 8-12 tagów, mix ogólnych i long-tail (+15 pkt)
- Meta: max ${p.charLimits.metaDesc || 160} znaków, keyword + CTA (+10 pkt)
- Język korzyści zamiast cech (+15 pkt)
- Brak błędów językowych (+10 pkt)
- Zgodność z regułami platformy ${p.name} (+bonus do 5 pkt)`
}

function getToneRules(tone: string): string {
  switch (tone) {
    case "profesjonalny":
      return "TON: Rzeczowy, ekspercki. Buduj zaufanie danymi i faktami. Unikaj kolokwializmów."
    case "przyjazny":
      return "TON: Konwersacyjny, ciepły. Pisz jak do znajomego. Używaj pytań retorycznych. Emoji OK."
    case "luksusowy":
      return "TON: Elegancki, premium. Podkreślaj ekskluzywność i jakość. Słowa: wyjątkowy, ekskluzywny, premium."
    case "mlodziezowy":
      return "TON: Dynamiczny, energiczny. Krótkie zdania. Slang OK ale z umiarem. Emoji i emotikony mile widziane."
    case "techniczny":
      return "TON: Precyzyjny, szczegółowy. Podawaj dokładne parametry. Specyfikacje techniczne. Porównania z konkurencją."
    default:
      return "TON: Profesjonalny i przystępny."
  }
}
