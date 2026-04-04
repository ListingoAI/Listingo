import type { QualityTip } from "@/lib/types"
import { normalizeToneKey, shouldUseSensoryEmotionCopy } from "@/lib/prompts/description-generator"
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
  platformSlug?: string
  tone?: string
  listingEmojis?: boolean
  listingIntent?: string
  brandVoice?: { tone?: string; style?: string }
  productName?: string
  category?: string
  features?: string
}

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
    listingEmojis,
    listingIntent,
    brandVoice,
    productName = "",
    category = "",
    features = "",
  } = opts

  const wordsGap = Math.max(0, longMinWords - longWordCount)
  const nonSuccess = tips.filter((t) => t.type === "warning" || t.type === "error")
  const successes = tips.filter((t) => t.type === "success")
  const isPlainTextLong = isLongDescriptionPlainText(platformSlug)
  const toneKey = typeof tone === "string" && tone.trim() ? normalizeToneKey(tone) : "profesjonalny"

  const useSensory = shouldUseSensoryEmotionCopy(category, productName, features)

  const lines: string[] = [
    "TRYB: AI UPGRADE — WZMOCNIJ I ULEPSZ (nie przepisuj od zera, nie wycinaj treści sprzedażowych)",
    "Kontekst: masz w wiadomości użytkownika blok 'POPRZEDNI WYNIK DO ULEPSZENIA' — pełny JSON z pierwszej generacji.",
    "Twoje zadanie: ULEPSZYĆ jakość sprzedażową, strukturę i SEO — nie przepisywać listing od podstaw.",
    "Źródło prawdy: NAZWA / CECHY / PARAMETRY / ANALIZA ZE ZDJĘCIA z wiadomości użytkownika. Nie wymyślaj faktów spoza nich.",
    "Priorytet: SPRZEDAŻ > SEO > długość tekstu.",
    "Zwróć pełny JSON (wszystkie pola). Popraw FORMĘ i SIŁĘ przekazu — NIE wycinaj selling pointów.",
    "",
    "=== ZASADA NADRZĘDNA: ZACHOWAJ SELLING POINTY ===",
    "Każda korzyść z poprzedniej wersji, która jest poparta faktami z NAZWY/CECH — ZOSTAJE w listingu.",
    "Twoja rola: poprawić FORMĘ, KOLEJNOŚĆ i SIŁĘ tych korzyści — NIE decydować, które usunąć.",
    "Jedyne co wolno usunąć: ogólniki bez konkretu, oczywistości bez powodu z cech, puste wypełniacze.",
    "NIE USUWAJ selling pointu tylko dlatego, że 'jedna oś jest mocniejsza' — kupujący na listingach widzi LISTĘ powodów zakupu, nie esej o jednej cesze.",
    "Jeśli poprzednia wersja miała 5 bullets z danych — poprawiona wersja też ma ich 5 (lub więcej), nie 2.",
    "",
    "=== BUYER INTENT (OBOWIĄZKOWE — zanim poprawisz cokolwiek) ===",
    "Wypełnij pole _buyerIntent w JSON (1-2 zdania):",
    "a) KTO kupuje ten produkt? b) DLACZEGO szuka? c) CO go przekona do kliknięcia 'kup teraz'? d) CZEGO się boi?",
    "Te 4 odpowiedzi KIERUJĄ: kolejnością korzyści, hookiem, CTA i redukcją wątpliwości.",
    "",
    "=== OŚ SPRZEDAŻY (hierarchia narracji, nie selekcja korzyści) ===",
    "Ustal JEDNĄ główną oś: największy problem, który produkt rozwiązuje, lub najważniejszy efekt dla kupującego.",
    "Ta oś PROWADZI: hook (pierwsze zdanie), pierwsze 1–2 bullets, zdanie redukujące wątpliwość kupującego, CTA.",
    "'Jedna oś' = HIERARCHIA narracji — NIE wycinanie pozostałych korzyści z danych.",
    "Jeśli produkt ma 4 realne selling pointy z CECH (np. GPS + NFC + bateria 14 dni + zestaw) — listing ma 4 bullets, nie 1.",
    "Każdy bullet: fakt z danych → efekt końcowy dla kupującego (co mu to da, co się poprawi).",
    "",
    "=== EFEKT KOŃCOWY (obowiązkowo przy każdej korzyści) ===",
    "Każdą cechę przetłumacz na efekt dla kupującego: co się poprawi / co będzie łatwiejsze / jaki konkretny rezultat osiągnie.",
    "NIE PISZ: samej funkcji lub przymiotnika bez domknięcia (np. samo 'dokładniejsze czyszczenie').",
    "PISZ: efekt dnia codziennego z danych (np. 'czystsze zęby i świeży oddech każdego dnia').",
    "",
    "=== HOOK — NATURALNOŚĆ (ANTY-AI STYLE) ===",
    "Pierwszy akapit ma brzmieć jak język doświadczonego sprzedawcy, nie generyczny szablon AI.",
    "ZAKAZ otwierania kalkami: 'produkt, który zachwyca', 'idealny wybór dla każdego', 'to propozycja dla osób, które…' — bez konkretu z danych.",
    "Hook = konkretny rzeczownik produktu + realny efekt/zastosowanie dla kupującego (z danych).",
    "Jeśli poprzedni hook był dobry (konkretny, sprzedażowy) — zachowaj go lub wzmocnij; nie zastępuj generycznym.",
    "Jeśli był pusty/ogólnikowy — zastąp konkretem z CECH.",
    "",
    "=== ANTY-DUBLOWANIE (tylko prawdziwe duplikaty) ===",
    "Scal TYLKO gdy dwa punkty mówią DOKŁADNIE to samo I mają ten sam efekt dla kupującego.",
    "NIE SCALAJ: 'GPS do nawigacji i treningu' z 'NFC do płatności zegarkiem' — to różne wartości.",
    "NIE SCALAJ: 'bateria 14 dni' z 'GPS 46h aktywności' — oba są konkretami, oba zostają.",
    "Jeśli oba punkty wnoszą inną wartość decyzyjną dla kupującego — ZOSTAJĄ jako osobne bullets.",
    "",
    "=== DOWÓD > HYPE (nie usuwaj korzyści z danych) ===",
    "Ta zasada dotyczy NOWYCH/WYMYŚLONYCH twierdzeń bez pokrycia w CECHACH — nie usuwania istniejących korzyści.",
    "Obniż ton TYLKO gdy konkretna obietnica nie ma dowodu w danych — nie gdy brzmi 'entuzjastycznie'.",
    "Mocna obietnica + konkret z CECH = zostaje i możesz ją wzmocnić.",
    "Usuń: 'wysoka jakość', 'innowacyjny', 'najlepszy', 'rewolucyjny' — jeśli nie mają dowodu z CECH.",
    "",
    "=== DECYZJA ZAKUPOWA (gdzie ma sens — z danych) ===",
    "- DLACZEGO TERAZ? — realna korzyść z cech, sens zakupu 'na dziś' (nie countdown ani fałszywa presja).",
    "- CO SIĘ ZMIENI? — co będzie inne po użyciu produktu (konkret z danych).",
    "- ZASTĘPSTWO (jeśli wynika z kategorii): uczciwe 'upgrade vs prostsze rozwiązanie' — bez deprecjonowania konkurencji po nazwie.",
    "",
    "=== REDUKCJA OPORU KUPUJĄCEGO ===",
    "Jedna naturalna wątpliwość (dopasowanie, wygoda, praktyczność) + odpowiedź z faktów.",
    "Nie wymyślaj gwarancji, certyfikatów ani opinii spoza danych.",
    "",
    "=== ANTY-DOPISKI ŹRÓDŁA (zawsze usuwaj) ===",
    "- Usuń: (informacja od sprzedawcy), (według sprzedawcy), (ze zdjęcia produktu), (z analizy obrazu), (z etykiety) itp.",
    "- Zamiast tego podaj fakt wprost: 'Materiał: tworzywo ABS', 'Montaż: taśma samoprzylepna'.",
    "",
    "=== FILTR ZDAŃ (usuń TYLKO filler, nigdy selling pointy z danych) ===",
    "Usuń zdanie WYŁĄCZNIE gdy: (a) pasuje do KAŻDEGO produktu w kategorii ORAZ (b) nie zawiera konkretu z danych.",
    "'Idealny do codziennego użytkowania' bez konkretu → usuń.",
    "'Idealny do codziennego użytkowania dzięki baterii 14 dni i lekkości 43g' → ZOSTAW (jest konkret).",
    "'Łatwy w obsłudze' bez powodu z cech → usuń; 'Łatwy w obsłudze — jeden przycisk, ekran dotykowy' → ZOSTAW.",
    "Jeśli zdanie zawiera fakt z CECH — ZOSTAJE, nawet jeśli brzmi marketingowo.",
  ]

  lines.push("", "=== TON ===")
  lines.push(`- Ton komunikacji: "${toneKey}" — zachowaj spójnie we wszystkich polach JSON.`)

  if (toneKey === "przyjazny" || toneKey === "mlodziezowy") {
    lines.push("- Ton dopuszcza ciepłe, konwersacyjne frazy i krótkie pytania retoryczne — zachowaj ten styl.")
  } else if (toneKey === "luksusowy") {
    lines.push("- Ton premium: podkreślaj ekskluzywność i jakość; bez tanich sloganów.")
  } else if (toneKey === "techniczny") {
    lines.push("- Ton precyzyjny: konkretne parametry i specyfikacje; porównania z konkurencją tylko ogólnie.")
  } else if (toneKey === "sprzedazowy") {
    lines.push("- Ton perswazyjny z wyraźnym CTA i uczciwe FOMO — bez fałszywych promocji i liczb.")
  } else if (toneKey === "narracyjny") {
    lines.push("- Ton fabularny: krótkie scenariusze 'dla kogo / kiedy' z cech — bez fikcyjnych historii marki ani opinii.")
  } else if (toneKey === "zwiezly") {
    lines.push("- Ton zwięzły: krótkie zdania, mało przymiotników, zero powtórzeń; merytoryczne sekcje, nie woda.")
  }

  lines.push("", "=== EMOJI ===")
  if (listingEmojis === false) {
    lines.push("NADRZĘDNE: Użytkownik wyłączył emoji — zero emoji i emotikonów Unicode w ŻADNYM polu JSON (seoTitle, shortDescription, longDescription, metaDescription, tags). Nawet jeśli ton normalnie dopuszcza emoji.")
  } else if (platformSlug === "allegro") {
    lines.push("Allegro + emoji włączone: seoTitle NIGDY z emoji; emoji tylko w treści HTML (longDescription) wg schematu Allegro (nagłówki h2, listy, CTA, limit ~10-15 ikon, max 3-4 typy).")
  } else if (listingEmojis === true) {
    lines.push(`Emoji włączone: w całym JSON łącznie min. 1, typowo 2-3, max ~5 emoji (dopasuj do tonu "${toneKey}"; przy profesjonalnym/technicznym: bez emoji w seoTitle, ale min. jedno w longDescription). Nie pomijaj ich całkowicie.`)
  } else {
    lines.push("Emoji: zachowaj politykę z pierwszej generacji (nie dodawaj, jeśli nie było; nie usuwaj, jeśli były).")
  }

  if (listingIntent && listingIntent.trim()) {
    lines.push("", "=== KIERUNEK SPRZEDAŻOWY (od użytkownika) ===")
    lines.push(`Użytkownik podał kierunek: "${listingIntent.trim()}"`)
    lines.push("Uwzględnij go w hooku i głównej osi sprzedaży — o ile wynika z faktów w CECHACH (nie dopisuj spoza danych).")
  }

  if (brandVoice && (brandVoice.tone || brandVoice.style)) {
    lines.push("", "=== BRAND VOICE (głos marki) ===")
    if (brandVoice.tone) lines.push(`Ton marki (z profilu): ${brandVoice.tone}`)
    if (brandVoice.style) lines.push(`Styl marki (z profilu): ${brandVoice.style}`)
    lines.push("Zachowaj charakter marki spójnie we wszystkich polach — podporządkuj mu słownictwo, długość zdań i stopień formalności.")
  }

  if (useSensory) {
    lines.push("", "=== SPECJALIZACJA — PERFUMY / KOSMETYKI / MODA ===")
    lines.push("- Skupiaj się na emocji i odczuciu użytkownika — tylko z danych.")
    lines.push("- Język sensoryczny (ciepły, intensywny, lekki, otulający, świeży) — w granicach faktów z NAZWY i CECH.")
    lines.push("- Kiedy i dla kogo: kontekst noszenia / rytuał / sytuacja użycia — uczciwie z wejścia.")
    lines.push("- NIE skupiaj się na designie opakowania bardziej niż na doświadczeniu użytkowania.")
    lines.push("- Każda cecha → odczucie (zmysły, komfort, pewność siebie) zamiast suchej etykiety.")
    if (/perfum|zapach|nuta|nuty|eau de|edt|edp|woda (perfumowana|toaletowa)/i.test(`${productName} ${category} ${features}`)) {
      lines.push("- Każda nuta zapachowa: (1) jak się poczujesz nosząc; (2) jak odbierają Cię inni — zakaz suchych etykiet bez domknięcia. Dodaj kontekst (dzień / wieczór / randka / praca).")
    }
  }

  lines.push("", "=== ZASADY PLATFORMY (obowiązkowo) ===")

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
  if (platformSlug === "allegro" && !isPlainTextLong) {
    lines.push(
      "",
      "=== ALLEGRO — HTML W longDescription (refine; nadrzędne przy edycji) ===",
      "- Listy: jeden punkt = jedna para <li>…</li> — bez podwójnego </li> i bez samotnego </li> między punktami; liczba <li> = liczba </li>.",
      "- Akapity: każde </p> ma pasujące <p> — bez tekstu po </h2> kończącego się </p> bez otwarcia <p>; bez samotnego </p> zaraz po </h2>.",
      "- Po nagłówku h2: <p>…</p> albo <ul>…</ul>, nigdy sam </p>.",
      "- Inline (<strong>, <em>, …): zamknij przed </li> lub </p>.",
      "- Samokontrola przed JSON: brak wzorca </li></li> oraz brak </h2></p> bez treści między znacznikami.",
    )
  }
  lines.push("", "=== BOOST DLA TEJ PLATFORMY ===")
  lines.push(...getPlatformBoostHints(platformSlug))
  lines.push("", ...getLongDescriptionStructureInstruction(platformSlug, isPlainTextLong))
  lines.push(
    "",
    "=== MAPA PÓL JSON ===",
    "- seoTitle: mocne frazy od początku, maksymalnie wykorzystaj limit znaków bez keyword-stuffingu.",
    "- shortDescription: pierwsze zdanie = powód zakupu z perspektywy kupującego (nie lista cech z przecinkami); dopasuj formę do kanału.",
    "- longDescription: hook w <p> (1-2 zdania: korzyść/efekt) PRZED pierwszym <h2>; potem bullets z efektem końcowym.",
    "- tags: zróżnicowane frazy kluczowe (bez duplikatów i bez odmian tego samego słowa).",
    "- metaDescription: główna fraza + korzyść + CTA, w limicie znaków.",
    ...getPlatformFieldMapHints(platformSlug),
  )

  lines.push("", "=== CO POPRAWIĆ TERAZ (PRIORYTET) ===")
  lines.push(
    "1. Sprawdź hook — czy buduje pożądanie i nie brzmi jak generyczny szablon AI? Jeśli tak, wzmocnij konkretem z danych.",
    "2. Sprawdź shortDescription — czy pierwsze zdanie to powód zakupu (nie lista cech z przecinkami)?",
    "3. Sprawdź bullets — czy każdy bullet ma: fakt z danych → efekt końcowy dla kupującego?",
    "4. Popraw formę i kolejność — najpierw najmocniejszy argument sprzedażowy, na końcu CTA.",
    "5. NIE usuwaj selling pointów — poprawiaj jak brzmią, nie czy są.",
  )

  const seen = new Set<string>()

  if (wordsGap > 0) {
    seen.add("long_words")
    const plat =
      platformSlug === "amazon"
        ? " (Amazon: cel redakcyjny jakościowy, nie twardy wymóg platformy)."
        : platformSlug === "allegro" || platformSlug === "ebay" || platformSlug === "etsy"
          ? " (cel pod konwersję i czytelność)."
          : platformSlug === "shopify" || platformSlug === "woocommerce"
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
        return "5-8 hashtagów z #, bez duplikatów między sobą."
      case "amazon":
        return "8-12 krótkich fraz pod wyszukiwanie; synonimy i long-tail, nie kopiuj 1:1 bulletów ani tytułu (backend ~249 B UTF-8)."
      case "shopify":
        return "10-15 krótkich fraz (2-4 słowa): mix głównych + long-tail; synonimy i zastosowania; nie duplikuj tytułu."
      default:
        return "Minimum 10-12 różnych, krótkich fraz (2-4 słowa), chyba że limit tagów w profilu jest niższy — wtedy wypełnij limit maksymalnie."
    }
  })()

  for (const t of nonSuccess) {
    const x = t.text.toLowerCase()

    if (/opis długi|ok\.\s*\d+\s*słów|min\.\s*\d+\s*słów|rozważ\s+(dopisanie|rozbudow)/i.test(x)) {
      if (seen.has("long_tip")) continue
      seen.add("long_tip")
      if (!seen.has("long_words")) {
        lines.push(`- longDescription: uwzględnij uwagę: "${t.text}"`)
      }
    }

    if (/wezwania|cta|działania/i.test(x) && !/zawiera\s+cta|zawiera\s+wezwanie/i.test(x)) {
      if (seen.has("cta")) continue
      seen.add("cta")
      lines.push("- Dodaj wyraźne CTA (naturalne, krótkie, bez agresywnej sprzedaży), jeśli brakuje.")
    }

    if (
      /słów\s+kluczowych|wariant(ów|y)|synonim|tag(i|ów)?(\s|$)|tagi\s+seo|hashtag|keyword|search\s+terms|backend/i.test(x) ||
      /tagi seo/i.test(x)
    ) {
      if (seen.has("tags")) continue
      seen.add("tags")
      lines.push(
        "- tags (OBOWIĄZKOWO — popraw to w tej iteracji):",
        `  Zwróć w JSON NOWĄ, DŁUŻSZĄ tablicę "tags": dodaj co najmniej 4-6 NOWYCH, niepowtarzalnych fraz względem poprzedniej listy.`,
        `  ${tagPlatformHint}`,
        `  Każdy tag inny sensownie: synonim kategorii, zastosowanie, grupa docelowa, cecha z CECH (materiał, rozmiar), long-tail.`,
        `  Zakaz: 5 odmian tego samego słowa.`
      )
    }

    if (/tytuł/i.test(x) && (/słowo kluczowe|seo|fraza|słab/i.test(x) || /tytuł.*\+/i.test(x))) {
      if (seen.has("title")) continue
      seen.add("title")
      lines.push("- seoTitle: wzmocnij frazę intencji zakupowej na początku, wykorzystaj możliwie pełny limit znaków platformy.")
    }

    if (/meta\b|opis meta|meta description/i.test(x)) {
      if (seen.has("meta")) continue
      seen.add("meta")
      lines.push("- metaDescription: CTA + główna fraza, w limicie znaków.")
    }
  }

  if (nonSuccess.length > 0) {
    lines.push("")
    lines.push("Pełna lista ostrzeżeń/błędów (odnieś się do każdej sensownej linii):")
    for (const t of nonSuccess) {
      lines.push(`[${t.type}] ${t.text}`)
    }
  }

  if (successes.length > 0) {
    lines.push("")
    lines.push("=== ZACHOWAJ (nie psuj — już sukces w ocenie) ===")
    lines.push(successes.map((s) => `OK: ${s.text}`).join("\n"))
  }

  lines.push("")
  lines.push("=== SPRZEDAŻ > OPIS (przeczytaj przed pisaniem JSON) ===")
  lines.push("- seoTitle: TYLKO frazy intencji zakupowej (co kupujący wpisuje w wyszukiwarkę: marka, typ, kluczowa funkcja) — NIE surowe specs (piksele, mm, wymiary), których nikt nie szuka.")
  lines.push("- shortDescription: PIERWSZE ZDANIE = powód zakupu z perspektywy kupującego, NIE lista cech z przecinkami.")
  lines.push("- longDescription: HOOK w <p> (1-2 zdania: korzyść/efekt z danych) PRZED pierwszym <h2>.")
  lines.push("- FILTR (ostatnia kontrola): usuń tylko zdania pasujące do każdego produktu w kategorii BEZ konkretu z danych — ogólniki, oczywistości, wypełniacze. Zachowaj zdania sprzedażowe z faktami.")
  lines.push("")
  lines.push("=== WYOSTRZANIE SPRZEDAŻY (po naprawie warningów) ===")
  lines.push("- Czy zachowałem WSZYSTKIE selling pointy z danych — tylko forma ulepszona, nie treść wycięta?")
  lines.push("- Czy hook jest konkretny (fakt z danych + efekt), a nie generyczny szablon AI?")
  lines.push("- Czy pierwsze 2-3 korzyści są decyzyjnie najmocniejsze i każda wnosi inną wartość dla kupującego?")
  lines.push("- Czy każdy bullet: fakt z danych → efekt końcowy dla kupującego (nie sama sucha etykieta techniczna)?")
  lines.push("- Czy jest zdanie redukujące naturalny opór kupującego (uczciwie z danych)?")
  lines.push("- Czy CTA wynika z głównej korzyści i brzmi naturalnie?")
  lines.push("- Czy każda sekcja mobile-first: krótkie akapity, czytelne listy, zero powtórzeń?")
  lines.push("")
  lines.push("=== AUTOKONTROLA PRZED ODPOWIEDZIĄ ===")
  lines.push("- Czy zachowałem WSZYSTKIE selling pointy z poprzedniej wersji poparte danymi (nie scaliłem dwóch różnych korzyści w jedną)?")
  lines.push("- Każda sekcja zwiększa szanse zakupu?")
  lines.push("- Każda ważna cecha ma przełożenie na korzyść dla kupującego?")
  lines.push("- Zero nowych faktów spoza danych wejściowych?")
  lines.push("- Zero dopisków o źródle informacji (od sprzedawcy, z analizy itp.)?")
  lines.push("- Czy każde zdanie jest prawdziwe TYLKO dla tego produktu — nie dla każdego w kategorii? (jeśli pasuje do każdego smartwatcha bez konkretu → ogólnik → usuń)")
  lines.push("")
  lines.push("Odpowiedz pełnym JSON; qualityScore i qualityTips zaktualizuj po poprawkach.")

  return lines.join("\n")
}
