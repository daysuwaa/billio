import { daysUntil, nextDue } from './dates'
import type { Sub } from './types'

export interface Item {
  s: Sub
  d: Date
  n: number
}

export function itemsOf(subs: Sub[]): Item[] {
  return subs
    .map((s) => {
      const d = nextDue(s)
      return { s, d, n: daysUntil(d) }
    })
    .sort((a, b) => a.d.getTime() - b.d.getTime() || a.s.name.localeCompare(b.s.name))
}
