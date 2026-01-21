import type { SipRequest } from '../types/events.types'
import type {
  CalledIdentityCandidate,
  CalledIdentityExtraction,
  CalledIdentityResolved,
} from '../types/called-identity.types'
import type {
  CalledIdentityConfig,
  CalledIdentityHeaderRole,
  CalledIdentitySource,
} from '../types/config.types'
import { CALLED_IDENTITY_PRESETS, DEFAULT_CALLED_IDENTITY_CONFIG } from '../types/config.types'

type AnyRecord = Record<string, unknown>

function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase()
}

function getHeaderValues(request: unknown, headerName: string): string[] {
  if (!request) return []
  const reqAny = request as AnyRecord

  const getter = reqAny.getHeader
  if (typeof getter === 'function') {
    try {
      const v = (getter as (name: string) => string | undefined)(headerName)
      return typeof v === 'string' && v.trim() ? [v] : []
    } catch {
      // ignore
    }
  }

  const headers = reqAny.headers
  if (!headers || typeof headers !== 'object') return []

  const headersObj = headers as AnyRecord
  const target = normalizeHeaderName(headerName)
  for (const [key, value] of Object.entries(headersObj)) {
    if (normalizeHeaderName(key) !== target) continue

    if (typeof value === 'string' && value.trim()) return [value]

    if (Array.isArray(value)) {
      const out: string[] = []
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          out.push(item)
          continue
        }
        const rec = item as AnyRecord
        const raw = rec?.raw ?? rec?.value ?? rec?.parsed
        if (typeof raw === 'string' && raw.trim()) out.push(raw)
      }
      return out
    }
  }

  return []
}

function getHeaderValue(request: unknown, headerName: string): string | undefined {
  return getHeaderValues(request, headerName)[0]
}

function decodeUserPart(v: string): string {
  const s = String(v ?? '')
  if (!/%[0-9a-fA-F]{2}/.test(s)) return s
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function parseUriUser(input: string): string | undefined {
  const s = String(input ?? '').trim()
  if (!s) return undefined

  // Prefer bracketed URI if present: Display Name <sip:user@host>
  const angleMatch = s.match(/<\s*([^>]+)\s*>/)
  const uriPart = angleMatch?.[1]?.trim() ?? s

  // Remove any leading display-name residue (rare)
  const cleaned = uriPart.replace(/^"[^"]*"\s*/, '').trim()

  const schemeMatch = cleaned.match(/^(sips?|tel):/i)
  if (schemeMatch) {
    const scheme = (schemeMatch[1] ?? '').toLowerCase()
    if (!scheme) return undefined
    const rest = cleaned.slice(schemeMatch[0].length)
    const stop = rest.search(/[;?]/)
    const beforeParams = stop >= 0 ? rest.slice(0, stop) : rest

    if (scheme === 'tel') {
      return beforeParams.trim() || undefined
    }

    // sip/sips
    const at = beforeParams.indexOf('@')
    const user = at >= 0 ? beforeParams.slice(0, at) : beforeParams
    const trimmed = user.trim()
    return trimmed ? decodeUserPart(trimmed) : undefined
  }

  // Fallback: try to find sip-like token inside
  const embedded = cleaned.match(/(sips?:[^\s>]+)/i)
  if (embedded?.[1]) return parseUriUser(embedded[1])

  // As a last resort, treat as already-user/number
  return cleaned ? decodeUserPart(cleaned) : undefined
}

function parseRequestUriUser(requestUri: unknown): string | undefined {
  if (!requestUri) return undefined
  if (typeof requestUri === 'string') return parseUriUser(requestUri)

  const rec = requestUri as AnyRecord
  if (typeof rec.user === 'string' && rec.user.trim()) return decodeUserPart(rec.user.trim())
  if (typeof rec.toString === 'function') {
    try {
      const s = String(rec.toString())
      return parseUriUser(s)
    } catch {
      // ignore
    }
  }
  return undefined
}

type IndexTuple = number[]

function parseHistoryInfoIndexTuple(entry: string): IndexTuple | undefined {
  const m = entry.match(/;\s*index\s*=\s*([^;\s]+)/i)
  const raw = m?.[1]?.trim()
  if (!raw) return undefined
  const parts = raw
    .split('.')
    .map((p) => Number.parseInt(p, 10))
    .filter((n) => Number.isFinite(n))
  return parts.length > 0 ? parts : undefined
}

function compareIndexTuples(a: IndexTuple, b: IndexTuple): number {
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai !== bi) return ai - bi
  }
  return 0
}

function parseHistoryInfoEntries(headerValue: string): string[] {
  // Split by comma; History-Info URIs commonly use <...> and params.
  return headerValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseDiversionEntries(values: readonly string[]): string[] {
  // Many stacks prepend the newest diversion. For "originally called", prefer oldest (last).
  const entries = values.flatMap((v) => v.split(',').map((s) => s.trim())).filter(Boolean)
  return entries.reverse()
}

function normalizeCalledValue(raw: string, config: CalledIdentityConfig): string | undefined {
  const n = config.normalization
  if (n?.enabled === false) return undefined

  let v = String(raw ?? '').trim()
  if (!v) return undefined

  const keepPlus = n?.keepPlus !== false
  const stripSeparators = n?.stripSeparators !== false

  if (stripSeparators) {
    v = v.replace(/[\s\-()]/g, '')
  }

  if (!keepPlus) {
    v = v.replace(/^\+/, '')
  }

  return v || undefined
}

function pushCandidate(out: CalledIdentityCandidate[], candidate: CalledIdentityCandidate): void {
  if (!candidate.raw) return
  const key = `${candidate.source}|${candidate.headerName ?? ''}|${candidate.raw}`
  if (out.some((c) => `${c.source}|${c.headerName ?? ''}|${c.raw}` === key)) return
  out.push(candidate)
}

function pickFromXHeaders(
  candidates: CalledIdentityCandidate[],
  headerPrecedence?: readonly string[]
): CalledIdentityCandidate | undefined {
  const xs = candidates.filter((c) => c.source === 'x-header')
  if (xs.length === 0) return undefined

  if (!headerPrecedence || headerPrecedence.length === 0) return xs[0]

  const order = headerPrecedence.map(normalizeHeaderName)
  xs.sort((a, b) => {
    const ai = a.headerName ? order.indexOf(normalizeHeaderName(a.headerName)) : -1
    const bi = b.headerName ? order.indexOf(normalizeHeaderName(b.headerName)) : -1
    const aScore = ai === -1 ? Number.MAX_SAFE_INTEGER : ai
    const bScore = bi === -1 ? Number.MAX_SAFE_INTEGER : bi
    return aScore - bScore
  })

  return xs[0]
}

function selectByPrecedence(
  candidates: CalledIdentityCandidate[],
  precedence: readonly CalledIdentitySource[],
  customHeaderPrecedence?: readonly string[]
): CalledIdentityResolved | undefined {
  for (const source of precedence) {
    if (source === 'x-header') {
      const x = pickFromXHeaders(candidates, customHeaderPrecedence)
      if (x) return x
      continue
    }

    const match = candidates.find((c) => c.source === source)
    if (match) return match
  }

  return undefined
}

export function resolveCalledIdentityConfig(config?: CalledIdentityConfig): CalledIdentityConfig {
  const base = DEFAULT_CALLED_IDENTITY_CONFIG

  const presetName = config?.preset
  const preset =
    presetName && presetName in CALLED_IDENTITY_PRESETS
      ? (CALLED_IDENTITY_PRESETS as Record<string, CalledIdentityConfig>)[presetName]
      : undefined

  return {
    ...base,
    ...preset,
    ...config,
    normalization: {
      ...(base.normalization ?? {}),
      ...(preset?.normalization ?? {}),
      ...(config?.normalization ?? {}),
    },
  }
}

export function extractCalledIdentity(
  request: SipRequest | undefined,
  config?: CalledIdentityConfig
): CalledIdentityExtraction {
  const effective = resolveCalledIdentityConfig(config)

  const candidates: CalledIdentityCandidate[] = []
  const customDialed: CalledIdentityCandidate[] = []
  const customTarget: CalledIdentityCandidate[] = []

  // request-uri
  const requestUriRaw = (request as AnyRecord | undefined)?.ruri
  const requestUriUser = parseRequestUriUser(requestUriRaw)
  if (requestUriUser) {
    pushCandidate(candidates, {
      source: 'request-uri',
      raw: requestUriUser,
      normalized: normalizeCalledValue(requestUriUser, effective),
    })
  }

  // to
  const toUser =
    (request as AnyRecord | undefined)?.to &&
    (request as AnyRecord).to &&
    ((request as AnyRecord).to as AnyRecord).uri &&
    (((request as AnyRecord).to as AnyRecord).uri as AnyRecord).user
  if (typeof toUser === 'string' && toUser.trim()) {
    pushCandidate(candidates, {
      source: 'to',
      raw: toUser,
      normalized: normalizeCalledValue(toUser, effective),
    })
  } else {
    const toHeader = getHeaderValue(request, 'To')
    const user = toHeader ? parseUriUser(toHeader) : undefined
    if (user) {
      pushCandidate(candidates, {
        source: 'to',
        raw: user,
        normalized: normalizeCalledValue(user, effective),
      })
    }
  }

  // p-called-party-id
  const pCalledValues = getHeaderValues(request, 'P-Called-Party-ID')
  for (const v of pCalledValues) {
    const pCalledUser = v ? parseUriUser(v) : undefined
    if (!pCalledUser) continue
    pushCandidate(candidates, {
      source: 'p-called-party-id',
      raw: pCalledUser,
      normalized: normalizeCalledValue(pCalledUser, effective),
    })
  }

  // history-info
  const historyInfoValues = getHeaderValues(request, 'History-Info')
  const historyEntries: { entry: string; index?: IndexTuple }[] = []
  for (const v of historyInfoValues) {
    for (const entry of parseHistoryInfoEntries(v)) {
      historyEntries.push({ entry, index: parseHistoryInfoIndexTuple(entry) })
    }
  }
  if (historyEntries.length > 0) {
    historyEntries.sort((a, b) => {
      if (a.index && b.index) return compareIndexTuples(a.index, b.index)
      if (a.index) return -1
      if (b.index) return 1
      return 0
    })
    for (const { entry } of historyEntries) {
      const user = parseUriUser(entry)
      if (!user) continue
      pushCandidate(candidates, {
        source: 'history-info',
        raw: user,
        normalized: normalizeCalledValue(user, effective),
      })
    }
  }

  // diversion
  const diversionValues = getHeaderValues(request, 'Diversion')
  for (const entry of parseDiversionEntries(diversionValues)) {
    const user = parseUriUser(entry)
    if (!user) continue
    pushCandidate(candidates, {
      source: 'diversion',
      raw: user,
      normalized: normalizeCalledValue(user, effective),
    })
  }

  // x-headers
  const customMap = effective.customHeaderMap ?? {}
  for (const [headerName, role] of Object.entries(customMap)) {
    const value = getHeaderValue(request, headerName)
    const user = value ? parseUriUser(value) : undefined
    if (!user) continue

    const candidate: CalledIdentityCandidate = {
      source: 'x-header',
      headerName,
      raw: user,
      normalized: normalizeCalledValue(user, effective),
    }

    pushCandidate(candidates, candidate)

    const r = role as CalledIdentityHeaderRole
    if (r === 'dialed') customDialed.push(candidate)
    if (r === 'target') customTarget.push(candidate)
  }

  const dialed =
    pickFromXHeaders(customDialed, effective.customHeaderPrecedence) ??
    selectByPrecedence(
      candidates,
      effective.dialedPrecedence ?? DEFAULT_CALLED_IDENTITY_CONFIG.dialedPrecedence ?? [],
      effective.customHeaderPrecedence
    )

  const target =
    pickFromXHeaders(customTarget, effective.customHeaderPrecedence) ??
    selectByPrecedence(
      candidates,
      effective.targetPrecedence ?? DEFAULT_CALLED_IDENTITY_CONFIG.targetPrecedence ?? [],
      effective.customHeaderPrecedence
    )

  return {
    candidates,
    dialed,
    target,
  }
}
