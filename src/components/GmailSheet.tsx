import { useState } from 'react'
import { fmtDate, toISO } from '../lib/dates'
import { GOOGLE_CLIENT_ID, requestGmailToken, scanGmail, type Found } from '../lib/gmail'
import { fmt } from '../lib/money'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { Logo } from './Logo'
import { Sheet } from './Sheet'

type Phase = 'idle' | 'scanning' | 'results' | 'error'

export function GmailSheet() {
  const { subs, cards, saveSub } = useStore()
  const { close, say } = useUI()
  const [phase, setPhase] = useState<Phase>('idle')
  const [msg, setMsg] = useState('')
  const [prog, setProg] = useState<[number, number]>([0, 0])
  const [found, setFound] = useState<Found[]>([])
  const [on, setOn] = useState<Record<string, boolean>>({})

  const start = async () => {
    setMsg('')
    try {
      const token = await requestGmailToken()
      setPhase('scanning')
      const res = await scanGmail(token, subs, (d, t) => setProg([d, t]))
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
  const add = () => {
    chosen.forEach((f) => {
      const card = cards.find((c) => c.cur === f.cur) ?? cards[0]
      saveSub({ name: f.name, amount: f.amount, cur: f.cur, cycle: f.cycle, anchor: toISO(f.next), card: card?.id ?? '', domain: f.domain })
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
                  <button key={f.key} type="button" className="tile-pick" aria-pressed={!!on[f.key]} onClick={() => setOn({ ...on, [f.key]: !on[f.key] })}>
                    <span className="tick" aria-hidden="true">{on[f.key] ? '✓' : ''}</span>
                    <Logo name={f.name} domain={f.domain} />
                    <span style={{ flex: 1, minWidth: 0 }}><b>{f.name}</b><span>Next about {fmtDate(f.next)}, seen {f.seen} {f.seen === 1 ? 'time' : 'times'}</span></span>
                    <b>{fmt(f.amount, f.cur)}</b>
                  </button>
                ))}
              </div>
              <div className="stack">
                <button className="btn primary block" type="button" onClick={add} disabled={!chosen.length}>Add {chosen.length} {chosen.length === 1 ? 'subscription' : 'subscriptions'}</button>
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
