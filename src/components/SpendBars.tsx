import { convert } from '../lib/money'
import type { Item } from '../lib/items'
import type { Rates } from '../lib/types'

/** What leaves your cards each day for the next 30 days, in naira. */
export function SpendBars({ items, rates }: { items: Item[]; rates: Rates }) {
  const days = Array.from({ length: 31 }, () => 0)
  items.forEach((x) => { if (x.n >= 0 && x.n <= 30) days[x.n] += convert(x.s.amount, x.s.cur, 'NGN', rates) })
  const max = Math.max(...days, 1)
  return (
    <>
      <div className="bars" role="img" aria-label="Charges over the next 30 days">
        {days.map((v, d) => (
          <i key={d} className={v ? (d <= 2 ? 'hot' : 'on') : ''} style={v ? { height: Math.max(22, (v / max) * 100) + '%' } : undefined} />
        ))}
      </div>
      <div className="axis"><span>Today</span><span>2 weeks</span><span>30 days</span></div>
    </>
  )
}
