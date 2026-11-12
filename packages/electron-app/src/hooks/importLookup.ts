import type { ParsedCard, ScryfallIdentifier } from '@mtg-deckbuilder/shared'
import { OWNERSHIP_STATUS, CARD_SOURCE, CARD_SET, makeCardEntry, getPrimaryType, createCardIdentifier } from '@/types'
import type { ScryfallCard } from '@/types'
import { attemptScryfall, type ScryfallOutcome } from '@/lib/scryfallOutcome'
import type { ResolvedCard } from './types'

export interface ImportLookupDeps {
  /** Batched lookup; one entry per identifier, null where Scryfall had no match. */
  lookupBatch: (identifiers: ScryfallIdentifier[]) => Promise<(ScryfallCard | null)[]>
  /** Per-card fuzzy fallback; may reject (e.g. rate limited). */
  lookupByName: (name: string) => Promise<ScryfallCard | null>
}

export interface ImportLookupResult {
  resolvedCards: ResolvedCard[]
  fetchedScryfallCards: ScryfallCard[]
  errors: string[]
}

const toIdentifier = (p: ParsedCard): ScryfallIdentifier =>
  p.setCode && p.collectorNumber
    ? { set: p.setCode, collector_number: p.collectorNumber }
    : { name: p.name }

function targetSet(parsed: ParsedCard, sideboardSize?: number) {
  const hasSideboard = sideboardSize !== undefined && sideboardSize > 0
  if (parsed.isSideboard) return hasSideboard ? CARD_SET.SIDEBOARD : CARD_SET.ALTERNATES
  return parsed.isMaybeboard ? CARD_SET.ALTERNATES : CARD_SET.MAINBOARD
}

function toResolvedCard(parsed: ParsedCard, scryfallCard: ScryfallCard, sideboardSize?: number): ResolvedCard {
  const card = makeCardEntry({
    card: createCardIdentifier(scryfallCard, {
      setCode: parsed.setCode,
      collectorNumber: parsed.collectorNumber,
    }),
    quantity: parsed.quantity,
    ownership: OWNERSHIP_STATUS.OWNED,
    roles: [...(parsed.roles || [])],
    source: CARD_SOURCE.IMPORT,
    primaryType: getPrimaryType(scryfallCard.type_line),
  })
  return { card, listType: targetSet(parsed, sideboardSize) }
}

const lookupFailure = (parsed: ParsedCard, outcome: ScryfallOutcome<ScryfallCard | null>): string =>
  outcome.ok ? `Card not found: ${parsed.name}` : `Could not look up ${parsed.name}: ${outcome.error}`

/**
 * Resolve parsed import lines to deck entries: one batched lookup, then a per-card
 * name fallback for misses. A failed fallback (e.g. rate limited) is reported with
 * Scryfall's message rather than as "Card not found". Never rejects on a per-card failure.
 */
export async function resolveImportedCards(
  parsedCards: ParsedCard[],
  sideboardSize: number | undefined,
  deps: ImportLookupDeps,
): Promise<ImportLookupResult> {
  const batched = await deps.lookupBatch(parsedCards.map(toIdentifier))
  const outcomes = await Promise.all(batched.map((card, i) =>
    card
      ? Promise.resolve<ScryfallOutcome<ScryfallCard | null>>({ ok: true, value: card })
      : attemptScryfall(() => deps.lookupByName(parsedCards[i].name)),
  ))

  return parsedCards.reduce<ImportLookupResult>((acc, parsed, i) => {
    const outcome = outcomes[i]
    if (!outcome.ok || !outcome.value) {
      return { ...acc, errors: [...acc.errors, lookupFailure(parsed, outcome)] }
    }
    return {
      ...acc,
      resolvedCards: [...acc.resolvedCards, toResolvedCard(parsed, outcome.value, sideboardSize)],
      fetchedScryfallCards: [...acc.fetchedScryfallCards, outcome.value],
    }
  }, { resolvedCards: [], fetchedScryfallCards: [], errors: [] })
}
