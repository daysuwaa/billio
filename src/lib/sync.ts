import { supabase } from './supabase'
import { DEFAULT_SETTINGS, useStore } from './store'
import type { Card, Settings, Sub } from './types'

let applying = false
let uid: string | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let started = false

type SubRow = Omit<Sub, 'amount' | 'domain'> & { amount: number | string; domain: string | null }

/** Replaces what is on this device with what is saved in the account. First sign-in uploads the device's data instead. */
async function pull(userId: string): Promise<void> {
  if (!supabase) return
  const [c, s, p] = await Promise.all([
    supabase.from('billio_cards').select('id,name,cur,last4'),
    supabase.from('billio_subs').select('id,name,amount,cur,cycle,anchor,card,domain'),
    supabase.from('billio_profile').select('onboarded,settings').maybeSingle(),
  ])
  const err = c.error ?? s.error ?? p.error
  if (err) throw new Error(err.message)
  if (!p.data) return push(userId)
  applying = true
  try {
    useStore.setState({
      cards: (c.data ?? []) as Card[],
      subs: ((s.data ?? []) as SubRow[]).map((r) => ({ ...r, amount: Number(r.amount), domain: r.domain ?? undefined })),
      onboarded: !!p.data.onboarded,
      settings: { ...DEFAULT_SETTINGS, ...((p.data.settings ?? {}) as Partial<Settings>) },
    })
  } finally {
    applying = false
  }
}

async function prune(table: 'billio_cards' | 'billio_subs', userId: string, ids: string[]) {
  if (!supabase) return
  let q = supabase.from(table).delete().eq('user_id', userId)
  if (ids.length) q = q.not('id', 'in', '(' + ids.map((i) => '"' + i + '"').join(',') + ')')
  const { error } = await q
  if (error) throw new Error(error.message)
}

async function push(userId: string): Promise<void> {
  if (!supabase) return
  const { cards, subs, settings, onboarded, user } = useStore.getState()
  const done = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message) }
  done(await supabase.from('billio_profile').upsert({ user_id: userId, name: user?.name ?? '', onboarded, settings, updated_at: new Date().toISOString() }))
  if (cards.length) done(await supabase.from('billio_cards').upsert(cards.map((c) => ({ ...c, user_id: userId }))))
  if (subs.length) done(await supabase.from('billio_subs').upsert(subs.map((s) => ({ ...s, domain: s.domain ?? null, user_id: userId }))))
  await prune('billio_cards', userId, cards.map((c) => c.id))
  await prune('billio_subs', userId, subs.map((s) => s.id))
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (uid) push(uid).catch((e) => console.warn('Billio sync failed:', e))
  }, 700)
}

/** Starts the session watcher once. Does nothing when Supabase is not configured. */
export function initSync(): void {
  if (!supabase || started) return
  started = true
  supabase.auth.onAuthStateChange((event, session) => {
    // Supabase advises not to await inside this callback.
    setTimeout(async () => {
      const st = useStore.getState()
      if (!session) {
        uid = null
        if (event === 'SIGNED_OUT') st.reset()
        else if (st.user) useStore.setState({ user: null })
        return
      }
      uid = session.user.id
      const name = (session.user.user_metadata?.name as string | undefined) || (session.user.email ?? '').split('@')[0]
      if (!st.user) st.signIn({ email: session.user.email ?? '', name })
      try { await pull(uid) } catch (e) { console.warn('Billio could not load your data:', e) }
    }, 0)
  })
  useStore.subscribe((s, prev) => {
    if (applying || !uid) return
    if (s.subs !== prev.subs || s.cards !== prev.cards || s.settings !== prev.settings || s.onboarded !== prev.onboarded) schedule()
  })
}

export const cloudOn = Boolean(supabase)

export async function signUpEmail(email: string, password: string, name: string): Promise<{ error?: string; confirm?: boolean }> {
  if (!supabase) return {}
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
  if (error) return { error: friendly(error.message) }
  return { confirm: !data.session }
}

export async function signInEmail(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return {}
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { error: friendly(error.message) } : {}
}

export async function signOutAll(): Promise<void> {
  clearTimeout(timer)
  if (supabase) await supabase.auth.signOut()
  else useStore.getState().signOut()
}

function friendly(m: string): string {
  if (/invalid login/i.test(m)) return 'Email or password is wrong.'
  if (/already registered|already been registered/i.test(m)) return 'That email already has an account. Sign in instead.'
  if (/not confirmed/i.test(m)) return 'Confirm your email first. Check your inbox for the link.'
  if (/rate limit/i.test(m)) return 'Too many tries. Wait a minute and try again.'
  if (/password/i.test(m)) return 'Use a stronger password, at least 8 characters.'
  return m
}
