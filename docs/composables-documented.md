# Documented composables (source of truth for check-exports)

This file lists composable names that are documented in the README and docs.
One composable per line; lines starting with `#` are ignored.
Used by `scripts/check-exports.ts` for export parity checks.

## SIP Core

useSipClient
useCallSession
useCallControls
useSipRegistration

## Call Features

useDTMF
useCallTransfer
useCallHold
useMultiLine
useConference
useSipAutoAnswer
useSipSecondLine

## Media & Devices

useMediaDevices
useAudioDevices
usePictureInPicture
useVideoInset
useGalleryLayout
useActiveSpeaker
useLocalRecording
useBandwidthAdaptation

## Call Quality

useCallQualityScore
useNetworkQualityIndicator
useSipWebRTCStats
useConnectionRecovery

## Call Center (AMI)

useAmi
useAmiAgentLogin
useAmiAgentStats
useAmiQueues
useAmiSupervisor
useAmiCDR
useAmiCalls
useAmiRecording
useAmiVoicemail
useAmiParking
useAmiPaging

## Communication

usePresence
useMessaging
useFreePBXPresence

## Persistence & Settings

useSessionPersistence
useSettingsPersistence
useCallHistory
useSettings

## Advanced

useOAuth2
useSipE911
useRecordingIndicator
useDialog
useParticipantControls

## Preview / Experimental

useCodecs
