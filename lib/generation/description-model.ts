/**
 * Wybór modelu czatu dla /api/generate — balans koszt (mini) vs jakość (pełny).
 *
 * - OPENAI_DESCRIPTION_MODEL=gpt-4.1-mini | gpt-4.1 | gpt-5-mini | gpt-5.4-mini
 *   wymusza model dla wszystkich (np. testy).
 * - Domyślnie: gpt-5-mini (generowanie i ulepszanie).
 */
export type DescriptionChatModel =
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-5-mini"
  | "gpt-5.4-mini"

export function getDescriptionChatModel(
  _plan: string | undefined | null,
  options?: { isRefinement?: boolean }
): DescriptionChatModel {
  const override = process.env.OPENAI_DESCRIPTION_MODEL?.trim().toLowerCase()
  if (
    override === "gpt-4.1" ||
    override === "gpt-4.1-mini" ||
    override === "gpt-5-mini" ||
    override === "gpt-5.4-mini"
  ) {
    return override
  }

  // Ulepszanie (Dopracuj do 100) — szybszy i tańszy model wystarczy
  if (options?.isRefinement) return "gpt-4.1-mini"

  return "gpt-5-mini"
}
