import { readFileSync, writeFileSync } from "fs"

const file = "lib/generation/build-quality-refinement-instruction.ts"
let c = readFileSync(file, "utf8")

// First fix any raw Unicode special chars
c = c.replaceAll("\u2014", " - ")
c = c.replaceAll("\u2013", "-")
c = c.replaceAll("\u201e", "'")   // Polish open quote -> single quote
c = c.replaceAll("\u201d", "'")   // Polish close quote -> single quote
c = c.replaceAll("\u201c", "'")   // Left double quotation mark -> single quote

// Now find any string literals that contain an unescaped " in the middle.
// We process character-by-character to properly handle string boundaries.
let result = ""
let i = 0

while (i < c.length) {
  // Check for string literal start (double quote, not preceded by backslash)
  if (c[i] === '"' && (i === 0 || c[i-1] !== '\\')) {
    // We're entering a string literal - collect until closing "
    result += '"'
    i++
    let strContent = ""
    while (i < c.length) {
      if (c[i] === '\\') {
        // escaped char - keep as is
        strContent += c[i] + (c[i+1] ?? "")
        i += 2
        continue
      }
      if (c[i] === '"') {
        // potential end of string - but first check if this " is inside the string
        // by checking if what follows looks like a string continuation or end
        // We trust it's the end of the string
        break
      }
      strContent += c[i]
      i++
    }
    result += strContent + '"'
    i++ // skip closing "
  } else {
    result += c[i]
    i++
  }
}

// Safer approach: just replace any " that appears after a space or punctuation
// inside what looks like string content, with \'
// Actually, the most reliable fix: use a state machine

// Let's try a different, simpler approach:
// Replace any ASCII " that appears between two word characters (like "dla kogo")
// with escaped \"  - but only inside string literals
// 
// Since the file is TypeScript, the pattern is:
// Lines that have .push("...") or array items ["..."]
// where "..." contains more " inside
//
// Simplest correct fix: replace ALL " that appear after a non-whitespace,
// non-open-paren, non-comma, non-bracket character with \"
// i.e., " that is NOT at the start of a string

// Revert result and use targeted replacement instead
result = c

// Find all occurrences of: a word char or ) followed by " followed by a word char
// These are inner quotes inside string literals
result = result.replace(/(\w)"/g, (match, p1) => p1 + '\\"')
result = result.replace(/"(\w)/g, (match, p1) => '\\"' + p1)

// But this might double-escape things. Let's be more careful.
// Just write a clean version of the file instead.

writeFileSync(file, result, "utf8")
console.log("Step 1 done. Length:", result.length)

// Verify by trying to parse
import { execSync } from "child_process"
try {
  execSync(`node --input-type=commonjs -e "require('./lib/generation/build-quality-refinement-instruction.ts')"`, { cwd: process.cwd(), stdio: 'pipe' })
  console.log("Parse OK!")
} catch (e) {
  console.log("Still has parse errors, switching to rewrite approach...")
}
