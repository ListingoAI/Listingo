/**
 * Lekka naprawa typowych błędów HTML w opisach marketplace (generator + przycinanie).
 * Nie zastępuje pełnego parsera DOM — obsługuje najczęstsze tagi z listingu (Allegro itd.).
 */

const VOID_HTML = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
])

const INLINE_BALANCE = new Set(["strong", "em", "b", "i", "u", "span", "a"])

/**
 * Domyka na końcu fragmentu tagi inline (strong/em/b/i/…), które model zostawił otwarte
 * przed </li> lub </p> — np. <li>…<strong>Bluetooth 5. </li> → wstawia </strong>.
 */
function balanceInlineStackInSegment(segment: string): string {
  const re = /<(\/?)(strong|em|b|i|u|span|a)\b[^>]*>/gi
  const stack: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(segment))) {
    const isClose = m[1] === "/"
    const name = m[2].toLowerCase()
    if (!INLINE_BALANCE.has(name)) continue
    if (isClose) {
      const idx = stack.lastIndexOf(name)
      if (idx !== -1) stack.splice(idx, 1)
    } else {
      stack.push(name)
    }
  }
  if (stack.length === 0) return segment
  let suffix = ""
  while (stack.length) {
    suffix += `</${stack.pop()!}>`
  }
  return segment + suffix
}

function repairBlockWrappers(
  html: string,
  tag: "li" | "p"
): string {
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "gi")
  return html.replace(re, (full, attrs: string, inner: string) => {
    const fixed = balanceInlineStackInSegment(inner)
    if (fixed === inner) return full
    return `<${tag}${attrs}>${fixed}</${tag}>`
  })
}

/**
 * Po ucięciu HTML w losowym miejscu (np. deduplikacja „podwójnego” opisu) dokłada
 * brakujące zamknięcia na końcu — żeby nie zostawiać urwanych <strong>, <ul> itd.
 */
function repairUnclosedTagsAtEnd(html: string): string {
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)\b[^>]*>/g
  const stack: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const raw = m[0]
    const name = m[2].toLowerCase()
    if (VOID_HTML.has(name)) continue
    const isSelfClosing = /\/\s*>$/.test(raw.trim())
    const isClose = m[1] === "/"
    if (isSelfClosing) continue
    if (isClose) {
      const idx = stack.lastIndexOf(name)
      if (idx !== -1) stack.splice(idx, 1)
    } else {
      stack.push(name)
    }
  }
  if (stack.length === 0) return html
  let suffix = ""
  while (stack.length) {
    suffix += `</${stack.pop()!}>`
  }
  return html + suffix
}

/** Usuwa podwójne </li> z rzędu (typowy błąd modelu). */
function stripDuplicateClosingLi(html: string): string {
  let out = html
  let prev = ""
  while (out !== prev) {
    prev = out
    out = out.replace(/<\/li>\s*<\/li>/gi, "</li>")
  }
  return out
}

/** Usuwa samotne </p> tuż po </h2> (bez treści). */
function stripOrphanClosingPAfterH2(html: string): string {
  return html.replace(/<\/h2>\s*<\/p>/gi, "</h2>")
}

/**
 * Gdy po </h2> jest zwykły tekst kończący się </p> bez otwarcia <p> — owija treść w <p>.
 * Nie dotyka fragmentów, gdzie między h2 a </p> jest już lista/nagłówek (uniknięcie złego zasięgu).
 */
function wrapBareParagraphAfterH2(html: string): string {
  return html.replace(/(<\/h2>)\s*\n\s*([\s\S]*?)<\/p>/gi, (full, h2close, inner) => {
    const t = inner.trim()
    if (!t) return full
    if (t.startsWith("<")) return full
    if (/<\s*(?:ul|ol|h[1-6]|li|div|table)\b/i.test(inner)) return full
    return `${h2close}\n<p>${inner.trim()}</p>`
  })
}

/**
 * Naprawa opisu HTML przed pokazaniem / zapisem: typowe błędy list/akapitów,
 * domknięcia inline w <li>/<p>, ucięcia deduplikacji.
 */
export function repairListingHtmlDescription(html: string): string {
  if (!html || !/<[a-z]/i.test(html)) return html
  let out = html
  out = stripDuplicateClosingLi(out)
  out = stripOrphanClosingPAfterH2(out)
  out = wrapBareParagraphAfterH2(out)
  out = repairBlockWrappers(out, "li")
  out = repairBlockWrappers(out, "p")
  out = repairUnclosedTagsAtEnd(out)
  return out
}
