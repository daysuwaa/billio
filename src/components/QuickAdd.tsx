import { useState, type FormEvent } from 'react'
import { fmtDate, toISO } from '../lib/dates'
import { domainFor } from '../lib/merchants'
import { convert, fmt } from '../lib/money'
import { parseQuick } from '../lib/parse'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'

const EXAMPLES = ['Claude 20 USD monthly', 'Netflix ₦5000 monthly on the 14th', 'Domain $15 yearly 3 Dec']
const CYC: Record<string, string> = { monthly: 'Monthly', yearly: 'Yearly', weekly: 'Weekly' }

export function QuickAdd({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const { cards, saveSub, settings } = useStore()
  const { open, say } = useUI()
  const [v, setV] = useState('')
  const r = v.trim() ? parseQuick(v, cards) : null
  const ok = !!(r && r.name && r.amount && r.amount > 0 && r.cur)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!r || !ok || !r.amount || !r.cur) return
    const domain = domainFor(r.name)
    setV('')
    if (r.date) {
      saveSub({ name: r.name, amount: r.amount, cur: r.cur, cycle: r.cycle, anchor: toISO(r.date), card: r.card?.id ?? '', domain })
      say('Added ' + r.name)
      onDone?.()
    } else {
      open({ type: 'sub', pre: { name: r.name, amount: r.amount, cur: r.cur, cycle: r.cycle, card: r.card?.id ?? '', domain, note: 'Confirm the next charge date, then save.' } })
    }
  }

  return (
    <form className="quick" onSubmit={submit} noValidate>
      <div className="q-row">
        <input type="text" value={v} onChange={(e) => setV(e.target.value)} autoComplete="off" autoFocus={autoFocus} enterKeyHint="done" placeholder="Claude 20 USD monthly" aria-label="Describe a subscription" />
        <button className="btn primary" type="submit" disabled={!ok}>{r?.date || !r ? 'Add' : 'Review'}</button>
      </div>
      {r ? (
        <div className="q-prev" aria-live="polite">
          <span className={'q-chip ' + (r.name ? 'ok' : 'warn')}>{r.name || 'Name?'}</span>
          {r.amount && r.amount > 0 && r.cur ? (
            <span className={'q-chip ' + (r.curGuess ? 'warn' : 'ok')}>
              {fmt(r.amount, r.cur)}{r.cur !== 'NGN' ? ' ≈ ' + fmt(convert(r.amount, r.cur, 'NGN', settings.rates), 'NGN') : ''}{r.curGuess ? ' (guessed)' : ''}
            </span>
          ) : <span className="q-chip warn">Amount?</span>}
          <span className="q-chip ok">{CYC[r.cycle]}</span>
          <span className={'q-chip ' + (r.date ? 'ok' : 'warn')}>{r.date ? fmtDate(r.date) : 'Date not set'}</span>
          <span className="q-chip">{r.card ? r.card.name : 'No card'}</span>
        </div>
      ) : (
        <div className="q-ex">
          {EXAMPLES.map((t) => <button key={t} type="button" onClick={() => setV(t)}>{t}</button>)}
        </div>
      )}
    </form>
  )
}
