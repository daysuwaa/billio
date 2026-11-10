/**
 * Where app icons come from. Swap this one function to change the source
 * (for example to your own icon service or a bundled icon pack).
 */
export function logoUrl(domain: string): string {
  return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=128'
}
