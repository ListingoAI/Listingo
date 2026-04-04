/**
 * Reguły emoji dla Allegro przy włączonej opcji „Emoji w listingu”.
 * Źródło: dobre praktyki pod wyszukiwarkę i czytelność oferty (tytuł bez emoji).
 */
export function buildAllegroListingEmojiUserBlock(): string {
  return `
ALLEGRO + EMOJI WŁĄCZONE (nadrzędne nad ogólnymi wskazówkami emoji dla innych platform):

1) Gdzie — tylko w sekcjach tekstowych opisu (pole longDescription jako HTML; opcjonalnie shortDescription jeśli to nadal tekst pomocniczy, NIE zamiast opisu):
   • Nagłówki sekcji (h2/h3): oddzielaj bloki (np. „O produkcie”, „Dostawa”, „Najważniejsze cechy”) — tu emoji może wzmocnić czytelność nagłówka.
   • Listy (ul/li): zamiast „pustej” kropki możesz dać jedno emoji na początku punktu, dopasowane do treści tego punktu (jedna ikona = jeden punkt).
   • CTA na końcu opisu: jedno sensowne emoji przy zachęcie do zakupu lub kontaktu, jeśli pasuje do treści.
   • NIGDY nie wstawiaj emoji w seoTitle (tytuł SEO / tytuł oferty w JSON): ryzyko słabszej trafności w wyszukiwarce Allegro lub błędnego wyświetlania (np. „kwadraciki”). seoTitle = wyłącznie zwykły tekst.

2) Ile — zasada „jedna ikona na akapit lub na punkt listy”:
   • Nie więcej niż ok. jedno emoji na akapit albo jedno na punkt listy; nie układaj wielu emoji obok siebie.
   • W typowym opisie ~1500 znaków nie przekraczaj ok. 10–15 emoji łącznie w longDescription (przy dłuższym tekście zachowaj proporcje, bez spamu).
   • Spójność wizualna: w całym opisie używaj maks. ok. 3–4 „rodzajów” ikon (np. ✅ + 🚚 + 🛡️ + 💬), nie mieszaj dziesiątek różnych symboli.

3) Jakie — dobór pod przekaz (tylko gdy pasuje do faktów z CECH):
   • Zalety / cechy: ✅, 🔹, ✔️, ✨
   • Wysyłka / czas: 🚚, 📦, ⏱️
   • Bezpieczeństwo / gwarancja: 🛡️, 🔒, ⭐
   • Prezent / okazja: 🎁, ❤️, 🌹
   • Kontakt / pytania: 📧, 📞, 💬

4) Obowiązek: przy włączonej opcji musisz umieścić co najmniej 1–3 emoji w longDescription (seoTitle bez zmian — bez emoji), tak aby oferta nie wyglądała na „zerową emoji” mimo włączenia opcji.
`
}
