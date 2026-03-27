"use client"

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Loader2,
  PenLine,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  parseCategoryField,
  serializeCategorySelection,
} from "@/lib/allegro/category-selection"
import type {
  CategorySelection,
  CategorySelectionTree,
} from "@/lib/allegro/types"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type Crumb = { id: string; name: string }
type ChildRow = { id: string; name: string; leaf: boolean }
type SearchHit = { id: string; name: string; path: string[]; pathLabel: string }

type Props = {
  value: string
  onChange: (value: string) => void
  id?: string
  productName?: string
  features?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoryCombobox({
  value,
  onChange,
  id = "category",
  productName = "",
  features = "",
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // --- drill-down ---
  const [stack, setStack] = useState<Crumb[]>([])
  const [children, setChildren] = useState<ChildRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // --- custom category ---
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState("")
  const customInputRef = useRef<HTMLInputElement>(null)

  // --- search ---
  const [query, setQuery] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [hits, setHits] = useState<SearchHit[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- suggest ---
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [suggestMessage, setSuggestMessage] = useState<string | null>(null)
  const [suggestCandidates, setSuggestCandidates] = useState<SearchHit[]>([])
  const [suggestCooldown, setSuggestCooldown] = useState(false)
  const lastSuggestInput = useRef("")

  const parsed = parseCategoryField(value)
  const isSearchActive = query.trim().length > 0

  useEffect(() => {
    if (parsed.type === "legacy") onChange("")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const parentId = stack.length ? stack[stack.length - 1].id : null

  // ---------------------------------------------------------------------------
  // Fetch children for drill-down
  // ---------------------------------------------------------------------------
  const fetchChildren = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const q =
        parentId === null ? "" : `parentId=${encodeURIComponent(parentId)}`
      const res = await fetch(`/api/categories/children?${q}`)
      const data = (await res.json()) as {
        ok?: boolean
        children?: ChildRow[]
        error?: string
      }
      if (!data.ok) {
        setLoadError(data.error ?? "Błąd wczytywania")
        setChildren([])
        return
      }
      setChildren(data.children ?? [])
    } catch {
      setLoadError("Nie udało się wczytać listy")
      setChildren([])
    } finally {
      setLoading(false)
    }
  }, [parentId])

  useEffect(() => {
    if (!open || customMode) return
    void fetchChildren()
  }, [open, customMode, fetchChildren])

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  const fetchSearch = useCallback(async (q: string) => {
    setSearchLoading(true)
    try {
      const res = await fetch(
        `/api/categories/search?q=${encodeURIComponent(q)}&limit=40`
      )
      const data = (await res.json()) as { ok?: boolean; results?: SearchHit[] }
      setHits(data.results ?? [])
    } catch {
      setHits([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open || !isSearchActive) {
      setHits([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchSearch(query)
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, isSearchActive, query, fetchSearch])

  // ---------------------------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------------------------
  const toggleOpen = () =>
    setOpen((o) => {
      const next = !o
      if (next) {
        setStack([])
        setCustomMode(false)
        setCustomText("")
        setQuery("")
        setHits([])
      }
      return next
    })

  const close = useCallback(() => {
    setOpen(false)
    setCustomMode(false)
    setQuery("")
  }, [])

  useEffect(() => {
    if (open && !customMode) {
      setTimeout(() => searchRef.current?.focus(), 80)
    }
  }, [open, customMode])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [close])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close])

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------
  function selectTreeLeaf(hit: {
    id: string
    name: string
    path: string[]
  }) {
    const sel: CategorySelectionTree = {
      kind: "category",
      id: hit.id,
      mainCategory: hit.path[0],
      categoryPath: hit.path,
      leafCategory: hit.name,
    }
    onChange(serializeCategorySelection(sel))
    close()
  }

  function onPickChild(node: ChildRow) {
    if (node.leaf) {
      const path = [...stack.map((c) => c.name), node.name]
      selectTreeLeaf({ id: node.id, name: node.name, path })
      return
    }
    setStack((s) => [...s, { id: node.id, name: node.name }])
    setQuery("")
  }

  function goBack() {
    setStack((s) => s.slice(0, -1))
  }

  function goToCrumbIndex(index: number) {
    if (index <= 0) setStack([])
    else setStack((s) => s.slice(0, index))
  }

  function enterCustomMode() {
    setCustomMode(true)
    setQuery("")
    setTimeout(() => customInputRef.current?.focus(), 60)
  }

  function confirmCustom() {
    const t = customText.trim()
    if (!t) return
    const sel: CategorySelection = { kind: "custom", customCategory: t }
    onChange(serializeCategorySelection(sel))
    close()
  }

  const canSuggest =
    !suggesting &&
    !suggestCooldown &&
    (productName.trim().length + features.trim().length >= 5)

  function clearSuggestState() {
    setSuggestError(null)
    setSuggestMessage(null)
    setSuggestCandidates([])
  }

  async function runSuggest() {
    if (!canSuggest) return

    const inputFingerprint = `${productName.trim()}||${features.trim()}`
    if (inputFingerprint === lastSuggestInput.current) return
    lastSuggestInput.current = inputFingerprint

    setSuggesting(true)
    clearSuggestState()
    try {
      const res = await fetch("/api/categories/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          features: features.trim(),
        }),
      })
      type Candidate = { id: string; leafName: string; path: string[]; pathLabel: string }
      const data = (await res.json()) as {
        ok?: boolean
        confidence?: "high" | "medium" | "none"
        suggestion?: Candidate
        candidates?: Candidate[]
        error?: string
        retryAfterMs?: number
      }

      if (res.status === 429) {
        setSuggestError(data.error ?? "Limit zapytań. Spróbuj za chwilę.")
        setSuggestCooldown(true)
        const wait = data.retryAfterMs ?? 60_000
        setTimeout(() => setSuggestCooldown(false), Math.min(wait, 120_000))
        lastSuggestInput.current = ""
        return
      }

      if (!data.ok && data.error) {
        setSuggestError(data.error)
        lastSuggestInput.current = ""
        return
      }

      const cands: SearchHit[] = (data.candidates ?? []).map((c) => ({
        id: c.id,
        name: c.leafName,
        path: c.path,
        pathLabel: c.pathLabel,
      }))

      if (data.confidence === "high" && data.suggestion) {
        const s = data.suggestion
        const sel: CategorySelectionTree = {
          kind: "category",
          id: s.id,
          mainCategory: s.path[0],
          categoryPath: s.path,
          leafCategory: s.leafName,
        }
        onChange(serializeCategorySelection(sel))
        setSuggestMessage(`Wybrano: ${s.path.join(" › ")}`)
        setSuggestCandidates([])
      } else if (data.confidence === "medium" && cands.length > 0) {
        setSuggestMessage(
          "Nie znaleziono jednej pewnej kategorii. Wybierz jedną z propozycji poniżej lub doprecyzuj cechy."
        )
        setSuggestCandidates(cands)
      } else {
        setSuggestMessage(
          "Nie udało się dopasować kategorii. Dodaj więcej cech produktu lub wybierz ręcznie z listy."
        )
        setSuggestCandidates([])
      }

      setSuggestCooldown(true)
      setTimeout(() => setSuggestCooldown(false), 3000)
    } catch {
      setSuggestError("Błąd połączenia. Spróbuj ponownie.")
      lastSuggestInput.current = ""
    } finally {
      setSuggesting(false)
    }
  }

  function pickSuggestedCandidate(hit: SearchHit) {
    const sel: CategorySelectionTree = {
      kind: "category",
      id: hit.id,
      mainCategory: hit.path[0],
      categoryPath: hit.path,
      leafCategory: hit.name,
    }
    onChange(serializeCategorySelection(sel))
    setSuggestMessage(`Wybrano: ${hit.path.join(" › ")}`)
    setSuggestCandidates([])
  }

  // ---------------------------------------------------------------------------
  // Display
  // ---------------------------------------------------------------------------
  const summary = (() => {
    if (parsed.type === "category")
      return parsed.selection.categoryPath.join(" › ")
    if (parsed.type === "custom")
      return `Własna: ${parsed.selection.customCategory}`
    return null
  })()

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div ref={rootRef} className="space-y-2">
      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          id={id}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={toggleOpen}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-foreground shadow-inner transition-all",
            "hover:border-white/20 hover:bg-black/40",
            "focus:border-emerald-500 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/12",
            open && "border-emerald-500/45 ring-[3px] ring-cyan-500/10"
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <FolderOpen className="h-4 w-4 shrink-0 text-cyan-400/80" />
            <span className="truncate">
              {summary ?? "Wybierz kategorię"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown panel */}
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+6px)] z-50 origin-top overflow-hidden rounded-xl border border-white/10 bg-gray-900/95 shadow-2xl backdrop-blur-xl transition-[opacity,transform] duration-200",
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-[0.98] opacity-0"
          )}
        >
          {customMode ? (
            /* ===== Custom category input ===== */
            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-emerald-500/30 hover:bg-white/5 hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Wstecz
                </button>
                <span className="text-xs font-semibold text-foreground">
                  Inne / Własna kategoria
                </span>
              </div>
              <p className="mb-3 text-[10px] leading-snug text-muted-foreground/80">
                Wpisz nazwę kategorii. AI wykorzysta ją jako kontekst branżowy.
              </p>
              <div className="flex gap-2">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      confirmCustom()
                    }
                  }}
                  placeholder="np. Artykuły papiernicze, Karma wegańska…"
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/12"
                />
                <button
                  type="button"
                  disabled={!customText.trim()}
                  onClick={confirmCustom}
                  className="shrink-0 rounded-lg bg-emerald-600/80 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
                >
                  Zatwierdź
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ===== Search input (always visible) ===== */}
              <div className="border-b border-white/10 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Szukaj kategorii…"
                    className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/12"
                  />
                </div>
              </div>

              {isSearchActive ? (
                /* ===== Search results ===== */
                <ul
                  role="listbox"
                  className="scrollbar-hub max-h-64 overflow-y-auto py-1"
                >
                  {searchLoading ? (
                    <li className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Szukam…
                    </li>
                  ) : hits.length > 0 ? (
                    hits.map((h) => {
                      const sel =
                        parsed.type === "category" &&
                        parsed.selection.id === h.id
                      return (
                        <li key={h.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={sel}
                            className={cn(
                              "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5",
                              sel ? "bg-emerald-500/12" : ""
                            )}
                            onClick={() =>
                              selectTreeLeaf({
                                id: h.id,
                                name: h.name,
                                path: h.path,
                              })
                            }
                          >
                            <span className="font-medium text-foreground/95">
                              {h.name}
                            </span>
                            <span className="truncate text-[10px] text-muted-foreground/80">
                              {h.pathLabel}
                            </span>
                          </button>
                        </li>
                      )
                    })
                  ) : (
                    <li className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                      Brak wyników dla &quot;{query}&quot;
                    </li>
                  )}
                </ul>
              ) : (
                <>
                  {/* ===== Breadcrumb ===== */}
                  <div className="border-b border-white/10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {stack.length > 0 && (
                        <button
                          type="button"
                          onClick={goBack}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-emerald-500/30 hover:bg-white/5 hover:text-foreground"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <nav
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground"
                        aria-label="Ścieżka kategorii"
                      >
                        <button
                          type="button"
                          onClick={() => goToCrumbIndex(0)}
                          className={cn(
                            "shrink-0 rounded px-0.5 transition-colors hover:text-emerald-200/90",
                            stack.length === 0
                              ? "font-semibold text-foreground"
                              : ""
                          )}
                        >
                          Wszystkie
                        </button>
                        {stack.map((c, i) => (
                          <span
                            key={c.id}
                            className="flex items-center gap-1"
                          >
                            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                            <button
                              type="button"
                              onClick={() => goToCrumbIndex(i + 1)}
                              className={cn(
                                "min-w-0 truncate rounded px-0.5 text-left transition-colors hover:text-emerald-200/90",
                                i === stack.length - 1
                                  ? "font-semibold text-foreground"
                                  : ""
                              )}
                            >
                              {c.name}
                            </button>
                          </span>
                        ))}
                      </nav>
                    </div>
                  </div>

                  {/* ===== Category list (drill-down) ===== */}
                  <ul
                    role="listbox"
                    className="scrollbar-hub max-h-56 overflow-y-auto py-1"
                  >
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={value === ""}
                        onClick={() => {
                          onChange("")
                          close()
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                      >
                        {value === "" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <span className="w-3.5" />
                        )}
                        Brak kategorii
                      </button>
                    </li>

                    {loading ? (
                      <li className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Wczytywanie…
                      </li>
                    ) : loadError ? (
                      <li className="px-3 py-4 text-center text-[11px] text-amber-200/80">
                        {loadError}
                      </li>
                    ) : (
                      children.map((node) => {
                        const selected =
                          parsed.type === "category" &&
                          parsed.selection.id === node.id
                        return (
                          <li key={node.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => onPickChild(node)}
                              className={cn(
                                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5",
                                selected
                                  ? "bg-emerald-500/12 text-emerald-100"
                                  : "text-foreground/90"
                              )}
                            >
                              <span className="flex min-w-0 flex-1 items-center gap-2">
                                {selected ? (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                ) : (
                                  <span className="w-3.5 shrink-0" />
                                )}
                                <span className="truncate font-medium">
                                  {node.name}
                                </span>
                              </span>
                              {!node.leaf && (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                              )}
                            </button>
                          </li>
                        )
                      })
                    )}
                    {!loading && !loadError && children.length === 0 && (
                      <li className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                        Brak podkategorii na tym poziomie.
                      </li>
                    )}
                  </ul>

                  {/* ===== Footer: Inne / Własna ===== */}
                  {stack.length === 0 && (
                    <div className="border-t border-white/10">
                      <button
                        type="button"
                        onClick={enterCustomMode}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-white/5",
                          parsed.type === "custom"
                            ? "bg-emerald-500/12 text-emerald-100"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {parsed.type === "custom" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <PenLine className="h-3.5 w-3.5" />
                        )}
                        <span className="font-medium">Inne / Własna</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions below the picker */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canSuggest}
            aria-busy={suggesting}
            aria-label={
              suggesting
                ? "Dopasowywanie kategorii do nazwy i cech"
                : "Zasugeruj kategorię na podstawie nazwy i cech produktu"
            }
            onClick={() => void runSuggest()}
            className={cn(
              "group inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
              "border-emerald-500/35 bg-linear-to-b from-emerald-500/9 via-emerald-950/20 to-black/45",
              "text-emerald-100 shadow-sm shadow-black/40",
              "hover:border-emerald-400/50 hover:from-emerald-500/14 hover:via-emerald-950/25 hover:to-black/55 hover:shadow-md hover:shadow-emerald-950/30",
              "active:scale-[0.99] active:brightness-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
              "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-emerald-500/35 disabled:hover:shadow-sm",
              suggesting &&
                "pointer-events-none border-emerald-400/40 from-emerald-500/12 shadow-emerald-950/25"
            )}
          >
            {suggesting ? (
              <>
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin text-emerald-300/90"
                  aria-hidden
                />
                <span className="text-emerald-50/95">Dopasowuję…</span>
              </>
            ) : suggestCooldown ? (
              <>
                <Sparkles
                  className="h-4 w-4 shrink-0 text-emerald-400/50"
                  aria-hidden
                />
                <span className="text-emerald-200/75">Za chwilę…</span>
              </>
            ) : (
              <>
                <Sparkles
                  className="h-4 w-4 shrink-0 text-emerald-400/85 transition-transform duration-200 group-hover:scale-105 group-hover:text-emerald-300/90"
                  aria-hidden
                />
                <span>Zasugeruj kategorię</span>
              </>
            )}
          </button>
          {value !== "" && (
            <button
              type="button"
              onClick={() => {
                onChange("")
                clearSuggestState()
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-red-400/30 hover:text-red-300"
            >
              <X className="h-3 w-3" />
              Wyczyść
            </button>
          )}
        </div>

        {suggestError && (
          <p className="text-[10px] leading-snug text-amber-200/70">
            {suggestError}
          </p>
        )}

        {suggestMessage && !suggestError && (
          <p
            className={cn(
              "text-[10px] leading-snug",
              suggestCandidates.length > 0
                ? "text-cyan-200/70"
                : suggestMessage.startsWith("Wybrano:")
                  ? "text-emerald-300/80"
                  : "text-muted-foreground/70"
            )}
          >
            {suggestMessage}
          </p>
        )}

        {suggestCandidates.length > 0 && (
          <ul className="space-y-0.5 rounded-lg border border-white/8 bg-black/20 p-1">
            {suggestCandidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pickSuggestedCandidate(c)}
                  className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                >
                  <span className="text-xs font-medium text-foreground/95">
                    {c.name}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground/70">
                    {c.pathLabel}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { formatCategoryFieldForDisplay } from "@/lib/allegro/category-selection"
