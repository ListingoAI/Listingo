import { readFileSync, writeFileSync } from 'fs'

const FILE = 'components/generate/hub/FormTabPremium.tsx'
let src = readFileSync(FILE, 'utf8')

// ── 1. Scroll container ────────────────────────────────────────────────────────
const OLD_SCROLL = `                              className="max-h-[min(380px,52vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-white/8 bg-black/25 p-3 [-ms-overflow-style:none] [scrollbar-width:thin]"`
const NEW_SCROLL = `                              className="max-h-[min(420px,56vh)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-linear-to-b from-black/30 via-black/20 to-black/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [-ms-overflow-style:none] [scrollbar-width:thin]"`

if (!src.includes(OLD_SCROLL)) { console.error('SCROLL anchor not found!'); process.exit(1) }
src = src.replace(OLD_SCROLL, NEW_SCROLL)
console.log('✓ scroll container')

// ── 2. "Najpierw uzupełnij" priority block ─────────────────────────────────────
const OLD_PRIO = `                                      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3">
                                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="text-[11px] font-semibold text-cyan-100/95">
                                                Najpierw uzupe\u0142nij
                                              </p>
                                              {PLATFORM_CHIP_PRIORITY[platform] ? (
                                                <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-200/90">
                                                  Priorytet {selectedPlatformLabel}
                                                </span>
                                              ) : null}
                                            </div>
                                            <p className="mt-1 text-[10px] leading-snug text-cyan-100/70">
                                              Najbardziej przydatne pola dla tej kategorii lub nazwy produktu.
                                            </p>
                                          </div>
                                          <span className="rounded-full border border-cyan-500/20 bg-black/20 px-2 py-0.5 text-[10px] text-cyan-100/80">
                                            {chipSections.highlighted.length} p\u00f3l
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {chipSections.highlighted.map(renderFeatureChip)}
                                        </div>
                                      </div>`

const NEW_PRIO = `                                      <div className="rounded-2xl border border-cyan-400/20 bg-linear-to-br from-cyan-500/10 via-teal-500/6 to-black/30 p-4 shadow-[inset_0_1px_0_rgba(103,232,249,0.1)]">
                                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="text-[13px] font-bold tracking-tight text-cyan-100">
                                                Najpierw uzupe\u0142nij
                                              </p>
                                              {PLATFORM_CHIP_PRIORITY[platform] ? (
                                                <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                                                  Priorytet {selectedPlatformLabel}
                                                </span>
                                              ) : null}
                                            </div>
                                            <p className="mt-1 text-[11px] leading-snug text-cyan-200/60">
                                              Najbardziej przydatne pola dla tej kategorii lub nazwy produktu.
                                            </p>
                                          </div>
                                          <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-200/90">
                                            {chipSections.highlighted.length} p\u00f3l
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {chipSections.highlighted.map(renderFeatureChip)}
                                        </div>
                                      </div>`

if (!src.includes(OLD_PRIO)) { console.error('PRIO anchor not found!'); process.exit(1) }
src = src.replace(OLD_PRIO, NEW_PRIO)
console.log('✓ priority block')

// ── 3. Group section card ──────────────────────────────────────────────────────
const OLD_GROUP_DIV = `                                        <div
                                          key={group.id}
                                          className="rounded-xl border border-white/8 bg-white/3 p-3"
                                        >`
const NEW_GROUP_DIV = `                                        <div
                                          key={group.id}
                                          className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 via-white/3 to-transparent p-3.5 transition-colors hover:border-white/12"
                                        >`
if (!src.includes(OLD_GROUP_DIV)) { console.error('GROUP_DIV anchor not found!'); process.exit(1) }
src = src.replace(OLD_GROUP_DIV, NEW_GROUP_DIV)
console.log('✓ group section card')

// ── 4. Group title text ────────────────────────────────────────────────────────
const OLD_GROUP_TITLE = `                                              <p className="text-[11px] font-semibold text-gray-100/95">
                                                {group.title}
                                              </p>
                                              <p className="mt-1 text-[10px] leading-snug text-muted-foreground/75">
                                                {group.hint}
                                              </p>`
const NEW_GROUP_TITLE = `                                              <p className="text-[13px] font-bold tracking-tight text-gray-100">
                                                {group.title}
                                              </p>
                                              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/70">
                                                {group.hint}
                                              </p>`
if (!src.includes(OLD_GROUP_TITLE)) { console.error('GROUP_TITLE anchor not found!'); process.exit(1) }
src = src.replace(OLD_GROUP_TITLE, NEW_GROUP_TITLE)
console.log('✓ group title')

// ── 5. Group counter badge + chevron ──────────────────────────────────────────
const OLD_GROUP_BADGE = `                                              <span className="rounded-full border border-white/8 bg-black/20 px-2 py-0.5 text-[10px] text-muted-foreground/85">
                                                {group.chips.length}
                                              </span>
                                              <ChevronDown
                                                className={cn(
                                                  "mt-0.5 h-4 w-4 text-muted-foreground transition-transform",
                                                  groupOpen && "rotate-180"
                                                )}`
const NEW_GROUP_BADGE = `                                              <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/90">
                                                {group.chips.length}
                                              </span>
                                              <ChevronDown
                                                className={cn(
                                                  "mt-0.5 h-4 w-4 text-muted-foreground/70 transition-transform",
                                                  groupOpen && "rotate-180"
                                                )}`
if (!src.includes(OLD_GROUP_BADGE)) { console.error('GROUP_BADGE anchor not found!'); process.exit(1) }
src = src.replace(OLD_GROUP_BADGE, NEW_GROUP_BADGE)
console.log('✓ group badge')

// ── 6. Group chip row spacing ──────────────────────────────────────────────────
const OLD_CHIP_ROW = `                                            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/6 pt-3">
                                              {group.chips.map(renderFeatureChip)}
                                            </div>`
const NEW_CHIP_ROW = `                                            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/8 pt-3">
                                              {group.chips.map(renderFeatureChip)}
                                            </div>`
if (!src.includes(OLD_CHIP_ROW)) { console.error('CHIP_ROW anchor not found!'); process.exit(1) }
src = src.replace(OLD_CHIP_ROW, NEW_CHIP_ROW)
console.log('✓ chip row spacing')

// ── 7. "Pozostałe" extra group ─────────────────────────────────────────────────
const OLD_EXTRA_DIV = `                                      <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                                        <button
                                          type="button"
                                          onClick={() => toggleFeatureChipGroup("extra")}`
const NEW_EXTRA_DIV = `                                      <div className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 via-white/3 to-transparent p-3.5 transition-colors hover:border-white/12">
                                        <button
                                          type="button"
                                          onClick={() => toggleFeatureChipGroup("extra")}`
if (!src.includes(OLD_EXTRA_DIV)) { console.error('EXTRA_DIV anchor not found!'); process.exit(1) }
src = src.replace(OLD_EXTRA_DIV, NEW_EXTRA_DIV)
console.log('✓ extra group card')

// ── 8. "Pozostałe" title ──────────────────────────────────────────────────────
const OLD_EXTRA_TITLE = `                                            <p className="text-[11px] font-semibold text-gray-100/95">
                                              Pozosta\u0142e
                                            </p>
                                            <p className="mt-1 text-[10px] leading-snug text-muted-foreground/75">
                                              Mniej typowe pola, kt\u00f3re nadal mog\u0105 si\u0119 przyda\u0107.
                                            </p>`
const NEW_EXTRA_TITLE = `                                            <p className="text-[13px] font-bold tracking-tight text-gray-100">
                                              Pozosta\u0142e
                                            </p>
                                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/70">
                                              Mniej typowe pola, kt\u00f3re nadal mog\u0105 si\u0119 przyda\u0107.
                                            </p>`
if (!src.includes(OLD_EXTRA_TITLE)) { console.error('EXTRA_TITLE anchor not found!'); process.exit(1) }
src = src.replace(OLD_EXTRA_TITLE, NEW_EXTRA_TITLE)
console.log('✓ extra group title')

// ── 9. Extra group badge ──────────────────────────────────────────────────────
const OLD_EXTRA_BADGE = `                                            <span className="rounded-full border border-white/8 bg-black/20 px-2 py-0.5 text-[10px] text-muted-foreground/85">
                                              {chipSections.extra.length}
                                            </span>`
const NEW_EXTRA_BADGE = `                                            <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/90">
                                              {chipSections.extra.length}
                                            </span>`
if (!src.includes(OLD_EXTRA_BADGE)) { console.error('EXTRA_BADGE anchor not found!'); process.exit(1) }
src = src.replace(OLD_EXTRA_BADGE, NEW_EXTRA_BADGE)
console.log('✓ extra group badge')

// ── 10. Extra chip row ─────────────────────────────────────────────────────────
const OLD_EXTRA_CHIPS = `                                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/6 pt-3">
                                            {chipSections.extra.map(renderFeatureChip)}`
const NEW_EXTRA_CHIPS = `                                          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/8 pt-3">
                                            {chipSections.extra.map(renderFeatureChip)}`
if (!src.includes(OLD_EXTRA_CHIPS)) { console.error('EXTRA_CHIPS anchor not found!'); process.exit(1) }
src = src.replace(OLD_EXTRA_CHIPS, NEW_EXTRA_CHIPS)
console.log('✓ extra chip row')

writeFileSync(FILE, src, 'utf8')
console.log('\nAll done!')
