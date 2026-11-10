import { addDays, fmtDate, today } from '../lib/dates'
import { itemsOf } from '../lib/items'
import { convert, fmt } from '../lib/money'
import { useStore } from '../lib/store'
import type { Card } from '../lib/types'
import { useUI } from '../lib/ui'

export function Cards() {
  const { cards, subs, settings, setSettings } = useStore()
  const open = useUI((s) => s.open)
  const { horizon: hz, buffer, rates } = settings
  const it = itemsOf(subs)
  const all: (Card & { none?: boolean })[] = [...cards, { id: '', name: 'No card set', cur: 'NGN', last4: '', none: true }]

  return (
    <>
      <div className="ph"><h1>Cards</h1><p>How much to put on each card, and by when.</p></div>
      <div className="bar-row">
        <div className="seg" role="group" aria-label="Look ahead">
          {([7, 14, 30] as const).map((d) => (
            <button key={d} type="button" aria-pressed={hz === d} onClick={() => setSettings({ horizon: d })}>{d} days</button>
          ))}
        </div>
        <span>Includes a {buffer}% buffer</span>
      </div>
      <div className="tiles-grid">
      {all.map((c) => {
        const mine = it.filter((x) => (x.s.card || '') === c.id && x.n <= hz)
        if (c.none && !mine.length) return null
        const total = mine.reduce((a, x) => a + convert(x.s.amount, x.s.cur, c.cur, rates), 0) * (1 + buffer / 100)
        let fundBy = mine.length ? addDays(mine[0].d, -1) : null
        if (fundBy && fundBy < today()) fundBy = today()
        return (
          <article className={'tile ' + (c.none ? 'none' : 'cur-' + c.cur)} key={c.id || 'none'}>
            <header>
              <div><h3>{c.name}</h3><span className="tag">{c.cur}{c.last4 ? ' ••' + c.last4 : ''}</span></div>
              {c.none ? null : <button className="edit" type="button" onClick={() => open({ type: 'card', id: c.id })}>Edit</button>}
            </header>
            {mine.length && fundBy ? (
              <div className="fundby">
                <small>Fund by {fmtDate(fundBy)}</small>
                <span className="num">{fmt(total, c.cur)}</span>
                {c.cur !== 'NGN' ? <span>{'≈ ' + fmt(convert(total, c.cur, 'NGN', rates), 'NGN')} at your rate</span> : null}
              </div>
            ) : (
              <p className="quiet">Nothing due in the next {hz} days.</p>
            )}
            {mine.length ? (
              <ul>
                {mine.map((x) => (
                  <li key={x.s.id}><span>{x.s.name}, {fmtDate(x.d)}</span><span>{fmt(convert(x.s.amount, x.s.cur, c.cur, rates), c.cur)}</span></li>
                ))}
              </ul>
            ) : null}
          </article>
        )
      })}
      </div>
      {!cards.length ? <div className="empty"><b>No cards yet</b>Add the cards you pay subscriptions with.</div> : null}
      <button className="btn block" type="button" style={{ marginTop: 6 }} onClick={() => open({ type: 'card' })}>Add a card</button>
    </>
  )
}
