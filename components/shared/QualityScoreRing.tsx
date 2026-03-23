"use client"

/** Obwód koła r=14 w viewBox 36×36 (≈ 87.96) */
const RING_LEN = 88

export function QualityScoreRing({ score }: { score: number }) {
  const s = Math.min(100, Math.max(0, score))
  const offset = RING_LEN - (RING_LEN * s) / 100
  const stroke =
    s >= 80 ? "#10B981" : s >= 60 ? "#EAB308" : "#EF4444"

  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      className="shrink-0 text-foreground"
      aria-hidden
    >
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke="hsl(217.2 32.6% 17.5%)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeDasharray={RING_LEN}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
        className="transition-all duration-1000"
      />
      <text
        x="18"
        y="18"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        className="text-[9px] font-bold"
      >
        {s}
      </text>
    </svg>
  )
}
