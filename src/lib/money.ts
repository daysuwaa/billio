import type { Currency, Rates, Sub } from './types'

const SYM: Record<Currency, string> = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' }
export const SYMBOL_TO_CUR: Record<string, Currency> = { $: 'USD', '₦': 'NGN', '€': 'EUR', '£': 'GBP' }
export const CURRENCIES: Currency[] = ['USD', 'NGN', 'EUR', 'GBP']

export function fmt(v: number, cur: Currency): string {
  if (cur === 'NGN') return SYM.NGN + Math.round(v).toLocaleString('en-US')
  return SYM[cur] + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function rateOf(cur: Currency, rates: Rates): number {
  return cur === 'NGN' ? 1 : rates[cur]
}

export function convert(v: number, from: Currency, to: Currency, rates: Rates): number {
  return (v * rateOf(from, rates)) / rateOf(to, rates)
}

/** What a subscription costs per month, in naira. */
export function monthlyNGN(s: Sub, rates: Rates): number {
  const factor = s.cycle === 'yearly' ? 1 / 12 : s.cycle === 'weekly' ? 52 / 12 : 1
  return convert(s.amount, s.cur, 'NGN', rates) * factor
}
