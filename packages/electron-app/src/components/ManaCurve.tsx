import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { Deck, ScryfallCard } from '@/types'
import type { CardFilter } from '@mtg-deckbuilder/shared'
import { enrichCards, applyFilters, getCmcDistribution, countManaPips } from '@mtg-deckbuilder/shared'
import { CardFilterBar } from '@/components/CardFilterBar'
import { ManaSymbol } from '@/components/ManaCost'

interface ManaCurveProps {
  deck: Deck
  scryfallCache: Map<string, ScryfallCard>
}

const PIE_COLORS: Record<string, string> = {
  W: '#f9fafb',
  U: '#3b82f6',
  B: '#1f2937',
  R: '#ef4444',
  G: '#22c55e',
  C: '#9ca3af',
}

const PIE_STROKES: Record<string, string> = {
  W: '#d1d5db',
  U: '#2563eb',
  B: '#111827',
  R: '#dc2626',
  G: '#16a34a',
  C: '#6b7280',
}

export function ManaCurve({ deck, scryfallCache }: ManaCurveProps) {
  const [filters, setFilters] = useState<CardFilter[]>([])

  const confirmedCards = useMemo(
    () => deck.cards.filter(c => c.inclusion === 'confirmed'),
    [deck.cards]
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
        fill: PIE_COLORS[color],
        stroke: PIE_STROKES[color],
      }))
  }, [filtered])

  const totalPips = pipData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Mana Curve</h3>

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
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Cards by Mana Value</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cmcData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart with pip legend */}
        {totalPips > 0 && (
          <div className="w-[280px]">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Mana Pips ({totalPips})</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pipData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ value, percent }) =>
                    `${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {pipData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      stroke={entry.stroke}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend with mana pips */}
            <div className="flex items-center justify-center gap-3 mt-2">
              {pipData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <ManaSymbol symbol={entry.name} size="sm" />
                  <span className="text-xs text-muted-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
