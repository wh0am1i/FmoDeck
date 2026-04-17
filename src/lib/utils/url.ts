export function normalizeHost(address: string): string {
  if (!address) return ''
  return address
    .trim()
    .replace(/^(https?|wss?):?\/\//, '')
    .replace(/\/+$/, '')
}
