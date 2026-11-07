import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { formatNumber, parseDigits } from '../lib/ledger'
import type { Person } from '../lib/ledger'
import { Avatar } from './Avatar'
import { IconPlus } from './Icons'

type AmountFieldProps = {
  value: number
  onChange: (value: number) => void
  autoFocus?: boolean
  error?: string
  children?: ReactNode
}

export function AmountField({ value, onChange, autoFocus = false, error, children }: AmountFieldProps) {
  const [text, setText] = useState(value > 0 ? formatNumber(value) : '')
  const inputRef = useRef<HTMLInputElement>(null)
  const caretDigits = useRef<number | null>(null)

  useEffect(() => {
    setText(value > 0 ? formatNumber(value) : '')
    caretDigits.current = null
  }, [value])

  useLayoutEffect(() => {
    if (caretDigits.current === null || !inputRef.current) return
    const formatted = text
    let position = 0
    let seen = 0
    if (caretDigits.current > 0) {
      while (position < formatted.length && seen < caretDigits.current) {
        if (/\d/.test(formatted[position])) seen += 1
        position += 1
        if (seen === caretDigits.current) break
      }
    }
    inputRef.current.setSelectionRange(position, position)
    caretDigits.current = null
  }, [text])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const element = event.currentTarget
    const caret = element.selectionStart ?? element.value.length
    caretDigits.current = element.value.slice(0, caret).replace(/\D/g, '').length
    const next = parseDigits(element.value)
    setText(next > 0 ? formatNumber(next) : '')
    onChange(next)
  }

  return (
    <div className="field">
      <div className="amount-wrap" data-invalid={Boolean(error)}>
        <input
          ref={inputRef}
          className="amount-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={text}
          onChange={handleChange}
          autoFocus={autoFocus}
          aria-label="Сумма в рублях"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'amount-error' : undefined}
        />
        <span className="amount-currency" aria-hidden>
          ₽
        </span>
      </div>
      {children}
      {error ? (
        <p className="field-error" id="amount-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type PersonPickerProps = {
  people: Person[]
  value: string | null
  onChange: (id: string) => void
  newMode: boolean
  onNewMode: (value: boolean) => void
  newName: string
  onNewName: (name: string) => void
  amounts?: Map<string, number>
  error?: string
  allowNew?: boolean
}

export function PersonPicker({
  people,
  value,
  onChange,
  newMode,
  onNewMode,
  newName,
  onNewName,
  amounts,
  error,
  allowNew = true,
}: PersonPickerProps) {
  const duplicate = newMode
    ? people.find(
        (person) =>
          person.name.trim().toLocaleLowerCase('ru-RU') === newName.trim().toLocaleLowerCase('ru-RU'),
      )
    : undefined

  return (
    <div className="field">
      <span className="field-label">Человек</span>
      <div className="chips" role="group" aria-label="Выберите человека">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            className="chip"
            aria-pressed={!newMode && value === person.id}
            onClick={() => {
              onNewMode(false)
              onChange(person.id)
            }}
          >
            <Avatar name={person.name} color={person.color} size={24} />
            <span className="chip-name">{person.name}</span>
            {amounts ? <span className="chip-amount">{formatNumber(amounts.get(person.id) ?? 0)} ₽</span> : null}
          </button>
        ))}
        {allowNew ? (
          <button
            type="button"
            className="chip chip-new"
            aria-pressed={newMode}
            onClick={() => onNewMode(true)}
          >
            <IconPlus width={16} height={16} />
            Новый человек
          </button>
        ) : null}
      </div>
      {allowNew && newMode ? (
        <input
          className="text-input new-name-input"
          type="text"
          value={newName}
          onChange={(event) => onNewName(event.target.value)}
          placeholder="Как зовут человека?"
          autoFocus
          maxLength={60}
          aria-label="Имя нового человека"
        />
      ) : null}
      {newMode && duplicate && newName.trim() ? (
        <p className="field-hint">«{duplicate.name}» уже есть в списке — запись добавится к этому человеку.</p>
      ) : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
