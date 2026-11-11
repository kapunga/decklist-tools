/** A non-2xx Scryfall response, carrying Scryfall's own `details` text when it sent one. */
export class ScryfallError extends Error {
  constructor(readonly status: number, details?: string) {
    super(details ?? `Scryfall API error: ${status}`)
    this.name = 'ScryfallError'
  }
}

/** Scryfall kept answering 429 after the client's bounded retries, or asked for a longer wait than it will absorb. */
export class ScryfallRateLimitError extends ScryfallError {
  constructor(readonly retryAfterSeconds: number) {
    super(429, `Rate limited by Scryfall; retry in ${retryAfterSeconds}s`)
    this.name = 'ScryfallRateLimitError'
  }
}
