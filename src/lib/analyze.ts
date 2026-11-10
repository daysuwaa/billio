import { nextDue, today } from './dates'
import { MERCHANTS, type Merchant } from './merchants'
import { guessMerchant, parseAmountText, parseDateText } from './parse'
import type { Currency, Cycle, Sub } from './types'

export interface Analysis {
  known: Merchant | null
  name: string
  domain?: string
  amount: number | null
  cur: Currency | null
  curAssumed: boolean
  date: Date
  dateAssumed: boolean
  cycle: Cycle
  tracked: { sub: Sub; due: Date } | null
}

/** Works out who a pasted debit alert or receipt is from, and whether it is already tracked. */
export function analyzeCharge(text: string, subs: Sub[]): Analysis {
  const known = MERCHANTS.find((m) => m.test.test(text)) ?? null
  const name = known ? known.name : guessMerchant(text)
  const a = parseAmountText(text)
  let amount: number | null = null
  let cur: Currency | null = null
  let curAssumed = false
  if (a && a.a > 0) {
    amount = a.a
    cur = a.c
    if (!cur) {
      cur = 'NGN'
      curAssumed = true
    }
  }
  let date = parseDateText(text)
  let dateAssumed = false
  if (!date) {
    date = today()
    dateAssumed = true
  }
  const low = text.toLowerCase()
  const hit = subs.find((s) => {
    if (known) return known.subRe.test(s.name)
    const w = s.name.toLowerCase().split(/\s+/)[0]
    return w.length > 2 && low.includes(w)
  })
  return {
    known,
    name,
    domain: known?.domain,
    amount,
    cur,
    curAssumed,
    date,
    dateAssumed,
    cycle: known?.cycle ?? 'monthly',
    tracked: hit ? { sub: hit, due: nextDue(hit) } : null,
  }
}
