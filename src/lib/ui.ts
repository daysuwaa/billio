import { create } from 'zustand'
import type { SubPrefill } from './types'

export type SheetState =
  | { type: 'sub'; id?: string; pre?: SubPrefill }
  | { type: 'card'; id?: string }
  | { type: 'check' }
  | { type: 'add' }
  | { type: 'gmail' }
  | null

interface UI {
  sheet: SheetState
  toast: string
  open: (s: NonNullable<SheetState>) => void
  close: () => void
  say: (m: string) => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useUI = create<UI>((set) => ({
  sheet: null,
  toast: '',
  open: (sheet) => set({ sheet }),
  close: () => set({ sheet: null }),
  say: (toast) => {
    set({ toast })
    clearTimeout(timer)
    timer = setTimeout(() => set({ toast: '' }), 2400)
  },
}))
