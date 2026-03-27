/**
 * Wybór modelu czatu dla /api/generate — balans koszt (mini) vs jakość (4o).
 *
 * - OPENAI_DESCRIPTION_MODEL=gpt-4o-mini | gpt-4o — wymusza model dla wszystkich (np. testy).
 * - Domyślnie: gpt-4o tylko dla planów pro i scale; free i starter → gpt-4o-mini.
 * - Drugi przebieg (ulepsz / refinement): zawsze mini — duży prompt z poprzednim HTML; 4o jest nieproporcjonalnie drogi.
 */
export function getDescriptionChatModel(
  plan: string | undefined | null,
  options?: { isRefinement?: boolean }
): "gpt-4o" | "gpt-4o-mini" {
  const override = process.env.OPENAI_DESCRIPTION_MODEL?.trim().toLowerCase()
  if (override === "gpt-4o" || override === "gpt-4o-mini") {
    return override === "gpt-4o" ? "gpt-4o" : "gpt-4o-mini"
  }

  if (options?.isRefinement) {
    return "gpt-4o-mini"
  }

  const p = (plan ?? "free").toLowerCase()
  if (p === "pro" || p === "scale") {
    return "gpt-4o"
  }
  return "gpt-4o-mini"
}
