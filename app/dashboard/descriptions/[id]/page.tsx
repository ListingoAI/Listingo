"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

import DescriptionResult from "@/components/generator/DescriptionResult"
import { formatCategoryFieldForDisplay } from "@/lib/allegro/category-selection"
import { createClient } from "@/lib/supabase/client"
import type { Description, GenerateResponse, QualityTip } from "@/lib/types"
import { formatDate } from "@/lib/utils"

function mapQualityTipsFromRow(
  raw: Description["quality_tips"] | unknown
): QualityTip[] {
  const arr = Array.isArray(raw) ? raw : []
  const out: QualityTip[] = []

  for (const t of arr) {
    if (typeof t === "string") {
      try {
        const p = JSON.parse(t) as unknown
        if (p && typeof p === "object" && "text" in p) {
          const o = p as { type?: string; text: unknown; points?: unknown }
          const type: QualityTip["type"] =
            o.type === "success" || o.type === "warning" || o.type === "error"
              ? o.type
              : "success"
          out.push({
            type,
            text: String(o.text),
            points: Number(o.points ?? 0),
          })
          continue
        }
      } catch {
        out.push({ type: "success", text: t, points: 0 })
        continue
      }
      out.push({ type: "success", text: t, points: 0 })
      continue
    }

    if (t && typeof t === "object" && "text" in t) {
      const o = t as { type?: string; text: unknown; points?: unknown }
      const type: QualityTip["type"] =
        o.type === "success" || o.type === "warning" || o.type === "error"
          ? o.type
          : "success"
      out.push({
        type,
        text: String(o.text),
        points: Number(o.points ?? 0),
      })
    }
  }

  return out
}

function toGenerateResponse(description: Description): GenerateResponse {
  return {
    seoTitle: description.seo_title ?? "",
    shortDescription: description.short_description ?? "",
    longDescription: description.long_description ?? "",
    tags: description.tags ?? [],
    metaDescription: description.meta_description ?? "",
    qualityScore: description.quality_score ?? 0,
    qualityTips: mapQualityTipsFromRow(description.quality_tips),
    descriptionId: description.id,
  }
}

export default function DescriptionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : params.id?.[0]

  const [description, setDescription] = useState<Description | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setDescription(null)
      return
    }

    let cancelled = false

    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from("descriptions")
        .select("*")
        .eq("id", id)
        .single()

      if (cancelled) return

      if (error || !data) {
        setDescription(null)
        setLoading(false)
        return
      }

      if (!user || data.user_id !== user.id) {
        router.replace("/dashboard/descriptions")
        return
      }

      setDescription(data as Description)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id, router])

  const toggleFavorite = useCallback(async () => {
    if (!description) return
    const supabase = createClient()
    const next = !description.is_favorite
    const { error } = await supabase
      .from("descriptions")
      .update({ is_favorite: next })
      .eq("id", description.id)

    if (error) {
      toast.error("Nie udało się zaktualizować ulubionych")
      return
    }

    setDescription((d) => (d ? { ...d, is_favorite: next } : null))
    toast.success(next ? "Dodano do ulubionych ❤️" : "Usunięto z ulubionych")
  }, [description])

  const resultData = useMemo(
    () => (description ? toGenerateResponse(description) : null),
    [description]
  )

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
          aria-label="Ładowanie"
        />
      </div>
    )
  }

  if (!description || !resultData) {
    return (
      <div className="py-16 text-center">
        <p className="text-foreground">Opis nie znaleziony</p>
        <Link
          href="/dashboard/descriptions"
          className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
        >
          Wróć do listy
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/dashboard/descriptions"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Wróć do listy
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5 text-sm transition-colors hover:bg-secondary/50"
          >
            {description.is_favorite ? "❤️ Ulubiony" : "🤍 Dodaj do ulubionych"}
          </button>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg px-3 py-1.5 text-sm text-muted-foreground opacity-60"
          >
            🔄 Regeneruj
          </button>
        </div>
      </div>

      <h1 className="text-xl font-bold text-foreground">
        {description.product_name}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-secondary px-2 py-1 text-xs capitalize text-muted-foreground">
          {description.platform}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(description.created_at)}
        </span>
        <span className="text-xs">
          {description.source_type === "form"
            ? "📝 Formularz"
            : description.source_type === "image"
              ? "📸 Ze zdjęcia"
              : "🔍 Z URL"}
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-border/50 bg-card/30 p-4">
        <button
          type="button"
          onClick={() => setShowOriginal((v) => !v)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
        >
          <span>📦 Oryginalne dane produktu {showOriginal ? "▲" : "▼"}</span>
        </button>
        {showOriginal ? (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Kategoria: </span>
              <span className="text-foreground">
                {formatCategoryFieldForDisplay(description.category)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Ton: </span>
              <span className="capitalize text-foreground">
                {description.tone}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Cechy: </span>
            </p>
            <pre className="mt-1 rounded-lg bg-secondary/30 p-3 text-xs whitespace-pre-wrap text-foreground/80">
              {description.features ?? "—"}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <DescriptionResult result={resultData} />
      </div>
    </div>
  )
}
