import type {
  CategorySelection,
  CategorySelectionCustom,
  CategorySelectionTree,
} from "./types"

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

type ParseResult =
  | { type: "category"; selection: CategorySelectionTree }
  | { type: "custom"; selection: CategorySelectionCustom }
  | { type: "legacy"; label: string }
  | { type: "empty" }

/** Rozpoznaje zapisane pole `category` — nowy format, stary `kind:"allegro"`, tekst, puste. */
export function parseCategoryField(raw: string | null | undefined): ParseResult {
  if (raw == null || raw.trim() === "") return { type: "empty" }
  const t = raw.trim()
  if (!t.startsWith("{")) return { type: "legacy", label: t }

  try {
    const o = JSON.parse(t) as Record<string, unknown>

    if (o.kind === "category") {
      const sel = o as Partial<CategorySelectionTree>
      if (
        sel.id &&
        sel.mainCategory &&
        Array.isArray(sel.categoryPath) &&
        sel.leafCategory
      ) {
        return {
          type: "category",
          selection: {
            kind: "category",
            id: String(sel.id),
            mainCategory: String(sel.mainCategory),
            categoryPath: sel.categoryPath.map(String),
            leafCategory: String(sel.leafCategory),
          },
        }
      }
    }

    if (o.kind === "custom") {
      const cc = String((o as { customCategory?: unknown }).customCategory ?? "")
      if (cc) return { type: "custom", selection: { kind: "custom", customCategory: cc } }
    }

    // backward-compat: old `kind:"allegro"` selection
    if (o.kind === "allegro") {
      const path = Array.isArray(o.path) ? (o.path as string[]).map(String) : []
      const leafName = String(o.leafName ?? "")
      if (o.id && path.length > 0) {
        return {
          type: "category",
          selection: {
            kind: "category",
            id: String(o.id),
            mainCategory: path[0],
            categoryPath: path,
            leafCategory: leafName || path[path.length - 1],
          },
        }
      }
    }
  } catch {
    /* fallthrough */
  }
  return { type: "legacy", label: t }
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

export function serializeCategorySelection(s: CategorySelection): string {
  return JSON.stringify(s)
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export function formatCategoryFieldForDisplay(raw: string | null | undefined): string {
  const p = parseCategoryField(raw ?? "")
  if (p.type === "empty") return "Nie podano"
  if (p.type === "legacy") return p.label
  if (p.type === "custom") return `Własna: ${p.selection.customCategory}`
  return p.selection.categoryPath.join(" › ")
}
