"use client"

import { parseFeaturesBulletSections } from "@/lib/generation/parse-features-bullet-sections"
import { cn } from "@/lib/utils"

function sectionStyle(title: string): {
  border: string
  label: string
  dot: string
} {
  const l = title.toLowerCase()
  if (l.includes('wymiar') || l.includes('parametr'))
    return {
      border: 'border-cyan-500/30 bg-cyan-500/7',
      label: 'text-cyan-300/95',
      dot: 'bg-cyan-400/80',
    }
  if (l.includes('wniosek') || l.includes('gwarancja'))
    return {
      border: 'border-amber-500/30 bg-amber-500/7',
      label: 'text-amber-200/95',
      dot: 'bg-amber-400/80',
    }
  if (l.includes('wad') || (l.includes('uwag') && l.includes('widoczn')))
    return {
      border: 'border-rose-500/25 bg-rose-500/6',
      label: 'text-rose-200/90',
      dot: 'bg-rose-400/75',
    }
  if (l.includes('zestaw') || l.includes('części') || l.includes('montaż'))
    return {
      border: 'border-white/12 bg-white/4',
      label: 'text-gray-200/95',
      dot: 'bg-gray-400/70',
    }
  return {
    border: 'border-emerald-500/30 bg-emerald-500/7',
    label: 'text-emerald-200/95',
    dot: 'bg-emerald-400/75',
  }
}

type Props = {
  text: string
  className?: string
}

/** Czytelny podgląd list z nagłówkami — treść edytujesz w polu niżej. */
export function FeaturesSectionPreview({ text, className }: Props) {
  const sections = parseFeaturesBulletSections(text)
  if (sections.length === 0) return null

  return (
    <div
      className={cn("mb-4 space-y-2.5", className)}
      role="region"
      aria-label="Podgląd sekcji cech"
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/85">
        Podgląd (czytelnie)
      </p>
      <div className="grid gap-2.5">
        {sections.map((sec, i) => {
          const st = sectionStyle(sec.title)
          return (
            <div
              key={`${sec.title}-${i}`}
              className={cn(
                'rounded-xl border px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
                st.border
              )}
            >
              <p className={cn('text-[11px] font-semibold leading-snug', st.label)}>{sec.title}</p>
              <ul className="mt-2 space-y-1.5 pl-0.5">
                {sec.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-[12px] leading-relaxed text-gray-200/95">
                    <span
                      className={cn('mt-1.5 h-1 w-1 shrink-0 rounded-full', st.dot)}
                      aria-hidden
                    />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
