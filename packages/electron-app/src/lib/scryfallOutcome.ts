// Scryfall single-card lookups reject on HTTP failures (rate limit, persistent 5xx)
// instead of resolving to null. These helpers make the failure path explicit at each
// renderer call site so no lookup ends up as an unhandled promise rejection.

export type ScryfallOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export const describeScryfallError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/** Run a Scryfall call, capturing a rejection as a value. */
export async function attemptScryfall<T>(task: () => Promise<T>): Promise<ScryfallOutcome<T>> {
  try {
    return { ok: true, value: await task() }
  } catch (error) {
    return { ok: false, error: describeScryfallError(error) }
  }
}

/**
 * For background lookups (previews, art, layout hints) where "no card" is already a
 * handled state: log the failure with context and fall back to null.
 */
export async function lookupOrNull<T>(
  task: () => Promise<T | null>,
  context: string,
): Promise<T | null> {
  const outcome = await attemptScryfall(task)
  if (outcome.ok) return outcome.value
  console.error(`Scryfall lookup failed (${context}): ${outcome.error}`)
  return null
}
