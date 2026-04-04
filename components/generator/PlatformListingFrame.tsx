"use client"

import { ImageIcon } from "lucide-react"

import type { GenerateResponse } from "@/lib/types"
import { extractImgSrcsFromHtml } from "@/lib/platforms/extract-img-srcs-from-html"
import type { PreviewFrameId } from "@/lib/platforms/preview-family"
import { longDescriptionIsHtml } from "@/lib/platforms/preview-family"
import { cn } from "@/lib/utils"

const proseLongHtml =
  "prose prose-xs max-w-none text-xs leading-relaxed text-gray-700 [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-gray-800 [&_img]:max-w-full [&_img]:rounded-md [&_li]:mb-0.5 [&_p]:mb-1.5 [&_strong]:text-gray-900 [&_ul]:ml-3"

const proseLongHtmlLg =
  "prose prose-sm max-w-none text-sm text-gray-600 [&_h2]:mt-3 [&_h2]:text-base [&_h3]:mt-2 [&_img]:max-w-full [&_img]:rounded-md"

/** Opis HTML w podglądzie Allegro — układ „szablon premium” (sekcje, obrazki obok tekstu, FAQ). */
const proseAllegroListingRich =
  "prose prose-sm max-w-none text-[13px] leading-relaxed text-gray-700 " +
  "[&_h2]:clear-both [&_h2]:mt-7 [&_h2]:border-b [&_h2]:border-gray-100 [&_h2]:pb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-gray-900 " +
  "[&_h2:first-child]:mt-0 " +
  "[&_h3]:clear-both [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 " +
  "[&_p]:mb-3 [&_p]:leading-relaxed " +
  "[&_ul]:my-2 [&_ul]:ml-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:my-0.5 [&_li]:marker:text-gray-300 " +
  "[&_ol]:my-2 [&_ol]:ml-1 [&_ol]:list-decimal [&_ol]:pl-4 " +
  "[&_img]:rounded-lg [&_img]:border [&_img]:border-gray-100/90 [&_img]:bg-white [&_img]:shadow-sm " +
  "md:[&_img]:float-left md:[&_img]:mr-4 md:[&_img]:mb-3 md:[&_img]:max-w-[min(100%,46%)] " +
  "[&_strong]:font-semibold [&_strong]:text-gray-900 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-gray-200 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600"

type Props = {
  result: GenerateResponse
  frameId: PreviewFrameId
  /** Slug platformy z formularza — decyduje o HTML vs plain w treści długiej. */
  platformSlug: string
  className?: string
}

export function PlatformListingFrame({ result, frameId, platformSlug, className }: Props) {
  const seoTitle = result.seoTitle ?? ""
  const shortDescription = result.shortDescription ?? ""
  const longDescription = result.longDescription ?? ""
  const metaDescription = result.metaDescription ?? ""
  const tags = Array.isArray(result.tags) ? result.tags : []
  const asHtml = longDescriptionIsHtml(platformSlug)

  const longBlock = asHtml ? (
    <div className={proseLongHtml} dangerouslySetInnerHTML={{ __html: longDescription }} />
  ) : (
    <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{longDescription}</div>
  )

  const longBlockLg = asHtml ? (
    <div className={proseLongHtmlLg} dangerouslySetInnerHTML={{ __html: longDescription }} />
  ) : (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{longDescription}</div>
  )

  if (frameId === "google") {
    return (
      <div className={cn("rounded-2xl border border-border/50 bg-white p-6", className)}>
        <div className="max-w-xl">
          <p className="mb-0.5 text-xs text-gray-400">https://twojsklep.pl › produkt</p>
          <h3 className="cursor-pointer text-lg font-normal text-[#1a0dab] hover:underline">{seoTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{metaDescription}</p>
          <div className="mt-1 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-[10px] text-yellow-400">
                ⭐
              </span>
            ))}
            <span className="text-xs text-gray-400">4,8 (127 opinii) · --- zł</span>
          </div>
        </div>
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-xs font-medium text-emerald-600">
            📊 SEO Score: {seoTitle.length <= 70 ? "✅ Tytuł OK" : "⚠️ Tytuł za długi"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Meta description: {metaDescription?.length ?? 0}/160 znaków</p>
        </div>
      </div>
    )
  }

  if (frameId === "mobile") {
    return (
      <div className={cn("mx-auto max-w-[320px]", className)}>
        <div className="overflow-hidden rounded-4xl border-4 border-gray-800 bg-white shadow-2xl">
          <div className="flex justify-between bg-gray-800 px-4 py-1 text-[10px] text-white">
            <span>9:41</span>
            <span aria-hidden>📶 🔋</span>
          </div>
          <div className="p-3">
            <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gray-100">
              <ImageIcon className="h-8 w-8 text-gray-300" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">{seoTitle}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{shortDescription}</p>
            <p className="mt-2 text-lg font-bold text-gray-900">--- zł</p>
            <button type="button" className="mt-3 w-full rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white">
              Kup teraz
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (frameId === "allegro") {
    const galleryUrls = asHtml ? extractImgSrcsFromHtml(longDescription, 8) : []
    const heroUrl = galleryUrls[0]
    const thumbSlots = 4
    const thumbs = Array.from({ length: thumbSlots }, (_, i) => galleryUrls[i] ?? null)

    const descriptionInner = asHtml ? (
      <div
        className={cn(
          proseAllegroListingRich,
          "after:clear-both after:block after:content-['']"
        )}
        dangerouslySetInnerHTML={{ __html: longDescription }}
      />
    ) : (
      <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{longDescription}</div>
    )

    return (
      <div className={cn("overflow-hidden rounded-2xl border border-border/50 bg-[#f7f7f7]", className)}>
        <div className="flex items-center gap-4 bg-[#FF5A00] px-4 py-2">
          <span className="text-sm font-bold text-white">allegro</span>
          <div className="flex-1 rounded bg-white/20 px-3 py-1 text-xs text-white/70">🔍 Szukaj na Allegro...</div>
          <span className="text-xs text-white/80">🛒 Koszyk</span>
        </div>
        <div className="bg-white px-4 py-2 text-[10px] text-gray-400 shadow-sm">Allegro › Kategoria › Podkategoria</div>

        <div className="grid grid-cols-1 gap-4 bg-[#f7f7f7] p-4 lg:grid-cols-2 lg:gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_2px_16px_-6px_rgba(0,0,0,0.12)]">
              {heroUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- podgląd z URL-i z własnego HTML użytkownika
                <img
                  src={heroUrl}
                  alt=""
                  className="h-full max-h-full w-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="h-12 w-12 text-gray-300" aria-hidden />
                  <span className="text-xs text-gray-400">Brak zdjęcia</span>
                  <span className="sr-only">Brak zdjęcia w opisie — dodaj adresy grafik w polu zdjęć do opisu</span>
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              {thumbs.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-square w-1/4 max-w-[88px] overflow-hidden rounded-lg border border-gray-200/90 bg-white shadow-sm"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-50 text-[11px] text-gray-200" aria-hidden>
                      ···
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-start space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-[0_2px_14px_-8px_rgba(0,0,0,0.12)]">
            <h2 className="text-sm leading-snug font-semibold text-gray-900">{seoTitle}</h2>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-xs text-yellow-400">
                  ⭐
                </span>
              ))}
              <span className="text-xs text-gray-400">(0 opinii)</span>
            </div>
            <p className="text-xl font-bold text-gray-900">--- zł</p>
            <div className="rounded border border-green-200 bg-green-50 px-2 py-1">
              <p className="text-xs text-green-700">✓ Darmowa dostawa</p>
            </div>
            <button type="button" className="w-full rounded bg-[#FF5A00] py-2.5 text-sm font-semibold text-white shadow-sm">
              KUP TERAZ
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200/80 bg-[#f7f7f7] px-4 pb-4 pt-3">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Opis produktu</h3>
            {asHtml ? (
              <p className="text-[10px] text-gray-400">Podgląd szablonu HTML — sekcje, grafiki z opisu, FAQ</p>
            ) : null}
          </div>
          <div className="max-h-[min(520px,62vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.15)] md:p-6">
            {descriptionInner}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-gray-200/80 bg-white px-4 py-3">
          {tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
              {tag}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (frameId === "store") {
    const label = platformSlug === "woocommerce" ? "WooCommerce" : "Sklep"
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-border/50 bg-white", className)}>
        <div className="flex items-center justify-between bg-gray-900 px-4 py-2">
          <span className="text-sm font-medium text-white">🛍️ {label}</span>
          <div className="flex gap-3 text-xs text-white/60">
            <span>Sklep</span>
            <span>O nas</span>
            <span>🛒</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 p-6">
          <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded bg-gray-100">
            <ImageIcon className="h-8 w-8 text-gray-300" aria-hidden />
            <span className="text-xs text-gray-400">Zdjęcie</span>
          </div>
          <div>
            <p className="text-xs tracking-wider text-gray-400 uppercase">Produkt</p>
            <h1 className="mt-1 text-lg font-semibold text-gray-900">{seoTitle}</h1>
            <p className="mt-2 text-xl font-bold text-gray-900">--- zł</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{shortDescription}</p>
            <button type="button" className="mt-4 w-full rounded bg-gray-900 py-2.5 text-sm font-medium text-white">
              Dodaj do koszyka
            </button>
          </div>
        </div>
        <div className="px-6 pb-6">
          <h3 className="mb-2 border-t border-gray-100 pt-4 text-sm font-semibold text-gray-900">Opis</h3>
          {longBlockLg}
        </div>
      </div>
    )
  }

  if (frameId === "global_marketplace") {
    const brand =
      platformSlug === "amazon"
        ? "amazon"
        : platformSlug === "ebay"
          ? "eBay"
          : platformSlug === "etsy"
            ? "Etsy"
            : "Marketplace"
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-border/50 bg-white", className)}>
        <div className="border-b border-gray-200 bg-[#232f3e] px-4 py-2 text-xs font-medium text-white">
          {brand === "amazon" ? "amazon · przykładowy układ" : `${brand} · przykładowy układ`}
        </div>
        <div className="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded bg-gray-100">
              <ImageIcon className="h-8 w-8 text-gray-300" aria-hidden />
              <span className="text-xs text-gray-400">Zdjęcie</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{seoTitle}</h2>
              <p className="mt-2 text-sm whitespace-pre-line text-gray-700">{shortDescription}</p>
              <p className="mt-3 text-lg font-bold text-gray-900">--- zł</p>
              <button type="button" className="mt-3 rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900">
                Kup teraz
              </button>
            </div>
          </div>
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Opis produktu</h3>
            {longBlockLg}
          </div>
        </div>
      </div>
    )
  }

  if (frameId === "plain_classified") {
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-border/50 bg-white", className)}>
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-[10px] text-gray-500">
          Ogłoszenie · przykładowy układ
        </div>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900">{seoTitle}</h2>
          <p className="mt-2 text-2xl font-bold text-gray-900">--- zł</p>
          <p className="mt-4 text-sm text-gray-600">{shortDescription}</p>
          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Opis</p>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{longDescription}</div>
          </div>
        </div>
      </div>
    )
  }

  /* generic_html */
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/50 bg-white", className)}>
      <div className="border-b border-gray-100 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700">
        Sklep / CMS · ogólny HTML
      </div>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">{seoTitle}</h2>
        <p className="mt-2 text-sm text-gray-600">{shortDescription}</p>
        <div className="mt-6 border-t border-gray-100 pt-4">{longBlockLg}</div>
      </div>
    </div>
  )
}
