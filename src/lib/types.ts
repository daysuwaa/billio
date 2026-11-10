export type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP'
export type Cycle = 'monthly' | 'yearly' | 'weekly'
export type Rates = Record<'USD' | 'EUR' | 'GBP', number>

export interface Card {
  id: string
  name: string
  cur: Currency
  last4: string
}

export interface Sub {
  id: string
  name: string
  amount: number
  cur: Currency
  cycle: Cycle
  /** An ISO date (yyyy-mm-dd) that one of this subscription's charges falls on. */
  anchor: string
  /** Card id, or '' for no card. */
  card: string
  /** Website, used to fetch the app icon (for example claude.ai). */
  domain?: string
}

export interface Settings {
  rates: Rates
  buffer: number
  horizon: 7 | 14 | 30
  theme: 'system' | 'light' | 'dark'
  /** Gmail suggestions the user said are not subscriptions. */
  ignored?: string[]
  /** When Gmail was last scanned (ISO). */
  lastScan?: string
}

export interface SubPrefill {
  name?: string
  amount?: number
  cur?: Currency
  cycle?: Cycle
  date?: string
  card?: string
  domain?: string
  note?: string
}

export interface User {
  email: string
  name: string
}
