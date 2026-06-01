import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Deck, ScryfallCard } from '@/types'
import type { CardFilter } from '@mtg-deckbuilder/shared'
import { enrichCards, applyFilters, getCmcDistribution, countManaPips, getMainboard } from '@mtg-deckbuilder/shared'
import { CardFilterBar } from '@/components/CardFilterBar'
import { ManaSymbol } from '@/components/ManaCost'
import { sectionTitleStyle, captionLabelStyle, editorialTextStyle } from '@/lib/mastheadStyles'

interface ManaCurveProps {
  deck: Deck
  scryfallCache: Map<string, ScryfallCard>
}

// Theme-keyed pip-bar fills — reference --color-* tokens so each theme drives
// its own mana-color palette. A hairline edge (below) keeps near-background
// fills (e.g. black mana on a dark theme) visible regardless of the ground.
const PIP_COLORS: Record<string, string> = {
  W: 'var(--color-w)',
  U: 'var(--color-u)',
  B: 'var(--color-b)',
  R: 'var(--color-r)',
  G: 'var(--color-g)',
  C: 'var(--color-c)',
}

export function ManaCurve({ deck, scryfallCache }: ManaCurveProps) {
  const [filters, setFilters] = useState<CardFilter[]>([])

  const confirmedCards = useMemo(
    () => getMainboard(deck),
    [deck.cardSets]
  )

  const enriched = useMemo(
    () => enrichCards(confirmedCards, scryfallCache),
    [confirmedCards, scryfallCache]
  )

  const filtered = useMemo(
    () => applyFilters(enriched, filters),
    [enriched, filters]
  )

  const cmcData = useMemo(() => {
    const dist = getCmcDistribution(filtered)
    return Object.entries(dist).map(([cmc, count]) => ({
      name: Number(cmc) === 7 ? '7+' : String(cmc),
      count,
    }))
  }, [filtered])

  const pipData = useMemo(() => {
    const pips = countManaPips(filtered)
    return (['W', 'U', 'B', 'R', 'G', 'C'] as const)
      .filter(color => pips[color] > 0)
      .map(color => ({
        name: color,
        value: pips[color],
        fill: PIP_COLORS[color],
      }))
  }, [filtered])

  const totalPips = pipData.reduce((sum, d) => sum + d.value, 0)
  const maxPip = pipData.reduce((max, d) => Math.max(max, d.value), 0)

  return (
    <div>
      <h3 style={sectionTitleStyle} className="mb-4">Mana Curve</h3>

      <CardFilterBar
        filters={filters}
        onChange={setFilters}
        allowedGroups={['type', 'role']}
        deck={deck}
        enrichedCards={enriched}
      />

      <div className="flex gap-8 flex-wrap">
        {/* Bar chart */}
        <div className="flex-1 min-w-[300px]">
          <h4 style={captionLabelStyle} className="mb-2">Cards by Mana Value</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cmcData}>
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 0,
                }}
                labelStyle={{ color: 'var(--popover-foreground)' }}
                itemStyle={{ color: 'var(--popover-foreground)' }}
              />
              <Bar dataKey="count" fill="var(--foreground)" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mana pip distribution — horizontal bars. Length encodes the count
            (robust where a pie's near-background slice would vanish), with a
            hairline edge so dark theme fills stay legible against the ground. */}
        {totalPips > 0 && (
          <div className="w-[300px]">
            <h4 style={captionLabelStyle} className="mb-2">Mana Pips ({totalPips})</h4>
            <div className="flex flex-col gap-3 pt-1.5">
              {pipData.map(entry => {
                const pct = totalPips > 0 ? Math.round((entry.value / totalPips) * 100) : 0
                return (
                  <div key={entry.name} className="flex items-center gap-3">
                    <ManaSymbol symbol={entry.name} size="sm" />
                    <div className="flex-1 h-3.5 min-w-0">
                      <div
                        style={{
                          width: `${maxPip > 0 ? (entry.value / maxPip) * 100 : 0}%`,
                          height: '100%',
                          backgroundColor: entry.fill,
                          border: '1px solid color-mix(in srgb, var(--foreground) 28%, transparent)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <span style={{ ...editorialTextStyle, flexShrink: 0 }}>
                      {entry.value}
                      <span style={{ color: 'var(--muted-foreground)' }}> · {pct}%</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
