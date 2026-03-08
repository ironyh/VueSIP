/**
 * FreePBX PBX Recording Provider
 *
 * Adapter for listing and playing call recordings from a FreePBX server via
 * GraphQL (fetchAllCdrs / fetchCdr) and the CDR download URL.
 *
 * @module pbx-adapters/freepbx
 *
 * ## Authentication and playback URLs
 *
 * **Same-origin session (cookies):** If your app is served from the same origin
 * as the FreePBX admin (e.g. embedded in FreePBX or same domain), the browser
 * will send the user's session cookies with every request. No extra config
 * needed; set `baseUrl` to the FreePBX admin base (e.g. `https://pbx.example.com`).
 *
 * **Backend proxy:** If your app is on a different origin, playback URLs
 * require authentication. Options: (1) Proxy recording downloads through your
 * backend (your server fetches from FreePBX with server-side auth and streams
 * to the client). (2) Use token-based auth if your FreePBX/API supports it,
 * and pass headers via `getAuthHeaders`. Download/playback will only work when
 * the client sends the same auth (e.g. in a request header or as a signed query
 * param). Document and implement the chosen approach in your app; this adapter
 * only builds the URL and optional request headers.
 *
 * @see {@link https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26083384/CDR+Module+GraphQL+APIs | FreePBX CDR GraphQL APIs}
 */

import type {
  PbxRecordingProvider,
  PbxRecordingProviderCapabilities,
  PbxRecordingListQuery,
  PbxRecordingListResult,
  RecordingSummary,
  RecordingPlaybackInfo,
  PbxRecordingDirection,
} from '../types/pbx-recording.types'

/** FreePBX GraphQL CDR row (fields we use from fetchAllCdrs / fetchCdr). */
export interface FreePbxCdrRow {
  id?: string
  uniqueid: string
  calldate?: string
  timestamp?: number
  clid?: string
  src?: string
  dst?: string
  duration?: number
  billsec?: number
  dcontext?: string
  channel?: string
  dstchannel?: string
  disposition?: string
  recordingfile?: string
  linkedid?: string
  [key: string]: unknown
}

/** Response shape of fetchAllCdrs GraphQL query. */
export interface FreePbxFetchAllCdrsResponse {
  data?: {
    fetchAllCdrs?: {
      cdrs: FreePbxCdrRow[]
      totalCount: number
      status?: boolean
      message?: string
    }
  }
  errors?: Array<{ message: string }>
}

/** Config for the FreePBX recording provider. */
export interface FreePbxRecordingConfig {
  /**
   * Base URL of the FreePBX admin (no trailing slash).
   * Example: `https://pbx.example.com` or `https://pbx.example.com/admin`
   * (GraphQL is at `baseUrl/admin/api/api/gql` if baseUrl has no /admin).
   */
  baseUrl: string

  /**
   * Optional custom fetch (e.g. for tests or adding auth headers).
   * Defaults to global `fetch`. When using same-origin cookies, use default.
   */
  fetch?: typeof fetch

  /**
   * Optional function to add auth headers to GraphQL and playback requests.
   * Use for token-based auth; leave unset for same-origin session (cookies).
   */
  getAuthHeaders?: () => HeadersInit | Promise<HeadersInit>
}

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 500

/**
 * Normalize base URL (no trailing slash). If baseUrl already ends with /admin, use as-is;
 * otherwise GraphQL path is relative to site root so we use baseUrl + '/admin/api/api/gql'.
 */
function normalizeBaseUrl(baseUrl: string): string {
  const s = baseUrl.replace(/\/+$/, '')
  return s
}

/**
 * GraphQL endpoint for FreePBX CDR API.
 * See: https://sangomakb.atlassian.net/wiki/spaces/PG/pages/26083384/CDR+Module+GraphQL+APIs
 */
function getGraphQLEndpoint(baseUrl: string): string {
  const base = normalizeBaseUrl(baseUrl)
  if (base.endsWith('/admin')) {
    return `${base}/api/api/gql`
  }
  return `${base}/admin/api/api/gql`
}

/**
 * Build playback/download URL for a recording by its uniqueid.
 * FreePBX expects: config.php?display=cdr&action=download_audio&cdr_file=<uniqueid>
 */
function buildPlaybackUrl(baseUrl: string, uniqueid: string): string {
  const base = normalizeBaseUrl(baseUrl)
  const adminPrefix = base.endsWith('/admin') ? base : `${base}/admin`
  const params = new URLSearchParams({
    display: 'cdr',
    action: 'download_audio',
    cdr_file: uniqueid,
  })
  return `${adminPrefix}/config.php?${params.toString()}`
}

/**
 * Map FreePBX disposition/channel context to adapter direction.
 */
function mapDirection(
  _row: FreePbxCdrRow,
  dcontext?: string,
  src?: string,
  dst?: string
): PbxRecordingDirection {
  const ctx = (dcontext ?? '').toLowerCase()
  if (ctx.includes('from-pstn') || ctx.includes('from-external')) return 'inbound'
  if (ctx.includes('to-pstn') || ctx.includes('to-external')) return 'outbound'
  if (ctx.includes('from-internal') || ctx.includes('to-internal')) return 'internal'
  if (src && dst) return 'internal'
  return 'unknown'
}

/**
 * Parse CLID string (e.g. "\"Name\" <123>") to extract number or use as-is.
 */
function parseClid(clid: string | undefined): string | undefined {
  if (!clid || !clid.trim()) return undefined
  const match = clid.match(/<([^>]+)>/)
  const num = match?.[1]
  return num != null ? num.trim() : clid.trim()
}

/**
 * Map a single FreePBX CDR row to RecordingSummary.
 * Uses uniqueid as id so getPlaybackInfo can build URL without an extra fetch.
 */
function mapFreePbxCdrToRecordingSummary(row: FreePbxCdrRow): RecordingSummary {
  const uniqueid = row.uniqueid ?? ''
  const calldate = row.calldate ?? ''
  const startTime = new Date(calldate && calldate.trim() ? calldate : Date.now())
  const duration = typeof row.duration === 'number' ? row.duration : (row.billsec ?? 0) || 0
  const src = row.src ?? ''
  const dst = row.dst ?? ''
  const direction = mapDirection(row, row.dcontext, src, dst)
  const channel = [row.channel, row.dstchannel].filter(Boolean).join(' / ') || undefined

  return {
    id: uniqueid,
    callUniqueId: uniqueid,
    direction,
    startTime,
    duration,
    callerId: (parseClid(row.clid) ?? src) || undefined,
    callee: dst || undefined,
    channelOrLabel: channel,
    metadata: {
      recordingfile: row.recordingfile,
      linkedid: row.linkedid,
      disposition: row.disposition,
    },
  }
}

/**
 * Creates a PbxRecordingProvider for FreePBX using GraphQL (fetchAllCdrs) for listing
 * and config.php?display=cdr&action=download_audio&cdr_file=<uniqueid> for playback.
 *
 * @param config - baseUrl and optional fetch / getAuthHeaders
 * @returns PbxRecordingProvider implementation
 *
 * @example
 * ```ts
 * import { createFreePbxRecordingProvider } from 'vuesip'
 *
 * const provider = createFreePbxRecordingProvider({
 *   baseUrl: 'https://pbx.example.com',
 *   getAuthHeaders: () => ({ Authorization: `Bearer ${token}` }),
 * })
 *
 * const result = await provider.listRecordings({ limit: 20 })
 * const info = await provider.getPlaybackInfo(result.items[0].id)
 * // info.playbackUrl is the download URL (requires auth in cross-origin case)
 * ```
 */
export function createFreePbxRecordingProvider(config: FreePbxRecordingConfig): PbxRecordingProvider {
  const { baseUrl, fetch: customFetch = fetch, getAuthHeaders } = config
  const graphqlUrl = getGraphQLEndpoint(baseUrl)

  const capabilities: PbxRecordingProviderCapabilities = {
    listRecordings: true,
    getPlaybackInfo: true,
    downloadRecording: true,
    supportsDateFilter: true,
    supportsSearch: false,
    supportsDirectionFilter: false,
    maxPageSize: MAX_PAGE_SIZE,
  }

  async function requestHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (getAuthHeaders) {
      const auth = await getAuthHeaders()
      Object.assign(headers, auth instanceof Headers ? Object.fromEntries(auth.entries()) : auth)
    }
    return headers
  }

  const provider: PbxRecordingProvider = {
    capabilities,

    async listRecordings(query: PbxRecordingListQuery): Promise<PbxRecordingListResult> {
      const limit = Math.min(
        query.limit ?? DEFAULT_PAGE_SIZE,
        MAX_PAGE_SIZE
      )
      const offset = query.offset ?? 0
      const orderby = query.sortBy === 'duration' ? 'duration' : 'date'
      const startDate = query.dateFrom
        ? query.dateFrom.toISOString().slice(0, 10)
        : undefined
      const endDate = query.dateTo
        ? query.dateTo.toISOString().slice(0, 10)
        : undefined

      const gqlQuery = `query FetchAllCdrs($first: Int, $after: Int, $orderby: String, $startDate: String, $endDate: String) {
  fetchAllCdrs(first: $first, after: $after, orderby: $orderby, startDate: $startDate, endDate: $endDate) {
    cdrs {
      id
      uniqueid
      calldate
      timestamp
      clid
      src
      dst
      dcontext
      channel
      dstchannel
      duration
      billsec
      disposition
      recordingfile
      linkedid
    }
    totalCount
    status
    message
  }
}`

      const res = await customFetch(graphqlUrl, {
        method: 'POST',
        headers: await requestHeaders(),
        body: JSON.stringify({
          query: gqlQuery,
          variables: {
            first: limit,
            after: offset,
            orderby,
            startDate: startDate ?? null,
            endDate: endDate ?? null,
          },
        }),
      })

      if (!res.ok) {
        throw new Error(`FreePBX GraphQL request failed: ${res.status} ${res.statusText}`)
      }

      const json = (await res.json()) as FreePbxFetchAllCdrsResponse
      if (json.errors?.length) {
        const msg = json.errors.map((e) => e.message).join('; ')
        throw new Error(`FreePBX GraphQL errors: ${msg}`)
      }

      const data = json.data?.fetchAllCdrs
      if (!data) {
        throw new Error('FreePBX fetchAllCdrs: missing data')
      }

      const items = (data.cdrs ?? []).map(mapFreePbxCdrToRecordingSummary)
      const totalCount = data.totalCount ?? items.length
      const hasMore = offset + items.length < totalCount

      return {
        items,
        totalCount,
        hasMore,
      }
    },

    async getPlaybackInfo(recordingId: string): Promise<RecordingPlaybackInfo | null> {
      if (!recordingId) return null
      const playbackUrl = buildPlaybackUrl(baseUrl, recordingId)
      return {
        recordingId,
        playbackUrl,
        requiresAuth: true,
        metadata: { source: 'freepbx' },
      }
    },
  }

  return provider
}
