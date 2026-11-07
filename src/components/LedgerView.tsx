import { useState } from 'react'
import { debtWord, formatDate, rub } from '../lib/ledger'
import type { Debt, Ledger, LedgerStats, Payment, Person } from '../lib/ledger'
import { Avatar } from './Avatar'
import { DebtChart } from './DebtChart'
import { IconPencil, IconReturn, IconSearch, IconTrash, IconX } from './Icons'

type Tab = 'debts' | 'payments'

type LedgerViewProps = {
  ledger: Ledger
  stats: LedgerStats
  onAddDebt: () => void
  onPay: (personId?: string) => void
  onEditDebt: (debt: Debt) => void
  onDeleteDebt: (debt: Debt) => void
  onDeletePayment: (payment: Payment) => void
}

function percentText(share: number): string {
  const value = share * 100
  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value)
  return `${formatted}%`
}

export function LedgerView({
  ledger,
  stats,
  onAddDebt,
  onPay,
  onEditDebt,
  onDeleteDebt,
  onDeletePayment,
}: LedgerViewProps) {
  const [tab, setTab] = useState<Tab>('debts')
  const [query, setQuery] = useState('')

  const peopleById = new Map<string, Person>(ledger.people.map((person) => [person.id, person]))
  const balanceById = new Map(stats.rows.map((row) => [row.person.id, row.balance]))
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')

  const debtRows = [...ledger.debts]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .filter((debt) => {
      if (!normalizedQuery) return true
      const person = peopleById.get(debt.personId)
      return (
        (person?.name ?? '').toLocaleLowerCase('ru-RU').includes(normalizedQuery) ||
        debt.comment.toLocaleLowerCase('ru-RU').includes(normalizedQuery)
      )
    })

  const paymentRows = [...ledger.payments]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .filter((payment) => {
      if (!normalizedQuery) return true
      const person = peopleById.get(payment.personId)
      return (
        (person?.name ?? '').toLocaleLowerCase('ru-RU').includes(normalizedQuery) ||
        payment.comment.toLocaleLowerCase('ru-RU').includes(normalizedQuery)
      )
    })

  const activeTotal = tab === 'debts' ? ledger.debts.length : ledger.payments.length
  const rows = tab === 'debts' ? debtRows : paymentRows
  const hasSomeRecords = ledger.debts.length > 0 || ledger.payments.length > 0

  return (
    <section className="ledger-view">
      <div className="ledger-top">
        <div className="card chart-card">
          <div className="card-head">
            <h2 className="card-title">Кому и сколько</h2>
            <span className="card-note">по текущим остаткам</span>
          </div>
          <DebtChart creditors={stats.creditors} total={stats.totalOwed} />
        </div>

        <div className="stats-card">
          <div>
            <div className="stats-head">
              <span className="stats-label">Возвращено</span>
              <span className="stats-rate">{percentText(stats.repaidShare)}</span>
            </div>
            <div className="stats-big">{rub(stats.totalReturned)}</div>
            <div className="stats-note">
              {stats.totalReturned > 0
                ? `из ${rub(stats.totalLent)} взятых в долг`
                : 'пока ни одного возврата'}
            </div>
          </div>
          <div className="repay-bar" aria-hidden>
            <span style={{ width: `${Math.max(stats.repaidShare * 100, stats.totalReturned > 0 ? 2 : 0)}%` }} />
          </div>
          <div className="stats-grid">
            <div>
              <span>Взято в долг</span>
              <strong>{rub(stats.totalLent)}</strong>
            </div>
            <div>
              <span>Осталось</span>
              <strong>{rub(stats.totalOwed)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-head">
          <div className="table-tabs" role="tablist" aria-label="Записи">
            <button
              type="button"
              className="table-tab"
              role="tab"
              aria-selected={tab === 'debts'}
              onClick={() => setTab('debts')}
            >
              Долги <span className="tab-count">{ledger.debts.length}</span>
            </button>
            <button
              type="button"
              className="table-tab"
              role="tab"
              aria-selected={tab === 'payments'}
              onClick={() => setTab('payments')}
            >
              Возвраты <span className="tab-count">{ledger.payments.length}</span>
            </button>
          </div>

          {hasSomeRecords ? (
            <div className="search">
              <IconSearch width={16} height={16} />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Имя или комментарий"
                aria-label="Поиск по имени или комментарию"
              />
              {query ? (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setQuery('')}
                  aria-label="Сбросить поиск"
                >
                  <IconX width={14} height={14} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="table-wrap">
          <table className="debt-table">
            <thead>
              <tr>
                <th className="col-date">Дата</th>
                <th className="col-person">Человек</th>
                <th className="col-comment">Комментарий</th>
                <th className="col-amount">{tab === 'debts' ? 'Сумма' : 'Возврат'}</th>
                <th className="col-actions">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <p className="table-empty-title">
                        {normalizedQuery
                          ? 'Ничего не нашлось'
                          : tab === 'debts'
                            ? stats.totalOwed === 0 && ledger.debts.length > 0
                              ? 'Долги закрыты'
                              : 'Пока нет долгов'
                            : 'Возвратов ещё не было'}
                      </p>
                      <p className="table-empty-text">
                        {normalizedQuery
                          ? 'Попробуйте другое имя или часть комментария.'
                          : tab === 'debts'
                            ? 'Добавьте первый долг — яма и диаграмма заполнятся сами.'
                            : 'Когда вернёте кому-нибудь деньги, запись появится здесь.'}
                      </p>
                      {normalizedQuery ? (
                        <button type="button" className="btn btn-quiet" onClick={() => setQuery('')}>
                          Сбросить поиск
                        </button>
                      ) : tab === 'debts' ? (
                        <button type="button" className="btn btn-primary" onClick={onAddDebt}>
                          Добавить долг
                        </button>
                      ) : stats.creditors.length > 0 ? (
                        <button type="button" className="btn btn-primary" onClick={() => onPay()}>
                          Вернуть деньги
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : tab === 'debts' ? (
                (rows as Debt[]).map((debt) => {
                  const person = peopleById.get(debt.personId)
                  const name = person?.name ?? 'Без имени'
                  const color = person?.color ?? '#8a8f84'
                  const canReturn = (balanceById.get(debt.personId) ?? 0) > 0
                  return (
                    <tr key={debt.id}>
                      <td className="cell-date">
                        <span className="row-date">{formatDate(debt.date)}</span>
                      </td>
                      <td className="cell-person">
                        <div className="person-cell">
                          <Avatar name={name} color={color} size={30} />
                          <div className="person-cell-text">
                            <span className="row-name">{name}</span>
                            <span className="row-mobile-meta">
                              {formatDate(debt.date)}
                              {debt.comment ? ` · ${debt.comment}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="cell-comment">
                        <span className="row-comment">{debt.comment || '—'}</span>
                      </td>
                      <td className="cell-amount">
                        <span className="row-amount">{rub(debt.amount)}</span>
                      </td>
                      <td className="cell-actions">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="row-return"
                            onClick={() => onPay(debt.personId)}
                            disabled={!canReturn}
                            title={canReturn ? `Вернуть деньги: ${name}` : 'Долг закрыт'}
                          >
                            <IconReturn width={16} height={16} />
                            <span>Вернуть</span>
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => onEditDebt(debt)}
                            aria-label={`Изменить долг: ${name}`}
                            title="Изменить"
                          >
                            <IconPencil width={16} height={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={() => onDeleteDebt(debt)}
                            aria-label={`Удалить долг: ${name}`}
                            title="Удалить"
                          >
                            <IconTrash width={16} height={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                (rows as Payment[]).map((payment) => {
                  const person = peopleById.get(payment.personId)
                  const name = person?.name ?? 'Без имени'
                  const color = person?.color ?? '#8a8f84'
                  return (
                    <tr key={payment.id}>
                      <td className="cell-date">
                        <span className="row-date">{formatDate(payment.date)}</span>
                      </td>
                      <td className="cell-person">
                        <div className="person-cell">
                          <Avatar name={name} color={color} size={30} />
                          <div className="person-cell-text">
                            <span className="row-name">{name}</span>
                            <span className="row-mobile-meta">
                              {formatDate(payment.date)}
                              {payment.comment ? ` · ${payment.comment}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="cell-comment">
                        <span className="row-comment">{payment.comment || '—'}</span>
                      </td>
                      <td className="cell-amount">
                        <span className="row-amount row-return-amount">
                          −{rub(payment.amount)}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={() => onDeletePayment(payment)}
                            aria-label={`Удалить возврат: ${name}`}
                            title="Удалить возврат"
                          >
                            <IconTrash width={16} height={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {activeTotal > 0 ? (
          <div className="table-foot">
            <span>
              {tab === 'debts'
                ? `${activeTotal} ${debtWord(activeTotal)} в реестре`
                : `${activeTotal} ${activeTotal === 1 ? 'возврат' : activeTotal < 5 ? 'возврата' : 'возвратов'}`}
              {normalizedQuery ? ` · найдено ${rows.length}` : ''}
            </span>
            <span>{tab === 'debts' ? 'Сумма в рублях' : 'Вычтено из долга'}</span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
