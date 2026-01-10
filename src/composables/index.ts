/**
 * Composables Entry Point
 *
 * Exports all Vue composables for VueSip library.
 *
 * @module composables
 */

// Core composables
export { useSipClient, type UseSipClientReturn } from './useSipClient'
export {
  useSipRegistration,
  type UseSipRegistrationReturn,
  type RegistrationOptions,
} from './useSipRegistration'
export {
  useCallSession,
  type UseCallSessionReturn,
  type CallSessionOptions,
} from './useCallSession'
export type { CallSessionPiPOptions } from './types'
export {
  useMediaDevices,
  type UseMediaDevicesReturn,
  type DeviceTestOptions,
} from './useMediaDevices'
export {
  useDTMF,
  type UseDTMFReturn,
  type DTMFSequenceOptions,
  type DTMFSendResult,
} from './useDTMF'

// Advanced composables
export { useCallHistory, type UseCallHistoryReturn } from './useCallHistory'
export { useCallControls, type UseCallControlsReturn, type ActiveTransfer } from './useCallControls'
export { usePresence, type UsePresenceReturn } from './usePresence'
export { useMessaging, type UseMessagingReturn, type Conversation } from './useMessaging'
export { useConference, type UseConferenceReturn } from './useConference'
export { useParticipantControls } from './useParticipantControls'
export { useActiveSpeaker } from './useActiveSpeaker'
export { useGalleryLayout } from './useGalleryLayout'
export { useAmiVoicemail, type UseAmiVoicemailReturn } from './useAmiVoicemail'
export { useAmiParking, type UseAmiParkingReturn } from './useAmiParking'
export { useAmiCallback } from './useAmiCallback'
export { useAmiCDR } from './useAmiCDR'
export { useAmiAgentStats } from './useAmiAgentStats'
export { useAmiAgentLogin } from './useAmiAgentLogin'
export { useAmiSupervisor, type UseAmiSupervisorReturn } from './useAmiSupervisor'
export { useAmiQueues, type UseAmiQueuesReturn } from './useAmiQueues'
export { useAmiRingGroups } from './useAmiRingGroups'
export { useAmiIVR } from './useAmiIVR'
export { useAmiRecording } from './useAmiRecording'
export { useAmiTimeConditions } from './useAmiTimeConditions'
export { useAmiFeatureCodes } from './useAmiFeatureCodes'
export { useAmiPaging } from './useAmiPaging'
export { useAmiBlacklist } from './useAmiBlacklist'
export { useAmiPeers, type UseAmiPeersReturn } from './useAmiPeers'
export { useAmiCalls, type UseAmiCallsReturn } from './useAmiCalls'
export { useAmiDatabase, type UseAmiDatabaseReturn } from './useAmiDatabase'
export { useAmi, type UseAmiReturn } from './useAmi'
export { useAmiConfBridge, type UseAmiConfBridgeReturn } from './useAmiConfBridge'
export { useAmiPjsip, type UseAmiPjsipReturn } from './useAmiPjsip'

// SIP composables
export { useSipWebRTCStats } from './useSipWebRTCStats'
export { useSipAutoAnswer } from './useSipAutoAnswer'
export { useSipE911 } from './useSipE911'
export { useSipSecondLine } from './useSipSecondLine'
// useSipConnection requires sip.js library - not exported until dual-library support is added
export { useSipDtmf } from './useSipDtmf'

// Call quality composables
export { useCallQualityScore } from './useCallQualityScore'
export { useNetworkQualityIndicator } from './useNetworkQualityIndicator'
export { useBandwidthAdaptation } from './useBandwidthAdaptation'
export { useConnectionRecovery } from './useConnectionRecovery'
export { useSessionPersistence } from './useSessionPersistence'

// Additional composables
export { useCallHold } from './useCallHold'
export { useCallTransfer } from './useCallTransfer'
export { useAudioDevices } from './useAudioDevices'
export { useMultiLine } from './useMultiLine'
export { useDialog } from './useDialog'
export { useFreePBXPresence } from './useFreePBXPresence'
export {
  usePictureInPicture,
  type PictureInPictureOptions,
  type PiPWindowDimensions,
  type UsePictureInPictureReturn,
} from './usePictureInPicture'
export {
  useVideoInset,
  type VideoInsetOptions,
  type InsetPosition,
  type InsetSize,
  type InsetDimensions,
  type UseVideoInsetReturn,
} from './useVideoInset'

// OAuth2 composable
export {
  useOAuth2,
  createGoogleOAuth2Config,
  createMicrosoftOAuth2Config,
  createGitHubOAuth2Config,
  createOktaOAuth2Config,
  createAuth0OAuth2Config,
  createKeycloakOAuth2Config,
  generatePKCE,
  generateState,
  type UseOAuth2Options,
  type UseOAuth2ComposableReturn,
} from './useOAuth2'

// Transcription composable
export { useTranscription } from './useTranscription'
export type {
  TranscriptionOptions,
  UseTranscriptionReturn,
  TranscriptionState,
  TranscriptEntry,
  KeywordRule,
  KeywordMatch,
  ExportFormat,
  ExportOptions,
  ProviderCapabilities,
} from '../types/transcription.types'

// Local recording composable
export { useLocalRecording } from './useLocalRecording'
export type {
  LocalRecordingOptions,
  LocalRecordingData,
  UseLocalRecordingReturn,
} from '../types/local-recording.types'

// Recording indicator composable
export { useRecordingIndicator } from './useRecordingIndicator'
export type {
  RecordingIndicatorState,
  RecordingIndicatorColors,
  RecordingIndicatorOptions,
  UseRecordingIndicatorReturn,
} from '../types/recording-indicator.types'

// Re-export types needed by demos
export type { CallbackPriority, CallbackRequest } from '../types/callback.types'
export type { BlockReason, BlockAction, BlockEntry } from '../types/blacklist.types'

// Active speaker types
export type {
  ActiveSpeakerOptions,
  SpeakerHistoryEntry,
  UseActiveSpeakerReturn,
} from '../types/active-speaker.types'

// Gallery layout types
export type {
  GalleryLayoutMode,
  ContainerSize,
  TileDimensions,
  GalleryLayoutOptions,
  UseGalleryLayoutReturn,
} from '../types/gallery-layout.types'

// Participant controls types
export type {
  ParticipantControlsOptions,
  UseParticipantControlsReturn,
} from '../types/participant-controls.types'

// Connection recovery types
export type {
  RecoveryState,
  RecoveryStrategy,
  IceHealthStatus,
  RecoveryAttempt,
  ConnectionRecoveryOptions,
  UseConnectionRecoveryReturn,
} from '../types/connection-recovery.types'

// Session persistence types
export type {
  PersistedSessionState,
  SessionPersistenceOptions,
  SavedSessionInfo,
  UseSessionPersistenceReturn,
} from '../types/session-persistence.types'

// Call quality types
export type {
  // Quality score types
  QualityGrade,
  CallQualityScore,
  QualityScoreWeights,
  QualityTrendDirection,
  QualityTrend,
  CallQualityScoreOptions,
  QualityScoreInput,
  UseCallQualityScoreReturn,
  // Network quality types
  NetworkQualityLevel,
  SignalBars,
  NetworkQualityIcon,
  NetworkDetails,
  NetworkQualityIndicatorData,
  NetworkQualityColors,
  NetworkQualityThresholds,
  NetworkQualityIndicatorOptions,
  NetworkQualityInput,
  UseNetworkQualityIndicatorReturn,
  // Bandwidth adaptation types
  BandwidthAction,
  RecommendationPriority,
  SuggestionType,
  AdaptationSuggestion,
  BandwidthRecommendation,
  VideoResolution,
  BandwidthConstraints,
  BandwidthAdaptationOptions,
  BandwidthAdaptationInput,
  UseBandwidthAdaptationReturn,
} from '../types/call-quality.types'

export {
  // Call quality constants
  DEFAULT_QUALITY_WEIGHTS,
  DEFAULT_NETWORK_COLORS,
  DEFAULT_NETWORK_THRESHOLDS,
  DEFAULT_BANDWIDTH_CONSTRAINTS,
  VIDEO_RESOLUTIONS,
} from '../types/call-quality.types'

// Constants
export {
  REGISTRATION_CONSTANTS,
  PRESENCE_CONSTANTS,
  MESSAGING_CONSTANTS,
  CONFERENCE_CONSTANTS,
  TRANSFER_CONSTANTS,
  HISTORY_CONSTANTS,
  CALL_CONSTANTS,
  MEDIA_CONSTANTS,
  DTMF_CONSTANTS,
  TIMEOUTS,
  RETRY_CONFIG,
} from './constants'
