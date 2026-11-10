import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mark } from '../components/Mark'
import { APP_NAME } from '../lib/brand'
import { useStore } from '../lib/store'

export function Auth() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const signIn = useStore((s) => s.signIn)
  const up = params.get('mode') !== 'in'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const mail = email.trim().toLowerCase()
    if (up && !name.trim()) return setErr('Tell us what to call you.')
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setErr('Enter a valid email address.')
    if (pw.length < 8) return setErr('Use at least 8 characters for your password.')
    // Placeholder until a backend is connected: the account lives on this device and the password is not stored.
    signIn({ email: mail, name: name.trim() || mail.split('@')[0] })
    nav('/', { replace: true })
  }

  return (
    <div className="page">
      <div className="top-row">
        <span className="logo"><Mark />{APP_NAME}</span>
        <button className="back" type="button" onClick={() => nav('/welcome')}>Back</button>
      </div>
      <aside className="split-art"><h2>Know before your bank does.</h2><p>Every dollar subscription, the naira it costs, and the day it hits your card.</p></aside>
      <div className="boxed">
      <h1>{up ? 'Start with a minute' : 'Welcome back'}</h1>
      <p className="sub">{up ? 'You will add your cards next.' : 'See what is coming up.'}</p>
      <form onSubmit={submit} noValidate>
        {up ? (
          <div className="field">
            <label htmlFor="a-name">Your name</label>
            <input id="a-name" type="text" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="a-mail">Email</label>
          <input id="a-mail" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="a-pw">Password</label>
          <input id="a-pw" type="password" autoComplete={up ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <p className="err" role="alert">{err}</p>
        <button className="btn primary block" type="submit">{up ? 'Create account' : 'Sign in'}</button>
      </form>
      </div>
      <p className="q-hint" style={{ marginTop: 18, textAlign: 'center' }}>
        {up ? 'Already have an account? ' : 'New here? '}
        <button className="link" type="button" onClick={() => { setErr(''); setParams({ mode: up ? 'in' : 'up' }) }}>{up ? 'Sign in' : 'Create account'}</button>
      </p>
      <p className="q-hint" style={{ marginTop: 'auto', paddingTop: 24 }}>We never ask for your card number, PIN or CVV.</p>
    </div>
  )
}
