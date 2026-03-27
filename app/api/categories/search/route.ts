import { NextResponse } from "next/server"

import { searchAllegroLeaves } from "@/lib/allegro/category-store"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") ?? ""
    const limit = Math.min(
      80,
      Math.max(1, Number(searchParams.get("limit")) || 50)
    )
    const results = searchAllegroLeaves(q, limit)
    return NextResponse.json({
      ok: true,
      query: q,
      results: results.map((r) => ({
        id: r.id,
        name: r.name,
        path: r.path,
        pathLabel: r.pathLabel,
      })),
    })
  } catch (e) {
    console.error("[categories/search]", e)
    return NextResponse.json(
      { ok: false, error: "Nie udało się wczytać kategorii." },
      { status: 500 }
    )
  }
}
