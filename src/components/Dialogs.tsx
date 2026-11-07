import { useState } from 'react'
import type { FormEvent } from 'react'
import { formatNumber, rub, todayISO } from '../lib/ledger'
import type { Debt, DebtInput, Person } from '../lib/ledger'
import { AmountField, PersonPicker } from './FormBits'
import { Modal } from './Modal'

type DebtDialogProps = {
  people: Person[]
  initial?: Debt
  onSubmit: (input: DebtInput) => void
  onClose: () => void
}

export function DebtDialog({ people, initial, onSubmit, onClose }: DebtDialogProps) {
  const editing = Boolean(initial)
  const [personId, setPersonId] = useState<string | null>(
    initial?.personId ?? (people.length === 1 ? people[0].id : null),
  )
  const [newMode, setNewMode] = useState(people.length === 0)
  const [newName, setNewName] = useState('')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [errors, setErrors] = useState<{ amount?: string; person?: string }>({})

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: { amount?: string; person?: string } = {}

    if (amount <= 0) nextErrors.amount = 'Введите сумму больше нуля.'
    if (newMode) {
      if (!newName.trim()) nextErrors.person = 'Введите имя нового человека.'
    } else if (!personId) {
      nextErrors.person = 'Выберите, кому вы должны.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      personId: newMode ? null : personId,
      newPersonName: newMode ? newName.trim() : undefined,
      amount,
      comment: comment.trim(),
      date,
    })
  }

  return (
    <Modal
      title={editing ? 'Изменить долг' : 'Новый долг'}
      subtitle={editing ? 'Сумма, человек или комментарий' : 'Сколько и кому вы задолжали'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <AmountField
          value={amount}
          onChange={setAmount}
          autoFocus
          error={errors.amount}
        />

        <PersonPicker
          people={people}
          value={personId}
          onChange={setPersonId}
          newMode={newMode}
          onNewMode={setNewMode}
          newName={newName}
          onNewName={setNewName}
          error={errors.person}
        />

        <div className="field">
          <label className="field-label" htmlFor="debt-comment">
            Комментарий <span className="field-optional">необязательно</span>
          </label>
          <textarea
            id="debt-comment"
            className="text-area"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="За что долг — например, за ужин или билеты"
            rows={2}
            maxLength={240}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="debt-date">
            {editing ? 'Дата долга' : 'Когда взяли'}
          </label>
          <input
            id="debt-date"
            className="text-input date-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary">
            {editing ? 'Сохранить' : 'Добавить долг'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

type PaymentDialogProps = {
  people: Person[]
  balances: Map<string, number>
  initialPersonId?: string
  onSubmit: (personId: string, amount: number, comment: string, date: string) => void
  onClose: () => void
}

export function PaymentDialog({
  people,
  balances,
  initialPersonId,
  onSubmit,
  onClose,
}: PaymentDialogProps) {
  const firstPerson = people.find((person) => person.id === initialPersonId) ?? people[0]
  const [personId, setPersonId] = useState<string | null>(firstPerson?.id ?? null)
  const [amount, setAmount] = useState(0)
  const [comment, setComment] = useState('')
  const [date, setDate] = useState(todayISO())
  const [errors, setErrors] = useState<{ amount?: string; person?: string }>({})

  const selected = people.find((person) => person.id === personId)
  const remaining = personId ? (balances.get(personId) ?? 0) : 0

  const changePerson = (id: string) => {
    setPersonId(id)
    setAmount(0)
    setErrors({})
  }

  const amountError =
    errors.amount ??
    (selected && amount > remaining
      ? `У ${selected.name} всего ${rub(remaining)} долга — вернуть больше не получится.`
      : undefined)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: { amount?: string; person?: string } = {}

    if (!personId || !selected) nextErrors.person = 'Выберите, кому возвращаете деньги.'
    if (amount <= 0) nextErrors.amount = 'Введите сумму больше нуля.'
    else if (amount > remaining) {
      nextErrors.amount = `У ${selected?.name ?? 'человека'} осталось ${rub(remaining)}.`
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit(personId as string, amount, comment.trim(), date)
  }

  const setQuick = (value: number) => {
    setAmount(value)
    setErrors((current) => ({ ...current, amount: undefined }))
  }

  return (
    <Modal
      title="Вернуть деньги"
      subtitle="Долг уменьшится, полоска в яме станет тоньше"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <AmountField value={amount} onChange={setAmount} autoFocus error={amountError}>
          {selected && remaining > 0 ? (
            <div className="quick-row">
              <button
                type="button"
                className="quick-btn"
                onClick={() => setQuick(Math.max(1, Math.floor(remaining / 4)))}
              >
                25%
              </button>
              <button
                type="button"
                className="quick-btn"
                onClick={() => setQuick(Math.max(1, Math.floor(remaining / 2)))}
              >
                50%
              </button>
              <button type="button" className="quick-btn" onClick={() => setQuick(remaining)}>
                Весь остаток · {rub(remaining)}
              </button>
              {amount === remaining && amount > 0 ? (
                <span className="quick-note">долг закроется полностью</span>
              ) : null}
            </div>
          ) : null}
        </AmountField>

        <PersonPicker
          people={people}
          value={personId}
          onChange={changePerson}
          newMode={false}
          onNewMode={() => undefined}
          newName=""
          onNewName={() => undefined}
          amounts={balances}
          error={errors.person}
          allowNew={false}
        />

        <div className="field">
          <label className="field-label" htmlFor="payment-comment">
            Комментарий <span className="field-optional">необязательно</span>
          </label>
          <textarea
            id="payment-comment"
            className="text-area"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Например, перевод на карту"
            rows={2}
            maxLength={240}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="payment-date">
            Дата возврата
          </label>
          <input
            id="payment-date"
            className="text-input date-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary">
            {amount > 0 ? `Вернуть ${formatNumber(amount)} ₽` : 'Вернуть деньги'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
