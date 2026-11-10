import { addDays, isValidISO, nextDom, nextMD, parseISO, today } from './dates'
import { SYMBOL_TO_CUR } from './money'
import type { Card, Currency, Cycle } from './types'

const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const CW: Record<string, Currency> = {
  usd: 'USD', dollar: 'USD', dollars: 'USD', bucks: 'USD',
  ngn: 'NGN', naira: 'NGN',
  eur: 'EUR', euro: 'EUR', euros: 'EUR',
  gbp: 'GBP', pound: 'GBP', pounds: 'GBP',
}

export interface Quick {
  name: string
  amount: number | null
  cur: Currency | null
  curGuess: boolean
  cycle: Cycle
  date: Date | null
  card: Card | null
}

const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Reads a line like "Claude 20 USD monthly on the 14th" into structured fields. */
export function parseQuick(input: string, cards: Card[]): Quick {
  let s = ' ' + input.replace(/\s+/g, ' ').trim() + ' '
  let amount: number | null = null
  let cur: Currency | null = null
  let cycle: Cycle | null = null
  let date: Date | null = null
  let card: Card | null = null
  let cardCur: Currency | null = null
  let curGuess = false

  const take = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(s)
    if (m) s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)
    return m
  }
  const num = (a: string, k?: string) => {
    const n = parseFloat(a.replace(/,/g, ''))
    return k ? n * 1000 : n
  }
  let x: RegExpExecArray | null

  if (take(/\b(?:monthly|per month|a month|every month|each month)\b|\/\s*(?:mo|month)\b/i)) cycle = 'monthly'
  else if (take(/\b(?:yearly|annually|annual|per year|a year|every year|each year)\b|\/\s*(?:yr|year)\b/i)) cycle = 'yearly'
  else if (take(/\b(?:weekly|per week|a week|every week|each week)\b|\/\s*(?:wk|week)\b/i)) cycle = 'weekly'

  if ((x = take(/\b(?:on|with|using|via|from)?\s*(?:my\s+)?(usd|dollar|naira|ngn|euro|eur|gbp)\s+card\b/i))) {
    cardCur = CW[x[1].toLowerCase()] ?? null
    card = cards.find((c) => c.cur === cardCur) ?? null
  }
  if (!card) {
    for (const c of cards) {
      if (card) break
      const words = c.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !/^(card|virtual|debit|credit|usd|ngn|naira|dollar|the|my)$/.test(w))
      for (const w of words) {
        const m = take(new RegExp('\\b(?:on|with|using|via|from)?\\s*\\b' + esc(w) + '\\b', 'i'))
        if (m) {
          card = c
          break
        }
      }
    }
  }

  if (take(/\btoday\b/i)) date = today()
  else if (take(/\btomorrow\b/i)) date = addDays(today(), 1)
  else if ((x = take(/\bin\s+(\d{1,3})\s+days?\b/i))) date = addDays(today(), +x[1])
  else if ((x = take(/\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i))) date = nextMD(MON.indexOf(x[2].toLowerCase()), +x[1])
  else if ((x = take(/\b(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/i))) date = nextMD(MON.indexOf(x[1].toLowerCase()), +x[2])
  else if ((x = take(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i))) date = nextDom(+x[1])
  else if ((x = take(/\bon\s+(?:the\s+)?(\d{1,2})\b(?!\s*(?:k\b|usd|ngn|eur|gbp|dollar|naira|euro|pound))/i))) date = nextDom(+x[1])

  if ((x = take(/([$₦€£])\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i))) {
    amount = num(x[2], x[3])
    cur = SYMBOL_TO_CUR[x[1]]
  } else if ((x = take(/(\d[\d,]*(?:\.\d+)?)\s*(k)?\s*(usd|ngn|eur|gbp|dollars?|naira|euros?|pounds?|bucks)\b/i))) {
    amount = num(x[1], x[2])
    cur = CW[x[3].toLowerCase()]
  } else if ((x = take(/\b(usd|ngn|eur|gbp)\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i))) {
    amount = num(x[2], x[3])
    cur = CW[x[1].toLowerCase()]
  } else if ((x = take(/(?:^|\s)(\d[\d,]*(?:\.\d+)?)\s*(k)?(?=\s|$)/i))) {
    amount = num(x[1], x[2])
  }

  if (!cur) {
    if (cardCur) cur = cardCur
    else if (card) cur = card.cur
    else if (amount != null) {
      cur = amount >= 1000 ? 'NGN' : 'USD'
      curGuess = true
    }
  }
  if (!card && cur) card = cards.find((c) => c.cur === cur) ?? cards[0] ?? null

  let name = s.replace(/[/@,;:|]+/g, ' ').replace(/\s+/g, ' ').trim()
  name = name
    .replace(/^(?:(?:on|for|at|per|every|due|next|billed|charges?|renews?|costs?|is)\s+)+/i, '')
    .replace(/(?:\s+(?:on|for|at|per|every|due|next|billed|charges?|renews?|costs?|is|with|using|via|from|my|the))+$/i, '')
    .trim()
  if (name && name === name.toLowerCase()) name = name.charAt(0).toUpperCase() + name.slice(1)

  return { name, amount, cur, curGuess, cycle: cycle ?? 'monthly', date, card }
}

// ---- reading debit alerts and receipts ----

const MONRE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)'
const yr = (y: number) => (y < 100 ? 2000 + y : y)
function mk(y: number, m: number, d: number): Date | null {
  const x = new Date(y, m, d)
  return x.getMonth() === m && x.getDate() === d ? x : null
}

export function parseDateText(t: string): Date | null {
  let m: RegExpExecArray | null
  if ((m = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(t))) return mk(+m[1], +m[2] - 1, +m[3])
  if ((m = new RegExp('\\b(\\d{1,2})[-\\s/]' + MONRE + '[a-z]*[-\\s/,]*(\\d{2,4})\\b', 'i').exec(t))) return mk(yr(+m[3]), MON.indexOf(m[2].toLowerCase()), +m[1])
  if ((m = new RegExp('\\b' + MONRE + '[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b', 'i').exec(t))) return mk(+m[3], MON.indexOf(m[1].toLowerCase()), +m[2])
  if ((m = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/.exec(t))) return mk(yr(+m[3]), +m[2] - 1, +m[1])
  return null
}

export function parseAmountText(t: string): { a: number; c: Currency | null } | null {
  let m: RegExpExecArray | null
  const n = (s: string) => parseFloat(s.replace(/,/g, ''))
  if ((m = /\b(NGN|USD|EUR|GBP)\s*(\d[\d,]*(?:\.\d{1,2})?)/i.exec(t))) return { a: n(m[2]), c: m[1].toUpperCase() as Currency }
  if ((m = /([₦$€£])\s*(\d[\d,]*(?:\.\d{1,2})?)/.exec(t))) return { a: n(m[2]), c: SYMBOL_TO_CUR[m[1]] }
  if ((m = /(\d[\d,]*(?:\.\d{1,2})?)\s*(NGN|USD|EUR|GBP)\b/i.exec(t))) return { a: n(m[1]), c: m[2].toUpperCase() as Currency }
  if ((m = /\bN(\d[\d,]*(?:\.\d{1,2})?)\b/.exec(t))) return { a: n(m[1]), c: 'NGN' }
  if ((m = /\b(?:amt|amount|total|debit(?:ed)?|paid|charged)\b\s*[:-]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i.exec(t))) return { a: n(m[1]), c: null }
  if ((m = /(?:^|[^\d.,])(\d[\d,]*\.\d{2})(?!\d)/.exec(t))) return { a: n(m[1]), c: null }
  return null
}

const STOP = /^(DEBIT|ALERT|NGN|USD|EUR|GBP|ACCT|ACCOUNT|AMT|AMOUNT|DESC|DESCRIPTION|DATE|BAL|BALANCE|AVAIL|AVAILABLE|PURCHASE|POS|WEB|TRANSFER|TRF|NIP|CARD|PAYMENT|TRANSACTION|TXN|REF|TIME|DR|CR|OF|AT|ON|THE|TO|FROM|FOR|YOUR|WITH|ENDING|RECEIPT|TOTAL|PAID|INVOICE)$/

export function guessMerchant(t: string): string {
  let m: RegExpExecArray | null
  m = /\b(?:desc(?:ription)?|narration|merchant)\s*[:-]\s*([^\n|;]{3,60})/i.exec(t)
  let raw: string | null = m ? m[1] : null
  if (!raw && (m = /\b(?:receipt from|invoice from|(?:at|to))\s+([A-Za-z0-9][A-Za-z0-9.*/&'\- ]{2,40})/i.exec(t))) raw = m[1]
  if (!raw) {
    const runs = t.match(/[A-Z][A-Z0-9.*/&'-]{2,}(?: [A-Z][A-Z0-9.*/&'-]{2,})*/g) ?? []
    raw = runs.filter((r) => r.split(' ').some((w) => !STOP.test(w))).sort((a, b) => b.length - a.length)[0] ?? null
  }
  if (!raw) return ''
  const words = raw
    .replace(/[*/]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^\d+$/.test(w) && !STOP.test(w.toUpperCase()) && !/^(on|date|ref|via|for)$/i.test(w))
  const out: string[] = []
  for (let i = 0; i < words.length && out.length < 3; i++) {
    if (/^\d{1,2}[-/]/.test(words[i]) || /^date/i.test(words[i])) break
    out.push(words[i].replace(/[:.,]+$/, ''))
  }
  const s = out.join(' ').trim()
  return s ? s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : ''
}

export { isValidISO, parseISO }
