import type React from 'react'
import type { ConsistencyMatrixData } from '@mtg-deckbuilder/shared'

interface HeatmapTableProps {
  data: ConsistencyMatrixData
  roleName: string
}

function formatPercent(p: number): string {
  const pct = p * 100
  if (pct >= 99.95) return '100%'
  if (pct < 0.05) return '<0.1%'
  if (pct < 1) return `${pct.toFixed(1)}%`
  return `${Math.round(pct)}%`
}

function cellStyle(p: number): React.CSSProperties {
  // Cool (blue, hue ~220) → Warm (red-orange, hue ~15)
  const hue = Math.round(220 - p * 205)
  const alpha = 0.15 + p * 0.7
  return {
    backgroundColor: `hsl(${hue} 75% 55% / ${alpha.toFixed(2)})`,
    color: p > 0.55 ? 'white' : 'hsl(var(--foreground))',
  }
}

export function HeatmapTable({ data, roleName }: HeatmapTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="px-2 py-1.5 text-left font-medium">{roleName}</th>
            {data.columnLabels.map((label, i) => (
              <th key={i} className="px-2 py-1.5 text-center font-medium min-w-[48px]">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.probabilities.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td className="px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap">
                {data.rowLabels[rowIdx]}
              </td>
              {row.map((p, colIdx) => (
                <td
                  key={colIdx}
                  className="px-2 py-1.5 text-center font-mono text-xs"
                  style={cellStyle(p)}
                >
                  {formatPercent(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
