import { useNavigate } from 'react-router-dom'
import { Mark } from '../components/Mark'
import { APP_NAME } from '../lib/brand'

export function Welcome() {
  const nav = useNavigate()
  return (
    <div className="welcome">
      <div className="welcome-in">
        <div className="bar"><Mark />{APP_NAME}</div>
        <h1>Know before your bank does.</h1>
        <p className="lead">Every dollar subscription, the naira it costs, and the day it hits your card.</p>
        <div className="slip" aria-hidden="true">
          <small>Debit alert, 02:14</small>
          <span className="amt">{'\u2212\u2009\u20A6'}30,000.00</span>
          <small>CLAUDE.AI SUBSCRIPTION, SAN FRANCISCO</small>
          <div className="ok"><i />Billio had this down for Nov 12. You expected it.</div>
        </div>
        <div className="stack">
          <button className="btn leaf block" type="button" onClick={() => nav('/auth?mode=up')}>Create account</button>
          <button className="btn ghost block" type="button" onClick={() => nav('/auth?mode=in')}>I have an account</button>
        </div>
        <p className="fine">We never ask for your card number, PIN or CVV.</p>
      </div>
    </div>
  )
}
