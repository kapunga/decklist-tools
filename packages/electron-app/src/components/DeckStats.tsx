import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Deck } from '@/types'
import { getCardDisplayName } from '@/types'
import { getMainboard, getAllDeckEntries } from '@mtg-deckbuilder/shared'
import { getAllRoles } from '@/lib/constants'
import { useGlobalRoles } from '@/hooks/useStore'
import { useScryfallCache } from '@/hooks/useScryfallCache'
import { ManaCurve } from '@/components/ManaCurve'
import { ConsistencyMatrix } from '@/components/ConsistencyMatrix'
import { sectionTitleStyle, captionLabelStyle, editorialTextStyle, PAGE_X_PAD } from '@/lib/mastheadStyles'

interface DeckStatsProps {
  deck: Deck
}

export function DeckStats({ deck }: DeckStatsProps) {
  const globalRoles = useGlobalRoles()
  const [matrixRoles, setMatrixRoles] = useState<string[]>([])
  const confirmedCards = useMemo(
    () => getMainboard(deck),
    [deck.cardSets]
  )
  const { cache: scryfallCache, isLoading: scryfallLoading } = useScryfallCache(confirmedCards)

  // Group by role - cards with multiple roles appear in multiple groups
  const byRole = confirmedCards.reduce<Record<string, number>>((acc, card) => {
    if (card.roles.length === 0) {
      acc['Unassigned'] = (acc['Unassigned'] || 0) + card.quantity
    } else {
      card.roles.forEach(role => {
        acc[role] = (acc[role] || 0) + card.quantity
      })
    }
    return acc
  }, {})

  // Count cards needing purchase
  const needToBuy = getAllDeckEntries(deck).filter(c => c.ownership === 'need_to_buy')

  const totalNeedToBuy = needToBuy.reduce((sum, c) => sum + c.quantity, 0)

  // Get all role definitions for display names
  const allRoles = getAllRoles(globalRoles, deck.customRoles)
  const getRoleName = (roleId: string) => {
    const role = allRoles.find(r => r.id === roleId)
    return role?.name || roleId
  }

  // Sort roles alphabetically, but put "Unassigned" at the end
  const sortedRoles = Object.entries(byRole).sort(([a], [b]) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return getRoleName(a).localeCompare(getRoleName(b))
  })

  return (
    <div
      className="space-y-6"
      style={{ padding: `24px ${PAGE_X_PAD}` }}
    >
      {/* Mana Curve */}
      {scryfallLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
          <span
            style={{
              fontFamily: 'var(--font-tagline)',
              fontStyle: 'italic',
              fontSize: '14px',
              color: 'var(--muted-foreground)',
            }}
          >
            loading card data...
          </span>
        </div>
      ) : (
        <ManaCurve deck={deck} scryfallCache={scryfallCache} />
      )}

      <div>
        <h3 style={sectionTitleStyle} className="mb-4">Cards by Role</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sortedRoles.map(([roleId, count]) => (
            <button
              key={roleId}
              type="button"
              className={roleId !== 'Unassigned' ? 'cursor-pointer' : undefined}
              style={{
                padding: '16px',
                textAlign: 'center',
                border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                background: 'transparent',
                backgroundColor: matrixRoles.includes(roleId)
                  ? 'color-mix(in srgb, var(--foreground) 8%, transparent)'
                  : 'transparent',
                transition: 'background-color 0.15s',
              }}
              onClick={() => {
                if (roleId !== 'Unassigned') {
                  setMatrixRoles(prev =>
                    prev.includes(roleId)
                      ? prev.filter(r => r !== roleId)
                      : [...prev, roleId]
                  )
                }
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: '28px',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  lineHeight: 1.1,
                }}
              >
                {count}
              </div>
              <div style={{ ...captionLabelStyle, marginTop: '4px' }}>
                {getRoleName(roleId)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <ConsistencyMatrix
        deck={deck}
        confirmedCards={confirmedCards}
        scryfallCache={scryfallCache}
        byRole={byRole}
        selectedRoles={matrixRoles}
        onToggleRole={role =>
          setMatrixRoles(prev =>
            prev.includes(role)
              ? prev.filter(r => r !== role)
              : [...prev, role]
          )
        }
      />

      {totalNeedToBuy > 0 && (
        <div>
          <h3 style={sectionTitleStyle} className="mb-4">
            Cards to Buy ({totalNeedToBuy})
          </h3>
          <div>
            {needToBuy.map((card, index) => (
              <div
                key={`${card.card.name}-${card.card.scryfallId || index}`}
                className="flex items-center justify-between"
                style={{
                  padding: '8px 4px',
                  borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                }}
              >
                <span style={editorialTextStyle}>{card.quantity}x {getCardDisplayName(card.card)}</span>
                <span style={captionLabelStyle}>
                  {card.card.setCode.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={sectionTitleStyle} className="mb-4">Deck Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-baseline gap-2">
            <span style={captionLabelStyle}>Created</span>
            <span style={editorialTextStyle}>
              {new Date(deck.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span style={captionLabelStyle}>Updated</span>
            <span style={editorialTextStyle}>
              {new Date(deck.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span style={captionLabelStyle}>Version</span>
            <span style={editorialTextStyle}>{deck.version}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span style={captionLabelStyle}>Card Limit</span>
            <span style={editorialTextStyle}>
              {deck.format.cardLimit === Infinity ? 'Unlimited' : deck.format.cardLimit}
            </span>
          </div>
        </div>
      </div>

      {deck.description && (
        <div>
          <h3 style={sectionTitleStyle} className="mb-4">Description</h3>
          <p style={{ ...editorialTextStyle, whiteSpace: 'pre-wrap' }}>
            {deck.description}
          </p>
        </div>
      )}
    </div>
  )
}
