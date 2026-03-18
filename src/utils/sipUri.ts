/**
 * Extended SIP URI parsing and building utilities
 * Complements the basic SipUri helpers in formatters.ts with full support for
 * display names, parameters, and headers per RFC 3261.
 * @packageDocumentation
 */

import type { SipUri } from '../types/sip.types'

/**
 * Regular expression for parsing SIP URIs
 * Handles: sip:user@host:port;params?headers
 * Also handles: sips:// scheme
 */
const SIP_URI_REGEX =
  /^(sips?):\/?\/?(?:([^:@]+):?([^@]*)?@)?([a-zA-Z0-9.-]+)(?::(\d+))?(?:;(.*))?(?:\?(.*))?$/i

/**
 * Regular expression for display name extraction
 * Handles: "Display Name" <sip:user@host> or <sip:user@host>
 */
const DISPLAY_NAME_REGEX = /^(?:"([^"]+)"|([^"<>\s]+))\s*<[^>]+>$/

/**
 * Default port for SIP/SIPS
 */
const DEFAULT_SIP_PORT = 5060
const DEFAULT_SIPS_PORT = 5061

/**
 * Parse a SIP URI string into a full structured SipUri object.
 * Unlike the basic parseSipUri in formatters.ts, this also extracts
 * display names, URI parameters, and headers.
 *
 * @example
 * const uri = parseDetailedSipUri('sip:alice@example.com;transport=tls')
 * // { scheme: 'sip', user: 'alice', host: 'example.com', uri: 'sip:alice@example.com', parameters: { transport: 'tls' } }
 *
 * @example
 * const uri = parseDetailedSipUri('"Alice Bob" <sip:alice@example.com:5060>')
 * // { scheme: 'sip', user: 'alice', host: 'example.com', port: 5060, displayName: 'Alice Bob', uri: 'sip:alice@example.com:5060' }
 */
export function parseDetailedSipUri(uriString: string): SipUri | null {
  if (!uriString || typeof uriString !== 'string') {
    return null
  }

  const trimmed = uriString.trim()
  if (!trimmed) {
    return null
  }

  // First, extract display name if present
  let displayName: string | undefined
  let uriToParse = trimmed

  const displayMatch = trimmed.match(DISPLAY_NAME_REGEX)
  if (displayMatch) {
    displayName = displayMatch[1] || displayMatch[2]
    // Extract just the SIP URI part
    const bracketMatch = trimmed.match(/<([^>]+)>/)
    if (bracketMatch && bracketMatch[1] !== undefined) {
      uriToParse = bracketMatch[1]
    } else {
      // Display name without brackets - try to find URI after
      const uriStart = trimmed.search(/sip[s]?:/i)
      if (uriStart > 0) {
        uriToParse = trimmed.slice(uriStart)
      }
    }
  }

  // Parse the SIP URI core
  const match = uriToParse.match(SIP_URI_REGEX)
  if (!match) {
    return null
  }

  const [, scheme, user, , host, port] = match
  const lowerScheme = (scheme || 'sip').toLowerCase() as 'sip' | 'sips'

  if (lowerScheme !== 'sip' && lowerScheme !== 'sips') {
    return null
  }

  if (!user || !host) {
    return null
  }

  // Parse parameters (separated by ;) and headers (after ?)
  // match[6] captures after ;, match[7] captures after ?
  // If there's no ; then ? data is in match[7]; if there is ; then ? data is also in match[6]
  const paramsStr = match[6] || ''
  const headersStr = match[7] || ''
  const parameters: Record<string, string> = {}
  const headers: Record<string, string> = {}

  // Parse params from match[6] (after ;)
  if (paramsStr) {
    const questionPos = paramsStr.indexOf('?')
    const paramPart = questionPos >= 0 ? paramsStr.slice(0, questionPos) : paramsStr
    const headerPartFromParams = questionPos >= 0 ? paramsStr.slice(questionPos + 1) : ''

    // Parse params (separated by ;)
    for (const seg of paramPart.split(';')) {
      if (!seg) continue
      const eqPos = seg.indexOf('=')
      const key = eqPos >= 0 ? seg.slice(0, eqPos) : seg
      const value = eqPos >= 0 ? seg.slice(eqPos + 1) : ''
      if (key) {
        parameters[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
      }
    }

    // Headers from within the params string (after ?)
    if (headerPartFromParams) {
      for (const part of headerPartFromParams.split('&')) {
        if (!part) continue
        const eqPos = part.indexOf('=')
        const key = eqPos >= 0 ? part.slice(0, eqPos) : part
        const value = eqPos >= 0 ? part.slice(eqPos + 1) : ''
        if (key) {
          headers[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
        }
      }
    }
  }

  // Parse headers from match[7] (directly after ? when no ; before ?)
  if (headersStr) {
    for (const part of headersStr.split('&')) {
      if (!part) continue
      const eqPos = part.indexOf('=')
      const key = eqPos >= 0 ? part.slice(0, eqPos) : part
      const value = eqPos >= 0 ? part.slice(eqPos + 1) : ''
      if (key) {
        headers[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
      }
    }
  }

  const portNum = port ? parseInt(port, 10) : undefined

  // Build the canonical URI
  const portPart = portNum ? `:${portNum}` : ''
  const canonicalUri = `${lowerScheme}:${user}@${host}${portPart}`

  return {
    scheme: lowerScheme,
    user: decodeURIComponent(user),
    host: host.toLowerCase(),
    port: portNum,
    displayName,
    uri: canonicalUri,
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    toString(): string {
      if (this.displayName) {
        return `"${this.displayName}" <${canonicalUri}>`
      }
      return canonicalUri
    },
    clone(): SipUri {
      return {
        ...this,
        parameters: this.parameters ? { ...this.parameters } : undefined,
        headers: this.headers ? { ...this.headers } : undefined,
        toString: this.toString,
        clone: this.clone,
      }
    },
  }
}

/**
 * Build a SIP URI string from a SipUri object or partial components.
 * Unlike the basic buildSipUri in formatters.ts, this supports
 * display names, parameters, and headers.
 *
 * @example
 * const uri = buildDetailedSipUri({ user: 'alice', host: 'example.com' })
 * // 'sip:alice@example.com'
 *
 * @example
 * const uri = buildDetailedSipUri({ scheme: 'sips', user: 'bob', host: 'secure.com', port: 5061, parameters: { transport: 'tls' } })
 * // 'sips:bob@secure.com:5061;transport=tls'
 */
export function buildDetailedSipUri(parts: Partial<SipUri>): string {
  const scheme = parts.scheme || 'sip'
  const user = parts.user
  const host = parts.host

  if (!user || !host) {
    throw new Error('SIP URI requires at least user and host')
  }

  // For user part: encode special chars but keep + (common in E.164 SIP usernames)
  const encodedUser = user.replace(/[%@:;\/?#\s]/g, (c) => encodeURIComponent(c))
  const portPart = parts.port ? `:${parts.port}` : ''
  const base = `${scheme}:${encodedUser}@${host}${portPart}`

  const paramParts: string[] = []
  if (parts.parameters) {
    for (const [key, value] of Object.entries(parts.parameters)) {
      if (value !== undefined && value !== '') {
        paramParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      } else {
        paramParts.push(encodeURIComponent(key))
      }
    }
  }

  const headerParts: string[] = []
  if (parts.headers) {
    for (const [key, value] of Object.entries(parts.headers)) {
      if (value !== undefined && value !== '') {
        headerParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      } else {
        headerParts.push(encodeURIComponent(key))
      }
    }
  }

  let result = base
  if (paramParts.length > 0) {
    result += ';' + paramParts.join(';')
  }
  if (headerParts.length > 0) {
    result += '?' + headerParts.join('&')
  }

  if (parts.displayName) {
    return `"${parts.displayName}" <${result}>`
  }

  return result
}

/**
 * Parse SIP URI parameters and headers into a key-value record.
 *
 * @example
 * parseSipUriParams('sip:alice@example.com;transport=tls;user=phone')
 * // { transport: 'tls', user: 'phone' }
 */
export function parseSipUriParams(uriString: string): Record<string, string> {
  if (!uriString || typeof uriString !== 'string') {
    return {}
  }

  // Extract the raw URI part (strip display name if present)
  const bracketMatch = uriString.match(/<([^>]+)>/)
  const raw = bracketMatch ? bracketMatch[1] : uriString
  if (!raw) return {}

  // Find the @ symbol first to get past the user@host part
  const atPos = raw.indexOf('@')
  if (atPos < 0) return {}

  // Find parameters after the host:port part (after the @)
  const afterAt = raw.slice(atPos + 1)

  // Check for ; (params) and ? (headers)
  const semiPos = afterAt.indexOf(';')
  const questionPos = afterAt.indexOf('?')

  // If there's no ; or ? after the @, there are no params
  if (semiPos < 0 && questionPos < 0) {
    return {}
  }

  const params: Record<string, string> = {}

  // Params come before headers, separated by ?
  const headerPos = questionPos >= 0 ? questionPos : afterAt.length
  const paramPart = semiPos >= 0 ? afterAt.slice(semiPos + 1, headerPos) : ''

  // Parse params (separated by ;)
  for (const seg of paramPart.split(';')) {
    if (!seg) continue
    const [k, v] = seg.split('=')
    if (k) {
      params[decodeURIComponent(k.trim())] = v !== undefined ? decodeURIComponent(v.trim()) : ''
    }
  }

  // Parse headers (separated by &, after ?)
  if (questionPos >= 0) {
    const headerPart = afterAt.slice(questionPos + 1)
    for (const seg of headerPart.split('&')) {
      if (!seg) continue
      const [k, v] = seg.split('=')
      if (k) {
        params[decodeURIComponent(k.trim())] = v !== undefined ? decodeURIComponent(v.trim()) : ''
      }
    }
  }

  return params
}

/**
 * Normalize a SIP URI for comparison.
 * - Lowercases scheme and host
 * - Removes default ports (5060 for sip, 5061 for sips)
 *
 * @example
 * normalizeSipUri('SIP:ALICE@EXAMPLE.COM:5060')
 * // 'sip:alice@example.com'
 */
export function normalizeSipUri(uriString: string): string | null {
  const parsed = parseDetailedSipUri(uriString)
  if (!parsed) {
    return null
  }

  const scheme = parsed.scheme
  const port = parsed.port

  // Remove default ports
  const effectivePort =
    scheme === 'sips'
      ? port === DEFAULT_SIPS_PORT
        ? undefined
        : port
      : port === DEFAULT_SIP_PORT
        ? undefined
        : port

  return buildDetailedSipUri({
    scheme,
    user: parsed.user,
    host: parsed.host,
    port: effectivePort,
  })
}

/**
 * Check if a SIP URI uses secure transport (SIPS).
 *
 * @example
 * isSecureSipUri('sips:bob@example.com') // true
 * isSecureSipUri('sip:alice@example.com') // false
 */
export function isSecureSipUri(uriString: string): boolean {
  if (!uriString || typeof uriString !== 'string') {
    return false
  }
  return uriString.toLowerCase().startsWith('sips:')
}

/**
 * Extract just the user@host part (without scheme or port) from a SIP URI.
 *
 * @example
 * extractUserHost('sip:alice@example.com:5060')
 * // 'alice@example.com'
 */
export function extractUserHost(uriString: string): string | null {
  const parsed = parseDetailedSipUri(uriString)
  if (!parsed) {
    return null
  }
  return `${parsed.user}@${parsed.host}`
}

/**
 * Check if a SIP URI represents a phone number (user=phone or E.164 pattern).
 *
 * @example
 * isPhoneSipUri('sip:+14155551234@example.com')
 * // true
 *
 * @example
 * isPhoneSipUri('sip:alice@example.com;user=phone')
 * // true
 */
export function isPhoneSipUri(uriString: string): boolean {
  const parsed = parseDetailedSipUri(uriString)
  if (!parsed) {
    return false
  }

  // Check for user=phone parameter
  if (parsed.parameters?.['user'] === 'phone') {
    return true
  }

  // Check for E.164 format in user part
  if (/^\+[1-9]\d{1,14}$/.test(parsed.user)) {
    return true
  }

  return false
}
