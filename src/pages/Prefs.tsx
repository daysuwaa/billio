import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { cloudOn, signOutAll } from '../lib/sync'
import { useUI } from '../lib/ui'

function NumField({ value, onSave, step }: { value: number; onSave: (n: number) => void; step?: string }) {
  const [t, setT] = useState(String(value))
  return (
    <input
      type="number" inputMode="decimal" step={step ?? 'any'} min="0" value={t}
      onChange={(e) => setT(e.target.value)}
      onBlur={() => {
        const n = parseFloat(t)
        if (isFinite(n) && n > 0) onSave(n)
        else setT(String(value))
      }}
    />
  )
}

export function Prefs() {
  const { settings, cards, subs, user, setSettings, setRate, loadExamples, deleteAll } = useStore()
  const say = useUI((s) => s.say)
  const open = useUI((s) => s.open)
  const nav = useNavigate()
  const [sure, setSure] = useState(false)
  const r = settings.rates

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ cards, subs, settings }, null, 2))
      say('Copied as JSON')
    } catch {
      say('Copy is blocked here')
    }
  }

  return (
    <div className="settings">
      <div className="ph"><h1>Settings</h1><p>Your account, rates and data.</p></div>
      <div className="group">
        <div className="who-am">
          <span className="avatar">{(user?.name ?? '?').charAt(0).toUpperCase()}</span>
          <span><b>{user?.name}</b><span>{user?.email}</span></span>
        </div>
      </div>
      <div className="head2">Import</div>
      <div className="group">
        <div className="line">
          <label>Find subscriptions in Gmail<span className="hint">Reads your receipts on this device</span></label>
          <button className="btn" type="button" onClick={() => open({ type: 'gmail' })}>Connect</button>
        </div>
        {(settings.ignored ?? []).length ? (
          <div className="line">
            <label>Hidden suggestions<span className="hint">{(settings.ignored ?? []).length} marked as not a subscription</span></label>
            <button className="btn" type="button" onClick={() => { setSettings({ ignored: [] }); say('Suggestions reset') }}>Show again</button>
          </div>
        ) : null}
      </div>
      <div className="head2">Exchange rates</div>
      <div className="group">
        <div className="line"><label>1 USD in naira<span className="hint">Use what your card really charges</span></label><NumField value={r.USD} onSave={(n) => { setRate('USD', n); say('Saved') }} /></div>
        <div className="line"><label>1 EUR in naira</label><NumField value={r.EUR} onSave={(n) => { setRate('EUR', n); say('Saved') }} /></div>
        <div className="line"><label>1 GBP in naira</label><NumField value={r.GBP} onSave={(n) => { setRate('GBP', n); say('Saved') }} /></div>
        <div className="line"><label>Buffer %<span className="hint">Covers fees and rate moves</span></label><NumField value={settings.buffer} step="0.5" onSave={(n) => { setSettings({ buffer: n }); say('Saved') }} /></div>
      </div>
      <div className="group">
        <div className="line">
          <span className="lab">Theme</span>
          <div className="seg" role="group" aria-label="Theme">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={settings.theme === t} onClick={() => setSettings({ theme: t })}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="stack">
        <button className="btn block" type="button" onClick={copy}>Copy my data as JSON</button>
        <button className="btn block" type="button" onClick={() => { loadExamples(); say('Examples added') }}>Add example subscriptions</button>
        <button className="btn block" type="button" onClick={async () => { await signOutAll(); nav('/welcome', { replace: true }) }}>Sign out</button>
        <button
          className="btn danger block" type="button"
          onClick={() => {
            if (!sure) {
              setSure(true)
              setTimeout(() => setSure(false), 3000)
              return
            }
            deleteAll(); setSure(false); say('All data deleted')
          }}
        >{sure ? 'Tap again to delete everything' : 'Delete all my data'}</button>
      </div>
      <p style={{ color: 'var(--mute)', fontSize: '.8rem', margin: '20px 2px 0' }}>
        {cloudOn ? 'Your subscriptions are saved to your account, so they follow you to any device. ' : 'Your data stays on this phone for now. '}We never ask for your card number, PIN or CVV. Reminders and receipt-email import are not built yet.
      </p>
    </div>
  )
}
