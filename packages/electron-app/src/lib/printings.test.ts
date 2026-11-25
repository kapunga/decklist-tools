import { describe, it, expect } from 'vitest'
import type { ScryfallCard } from '@/types'
import { findPrintingById } from './printings'

const printing = (id: string): ScryfallCard => ({ id }) as ScryfallCard

describe('findPrintingById', () => {
  const sol1 = printing('sol-1')
  const sol2 = printing('sol-2')
  const signet = printing('signet-1')
  const printings = new Map([['sol ring', [sol1, sol2]], ['arcane signet', [signet]]])

  it('finds a printing under any card name', () => {
    expect(findPrintingById(printings, 'sol-2')).toBe(sol2)
    expect(findPrintingById(printings, 'signet-1')).toBe(signet)
  })

  it('is undefined for a printing that is not loaded', () => {
    expect(findPrintingById(printings, 'nope')).toBeUndefined()
  })
})
