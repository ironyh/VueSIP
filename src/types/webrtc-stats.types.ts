/**
 * WebRTC Statistics Types
 * @packageDocumentation
 */

/**
 * Audio codec information
 */
export interface AudioCodecInfo {
  /** Codec name (e.g., 'opus', 'PCMU', 'PCMA') */
  name: string
  /** Payload type */
  payloadType: number
  /** Clock rate (Hz) */
  clockRate: number
  /** Number of channels */
  channels?: number
  /** MIME type */
  mimeType: string
}

/**
 * Video codec information
 */
export interface VideoCodecInfo {
  /** Codec name (e.g., 'VP8', 'VP9', 'H264') */
  name: string
  /** Payload type */
  payloadType: number
  /** Clock rate (Hz) */
  clockRate: number
  /** MIME type */
  mimeType: string
  /** Profile level ID (for H.264) */
  profileLevelId?: string
}

/**
 * Inbound RTP stream statistics
 */
export interface InboundRtpStats {
  /** SSRC identifier */
  ssrc: number
  /** Media type ('audio' or 'video') */
  kind: 'audio' | 'video'
  /** Codec info */
  codec?: AudioCodecInfo | VideoCodecInfo
  /** Packets received */
  packetsReceived: number
  /** Packets lost */
  packetsLost: number
  /** Packet loss percentage (0-100) */
  packetLossPercent: number
  /** Bytes received */
  bytesReceived: number
  /** Jitter in seconds */
  jitter: number
  /** Jitter in milliseconds */
  jitterMs: number
  /** Round-trip time in seconds (if available) */
  roundTripTime?: number
  /** Round-trip time in milliseconds */
  roundTripTimeMs?: number
  /** Frames decoded (video only) */
  framesDecoded?: number
  /** Frames dropped (video only) */
  framesDropped?: number
  /** Frame width (video only) */
  frameWidth?: number
  /** Frame height (video only) */
  frameHeight?: number
  /** Frames per second (video only) */
  framesPerSecond?: number
  /** Bitrate in bits per second */
  bitrate: number
  /** Timestamp of these stats */
  timestamp: number
}

/**
 * Outbound RTP stream statistics
 */
export interface OutboundRtpStats {
  /** SSRC identifier */
  ssrc: number
  /** Media type ('audio' or 'video') */
  kind: 'audio' | 'video'
  /** Codec info */
  codec?: AudioCodecInfo | VideoCodecInfo
  /** Packets sent */
  packetsSent: number
  /** Bytes sent */
  bytesSent: number
  /** Retransmitted packets */
  retransmittedPacketsSent?: number
  /** Target bitrate */
  targetBitrate?: number
  /** Frames encoded (video only) */
  framesEncoded?: number
  /** Frame width (video only) */
  frameWidth?: number
  /** Frame height (video only) */
  frameHeight?: number
  /** Frames per second (video only) */
  framesPerSecond?: number
  /** Quality limitation reason (video only) */
  qualityLimitationReason?: 'none' | 'cpu' | 'bandwidth' | 'other'
  /** Bitrate in bits per second */
  bitrate: number
  /** Timestamp of these stats */
  timestamp: number
}

/**
 * ICE candidate pair statistics
 */
export interface IceCandidatePairStats {
  /** Candidate pair ID */
  id: string
  /** State of the candidate pair */
  state: RTCStatsIceCandidatePairState
  /** Whether this is the nominated pair */
  nominated: boolean
  /** Priority */
  priority?: number
  /** Local candidate type */
  localCandidateType: RTCIceCandidateType
  /** Remote candidate type */
  remoteCandidateType: RTCIceCandidateType
  /** Local address */
  localAddress?: string
  /** Remote address */
  remoteAddress?: string
  /** Current round-trip time in seconds */
  currentRoundTripTime?: number
  /** Current round-trip time in milliseconds */
  currentRoundTripTimeMs?: number
  /** Available outgoing bitrate */
  availableOutgoingBitrate?: number
  /** Available incoming bitrate */
  availableIncomingBitrate?: number
  /** Bytes sent */
  bytesSent: number
  /** Bytes received */
  bytesReceived: number
  /** Requests sent */
  requestsSent: number
  /** Responses received */
  responsesReceived: number
  /** Consent requests sent */
  consentRequestsSent?: number
  /** Timestamp */
  timestamp: number
}

/**
 * Connection quality level
 */
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'bad' | 'unknown'

/**
 * MOS (Mean Opinion Score) rating
 * 1 = Bad, 2 = Poor, 3 = Fair, 4 = Good, 5 = Excellent
 */
export interface MosScore {
  /** MOS value (1.0 - 5.0) */
  value: number
  /** Quality label */
  quality: ConnectionQuality
  /** Timestamp */
  timestamp: number
}

/**
 * Comprehensive call quality statistics
 */
export interface CallQualityStats {
  /** Overall quality assessment */
  quality: ConnectionQuality
  /** Estimated MOS score */
  mos: MosScore
  /** Audio statistics */
  audio: {
    /** Inbound audio stats */
    inbound?: InboundRtpStats
    /** Outbound audio stats */
    outbound?: OutboundRtpStats
  }
  /** Video statistics (if video call) */
  video?: {
    /** Inbound video stats */
    inbound?: InboundRtpStats
    /** Outbound video stats */
    outbound?: OutboundRtpStats
  }
  /** ICE candidate pair stats */
  connection?: IceCandidatePairStats
  /** Network statistics */
  network: {
    /** Round-trip time in milliseconds */
    rtt?: number
    /** Jitter in milliseconds */
    jitter?: number
    /** Packet loss percentage */
    packetLoss?: number
    /** Available bandwidth (kbps) */
    bandwidth?: number
  }
  /** Timestamp of these stats */
  timestamp: number
  /** Duration since call start (seconds) */
  callDuration?: number
}

/**
 * Quality alert types
 */
export type QualityAlertType =
  | 'high_packet_loss'
  | 'high_jitter'
  | 'high_rtt'
  | 'low_bandwidth'
  | 'codec_change'
  | 'quality_degradation'
  | 'connection_change'

/**
 * Quality alert
 */
export interface QualityAlert {
  /** Alert type */
  type: QualityAlertType
  /** Alert severity */
  severity: 'warning' | 'critical'
  /** Alert message */
  message: string
  /** Current value that triggered the alert */
  value: number
  /** Threshold that was exceeded */
  threshold: number
  /** Timestamp */
  timestamp: Date
}

/**
 * Quality thresholds for alerts
 */
export interface QualityThresholds {
  /** Packet loss warning threshold (percentage) */
  packetLossWarning: number
  /** Packet loss critical threshold (percentage) */
  packetLossCritical: number
  /** Jitter warning threshold (ms) */
  jitterWarning: number
  /** Jitter critical threshold (ms) */
  jitterCritical: number
  /** RTT warning threshold (ms) */
  rttWarning: number
  /** RTT critical threshold (ms) */
  rttCritical: number
  /** MOS warning threshold */
  mosWarning: number
  /** MOS critical threshold */
  mosCritical: number
}

/**
 * Default quality thresholds
 */
export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  packetLossWarning: 1,
  packetLossCritical: 5,
  jitterWarning: 30,
  jitterCritical: 100,
  rttWarning: 150,
  rttCritical: 300,
  mosWarning: 3.5,
  mosCritical: 2.5,
}

/**
 * Stats history entry
 */
export interface StatsHistoryEntry {
  /** Timestamp */
  timestamp: number
  /** MOS score */
  mos: number
  /** Packet loss percentage */
  packetLoss: number
  /** Jitter in ms */
  jitter: number
  /** RTT in ms */
  rtt?: number
  /** Bitrate in kbps */
  bitrate: number
}

/**
 * Options for useSipWebRTCStats composable
 */
export interface UseSipWebRTCStatsOptions {
  /** Stats collection interval in ms (default: 1000) */
  pollInterval?: number
  /** Enable automatic stats collection */
  autoStart?: boolean
  /** Maximum history entries to keep */
  maxHistoryEntries?: number
  /** Quality thresholds for alerts */
  thresholds?: Partial<QualityThresholds>
  /** Stats update callback */
  onStatsUpdate?: (stats: CallQualityStats) => void
  /** Quality alert callback */
  onQualityAlert?: (alert: QualityAlert) => void
  /** Quality change callback */
  onQualityChange?: (newQuality: ConnectionQuality, oldQuality: ConnectionQuality) => void
  /** Include video stats (default: true) */
  includeVideo?: boolean
  /** Enable MOS calculation (default: true) */
  calculateMos?: boolean
}
