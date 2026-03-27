"use client"

import { Copy, Eye, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

import { QualityScoreRing } from "@/components/shared/QualityScoreRing"
import { PLATFORMS } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Description } from "@/lib/types"
import { copyToClipboard, formatDate } from "@/lib/utils"

function platformEmoji(platform: string): string {
  return PLATFORMS.find((p) => p.value === platform)?.emoji ?? "📝"
}

export default function DescriptionsPage() {
  const router = useRouter()
  const [descriptions, setDescriptions] = useState<Description[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data } = await supabase
        .from("descriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (!cancelled) {
        if (data) setDescriptions(data as Description[])
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    let list = descriptions

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((d) =>
        (d.product_name ?? "").toLowerCase().includes(q)
      )
    }

    if (platformFilter !== "all") {
      list = list.filter((d) => d.platform === platformFilter)
    }

    if (sortBy === "oldest") {
      list = [...list].reverse()
    } else if (sortBy === "score-high") {
      list = [...list].sort(
        (a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0)
      )
    } else if (sortBy === "score-low") {
      list = [...list].sort(
        (a, b) => (a.quality_score ?? 0) - (b.quality_score ?? 0)
      )
    }

    return list
  }, [descriptions, searchQuery, platformFilter, sortBy])

  async function toggleFavorite(id: string, currentValue: boolean) {
    const supabase = createClient()
    const { error } = await supabase
      .from("descriptions")
      .update({ is_favorite: !currentValue })
      .eq("id", id)

    if (error) {
      toast.error("Nie udało się zaktualizować ulubionych")
      return
    }

    setDescriptions((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, is_favorite: !currentValue } : d
      )
    )
    toast.success(
      currentValue ? "Usunięto z ulubionych" : "Dodano do ulubionych ❤️"
    )
  }

  async function deleteDescription(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from("descriptions").delete().eq("id", id)

    if (error) {
      toast.error("Nie udało się usunąć opisu")
      return
    }

    setDescriptions((prev) => prev.filter((d) => d.id !== id))
    setDeleteConfirm(null)
    toast.success("Opis usunięty")
  }

  async function copyFullDescription(desc: Description) {
    const text = `${desc.seo_title ?? ""}\n\n${desc.short_description ?? ""}\n\n${(desc.long_description ?? "").replace(/<[^>]*>/g, "")}\n\nTagi: ${desc.tags?.join(", ") ?? ""}\n\nMeta: ${desc.meta_description ?? ""}`
    const ok = await copyToClipboard(text)
    if (ok) toast.success("Skopiowano cały opis!")
    else toast.error("Nie udało się skopiować")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📋 Moje opisy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wszystkie Twoje wygenerowane opisy
          </p>
        </div>
        <Link
          href="/dashboard/generate"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25"
        >
          ✨ Generuj nowy
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Szukaj po nazwie produktu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border/50 bg-secondary/50 pl-10 pr-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="h-10 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none sm:min-w-[180px]"
        >
          <option value="all">Wszystkie platformy</option>
          <option value="allegro">🛒 Allegro</option>
          <option value="shopify">🛍️ Shopify</option>
          <option value="woocommerce">🌐 WooCommerce</option>
          <option value="olx">📦 OLX</option>
          <option value="ogolny">📝 Ogólny</option>
          <option value="ogolny_plain">📄 Ogólny (tekst)</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-10 rounded-lg border border-border/50 bg-secondary/50 px-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none sm:min-w-[160px]"
        >
          <option value="newest">Najnowsze</option>
          <option value="oldest">Najstarsze</option>
          <option value="score-high">Jakość ↑</option>
          <option value="score-low">Jakość ↓</option>
        </select>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Wyświetlono {filtered.length} z {descriptions.length} opisów
      </p>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-card/50" />
          <div className="h-20 animate-pulse rounded-xl bg-card/50" />
          <div className="h-20 animate-pulse rounded-xl bg-card/50" />
        </div>
      ) : null}

      {!loading && filtered.length === 0 && descriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 py-16 text-center">
          <p className="mb-3 text-4xl">📝</p>
          <p className="text-lg font-medium text-foreground">
            Nie masz jeszcze żadnych opisów
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Wygeneruj swój pierwszy opis i wróć tutaj
          </p>
          <Link
            href="/dashboard/generate"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-600"
          >
            ✨ Wygeneruj pierwszy opis →
          </Link>
        </div>
      ) : null}

      {!loading && filtered.length === 0 && descriptions.length > 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/30 py-12 text-center">
          <p className="mb-2 text-2xl">🔍</p>
          <p className="text-muted-foreground">
            Brak wyników dla &quot;{searchQuery}&quot;
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("")
              setPlatformFilter("all")
            }}
            className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
          >
            Wyczyść filtry
          </button>
        </div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((desc, index) => (
            <div
              key={desc.id}
              className="group premium-card gradient-border stagger-item flex items-center gap-4 rounded-xl p-4 transition-all hover:border-emerald-500/30"
              style={{
                animationDelay: `${Math.min(index, 24) * 0.06}s`,
              }}
            >
              <button
                type="button"
                onClick={() => void toggleFavorite(desc.id, desc.is_favorite)}
                className="shrink-0 text-lg transition-transform hover:scale-110"
                aria-label={
                  desc.is_favorite
                    ? "Usuń z ulubionych"
                    : "Dodaj do ulubionych"
                }
              >
                {desc.is_favorite ? "❤️" : "🤍"}
              </button>

              <Link
                href={`/dashboard/descriptions/${desc.id}`}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg" aria-hidden>
                    {platformEmoji(desc.platform)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-emerald-400">
                      {desc.product_name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(desc.created_at)}
                      </span>
                      <span className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs capitalize text-muted-foreground">
                        {desc.platform}
                      </span>
                      {desc.source_type === "image" ? (
                        <span className="text-xs" aria-hidden>
                          📸
                        </span>
                      ) : null}
                      {desc.source_type === "url" ? (
                        <span className="text-xs" aria-hidden>
                          🔍
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <QualityScoreRing score={desc.quality_score ?? 0} />

                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/descriptions/${desc.id}`)
                  }
                  className="rounded-lg bg-secondary/50 p-2 text-muted-foreground transition-all hover:bg-emerald-500/20 hover:text-emerald-400"
                  aria-label="Otwórz opis"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void copyFullDescription(desc)}
                  className="rounded-lg bg-secondary/50 p-2 text-muted-foreground transition-all hover:bg-emerald-500/20 hover:text-emerald-400"
                  aria-label="Kopiuj cały opis"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(desc.id)}
                  className="rounded-lg bg-secondary/50 p-2 text-muted-foreground transition-all hover:bg-red-500/20 hover:text-red-400"
                  aria-label="Usuń opis"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {deleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-desc-title"
          >
            <p
              id="delete-desc-title"
              className="text-sm font-medium text-foreground"
            >
              Usunąć ten opis? Tej operacji nie cofniesz.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void deleteDescription(deleteConfirm)}
                className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Usuń
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-border/50 bg-secondary/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
