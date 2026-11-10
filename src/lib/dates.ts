import type { Cycle } from './types'

const DAY = 864e5

export function today(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function isValidISO(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime())
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function addMonths(a: Date, n: number): Date {
  const last = new Date(a.getFullYear(), a.getMonth() + n + 1, 0).getDate()
  return new Date(a.getFullYear(), a.getMonth() + n, Math.min(a.getDate(), last))
}

export function daysUntil(d: Date): number {
  return Math.round((d.getTime() - today().getTime()) / DAY)
}

/** The next charge on or after today, rolled forward from the anchor date. */
export function nextDue(s: { anchor: string; cycle: Cycle }): Date {
  const t = today()
  const a = parseISO(s.anchor)
  if (a >= t) return a
  if (s.cycle === 'weekly') {
    const weeks = Math.ceil(Math.round((t.getTime() - a.getTime()) / DAY) / 7)
    return addDays(a, weeks * 7)
  }
  const per = s.cycle === 'yearly' ? 12 : 1
  let k = 1
  let d = addMonths(a, per)
  while (d < t && k < 1200) {
    k++
    d = addMonths(a, per * k)
  }
  return d
}

/** The charge after a given charge date, never in the past. */
export function advance(d: Date, cycle: Cycle): Date {
  const t = today()
  let i = 1
  if (cycle === 'weekly') {
    let x = addDays(d, 7)
    while (x < t && i < 400) {
      x = addDays(x, 7)
      i++
    }
    return x
  }
  const per = cycle === 'yearly' ? 12 : 1
  let x = addMonths(d, per)
  while (x < t && i < 400) {
    i++
    x = addMonths(d, per * i)
  }
  return x
}

function daysIn(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate()
}

/** The next date that falls on a given day of the month. */
export function nextDom(day: number): Date | null {
  if (day < 1 || day > 31) return null
  const t = today()
  let d = new Date(t.getFullYear(), t.getMonth(), Math.min(day, daysIn(t.getFullYear(), t.getMonth())))
  if (d < t) {
    const y = t.getFullYear()
    const m = t.getMonth() + 1
    d = new Date(y, m, Math.min(day, daysIn(y, m)))
  }
  return d
}

/** The next date for a month (0 to 11) and day. */
export function nextMD(m: number, day: number): Date | null {
  if (m < 0 || day < 1 || day > 31) return null
  const t = today()
  let d = new Date(t.getFullYear(), m, day)
  if (d.getMonth() !== m) return null
  if (d < t) d = new Date(t.getFullYear() + 1, m, day)
  return d
}

export function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

export function rel(n: number): string {
  return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'in ' + n + ' days'
}
