import { useEffect, type ReactNode } from 'react'
import { HashRouter, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AddSheet } from './components/AddSheet'
import { CardSheet } from './components/CardSheet'
import { CheckSheet } from './components/CheckSheet'
import { GmailSheet } from './components/GmailSheet'
import { Mark } from './components/Mark'
import { SubSheet } from './components/SubSheet'
import { APP_NAME } from './lib/brand'
import { useStore } from './lib/store'
import { useUI } from './lib/ui'
import { Auth } from './pages/Auth'
import { Cards } from './pages/Cards'
import { Prefs } from './pages/Prefs'
import { Setup } from './pages/Setup'
import { Upcoming } from './pages/Upcoming'
import { Welcome } from './pages/Welcome'

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

function Overlays() {
  const sheet = useUI((s) => s.sheet)
  const toast = useUI((s) => s.toast)
  return (
    <>
      {sheet?.type === 'add' ? <AddSheet /> : null}
      {sheet?.type === 'sub' ? <SubSheet key={(sheet.id ?? 'new') + JSON.stringify(sheet.pre ?? {})} id={sheet.id} pre={sheet.pre} /> : null}
      {sheet?.type === 'card' ? <CardSheet key={sheet.id ?? 'new'} id={sheet.id} /> : null}
      {sheet?.type === 'check' ? <CheckSheet /> : null}
      {sheet?.type === 'gmail' ? <GmailSheet /> : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </>
  )
}

function Guest({ children }: { children: ReactNode }) {
  const { user, onboarded } = useStore()
  if (user) return <Navigate to={onboarded ? '/' : '/setup'} replace />
  return <>{children}</>
}

function Member({ children, setup }: { children: ReactNode; setup?: boolean }) {
  const { user, onboarded } = useStore()
  if (!user) return <Navigate to="/welcome" replace />
  if (setup && onboarded) return <Navigate to="/" replace />
  if (!setup && !onboarded) return <Navigate to="/setup" replace />
  return <>{children}</>
}

const NAV = [
  { to: '/', label: 'Home', d: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', end: true },
  { to: '/cards', label: 'Cards', d: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M7 15h3' },
  { to: '/prefs', label: 'Settings', d: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6' },
]

function AppLayout() {
  const open = useUI((s) => s.open)
  const user = useStore((s) => s.user)
  return (
    <>
      <aside className="side">
        <NavLink to="/" end className="logo"><Mark />{APP_NAME}</NavLink>
        <nav aria-label="Main">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}><Icon d={n.d} />{n.label}</NavLink>)}
        </nav>
        <button className="btn leaf add" type="button" onClick={() => open({ type: 'add' })}>Add subscription</button>
        <div className="me">
          <span className="avatar">{(user?.name ?? '?').charAt(0).toUpperCase()}</span>
          <span><b>{user?.name}</b><span>{user?.email}</span></span>
        </div>
      </aside>
      <header className="mbar">
        <NavLink to="/" end className="logo"><Mark />{APP_NAME}</NavLink>
        <NavLink to="/prefs" className="avatar" aria-label="Settings">{(user?.name ?? '?').charAt(0).toUpperCase()}</NavLink>
      </header>
      <main className="app"><Outlet /></main>
      <nav className="dock" aria-label="Main">
        <NavLink to="/" end><Icon d={NAV[0].d} />Home</NavLink>
        <NavLink to="/cards"><Icon d={NAV[1].d} />Cards</NavLink>
        <button className="plus" type="button" aria-label="Add a subscription" onClick={() => { navigator.vibrate?.(8); open({ type: 'add' }) }}><Icon d="M12 5v14M5 12h14" /></button>
        <NavLink to="/prefs"><Icon d={NAV[2].d} />Settings</NavLink>
      </nav>
    </>
  )
}

export default function App() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <HashRouter>
      <Routes>
        <Route path="/welcome" element={<Guest><Welcome /></Guest>} />
        <Route path="/auth" element={<Guest><Auth /></Guest>} />
        <Route path="/setup" element={<Member setup><Setup /></Member>} />
        <Route element={<Member><AppLayout /></Member>}>
          <Route path="/" element={<Upcoming />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/prefs" element={<Prefs />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Overlays />
    </HashRouter>
  )
}
