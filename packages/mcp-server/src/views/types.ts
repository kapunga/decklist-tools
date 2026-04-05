export interface PullListItem {
  cardName: string
  setCode: string
  setName: string
  collectorNumber: string
  rarity: string
  typeLine: string
  manaCost: string
  cmc: number
  quantityNeeded: number
  quantityPulledThisPrint: number
  quantityPulledTotal: number
  remainingNeeded: number
}

export interface PullListGroup {
  setCode: string
  setName: string
  items: PullListItem[]
}
