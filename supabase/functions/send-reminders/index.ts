// Billio reminder emails. Runs once a day (see supabase.sql / README) and emails
// each user about charges coming up in 3 days, 1 day and today (Lagos time).
import { createClient } from 'npm:@supabase/supabase-js@2'

const DAY = 864e5
type Cycle = 'weekly' | 'monthly' | 'yearly'
type Cur = 'NGN' | 'USD' | 'EUR' | 'GBP'
interface Sub { user_id: string; id: string; name: string; amount: number | string; cur: Cur; cycle: Cycle; anchor: string; card: string }
interface Card { user_id: string; id: string; name: string }
interface Profile { user_id: string; name: string; settings: { rates?: Record<string, number> } | null }

// ---- dates (all in UTC midnights, so Lagos "today" is simply UTC+1) ----
const lagosToday = () => {
  const n = new Date(Date.now() + 3600e3)
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
}
const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)
const addMonths = (a: Date, n: number) => {
  const last = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + n + 1, 0)).getUTCDate()
  return new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + n, Math.min(a.getUTCDate(), last)))
}
export function nextDue(s: { anchor: string; cycle: Cycle }, t: Date): Date {
  const a = parseISO(s.anchor)
  if (a >= t) return a
  if (s.cycle === 'weekly') return addDays(a, Math.ceil(Math.round((t.getTime() - a.getTime()) / DAY) / 7) * 7)
  const per = s.cycle === 'yearly' ? 12 : 1
  let k = 1
  let d = addMonths(a, per)
  while (d < t && k < 1200) { k++; d = addMonths(a, per * k) }
  return d
}

// ---- money + wording ----
const SYM: Record<Cur, string> = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' }
const money = (v: number, c: Cur) => c === 'NGN' ? SYM.NGN + Math.round(v).toLocaleString('en-US') : SYM[c] + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const when = (n: number) => n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'
const dateLabel = (d: Date) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d)
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** "3,1,0" or "0-30" or "0-3,7". */
function parseDays(q: string | null): Set<number> {
  const out = new Set<number>()
  for (const part of (q ?? '3,1,0').split(',')) {
    const [a, b] = part.split('-').map((x) => parseInt(x, 10))
    if (Number.isNaN(a)) continue
    const end = b === undefined || Number.isNaN(b) ? a : b
    for (let i = a; i <= end; i++) out.add(i)
  }
  return out
}

interface Row { sub: Sub; due: Date; n: number; card?: string; naira: number }

function compose(name: string, rows: Row[], appUrl: string) {
  rows.sort((a, b) => a.n - b.n || a.sub.name.localeCompare(b.sub.name))
  const one = rows.length === 1
  const first = rows[0]
  const subject = one
    ? first.sub.name + ' charges ' + money(Number(first.sub.amount), first.sub.cur) + ' ' + when(first.n)
    : rows.length + ' charges coming up, first one ' + when(first.n)
  const lines = rows.map((r) => {
    const amt = money(Number(r.sub.amount), r.sub.cur)
    const approx = r.sub.cur !== 'NGN' ? ' <span style="color:#69706C">(about ' + money(r.naira, 'NGN') + ')</span>' : ''
    return '<tr><td style="padding:14px 0;border-bottom:1px solid #E3E6E2"><div style="font-size:16px;font-weight:500">' + esc(r.sub.name) + '</div>'
      + '<div style="color:#69706C;font-size:14px">' + dateLabel(r.due) + ', ' + when(r.n) + (r.card ? '. Charged to ' + esc(r.card) : '') + '</div></td>'
      + '<td style="padding:14px 0;border-bottom:1px solid #E3E6E2;text-align:right;font-size:16px;font-weight:500;white-space:nowrap">' + amt + approx + '</td></tr>'
  }).join('')
  const html = '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#101412;max-width:520px;margin:0 auto;padding:28px 20px">'
    + '<div style="font-size:18px;font-weight:500;margin-bottom:22px">Billio</div>'
    + '<div style="font-size:22px;font-weight:300;letter-spacing:-0.02em;margin-bottom:6px">Hi ' + esc(name || 'there') + ', ' + (one ? 'a charge is' : 'charges are') + ' coming up.</div>'
    + '<div style="color:#69706C;margin-bottom:10px">Put enough on your card so it does not fail or catch you by surprise.</div>'
    + '<table style="width:100%;border-collapse:collapse">' + lines + '</table>'
    + '<div style="margin-top:26px"><a href="' + appUrl + '" style="background:#0B7A45;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:500;display:inline-block">Open Billio</a></div>'
    + '<div style="color:#69706C;font-size:12px;margin-top:28px">You get this because you track subscriptions in Billio. Billio never asks for your card number, PIN or CVV.</div></div>'
  const text = rows.map((r) => r.sub.name + ': ' + money(Number(r.sub.amount), r.sub.cur) + ' ' + when(r.n) + ' (' + dateLabel(r.due) + ')').join('\n') + '\n\nOpen Billio: ' + appUrl
  return { subject, html, text }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('Not allowed', { status: 401 })

  const url = new URL(req.url)
  const days = parseDays(url.searchParams.get('days'))
  const force = url.searchParams.get('force') === '1'
  const dry = url.searchParams.get('dry') === '1'
  const appUrl = Deno.env.get('APP_URL') ?? 'https://billio-three.vercel.app'
  const from = Deno.env.get('REMINDER_FROM') ?? 'Billio <onboarding@resend.dev>'
  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const [subsR, cardsR, profR, sentR] = await Promise.all([
    db.from('billio_subs').select('*'),
    db.from('billio_cards').select('user_id,id,name'),
    db.from('billio_profile').select('user_id,name,settings'),
    db.from('billio_reminders_sent').select('user_id,sub_id,due,days_before'),
  ])
  const err = subsR.error ?? cardsR.error ?? profR.error ?? sentR.error
  if (err) return Response.json({ error: err.message }, { status: 500 })

  const emails = new Map<string, string>()
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data.users.length) break
    data.users.forEach((u) => u.email && emails.set(u.id, u.email))
    if (data.users.length < 1000) break
  }

  const t = lagosToday()
  const profiles = new Map((profR.data as Profile[]).map((p) => [p.user_id, p]))
  const cards = new Map((cardsR.data as Card[]).map((c) => [c.user_id + ':' + c.id, c.name]))
  const sent = new Set((sentR.data as { user_id: string; sub_id: string; due: string; days_before: number }[]).map((s) => [s.user_id, s.sub_id, s.due, s.days_before].join('|')))

  const byUser = new Map<string, Row[]>()
  for (const s of subsR.data as Sub[]) {
    const due = nextDue(s, t)
    const n = Math.round((due.getTime() - t.getTime()) / DAY)
    if (!days.has(n)) continue
    if (!force && sent.has([s.user_id, s.id, iso(due), n].join('|'))) continue
    const rates = profiles.get(s.user_id)?.settings?.rates ?? { USD: 1500, EUR: 1650, GBP: 1950 }
    const naira = s.cur === 'NGN' ? Number(s.amount) : Number(s.amount) * (rates[s.cur] ?? 1)
    const list = byUser.get(s.user_id) ?? []
    list.push({ sub: s, due, n, card: cards.get(s.user_id + ':' + s.card), naira })
    byUser.set(s.user_id, list)
  }

  const report: { to: string; subject: string; status: string }[] = []
  for (const [uid, rows] of byUser) {
    const to = emails.get(uid)
    if (!to) continue
    const mail = compose(profiles.get(uid)?.name ?? '', rows, appUrl)
    if (dry) { report.push({ to, subject: mail.subject, status: 'dry run' }); continue }
    if (!resendKey) { report.push({ to, subject: mail.subject, status: 'RESEND_API_KEY is not set' }); continue }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
    })
    if (res.ok) {
      await db.from('billio_reminders_sent').upsert(rows.map((r) => ({ user_id: uid, sub_id: r.sub.id, due: iso(r.due), days_before: r.n })))
      report.push({ to, subject: mail.subject, status: 'sent' })
    } else {
      report.push({ to, subject: mail.subject, status: 'failed: ' + (await res.text()).slice(0, 200) })
    }
  }
  return Response.json({ today: iso(t), days: [...days], emails: report })
})
