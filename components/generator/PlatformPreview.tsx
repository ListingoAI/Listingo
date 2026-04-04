"use client"

import { useEffect, useState } from "react"

import { PlatformListingFrame } from "@/components/generator/PlatformListingFrame"
import type { GenerateResponse } from "@/lib/types"
import { getPlatformProfile } from "@/lib/platforms"
import { getPreviewFrameIdForSlug } from "@/lib/platforms/preview-family"
import type { PreviewFrameId } from "@/lib/platforms/preview-family"

type PreviewTab = "platform" | "google" | "mobile"

type PlatformPreviewProps = {
  result: GenerateResponse
  platform: string
}

export function PlatformPreview({ result, platform }: PlatformPreviewProps) {
  const profile = getPlatformProfile(platform)
  const [tab, setTab] = useState<PreviewTab>("platform")

  useEffect(() => {
    setTab("platform")
  }, [platform, result?.seoTitle])

  const frameIdForPlatform = getPreviewFrameIdForSlug(platform)

  const tabBtn = (id: PreviewTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all sm:text-sm ${
        tab === id
          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
          : "border-border/50 bg-card/50 text-muted-foreground hover:border-emerald-500/30"
      }`}
    >
      {label}
    </button>
  )

  const renderFrame = (id: PreviewFrameId) => (
    <PlatformListingFrame result={result} frameId={id} platformSlug={platform} />
  )

  return (
    <div className="space-y-4">
      <div className="mb-2 flex flex-wrap gap-2">
        {tabBtn("platform", `Podgląd: ${profile.name}`)}
        {tabBtn("google", "Google (SERP)")}
        {tabBtn("mobile", "Mobile")}
      </div>

      {tab === "platform" ? renderFrame(frameIdForPlatform) : null}
      {tab === "google" ? renderFrame("google") : null}
      {tab === "mobile" ? renderFrame("mobile") : null}

      <p className="mt-4 text-center text-xs italic text-muted-foreground">
        Podgląd ma charakter poglądowy. Rzeczywisty wygląd może się różnić.
      </p>
    </div>
  )
}

export default PlatformPreview
