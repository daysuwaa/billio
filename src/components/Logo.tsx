import { useState } from 'react'
import { logoUrl } from '../lib/logo'

/** App icon fetched from the website; falls back to a coloured letter. */
export function Logo({ name, domain, index = 0 }: { name: string; domain?: string; index?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="mono" aria-hidden="true" data-i={index % 5}>
      {name.trim().charAt(0).toUpperCase() || '?'}
      {domain && !failed ? <img src={logoUrl(domain)} alt="" loading="lazy" onError={() => setFailed(true)} /> : null}
    </span>
  )
}
