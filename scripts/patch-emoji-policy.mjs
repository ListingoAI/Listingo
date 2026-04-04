import { readFileSync, writeFileSync } from "fs"

const file = "lib/platforms/index.ts"
let c = readFileSync(file, "utf8")

const policies = {
  allegro: "restricted",
  amazon: "restricted",
  shopify: "allowed",
  woocommerce: "allowed",
  ebay: "allowed",
  etsy: "allowed",
  vinted: "discouraged",
  empikplace: "allowed",
  olx: "discouraged",
  ogolny: "allowed",
  ogolny_plain: "discouraged",
}

// Each platform const block ends with a lone closing brace on its own line followed by a blank line.
// We find each block by locating `  slug: "NAME"` (with 2-space indent) and scanning
// forward to the next occurrence of `\n}\n\n` which closes the object literal.
for (const [slug, policy] of Object.entries(policies)) {
  const needle = `  slug: "${slug}"`
  const idx = c.indexOf(needle)
  if (idx === -1) {
    console.error("NOT FOUND:", slug)
    continue
  }

  // Find the next standalone closing brace after this slug
  const closePattern = "\n}\n\n"
  const closeIdx = c.indexOf(closePattern, idx)
  if (closeIdx === -1) {
    console.error("NO CLOSING BRACE FOR:", slug)
    continue
  }

  const insertion = `\n  emojiPolicy: "${policy}",`
  c = c.slice(0, closeIdx) + insertion + c.slice(closeIdx)
  console.log(`Patched ${slug} (${policy}) at offset ${closeIdx}`)
}

writeFileSync(file, c, "utf8")
console.log("Done. File length:", c.length)
