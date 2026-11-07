export type Person = {
  id: string
  name: string
  color: string
  createdAt: number
}

export type Debt = {
  id: string
  personId: string
  amount: number
  comment: string
  date: string
  createdAt: number
}

export type Payment = {
  id: string
  personId: string
  amount: number
  comment: string
  date: string
  createdAt: number
}

export type Ledger = {
  people: Person[]
  debts: Debt[]
  payments: Payment[]
  demo: boolean
}

export type DebtInput = {
  personId: string | null
  newPersonName?: string
  amount: number
  comment: string
  date: string
}

export const STORAGE_KEY = 'dolgyama:ledger:v1'
export const VIEW_KEY = 'dolgyama:view'

export const STRATA_COLORS = [
  '#c8814e',
  '#6e8a64',
  '#b75a3e',
  '#7b91a5',
  '#c7a45c',
  '#8a6c80',
  '#56807a',
  '#a98b60',
  '#9a6653',
  '#7d845f',
]

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function nextColor(people: Person[]): string {
  const used = new Set(people.map((person) => person.color))
  return STRATA_COLORS.find((color) => !used.has(color)) ?? STRATA_COLORS[people.length % STRATA_COLORS.length]
}

const rubFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

export function formatNumber(value: number): string {
  return rubFormatter.format(Math.round(value))
}

export function rub(value: number): string {
  return `${formatNumber(value)}\u00a0₽`
}

export function parseDigits(value: string): number {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  return digits ? Number(digits) : 0
}

export function plural(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count)
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function peopleWord(count: number): string {
  return plural(count, 'человек', 'человека', 'человек')
}

export function debtWord(count: number): string {
  return plural(count, 'долг', 'долга', 'долгов')
}

function toLocalISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return toLocalISO(new Date())
}

export function daysAgoISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toLocalISO(date)
}

function parseISO(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const longDateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const date = parseISO(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const short = shortDateFormatter.format(date).replace('.', '')
  return sameYear ? short : `${short} ${date.getFullYear()}`
}

export function formatDateLong(iso: string): string {
  if (!iso) return '—'
  const date = parseISO(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return longDateFormatter.format(date)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function contrastOn(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.66 ? '#131b16' : '#f7f6ef'
}

export function inkOn(hex: string): string {
  return contrastOn(hex)
}

export type PersonStats = {
  person: Person
  owed: number
  paid: number
  balance: number
  debtCount: number
  paymentCount: number
  lastActivity: string
  share: number
}

export type LedgerStats = {
  rows: PersonStats[]
  creditors: PersonStats[]
  totalOwed: number
  totalLent: number
  totalReturned: number
  debtCount: number
  paymentCount: number
  peopleInDebt: number
  repaidShare: number
}

export function computeStats(ledger: Ledger): LedgerStats {
  const map = new Map<string, PersonStats>()

  for (const person of ledger.people) {
    map.set(person.id, {
      person,
      owed: 0,
      paid: 0,
      balance: 0,
      debtCount: 0,
      paymentCount: 0,
      lastActivity: '',
      share: 0,
    })
  }

  for (const debt of ledger.debts) {
    const row = map.get(debt.personId)
    if (!row) continue
    row.owed += debt.amount
    row.debtCount += 1
    if (debt.date > row.lastActivity) row.lastActivity = debt.date
  }

  for (const payment of ledger.payments) {
    const row = map.get(payment.personId)
    if (!row) continue
    row.paid += payment.amount
    row.paymentCount += 1
    if (payment.date > row.lastActivity) row.lastActivity = payment.date
  }

  const rows = [...map.values()].filter((row) => row.debtCount > 0 || row.paymentCount > 0)
  for (const row of rows) row.balance = row.owed - row.paid
  rows.sort((a, b) => b.balance - a.balance)

  const totalOwed = rows.reduce((sum, row) => sum + Math.max(0, row.balance), 0)
  const totalLent = ledger.debts.reduce((sum, debt) => sum + debt.amount, 0)
  const totalReturned = ledger.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const creditors = rows.filter((row) => row.balance > 0)

  for (const row of rows) {
    row.share = totalOwed > 0 ? Math.max(0, row.balance) / totalOwed : 0
  }

  return {
    rows,
    creditors,
    totalOwed,
    totalLent,
    totalReturned,
    debtCount: ledger.debts.length,
    paymentCount: ledger.payments.length,
    peopleInDebt: creditors.length,
    repaidShare: totalLent > 0 ? Math.min(1, totalReturned / totalLent) : 0,
  }
}

export function makeDemoLedger(): Ledger {
  const anna: Person = { id: uid(), name: 'Аня', color: STRATA_COLORS[0], createdAt: Date.now() }
  const mark: Person = { id: uid(), name: 'Марк', color: STRATA_COLORS[1], createdAt: Date.now() }
  const ilya: Person = { id: uid(), name: 'Илья', color: STRATA_COLORS[2], createdAt: Date.now() }
  const dasha: Person = { id: uid(), name: 'Даша', color: STRATA_COLORS[3], createdAt: Date.now() }

  return {
    people: [anna, mark, ilya, dasha],
    debts: [
      {
        id: uid(),
        personId: anna.id,
        amount: 32000,
        comment: 'За общий ужин в «Курочке»',
        date: daysAgoISO(26),
        createdAt: Date.now() - 26 * 86400000,
      },
      {
        id: uid(),
        personId: mark.id,
        amount: 21500,
        comment: 'Доля за ремонт лоджии',
        date: daysAgoISO(18),
        createdAt: Date.now() - 18 * 86400000,
      },
      {
        id: uid(),
        personId: ilya.id,
        amount: 18400,
        comment: 'Одолжил до зарплаты',
        date: daysAgoISO(11),
        createdAt: Date.now() - 11 * 86400000,
      },
      {
        id: uid(),
        personId: dasha.id,
        amount: 12800,
        comment: 'Билеты на «Мумий Тролль»',
        date: daysAgoISO(4),
        createdAt: Date.now() - 4 * 86400000,
      },
      {
        id: uid(),
        personId: mark.id,
        amount: 3200,
        comment: 'Кофе и такси после кино',
        date: daysAgoISO(2),
        createdAt: Date.now() - 2 * 86400000,
      },
    ],
    payments: [
      {
        id: uid(),
        personId: anna.id,
        amount: 5000,
        comment: 'Вернула часть за ужин',
        date: daysAgoISO(9),
        createdAt: Date.now() - 9 * 86400000,
      },
    ],
    demo: true,
  }
}

export function emptyLedger(): Ledger {
  return { people: [], debts: [], payments: [], demo: false }
}

export function loadLedger(): Ledger {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Ledger
      if (
        parsed &&
        Array.isArray(parsed.people) &&
        Array.isArray(parsed.debts) &&
        Array.isArray(parsed.payments)
      ) {
        return { ...parsed, demo: Boolean(parsed.demo) }
      }
    }
  } catch {
    // A broken record should not block the app.
  }
  return makeDemoLedger()
}

export function saveLedger(ledger: Ledger): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger))
  } catch {
    // Storage can be unavailable in private mode; the app still works in memory.
  }
}
