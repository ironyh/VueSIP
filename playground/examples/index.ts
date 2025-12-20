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
import { customRingtonesExample } from './custom-ringtones'
import { callRecordingExample } from './call-recording'
import { conferenceCallExample } from './conference-call'
import { callMutePatternsExample } from './call-mute-patterns'
import { networkSimulatorExample } from './network-simulator'
import { screenSharingExample } from './screen-sharing'
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
import type { ExampleCategory } from './types'

// SIP Features - Core WebRTC/SIP functionality
export const sipExamples = [
  basicCallExample,
  videoCallExample,
  dtmfExample,
  audioDevicesExample,
  callTransferExample,
  callWaitingExample,
  conferenceCallExample,
  callTimerExample,
  callRecordingExample,
  screenSharingExample,
  sipMessagingExample,
  presenceExample,
  multiLineExample,
  callQualityExample,
  webrtcStatsExample,
  callMutePatternsExample,
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
  clickToCallExample,
  e911Example,
  toolbarLayoutsExample,
  networkSimulatorExample,
]

// All examples (flat list for backward compatibility)
export const allExamples = [
  ...sipExamples,
  ...amiExamples,
  ...utilityExamples,
]

// Category metadata - icons are SVG path data for inline rendering
export const categoryInfo: Record<ExampleCategory, { label: string; icon: string; description: string; tooltip: string }> = {
  sip: {
    label: 'SIP',
    icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    description: 'Core WebRTC and SIP calling functionality',
    tooltip: 'Direct WebRTC/SIP features that work with any SIP server',
  },
  ami: {
    label: 'AMI',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    description: 'Asterisk Manager Interface and PBX features',
    tooltip: 'Requires AMI WebSocket connection to Asterisk/FreePBX for queue management, voicemail, parking, user provisioning and more',
  },
  utility: {
    label: 'Tools',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
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
