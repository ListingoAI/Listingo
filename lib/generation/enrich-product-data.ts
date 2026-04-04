/**
 * Vision + Retrieval: wzbogacenie ekstrakcji z obrazu o dane z zewnetrznych API.
 *
 * Safety gate: merge TYLKO gdy identyfikator jest 100% pewny (ISBN/EAN exact match
 * lub brand+model exact match). Lepiej nie dodac niz dodac bledne dane.
 *
 * Pipeline: Vision extraction -> extractIdentifiers -> lookup -> verify match -> merge
 */

import {
  filterListingKindEchoFromVisibleFeatures,
  type TruthExtractionFromImage,
  type EnrichmentSource,
} from '@/lib/generation/product-image-analysis'

// ─── Types ────────────────────────────────────────────────────────────────────

export type { EnrichmentSource } from '@/lib/generation/product-image-analysis'

export type EnrichmentResult = {
  source: EnrichmentSource
  matched: boolean
  matchedIdentifier?: string
  fields: Partial<{
    product_type: string
    brand: string
    model: string
    category: string
    visible_features: string[]
  }>
}

const EMPTY_ENRICHMENT: EnrichmentResult = {
  source: 'none',
  matched: false,
  fields: {},
}

// ─── ISBN / EAN extraction from OCR ───────────────────────────────────────────

const ISBN13_RE = /\b(97[89]\d{10})\b/
const ISBN10_RE = /\b(\d{9}[\dXx])\b/
const EAN13_RE = /\b(\d{13})\b/

function extractISBNFromText(texts: string[]): string | null {
  const joined = texts.join(' ')
  const m13 = joined.match(ISBN13_RE)
  if (m13) return m13[1]
  const m10 = joined.match(ISBN10_RE)
  if (m10) return m10[1]
  return null
}

function extractEANFromText(texts: string[]): string | null {
  const joined = texts.join(' ')
  const m = joined.match(EAN13_RE)
  if (m) {
    const code = m[1]
    if (code.startsWith('978') || code.startsWith('979')) return null
    return code
  }
  return null
}

// ─── Google Books API ─────────────────────────────────────────────────────────

type GoogleBooksVolume = {
  volumeInfo?: {
    title?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    pageCount?: number
    categories?: string[]
    description?: string
    industryIdentifiers?: Array<{ type: string; identifier: string }>
    language?: string
  }
}

type GoogleBooksResponse = {
  totalItems?: number
  items?: GoogleBooksVolume[]
}

async function lookupGoogleBooks(isbn: string): Promise<GoogleBooksVolume | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim()
  const url = apiKey
    ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1&key=${apiKey}`
    : `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as GoogleBooksResponse
    if (!data.totalItems || !data.items?.length) return null
    return data.items[0]
  } catch {
    return null
  }
}

function verifyISBNMatch(volume: GoogleBooksVolume, searchedISBN: string): boolean {
  const ids = volume.volumeInfo?.industryIdentifiers ?? []
  const normalized = searchedISBN.replace(/[-\s]/g, '')
  return ids.some((id) => {
    const clean = id.identifier.replace(/[-\s]/g, '')
    return clean === normalized
  })
}

function buildEnrichmentFromGoogleBooks(
  volume: GoogleBooksVolume,
  isbn: string
): EnrichmentResult {
  const vi = volume.volumeInfo
  if (!vi) return EMPTY_ENRICHMENT

  const features: string[] = []
  if (vi.authors?.length) features.push(`Autor: ${vi.authors.join(', ')}`)
  if (vi.publisher) features.push(`Wydawnictwo: ${vi.publisher}`)
  if (vi.publishedDate) features.push(`Rok wydania: ${vi.publishedDate}`)
  if (vi.pageCount) features.push(`Liczba stron: ${vi.pageCount}`)
  if (vi.categories?.length) features.push(`Kategoria: ${vi.categories.join(', ')}`)
  if (vi.language) features.push(`Jezyk: ${vi.language}`)

  const isbnIds = vi.industryIdentifiers?.filter(
    (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
  )
  if (isbnIds?.length) {
    for (const id of isbnIds) {
      features.push(`${id.type}: ${id.identifier}`)
    }
  }

  return {
    source: 'google_books',
    matched: true,
    matchedIdentifier: isbn,
    fields: {
      product_type: vi.title || undefined,
      brand: vi.authors?.join(', ') || undefined,
      category: vi.categories?.join(', ') || undefined,
      visible_features: features,
    },
  }
}

// ─── Open Library API (fallback for books) ────────────────────────────────────

type OpenLibraryDoc = {
  title?: string
  author_name?: string[]
  publisher?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  isbn?: string[]
  subject?: string[]
  language?: string[]
}

type OpenLibraryResponse = {
  numFound?: number
  docs?: OpenLibraryDoc[]
}

async function lookupOpenLibrary(isbn: string): Promise<OpenLibraryDoc | null> {
  const url = `https://openlibrary.org/search.json?isbn=${isbn}&limit=1`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as OpenLibraryResponse
    if (!data.numFound || !data.docs?.length) return null
    return data.docs[0]
  } catch {
    return null
  }
}

function verifyOpenLibraryISBNMatch(doc: OpenLibraryDoc, searchedISBN: string): boolean {
  const normalized = searchedISBN.replace(/[-\s]/g, '')
  return (doc.isbn ?? []).some(
    (id) => id.replace(/[-\s]/g, '') === normalized
  )
}

function buildEnrichmentFromOpenLibrary(
  doc: OpenLibraryDoc,
  isbn: string
): EnrichmentResult {
  const features: string[] = []
  if (doc.author_name?.length) features.push(`Autor: ${doc.author_name.join(', ')}`)
  if (doc.publisher?.length) features.push(`Wydawnictwo: ${doc.publisher[0]}`)
  if (doc.first_publish_year) features.push(`Rok wydania: ${doc.first_publish_year}`)
  if (doc.number_of_pages_median) features.push(`Liczba stron: ${doc.number_of_pages_median}`)
  if (doc.subject?.length) features.push(`Temat: ${doc.subject.slice(0, 3).join(', ')}`)

  return {
    source: 'open_library',
    matched: true,
    matchedIdentifier: isbn,
    fields: {
      product_type: doc.title || undefined,
      brand: doc.author_name?.join(', ') || undefined,
      category: doc.subject?.slice(0, 2).join(', ') || undefined,
      visible_features: features,
    },
  }
}

// ─── Book enrichment pipeline ─────────────────────────────────────────────────

async function enrichBookByISBN(isbn: string): Promise<EnrichmentResult> {
  // Tier 1: Google Books
  const gVolume = await lookupGoogleBooks(isbn)
  if (gVolume && verifyISBNMatch(gVolume, isbn)) {
    return buildEnrichmentFromGoogleBooks(gVolume, isbn)
  }

  // Tier 2: Open Library (fallback)
  const olDoc = await lookupOpenLibrary(isbn)
  if (olDoc && verifyOpenLibraryISBNMatch(olDoc, isbn)) {
    return buildEnrichmentFromOpenLibrary(olDoc, isbn)
  }

  return EMPTY_ENRICHMENT
}

// ─── Merge logic ──────────────────────────────────────────────────────────────

/**
 * Merge enrichment into extraction. Rules:
 * - Only fill EMPTY fields (never overwrite what Vision/user already has)
 * - visible_features: APPEND enrichment features (deduplicated)
 * - product_type: only if Vision returned a generic label like "ksiazka"
 */
export function mergeEnrichmentIntoExtraction(
  extraction: TruthExtractionFromImage,
  enrichment: EnrichmentResult
): TruthExtractionFromImage {
  if (!enrichment.matched || enrichment.source === 'none') return extraction

  const f = enrichment.fields
  const isGenericType = isGenericProductLabel(extraction.product_type)

  const mergedFeatures = filterListingKindEchoFromVisibleFeatures(
    dedupeFeatures([
      ...extraction.visible_features,
      ...(f.visible_features ?? []),
    ])
  )

  return {
    ...extraction,
    product_type: isGenericType && f.product_type
      ? f.product_type
      : extraction.product_type,
    brand: isEmpty(extraction.brand) && f.brand
      ? f.brand
      : extraction.brand,
    category: isEmpty(extraction.category) && f.category
      ? f.category
      : extraction.category,
    visible_features: mergedFeatures.slice(0, 32),
  }
}

function isEmpty(s: string): boolean {
  const t = s.trim().toLowerCase()
  return !t || t === 'nieznane' || t === 'unknown' || t === 'n/a' || t === 'brak'
}

function isGenericProductLabel(s: string): boolean {
  const t = s.trim().toLowerCase()
  return /^(książka|ksiazka|publikacja|komiks|magazyn|album|book)$/.test(t)
}

function dedupeFeatures(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const t = item.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    const subsumed = out.some((o) => o.toLowerCase().includes(key) && o.length > t.length)
    if (subsumed) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Attempts to enrich Vision extraction with external data.
 * Only enriches when there is a 100% certain match (ISBN/EAN exact match).
 * Returns the original extraction untouched if no certain match is found.
 */
export async function enrichProductExtraction(
  extraction: TruthExtractionFromImage
): Promise<{
  extraction: TruthExtractionFromImage
  enrichment: EnrichmentResult
}> {
  if (isEnrichmentDisabled()) {
    return { extraction, enrichment: EMPTY_ENRICHMENT }
  }

  const isbn = extractISBNFromText(extraction.text_on_product)
  if (isbn) {
    const enrichment = await enrichBookByISBN(isbn)
    if (enrichment.matched) {
      console.log(`[enrich] ISBN ${isbn} matched via ${enrichment.source}`)
      return {
        extraction: mergeEnrichmentIntoExtraction(extraction, enrichment),
        enrichment,
      }
    }
  }

  const ean = extractEANFromText(extraction.text_on_product)
  if (ean) {
    // EAN lookup placeholder — can be extended with product databases
    console.log(`[enrich] EAN ${ean} detected but no lookup configured yet`)
  }

  return { extraction, enrichment: EMPTY_ENRICHMENT }
}

function isEnrichmentDisabled(): boolean {
  const raw = process.env.PRODUCT_ENRICHMENT_ENABLED?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return true
  return false
}
