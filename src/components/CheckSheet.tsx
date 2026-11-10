import { useState } from 'react'
import { analyzeCharge } from '../lib/analyze'
import { advance, fmtDate, toISO } from '../lib/dates'
import { convert, fmt } from '../lib/money'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { Sheet } from './Sheet'

const SAMPLES = [
  'Debit Alert: NGN 30,000.00 Desc: CLAUDE.AI SUBSCRIPTION ANTHROPIC SAN FRANCISCO Date: 09-NOV-2026',
  'Purchase of $2.99 at APPLE.COM/BILL on 08/11/2026',
  'Your receipt from Netflix. Total ₦5,000. Paid 5 Nov 2026',
]

export function CheckSheet() {
  const { subs, cards, settings } = useStore()
  const { close, open } = useUI()
  const [text, setText] = useState('')
  const v = text.trim()
  const r = v ? analyzeCharge(v, subs) : null

  const add = () => {
    if (!r || !r.amount || !r.cur) return
    const cur = r.cur
    const card = cards.find((c) => c.cur === cur) ?? cards[0]
    open({
      type: 'sub',
      pre: {
        name: r.name, amount: r.amount, cur, cycle: r.cycle,
        date: toISO(advance(r.date, r.cycle)), card: card?.id ?? '', domain: r.domain,
        note: 'The next charge is guessed from the debit date. Check it, then save.',
      },
    })
  }

  const msg = !r ? '' : r.tracked
    ? (r.known?.note || 'This matches a subscription you already track, so it is expected.')
    : r.known
      ? (r.known.note || `${r.known.name} charges are normally a ${r.known.cycle} subscription. If you do not remember signing up, check the account you may have used.`)
      : 'If this charge shows up again next month, it is probably a subscription. Track it so the next one is no surprise.'

  return (
    <Sheet label="What's this charge?">
      <h2>What&rsquo;s this charge?</h2>
      <p className="q-hint" style={{ margin: '-8px 0 12px' }}>Paste a debit alert or receipt and I will tell you who it is.</p>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the debit alert, SMS or receipt text here" autoFocus />
      {!v ? (
        <>
          <div className="q-ex">
            {SAMPLES.map((t, i) => <button key={i} type="button" onClick={() => setText(t)}>Try example {i + 1}</button>)}
          </div>
          <p className="q-hint" style={{ margin: '12px 0 0' }}>Everything is read on your phone. Nothing is sent anywhere.</p>
        </>
      ) : null}
      {r ? (
        <div aria-live="polite">
          <div className="chk-card">
            <h3>{r.name || 'Unknown merchant'}</h3>
            <div className="chk-row">{r.known ? 'Recognised service' : 'Not a service I recognise'}</div>
            {r.amount && r.cur ? (
              <>
                <p className="chk-big">
                  {fmt(r.amount, r.cur)}
                  {r.cur !== 'NGN' ? '  ≈ ' + fmt(convert(r.amount, r.cur, 'NGN', settings.rates), 'NGN') : ''}
                </p>
                <div className="chk-row">
                  {r.curAssumed ? 'No currency found, assumed naira. ' : ''}Charged {fmtDate(r.date)}
                  {r.dateAssumed ? ' (no date found, assumed today)' : ''}
                </div>
              </>
            ) : (
              <p className="chk-msg q-hint">I could not find an amount in that text.</p>
            )}
            <p className="chk-msg">{msg}</p>
            {r.tracked ? <span className="q-chip ok chk-tag">Already tracked: {r.tracked.sub.name}, next {fmtDate(r.tracked.due)}</span> : null}
          </div>
          <div className="stack">
            {r.amount && !r.tracked && r.name ? <button className="btn primary block" type="button" onClick={add}>Add as subscription</button> : null}
            <button className="btn block" type="button" onClick={close}>{r.amount && !r.tracked ? 'Not a subscription' : 'Close'}</button>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 12 }}>
          <button className="btn block" type="button" onClick={close}>Close</button>
        </div>
      )}
    </Sheet>
  )
}
