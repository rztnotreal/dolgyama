import { useState } from 'react'
import {
  debtWord,
  formatNumber,
  formatDateLong,
  peopleWord,
  rub,
  todayISO,
} from '../lib/ledger'
import type { LedgerStats, PersonStats } from '../lib/ledger'
import { useCountUp } from '../lib/hooks'
import { Avatar } from './Avatar'
import { IconReturn } from './Icons'
import { PitVisual } from './PitVisual'

type PitViewProps = {
  stats: LedgerStats
  onAddDebt: () => void
  onPay: (personId?: string) => void
}

function shareLabel(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function PitView({ stats, onAddDebt, onPay }: PitViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const animatedTotal = useCountUp(stats.totalOwed)

  const activeId = hoveredId ?? selectedId
  const matched = stats.creditors.find((row) => row.person.id === activeId)
  const active: PersonStats | undefined = matched ?? stats.creditors[0]
  const activeIsDefault = !matched && Boolean(active)

  const toggleSelect = (id: string) => {
    setSelectedId((current) => (current === id ? null : id))
  }

  return (
    <section className="pit-view">
      <div className="pit-column">
        <div className="pit-intro">
          <div>
            <span className="eyebrow">Общий долг</span>
            <div className="total-line">
              <span className="total-amount">{formatNumber(animatedTotal)}</span>
              <span className="total-currency">₽</span>
            </div>
            <div className="total-meta">
              <span>
                {peopleWord(stats.rows.length)} · {stats.debtCount} {debtWord(stats.debtCount)}
              </span>
            </div>
          </div>

          <div className="readout" aria-live="polite">
            {active ? (
              <>
                <span className="readout-label">
                  {activeIsDefault ? 'самый большой слой' : 'слой'}
                </span>
                <span className="readout-main">
                  <span
                    className="readout-dot"
                    style={{ background: active.person.color }}
                    aria-hidden
                  />
                  <span className="readout-name">{active.person.name}</span>
                  <span className="readout-amount">{rub(active.balance)}</span>
                  <span className="readout-share">{shareLabel(active.share)}</span>
                </span>
              </>
            ) : (
              <span className="readout-label">открытых долгов нет</span>
            )}
          </div>
        </div>

        <div className="pit-stage">
          <PitVisual
            creditors={stats.creditors}
            total={stats.totalOwed}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={setHoveredId}
            onSelect={toggleSelect}
          />
        </div>

        <div className="pit-foot">
          <span>Слои — это люди, их толщина — сумма долга.</span>
          <span className="pit-foot-date">разрез на {formatDateLong(todayISO())}</span>
        </div>
      </div>

      <aside className="people-panel" aria-label="Кому вы должны">
        <div className="panel-head">
          <h2 className="panel-title">Кому вы должны</h2>
          <span className="panel-count">{stats.creditors.length}</span>
        </div>

        {stats.creditors.length > 0 ? (
          <ul className="people-list">
            {stats.creditors.map((row) => {
              const isActive = activeId === row.person.id
              return (
                <li
                  key={row.person.id}
                  className={`person-row ${isActive ? 'is-active' : ''}`.trim()}
                  onMouseEnter={() => setHoveredId(row.person.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    type="button"
                    className="person-main"
                    onClick={() => toggleSelect(row.person.id)}
                    aria-pressed={selectedId === row.person.id}
                  >
                    <Avatar name={row.person.name} color={row.person.color} size={34} />
                    <span className="person-info">
                      <span className="person-name">{row.person.name}</span>
                      <span className="person-meta">
                        {row.debtCount} {debtWord(row.debtCount)}
                        {row.paid > 0 ? ` · ${rub(row.paid)} вернули` : ''}
                      </span>
                      <span className="person-bar" aria-hidden>
                        <span
                          style={{
                            width: `${Math.max(4, row.share * 100)}%`,
                            background: row.person.color,
                          }}
                        />
                      </span>
                    </span>
                    <span className="person-amount">{rub(row.balance)}</span>
                  </button>
                  <button
                    type="button"
                    className="person-pay"
                    onClick={() => onPay(row.person.id)}
                    aria-label={`Вернуть деньги: ${row.person.name}`}
                    title={`Вернуть ${row.person.name}`}
                  >
                    <IconReturn width={17} height={17} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="panel-empty">
            <p className="panel-empty-title">Никому не должны</p>
            <p className="panel-empty-text">Добавьте долг — и здесь появится человек, которому вы должны.</p>
            <button type="button" className="btn btn-quiet panel-empty-btn" onClick={onAddDebt}>
              Добавить долг
            </button>
          </div>
        )}

        <div className="panel-foot">
          <span>Возвращено за всё время</span>
          <strong>{rub(stats.totalReturned)}</strong>
        </div>
      </aside>
    </section>
  )
}
