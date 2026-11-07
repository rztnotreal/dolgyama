import { useEffect, useMemo, useRef, useState } from 'react'
import {
  VIEW_KEY,
  computeStats,
  emptyLedger,
  loadLedger,
  makeDemoLedger,
  nextColor,
  rub,
  saveLedger,
  uid,
} from './lib/ledger'
import type { Debt, DebtInput, Ledger, Payment, Person } from './lib/ledger'
import { Header } from './components/Header'
import { PitView } from './components/PitView'
import { LedgerView } from './components/LedgerView'
import { DebtDialog, PaymentDialog } from './components/Dialogs'
import { ConfirmDialog } from './components/Modal'
import { Toast } from './components/Toast'
import type { ToastData } from './components/Toast'

type View = 'pit' | 'ledger'

type ModalState =
  | { type: 'debt'; debt?: Debt }
  | { type: 'payment'; personId?: string }
  | { type: 'delete-debt'; debt: Debt }
  | { type: 'delete-payment'; payment: Payment }
  | { type: 'clear' }
  | null

function resolvePerson(
  people: Person[],
  input: DebtInput,
): { people: Person[]; personId: string; personName: string; created: Person | null } {
  if (input.personId) {
    const existing = people.find((person) => person.id === input.personId)
    return {
      people,
      personId: input.personId,
      personName: existing?.name ?? 'Человек',
      created: null,
    }
  }

  const name = (input.newPersonName ?? '').trim() || 'Без имени'
  const duplicate = people.find(
    (person) => person.name.trim().toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU'),
  )
  if (duplicate) {
    return { people, personId: duplicate.id, personName: duplicate.name, created: null }
  }

  const person: Person = {
    id: uid(),
    name,
    color: nextColor(people),
    createdAt: Date.now(),
  }
  return {
    people: [...people, person],
    personId: person.id,
    personName: person.name,
    created: person,
  }
}

export default function App() {
  const [ledger, setLedger] = useState<Ledger>(() => loadLedger())
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'ledger' ? 'ledger' : 'pit'
    } catch {
      return 'pit'
    }
  })
  const [modal, setModal] = useState<ModalState>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const toastId = useRef(0)
  const stats = useMemo(() => computeStats(ledger), [ledger])

  const balances = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of stats.creditors) map.set(row.person.id, row.balance)
    return map
  }, [stats.creditors])

  useEffect(() => {
    saveLedger(ledger)
  }, [ledger])

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      // Ignore storage errors; the view still works for this session.
    }
  }, [view])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  function notify(message: string, undo?: () => void) {
    toastId.current += 1
    setToast({ id: toastId.current, message, undo })
  }

  function changeView(next: View) {
    if (next === view) return
    setView(next)
    if (window.scrollY > 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    }
  }

  function addDebt(input: DebtInput) {
    const current = ledger
    const resolved = resolvePerson(current.people, input)
    const debt: Debt = {
      id: uid(),
      personId: resolved.personId,
      amount: input.amount,
      comment: input.comment,
      date: input.date,
      createdAt: Date.now(),
    }

    setLedger({
      ...current,
      people: resolved.people,
      debts: [debt, ...current.debts],
    })
    notify(`Долг записан: ${rub(debt.amount)}, ${resolved.personName}`, () => {
      setLedger((previous) => {
        const hasOtherRecords =
          previous.debts.some(
            (item) => item.id !== debt.id && item.personId === resolved.personId,
          ) || previous.payments.some((item) => item.personId === resolved.personId)
        return {
          ...previous,
          debts: previous.debts.filter((item) => item.id !== debt.id),
          people:
            resolved.created && !hasOtherRecords
              ? previous.people.filter((person) => person.id !== resolved.created?.id)
              : previous.people,
        }
      })
    })
  }

  function editDebt(id: string, input: DebtInput) {
    const current = ledger
    const existing = current.debts.find((debt) => debt.id === id)
    if (!existing) return
    const resolved = resolvePerson(current.people, input)
    const updated: Debt = {
      ...existing,
      personId: resolved.personId,
      amount: input.amount,
      comment: input.comment,
      date: input.date,
    }

    setLedger({
      ...current,
      people: resolved.people,
      debts: current.debts.map((debt) => (debt.id === id ? updated : debt)),
    })
    notify(`Долг обновлён: ${rub(updated.amount)}, ${resolved.personName}`)
  }

  function addPayment(personId: string, amount: number, comment: string, date: string) {
    const current = ledger
    const person = current.people.find((item) => item.id === personId)
    const payment: Payment = {
      id: uid(),
      personId,
      amount,
      comment,
      date,
      createdAt: Date.now(),
    }

    setLedger({
      ...current,
      payments: [payment, ...current.payments],
    })
    notify(`Возврат записан: ${rub(amount)}, ${person?.name ?? 'Человек'}`, () => {
      setLedger((previous) => ({
        ...previous,
        payments: previous.payments.filter((item) => item.id !== payment.id),
      }))
    })
  }

  function deleteDebt(debt: Debt) {
    setLedger((previous) => ({
      ...previous,
      debts: previous.debts.filter((item) => item.id !== debt.id),
    }))
    notify(`Долг ${rub(debt.amount)} удалён`, () => {
      setLedger((previous) => ({
        ...previous,
        debts: [debt, ...previous.debts],
      }))
    })
  }

  function deletePayment(payment: Payment) {
    setLedger((previous) => ({
      ...previous,
      payments: previous.payments.filter((item) => item.id !== payment.id),
    }))
    notify(`Возврат ${rub(payment.amount)} удалён`, () => {
      setLedger((previous) => ({
        ...previous,
        payments: [payment, ...previous.payments],
      }))
    })
  }

  function clearAll() {
    const previous = ledger
    const wasDemo = ledger.demo
    setLedger(emptyLedger())
    setModal(null)
    notify(wasDemo ? 'Пример данных убран' : 'Все данные очищены', () => setLedger(previous))
  }

  function loadDemo() {
    const previous = ledger
    setLedger(makeDemoLedger())
    notify('Пример данных загружен', () => setLedger(previous))
  }

  function openPayment(personId?: string) {
    if (stats.creditors.length === 0) {
      notify('Открытых долгов нет')
      return
    }
    setModal({ type: 'payment', personId })
  }

  const hasRecords = ledger.debts.length > 0 || ledger.payments.length > 0

  return (
    <>
      <Header
        view={view}
        onViewChange={changeView}
        onAddDebt={() => setModal({ type: 'debt' })}
        onPay={() => openPayment()}
        canPay={stats.totalOwed > 0}
        demo={ledger.demo}
        onClearDemo={() => setModal({ type: 'clear' })}
      />

      <main className="shell main">
        <div
          key={view}
          id={`view-${view}`}
          role="tabpanel"
          aria-labelledby={`tab-${view}`}
          className="view-enter"
        >
          {view === 'pit' ? (
            <PitView
              stats={stats}
              onAddDebt={() => setModal({ type: 'debt' })}
              onPay={openPayment}
            />
          ) : (
            <LedgerView
              ledger={ledger}
              stats={stats}
              onAddDebt={() => setModal({ type: 'debt' })}
              onPay={openPayment}
              onEditDebt={(debt) => setModal({ type: 'debt', debt })}
              onDeleteDebt={(debt) => setModal({ type: 'delete-debt', debt })}
              onDeletePayment={(payment) => setModal({ type: 'delete-payment', payment })}
            />
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <p className="footer-note">Данные хранятся только в этом браузере.</p>
          <div className="footer-actions">
            {ledger.demo ? (
              <button type="button" className="footer-link" onClick={() => setModal({ type: 'clear' })}>
                Убрать пример
              </button>
            ) : hasRecords ? (
              <button type="button" className="footer-link" onClick={() => setModal({ type: 'clear' })}>
                Очистить данные
              </button>
            ) : (
              <button type="button" className="footer-link" onClick={loadDemo}>
                Загрузить пример
              </button>
            )}
            <span className="footer-mark">Долговая яма</span>
          </div>
        </div>
      </footer>

      {modal?.type === 'debt' ? (
        <DebtDialog
          people={ledger.people}
          initial={modal.debt}
          onClose={() => setModal(null)}
          onSubmit={(input) => {
            if (modal.debt) editDebt(modal.debt.id, input)
            else addDebt(input)
            setModal(null)
          }}
        />
      ) : null}

      {modal?.type === 'payment' ? (
        <PaymentDialog
          people={stats.creditors.map((row) => row.person)}
          balances={balances}
          initialPersonId={modal.personId}
          onClose={() => setModal(null)}
          onSubmit={(personId, amount, comment, date) => {
            addPayment(personId, amount, comment, date)
            setModal(null)
          }}
        />
      ) : null}

      {modal?.type === 'delete-debt' ? (
        <ConfirmDialog
          title="Удалить долг?"
          confirmLabel="Удалить"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => {
            deleteDebt(modal.debt)
            setModal(null)
          }}
          body={
            <p className="confirm-text">
              Долг на {rub(modal.debt.amount)} исчезнет из реестра и из ямы.
            </p>
          }
        />
      ) : null}

      {modal?.type === 'delete-payment' ? (
        <ConfirmDialog
          title="Удалить возврат?"
          confirmLabel="Удалить"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => {
            deletePayment(modal.payment)
            setModal(null)
          }}
          body={
            <p className="confirm-text">
              Возврат на {rub(modal.payment.amount)} исчезнет, и долг снова вырастет.
            </p>
          }
        />
      ) : null}

      {modal?.type === 'clear' ? (
        <ConfirmDialog
          title={ledger.demo ? 'Убрать пример?' : 'Очистить все данные?'}
          confirmLabel={ledger.demo ? 'Убрать пример' : 'Очистить всё'}
          danger
          onClose={() => setModal(null)}
          onConfirm={clearAll}
          body={
            <p className="confirm-text">
              {ledger.demo
                ? 'Примерные люди и долги исчезнут — останется пустая яма. Сразу после этого можно будет отменить.'
                : 'Все люди, долги и возвраты исчезнут из этого браузера. Сразу после этого можно будет отменить.'}
            </p>
          }
        />
      ) : null}

      {toast ? <Toast key={toast.id} toast={toast} onClose={() => setToast(null)} /> : null}
    </>
  )
}
