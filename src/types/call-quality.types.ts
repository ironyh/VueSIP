/**
 * Call Quality Types
 *
 * Type definitions for comprehensive call quality scoring,
 * network quality indicators, and bandwidth adaptation.
 *
 * @packageDocumentation
 */

// =============================================================================
// Quality Score Types
// =============================================================================

/**
 * Quality grade assignment based on overall score
 */
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F'

/**
 * Comprehensive call quality score combining multiple metrics
 */
export interface CallQualityScore {
  /** Overall score 0-100 */
  overall: number
  /** Audio quality score 0-100 */
  audio: number
  /** Video quality score 0-100 (null if audio-only) */
  video: number | null
  /** Network stability score 0-100 */
  network: number
  /** Quality grade */
  grade: QualityGrade
  /** Human-readable quality description */
  description: string
  /** Timestamp of score calculation */
  timestamp: number
}

/**
 * Quality score weights for different metrics
 * All weights should sum to 1.0
 */
export interface QualityScoreWeights {
  /** Weight for packet loss impact (0-1) */
  packetLoss: number
  /** Weight for jitter impact (0-1) */
  jitter: number
  /** Weight for round-trip time impact (0-1) */
  rtt: number
  /** Weight for MOS score impact (0-1) */
  mos: number
  /** Weight for bitrate stability impact (0-1) */
  bitrateStability: number
}

/**
 * Default quality score weights
 */
export const DEFAULT_QUALITY_WEIGHTS: QualityScoreWeights = {
  packetLoss: 0.25,
  jitter: 0.15,
  rtt: 0.2,
  mos: 0.25,
  bitrateStability: 0.15,
}

/**
 * Quality trend direction
 */
export type QualityTrendDirection = 'improving' | 'stable' | 'degrading'

/**
 * Quality trend over time
 */
export interface QualityTrend {
  /** Direction of quality change */
  direction: QualityTrendDirection
  /** Rate of change (-100 to 100, negative = degrading) */
  rate: number
  /** Confidence in trend (0-1, higher = more certain) */
  confidence: number
}

/**
 * Options for useCallQualityScore composable
 */
export interface CallQualityScoreOptions {
  /** Custom weight configuration (partial, will be merged with defaults) */
  weights?: Partial<QualityScoreWeights>
  /** History size for trend calculation @default 10 */
  historySize?: number
  /** Update interval in ms @default 1000 */
  updateInterval?: number
  /** Enable trend analysis @default true */
  enableTrendAnalysis?: boolean
}

/**
 * Input stats for quality score calculation
 */
export interface QualityScoreInput {
  /** Packet loss percentage (0-100) */
  packetLoss?: number
  /** Jitter in milliseconds */
  jitter?: number
  /** Round-trip time in milliseconds */
  rtt?: number
  /** MOS score (1-5) */
  mos?: number
  /** Current bitrate in kbps */
  bitrate?: number
  /** Previous bitrate for stability calculation */
  previousBitrate?: number
  /** Audio-specific packet loss */
  audioPacketLoss?: number
  /** Audio jitter buffer delay in ms */
  audioJitterBufferDelay?: number
  /** Video packet loss */
  videoPacketLoss?: number
  /** Video framerate */
  framerate?: number
  /** Target framerate */
  targetFramerate?: number
  /** Video resolution width */
  resolutionWidth?: number
  /** Video resolution height */
  resolutionHeight?: number
  /** Number of freeze events */
  freezeCount?: number
  /** Whether this is an audio-only call */
  audioOnly?: boolean
}

/**
 * Return type for useCallQualityScore composable
 */
export interface UseCallQualityScoreReturn {
  /** Current quality score (null if no stats available) */
  score: import('vue').Ref<CallQualityScore | null>
  /** Quality trend (null if insufficient history) */
  trend: import('vue').Ref<QualityTrend | null>
  /** Score history for charting */
  history: import('vue').Ref<CallQualityScore[]>
  /** Update score with new stats */
  updateScore: (input: QualityScoreInput) => void
  /** Clear history and reset */
  reset: () => void
  /** Current weights being used */
  weights: import('vue').Ref<QualityScoreWeights>
}

// =============================================================================
// Network Quality Indicator Types
// =============================================================================

/**
 * Network quality level for visual indicators
 */
export type NetworkQualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unknown'

/**
 * Signal bar count (1-5)
 */
export type SignalBars = 1 | 2 | 3 | 4 | 5

/**
 * Icon name for network quality
 */
export type NetworkQualityIcon =
  | 'signal-excellent'
  | 'signal-good'
  | 'signal-fair'
  | 'signal-poor'
  | 'signal-critical'
  | 'signal-unknown'

/**
 * Detailed network metrics for tooltip display
 */
export interface NetworkDetails {
  /** Round-trip time in ms */
  rtt: number
  /** Jitter in ms */
  jitter: number
  /** Packet loss percentage (0-100) */
  packetLoss: number
  /** Available bandwidth estimate in kbps */
  bandwidth: number
  /** Connection type (relay/srflx/host/prflx) */
  connectionType: string
}

/**
 * Network quality indicator data for UI
 */
export interface NetworkQualityIndicatorData {
  /** Current quality level */
  level: NetworkQualityLevel
  /** Signal strength bars (1-5) */
  bars: SignalBars
  /** Color for UI (CSS color value) */
  color: string
  /** Icon name suggestion */
  icon: NetworkQualityIcon
  /** Accessibility label */
  ariaLabel: string
  /** Detailed metrics for tooltip */
  details: NetworkDetails
}

/**
 * Color scheme for network quality levels
 */
export type NetworkQualityColors = Record<NetworkQualityLevel, string>

/**
 * Default colors for network quality levels
 */
export const DEFAULT_NETWORK_COLORS: NetworkQualityColors = {
  excellent: '#22c55e', // green-500
  good: '#22c55e', // green-500
  fair: '#eab308', // yellow-500
  poor: '#f97316', // orange-500
  critical: '#ef4444', // red-500
  unknown: '#9ca3af', // gray-400
}

/**
 * Thresholds for network quality level determination
 */
export interface NetworkQualityThresholds {
  /** RTT thresholds in ms [excellent, good, fair, poor] */
  rtt: [number, number, number, number]
  /** Packet loss thresholds in % [excellent, good, fair, poor] */
  packetLoss: [number, number, number, number]
  /** Jitter thresholds in ms [excellent, good, fair, poor] */
  jitter: [number, number, number, number]
}

/**
 * Default network quality thresholds
 */
export const DEFAULT_NETWORK_THRESHOLDS: NetworkQualityThresholds = {
  rtt: [50, 100, 200, 400],
  packetLoss: [0.5, 1, 2, 5],
  jitter: [10, 20, 40, 80],
}

/**
 * Options for useNetworkQualityIndicator composable
 */
export interface NetworkQualityIndicatorOptions {
  /** Update interval in ms @default 1000 */
  updateInterval?: number
  /** Custom color scheme */
  colors?: Partial<NetworkQualityColors>
  /** Enable bandwidth estimation @default true */
  estimateBandwidth?: boolean
  /** Custom thresholds */
  thresholds?: Partial<NetworkQualityThresholds>
}

/**
 * Input for network quality indicator
 */
export interface NetworkQualityInput {
  /** Round-trip time in ms */
  rtt?: number
  /** Jitter in ms */
  jitter?: number
  /** Packet loss percentage (0-100) */
  packetLoss?: number
  /** Current bitrate in kbps (for bandwidth estimation) */
  bitrate?: number
  /** Available outgoing bitrate from BWE */
  availableOutgoingBitrate?: number
  /** ICE candidate pair type */
  candidateType?: string
}

/**
 * Return type for useNetworkQualityIndicator composable
 */
export interface UseNetworkQualityIndicatorReturn {
  /** Current indicator data */
  indicator: import('vue').Ref<NetworkQualityIndicatorData>
  /** Whether data is available */
  isAvailable: import('vue').Ref<boolean>
  /** Update indicator with new stats */
  update: (input: NetworkQualityInput) => void
  /** Reset to unknown state */
  reset: () => void
}

// =============================================================================
// Bandwidth Adaptation Types
// =============================================================================

/**
 * Bandwidth adaptation action
 */
export type BandwidthAction = 'upgrade' | 'maintain' | 'downgrade' | 'critical'

/**
 * Priority level for recommendations
 */
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical'

/**
 * Suggestion type for bandwidth adaptation
 */
export type SuggestionType = 'video' | 'audio' | 'network' | 'codec'

/**
 * Specific adaptation suggestion
 */
export interface AdaptationSuggestion {
  /** Type of suggestion */
  type: SuggestionType
  /** Suggestion text for display */
  message: string
  /** Current value description */
  current: string
  /** Recommended value description */
  recommended: string
  /** Impact on quality improvement (0-100) */
  impact: number
}

/**
 * Bandwidth adaptation recommendation
 */
export interface BandwidthRecommendation {
  /** Recommended action */
  action: BandwidthAction
  /** Specific recommendations ordered by impact */
  suggestions: AdaptationSuggestion[]
  /** Priority level */
  priority: RecommendationPriority
  /** Estimated quality improvement if applied (0-100) */
  estimatedImprovement: number
  /** Timestamp of recommendation */
  timestamp: number
}

/**
 * Video resolution preset
 */
export interface VideoResolution {
  width: number
  height: number
  label: string
}

/**
 * Standard video resolutions
 */
export const VIDEO_RESOLUTIONS: VideoResolution[] = [
  { width: 1920, height: 1080, label: '1080p' },
  { width: 1280, height: 720, label: '720p' },
  { width: 854, height: 480, label: '480p' },
  { width: 640, height: 360, label: '360p' },
  { width: 426, height: 240, label: '240p' },
]

/**
 * Bandwidth adaptation constraints
 */
export interface BandwidthConstraints {
  /** Minimum acceptable video bitrate in kbps @default 100 */
  minVideoBitrate?: number
  /** Maximum video bitrate in kbps @default 2500 */
  maxVideoBitrate?: number
  /** Minimum audio bitrate in kbps @default 16 */
  minAudioBitrate?: number
  /** Maximum audio bitrate in kbps @default 128 */
  maxAudioBitrate?: number
  /** Target framerate @default 30 */
  targetFramerate?: number
  /** Minimum acceptable framerate @default 15 */
  minFramerate?: number
  /** Minimum acceptable resolution */
  minResolution?: VideoResolution
  /** Preferred resolution */
  preferredResolution?: VideoResolution
}

/**
 * Default bandwidth constraints
 */
export const DEFAULT_BANDWIDTH_CONSTRAINTS: Required<BandwidthConstraints> = {
  minVideoBitrate: 100,
  maxVideoBitrate: 2500,
  minAudioBitrate: 16,
  maxAudioBitrate: 128,
  targetFramerate: 30,
  minFramerate: 15,
  minResolution: { width: 426, height: 240, label: '240p' },
  preferredResolution: { width: 1280, height: 720, label: '720p' },
}

/**
 * Options for useBandwidthAdaptation composable
 */
export interface BandwidthAdaptationOptions {
  /** Constraints for adaptation */
  constraints?: BandwidthConstraints
  /** Adaptation sensitivity (0-1, higher = more reactive) @default 0.5 */
  sensitivity?: number
  /** Enable automatic adaptation (vs recommendation only) @default false */
  autoAdapt?: boolean
  /** Callback when recommendation changes */
  onRecommendation?: (rec: BandwidthRecommendation) => void
  /** History size for smoothing @default 5 */
  historySize?: number
}

/**
 * Input for bandwidth adaptation
 */
export interface BandwidthAdaptationInput {
  /** Available outgoing bitrate in kbps */
  availableBitrate?: number
  /** Current send bitrate in kbps */
  currentBitrate?: number
  /** Packet loss percentage */
  packetLoss?: number
  /** Round-trip time in ms */
  rtt?: number
  /** Current video resolution */
  currentResolution?: VideoResolution
  /** Current framerate */
  currentFramerate?: number
  /** Current audio bitrate */
  currentAudioBitrate?: number
  /** Whether video is enabled */
  videoEnabled?: boolean
  /** Number of recent quality degradation events */
  degradationEvents?: number
}

/**
 * Return type for useBandwidthAdaptation composable
 */
export interface UseBandwidthAdaptationReturn {
  /** Current recommendation */
  recommendation: import('vue').Ref<BandwidthRecommendation>
  /** Whether auto-adaptation is enabled */
  isAutoAdapting: import('vue').Ref<boolean>
  /** Current constraints */
  constraints: import('vue').Ref<Required<BandwidthConstraints>>
  /** Update with new stats */
  update: (input: BandwidthAdaptationInput) => void
  /** Enable/disable auto-adaptation */
  setAutoAdapt: (enabled: boolean) => void
  /** Update constraints */
  setConstraints: (constraints: Partial<BandwidthConstraints>) => void
  /** Reset to defaults */
  reset: () => void
  /** Apply a specific suggestion manually */
  applySuggestion: (suggestion: AdaptationSuggestion) => void
}
