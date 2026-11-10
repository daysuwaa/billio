import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, toISO, today } from './dates'
import type { Card, Settings, Sub, User } from './types'

const uid = () => Math.random().toString(36).slice(2, 10)

export const DEFAULT_SETTINGS: Settings = {
  rates: { USD: 1500, EUR: 1650, GBP: 1950 },
  buffer: 5,
  horizon: 7,
  theme: 'system',
}

const EXAMPLES: [string, number, Sub['cur'], Sub['cycle'], number, string][] = [
  ['Claude Pro', 20, 'USD', 'monthly', 2, 'claude.ai'],
  ['iCloud+', 2.99, 'USD', 'monthly', 5, 'icloud.com'],
  ['Netflix', 5000, 'NGN', 'monthly', 9, 'netflix.com'],
  ['Spotify', 4.99, 'USD', 'monthly', 16, 'spotify.com'],
  ['Domain renewal', 15, 'USD', 'yearly', 80, 'namecheap.com'],
]

interface State {
  user: User | null
  onboarded: boolean
  cards: Card[]
  subs: Sub[]
  settings: Settings
  /** Placeholder sign-in that keeps the account on this device until a backend is connected. */
  signIn: (u: User) => void
  signOut: () => void
  /** Clears this device after signing out of an account. */
  reset: () => void
  finishOnboarding: () => void
  saveSub: (s: Omit<Sub, 'id'> & { id?: string }) => void
  deleteSub: (id: string) => void
  saveCard: (c: Omit<Card, 'id'> & { id?: string }) => string
  deleteCard: (id: string) => void
  setSettings: (p: Partial<Settings>) => void
  setRate: (cur: 'USD' | 'EUR' | 'GBP', v: number) => void
  loadExamples: () => void
  deleteAll: () => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      user: null,
      onboarded: false,
      cards: [],
      subs: [],
      settings: DEFAULT_SETTINGS,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
      reset: () => set((st) => ({ user: null, onboarded: false, cards: [], subs: [], settings: { ...DEFAULT_SETTINGS, theme: st.settings.theme } })),
      finishOnboarding: () => set({ onboarded: true }),
      saveSub: (s) =>
        set((st) => {
          const sub: Sub = { ...s, id: s.id ?? uid() }
          return { subs: s.id ? st.subs.map((x) => (x.id === s.id ? sub : x)) : [...st.subs, sub] }
        }),
      deleteSub: (id) => set((st) => ({ subs: st.subs.filter((x) => x.id !== id) })),
      saveCard: (c) => {
        const id = c.id ?? uid()
        set((st) => {
          const card: Card = { ...c, id }
          return { cards: c.id ? st.cards.map((x) => (x.id === c.id ? card : x)) : [...st.cards, card] }
        })
        return id
      },
      deleteCard: (id) =>
        set((st) => ({
          cards: st.cards.filter((x) => x.id !== id),
          subs: st.subs.map((s) => (s.card === id ? { ...s, card: '' } : s)),
        })),
      setSettings: (p) => set((st) => ({ settings: { ...st.settings, ...p } })),
      setRate: (cur, v) => set((st) => ({ settings: { ...st.settings, rates: { ...st.settings.rates, [cur]: v } } })),
      loadExamples: () =>
        set((st) => {
          const cards = [...st.cards]
          const pick = (cur: Sub['cur']) => {
            let c = cards.find((x) => x.cur === cur)
            if (!c) {
              c = { id: uid(), name: cur === 'NGN' ? 'Naira debit card' : 'Virtual USD card', cur, last4: '' }
              cards.push(c)
            }
            return c.id
          }
          const t = today()
          const subs = EXAMPLES.map(([name, amount, cur, cycle, n, domain]): Sub => ({
            id: uid(), name, amount, cur, cycle, anchor: toISO(addDays(t, n)), card: pick(cur), domain,
          }))
          return { cards, subs: [...st.subs, ...subs] }
        }),
      deleteAll: () => set((st) => ({ cards: [], subs: [], settings: { ...DEFAULT_SETTINGS, theme: st.settings.theme }, onboarded: st.onboarded })),
    }),
    { name: 'oju-v1' },
  ),
)
