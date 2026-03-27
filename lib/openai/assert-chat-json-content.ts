/** Wspólna walidacja `choices[0].message.content` dla wywołań chat completions (JSON). */
export function assertChatJsonContent(
  completion: {
    choices: Array<{
      finish_reason?: string | null
      message?: {
        content?: string | null
        refusal?: string | null
      } | null
    }>
    usage?: unknown
    model?: string
  },
  context: string
): string {
  const choice = completion.choices[0]
  const msg = choice?.message
  const content = msg?.content?.trim() ?? ''
  if (content.length > 0) return content

  const refusal = msg?.refusal?.trim()
  console.error(`[openai] ${context}: empty message.content`, {
    model: completion.model,
    finishReason: choice?.finish_reason,
    refusal: refusal || null,
    usage: completion.usage,
  })

  if (choice?.finish_reason === 'length') {
    throw new Error(
      'Odpowiedź AI została ucięta (limit tokenów). Spróbuj ponownie albo ustaw wyższy OPENAI_DESCRIPTION_MAX_COMPLETION_TOKENS / model gpt-4.1-mini.'
    )
  }
  if (refusal) {
    throw new Error('Model odmówił odpowiedzi. Zmień treść lub spróbuj ponownie.')
  }
  throw new Error(
    'Brak odpowiedzi z AI (pusty content). Spróbuj ponownie — jeśli się powtarza, ustaw OPENAI_DESCRIPTION_MODEL=gpt-4.1-mini.'
  )
}
