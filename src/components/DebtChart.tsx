import { useState } from 'react'
import { formatNumber, rub } from '../lib/ledger'
import type { PersonStats } from '../lib/ledger'

type DebtChartProps = {
  creditors: PersonStats[]
  total: number
}

const RADIUS = 78
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 5

export function DebtChart({ creditors, total }: DebtChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const active = creditors.find((row) => row.person.id === hoveredId)

  let offset = 0
  const segments = creditors.map((row) => {
    const length = row.share * CIRCUMFERENCE
    const visible = Math.max(1.5, length - (creditors.length > 1 ? GAP : 0))
    const dash = `${visible} ${CIRCUMFERENCE - visible}`
    const dashOffset = -offset
    offset += length
    return { row, dash, dashOffset }
  })

  return (
    <div className="chart-body">
      <div className="donut-wrap">
        <svg viewBox="0 0 200 200" className="donut-svg" aria-hidden focusable="false">
          {creditors.length === 0 ? (
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke="#c3c9ba"
              strokeWidth="1.5"
              strokeDasharray="2 8"
            />
          ) : (
            segments.map(({ row, dash, dashOffset }) => (
              <circle
                key={row.person.id}
                className="donut-seg"
                cx="100"
                cy="100"
                r={RADIUS}
                fill="none"
                stroke={row.person.color}
                strokeWidth={hoveredId === row.person.id ? 30 : 24}
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                onMouseEnter={() => setHoveredId(row.person.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            ))
          )}
        </svg>
        <div className="donut-center">
          {active ? (
            <>
              <span className="donut-center-label donut-center-person">
                <span className="donut-dot" style={{ background: active.person.color }} />
                {active.person.name}
              </span>
              <span className="donut-amount">{rub(active.balance)}</span>
              <span className="donut-center-note">{Math.round(active.share * 100)}% всего долга</span>
            </>
          ) : (
            <>
              <span className="donut-center-label">осталось вернуть</span>
              <span className="donut-amount">{formatNumber(total)} ₽</span>
              <span className="donut-center-note">
                {creditors.length > 0 ? `${creditors.length} в долгу` : 'долгов нет'}
              </span>
            </>
          )}
        </div>
      </div>

      <ul className="chart-legend">
        {creditors.length === 0 ? (
          <li className="legend-empty">Пока никому не должны.</li>
        ) : (
          creditors.map((row) => (
            <li
              key={row.person.id}
              className={`legend-row ${hoveredId === row.person.id ? 'is-active' : ''}`.trim()}
              onMouseEnter={() => setHoveredId(row.person.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span className="legend-dot" style={{ background: row.person.color }} aria-hidden />
              <span className="legend-name">{row.person.name}</span>
              <span className="legend-percent">{Math.round(row.share * 100)}%</span>
              <span className="legend-value">{rub(row.balance)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
