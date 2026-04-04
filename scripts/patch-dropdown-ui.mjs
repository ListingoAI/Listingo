import { readFileSync, writeFileSync } from 'fs'

const FILE = 'components/generate/hub/FormTabPremium.tsx'
let src = readFileSync(FILE, 'utf8')

// ── Find the block start/end markers ──────────────────────────────────────────
// Start: immediately after the DropdownMenuContent opening tag we already updated
const START_ANCHOR = '        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-normal leading-snug text-muted-foreground">'
const END_ANCHOR   = '      </DropdownMenuContent>'

const startIdx = src.indexOf(START_ANCHOR)
const endIdx   = src.indexOf(END_ANCHOR, startIdx)

if (startIdx === -1 || endIdx === -1) {
  console.error('Anchors not found! startIdx=', startIdx, 'endIdx=', endIdx)
  process.exit(1)
}

console.log(`Replacing lines ${startIdx}–${endIdx + END_ANCHOR.length}`)

const NEW_INNER = `        {/* sticky header */}
        <div className="shrink-0 border-b border-white/8 bg-gray-950/90 px-3 pb-2.5 pt-3 backdrop-blur-md">
          <p className="mb-2 text-[11px] leading-snug text-muted-foreground/80">
            Zaznacz warto\u015bci \u2014 wstawimy jedn\u0105 lini\u0119 po przecinku.
            {chip.key === "gram" ? " Albo wybierz pusty nag\u0142\u00f3wek i wpisz liczb\u0119 r\u0119cznie." : null}
          </p>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-black/50 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-cyan-400/60" aria-hidden />
              <input
                type="search"
                placeholder="Szukaj\u2026"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-100 placeholder:text-muted-foreground/40 focus:outline-none"
                autoComplete="off"
                aria-label="Filtruj presety"
              />
            </div>
          </div>
        </div>

        {/* scrollable list */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
          {filteredPresets.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">Brak wynik\u00f3w \u2014 zmie\u0144 wyszukiwanie</p>
          ) : (
            filteredPresets.map((p, idx) =>
              isChipPresetValueRow(p) ? (
                <DropdownMenuCheckboxItem
                  key={\`\${chip.key}-\${p.label}-\${p.value}\`}
                  className="cursor-pointer rounded-xl py-2.5 pl-9 pr-3 text-[14px] leading-snug text-gray-100 focus:bg-white/8"
                  checked={selected.has(p.value)}
                  onCheckedChange={(c) => {
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (c === true) next.add(p.value)
                      else next.delete(p.value)
                      return next
                    })
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {p.label}
                </DropdownMenuCheckboxItem>
              ) : (
                <div key={\`\${chip.key}-h-\${idx}-\${p.label}\`} className={cn("px-0.5", idx > 0 && "mt-2")}>
                  {idx > 0 ? <div className="mb-1.5 border-t border-white/6" /> : null}
                  <div className="flex items-center gap-2 rounded-xl bg-linear-to-r from-cyan-500/10 via-teal-500/6 to-transparent px-3 py-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" aria-hidden />
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-cyan-300/90">
                      {p.label}
                    </span>
                  </div>
                </div>
              )
            )
          )}
        </div>

        {/* sticky footer */}
        <div className="shrink-0 space-y-1 border-t border-white/10 bg-gray-950/90 px-2 py-2 backdrop-blur-md">
          <DropdownMenuItem
            className={cn(
              "cursor-pointer justify-center rounded-xl py-3 text-center text-[14px] font-semibold transition-colors",
              selected.size > 0
                ? "bg-emerald-500/18 text-emerald-100 focus:bg-emerald-500/28"
                : "pointer-events-none opacity-35"
            )}
            disabled={selected.size === 0}
            onSelect={() => {
              const ordered = presets
                .filter(isChipPresetValueRow)
                .filter((p) => selected.has(p.value))
                .map((p) => p.value)
              onApplySelectedValues(ordered)
            }}
          >
            {selected.size > 0 ? \`Wstaw wybrane (\${selected.size})\` : "Wstaw wybrane"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer justify-center rounded-xl py-2.5 text-center text-[13px] text-muted-foreground focus:bg-white/8 focus:text-gray-100"
            onSelect={() => onApplySelectedValues([])}
          >
            Tylko nag\u0142\u00f3wek (pusty szablon)
          </DropdownMenuItem>
          {used ? (
            <DropdownMenuItem
              className="cursor-pointer justify-center rounded-xl py-2.5 text-center text-[13px] text-amber-200/80 focus:bg-amber-500/15 focus:text-amber-100"
              onSelect={() => onRemoveInsert()}
            >
              {filled ? \`Usu\u0144 sekcj\u0119 "\${chip.label}"\u2026\` : "Usu\u0144 lini\u0119"}
            </DropdownMenuItem>
          ) : null}
        </div>
      </DropdownMenuContent>`

src = src.slice(0, startIdx) + NEW_INNER + src.slice(endIdx + END_ANCHOR.length)
writeFileSync(FILE, src, 'utf8')
console.log('Done! File updated.')
