import { useEffect, useRef, useState } from 'react'
import { formatNumber, inkOn, rub } from '../lib/ledger'
import type { PersonStats } from '../lib/ledger'

type Point = [number, number]

type PitVisualProps = {
  creditors: PersonStats[]
  total: number
  hoveredId: string | null
  selectedId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

type Layout = {
  width: number
  height: number
  cx: number
  surfaceY: number
  topHalf: number
  bottomHalf: number
  maxDepth: number
  rulerX: number
  margin: number
  narrow: boolean
}

function makeLayout(measuredWidth: number): Layout {
  const width = Math.max(300, Math.round(measuredWidth))
  const narrow = width < 560
  const rulerX = narrow ? Math.max(70, width * 0.16) : Math.max(96, width * 0.155)
  const margin = narrow ? 12 : Math.max(40, width * 0.07)
  const surfaceY = narrow ? 50 : Math.max(70, width * 0.105)
  const height = narrow
    ? Math.min(460, Math.max(340, width))
    : Math.min(510, Math.max(360, width * 0.66))
  const maxDepth = height - surfaceY - (narrow ? 66 : 76)
  const available = width - rulerX - margin
  const topHalf = Math.min(
    208,
    Math.max(80, (available - (narrow ? 18 : 34)) / 2),
  )
  const cx = rulerX + available / 2 + (narrow ? 6 : 14)
  const bottomHalf = topHalf * 0.56

  return { width, height, cx, surfaceY, topHalf, bottomHalf, maxDepth, rulerX, margin, narrow }
}

function smoothThrough(points: Point[]): string {
  if (points.length < 2) return ''
  let path = `M${points[0][0]},${points[0][1]}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[Math.min(points.length - 1, index + 2)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    path += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return path
}

function boundaryPoints(layout: Layout, y: number, half: number, seed: number): Point[] {
  const count = layout.width < 520 ? 12 : 20
  const amplitude = layout.width < 520 ? 2 : 2.8
  const left = layout.cx - half
  const right = layout.cx + half
  const points: Point[] = []

  for (let index = 0; index <= count; index += 1) {
    const t = index / count
    const edge = Math.pow(Math.sin(Math.PI * t), 0.7)
    const wave =
      Math.sin(seed * 1.91 + t * 6.4) * amplitude * edge +
      Math.sin(seed * 4.73 + t * 11.9) * amplitude * 0.32 * edge
    points.push([left + (right - left) * t, y + wave])
  }

  return points
}

function bandPath(top: Point[], bottom: Point[]): string {
  if (top.length < 2 || bottom.length < 2) return ''
  const reversed = [...bottom].reverse()
  const topPath = smoothThrough(top)
  const bottomPath = smoothThrough(reversed)
  return `${topPath} L${bottom[bottom.length - 1][0]},${bottom[bottom.length - 1][1]} ${bottomPath.slice(1)} Z`
}

function niceStep(total: number): number {
  const steps = [
    500, 1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000,
    1000000, 2000000, 5000000, 10000000,
  ]
  return steps.find((step) => total / step <= 3.6) ?? 50000000
}

function compactNumber(value: number): string {
  if (value >= 1000000) {
    const millions = value / 1000000
    const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(millions)
    return `${formatted} млн`
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)} тыс`
  }
  return formatNumber(value)
}

export function PitVisual({
  creditors,
  total,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: PitVisualProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState(760)

  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width)
      setMeasuredWidth((current) => (Math.abs(current - next) > 0.5 ? next : current))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const layout = makeLayout(measuredWidth)
  const { width, height, cx, surfaceY, topHalf, bottomHalf, maxDepth, rulerX, margin, narrow } =
    layout
  const activeId = hoveredId ?? selectedId
  const empty = total <= 0

  const depth = empty
    ? 0
    : Math.min(maxDepth, 60 + (maxDepth - 60) * Math.sqrt(total / 300000))

  const ghostDepth = maxDepth * (narrow ? 0.66 : 0.62)
  const drawDepth = empty ? ghostDepth : depth
  const bottomY = surfaceY + drawDepth

  const halfAt = (y: number): number => {
    const ratio = drawDepth > 0 ? Math.min(1, Math.max(0, (y - surfaceY) / drawDepth)) : 0
    return topHalf - (topHalf - bottomHalf) * ratio
  }

  const bands = empty
    ? []
    : (() => {
        let accumulated = 0
        return creditors.map((row, index) => {
          const start = accumulated
          accumulated += Math.max(0, row.balance)
          const topY = surfaceY + (drawDepth * start) / total
          const bottomBandY = surfaceY + (drawDepth * accumulated) / total
          const seed = index + 3
          const topPoints = boundaryPoints(layout, topY, halfAt(topY), seed)
          const bottomPoints = boundaryPoints(layout, bottomBandY, halfAt(bottomBandY), seed + 1)
          return {
            row,
            topPoints,
            bottomPoints,
            path: bandPath(topPoints, bottomPoints),
            midY: (topY + bottomBandY) / 2,
            height: bottomBandY - topY,
          }
        })
      })()

  const bottomPoints = boundaryPoints(layout, bottomY, halfAt(bottomY), bands.length + 4)
  const silhouette = empty
    ? `M${cx - topHalf},${surfaceY} L${cx + topHalf},${surfaceY} L${cx + bottomHalf},${bottomY} L${cx - bottomHalf},${bottomY} Z`
    : `M${cx - topHalf},${surfaceY} L${cx + topHalf},${surfaceY} L${cx + bottomHalf},${bottomY} ${smoothThrough(
        [...bottomPoints].reverse(),
      ).slice(1)} Z`

  const step = niceStep(total)
  const ticks: number[] = []
  if (!empty) {
    for (let value = step; value < total * 0.94; value += step) ticks.push(value)
  }

  const groundLeft = margin
  const groundRight = width - margin
  const rulerLabelX = rulerX - 9
  const compactTicks = width < 540
  const bandTextSize = width < 520 ? 10.5 : 12.5

  return (
    <div className="pit-svg-wrap" ref={wrapRef}>
      <svg
        className="pit-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={
          empty
            ? 'Яма пуста: открытых долгов нет'
            : `Долговая яма глубиной ${rub(total)}. Слои: ${creditors
                .map((row) => `${row.person.name} — ${rub(row.balance)}`)
                .join(', ')}`
        }
      >
        <defs>
          <pattern
            id="pit-soil"
            width="9"
            height="9"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="9" stroke="#132018" strokeWidth="1" />
          </pattern>
          <pattern id="pit-grain" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="#0d130f" />
            <circle cx="5.5" cy="4.5" r="0.5" fill="#f7f4e9" />
          </pattern>
          <linearGradient id="pit-soil-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.72" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="pit-soil-mask">
            <rect
              x={groundLeft}
              y={surfaceY}
              width={groundRight - groundLeft}
              height={height - surfaceY}
              fill="url(#pit-soil-fade)"
            />
          </mask>
          <linearGradient id="pit-side-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#08100b" stopOpacity="0.42" />
            <stop offset="0.32" stopColor="#08100b" stopOpacity="0.05" />
            <stop offset="0.72" stopColor="#08100b" stopOpacity="0" />
            <stop offset="1" stopColor="#f7f4e9" stopOpacity="0.09" />
          </linearGradient>
          <linearGradient id="pit-depth-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#08100b" stopOpacity="0" />
            <stop offset="0.65" stopColor="#08100b" stopOpacity="0.08" />
            <stop offset="1" stopColor="#08100b" stopOpacity="0.34" />
          </linearGradient>
          <clipPath id="pit-clip">
            <path d={silhouette} />
          </clipPath>
        </defs>

        <g mask="url(#pit-soil-mask)">
          <rect
            x={groundLeft}
            y={surfaceY}
            width={groundRight - groundLeft}
            height={height - surfaceY}
            fill="#132018"
            opacity="0.028"
          />
          <rect
            x={groundLeft}
            y={surfaceY}
            width={groundRight - groundLeft}
            height={height - surfaceY}
            fill="url(#pit-soil)"
            opacity="0.1"
          />
        </g>

        <path
          d={silhouette}
          fill={empty ? 'rgba(19, 27, 22, 0.035)' : '#101712'}
          stroke={empty ? '#9aa494' : 'none'}
          strokeWidth={empty ? 1.2 : 0}
          strokeDasharray={empty ? '2 7' : undefined}
          strokeLinecap="round"
        />

        {empty ? (
          <g className="pit-empty">
            <circle cx={cx} cy={bottomY - 7} r="2.4" fill="#9aa494" />
            <text
              x={cx}
              y={surfaceY + drawDepth * 0.42}
              textAnchor="middle"
              className="pit-empty-title"
            >
              Яма пуста
            </text>
            <text
              x={cx}
              y={surfaceY + drawDepth * 0.42 + 24}
              textAnchor="middle"
              className="pit-empty-sub"
            >
              Никому не должны
            </text>
          </g>
        ) : (
          <g className="pit-layers" clipPath="url(#pit-clip)">
            {bands.map((band) => {
              const dimmed = Boolean(activeId) && activeId !== band.row.person.id
              const active = activeId === band.row.person.id
              return (
                <g
                  key={band.row.person.id}
                  className={`pit-band ${active ? 'is-active' : ''}`.trim()}
                  style={{ opacity: dimmed ? 0.46 : 1 }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${band.row.person.name}: ${rub(band.row.balance)}`}
                  onMouseEnter={() => onHover(band.row.person.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(band.row.person.id)}
                  onBlur={() => onHover(null)}
                  onClick={() => onSelect(band.row.person.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelect(band.row.person.id)
                    }
                  }}
                >
                  <path d={band.path} fill={band.row.person.color} />
                  {band.height >= (narrow ? 26 : 31) ? (
                    <text
                      x={cx}
                      y={band.midY + 4}
                      textAnchor="middle"
                      fill={inkOn(band.row.person.color)}
                      fontSize={bandTextSize}
                      fontWeight={500}
                      opacity={0.92}
                      className="pit-band-text"
                    >
                      {band.row.person.name}
                      <tspan opacity={0.68}> · {formatNumber(band.row.balance)} ₽</tspan>
                    </text>
                  ) : null}
                </g>
              )
            })}

            <g clipPath="url(#pit-clip)" pointerEvents="none">
              <rect
                x={cx - topHalf - 2}
                y={surfaceY}
                width={topHalf * 2 + 4}
                height={drawDepth + 4}
                fill="url(#pit-grain)"
                opacity="0.16"
              />
              <rect
                x={cx - topHalf - 2}
                y={surfaceY}
                width={topHalf * 2 + 4}
                height={drawDepth + 4}
                fill="url(#pit-side-shade)"
              />
              <rect
                x={cx - topHalf - 2}
                y={surfaceY}
                width={topHalf * 2 + 4}
                height={drawDepth + 4}
                fill="url(#pit-depth-shade)"
              />
            </g>

            {bands.slice(1).map((band, index) => (
              <path
                key={`line-${band.row.person.id}`}
                d={smoothThrough(band.topPoints)}
                fill="none"
                stroke="#0a110c"
                strokeOpacity={index === bands.length - 2 ? 0.42 : 0.26}
                strokeWidth="1"
                pointerEvents="none"
              />
            ))}
            <path
              d={smoothThrough(bottomPoints)}
              fill="none"
              stroke="#0a110c"
              strokeOpacity="0.5"
              strokeWidth="1.2"
              pointerEvents="none"
            />
          </g>
        )}

        <line
          x1={groundLeft}
          y1={surfaceY}
          x2={groundRight}
          y2={surfaceY}
          stroke="#8f9a89"
          strokeWidth="1.1"
        />
        <line
          x1={cx - topHalf}
          y1={surfaceY}
          x2={cx + topHalf}
          y2={surfaceY}
          stroke="#132018"
          strokeWidth="1.6"
        />
        <path
          d={`M${cx - topHalf},${surfaceY} l0,5 M${cx + topHalf},${surfaceY} l0,5`}
          stroke="#132018"
          strokeWidth="1.2"
        />
        <text x={groundRight} y={surfaceY - 9} textAnchor="end" className="pit-annotation">
          поверхность
        </text>

        {!empty ? (
          <g className="pit-ruler">
            <text x={rulerLabelX} y={surfaceY - 9} textAnchor="end" className="pit-annotation">
              глубина, ₽
            </text>
            <line
              x1={rulerX}
              y1={surfaceY}
              x2={rulerX}
              y2={bottomY}
              stroke="#9aa494"
              strokeWidth="1"
            />
            <line
              x1={rulerX}
              y1={surfaceY}
              x2={rulerX + 6}
              y2={surfaceY}
              stroke="#9aa494"
              strokeWidth="1"
            />
            <text x={rulerLabelX} y={surfaceY + 3.5} textAnchor="end" className="pit-tick-label">
              0
            </text>

            {ticks.map((value) => {
              const y = surfaceY + (drawDepth * value) / total
              return (
                <g key={value}>
                  <line
                    x1={rulerX}
                    y1={y}
                    x2={rulerX + 6}
                    y2={y}
                    stroke="#9aa494"
                    strokeWidth="1"
                  />
                  <text x={rulerLabelX} y={y + 3.5} textAnchor="end" className="pit-tick-label">
                    {compactTicks ? compactNumber(value) : formatNumber(value)}
                  </text>
                </g>
              )
            })}

            <line
              x1={rulerX}
              y1={bottomY}
              x2={cx - bottomHalf}
              y2={bottomY}
              stroke="#d34a2a"
              strokeWidth="1"
              strokeDasharray="2 5"
              opacity="0.55"
            />
            <circle cx={rulerX} cy={bottomY} r="2.8" fill="#d34a2a" />
            <text
              x={rulerLabelX}
              y={bottomY + 3.5}
              textAnchor="end"
              className="pit-tick-label pit-tick-total"
            >
              {compactTicks ? compactNumber(total) : formatNumber(total)}
            </text>
            <text
              x={rulerLabelX}
              y={bottomY + 16}
              textAnchor="end"
              className="pit-annotation pit-bottom-note"
            >
              дно
            </text>
          </g>
        ) : (
          <text x={rulerLabelX} y={surfaceY + 3.5} textAnchor="end" className="pit-tick-label">
            0
          </text>
        )}
      </svg>
    </div>
  )
}
