import { useState } from 'react'
import { fmtDate, toISO } from '../lib/dates'
import { GOOGLE_CLIENT_ID, requestGmailToken, scanGmail, type Found } from '../lib/gmail'
import { fmt } from '../lib/money'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import type { Currency } from '../lib/types'
import { Logo } from './Logo'
import { Sheet } from './Sheet'

type Phase = 'idle' | 'scanning' | 'results' | 'error'

export function GmailSheet() {
  const { subs, cards, saveSub, settings, setSettings } = useStore()
  const { close, say } = useUI()
  const [phase, setPhase] = useState<Phase>('idle')
  const [msg, setMsg] = useState('')
  const [prog, setProg] = useState<[number, number]>([0, 0])
  const [found, setFound] = useState<Found[]>([])
  const [on, setOn] = useState<Record<string, boolean>>({})
  const [amt, setAmt] = useState<Record<string, string>>({})
  const [edit, setEdit] = useState<Record<string, boolean>>({})
  const [curs, setCurs] = useState<Record<string, Currency>>({})

  const start = async () => {
    setMsg('')
    try {
      const token = await requestGmailToken()
      setPhase('scanning')
      const res = await scanGmail(token, subs, settings.ignored ?? [], (d, t) => setProg([d, t]))
      setSettings({ lastScan: new Date().toISOString() })
      setFound(res)
      setOn(Object.fromEntries(res.map((f) => [f.key, true])))
      setPhase('results')
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setMsg(m === 'not-configured' ? '' : m || 'Something went wrong. Try again.')
      setPhase('error')
      if (m === 'not-configured') setMsg('not-configured')
    }
  }

  const chosen = found.filter((f) => on[f.key])
  const editing = (f: Found) => !!f.needsAmount || !!edit[f.key]
  const amountOf = (f: Found) => (editing(f) ? Number(amt[f.key] ?? f.amount) || 0 : f.amount)
  const hide = (f: Found) => {
    setSettings({ ignored: [...(settings.ignored ?? []), f.key] })
    setFound(found.filter((x) => x.key !== f.key))
    say('Hidden. Billio will not suggest it again.')
  }
  const curOf = (f: Found): Currency => (editing(f) ? curs[f.key] ?? f.cur : f.cur)
  const blocked = chosen.some((f) => !(amountOf(f) > 0))
  const add = () => {
    chosen.forEach((f) => {
      const card = cards.find((c) => c.cur === curOf(f)) ?? cards[0]
      saveSub({ name: f.name, amount: amountOf(f), cur: curOf(f), cycle: f.cycle, anchor: toISO(f.next), card: card?.id ?? '', domain: f.domain })
    })
    say(chosen.length === 1 ? 'Added 1 subscription' : 'Added ' + chosen.length + ' subscriptions')
    close()
  }

  return (
    <Sheet label="Find subscriptions in Gmail">
      <h2>Find subscriptions in Gmail</h2>
      {phase === 'idle' || phase === 'error' ? (
        <>
          <p className="q-hint" style={{ margin: '-4px 0 14px' }}>
            Billio looks through your receipts and renewal emails and lists what is still active. Google asks you to approve read-only access, and your password never reaches us. Emails are read on this device, and nothing is uploaded.
          </p>
          <p className="q-hint" style={{ margin: '0 0 14px' }}>
            Google may show a warning that the app is not verified. That is expected while Billio is new. Tap <b>Advanced</b>, then <b>Go to Billio (unsafe)</b>, then Continue.
          </p>
          {phase === 'error' && msg === 'not-configured' ? (
            <p className="err" role="alert">Gmail connection is not switched on for this build yet. Add your Google client ID to the .env file. The steps are in the README.</p>
          ) : phase === 'error' ? <p className="err" role="alert">{msg}</p> : null}
          <div className="stack">
            <button className="btn primary block" type="button" onClick={start} disabled={false}>{GOOGLE_CLIENT_ID || phase === 'idle' ? 'Connect Gmail' : 'Try again'}</button>
            <button className="btn block" type="button" onClick={close}>Not now</button>
          </div>
        </>
      ) : null}
      {phase === 'scanning' ? (
        <p aria-live="polite">Reading emails{prog[1] ? ': ' + prog[0] + ' of ' + prog[1] : '...'}</p>
      ) : null}
      {phase === 'results' ? (
        <>
          {found.length ? (
            <>
              <p className="q-hint" style={{ margin: '-4px 0 14px' }}>Found {found.length} active {found.length === 1 ? 'subscription' : 'subscriptions'}. Untick anything that is wrong. You can fix amounts and dates after adding.</p>
              <div className="tiles">
                {found.map((f) => (
                  <div key={f.key}>
                    <button type="button" className="tile-pick" style={{ width: '100%' }} aria-pressed={!!on[f.key]} onClick={() => setOn({ ...on, [f.key]: !on[f.key] })}>
                      <span className="tick" aria-hidden="true">{on[f.key] ? '\u2713' : ''}</span>
                      <Logo name={f.name} domain={f.domain} />
                      <span style={{ flex: 1, minWidth: 0 }}><b>{f.name}</b><span>{f.needsAmount ? 'The amount is not in the email. Type it below.' : 'Next about ' + fmtDate(f.next) + ', seen ' + f.seen + (f.seen === 1 ? ' time' : ' times')}</span></span>
                      {f.needsAmount ? null : <b>{fmt(f.amount, f.cur)}</b>}
                    </button>
                    {editing(f) && on[f.key] ? (
                      <div className="two" style={{ margin: '8px 0 4px' }}>
                        <input type="number" inputMode="decimal" placeholder="Amount" aria-label={f.name + ' amount'} value={amt[f.key] ?? (f.needsAmount ? '' : String(f.amount))} onChange={(e) => setAmt({ ...amt, [f.key]: e.target.value })} />
                        <select aria-label={f.name + ' currency'} value={curOf(f)} onChange={(e) => setCurs({ ...curs, [f.key]: e.target.value as Currency })}>
                          <option value="NGN">{'\u20A6'} NGN</option><option value="USD">$ USD</option><option value="EUR">{'\u20AC'} EUR</option><option value="GBP">{'\u00A3'} GBP</option>
                        </select>
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 18, margin: '2px 2px 6px' }}>
                      <button className="link" type="button" style={{ color: 'var(--mute)', fontWeight: 400, fontSize: '.85rem' }} onClick={() => hide(f)}>Not a subscription</button>
                      {editing(f) ? null : <button className="link" type="button" style={{ color: 'var(--mute)', fontWeight: 400, fontSize: '.85rem' }} onClick={() => setEdit({ ...edit, [f.key]: true })}>Wrong amount</button>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="stack">
                <button className="btn primary block" type="button" onClick={add} disabled={!chosen.length || blocked}>Add {chosen.length} {chosen.length === 1 ? 'subscription' : 'subscriptions'}</button>
                <button className="btn block" type="button" onClick={close}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p className="q-hint">No new active subscriptions found in the last year. Some services send receipts from addresses Billio does not know yet. You can still add them by typing.</p>
              <div className="stack" style={{ marginTop: 14 }}><button className="btn block" type="button" onClick={close}>Close</button></div>
            </>
          )}
        </>
      ) : null}
    </Sheet>
  )
}
