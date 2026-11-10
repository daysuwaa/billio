import { useState, type FormEvent } from 'react'
import { addDays, isValidISO, nextDue, toISO, today } from '../lib/dates'
import { domainFor } from '../lib/merchants'
import { CURRENCIES } from '../lib/money'
import { useStore } from '../lib/store'
import type { Currency, Cycle, SubPrefill } from '../lib/types'
import { useUI } from '../lib/ui'
import { Sheet } from './Sheet'

export function SubSheet({ id, pre }: { id?: string; pre?: SubPrefill }) {
  const { subs, cards, saveSub, deleteSub } = useStore()
  const { close, say } = useUI()
  const existing = id ? subs.find((s) => s.id === id) : undefined

  const [name, setName] = useState(existing?.name ?? pre?.name ?? '')
  const [amount, setAmount] = useState(String(existing?.amount ?? pre?.amount ?? ''))
  const [cur, setCur] = useState<Currency>(existing?.cur ?? pre?.cur ?? 'USD')
  const [cycle, setCycle] = useState<Cycle>(existing?.cycle ?? pre?.cycle ?? 'monthly')
  const [date, setDate] = useState(existing ? toISO(nextDue(existing)) : (pre?.date ?? toISO(addDays(today(), 30))))
  const [card, setCard] = useState(existing?.card ?? pre?.card ?? cards.find((c) => c.cur === (pre?.cur ?? 'USD'))?.id ?? cards[0]?.id ?? '')
  const [domain, setDomain] = useState(existing?.domain ?? pre?.domain ?? '')
  const [err, setErr] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    const a = parseFloat(amount.replace(/,/g, ''))
    if (!n) return setErr('Give it a name.')
    if (!(a > 0)) return setErr('Enter the amount charged.')
    if (!isValidISO(date)) return setErr('Pick the date of a charge.')
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || domainFor(n) || undefined
    saveSub({ id, name: n, amount: a, cur, cycle, anchor: date, card, domain: d })
    say(existing ? 'Saved' : 'Added ' + n)
    close()
  }

  return (
    <Sheet label={existing ? 'Edit subscription' : 'Add subscription'}>
      <form onSubmit={submit} noValidate>
        <h2>{existing ? 'Edit subscription' : 'Add subscription'}</h2>
        {pre?.note ? <p className="q-hint" style={{ margin: '-8px 0 14px' }}>{pre.note}</p> : null}
        <div className="field">
          <label htmlFor="s-name">Name</label>
          <input id="s-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="Claude Pro" />
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="s-amt">Amount</label>
            <input id="s-amt" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20" />
          </div>
          <div className="field">
            <label htmlFor="s-cur">Currency</label>
            <select id="s-cur" value={cur} onChange={(e) => setCur(e.target.value as Currency)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="two eq">
          <div className="field">
            <label htmlFor="s-cyc">Repeats</label>
            <select id="s-cyc" value={cycle} onChange={(e) => setCycle(e.target.value as Cycle)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-date">A charge date</label>
            <input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="s-card">Card</label>
          <select id="s-card" value={card} onChange={(e) => setCard(e.target.value)}>
            <option value="">No card</option>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.name}{c.last4 ? ' ••' + c.last4 : ''}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="s-dom">Website (for the app icon)</label>
          <input id="s-dom" type="text" value={domain} onChange={(e) => setDomain(e.target.value)} autoCapitalize="none" autoCorrect="off" placeholder="claude.ai" />
        </div>
        <p className="err" role="alert">{err}</p>
        <div className="stack">
          <button className="btn primary block" type="submit">Save</button>
          {existing ? (
            <button className="btn danger block" type="button" onClick={() => { deleteSub(existing.id); say('Deleted'); close() }}>Delete</button>
          ) : null}
          <button className="btn block" type="button" onClick={close}>Cancel</button>
        </div>
      </form>
    </Sheet>
  )
}
