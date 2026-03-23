"use client"

import { useEffect, useState } from "react"

import type { GenerateResponse } from "@/lib/types"

type PreviewTab = "allegro" | "shopify" | "google" | "mobile"

function normalizePreviewTab(platform: string): PreviewTab {
  const p = platform.toLowerCase()
  if (p === "shopify") return "shopify"
  if (p === "google") return "google"
  if (p === "mobile") return "mobile"
  return "allegro"
}

const TABS: { id: PreviewTab; label: string }[] = [
  { id: "allegro", label: "Allegro" },
  { id: "shopify", label: "Shopify" },
  { id: "google", label: "Google" },
  { id: "mobile", label: "Mobile" },
]

type PlatformPreviewProps = {
  result: GenerateResponse
  platform: string
}

export function PlatformPreview({ result, platform }: PlatformPreviewProps) {
  const [previewPlatform, setPreviewPlatform] = useState<PreviewTab>(() =>
    normalizePreviewTab(platform)
  )

  useEffect(() => {
    setPreviewPlatform(normalizePreviewTab(platform))
  }, [platform])

  const tabBtnClass = (id: PreviewTab) =>
    `rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
      previewPlatform === id
        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
        : "border-border/50 bg-card/50 text-muted-foreground hover:border-emerald-500/30"
    }`

  const seoTitle = result.seoTitle ?? ""
  const shortDescription = result.shortDescription ?? ""
  const longDescription = result.longDescription ?? ""
  const metaDescription = result.metaDescription ?? ""
  const tags = Array.isArray(result.tags) ? result.tags : []

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPreviewPlatform(id)}
            className={tabBtnClass(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {previewPlatform === "allegro" ? (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-white">
          <div className="flex items-center gap-4 bg-[#FF5A00] px-4 py-2">
            <span className="text-sm font-bold text-white">allegro</span>
            <div className="flex-1 rounded bg-white/20 px-3 py-1 text-xs text-white/70">
              🔍 Szukaj na Allegro...
            </div>
            <span className="text-xs text-white/80">🛒 Koszyk</span>
          </div>

          <div className="bg-gray-50 px-4 py-2 text-[10px] text-gray-400">
            Allegro › Kategoria › Podkategoria
          </div>

          <div className="grid grid-cols-2 gap-4 p-4">
            <div className="flex aspect-square flex-col items-center justify-center rounded-lg bg-gray-100 p-2">
              <span className="text-4xl" aria-hidden>
                📷
              </span>
              <p className="mt-1 text-center text-xs text-gray-400">
                Zdjęcie produktu
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm leading-tight font-semibold text-gray-900">
                {seoTitle}
              </h2>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-xs text-yellow-400">
                    ⭐
                  </span>
                ))}
                <span className="text-xs text-gray-400">(0 opinii)</span>
              </div>
              <p className="text-xl font-bold text-gray-900">99,99 zł</p>
              <div className="rounded border border-green-200 bg-green-50 px-2 py-1">
                <p className="text-xs text-green-700">✓ Darmowa dostawa</p>
              </div>
              <button
                type="button"
                className="w-full rounded bg-[#FF5A00] py-2 text-sm font-semibold text-white"
              >
                KUP TERAZ
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 py-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Opis produktu
            </h3>
            <div
              className="prose prose-xs max-w-none text-xs leading-relaxed text-gray-700 [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-gray-800 [&_li]:mb-0.5 [&_p]:mb-1.5 [&_strong]:text-gray-900 [&_ul]:ml-3"
              dangerouslySetInnerHTML={{ __html: longDescription }}
            />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-4 py-3">
            {tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {previewPlatform === "google" ? (
        <div className="rounded-2xl border border-border/50 bg-white p-6">
          <div className="max-w-xl">
            <p className="mb-0.5 text-xs text-gray-400">
              https://twojsklep.pl › produkt
            </p>
            <h3 className="cursor-pointer text-lg font-normal text-[#1a0dab] hover:underline">
              {seoTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              {metaDescription}
            </p>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-[10px] text-yellow-400">
                  ⭐
                </span>
              ))}
              <span className="text-xs text-gray-400">
                4,8 (127 opinii) · 99,99 zł
              </span>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="text-xs font-medium text-emerald-600">
              📊 SEO Score:{" "}
              {seoTitle.length <= 70
                ? "✅ Tytuł OK"
                : "⚠️ Tytuł za długi"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Meta description: {metaDescription?.length ?? 0}/160 znaków
            </p>
          </div>
        </div>
      ) : null}

      {previewPlatform === "shopify" ? (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-white">
          <div className="flex items-center justify-between bg-gray-900 px-4 py-2">
            <span className="text-sm font-medium text-white">🛍️ MyStore</span>
            <div className="flex gap-3 text-xs text-white/60">
              <span>Shop</span>
              <span>About</span>
              <span>🛒</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 p-6">
            <div className="flex aspect-square items-center justify-center rounded bg-gray-100 text-center text-xs text-gray-500">
              📷 Product Image
            </div>
            <div>
              <p className="text-xs tracking-wider text-gray-400 uppercase">
                Category
              </p>
              <h1 className="mt-1 text-lg font-semibold text-gray-900">
                {seoTitle}
              </h1>
              <p className="mt-2 text-xl font-bold text-gray-900">$24.99</p>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {shortDescription}
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded bg-gray-900 py-2.5 text-sm font-medium text-white"
              >
                Add to Cart
              </button>
            </div>
          </div>

          <div className="px-6 pb-6">
            <h3 className="mb-2 border-t border-gray-100 pt-4 text-sm font-semibold text-gray-900">
              Description
            </h3>
            <div
              className="prose prose-sm max-w-none text-sm text-gray-600"
              dangerouslySetInnerHTML={{ __html: longDescription }}
            />
          </div>
        </div>
      ) : null}

      {previewPlatform === "mobile" ? (
        <div className="mx-auto max-w-[320px]">
          <div className="overflow-hidden rounded-4xl border-4 border-gray-800 bg-white shadow-2xl">
            <div className="flex justify-between bg-gray-800 px-4 py-1 text-[10px] text-white">
              <span>9:41</span>
              <span aria-hidden>📶 🔋</span>
            </div>
            <div className="p-3">
              <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gray-100 text-sm">
                📷
              </div>
              <h2 className="text-sm font-semibold text-gray-900">{seoTitle}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                {shortDescription}
              </p>
              <p className="mt-2 text-lg font-bold text-gray-900">99,99 zł</p>
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white"
              >
                Kup teraz
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-center text-xs italic text-muted-foreground">
        Podgląd ma charakter poglądowy. Rzeczywisty wygląd może się różnić.
      </p>
    </div>
  )
}

export default PlatformPreview
