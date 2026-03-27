import { NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

import {
  getLeavesUnderMainCategory,
  getMainCategoryRoots,
  mergeHeuristicAndKeywordCandidates,
  rankLeavesByInputOverlap,
  suggestTopCandidates,
} from "@/lib/allegro/category-store"
import { generateCustomCategoryLabel } from "@/lib/allegro/suggest-custom-label"
import { pickBestCategoryAI, pickMainBranchAI } from "@/lib/allegro/suggest-ai"
import type { AllegroLeafCategory } from "@/lib/allegro/types"
import {
  cacheKey,
  checkRateLimit,
  getCached,
  logUsage,
  patchCacheHint,
  setCache,
} from "@/lib/allegro/suggest-limiter"

export const runtime = "nodejs"

const MIN_INPUT_LENGTH = 5
const CLEAR_WINNER_GAP = 6
const CANDIDATES_LIMIT = 5
/** Max liści przekazywanych do AI po scaleniu heurystyki + słów kluczowych */
const MAX_AI_CANDIDATES = 12
/** Max liści po wyborze głównej gałęzi (drugi krok AI) */
const BRANCH_LEAF_CAP = 35

function getIp(req: Request): string {
  const hdr =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  return hdr.split(",")[0].trim()
}

function leafToJson(l: AllegroLeafCategory) {
  return { id: l.id, leafName: l.name, path: l.path, pathLabel: l.pathLabel }
}

export async function POST(req: Request) {
  const t0 = Date.now()

  try {
    // --- Auth ---
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }) } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: "", ...options }) } catch {}
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Musisz być zalogowany." },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single()

    const plan = (profile?.plan as string) ?? "free"
    const ip = getIp(req)

    // --- Rate limit ---
    const rl = checkRateLimit(user.id, ip, plan)
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: rl.reason, retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      )
    }

    // --- Input validation ---
    const body = await req.json()
    const productName = String(body.productName ?? "").trim()
    const features = String(body.features ?? "").trim()
    const inputLen = productName.length + features.length

    if (inputLen < MIN_INPUT_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: "Wpisz więcej danych (nazwa + cechy muszą mieć co najmniej 5 znaków).",
        },
        { status: 400 }
      )
    }

    // --- Cache hit? ---
    const key = cacheKey(productName, features)
    const cached = getCached(key)
    if (cached) {
      let hint = cached.customCategoryHint
      if (!hint) {
        const gen = await generateCustomCategoryLabel(productName, features)
        if (gen) {
          hint = gen
          patchCacheHint(key, gen)
        }
      }
      logUsage({ userId: user.id, ip, plan, source: "cache", ms: Date.now() - t0 })
      return NextResponse.json({
        ok: true,
        confidence: cached.confidence,
        source: "cache",
        suggestion: leafToJson(cached.leaf),
        candidates: [],
        ...(hint ? { customCategoryHint: hint } : {}),
      })
    }

    // --- Stage 1: heurystyka + wyszukiwanie słów w ścieżkach (szerszy zestaw niż sama heurystyka tokenów) ---
    const heuristicScored = suggestTopCandidates(productName, features, 8)
    const mergedLeaves = mergeHeuristicAndKeywordCandidates(
      productName,
      features,
      12,
      24
    )

    /** Brak jakichkolwiek kandydatów lokalnych → AI: główna gałąź → liście pod gałęzią */
    if (mergedLeaves.length === 0) {
      const roots = getMainCategoryRoots().map((r) => ({
        id: r.id,
        name: r.name,
      }))
      const mainId = await pickMainBranchAI(productName, features, roots)
      if (!mainId) {
        const hint = await generateCustomCategoryLabel(productName, features)
        logUsage({
          userId: user.id,
          ip,
          plan,
          source: "heuristic",
          ms: Date.now() - t0,
        })
        return NextResponse.json({
          ok: true,
          confidence: "none",
          source: "heuristic",
          suggestion: null,
          candidates: [],
          ...(hint ? { customCategoryHint: hint } : {}),
        })
      }

      let under = getLeavesUnderMainCategory(mainId)
      if (under.length === 0) {
        const hint = await generateCustomCategoryLabel(productName, features)
        logUsage({
          userId: user.id,
          ip,
          plan,
          source: "heuristic",
          ms: Date.now() - t0,
        })
        return NextResponse.json({
          ok: true,
          confidence: "none",
          source: "heuristic",
          suggestion: null,
          candidates: [],
          ...(hint ? { customCategoryHint: hint } : {}),
        })
      }

      if (under.length > BRANCH_LEAF_CAP) {
        under = rankLeavesByInputOverlap(
          under,
          productName,
          features,
          BRANCH_LEAF_CAP
        )
      }

      const topCandidates = under
        .slice(0, CANDIDATES_LIMIT)
        .map((l) => leafToJson(l))

      const [aiPick, customHint] = await Promise.all([
        pickBestCategoryAI(productName, features, under),
        generateCustomCategoryLabel(productName, features),
      ])

      if (aiPick) {
        setCache(key, aiPick, "ai", "high", customHint ?? undefined)
        logUsage({ userId: user.id, ip, plan, source: "ai", ms: Date.now() - t0 })
        return NextResponse.json({
          ok: true,
          confidence: "high",
          source: "ai",
          suggestion: leafToJson(aiPick),
          candidates: topCandidates,
          ...(customHint ? { customCategoryHint: customHint } : {}),
        })
      }

      logUsage({
        userId: user.id,
        ip,
        plan,
        source: "heuristic",
        ms: Date.now() - t0,
      })
      return NextResponse.json({
        ok: true,
        confidence: "medium",
        source: "heuristic",
        suggestion: null,
        candidates: topCandidates,
        ...(customHint ? { customCategoryHint: customHint } : {}),
      })
    }

    const rankedForUi = rankLeavesByInputOverlap(
      mergedLeaves,
      productName,
      features,
      CANDIDATES_LIMIT
    )
    const topCandidates = rankedForUi.map((l) => leafToJson(l))

    const topScore =
      heuristicScored.length > 0 ? heuristicScored[0].score : 0
    const runnerUp =
      heuristicScored.length > 1 ? heuristicScored[1].score : 0
    const clearWinner =
      heuristicScored.length >= 1 &&
      (heuristicScored.length === 1 ||
        topScore - runnerUp >= CLEAR_WINNER_GAP)

    // Pewny zwycięzca heurystyki (tylko gdy heurystyka coś znalazła)
    if (clearWinner && heuristicScored.length > 0) {
      const leaf = heuristicScored[0].leaf
      setCache(key, leaf, "heuristic", "high")
      logUsage({ userId: user.id, ip, plan, source: "heuristic", ms: Date.now() - t0 })
      return NextResponse.json({
        ok: true,
        confidence: "high",
        source: "heuristic",
        suggestion: leafToJson(leaf),
        candidates: topCandidates,
      })
    }

    // --- Stage 2: AI z krótkiej listy (semantyka + lista ścieżek) ---
    const forAi = rankLeavesByInputOverlap(
      mergedLeaves,
      productName,
      features,
      MAX_AI_CANDIDATES
    )

    const [aiPick, customHint] = await Promise.all([
      pickBestCategoryAI(productName, features, forAi),
      generateCustomCategoryLabel(productName, features),
    ])

    if (aiPick) {
      setCache(key, aiPick, "ai", "high", customHint ?? undefined)
      logUsage({ userId: user.id, ip, plan, source: "ai", ms: Date.now() - t0 })
      return NextResponse.json({
        ok: true,
        confidence: "high",
        source: "ai",
        suggestion: leafToJson(aiPick),
        candidates: topCandidates,
        ...(customHint ? { customCategoryHint: customHint } : {}),
      })
    }

    logUsage({ userId: user.id, ip, plan, source: "heuristic", ms: Date.now() - t0 })
    return NextResponse.json({
      ok: true,
      confidence: "medium",
      source: "heuristic",
      suggestion: null,
      candidates: topCandidates,
      ...(customHint ? { customCategoryHint: customHint } : {}),
    })
  } catch (e) {
    console.error("[categories/suggest]", e)
    return NextResponse.json(
      { ok: false, error: "Sugestia niedostępna." },
      { status: 500 }
    )
  }
}
