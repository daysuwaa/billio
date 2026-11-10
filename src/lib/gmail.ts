import { advance, today } from './dates'
import { MERCHANTS, type Merchant } from './merchants'
import { parseAmountText, parseDateText } from './parse'
import type { Currency, Cycle, Sub } from './types'

/** Set VITE_GOOGLE_CLIENT_ID in .env (see .env.example). */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const QUERY = '(receipt OR invoice OR membership OR renewed OR confirmed OR "payment received" OR "payment confirmation" OR renewal OR renews OR subscription OR billing) newer_than:400d'
const MAX_MESSAGES = 120

interface TokenResponse { access_token?: string; error?: string }
interface TokenClient { requestAccessToken: (o?: { prompt?: string }) => void }
declare global {
  interface Window {
    google?: { accounts: { oauth2: { initTokenClient: (c: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: () => void }) => TokenClient } } }
  }
}

function loadGoogle(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not reach Google. Check your connection and try again.'))
    document.head.appendChild(s)
  })
}

/** Opens Google's own approval screen. Billio never sees the password. */
export async function requestGmailToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error('not-configured')
  await loadGoogle()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error('Gmail access was not approved.'))),
      error_callback: () => reject(new Error('Gmail access was not approved.')),
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

interface Part { mimeType?: string; body?: { data?: string }; parts?: Part[] }
interface Msg { internalDate?: string; snippet?: string; payload?: Part & { headers?: { name: string; value: string }[] } }

function decode(b64: string): string {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function bodyText(p: Part | undefined): string {
  if (!p) return ''
  const plain: string[] = []
  const html: string[] = []
  const walk = (x: Part) => {
    if (x.mimeType === 'text/plain' && x.body?.data) plain.push(decode(x.body.data))
    else if (x.mimeType === 'text/html' && x.body?.data) html.push(decode(x.body.data).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#36;|&dollar;/g, '$').replace(/\s+/g, ' '))
    ;(x.parts ?? []).forEach(walk)
  }
  walk(p)
  // Many receipts keep the amounts only in the HTML part, so read both.
  return [...plain, ...html].join('\n')
}

const SKIP_SENDER = /(^|[.@])(gmail|google|accounts\.google|paystack|flutterwave|mail|email|e-mail)\.|bank|alert|noreply@(gt|zenith|access|uba|firstbank)/i
const unknown = new Set<string>()

/** For senders not in the dictionary: build a merchant from the From header. */
function guessSender(from: string): Merchant | null {
  const addr = /<?([\w.+-]+@([\w-]+(?:\.[\w-]+)+))>?/.exec(from)
  if (!addr || SKIP_SENDER.test(addr[2])) return null
  const parts = addr[2].toLowerCase().split('.')
  const base = parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2]
  const display = from.replace(/<.*>/, '').replace(/["']/g, '').replace(/\b(inc|llc|ltd|billing|receipts?|payments?|team|support|no-?reply)\b/gi, '').trim()
  const name = (display.length > 1 && display.length < 30 ? display : base.charAt(0).toUpperCase() + base.slice(1)).trim()
  unknown.add(name)
  const domain = parts.slice(-2).join('.')
  return { test: /$^/, name, cycle: 'monthly', note: '', subRe: new RegExp(name.replace(/[^\w ]/g, '').split(' ')[0] || base, 'i'), domain }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function api<T>(token: string, path: string, attempt = 0): Promise<T> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, { headers: { Authorization: 'Bearer ' + token } })
  if (res.ok) return res.json() as Promise<T>
  let reason = ''
  try { reason = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '' } catch { /* no body */ }
  const limited = res.status === 429 || (res.status === 403 && /quota|rate/i.test(reason))
  if (limited && attempt < 5) {
    await wait(1500 * 2 ** attempt)
    return api<T>(token, path, attempt + 1)
  }
  throw new Error((res.status === 401 || res.status === 403 ? 'Gmail refused access' : 'Gmail did not respond') + (reason ? ': ' + reason : '. Try again in a moment.'))
}

export interface Found {
  key: string
  name: string
  domain: string
  amount: number
  cur: Currency
  cycle: Cycle
  last: Date
  next: Date
  seen: number
  /** The amount is not in the email (for example it is inside a PDF), so the user types it. */
  needsAmount?: boolean
}

interface Rec { date: Date; amount: number; cur: Currency; cycle?: Cycle; due?: Date; strong?: boolean }
const RECEIPTY = /receipt|invoice|payment|billing|renew|subscription|membership|confirm|charged|your order|thank you/i
const STRONG = /renew|subscription|membership|recurring|auto-?pay/i
const NOT_SUB = /\b(order|shipped|shipping|delivery|delivered|courier|promo|voucher|credit|compensation|refund|cart|sorry|rate your)\b/i

function cycleHint(t: string): Cycle | undefined {
  if (/per year|\/\s*year|annual|yearly|1 year/i.test(t)) return 'yearly'
  if (/per month|\/\s*month|monthly|each month/i.test(t)) return 'monthly'
  if (/per week|\/\s*week|weekly/i.test(t)) return 'weekly'
}

/** Apple bills many apps under one sender, so pull the app name out of the body. */
function appleApp(t: string): string | null {
  const a = /\bApp\s+([^:]{2,30}?)\s*:/.exec(t)
  if (a) return a[1].trim()
  const pre = t.split(/Dear /)[0].replace(/^\s*Apple\s*/i, '').replace(/^\s*Subscription\s+\w+\s*/i, '')
  const b = /^\s*([^:]{2,30}?)\s*:/.exec(pre)
  return b ? b[1].trim() : null
}

function guessCycle(dates: Date[], fallback: Cycle): Cycle {
  if (dates.length < 2) return fallback
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const gaps = sorted.slice(1).map((d, i) => (d.getTime() - sorted[i].getTime()) / 864e5).filter((g) => g > 3)
  if (!gaps.length) return fallback
  const med = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
  if (med < 12) return 'weekly'
  if (med < 50) return 'monthly'
  if (med > 300) return 'yearly'
  return fallback
}

const STALE_DAYS: Record<Cycle, number> = { weekly: 21, monthly: 75, yearly: 400 }

/** Reads receipts in the user's Gmail, on this device, and works out what is still active. */
export async function scanGmail(token: string, tracked: Sub[], onProgress: (done: number, total: number) => void): Promise<Found[]> {
  const list = await api<{ messages?: { id: string }[] }>(token, 'messages?maxResults=' + MAX_MESSAGES + '&q=' + encodeURIComponent(QUERY))
  const ids = (list.messages ?? []).map((m) => m.id)
  const by = new Map<string, { m: Merchant; recs: Rec[] }>()
  let done = 0
  onProgress(0, ids.length)

  const handle = async (id: string) => {
    const msg = await api<Msg>(token, 'messages/' + id + '?format=metadata&metadataHeaders=From&metadataHeaders=Subject')
    const h = (n: string) => msg.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? ''
    const subject = h('subject')
    const from = h('from')
    if (!RECEIPTY.test(subject + ' ' + (msg.snippet ?? ''))) return
    const known = MERCHANTS.find((m) => m.test.test(from + ' ' + subject))
    const hay = subject + ' ' + (msg.snippet ?? '')
    if (!known && (!STRONG.test(hay) || NOT_SUB.test(hay))) return
    const merchant = known ?? guessSender(from)
    if (!merchant) return
    const isApple = merchant.domain === 'apple.com'
    let a = parseAmountText(subject + '\n' + (msg.snippet ?? ''))
    let body = ''
    if (!a || isApple || STRONG.test(subject)) {
      const full = await api<Msg>(token, 'messages/' + id + '?format=full')
      body = bodyText(full.payload).slice(0, 8000)
      const renewal = /renewal price\s*[:\-]?\s*([₦$€£]|NGN|USD|EUR|GBP)?\s*([\d,]+(?:\.\d{1,2})?)/i.exec(body)
      a = renewal ? parseAmountText((renewal[1] ?? '') + renewal[2]) ?? parseAmountText(body) : parseAmountText(body)
    }
    const priced = !!a && a.a > 0
    if (!priced && known) return
    let m = merchant
    if (isApple) {
      const app = appleApp(body)
      if (app) { m = { ...merchant, name: app, domain: '', subRe: new RegExp(app.split(' ')[0].replace(/[^\w]/g, ''), 'i') }; unknown.add(app) }
    }
    const dm = /(?:renew\w*|starting|next billing date|next payment(?: date)?|next charge|billing date)\s*(?:on|from|date)?\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i.exec(body)
    const due = dm ? parseDateText(dm[1]) ?? undefined : undefined
    const date = new Date(Number(msg.internalDate ?? Date.now()))
    const e = by.get(m.name) ?? { m, recs: [] }
    e.recs.push({ date, amount: priced && a ? a.a : 0, cur: (priced && a?.c) || 'NGN', cycle: cycleHint(subject + ' ' + body), due, strong: STRONG.test(subject) })
    by.set(m.name, e)
  }

  for (let i = 0; i < ids.length; i += 5) {
    const batch = ids.slice(i, i + 5)
    await Promise.all(batch.map(handle))
    done += batch.length
    onProgress(done, ids.length)
  }

  const t = today().getTime()
  const out: Found[] = []
  by.forEach(({ m, recs }, key) => {
    if (tracked.some((s) => m.subRe.test(s.name))) return
    if (unknown.has(m.name) && recs.length < 2 && !recs[0].due && !recs[0].strong) return
    const sorted = [...recs].sort((a, b) => b.date.getTime() - a.date.getTime())
    const latest = sorted[0]
    const cycle = guessCycle(recs.map((r) => r.date), recs.find((r) => r.cycle)?.cycle ?? m.cycle)
    let due = recs.map((r) => r.due).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0]
    while (due && due.getTime() < t) due = advance(due, cycle)
    const age = (t - latest.date.getTime()) / 864e5
    if (!due && age > STALE_DAYS[cycle]) return
    const priced = sorted.find((r) => r.amount > 0)
    let next = due ?? advance(latest.date, cycle)
    while (next.getTime() < t) next = advance(next, cycle)
    out.push({ key, name: m.name, domain: m.domain, amount: priced?.amount ?? 0, cur: priced?.cur ?? latest.cur, cycle, last: latest.date, next, seen: recs.length, needsAmount: !priced })
  })
  return out.sort((a, b) => a.next.getTime() - b.next.getTime())
}
