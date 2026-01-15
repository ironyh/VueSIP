import { basicCallExample } from './basic-call'
import { dtmfExample } from './dtmf'
import { audioDevicesExample } from './audio-devices'
import { callHistoryExample } from './call-history'
import { callTransferExample } from './call-transfer'
import { videoCallExample } from './video-call'
import { callTimerExample } from './call-timer'
import { speedDialExample } from './speed-dial'
import { doNotDisturbExample } from './do-not-disturb'
import { callQualityExample } from './call-quality'
import { callQualityDashboardExample } from './call-quality-dashboard'
import { customRingtonesExample } from './custom-ringtones'
import { callRecordingExample } from './call-recording'
import { recordingIndicatorExample } from './recording-indicator'
import { conferenceCallExample } from './conference-call'
import { conferenceGalleryExample } from './conference-gallery'
import { callMutePatternsExample } from './call-mute-patterns'
import { connectionRecoveryExample } from './connection-recovery'
import { sessionPersistenceExample } from './session-persistence'
import { networkSimulatorExample } from './network-simulator'
import { screenSharingExample } from './screen-sharing'
import { transcriptionExample } from './transcription'
import { pictureInPictureExample } from './picture-in-picture'
import { clickToCallWidgetExample } from './click-to-call-widget'
import { callWaitingExample } from './call-waiting'
import { sipMessagingExample } from './sip-messaging'
import { presenceExample } from './presence'
import { toolbarLayoutsExample } from './toolbar-layouts'
import { settingsExample } from './settings'
import { voicemailExample } from './voicemail'
import { parkingExample } from './parking'
import { multiLineExample } from './multi-line'
import { blfExample } from './blf'
import { autoAnswerExample } from './auto-answer'
import { callbackExample } from './callback'
import { timeConditionsExample } from './time-conditions'
import { blacklistExample } from './blacklist'
import { webrtcStatsExample } from './webrtc-stats'
import { pagingExample } from './paging'
import { agentStatsExample } from './agent-stats'
import { agentLoginExample } from './agent-login'
import { cdrDashboardExample } from './cdr-dashboard'
import { ringGroupsExample } from './ring-groups'
import { featureCodesExample } from './feature-codes'
import { e911Example } from './e911'
import { recordingManagementExample } from './recording-management'
import { ivrMonitorExample } from './ivr-monitor'
import { supervisorExample } from './supervisor'
import { clickToCallExample } from './click-to-call'
import { queueMonitorExample } from './queue-monitor'
import { contactsExample } from './contacts'
import { userManagementExample } from './user-management'
import { confBridgeExample } from './confbridge'
import { pjsipExample } from './pjsip'
import { systemHealthExample } from './system-health'
import { mwiExample } from './mwi'
import type { ExampleCategory } from './types'

// SIP Features - Core WebRTC/SIP functionality
export const sipExamples = [
  basicCallExample,
  videoCallExample,
  clickToCallWidgetExample,
  dtmfExample,
  audioDevicesExample,
  callTransferExample,
  callWaitingExample,
  conferenceCallExample,
  conferenceGalleryExample,
  callTimerExample,
  callRecordingExample,
  recordingIndicatorExample,
  screenSharingExample,
  pictureInPictureExample,
  callSessionPiPExample,
  sipMessagingExample,
  presenceExample,
  multiLineExample,
  callQualityExample,
  webrtcStatsExample,
  callQualityDashboardExample,
  connectionRecoveryExample,
  sessionPersistenceExample,
  callMutePatternsExample,
  transcriptionExample,
]

// AMI Features - Asterisk Manager Interface / PBX functionality
export const amiExamples = [
  userManagementExample,
  voicemailExample,
  parkingExample,
  blfExample,
  pagingExample,
  queueMonitorExample,
  agentStatsExample,
  agentLoginExample,
  supervisorExample,
  cdrDashboardExample,
  ringGroupsExample,
  ivrMonitorExample,
  recordingManagementExample,
  timeConditionsExample,
  featureCodesExample,
  callbackExample,
  clickToCallExample,
  confBridgeExample,
  pjsipExample,
  systemHealthExample,
  mwiExample,
]

// Utility Features - Settings, helpers, and tools
export const utilityExamples = [
  settingsExample,
  callHistoryExample,
  speedDialExample,
  contactsExample,
  doNotDisturbExample,
  autoAnswerExample,
  customRingtonesExample,
  blacklistExample,
  e911Example,
  toolbarLayoutsExample,
  networkSimulatorExample,
]

// All examples (flat list for backward compatibility)
export const allExamples = [...sipExamples, ...amiExamples, ...utilityExamples]

// Category metadata
export const categoryInfo: Record<
  ExampleCategory,
  { label: string; icon: string; description: string; tooltip: string }
> = {
  sip: {
    label: 'SIP Features',
    icon: '📞',
    description: 'Core WebRTC and SIP calling functionality',
    tooltip: 'Direct WebRTC/SIP features that work with any SIP server',
  },
  ami: {
    label: 'AMI Features',
    icon: '🏢',
    description: 'Asterisk Manager Interface and PBX features',
    tooltip:
      'Requires AMI WebSocket connection to Asterisk/FreePBX for queue management, voicemail, parking, user provisioning and more',
  },
  utility: {
    label: 'Utilities',
    icon: '🔧',
    description: 'Settings, tools, and helper features',
    tooltip: 'Configuration, contacts, speed dial, and helper utilities',
  },
}

// Grouped examples by category
export const examplesByCategory = {
  sip: sipExamples,
  ami: amiExamples,
  utility: utilityExamples,
}

export type { ExampleDefinition, CodeSnippet, ExampleCategory } from './types'
