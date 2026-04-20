/**
 * Minimal SIP-over-WebSocket client for integration tests.
 *
 * Implements only what's needed to verify registration against a real
 * Asterisk: open WS with the `sip` subprotocol, send REGISTER, handle the
 * 401 digest challenge (MD5), send an authenticated REGISTER, and confirm
 * the 200 OK.
 *
 * Deliberately dependency-free. Uses Node's built-in WebSocket (Node ≥ 22)
 * and the `crypto` module.
 */

import { createHash, randomBytes, randomUUID } from 'node:crypto'

export interface SipWsOptions {
  wsUrl: string
  domain: string
  user: string
  password: string
  displayName?: string
  expires?: number
  handshakeTimeoutMs?: number
  responseTimeoutMs?: number
}

export interface SipResponse {
  statusLine: string
  status: number
  reason: string
  headers: Record<string, string | string[]>
  body: string
}

const CRLF = '\r\n'

const md5 = (s: string): string => createHash('md5').update(s).digest('hex')

const parseResponse = (raw: string): SipResponse => {
  const [headerPart, ...bodyParts] = raw.split(CRLF + CRLF)
  const body = bodyParts.join(CRLF + CRLF)
  const [statusLine, ...lines] = headerPart.split(CRLF)
  const match = /^SIP\/2\.0\s+(\d{3})\s+(.*)$/.exec(statusLine)
  const status = match ? Number(match[1]) : 0
  const reason = match ? match[2] : ''
  const headers: Record<string, string | string[]> = {}
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const name = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()
    const existing = headers[name]
    if (existing === undefined) headers[name] = value
    else if (Array.isArray(existing)) existing.push(value)
    else headers[name] = [existing, value]
  }
  return { statusLine, status, reason, headers, body }
}

interface DigestChallenge {
  realm: string
  nonce: string
  algorithm: string
  qop?: string
  opaque?: string
}

const parseDigest = (wwwAuthenticate: string): DigestChallenge => {
  const tail = wwwAuthenticate.replace(/^Digest\s+/i, '')
  const params: Record<string, string> = {}
  // Split on commas that are not inside quotes.
  const tokens = tail.match(/[^=,\s]+="[^"]*"|[^=,\s]+=[^,\s]+/g) ?? []
  for (const token of tokens) {
    const eq = token.indexOf('=')
    const k = token.slice(0, eq).trim().toLowerCase()
    const raw = token.slice(eq + 1).trim()
    params[k] = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw
  }
  return {
    realm: params.realm ?? '',
    nonce: params.nonce ?? '',
    algorithm: (params.algorithm ?? 'MD5').toUpperCase(),
    qop: params.qop,
    opaque: params.opaque,
  }
}

const buildDigestResponse = (args: {
  user: string
  password: string
  method: string
  uri: string
  challenge: DigestChallenge
  nc?: string
  cnonce?: string
}): string => {
  const { user, password, method, uri, challenge } = args
  const ha1 = md5(`${user}:${challenge.realm}:${password}`)
  const ha2 = md5(`${method}:${uri}`)
  const hasQop = challenge.qop && challenge.qop.split(',').map((s) => s.trim()).includes('auth')
  if (hasQop) {
    const nc = args.nc ?? '00000001'
    const cnonce = args.cnonce ?? randomBytes(8).toString('hex')
    const response = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`)
    const parts = [
      `username="${user}"`,
      `realm="${challenge.realm}"`,
      `nonce="${challenge.nonce}"`,
      `uri="${uri}"`,
      'algorithm=MD5',
      'qop=auth',
      `nc=${nc}`,
      `cnonce="${cnonce}"`,
      `response="${response}"`,
    ]
    if (challenge.opaque) parts.push(`opaque="${challenge.opaque}"`)
    return `Digest ${parts.join(', ')}`
  }
  const response = md5(`${ha1}:${challenge.nonce}:${ha2}`)
  const parts = [
    `username="${user}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    'algorithm=MD5',
    `response="${response}"`,
  ]
  if (challenge.opaque) parts.push(`opaque="${challenge.opaque}"`)
  return `Digest ${parts.join(', ')}`
}

export interface RegisterOutcome {
  challenge: SipResponse
  final: SipResponse
}

export const registerOnce = async (opts: SipWsOptions): Promise<RegisterOutcome> => {
  const handshakeTimeoutMs = opts.handshakeTimeoutMs ?? 5000
  const responseTimeoutMs = opts.responseTimeoutMs ?? 5000
  const expires = opts.expires ?? 60

  // @ts-expect-error Node ≥ 22 exposes WebSocket on globalThis.
  const ws: WebSocket = new WebSocket(opts.wsUrl, ['sip'])

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      reject(new Error(`WebSocket handshake timed out after ${handshakeTimeoutMs}ms`))
    }, handshakeTimeoutMs)
    ws.addEventListener('open', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
    ws.addEventListener('error', (ev: Event) => {
      clearTimeout(timer)
      reject(new Error(`WebSocket error: ${(ev as { message?: string }).message ?? 'unknown'}`))
    }, { once: true })
  })

  const pendingResponses: SipResponse[] = []
  const waiters: Array<(resp: SipResponse) => void> = []
  ws.addEventListener('message', (ev: MessageEvent) => {
    const data = typeof ev.data === 'string' ? ev.data : ''
    if (!data.startsWith('SIP/2.0')) return
    const resp = parseResponse(data)
    const waiter = waiters.shift()
    if (waiter) waiter(resp)
    else pendingResponses.push(resp)
  })

  const awaitResponse = (): Promise<SipResponse> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = waiters.indexOf(resolver)
        if (idx !== -1) waiters.splice(idx, 1)
        reject(new Error(`Timed out waiting for SIP response after ${responseTimeoutMs}ms`))
      }, responseTimeoutMs)
      const resolver = (resp: SipResponse) => {
        clearTimeout(timer)
        resolve(resp)
      }
      const buffered = pendingResponses.shift()
      if (buffered) resolver(buffered)
      else waiters.push(resolver)
    })

  const hostFromWsUrl = new URL(opts.wsUrl).hostname
  const callId = randomUUID()
  const fromTag = randomBytes(6).toString('hex')
  const branchBase = 'z9hG4bK'
  const aor = `sip:${opts.user}@${opts.domain}`
  const regUri = `sip:${opts.domain}`
  const contactUser = randomBytes(6).toString('hex')
  const contactUri = `sip:${contactUser}@${hostFromWsUrl};transport=ws`
  const displayName = opts.displayName ?? opts.user

  const sendRegister = (cseq: number, authHeader?: string): void => {
    const lines = [
      `REGISTER ${regUri} SIP/2.0`,
      `Via: SIP/2.0/WS ${hostFromWsUrl};branch=${branchBase}${randomBytes(6).toString('hex')}`,
      `Max-Forwards: 70`,
      `From: "${displayName}" <${aor}>;tag=${fromTag}`,
      `To: "${displayName}" <${aor}>`,
      `Call-ID: ${callId}`,
      `CSeq: ${cseq} REGISTER`,
      `Contact: <${contactUri}>;expires=${expires}`,
      `Expires: ${expires}`,
      `User-Agent: VueSIP-IntegrationTest`,
      `Supported: path, gruu, outbound`,
    ]
    if (authHeader) lines.push(`Authorization: ${authHeader}`)
    lines.push('Content-Length: 0')
    ws.send(lines.join(CRLF) + CRLF + CRLF)
  }

  try {
    sendRegister(1)
    let first = await awaitResponse()
    // Some servers emit a 100 Trying before the challenge.
    while (first.status === 100) first = await awaitResponse()
    if (first.status !== 401 && first.status !== 407) {
      return { challenge: first, final: first }
    }
    const challengeHeader =
      first.status === 401 ? first.headers['www-authenticate'] : first.headers['proxy-authenticate']
    const challengeRaw = Array.isArray(challengeHeader) ? challengeHeader[0] : challengeHeader
    if (!challengeRaw) throw new Error(`Missing digest challenge header on ${first.status}`)
    const challenge = parseDigest(challengeRaw)
    const authHeader = buildDigestResponse({
      user: opts.user,
      password: opts.password,
      method: 'REGISTER',
      uri: regUri,
      challenge,
    })
    sendRegister(2, authHeader)
    let final = await awaitResponse()
    while (final.status === 100) final = await awaitResponse()
    return { challenge: first, final }
  } finally {
    try {
      ws.close()
    } catch {
      /* ignore */
    }
  }
}
