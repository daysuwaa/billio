import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QuickAdd } from '../components/QuickAdd'
import { fmt } from '../lib/money'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import type { Currency } from '../lib/types'

const PRESETS: { name: string; cur: Currency; hint: string }[] = [
  { name: 'Virtual USD card', cur: 'USD', hint: 'Dollar card for Claude, Netflix, Apple and so on' },
  { name: 'Naira debit card', cur: 'NGN', hint: 'Your bank card, charged in naira' },
]

export function Setup() {
  const { cards, subs, saveCard, finishOnboarding, loadExamples, settings } = useStore()
  const nav = useNavigate()
  const open = useUI((s) => s.open)
  const [step, setStep] = useState(cards.length ? 2 : 1)
  const [picked, setPicked] = useState<Record<string, boolean>>({ 'Virtual USD card': true, 'Naira debit card': false })
  const [custom, setCustom] = useState('')
  const [err, setErr] = useState('')

  const next = () => {
    const chosen = PRESETS.filter((p) => picked[p.name])
    if (custom.trim()) chosen.push({ name: custom.trim(), cur: 'USD', hint: '' })
    if (!chosen.length) return setErr('Pick at least one card. You can change this later.')
    chosen.forEach((c) => saveCard({ name: c.name, cur: c.cur, last4: '' }))
    setErr('')
    setStep(2)
  }
  const done = () => { finishOnboarding(); nav('/', { replace: true }) }

  return (
    <div className="page">
      <div className="dots" aria-label={'Step ' + step + ' of 2'}><i className="on" /><i className={step === 2 ? 'on' : ''} /></div>
      {step === 1 ? (
        <>
          <span className="step">Step 1 of 2</span>
          <h1>Which cards pay for your subscriptions?</h1>
          <p className="sub">A nickname is enough. We never need the number.</p>
          <div className="tiles">
            {PRESETS.map((p) => (
              <button key={p.name} type="button" className="tile-pick" aria-pressed={!!picked[p.name]} onClick={() => setPicked({ ...picked, [p.name]: !picked[p.name] })}>
                <span className="tick" aria-hidden="true">{picked[p.name] ? '✓' : ''}</span>
                <span><b>{p.name}</b><span>{p.hint}</span></span>
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="sc">Another card (optional)</label>
            <input id="sc" type="text" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Grey, Chipper, Payday card" />
          </div>
          <p className="err" role="alert">{err}</p>
          <div className="foot"><button className="btn primary block" type="button" onClick={next}>Continue</button></div>
        </>
      ) : (
        <>
          <span className="step">Step 2 of 2</span>
          <h1>What are you paying for?</h1>
          <p className="sub">Add the ones you know. It will keep count of the rest.</p>
          <QuickAdd />
          {subs.length ? (
            <ul className="added">
              {subs.map((s) => <li key={s.id}>{s.name}<span>{fmt(s.amount, s.cur)}</span></li>)}
            </ul>
          ) : (
            <p className="q-hint" style={{ marginTop: 16 }}>
              Rates default to {'₦'}{settings.rates.USD.toLocaleString('en-US')} per dollar. Change that in Settings.
            </p>
          )}
          <div className="foot stack">
            <button className="btn block" type="button" onClick={() => open({ type: 'gmail' })}>Find them in Gmail</button>
            {!subs.length ? <button className="btn block" type="button" onClick={loadExamples}>Start with examples</button> : null}
            <button className="btn primary block" type="button" onClick={done}>{subs.length ? 'Done' : 'Skip for now'}</button>
          </div>
        </>
      )}
    </div>
  )
}
