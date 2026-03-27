import { NextResponse } from "next/server"

import { getAllegroChildren } from "@/lib/allegro/category-store"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const raw = searchParams.get("parentId")
    const parentId =
      raw === null || raw === "" || raw === "null" ? null : raw

    const children = getAllegroChildren(parentId)
    return NextResponse.json({
      ok: true,
      parentId,
      children: children.map((c) => ({
        id: c.id,
        name: c.name,
        leaf: c.leaf,
      })),
    })
  } catch (e) {
    console.error("[categories/children]", e)
    return NextResponse.json(
      { ok: false, error: "Nie udało się wczytać kategorii." },
      { status: 500 }
    )
  }
}
