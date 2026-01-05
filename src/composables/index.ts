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

// SIP composables
export { useSipWebRTCStats } from './useSipWebRTCStats'
export { useSipAutoAnswer } from './useSipAutoAnswer'
export { useSipE911 } from './useSipE911'
export { useSipSecondLine } from './useSipSecondLine'
// useSipConnection requires sip.js library - not exported until dual-library support is added
export { useSipDtmf } from './useSipDtmf'

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

// Re-export types needed by demos
export type { CallbackPriority, CallbackRequest } from '../types/callback.types'
export type { BlockReason, BlockAction, BlockEntry } from '../types/blacklist.types'

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
