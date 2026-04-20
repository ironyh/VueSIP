export function domainOfRegistered(registered: string | null | undefined): string | null {
  if (!registered) return null
  const m = /^sips?:[^@]+@([^;>]+)/i.exec(registered.trim())
  return m ? m[1].replace(/:\d+$/, '') : null
}

export function resolveDialTarget(
  input: string,
  registered: string | null | undefined,
  fallbackDomain = 'example.com'
): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^sips?:/i.test(trimmed)) return trimmed
  const domain = domainOfRegistered(registered) || fallbackDomain
  return `sip:${trimmed}@${domain}`
}
