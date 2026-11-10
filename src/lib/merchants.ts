import type { Cycle } from './types'

export interface Merchant {
  /** Matches text found on a debit alert or receipt. */
  test: RegExp
  name: string
  cycle: Cycle
  note: string
  /** Matches the name of a subscription the user already tracks. */
  subRe: RegExp
  /** Website, used to fetch the icon. */
  domain: string
}

export const MERCHANTS: Merchant[] = [
  { test: /anthropic|claude\.ai|claude ai/i, name: 'Claude', cycle: 'monthly', note: '', subRe: /claude/i, domain: 'claude.ai' },
  { test: /openai|chatgpt/i, name: 'ChatGPT', cycle: 'monthly', note: '', subRe: /chatgpt|openai/i, domain: 'chatgpt.com' },
  {
    test: /apple\.com|itunes|icloud|apple services/i, name: 'Apple', cycle: 'monthly',
    note: 'Apple bills iCloud, App Store apps and Apple Music under one name. Open Settings, tap your name, then Subscriptions to see which one it is.',
    subRe: /icloud|apple|app store|itunes/i, domain: 'apple.com',
  },
  { test: /netflix/i, name: 'Netflix', cycle: 'monthly', note: '', subRe: /netflix/i, domain: 'netflix.com' },
  { test: /spotify/i, name: 'Spotify', cycle: 'monthly', note: '', subRe: /spotify/i, domain: 'spotify.com' },
  {
    test: /youtube|google\s*(?:one|storage|play)|google\s*\*/i, name: 'Google', cycle: 'monthly',
    note: 'Google bills YouTube Premium, Google One and Play apps under one name. Check the payments and subscriptions page of your Google account.',
    subRe: /google|youtube/i, domain: 'google.com',
  },
  { test: /microsoft|msft|office\s*365|xbox/i, name: 'Microsoft', cycle: 'monthly', note: '', subRe: /microsoft|office|xbox/i, domain: 'microsoft.com' },
  { test: /adobe/i, name: 'Adobe', cycle: 'monthly', note: '', subRe: /adobe/i, domain: 'adobe.com' },
  { test: /figma/i, name: 'Figma', cycle: 'monthly', note: '', subRe: /figma/i, domain: 'figma.com' },
  { test: /notion/i, name: 'Notion', cycle: 'monthly', note: '', subRe: /notion/i, domain: 'notion.so' },
  { test: /canva/i, name: 'Canva', cycle: 'monthly', note: '', subRe: /canva/i, domain: 'canva.com' },
  { test: /dropbox/i, name: 'Dropbox', cycle: 'monthly', note: '', subRe: /dropbox/i, domain: 'dropbox.com' },
  { test: /github/i, name: 'GitHub', cycle: 'monthly', note: '', subRe: /github/i, domain: 'github.com' },
  { test: /vercel/i, name: 'Vercel', cycle: 'monthly', note: '', subRe: /vercel/i, domain: 'vercel.com' },
  { test: /namecheap|godaddy|google domains|\bdomain/i, name: 'Domain registrar', cycle: 'yearly', note: '', subRe: /domain|namecheap|godaddy/i, domain: 'namecheap.com' },
  { test: /amazon\s*prime|prime video/i, name: 'Amazon Prime', cycle: 'monthly', note: '', subRe: /prime/i, domain: 'primevideo.com' },
  { test: /disney/i, name: 'Disney+', cycle: 'monthly', note: '', subRe: /disney/i, domain: 'disneyplus.com' },
  { test: /showmax/i, name: 'Showmax', cycle: 'monthly', note: '', subRe: /showmax/i, domain: 'showmax.com' },
  { test: /dstv|gotv|multichoice/i, name: 'DStv / GOtv', cycle: 'monthly', note: '', subRe: /dstv|gotv/i, domain: 'dstv.com' },
  { test: /linkedin/i, name: 'LinkedIn', cycle: 'monthly', note: '', subRe: /linkedin/i, domain: 'linkedin.com' },
  { test: /zoom/i, name: 'Zoom', cycle: 'monthly', note: '', subRe: /zoom/i, domain: 'zoom.us' },
  { test: /midjourney/i, name: 'Midjourney', cycle: 'monthly', note: '', subRe: /midjourney/i, domain: 'midjourney.com' },
]

/** The website for a subscription name we recognise, used to fetch its icon. */
export function domainFor(name: string): string | undefined {
  return MERCHANTS.find((m) => m.subRe.test(name))?.domain
}
