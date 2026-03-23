"use client"

import { useId } from "react"

import { cn } from "@/lib/utils"

type SparkTone = "emerald" | "blue" | "amber" | "violet"

const strokeMap: Record<SparkTone, string> = {
  emerald: "stroke-emerald-400",
  blue: "stroke-sky-400",
  amber: "stroke-amber-400",
  violet: "stroke-violet-400",
}

const fillStopRgb: Record<SparkTone, string> = {
  emerald: "rgb(52, 211, 153)",
  blue: "rgb(56, 189, 248)",
  amber: "rgb(251, 191, 36)",
  violet: "rgb(167, 139, 250)",
}

function buildPoints(
  values: number[],
  width: number,
  height: number,
  pad: number
): { x: number; y: number }[] {
  const n = values.length
  if (n === 0) return []
  const maxV = Math.max(...values, 1)
  const minV = 0
  const span = Math.max(maxV - minV, 1)
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  return values.map((v, i) => {
    const x = pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
    const y = pad + innerH - ((v - minV) / span) * innerH
    return { x, y }
  })
}

/** Lekki wykres liniowy z wypełnieniem (trend tygodniowy). */
export function MiniAreaSpark({
  values,
  tone = "emerald",
  className,
  height = 44,
  width = 108,
  ariaLabel,
}: {
  values: number[]
  tone?: SparkTone
  className?: string
  height?: number
  width?: number
  /** Krótki opis dla czytników (np. „Generacje: ostatnie 7 dni”). */
  ariaLabel: string
}) {
  const gradId = useId().replace(/:/g, "")
  const pad = 3
  const pts = buildPoints(values, width, height, pad)
  if (pts.length === 0) {
    return (
      <div
        className={cn("text-muted-foreground/40", className)}
        style={{ width, height }}
        role="img"
        aria-label={ariaLabel}
      />
    )
  }

  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const first = pts[0]
  const last = pts[pts.length - 1]
  const areaD = `${lineD} L ${last.x} ${height - pad} L ${first.x} ${height - pad} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={fillStopRgb[tone]}
            stopOpacity={0.4}
          />
          <stop offset="100%" stopColor="transparent" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={areaD}
        fill={`url(#${gradId})`}
        className="opacity-90"
      />
      <path
        d={lineD}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={cn(strokeMap[tone])}
      />
    </svg>
  )
}

/** Kompaktowe słupki (np. „intensywność” dni). */
export function MiniBarSpark({
  values,
  tone = "amber",
  className,
  height = 44,
  width = 108,
  ariaLabel,
}: {
  values: number[]
  tone?: SparkTone
  className?: string
  height?: number
  width?: number
  ariaLabel: string
}) {
  const n = values.length
  const maxV = Math.max(...values, 1)
  const gap = 3
  const barW = n > 0 ? (width - gap * (n + 1)) / n : 0
  const padY = 4

  const barClass =
    tone === "emerald"
      ? "fill-emerald-400/80"
      : tone === "blue"
        ? "fill-sky-400/80"
        : tone === "violet"
          ? "fill-violet-400/80"
          : "fill-amber-400/80"

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      {values.map((v, i) => {
        const bh = maxV > 0 ? ((v / maxV) * (height - padY * 2)) : 0
        const x = gap + i * (barW + gap)
        const y = height - padY - bh
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={Math.max(barW, 2)}
            height={Math.max(bh, v > 0 ? 2 : 1)}
            rx={2}
            className={cn(barClass, v === 0 && "fill-muted-foreground/15")}
          />
        )
      })}
    </svg>
  )
}

/** Trend jakości 0–100 (stała skala, żeby słabe dni były niżej). */
export function MiniQualitySpark({
  values,
  className,
  height = 44,
  width = 108,
  ariaLabel,
}: {
  values: number[]
  className?: string
  height?: number
  width?: number
  ariaLabel: string
}) {
  const gradId = useId().replace(/:/g, "")
  const pad = 3
  const maxV = 100
  const minV = 0
  const n = values.length
  if (n === 0) {
    return (
      <div style={{ width, height }} className={className} role="img" aria-label={ariaLabel} />
    )
  }
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const pts = values.map((v, i) => {
    const x = pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
    const clamped = Math.min(100, Math.max(0, v))
    const y = pad + innerH - (clamped / (maxV - minV)) * innerH
    return { x, y }
  })
  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const first = pts[0]
  const last = pts[pts.length - 1]
  const areaD = `${lineD} L ${last.x} ${height - pad} L ${first.x} ${height - pad} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(56, 189, 248)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} className="opacity-90" />
      <path
        d={lineD}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-sky-400"
      />
    </svg>
  )
}

/** Dekoracyjny „krok” planu (bez danych czasowych). */
export function PlanTierSpark({
  plan,
  className,
}: {
  plan: "free" | "starter" | "pro"
  className?: string
}) {
  const active =
    plan === "free" ? 1 : plan === "starter" ? 2 : 3
  const w = 108
  const h = 44
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={`Poziom planu: ${active} z 3`}
    >
      <title>Poziom planu</title>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={10 + i * 32}
          y={h / 2 - (8 + i * 6) / 2}
          width={26}
          height={8 + i * 6}
          rx={4}
          className={
            i < active
              ? "fill-violet-400/85"
              : "fill-muted-foreground/12"
          }
        />
      ))}
    </svg>
  )
}
