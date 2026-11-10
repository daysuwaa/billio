import { Logo } from '../components/Logo'
import { SpendBars } from '../components/SpendBars'
import { fmtDate, rel, today } from '../lib/dates'
import { itemsOf } from '../lib/items'
import { convert, fmt } from '../lib/money'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'

const Question = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></svg>
)

const Mail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
)

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function Upcoming() {
  const { subs, settings, user } = useStore()
  const open = useUI((s) => s.open)
  const rates = settings.rates
  const it = itemsOf(subs)
  const first = it[0]
  const week = it.filter((x) => x.n <= 7)
  const weekTotal = week.reduce((a, x) => a + convert(x.s.amount, x.s.cur, 'NGN', rates), 0)
  const dateStr = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(today())

  const hero = first ? (
    <section className="hero" aria-label="Next debit">
      <div className="lbl">Next debit in</div>
      <div className="big">
        {first.n === 0 ? <span className="num word">Today</span> : <><span className="num">{first.n}</span><span>{first.n === 1 ? 'day' : 'days'}</span></>}
      </div>
      <p className="sum">{week.length ? <><b>{fmt(weekTotal, 'NGN')}</b> leaves your cards in the next 7 days.</> : 'Nothing else leaves your cards this week.'}</p>
      <SpendBars items={it} rates={rates} />
      <button className="who" type="button" onClick={() => open({ type: 'sub', id: first.s.id })}>
        <Logo name={first.s.name} domain={first.s.domain} />
        <span><b>{first.s.name}</b><small>{fmtDate(first.d)}</small></span>
        <span className="amt">
          {fmt(first.s.amount, first.s.cur)}
          {first.s.cur !== 'NGN' ? <small>{'\u2248 ' + fmt(convert(first.s.amount, first.s.cur, 'NGN', rates), 'NGN')}</small> : null}
        </span>
      </button>
    </section>
  ) : (
    <section className="hero empty">
      <h2>Nothing tracked yet</h2>
      <p>Add a subscription and you will see how many days until it is charged.</p>
      <button className="btn leaf" type="button" onClick={() => open({ type: 'add' })}>Add a subscription</button>
    </section>
  )

  return (
    <div className="home">
      <div>
        <div className="hi">{greeting()}, {user?.name}</div>
        <div className="date">{dateStr}</div>
        {hero}
        <div className="shortcuts">
          <button className="unknown" type="button" onClick={() => open({ type: 'check' })}>
            <Question />
            <span><b>Don&rsquo;t recognise a debit?</b><span>Paste the alert and find out who it is.</span></span>
          </button>
          <button className="unknown find" type="button" onClick={() => open({ type: 'gmail' })}>
            <Mail />
            <span><b>Find subscriptions in Gmail</b><span>Billio reads your receipts and lists what is active.</span></span>
          </button>
        </div>
      </div>
      <div>
        {it.length > 1 ? (
          <>
            <h2 className="sect">Coming up</h2>
            <ol className="rail">
              {it.slice(1).map((x) => (
                <li key={x.s.id} className={'stop' + (x.n <= 2 ? ' soon' : '')}>
                  <div className="when">
                    <span className="num">{x.n === 0 ? 'Now' : x.n}</span>
                    <small>{x.n === 0 ? 'today' : x.n === 1 ? 'day' : 'days'}</small>
                  </div>
                  <button className="deal" type="button" onClick={() => open({ type: 'sub', id: x.s.id })} aria-label={x.s.name + ', ' + rel(x.n).toLowerCase()}>
                    <Logo name={x.s.name} domain={x.s.domain} />
                    <span style={{ minWidth: 0 }}>
                      <div className="nm">{x.s.name}</div>
                      <div className="dt">{fmtDate(x.d)}</div>
                    </span>
                    <span className="amt">
                      {fmt(x.s.amount, x.s.cur)}
                      <small>{x.s.cur !== 'NGN' ? '\u2248 ' + fmt(convert(x.s.amount, x.s.cur, 'NGN', rates), 'NGN') : x.s.cycle}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </div>
    </div>
  )
}
