/**
 * PBX Recording Types
 *
 * Adapter-agnostic types for PBX recording retrieval. Used by PbxRecordingProvider
 * adapters (e.g. FreePBX, Asterisk AMI) so the UI can list and play recordings
 * without depending on PBX-specific behavior.
 *
 * @module types/pbx-recording
 */

/**
 * Call direction for a recording (adapter-agnostic).
 */
export type PbxRecordingDirection = 'inbound' | 'outbound' | 'internal' | 'unknown'

/**
 * Summary of a single PBX recording for list views.
 * All fields are optional where the PBX may not provide them.
 */
export interface RecordingSummary {
  /** Unique recording ID (stable across list and playback). */
  id: string

  /** Call/channel unique ID if the adapter can link to a call. */
  callUniqueId?: string

  /** Call direction when known. */
  direction?: PbxRecordingDirection

  /** When the recording started. */
  startTime: Date

  /** Duration in seconds. */
  duration: number

  /** Caller number or identifier. */
  callerId?: string

  /** Callee/destination number or identifier. */
  callee?: string

  /** Human-readable channel or context (e.g. "Queue: support", "Extension 101"). */
  channelOrLabel?: string

  /** Adapter-specific metadata; avoid leaking PBX-specific types. */
  metadata?: Record<string, unknown>
}

/**
 * Information required to play or download a recording.
 * Adapters return this from getPlaybackInfo(); UI uses it for audio player or download.
 */
export interface RecordingPlaybackInfo {
  /** Recording ID (matches RecordingSummary.id). */
  recordingId: string

  /** Direct URL for playback (e.g. signed HTTP URL or relative path). */
  playbackUrl?: string

  /** Alternative streaming URL if the provider uses a different endpoint. */
  streamUrl?: string

  /** MIME type or format hint (e.g. 'audio/wav', 'audio/mpeg'). */
  format?: string

  /** When a signed playbackUrl expires (if applicable). */
  expiresAt?: Date

  /** If true, UI must send auth (e.g. cookie or header); adapter may handle internally. */
  requiresAuth?: boolean

  /** Adapter-specific playback options. */
  metadata?: Record<string, unknown>
}

/**
 * Query options for listing PBX recordings (paging and filtering).
 * Adapters interpret supported fields; unsupported fields are ignored.
 */
export interface PbxRecordingListQuery {
  /** Only include recordings from this date (inclusive). */
  dateFrom?: Date

  /** Only include recordings up to this date (inclusive). */
  dateTo?: Date

  /** Filter by call direction. */
  direction?: PbxRecordingDirection

  /** Search in caller, callee, ID, or channel (adapter-defined). */
  searchQuery?: string

  /** Sort field. */
  sortBy?: 'startTime' | 'duration' | 'callerId' | 'callee'

  /** Sort order. */
  sortOrder?: 'asc' | 'desc'

  /** Maximum number of items to return. */
  limit?: number

  /** Number of items to skip (pagination). */
  offset?: number
}

/**
 * Result of a list recordings request.
 */
export interface PbxRecordingListResult {
  /** Recording summaries for the current page. */
  items: RecordingSummary[]

  /** Total count matching the query (before limit/offset). */
  totalCount: number

  /** True if more items exist after this page. */
  hasMore: boolean
}

/**
 * Capabilities supported by a PBX recording provider.
 * UI can show/hide features based on these flags.
 */
export interface PbxRecordingProviderCapabilities {
  /** Provider can list recordings (listRecordings). */
  listRecordings: boolean

  /** Provider can return playback info (getPlaybackInfo). */
  getPlaybackInfo: boolean

  /** Provider supports download (e.g. downloadRecording or URL in playback info). */
  downloadRecording?: boolean

  /** Provider supports date range filter (dateFrom/dateTo). */
  supportsDateFilter?: boolean

  /** Provider supports search (searchQuery). */
  supportsSearch?: boolean

  /** Provider supports direction filter. */
  supportsDirectionFilter?: boolean

  /** Maximum page size the provider accepts for limit (if any). */
  maxPageSize?: number
}

/**
 * Provider interface for PBX recording retrieval.
 * Adapters (FreePBX, Asterisk AMI, etc.) implement this so the UI can list
 * and play recordings without depending on PBX-specific APIs.
 */
export interface PbxRecordingProvider {
  /** Capabilities of this provider; UI uses this to enable/disable features. */
  readonly capabilities: PbxRecordingProviderCapabilities

  /**
   * List recordings with optional paging and filtering.
   * @param query - List query (date range, sort, limit, offset, etc.)
   * @returns Page of recording summaries and total count
   */
  listRecordings(query: PbxRecordingListQuery): Promise<PbxRecordingListResult>

  /**
   * Get playback information for a recording by ID.
   * @param recordingId - Recording ID from RecordingSummary.id
   * @returns Playback info or null if not found / not available
   */
  getPlaybackInfo(recordingId: string): Promise<RecordingPlaybackInfo | null>
}

/**
 * Stable error codes for playback URL failures (UI can show specific messages).
 */
export type PbxPlaybackErrorCode =
  | 'unauthorized'
  | 'expired'
  | 'not_found'
  | 'network'
  | 'unknown'

/**
 * Normalized playback error for a single recording (stable state for UI).
 */
export interface PbxPlaybackError {
  /** Recording ID that failed. */
  recordingId: string
  /** Error code for UI handling. */
  code: PbxPlaybackErrorCode
  /** Optional adapter/message detail. */
  message?: string
}
