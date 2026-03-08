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

## PBX recording (usePbxRecordings)

usePbxRecordings

## PBX recording types (for usePbxRecordings / adapters)

Types and interface for PBX recording retrieval (adapter-agnostic):

- **RecordingSummary** – One row in a list: id, startTime, duration, callerId, callee, direction, channelOrLabel, callUniqueId, metadata. Exported from `src/types` (pbx-recording.types).
- **RecordingPlaybackInfo** – Playback URL/stream, format, expiresAt, requiresAuth. Returned by provider.getPlaybackInfo(recordingId).
- **PbxRecordingProvider** – Interface: capabilities (listRecordings, getPlaybackInfo, downloadRecording, supportsDateFilter, supportsSearch, supportsDirectionFilter, maxPageSize), listRecordings(query), getPlaybackInfo(recordingId).
- **PbxRecordingListQuery** – List options: dateFrom, dateTo, direction, searchQuery, sortBy, sortOrder, limit, offset.
- **PbxRecordingListResult** – items (RecordingSummary[]), totalCount, hasMore.
- **PbxRecordingProviderCapabilities** – Booleans/options describing what the adapter supports.
- **PbxPlaybackErrorCode** – Stable codes: unauthorized, expired, not_found, network, unknown.
- **PbxPlaybackError** – recordingId, code, message (optional). usePbxRecordings sets playbackError ref for UI.

**Adapters:** FreePBX – `createFreePbxRecordingProvider(config)` in `src/pbx-adapters/freepbx.ts` (exported from `vuesip`). Config: `baseUrl`, optional `fetch`, optional `getAuthHeaders`. List via GraphQL `fetchAllCdrs`; playback URL: `config.php?display=cdr&action=download_audio&cdr_file=<uniqueid>`. Auth: same-origin session (cookies) or backend proxy / token; see module JSDoc and [Recordings retrieval from PBX](/guide/recordings-retrieval-pbx).

## Preview / Experimental

useCodecs
