import crypto from "crypto"
import type { AllegroLeafCategory } from "./types"

// ---------------------------------------------------------------------------
// Result cache  (key = hash(productName+features) → result + timestamp)
// ---------------------------------------------------------------------------

type CacheEntry = {
  leaf: AllegroLeafCategory
  source: "heuristic" | "ai"
  ts: number
}

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 min
const MAX_CACHE_SIZE = 500

const resultCache = new Map<string, CacheEntry>()

export function cacheKey(productName: string, features: string): string {
  const raw = `${productName.trim().toLowerCase()}||${features.trim().toLowerCase()}`
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24)
}

export function getCached(key: string): CacheEntry | null {
  const e = resultCache.get(key)
  if (!e) return null
  if (Date.now() - e.ts > CACHE_TTL_MS) {
    resultCache.delete(key)
    return null
  }
  return e
}

export function setCache(
  key: string,
  leaf: AllegroLeafCategory,
  source: "heuristic" | "ai"
): void {
  if (resultCache.size >= MAX_CACHE_SIZE) {
    const oldest = resultCache.keys().next().value
    if (oldest !== undefined) resultCache.delete(oldest)
  }
  resultCache.set(key, { leaf, source, ts: Date.now() })
}

// ---------------------------------------------------------------------------
// Rate limiter  (sliding-window counters per key)
// ---------------------------------------------------------------------------

type WindowEntry = { timestamps: number[] }

const rateBuckets = new Map<string, WindowEntry>()

const RATE_CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < RATE_CLEANUP_INTERVAL) return
  lastCleanup = now
  const cutoff = now - 3_600_000
  for (const [k, v] of rateBuckets) {
    v.timestamps = v.timestamps.filter((t) => t > cutoff)
    if (v.timestamps.length === 0) rateBuckets.delete(k)
  }
}

function getTimestamps(key: string): number[] {
  cleanup()
  if (!rateBuckets.has(key)) rateBuckets.set(key, { timestamps: [] })
  return rateBuckets.get(key)!.timestamps
}

function record(key: string): void {
  getTimestamps(key).push(Date.now())
}

function countInWindow(key: string, windowMs: number): number {
  const cutoff = Date.now() - windowMs
  return getTimestamps(key).filter((t) => t > cutoff).length
}

// ---------------------------------------------------------------------------
// Public rate-limit check
// ---------------------------------------------------------------------------

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number; reason: string }

type PlanTier = "free" | "pro" | "business"

const LIMITS: Record<PlanTier, { perMin: number; perHour: number; perDay: number }> = {
  free:     { perMin: 3, perHour: 15, perDay: 40 },
  pro:      { perMin: 5, perHour: 30, perDay: 100 },
  business: { perMin: 8, perHour: 60, perDay: 200 },
}

const IP_LIMITS = { perMin: 10, perHour: 60 }

export function checkRateLimit(
  userId: string,
  ip: string,
  plan: string
): RateLimitResult {
  const tier: PlanTier = (plan === "pro" || plan === "business") ? plan as PlanTier : "free"
  const lim = LIMITS[tier]

  const userKey = `user:${userId}`
  const ipKey = `ip:${ip}`

  if (countInWindow(ipKey, 60_000) >= IP_LIMITS.perMin) {
    return { allowed: false, retryAfterMs: 60_000, reason: "Zbyt wiele zapytań z tego adresu IP. Spróbuj za minutę." }
  }
  if (countInWindow(ipKey, 3_600_000) >= IP_LIMITS.perHour) {
    return { allowed: false, retryAfterMs: 300_000, reason: "Limit godzinowy IP osiągnięty." }
  }

  if (countInWindow(userKey, 60_000) >= lim.perMin) {
    return { allowed: false, retryAfterMs: 60_000, reason: "Poczekaj minutę przed kolejną sugestią." }
  }
  if (countInWindow(userKey, 3_600_000) >= lim.perHour) {
    return { allowed: false, retryAfterMs: 300_000, reason: "Osiągnięto limit sugestii na godzinę. Spróbuj później." }
  }
  if (countInWindow(userKey, 86_400_000) >= lim.perDay) {
    return { allowed: false, retryAfterMs: 3_600_000, reason: "Osiągnięto dzienny limit sugestii AI." }
  }

  record(userKey)
  record(ipKey)
  return { allowed: true }
}

// ---------------------------------------------------------------------------
// Usage logger (in-memory, can be swapped for DB/analytics)
// ---------------------------------------------------------------------------

type LogEntry = {
  userId: string
  ip: string
  plan: string
  source: "heuristic" | "ai" | "cache"
  ms: number
  ts: number
}

const usageLogs: LogEntry[] = []
const MAX_LOG_SIZE = 2000

export function logUsage(entry: Omit<LogEntry, "ts">): void {
  if (usageLogs.length >= MAX_LOG_SIZE) usageLogs.shift()
  usageLogs.push({ ...entry, ts: Date.now() })
}

export function getRecentLogs(limit = 50): LogEntry[] {
  return usageLogs.slice(-limit)
}
