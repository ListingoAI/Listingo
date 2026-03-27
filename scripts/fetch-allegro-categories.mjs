/**
 * Pobiera pełną taksonomię kategorii Allegro (GET /sale/categories)
 * i zapisuje data/allegro-categories.json
 *
 * Wymaga w .env.local:
 *   ALLEGRO_CLIENT_ID=
 *   ALLEGRO_CLIENT_SECRET=
 *
 * Uruchomienie: node scripts/fetch-allegro-categories.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function loadEnv() {
  const envPath = path.join(root, ".env.local")
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, "utf-8")
  for (const line of text.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const k = m[1].trim()
    let v = m[2].trim().replace(/^["']|["']$/g, "")
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv()

const CLIENT_ID = process.env.ALLEGRO_CLIENT_ID
const CLIENT_SECRET = process.env.ALLEGRO_CLIENT_SECRET
const API = "https://api.allegro.pl"
const TOKEN_URL = "https://allegro.pl/auth/oauth/token"

async function getToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Brak ALLEGRO_CLIENT_ID / ALLEGRO_CLIENT_SECRET w środowisku.")
    process.exit(1)
  }
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })
  if (!res.ok) {
    console.error("Token error:", res.status, await res.text())
    process.exit(1)
  }
  const data = await res.json()
  return data.access_token
}

async function fetchChildrenPage(token, parentId, urlOverride = null) {
  const url =
    urlOverride ?? (() => {
      const u = new URL(`${API}/sale/categories`)
      if (parentId != null) u.searchParams.set("parent.id", parentId)
      return u.toString()
    })()
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.allegro.public.v1+json",
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  const cats = data.categories ?? []
  const linkList = Array.isArray(data.links) ? data.links : []
  const next = linkList.find((l) => l.rel === "next")?.href ?? null
  return { categories: cats, next }
}

async function fetchAllChildren(token, parentId = null) {
  const out = []
  let nextUrl = null
  let first = true
  while (first || nextUrl) {
    const { categories, next } = first
      ? await fetchChildrenPage(token, parentId, null)
      : await fetchChildrenPage(token, parentId, nextUrl)
    first = false
    out.push(...categories)
    nextUrl = next || null
    if (nextUrl) await new Promise((r) => setTimeout(r, 40))
  }
  return out
}

async function main() {
  console.log("Pobieranie tokenu Allegro…")
  const token = await getToken()
  const nodes = []
  const seen = new Set()

  async function walk(parentId) {
    const cats = await fetchAllChildren(token, parentId)
    for (const c of cats) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      const parent = c.parent?.id ?? null
      nodes.push({
        id: c.id,
        name: c.name,
        parentId: parent,
        leaf: Boolean(c.leaf),
      })
      if (!c.leaf) {
        await walk(c.id)
      }
      await new Promise((r) => setTimeout(r, 25))
    }
  }

  console.log("Pobieranie drzewa kategorii (może potrwać kilka minut)…")
  await walk(null)

  const out = {
    version: 1,
    source: "allegro-api",
    generatedAt: new Date().toISOString(),
    nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
  }

  const outPath = path.join(root, "data", "allegro-categories.json")
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(out, null, 0), "utf-8")
  console.log(`Zapisano ${nodes.length} węzłów → ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
