# Composables API Reference

Complete reference for all VueSip composables providing reactive SIP functionality.

## Table of Contents

- [Core Composables](#core-composables)
  - [useSipClient](#usesipclient)
  - [useSipRegistration](#usesipregistration)
  - [useCallSession](#usecallsession)
  - [useMediaDevices](#usemediadevices)
  - [useDTMF](#usedtmf)
- [Advanced Composables](#advanced-composables)
  - [useCallHistory](#usecallhistory)
  - [useCallControls](#usecallcontrols)
  - [usePresence](#usepresence)
  - [useMessaging](#usemessaging)
  - [useConference](#useconference)
- [Video Enhancement Composables](#video-enhancement-composables)
  - [usePictureInPicture](#usepictureinpicture)
  - [useVideoInset](#usevideoinset)
- [Connection Recovery Composables](#connection-recovery-composables)
  - [useConnectionRecovery](#useconnectionrecovery)
- [Conference Enhancement Composables](#conference-enhancement-composables)
  - [useActiveSpeaker](#useactivespeaker)
  - [useGalleryLayout](#usegallerylayout)
  - [useParticipantControls](#useparticipantcontrols)
- [Call Quality Composables](#call-quality-composables)
  - [useCallQualityScore](#usecallqualityscore)
  - [useNetworkQualityIndicator](#usenetworkqualityindicator)
- [Constants](#constants)

---

## Core Composables

### useSipClient

Provides a Vue composable interface for managing SIP client connections, registration, and configuration with reactive state management.

**Source:** [`src/composables/useSipClient.ts`](../../src/composables/useSipClient.ts)

#### Signature

```typescript
function useSipClient(
  initialConfig?: SipClientConfig,
  options?: {
    eventBus?: EventBus
    autoConnect?: boolean
    autoCleanup?: boolean
    reconnectDelay?: number
    connectionTimeout?: number
  }
): UseSipClientReturn
```

#### Parameters

| Parameter                   | Type              | Default      | Description                               |
| --------------------------- | ----------------- | ------------ | ----------------------------------------- |
| `initialConfig`             | `SipClientConfig` | `undefined`  | Optional initial SIP client configuration |
| `options.eventBus`          | `EventBus`        | new instance | Shared event bus instance                 |
| `options.autoConnect`       | `boolean`         | `false`      | Auto-connect on mount                     |
| `options.autoCleanup`       | `boolean`         | `true`       | Auto-cleanup on unmount                   |
| `options.reconnectDelay`    | `number`          | `1000`       | Reconnect delay in milliseconds           |
| `options.connectionTimeout` | `number`          | `30000`      | Connection timeout in milliseconds        |

#### Returns: `UseSipClientReturn`

##### Reactive State

| Property            | Type                             | Description                                  |
| ------------------- | -------------------------------- | -------------------------------------------- |
| `isConnected`       | `ComputedRef<boolean>`           | Whether client is connected to SIP server    |
| `isRegistered`      | `ComputedRef<boolean>`           | Whether client is registered with SIP server |
| `connectionState`   | `ComputedRef<ConnectionState>`   | Current connection state                     |
| `registrationState` | `ComputedRef<RegistrationState>` | Current registration state                   |
| `registeredUri`     | `ComputedRef<string \| null>`    | Registered SIP URI                           |
| `error`             | `Ref<Error \| null>`             | Current error message                        |
| `isConnecting`      | `ComputedRef<boolean>`           | Whether client is connecting                 |
| `isDisconnecting`   | `Ref<boolean>`                   | Whether client is disconnecting              |
| `isStarted`         | `ComputedRef<boolean>`           | Whether client is started                    |

##### Methods

| Method         | Signature                                                | Description                                    |
| -------------- | -------------------------------------------------------- | ---------------------------------------------- |
| `connect`      | `() => Promise<void>`                                    | Start the SIP client and connect to server     |
| `disconnect`   | `() => Promise<void>`                                    | Disconnect from SIP server and stop the client |
| `register`     | `() => Promise<void>`                                    | Register with SIP server                       |
| `unregister`   | `() => Promise<void>`                                    | Unregister from SIP server                     |
| `updateConfig` | `(config: Partial<SipClientConfig>) => ValidationResult` | Update SIP client configuration                |
| `reconnect`    | `() => Promise<void>`                                    | Reconnect to SIP server                        |
| `getClient`    | `() => SipClient \| null`                                | Get the underlying SIP client instance         |
| `getEventBus`  | `() => EventBus`                                         | Get the event bus instance                     |

#### Usage Example

```typescript
import { useSipClient } from '@/composables/useSipClient'

const { isConnected, isRegistered, connect, disconnect, register } = useSipClient(
  {
    uri: 'sip:alice@domain.com',
    password: 'secret',
    wsServers: ['wss://sip.domain.com:7443'],
  },
  {
    autoConnect: true,
    autoCleanup: true,
  }
)

// Connect and register
await connect()
await register()

// Check status
if (isConnected.value && isRegistered.value) {
  console.log('Ready to make calls')
}
```

---

### useSipRegistration

Provides reactive SIP registration state management with automatic refresh, retry logic, and expiry tracking.

**Source:** [`src/composables/useSipRegistration.ts`](../../src/composables/useSipRegistration.ts)

#### Signature

```typescript
function useSipRegistration(
  sipClient: Ref<SipClient | null>,
  options?: RegistrationOptions
): UseSipRegistrationReturn
```

#### Parameters

| Parameter             | Type                     | Default     | Description                                    |
| --------------------- | ------------------------ | ----------- | ---------------------------------------------- |
| `sipClient`           | `Ref<SipClient \| null>` | -           | SIP client instance                            |
| `options.expires`     | `number`                 | `600`       | Registration expiry time in seconds            |
| `options.maxRetries`  | `number`                 | `3`         | Maximum retry attempts before giving up        |
| `options.autoRefresh` | `boolean`                | `true`      | Enable automatic re-registration before expiry |
| `options.userAgent`   | `string`                 | `undefined` | Custom User-Agent header                       |

#### Returns: `UseSipRegistrationReturn`

##### Reactive State

| Property                | Type                     | Description                                                    |
| ----------------------- | ------------------------ | -------------------------------------------------------------- |
| `state`                 | `Ref<RegistrationState>` | Current registration state                                     |
| `registeredUri`         | `Ref<string \| null>`    | Registered SIP URI                                             |
| `isRegistered`          | `ComputedRef<boolean>`   | Whether currently registered                                   |
| `isRegistering`         | `ComputedRef<boolean>`   | Whether registration is in progress                            |
| `isUnregistering`       | `ComputedRef<boolean>`   | Whether unregistration is in progress                          |
| `hasRegistrationFailed` | `ComputedRef<boolean>`   | Whether registration has failed                                |
| `expires`               | `Ref<number>`            | Registration expiry time in seconds                            |
| `lastRegistrationTime`  | `Ref<Date \| null>`      | Timestamp when registration was last successful                |
| `expiryTime`            | `Ref<Date \| null>`      | Timestamp when registration will expire                        |
| `secondsUntilExpiry`    | `ComputedRef<number>`    | Seconds remaining until registration expires                   |
| `isExpiringSoon`        | `ComputedRef<boolean>`   | Whether registration is about to expire (less than 30 seconds) |
| `hasExpired`            | `ComputedRef<boolean>`   | Whether registration has expired                               |
| `retryCount`            | `Ref<number>`            | Number of registration retry attempts                          |
| `lastError`             | `Ref<string \| null>`    | Last registration error message                                |

##### Methods

| Method          | Signature                      | Description                   |
| --------------- | ------------------------------ | ----------------------------- |
| `register`      | `() => Promise<void>`          | Register with SIP server      |
| `unregister`    | `() => Promise<void>`          | Unregister from SIP server    |
| `refresh`       | `() => Promise<void>`          | Manually refresh registration |
| `resetRetries`  | `() => void`                   | Reset retry count             |
| `getStatistics` | `() => RegistrationStatistics` | Get registration statistics   |

#### Usage Example

```typescript
import { useSipRegistration } from '@/composables/useSipRegistration'

const { isRegistered, register, unregister, secondsUntilExpiry } = useSipRegistration(sipClient, {
  expires: 600,
  maxRetries: 3,
  autoRefresh: true,
})

// Register
await register()

// Check status
if (isRegistered.value) {
  console.log(`Registered, expires in ${secondsUntilExpiry.value}s`)
}

// Unregister
await unregister()
```

---

### useCallSession

Provides reactive call session management with support for outgoing/incoming calls, call controls (hold, mute, DTMF), media streams, and call statistics.

**Source:** [`src/composables/useCallSession.ts`](../../src/composables/useCallSession.ts)

#### Signature

```typescript
function useCallSession(
  sipClient: Ref<SipClient | null>,
  mediaManager?: Ref<MediaManager | null>
): UseCallSessionReturn
```

#### Parameters

| Parameter      | Type                        | Description                     |
| -------------- | --------------------------- | ------------------------------- |
| `sipClient`    | `Ref<SipClient \| null>`    | SIP client instance             |
| `mediaManager` | `Ref<MediaManager \| null>` | Optional media manager instance |

#### Returns: `UseCallSessionReturn`

##### Reactive State

| Property            | Type                                         | Description                          |
| ------------------- | -------------------------------------------- | ------------------------------------ |
| `session`           | `Ref<CallSession \| null>`                   | Active call session                  |
| `state`             | `ComputedRef<CallState>`                     | Call state                           |
| `callId`            | `ComputedRef<string \| null>`                | Call ID                              |
| `direction`         | `ComputedRef<CallDirection \| null>`         | Call direction (incoming/outgoing)   |
| `localUri`          | `ComputedRef<string \| null>`                | Local SIP URI                        |
| `remoteUri`         | `ComputedRef<string \| null>`                | Remote SIP URI                       |
| `remoteDisplayName` | `ComputedRef<string \| null>`                | Remote display name                  |
| `isActive`          | `ComputedRef<boolean>`                       | Is call active                       |
| `isOnHold`          | `ComputedRef<boolean>`                       | Is on hold                           |
| `isMuted`           | `ComputedRef<boolean>`                       | Is muted                             |
| `hasRemoteVideo`    | `ComputedRef<boolean>`                       | Has remote video                     |
| `hasLocalVideo`     | `ComputedRef<boolean>`                       | Has local video                      |
| `localStream`       | `ComputedRef<MediaStream \| null>`           | Local media stream                   |
| `remoteStream`      | `ComputedRef<MediaStream \| null>`           | Remote media stream                  |
| `timing`            | `ComputedRef<CallTimingInfo>`                | Call timing information              |
| `duration`          | `ComputedRef<number>`                        | Call duration in seconds (if active) |
| `terminationCause`  | `ComputedRef<TerminationCause \| undefined>` | Termination cause (if ended)         |

##### Methods

| Method         | Signature                                                         | Description             |
| -------------- | ----------------------------------------------------------------- | ----------------------- |
| `makeCall`     | `(target: string, options?: CallSessionOptions) => Promise<void>` | Make an outgoing call   |
| `answer`       | `(options?: AnswerOptions) => Promise<void>`                      | Answer an incoming call |
| `reject`       | `(statusCode?: number) => Promise<void>`                          | Reject an incoming call |
| `hangup`       | `() => Promise<void>`                                             | Hangup the call         |
| `hold`         | `() => Promise<void>`                                             | Put call on hold        |
| `unhold`       | `() => Promise<void>`                                             | Resume call from hold   |
| `toggleHold`   | `() => Promise<void>`                                             | Toggle hold state       |
| `mute`         | `() => void`                                                      | Mute audio              |
| `unmute`       | `() => void`                                                      | Unmute audio            |
| `toggleMute`   | `() => void`                                                      | Toggle mute state       |
| `sendDTMF`     | `(tone: string, options?: DTMFOptions) => Promise<void>`          | Send DTMF tone          |
| `getStats`     | `() => Promise<CallStatistics \| null>`                           | Get call statistics     |
| `clearSession` | `() => void`                                                      | Clear current session   |

#### Usage Example

```typescript
import { useCallSession } from '@/composables/useCallSession'

const { state, makeCall, answer, hangup, hold, mute, sendDTMF } = useCallSession(
  sipClient,
  mediaManager
)

// Make a call
await makeCall('sip:bob@domain.com', { audio: true, video: false })

// Answer incoming call
await answer()

// Put on hold
await hold()

// Mute
mute()

// Send DTMF
await sendDTMF('1')

// Hangup
await hangup()
```

---

### useMediaDevices

Provides reactive media device management with device enumeration, selection, permission handling, and device testing capabilities.

**Source:** [`src/composables/useMediaDevices.ts`](../../src/composables/useMediaDevices.ts)

#### Signature

```typescript
function useMediaDevices(
  mediaManager?: Ref<MediaManager | null>,
  options?: {
    autoEnumerate?: boolean
    autoMonitor?: boolean
  }
): UseMediaDevicesReturn
```

#### Parameters

| Parameter               | Type                        | Default     | Description                     |
| ----------------------- | --------------------------- | ----------- | ------------------------------- |
| `mediaManager`          | `Ref<MediaManager \| null>` | `undefined` | Optional media manager instance |
| `options.autoEnumerate` | `boolean`                   | `true`      | Auto-enumerate devices on mount |
| `options.autoMonitor`   | `boolean`                   | `true`      | Auto-monitor device changes     |

#### Returns: `UseMediaDevicesReturn`

##### Reactive State

| Property                    | Type                                    | Description                     |
| --------------------------- | --------------------------------------- | ------------------------------- |
| `audioInputDevices`         | `ComputedRef<readonly MediaDevice[]>`   | Audio input devices             |
| `audioOutputDevices`        | `ComputedRef<readonly MediaDevice[]>`   | Audio output devices            |
| `videoInputDevices`         | `ComputedRef<readonly MediaDevice[]>`   | Video input devices             |
| `allDevices`                | `ComputedRef<readonly MediaDevice[]>`   | All devices                     |
| `selectedAudioInputId`      | `Ref<string \| null>`                   | Selected audio input device ID  |
| `selectedAudioOutputId`     | `Ref<string \| null>`                   | Selected audio output device ID |
| `selectedVideoInputId`      | `Ref<string \| null>`                   | Selected video input device ID  |
| `selectedAudioInputDevice`  | `ComputedRef<MediaDevice \| undefined>` | Selected audio input device     |
| `selectedAudioOutputDevice` | `ComputedRef<MediaDevice \| undefined>` | Selected audio output device    |
| `selectedVideoInputDevice`  | `ComputedRef<MediaDevice \| undefined>` | Selected video input device     |
| `audioPermission`           | `ComputedRef<PermissionStatus>`         | Audio permission status         |
| `videoPermission`           | `ComputedRef<PermissionStatus>`         | Video permission status         |
| `hasAudioPermission`        | `ComputedRef<boolean>`                  | Has audio permission            |
| `hasVideoPermission`        | `ComputedRef<boolean>`                  | Has video permission            |
| `hasAudioInputDevices`      | `ComputedRef<boolean>`                  | Has audio input devices         |
| `hasAudioOutputDevices`     | `ComputedRef<boolean>`                  | Has audio output devices        |
| `hasVideoInputDevices`      | `ComputedRef<boolean>`                  | Has video input devices         |
| `totalDevices`              | `ComputedRef<number>`                   | Total device count              |
| `isEnumerating`             | `Ref<boolean>`                          | Is enumerating devices          |
| `lastError`                 | `Ref<Error \| null>`                    | Last error                      |

##### Methods

| Method                        | Signature                                                              | Description                    |
| ----------------------------- | ---------------------------------------------------------------------- | ------------------------------ |
| `enumerateDevices`            | `() => Promise<MediaDevice[]>`                                         | Enumerate all media devices    |
| `requestAudioPermission`      | `() => Promise<boolean>`                                               | Request audio permission       |
| `requestVideoPermission`      | `() => Promise<boolean>`                                               | Request video permission       |
| `requestPermissions`          | `(audio?: boolean, video?: boolean) => Promise<void>`                  | Request permissions            |
| `selectAudioInput`            | `(deviceId: string) => void`                                           | Select audio input device      |
| `selectAudioOutput`           | `(deviceId: string) => void`                                           | Select audio output device     |
| `selectVideoInput`            | `(deviceId: string) => void`                                           | Select video input device      |
| `testAudioInput`              | `(deviceId?: string, options?: DeviceTestOptions) => Promise<boolean>` | Test audio input device        |
| `testAudioOutput`             | `(deviceId?: string) => Promise<boolean>`                              | Test audio output device       |
| `getDeviceById`               | `(deviceId: string) => MediaDevice \| undefined`                       | Get device by ID               |
| `getDevicesByKind`            | `(kind: MediaDeviceKind) => readonly MediaDevice[]`                    | Get devices by kind            |
| `startDeviceChangeMonitoring` | `() => void`                                                           | Start device change monitoring |
| `stopDeviceChangeMonitoring`  | `() => void`                                                           | Stop device change monitoring  |

#### Usage Example

```typescript
import { useMediaDevices } from '@/composables/useMediaDevices'

const {
  audioInputDevices,
  selectedAudioInputId,
  enumerateDevices,
  requestPermissions,
  selectAudioInput,
  testAudioInput,
} = useMediaDevices(mediaManager)

// Request permissions
await requestPermissions(true, false)

// Enumerate devices
await enumerateDevices()

// Select device
if (audioInputDevices.value.length > 0) {
  selectAudioInput(audioInputDevices.value[0].deviceId)
}

// Test device
const success = await testAudioInput()
```

---

### useDTMF

Provides DTMF (Dual-Tone Multi-Frequency) tone sending functionality for active call sessions with support for tone sequences and queue management.

**Source:** [`src/composables/useDTMF.ts`](../../src/composables/useDTMF.ts)

#### Signature

```typescript
function useDTMF(session: Ref<CallSession | null>): UseDTMFReturn
```

#### Parameters

| Parameter | Type                       | Description           |
| --------- | -------------------------- | --------------------- |
| `session` | `Ref<CallSession \| null>` | Call session instance |

#### Returns: `UseDTMFReturn`

##### Reactive State

| Property         | Type                          | Description               |
| ---------------- | ----------------------------- | ------------------------- |
| `isSending`      | `Ref<boolean>`                | Is currently sending DTMF |
| `queuedTones`    | `Ref<string[]>`               | Queued tones              |
| `lastSentTone`   | `Ref<string \| null>`         | Last sent tone            |
| `lastResult`     | `Ref<DTMFSendResult \| null>` | Last send result          |
| `tonesSentCount` | `Ref<number>`                 | Total tones sent          |
| `queueSize`      | `ComputedRef<number>`         | Queue size                |
| `isQueueEmpty`   | `ComputedRef<boolean>`        | Is queue empty            |

##### Methods

| Method              | Signature                                                         | Description                                   |
| ------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `sendTone`          | `(tone: string, options?: DTMFOptions) => Promise<void>`          | Send a single DTMF tone                       |
| `sendToneSequence`  | `(tones: string, options?: DTMFSequenceOptions) => Promise<void>` | Send a sequence of DTMF tones                 |
| `queueTone`         | `(tone: string) => void`                                          | Queue a tone for sending                      |
| `queueToneSequence` | `(tones: string) => void`                                         | Queue multiple tones for sending              |
| `processQueue`      | `(options?: DTMFSequenceOptions) => Promise<void>`                | Process the tone queue                        |
| `clearQueue`        | `() => void`                                                      | Clear the tone queue                          |
| `stopSending`       | `() => void`                                                      | Stop sending (clear queue and cancel current) |
| `resetStats`        | `() => void`                                                      | Reset statistics                              |

#### Usage Example

```typescript
import { useDTMF } from '@/composables/useDTMF'

const { sendTone, sendToneSequence, isSending, queuedTones, queueToneSequence, processQueue } =
  useDTMF(session)

// Send single tone
await sendTone('1')

// Send sequence
await sendToneSequence('1234#', {
  duration: 100,
  interToneGap: 70,
  onToneSent: (tone) => console.log(`Sent: ${tone}`),
})

// Queue tones
queueToneSequence('5678')
await processQueue()
```

---

## Advanced Composables

### useCallHistory

Provides reactive call history management with filtering, searching, export functionality, and persistence to IndexedDB.

**Source:** [`src/composables/useCallHistory.ts`](../../src/composables/useCallHistory.ts)

#### Signature

```typescript
function useCallHistory(): UseCallHistoryReturn
```

#### Returns: `UseCallHistoryReturn`

##### Reactive State

| Property           | Type                                       | Description                      |
| ------------------ | ------------------------------------------ | -------------------------------- |
| `history`          | `ComputedRef<readonly CallHistoryEntry[]>` | All call history entries         |
| `filteredHistory`  | `ComputedRef<readonly CallHistoryEntry[]>` | Filtered history entries         |
| `totalCalls`       | `ComputedRef<number>`                      | Total number of calls in history |
| `missedCallsCount` | `ComputedRef<number>`                      | Total number of missed calls     |
| `currentFilter`    | `Ref<HistoryFilter \| null>`               | Current filter                   |

##### Methods

| Method           | Signature                                                        | Description                      |
| ---------------- | ---------------------------------------------------------------- | -------------------------------- |
| `getHistory`     | `(filter?: HistoryFilter) => HistorySearchResult`                | Get history with optional filter |
| `searchHistory`  | `(query: string, filter?: HistoryFilter) => HistorySearchResult` | Search history by query          |
| `clearHistory`   | `() => Promise<void>`                                            | Clear all history                |
| `deleteEntry`    | `(entryId: string) => Promise<void>`                             | Delete a specific entry          |
| `exportHistory`  | `(options: HistoryExportOptions) => Promise<void>`               | Export history to file           |
| `getStatistics`  | `(filter?: HistoryFilter) => HistoryStatistics`                  | Get history statistics           |
| `setFilter`      | `(filter: HistoryFilter \| null) => void`                        | Set current filter               |
| `getMissedCalls` | `() => readonly CallHistoryEntry[]`                              | Get missed calls only            |
| `getRecentCalls` | `(limit?: number) => readonly CallHistoryEntry[]`                | Get recent calls (last N)        |

#### Usage Example

```typescript
import { useCallHistory } from '@/composables/useCallHistory'

const { history, filteredHistory, searchHistory, exportHistory, getStatistics } = useCallHistory()

// Search history
const results = searchHistory('john')

// Get statistics
const stats = getStatistics()
console.log(`Total calls: ${stats.totalCalls}`)

// Export to CSV
await exportHistory({ format: 'csv', filename: 'my-calls' })
```

---

### useCallControls

Provides advanced call control features including blind/attended transfers, call forwarding, and basic conference management.

**Source:** [`src/composables/useCallControls.ts`](../../src/composables/useCallControls.ts)

#### Signature

```typescript
function useCallControls(sipClient: Ref<SipClient | null>): UseCallControlsReturn
```

#### Parameters

| Parameter   | Type                     | Description         |
| ----------- | ------------------------ | ------------------- |
| `sipClient` | `Ref<SipClient \| null>` | SIP client instance |

#### Returns: `UseCallControlsReturn`

##### Reactive State

| Property           | Type                          | Description                             |
| ------------------ | ----------------------------- | --------------------------------------- |
| `activeTransfer`   | `Ref<ActiveTransfer \| null>` | Active transfer (if any)                |
| `transferState`    | `ComputedRef<TransferState>`  | Transfer state                          |
| `isTransferring`   | `ComputedRef<boolean>`        | Whether a transfer is in progress       |
| `consultationCall` | `Ref<CallSession \| null>`    | Consultation call for attended transfer |

##### Methods

| Method                     | Signature                                                                       | Description                                                    |
| -------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `blindTransfer`            | `(callId: string, targetUri: string, extraHeaders?: string[]) => Promise<void>` | Perform blind transfer                                         |
| `initiateAttendedTransfer` | `(callId: string, targetUri: string) => Promise<string>`                        | Initiate attended transfer (creates consultation call)         |
| `completeAttendedTransfer` | `() => Promise<void>`                                                           | Complete attended transfer (connect call to consultation call) |
| `cancelTransfer`           | `() => Promise<void>`                                                           | Cancel active transfer                                         |
| `forwardCall`              | `(callId: string, targetUri: string) => Promise<void>`                          | Forward call to target URI                                     |
| `getTransferProgress`      | `() => TransferProgress \| null`                                                | Get transfer progress                                          |
| `onTransferEvent`          | `(callback: (event: TransferEvent) => void) => () => void`                      | Listen for transfer events                                     |

#### Usage Example

```typescript
import { useCallControls } from '@/composables/useCallControls'

const { blindTransfer, initiateAttendedTransfer, completeAttendedTransfer, isTransferring } =
  useCallControls(sipClient)

// Blind transfer
await blindTransfer('call-123', 'sip:transfer-target@domain.com')

// Attended transfer
const consultationCallId = await initiateAttendedTransfer('call-123', 'sip:consult@domain.com')
// ... talk to consultation target ...
await completeAttendedTransfer()
```

---

### usePresence

Provides SIP presence (SUBSCRIBE/NOTIFY) functionality for tracking user status (available, away, busy, offline) and watching other users' presence.

**Source:** [`src/composables/usePresence.ts`](../../src/composables/usePresence.ts)

#### Signature

```typescript
function usePresence(sipClient: Ref<SipClient | null>): UsePresenceReturn
```

#### Parameters

| Parameter   | Type                     | Description         |
| ----------- | ------------------------ | ------------------- |
| `sipClient` | `Ref<SipClient \| null>` | SIP client instance |

#### Returns: `UsePresenceReturn`

##### Reactive State

| Property            | Type                                     | Description                                    |
| ------------------- | ---------------------------------------- | ---------------------------------------------- |
| `currentStatus`     | `Ref<PresenceStatus \| null>`            | Current user's presence status                 |
| `watchedUsers`      | `Ref<Map<string, PresenceStatus>>`       | Map of watched users and their presence status |
| `subscriptions`     | `Ref<Map<string, PresenceSubscription>>` | Active subscriptions                           |
| `currentState`      | `ComputedRef<PresenceState>`             | Current presence state                         |
| `subscriptionCount` | `ComputedRef<number>`                    | Number of active subscriptions                 |

##### Methods

| Method            | Signature                                                                   | Description                             |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------------- |
| `setStatus`       | `(state: PresenceState, options?: PresencePublishOptions) => Promise<void>` | Set own presence status                 |
| `subscribe`       | `(uri: string, options?: PresenceSubscriptionOptions) => Promise<string>`   | Subscribe to user's presence            |
| `unsubscribe`     | `(uri: string) => Promise<void>`                                            | Unsubscribe from user's presence        |
| `getStatus`       | `(uri: string) => PresenceStatus \| null`                                   | Get presence status for a specific user |
| `unsubscribeAll`  | `() => Promise<void>`                                                       | Unsubscribe from all watched users      |
| `onPresenceEvent` | `(callback: (event: PresenceEvent) => void) => () => void`                  | Listen for presence events              |

#### Usage Example

```typescript
import { usePresence } from '@/composables/usePresence'
import { PresenceState } from '@/types/presence.types'

const { setStatus, subscribe, watchedUsers } = usePresence(sipClient)

// Set own status
await setStatus(PresenceState.Available, {
  statusMessage: 'Working on project',
})

// Watch another user
await subscribe('sip:alice@domain.com')

// Check their status
watchedUsers.value.forEach((status, uri) => {
  console.log(`${uri}: ${status.state}`)
})
```

---

### useMessaging

Provides SIP MESSAGE functionality for sending and receiving instant messages via SIP protocol, with support for delivery notifications and composing indicators.

**Source:** [`src/composables/useMessaging.ts`](../../src/composables/useMessaging.ts)

#### Signature

```typescript
function useMessaging(sipClient: Ref<SipClient | null>): UseMessagingReturn
```

#### Parameters

| Parameter   | Type                     | Description         |
| ----------- | ------------------------ | ------------------- |
| `sipClient` | `Ref<SipClient \| null>` | SIP client instance |

#### Returns: `UseMessagingReturn`

##### Reactive State

| Property              | Type                                     | Description                  |
| --------------------- | ---------------------------------------- | ---------------------------- |
| `messages`            | `Ref<Message[]>`                         | All messages                 |
| `conversations`       | `ComputedRef<Map<string, Conversation>>` | Conversations grouped by URI |
| `unreadCount`         | `ComputedRef<number>`                    | Total unread message count   |
| `composingIndicators` | `Ref<Map<string, ComposingIndicator>>`   | Composing indicators         |

##### Methods

| Method                   | Signature                                                                        | Description                          |
| ------------------------ | -------------------------------------------------------------------------------- | ------------------------------------ |
| `sendMessage`            | `(to: string, content: string, options?: MessageSendOptions) => Promise<string>` | Send a message                       |
| `markAsRead`             | `(messageId: string) => void`                                                    | Mark message as read                 |
| `markAllAsRead`          | `(uri?: string) => void`                                                         | Mark all messages from a URI as read |
| `deleteMessage`          | `(messageId: string) => void`                                                    | Delete a message                     |
| `clearMessages`          | `(uri?: string) => void`                                                         | Clear all messages                   |
| `getMessagesForUri`      | `(uri: string) => Message[]`                                                     | Get messages for a specific URI      |
| `getFilteredMessages`    | `(filter: MessageFilter) => Message[]`                                           | Get filtered messages                |
| `sendComposingIndicator` | `(to: string, isComposing: boolean) => Promise<void>`                            | Send composing indicator             |
| `onMessagingEvent`       | `(callback: (event: MessagingEvent) => void) => () => void`                      | Listen for messaging events          |

#### Usage Example

```typescript
import { useMessaging } from '@/composables/useMessaging'

const { sendMessage, messages, unreadCount } = useMessaging(sipClient)

// Send a message
const messageId = await sendMessage('sip:alice@domain.com', 'Hello!')

// Check unread count
console.log(`Unread messages: ${unreadCount.value}`)

// Mark as read
markAllAsRead('sip:alice@domain.com')
```

---

### useConference

Provides conference call functionality for managing multi-party calls with participant management, audio level monitoring, and conference controls.

**Source:** [`src/composables/useConference.ts`](../../src/composables/useConference.ts)

#### Signature

```typescript
function useConference(sipClient: Ref<SipClient | null>): UseConferenceReturn
```

#### Parameters

| Parameter   | Type                     | Description         |
| ----------- | ------------------------ | ------------------- |
| `sipClient` | `Ref<SipClient \| null>` | SIP client instance |

#### Returns: `UseConferenceReturn`

##### Reactive State

| Property           | Type                                    | Description                              |
| ------------------ | --------------------------------------- | ---------------------------------------- |
| `conference`       | `Ref<ConferenceStateInterface \| null>` | Current conference state                 |
| `state`            | `ComputedRef<ConferenceState>`          | Current state of the conference          |
| `participants`     | `ComputedRef<Participant[]>`            | Array of all participants                |
| `localParticipant` | `ComputedRef<Participant \| null>`      | The local participant (self)             |
| `participantCount` | `ComputedRef<number>`                   | Total number of participants             |
| `isActive`         | `ComputedRef<boolean>`                  | Whether the conference is active         |
| `isLocked`         | `ComputedRef<boolean>`                  | Whether the conference is locked         |
| `isRecording`      | `ComputedRef<boolean>`                  | Whether the conference is being recorded |

##### Methods

| Method              | Signature                                                               | Description                              |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| `createConference`  | `(options?: ConferenceOptions) => Promise<string>`                      | Create a new conference                  |
| `joinConference`    | `(conferenceUri: string, options?: ConferenceOptions) => Promise<void>` | Join an existing conference              |
| `addParticipant`    | `(uri: string, displayName?: string) => Promise<string>`                | Add a participant to the conference      |
| `removeParticipant` | `(participantId: string, reason?: string) => Promise<void>`             | Remove a participant from the conference |
| `muteParticipant`   | `(participantId: string) => Promise<void>`                              | Mute a participant's audio               |
| `unmuteParticipant` | `(participantId: string) => Promise<void>`                              | Unmute a participant's audio             |
| `endConference`     | `() => Promise<void>`                                                   | End the conference for all participants  |
| `lockConference`    | `() => Promise<void>`                                                   | Lock the conference                      |
| `unlockConference`  | `() => Promise<void>`                                                   | Unlock the conference                    |
| `startRecording`    | `() => Promise<void>`                                                   | Start recording the conference           |
| `stopRecording`     | `() => Promise<void>`                                                   | Stop recording the conference            |
| `getParticipant`    | `(participantId: string) => Participant \| null`                        | Get a specific participant by ID         |
| `onConferenceEvent` | `(callback: (event: ConferenceEvent) => void) => () => void`            | Listen for conference events             |

#### Usage Example

```typescript
import { useConference } from '@/composables/useConference'

const { createConference, addParticipant, participants, participantCount, endConference } =
  useConference(sipClient)

// Create a new conference
const confId = await createConference({
  maxParticipants: 10,
  locked: false,
})

// Add participants
await addParticipant('sip:alice@domain.com', 'Alice')
await addParticipant('sip:bob@domain.com', 'Bob')

// Monitor participants
console.log(`Active participants: ${participantCount.value}`)

// End conference when done
await endConference()
```

---

## Call Quality Composables

Composables for monitoring and adapting to call quality in real-time. These provide quality scoring, network indicators, and bandwidth adaptation recommendations for WebRTC calls.

### useCallQualityScore

Provides comprehensive call quality scoring with A-F grading, trend analysis, and weighted metric evaluation.

**Source:** [`src/composables/useCallQualityScore.ts`](../../src/composables/useCallQualityScore.ts)

#### Signature

```typescript
function useCallQualityScore(options?: CallQualityScoreOptions): UseCallQualityScoreReturn
```

#### Parameters

| Parameter                     | Type                           | Default      | Description                          |
| ----------------------------- | ------------------------------ | ------------ | ------------------------------------ |
| `options.weights`             | `Partial<QualityScoreWeights>` | See defaults | Custom weight configuration          |
| `options.historySize`         | `number`                       | `10`         | Number of samples for trend analysis |
| `options.updateInterval`      | `number`                       | `1000`       | Update interval in milliseconds      |
| `options.enableTrendAnalysis` | `boolean`                      | `true`       | Enable quality trend calculation     |

##### Default Weights

```typescript
{
  packetLoss: 0.25,
  jitter: 0.15,
  rtt: 0.2,
  mos: 0.25,
  bitrateStability: 0.15
}
```

#### Returns: `UseCallQualityScoreReturn`

##### Reactive State

| Property  | Type                            | Description                                  |
| --------- | ------------------------------- | -------------------------------------------- |
| `score`   | `Ref<CallQualityScore \| null>` | Current quality score (null if no data)      |
| `trend`   | `Ref<QualityTrend \| null>`     | Quality trend (null if insufficient history) |
| `history` | `Ref<CallQualityScore[]>`       | Score history for charting                   |
| `weights` | `Ref<QualityScoreWeights>`      | Current weight configuration                 |

##### Score Object

```typescript
interface CallQualityScore {
  overall: number // 0-100
  audio: number // 0-100
  video: number | null // 0-100 (null for audio-only)
  network: number // 0-100
  grade: QualityGrade // 'A' | 'B' | 'C' | 'D' | 'F'
  description: string // Human-readable description
  timestamp: number
}
```

##### Trend Object

```typescript
interface QualityTrend {
  direction: 'improving' | 'stable' | 'degrading'
  rate: number // -100 to 100 (negative = degrading)
  confidence: number // 0-1 (higher = more certain)
}
```

##### Methods

| Method        | Signature                            | Description                              |
| ------------- | ------------------------------------ | ---------------------------------------- |
| `updateScore` | `(input: QualityScoreInput) => void` | Update score with new WebRTC stats       |
| `reset`       | `() => void`                         | Clear history and reset to initial state |

#### Usage Example

```typescript
import { useCallQualityScore } from 'vuesip'

const { score, trend, history, updateScore, reset } = useCallQualityScore({
  historySize: 20,
  enableTrendAnalysis: true,
  weights: {
    packetLoss: 0.3, // Prioritize packet loss
    mos: 0.3,
  },
})

// Update with WebRTC stats (typically in a stats polling interval)
updateScore({
  packetLoss: 0.5,
  jitter: 15,
  rtt: 80,
  mos: 4.2,
  bitrate: 1500,
  previousBitrate: 1480,
  audioPacketLoss: 0.3,
  videoPacketLoss: 0.7,
  framerate: 28,
  targetFramerate: 30,
})

// Check quality
if (score.value) {
  console.log(`Quality: ${score.value.grade} (${score.value.overall}/100)`)
  console.log(score.value.description)
}

// Monitor trend
if (trend.value?.direction === 'degrading') {
  console.warn('Call quality is degrading!')
}
```

#### Grade Thresholds

| Grade | Score Range | Description       |
| ----- | ----------- | ----------------- |
| A     | 90-100      | Excellent quality |
| B     | 75-89       | Good quality      |
| C     | 60-74       | Fair quality      |
| D     | 40-59       | Poor quality      |
| F     | 0-39        | Very poor quality |

---

### useNetworkQualityIndicator

Provides visual network quality indicators with signal bars, colors, and accessibility labels for displaying connection quality in the UI.

**Source:** [`src/composables/useNetworkQualityIndicator.ts`](../../src/composables/useNetworkQualityIndicator.ts)

#### Signature

```typescript
function useNetworkQualityIndicator(
  options?: NetworkQualityIndicatorOptions
): UseNetworkQualityIndicatorReturn
```

#### Parameters

| Parameter                   | Type                                | Default      | Description                 |
| --------------------------- | ----------------------------------- | ------------ | --------------------------- |
| `options.updateInterval`    | `number`                            | `1000`       | Update interval in ms       |
| `options.colors`            | `Partial<NetworkQualityColors>`     | See defaults | Custom color scheme         |
| `options.estimateBandwidth` | `boolean`                           | `true`       | Enable bandwidth estimation |
| `options.thresholds`        | `Partial<NetworkQualityThresholds>` | See defaults | Custom quality thresholds   |

##### Default Colors

```typescript
{
  excellent: '#22c55e', // green-500
  good: '#22c55e',      // green-500
  fair: '#eab308',      // yellow-500
  poor: '#f97316',      // orange-500
  critical: '#ef4444',  // red-500
  unknown: '#9ca3af'    // gray-400
}
```

##### Default Thresholds

```typescript
{
  rtt: [50, 100, 200, 400],           // ms [excellent, good, fair, poor]
  packetLoss: [0.5, 1, 2, 5],         // % [excellent, good, fair, poor]
  jitter: [10, 20, 40, 80]            // ms [excellent, good, fair, poor]
}
```

#### Returns: `UseNetworkQualityIndicatorReturn`

##### Reactive State

| Property      | Type                               | Description                       |
| ------------- | ---------------------------------- | --------------------------------- |
| `indicator`   | `Ref<NetworkQualityIndicatorData>` | Current indicator data            |
| `isAvailable` | `Ref<boolean>`                     | Whether network data is available |

##### Indicator Object

```typescript
interface NetworkQualityIndicatorData {
  level: NetworkQualityLevel // 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unknown'
  bars: SignalBars // 1 | 2 | 3 | 4 | 5
  color: string // CSS color value
  icon: NetworkQualityIcon // Icon name suggestion
  ariaLabel: string // Accessibility label
  details: NetworkDetails // Detailed metrics
}
```

##### Methods

| Method   | Signature                              | Description                   |
| -------- | -------------------------------------- | ----------------------------- |
| `update` | `(input: NetworkQualityInput) => void` | Update with new network stats |
| `reset`  | `() => void`                           | Reset to unknown state        |

#### Usage Example

```vue
<template>
  <div class="network-indicator">
    <!-- Signal Bars -->
    <div class="signal-bars" :style="{ color: indicator.color }" :aria-label="indicator.ariaLabel">
      <div v-for="bar in 5" :key="bar" class="bar" :class="{ active: bar <= indicator.bars }" />
    </div>

    <!-- Tooltip with details -->
    <div v-if="isAvailable" class="tooltip">
      <p>RTT: {{ indicator.details.rtt }}ms</p>
      <p>Jitter: {{ indicator.details.jitter }}ms</p>
      <p>Packet Loss: {{ indicator.details.packetLoss }}%</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNetworkQualityIndicator, useSipWebRTCStats } from 'vuesip'

const { stats } = useSipWebRTCStats(session)
const { indicator, isAvailable, update } = useNetworkQualityIndicator({
  colors: {
    excellent: '#10b981',
    critical: '#dc2626',
  },
})

// Update indicator when stats change
watch(stats, (newStats) => {
  if (newStats) {
    update({
      rtt: newStats.rtt,
      jitter: newStats.jitter,
      packetLoss: newStats.packetLoss,
      candidateType: newStats.candidateType,
    })
  }
})
</script>

<style scoped>
.signal-bars {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}

.bar {
  width: 4px;
  background: currentColor;
  opacity: 0.2;
}

.bar.active {
  opacity: 1;
}

.bar:nth-child(1) {
  height: 4px;
}
.bar:nth-child(2) {
  height: 8px;
}
.bar:nth-child(3) {
  height: 12px;
}
.bar:nth-child(4) {
  height: 16px;
}
.bar:nth-child(5) {
  height: 20px;
}
</style>
```

#### Quality Levels

| Level     | Bars | Typical Conditions                               |
| --------- | ---- | ------------------------------------------------ |
| excellent | 5    | RTT < 50ms, jitter < 10ms, packet loss < 0.5%    |
| good      | 4    | RTT < 100ms, jitter < 20ms, packet loss < 1%     |
| fair      | 3    | RTT < 200ms, jitter < 40ms, packet loss < 2%     |
| poor      | 2    | RTT < 400ms, jitter < 80ms, packet loss < 5%     |
| critical  | 1    | RTT ≥ 400ms or jitter ≥ 80ms or packet loss ≥ 5% |
| unknown   | 1    | No data available                                |

---

### useBandwidthAdaptation

Provides intelligent bandwidth adaptation recommendations based on network conditions. Analyzes available bandwidth, packet loss, and RTT to suggest resolution, framerate, and bitrate adjustments.

**Source:** [`src/composables/useBandwidthAdaptation.ts`](../../src/composables/useBandwidthAdaptation.ts)

#### Signature

```typescript
function useBandwidthAdaptation(options?: BandwidthAdaptationOptions): UseBandwidthAdaptationReturn
```

#### Parameters

| Parameter                  | Type                                     | Default      | Description                                          |
| -------------------------- | ---------------------------------------- | ------------ | ---------------------------------------------------- |
| `options.constraints`      | `BandwidthConstraints`                   | See defaults | Bandwidth/quality constraints                        |
| `options.sensitivity`      | `number`                                 | `0.5`        | Adaptation sensitivity (0-1, higher = more reactive) |
| `options.autoAdapt`        | `boolean`                                | `false`      | Enable automatic adaptation                          |
| `options.onRecommendation` | `(rec: BandwidthRecommendation) => void` | -            | Callback on recommendation change                    |
| `options.historySize`      | `number`                                 | `5`          | History size for smoothing                           |

##### Default Constraints

```typescript
{
  minVideoBitrate: 100,       // kbps
  maxVideoBitrate: 2500,      // kbps
  minAudioBitrate: 16,        // kbps
  maxAudioBitrate: 128,       // kbps
  targetFramerate: 30,
  minFramerate: 15,
  minResolution: { width: 426, height: 240, label: '240p' },
  preferredResolution: { width: 1280, height: 720, label: '720p' }
}
```

#### Returns: `UseBandwidthAdaptationReturn`

##### Reactive State

| Property         | Type                                  | Description                        |
| ---------------- | ------------------------------------- | ---------------------------------- |
| `recommendation` | `Ref<BandwidthRecommendation>`        | Current recommendation             |
| `isAutoAdapting` | `Ref<boolean>`                        | Whether auto-adaptation is enabled |
| `constraints`    | `Ref<Required<BandwidthConstraints>>` | Current constraints                |

##### Recommendation Object

```typescript
interface BandwidthRecommendation {
  action: BandwidthAction // 'upgrade' | 'maintain' | 'downgrade' | 'critical'
  suggestions: AdaptationSuggestion[]
  priority: RecommendationPriority // 'low' | 'medium' | 'high' | 'critical'
  estimatedImprovement: number // 0-100
  timestamp: number
}
```

##### Suggestion Object

```typescript
interface AdaptationSuggestion {
  type: SuggestionType // 'video' | 'audio' | 'network' | 'codec'
  message: string // Human-readable suggestion
  current: string // Current value description
  recommended: string // Recommended value description
  impact: number // Estimated impact 0-100
}
```

##### Methods

| Method            | Signature                                              | Description                      |
| ----------------- | ------------------------------------------------------ | -------------------------------- |
| `update`          | `(input: BandwidthAdaptationInput) => void`            | Update with new stats            |
| `setAutoAdapt`    | `(enabled: boolean) => void`                           | Enable/disable auto-adaptation   |
| `setConstraints`  | `(constraints: Partial<BandwidthConstraints>) => void` | Update constraints               |
| `reset`           | `() => void`                                           | Reset to default state           |
| `applySuggestion` | `(suggestion: AdaptationSuggestion) => void`           | Apply a suggestion (placeholder) |

#### Usage Example

```typescript
import { useBandwidthAdaptation } from 'vuesip'

const { recommendation, update, setConstraints, setAutoAdapt } = useBandwidthAdaptation({
  sensitivity: 0.6,
  constraints: {
    minVideoBitrate: 150,
    preferredResolution: { width: 1280, height: 720, label: '720p' },
  },
  onRecommendation: (rec) => {
    if (rec.priority === 'critical') {
      console.warn('Critical bandwidth issues detected!')
    }
  },
})

// Update with WebRTC stats
update({
  availableBitrate: 1500,
  currentBitrate: 1200,
  packetLoss: 2.5,
  rtt: 120,
  currentResolution: { width: 1280, height: 720, label: '720p' },
  currentFramerate: 25,
  videoEnabled: true,
  degradationEvents: 2,
})

// React to recommendations
if (recommendation.value.action === 'downgrade') {
  console.log('Consider these optimizations:')
  for (const suggestion of recommendation.value.suggestions) {
    console.log(`- ${suggestion.message} (Impact: ${suggestion.impact}%)`)
  }
}

// Example UI integration
const getActionColor = (action: BandwidthAction) => {
  switch (action) {
    case 'upgrade':
      return '#22c55e'
    case 'maintain':
      return '#3b82f6'
    case 'downgrade':
      return '#f97316'
    case 'critical':
      return '#ef4444'
  }
}
```

#### Action Types

| Action      | Description                | Typical Trigger                           |
| ----------- | -------------------------- | ----------------------------------------- |
| `upgrade`   | Can increase quality       | Available bandwidth > 2x current usage    |
| `maintain`  | Current quality is optimal | Stable conditions                         |
| `downgrade` | Should reduce quality      | Bandwidth constrained or high packet loss |
| `critical`  | Severe issues detected     | Very low bandwidth or extreme conditions  |

#### Video Resolutions

The composable supports standard video resolutions for suggestions:

| Resolution | Label | Use Case         |
| ---------- | ----- | ---------------- |
| 1920×1080  | 1080p | High bandwidth   |
| 1280×720   | 720p  | Standard quality |
| 854×480    | 480p  | Medium bandwidth |
| 640×360    | 360p  | Low bandwidth    |
| 426×240    | 240p  | Minimum quality  |

---

## Connection Recovery Composables

### useConnectionRecovery

Provides connection recovery with ICE restart handling for WebRTC connections. Monitors peer connection health, detects failures, and automatically or manually triggers recovery attempts.

**Source:** [`src/composables/useConnectionRecovery.ts`](../../src/composables/useConnectionRecovery.ts)

#### Signature

```typescript
function useConnectionRecovery(options?: ConnectionRecoveryOptions): UseConnectionRecoveryReturn
```

#### Parameters

| Parameter                   | Type                                    | Default         | Description                                |
| --------------------------- | --------------------------------------- | --------------- | ------------------------------------------ |
| `options.autoRecover`       | `boolean`                               | `true`          | Enable automatic recovery on ICE failure   |
| `options.maxAttempts`       | `number`                                | `3`             | Maximum recovery attempts before giving up |
| `options.attemptDelay`      | `number`                                | `2000`          | Delay between attempts in milliseconds     |
| `options.iceRestartTimeout` | `number`                                | `10000`         | Timeout for ICE restart in milliseconds    |
| `options.strategy`          | `RecoveryStrategy`                      | `'ice-restart'` | Recovery strategy to use                   |
| `options.onRecoveryStart`   | `() => void`                            | -               | Callback when recovery starts              |
| `options.onRecoverySuccess` | `(attempt: RecoveryAttempt) => void`    | -               | Callback on successful recovery            |
| `options.onRecoveryFailed`  | `(attempts: RecoveryAttempt[]) => void` | -               | Callback when all attempts fail            |

#### Type Definitions

```typescript
type RecoveryState = 'stable' | 'monitoring' | 'recovering' | 'failed'
type RecoveryStrategy = 'ice-restart' | 'reconnect' | 'none'

interface IceHealthStatus {
  iceState: RTCIceConnectionState
  stateAge: number // Time since last state change (ms)
  recoveryAttempts: number
  isHealthy: boolean
}

interface RecoveryAttempt {
  attempt: number
  strategy: RecoveryStrategy
  success: boolean
  duration: number // Duration of attempt (ms)
  error?: string
  timestamp: number
}
```

#### Returns: `UseConnectionRecoveryReturn`

##### Reactive State

| Property       | Type                     | Description                     |
| -------------- | ------------------------ | ------------------------------- |
| `state`        | `Ref<RecoveryState>`     | Current recovery state          |
| `iceHealth`    | `Ref<IceHealthStatus>`   | Current ICE health status       |
| `attempts`     | `Ref<RecoveryAttempt[]>` | History of recovery attempts    |
| `isRecovering` | `ComputedRef<boolean>`   | Whether recovery is in progress |
| `isHealthy`    | `ComputedRef<boolean>`   | Whether connection is healthy   |
| `error`        | `Ref<string \| null>`    | Last error message              |

##### Methods

| Method           | Signature                         | Description                         |
| ---------------- | --------------------------------- | ----------------------------------- |
| `monitor`        | `(pc: RTCPeerConnection) => void` | Start monitoring a peer connection  |
| `stopMonitoring` | `() => void`                      | Stop monitoring the peer connection |
| `recover`        | `() => Promise<boolean>`          | Manually trigger recovery           |
| `reset`          | `() => void`                      | Reset recovery state                |

#### Usage Example

```typescript
import { useConnectionRecovery } from 'vuesip'

const { state, iceHealth, isRecovering, isHealthy, attempts, monitor, recover, reset } =
  useConnectionRecovery({
    maxAttempts: 3,
    attemptDelay: 2000,
    autoRecover: true,
    onRecoveryStart: () => console.log('Recovery started...'),
    onRecoverySuccess: (attempt) => console.log(`Recovered on attempt ${attempt.attempt}`),
    onRecoveryFailed: (attempts) =>
      console.error('Recovery failed after', attempts.length, 'attempts'),
  })

// Start monitoring a peer connection
const peerConnection = new RTCPeerConnection()
monitor(peerConnection)

// Check connection health
watch(isHealthy, (healthy) => {
  if (!healthy) {
    console.warn('Connection health degraded')
  }
})

// Monitor recovery state
watch(state, (newState) => {
  switch (newState) {
    case 'stable':
      console.log('Connection is stable')
      break
    case 'monitoring':
      console.log('Detected issue, monitoring...')
      break
    case 'recovering':
      console.log('Attempting recovery...')
      break
    case 'failed':
      console.error('Recovery failed')
      break
  }
})

// Manual recovery (if autoRecover is false)
const success = await recover()

// Reset state after call ends
reset()
```

#### Integration with Call Session

```vue
<template>
  <div class="call-status">
    <div v-if="isRecovering" class="recovery-indicator">
      <span class="spinner" />
      Reconnecting...
    </div>

    <div v-if="state === 'failed'" class="error-message">
      Connection lost.
      <button @click="recover">Retry</button>
    </div>

    <div class="health-indicator" :class="healthClass">
      {{ healthLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useConnectionRecovery, useCallSession } from 'vuesip'

const { session } = useCallSession(sipClient)
const { state, isRecovering, isHealthy, monitor, stopMonitoring, recover } = useConnectionRecovery({
  maxAttempts: 3,
  onRecoveryFailed: () => {
    // Notify user or escalate
    console.error('Unable to recover connection')
  },
})

// Monitor peer connection when session starts
watch(session, (newSession) => {
  if (newSession?.peerConnection) {
    monitor(newSession.peerConnection)
  } else {
    stopMonitoring()
  }
})

const healthClass = computed(() => ({
  healthy: isHealthy.value,
  unhealthy: !isHealthy.value && state.value !== 'recovering',
  recovering: state.value === 'recovering',
}))

const healthLabel = computed(() => {
  if (isRecovering.value) return 'Reconnecting...'
  if (!isHealthy.value) return 'Connection issues'
  return 'Connected'
})
</script>
```

#### Recovery States

| State        | Description                               |
| ------------ | ----------------------------------------- |
| `stable`     | Connection is healthy, no issues detected |
| `monitoring` | Issue detected, actively monitoring       |
| `recovering` | Actively attempting to recover            |
| `failed`     | All recovery attempts exhausted           |

#### Recovery Strategies

| Strategy      | Description                                  |
| ------------- | -------------------------------------------- |
| `ice-restart` | Trigger ICE restart with offer renegotiation |
| `reconnect`   | Full reconnection (reserved for future use)  |
| `none`        | No automatic recovery                        |

---

## Video Enhancement Composables

### usePictureInPicture

Provides Picture-in-Picture mode support for video elements, allowing video calls to be displayed in a floating window that stays on top of other applications.

**Source:** [`src/composables/usePictureInPicture.ts`](../../src/composables/usePictureInPicture.ts)

#### Signature

```typescript
function usePictureInPicture(
  videoRef: Ref<HTMLVideoElement | null>,
  options?: PictureInPictureOptions
): UsePictureInPictureReturn
```

#### Parameters

| Parameter                   | Type                            | Default                   | Description                                                  |
| --------------------------- | ------------------------------- | ------------------------- | ------------------------------------------------------------ |
| `videoRef`                  | `Ref<HTMLVideoElement \| null>` | -                         | Ref to the HTMLVideoElement to use for PiP                   |
| `options.persistPreference` | `boolean`                       | `false`                   | Whether to persist the user's PiP preference to localStorage |
| `options.preferenceKey`     | `string`                        | `'vuesip-pip-preference'` | Key to use for localStorage when persisting preference       |

#### Returns: `UsePictureInPictureReturn`

##### Reactive State

| Property         | Type                                  | Description                                  |
| ---------------- | ------------------------------------- | -------------------------------------------- |
| `isPiPSupported` | `Ref<boolean>`                        | Whether PiP is supported by the browser      |
| `isPiPActive`    | `Ref<boolean>`                        | Whether PiP mode is currently active         |
| `pipWindow`      | `Ref<PictureInPictureWindow \| null>` | The PiP window object (null when not in PiP) |
| `error`          | `Ref<Error \| null>`                  | Current error state                          |

##### Methods

| Method      | Signature             | Description                    |
| ----------- | --------------------- | ------------------------------ |
| `enterPiP`  | `() => Promise<void>` | Enter Picture-in-Picture mode  |
| `exitPiP`   | `() => Promise<void>` | Exit Picture-in-Picture mode   |
| `togglePiP` | `() => Promise<void>` | Toggle Picture-in-Picture mode |

#### Usage Example

```vue
<template>
  <div class="video-call">
    <video ref="videoElement" autoplay playsinline />

    <div class="controls">
      <button v-if="isPiPSupported" @click="togglePiP" :disabled="!videoElement">
        {{ isPiPActive ? 'Exit PiP' : 'Enter PiP' }}
      </button>
      <p v-if="!isPiPSupported">Picture-in-Picture not supported in this browser</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePictureInPicture } from 'vuesip'

const videoElement = ref<HTMLVideoElement | null>(null)

const { isPiPSupported, isPiPActive, togglePiP, error } = usePictureInPicture(videoElement, {
  persistPreference: true,
})

// Handle errors
watch(error, (e) => {
  if (e) console.error('PiP Error:', e.message)
})
</script>
```

#### Browser Support

Picture-in-Picture requires browser support:

| Browser      | Support               |
| ------------ | --------------------- |
| Chrome 70+   | ✅ Full               |
| Edge 79+     | ✅ Full               |
| Safari 13.1+ | ✅ Full               |
| Firefox      | ❌ Uses different API |
| Opera 57+    | ✅ Full               |

💡 **Tip**: Always check `isPiPSupported` before showing PiP controls to users.

---

### useVideoInset

Provides a local camera overlay on a remote video stream, commonly used in video calls to show both participants in a "picture-in-picture" style layout within your application.

**Source:** [`src/composables/useVideoInset.ts`](../../src/composables/useVideoInset.ts)

#### Signature

```typescript
function useVideoInset(options?: VideoInsetOptions): UseVideoInsetReturn
```

#### Parameters

| Parameter                   | Type            | Default                | Description                                          |
| --------------------------- | --------------- | ---------------------- | ---------------------------------------------------- |
| `options.initialPosition`   | `InsetPosition` | `'bottom-right'`       | Initial position of the inset video                  |
| `options.initialSize`       | `InsetSize`     | `'medium'`             | Initial size preset                                  |
| `options.customWidth`       | `number`        | `160`                  | Custom width in pixels (used when size is 'custom')  |
| `options.customHeight`      | `number`        | `120`                  | Custom height in pixels (used when size is 'custom') |
| `options.margin`            | `number`        | `16`                   | Margin from container edges in pixels                |
| `options.borderRadius`      | `number`        | `8`                    | Border radius in pixels                              |
| `options.draggable`         | `boolean`       | `true`                 | Whether the inset can be dragged                     |
| `options.showInitially`     | `boolean`       | `true`                 | Whether to show the inset initially                  |
| `options.persistPreference` | `boolean`       | `false`                | Persist position/size to localStorage                |
| `options.preferenceKey`     | `string`        | `'vuesip-video-inset'` | Key for localStorage persistence                     |

#### Type Definitions

```typescript
type InsetPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
type InsetSize = 'small' | 'medium' | 'large' | 'custom'

interface InsetDimensions {
  width: number
  height: number
}
```

#### Size Presets

| Size     | Dimensions   |
| -------- | ------------ |
| `small`  | 120×90 px    |
| `medium` | 160×120 px   |
| `large`  | 240×180 px   |
| `custom` | User-defined |

#### Returns: `UseVideoInsetReturn`

##### Reactive State

| Property      | Type                   | Description                                                 |
| ------------- | ---------------------- | ----------------------------------------------------------- |
| `isVisible`   | `Ref<boolean>`         | Whether inset is currently visible                          |
| `position`    | `Ref<InsetPosition>`   | Current position of the inset                               |
| `size`        | `Ref<InsetSize>`       | Current size preset                                         |
| `dimensions`  | `Ref<InsetDimensions>` | Current dimensions in pixels                                |
| `isSwapped`   | `Ref<boolean>`         | Whether videos are swapped (local is main, remote is inset) |
| `isDraggable` | `Ref<boolean>`         | Whether dragging is enabled                                 |
| `isDragging`  | `Ref<boolean>`         | Whether currently being dragged                             |
| `insetStyles` | `Ref<CSSProperties>`   | Computed CSS styles for the inset container                 |

##### Methods

| Method                | Signature                                 | Description                         |
| --------------------- | ----------------------------------------- | ----------------------------------- |
| `show`                | `() => void`                              | Show the inset                      |
| `hide`                | `() => void`                              | Hide the inset                      |
| `toggle`              | `() => void`                              | Toggle inset visibility             |
| `setPosition`         | `(pos: InsetPosition) => void`            | Set position                        |
| `setSize`             | `(size: InsetSize) => void`               | Set size preset                     |
| `setCustomDimensions` | `(width: number, height: number) => void` | Set custom dimensions               |
| `swapVideos`          | `() => void`                              | Swap main and inset videos          |
| `cyclePosition`       | `() => void`                              | Cycle through positions (clockwise) |
| `reset`               | `() => void`                              | Reset to initial settings           |

#### Usage Example

```vue
<template>
  <div class="video-container">
    <!-- Main video (remote stream or local if swapped) -->
    <video
      ref="mainVideo"
      :srcObject="isSwapped ? localStream : remoteStream"
      autoplay
      playsinline
      class="main-video"
    />

    <!-- Inset video (local camera or remote if swapped) -->
    <div v-if="isVisible" :style="insetStyles" class="inset-video">
      <video
        ref="insetVideo"
        :srcObject="isSwapped ? remoteStream : localStream"
        autoplay
        muted
        playsinline
      />

      <!-- Inset Controls -->
      <div class="inset-controls">
        <button @click="swapVideos" title="Swap videos">🔄</button>
        <button @click="cyclePosition" title="Move position">📍</button>
        <button @click="hide" title="Hide self-view">👁️</button>
      </div>
    </div>

    <!-- Show button when hidden -->
    <button v-if="!isVisible" @click="show" class="show-btn">Show Self-View</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVideoInset, useCallSession } from 'vuesip'

// Get media streams from call session
const { localStream, remoteStream } = useCallSession(sipClient)

// Initialize video inset
const { isVisible, isSwapped, insetStyles, show, hide, swapVideos, cyclePosition, setSize } =
  useVideoInset({
    initialPosition: 'bottom-right',
    initialSize: 'medium',
    persistPreference: true,
  })

// Change size based on screen size
const handleResize = () => {
  if (window.innerWidth < 768) {
    setSize('small')
  } else {
    setSize('medium')
  }
}
</script>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.main-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.inset-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.inset-controls {
  position: absolute;
  bottom: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.inset-video:hover .inset-controls {
  opacity: 1;
}
</style>
```

#### Advanced Usage: Custom Dragging

```typescript
import { useVideoInset } from 'vuesip'

const { isDraggable, isDragging, setCustomDimensions } = useVideoInset({
  draggable: true,
  initialSize: 'custom',
  customWidth: 200,
  customHeight: 150,
})

// Implement custom drag handling
const handleDragStart = () => {
  isDragging.value = true
}

const handleDragEnd = () => {
  isDragging.value = false
}

// Resize on pinch gesture
const handlePinch = (scale: number) => {
  const currentWidth = dimensions.value.width
  const currentHeight = dimensions.value.height
  setCustomDimensions(currentWidth * scale, currentHeight * scale)
}
```

---

## Conference Enhancement Composables

Composables for enhancing conference call experiences with active speaker detection, gallery layouts, and participant controls.

### useActiveSpeaker

Provides reactive active speaker detection based on participant audio levels. Detects the dominant speaker (highest audio level above threshold) and tracks speaker history for conference UI components.

**Source:** [`src/composables/useActiveSpeaker.ts`](../../src/composables/useActiveSpeaker.ts)

#### Signature

```typescript
function useActiveSpeaker(
  participants: Ref<Participant[]>,
  options?: ActiveSpeakerOptions
): UseActiveSpeakerReturn
```

#### Parameters

| Parameter                 | Type                          | Default | Description                                              |
| ------------------------- | ----------------------------- | ------- | -------------------------------------------------------- |
| `participants`            | `Ref<Participant[]>`          | -       | Reactive reference to conference participants array      |
| `options.threshold`       | `number`                      | `0.15`  | Audio level threshold to consider someone speaking (0-1) |
| `options.debounceMs`      | `number`                      | `300`   | Debounce time in ms to prevent rapid speaker switching   |
| `options.historySize`     | `number`                      | `10`    | Number of recent speakers to track in history            |
| `options.excludeMuted`    | `boolean`                     | `true`  | Exclude muted participants from detection                |
| `options.onSpeakerChange` | `(speaker, previous) => void` | -       | Callback when active speaker changes                     |

#### Returns: `UseActiveSpeakerReturn`

##### Reactive State

| Property            | Type                               | Description                                                            |
| ------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `activeSpeaker`     | `ComputedRef<Participant \| null>` | Current dominant speaker (highest audio level above threshold)         |
| `activeSpeakers`    | `ComputedRef<Participant[]>`       | All participants currently speaking (above threshold), sorted by level |
| `isSomeoneSpeaking` | `ComputedRef<boolean>`             | Is anyone currently speaking                                           |
| `speakerHistory`    | `Ref<SpeakerHistoryEntry[]>`       | Recent speaker history                                                 |

##### Speaker History Entry

```typescript
interface SpeakerHistoryEntry {
  participantId: string // Participant ID
  displayName: string // Display name at time of speaking
  startedAt: number // When they started speaking (timestamp)
  endedAt: number | null // When they stopped (null if still speaking)
  peakLevel: number // Peak audio level during this speaking period
}
```

##### Methods

| Method         | Signature                     | Description                                   |
| -------------- | ----------------------------- | --------------------------------------------- |
| `clearHistory` | `() => void`                  | Clear speaker history                         |
| `setThreshold` | `(threshold: number) => void` | Update threshold dynamically (clamped to 0-1) |

#### Usage Example

```typescript
import { ref, watch } from 'vue'
import { useActiveSpeaker } from 'vuesip'
import type { Participant } from 'vuesip'

// Get participants from conference composable
const participants = ref<Participant[]>([])

const {
  activeSpeaker,
  activeSpeakers,
  isSomeoneSpeaking,
  speakerHistory,
  clearHistory,
  setThreshold,
} = useActiveSpeaker(participants, {
  threshold: 0.2,
  debounceMs: 500,
  historySize: 20,
  excludeMuted: true,
  onSpeakerChange: (current, previous) => {
    console.log(`Speaker changed from ${previous?.displayName} to ${current?.displayName}`)
  },
})

// Watch for active speaker changes
watch(activeSpeaker, (speaker) => {
  if (speaker) {
    console.log(`${speaker.displayName} is speaking at level ${speaker.audioLevel}`)
  }
})

// Check if anyone is speaking
if (isSomeoneSpeaking.value) {
  console.log(`${activeSpeakers.value.length} people are speaking`)
}

// Adjust sensitivity dynamically
setThreshold(0.1) // More sensitive

// Clear history
clearHistory()
```

#### Integration with Conference

```vue
<template>
  <div class="conference">
    <div
      v-for="participant in participants"
      :key="participant.id"
      :class="{ 'is-speaking': participant.id === activeSpeaker?.id }"
    >
      <span>{{ participant.displayName }}</span>
      <span v-if="participant.id === activeSpeaker?.id" class="speaker-indicator"> Speaking </span>
    </div>

    <div class="speaker-history">
      <h4>Recent Speakers</h4>
      <ul>
        <li v-for="entry in speakerHistory" :key="entry.startedAt">
          {{ entry.displayName }} (peak: {{ (entry.peakLevel * 100).toFixed(0) }}%)
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConference, useActiveSpeaker } from 'vuesip'

const { participants } = useConference(sipClient)
const { activeSpeaker, speakerHistory } = useActiveSpeaker(participants)
</script>
```

---

### useGalleryLayout

Provides reactive gallery layout calculations for displaying conference participants. Calculates optimal grid dimensions based on participant count and supports multiple layout modes.

**Source:** [`src/composables/useGalleryLayout.ts`](../../src/composables/useGalleryLayout.ts)

#### Signature

```typescript
function useGalleryLayout(
  participantCount: Ref<number>,
  options?: GalleryLayoutOptions
): UseGalleryLayoutReturn
```

#### Parameters

| Parameter                 | Type                  | Default | Description                                   |
| ------------------------- | --------------------- | ------- | --------------------------------------------- |
| `participantCount`        | `Ref<number>`         | -       | Reactive reference to number of participants  |
| `options.containerSize`   | `Ref<ContainerSize>`  | -       | Container size for dimension calculations     |
| `options.gap`             | `number`              | `8`     | Gap between tiles in pixels                   |
| `options.activeSpeakerId` | `Ref<string \| null>` | -       | Active speaker ID for speaker-focused layouts |
| `options.maxCols`         | `number`              | `4`     | Maximum columns                               |
| `options.maxRows`         | `number`              | `4`     | Maximum rows                                  |
| `options.aspectRatio`     | `number`              | `16/9`  | Aspect ratio for tiles (width/height)         |

#### Type Definitions

```typescript
type GalleryLayoutMode = 'grid' | 'speaker' | 'sidebar' | 'spotlight'

interface ContainerSize {
  width: number // Container width in pixels
  height: number // Container height in pixels
}

interface TileDimensions {
  width: number // Tile width in pixels
  height: number // Tile height in pixels
}
```

#### Grid Sizing Rules

| Participants | Grid Layout       |
| ------------ | ----------------- |
| 1            | 1×1               |
| 2            | 2×1               |
| 3-4          | 2×2               |
| 5-6          | 3×2               |
| 7-9          | 3×3               |
| 10-12        | 4×3               |
| 13+          | 4×4 or sqrt-based |

#### Returns: `UseGalleryLayoutReturn`

##### Reactive State

| Property               | Type                          | Description                      |
| ---------------------- | ----------------------------- | -------------------------------- |
| `layout`               | `Ref<GalleryLayoutMode>`      | Current layout mode              |
| `gridCols`             | `ComputedRef<number>`         | Number of grid columns           |
| `gridRows`             | `ComputedRef<number>`         | Number of grid rows              |
| `tileDimensions`       | `ComputedRef<TileDimensions>` | Calculated tile dimensions       |
| `gridStyle`            | `ComputedRef<string>`         | CSS grid style string            |
| `focusedParticipantId` | `ComputedRef<string \| null>` | Currently focused participant ID |
| `pinnedParticipantId`  | `Ref<string \| null>`         | Pinned participant ID            |

##### Methods

| Method             | Signature                           | Description                   |
| ------------------ | ----------------------------------- | ----------------------------- |
| `setLayout`        | `(mode: GalleryLayoutMode) => void` | Set layout mode               |
| `pinParticipant`   | `(id: string) => void`              | Pin a participant to focus    |
| `unpinParticipant` | `() => void`                        | Unpin the focused participant |

#### Usage Example

```typescript
import { ref, computed } from 'vue'
import { useGalleryLayout } from 'vuesip'

// Participant count from conference
const participantCount = ref(6)

// Container size from ResizeObserver
const containerSize = ref({ width: 1920, height: 1080 })

const {
  gridCols,
  gridRows,
  tileDimensions,
  gridStyle,
  focusedParticipantId,
  pinnedParticipantId,
  setLayout,
  pinParticipant,
  unpinParticipant,
} = useGalleryLayout(participantCount, {
  containerSize,
  gap: 16,
  maxCols: 4,
  maxRows: 4,
  aspectRatio: 16 / 9,
})

// gridCols.value = 3, gridRows.value = 2
// tileDimensions.value = { width: 624, height: 351 }

// Pin a specific participant
pinParticipant('participant-123')

// Switch to speaker layout
setLayout('speaker')
```

#### Vue Component Integration

```vue
<template>
  <div ref="containerRef" class="gallery-container" :style="gridStyle">
    <div
      v-for="participant in participants"
      :key="participant.id"
      class="participant-tile"
      :style="tileStyle"
      :class="{
        'is-focused': participant.id === focusedParticipantId,
        'is-pinned': participant.id === pinnedParticipantId,
      }"
      @click="pinParticipant(participant.id)"
    >
      <video :srcObject="participant.videoStream" autoplay playsinline />
      <span class="name">{{ participant.displayName }}</span>
    </div>
  </div>

  <div class="layout-controls">
    <button @click="setLayout('grid')">Grid</button>
    <button @click="setLayout('speaker')">Speaker</button>
    <button @click="setLayout('spotlight')">Spotlight</button>
    <button @click="unpinParticipant" :disabled="!pinnedParticipantId">Unpin</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConference, useGalleryLayout, useActiveSpeaker } from 'vuesip'

const containerRef = ref<HTMLElement | null>(null)
const containerSize = ref({ width: 0, height: 0 })

const { participants, participantCount } = useConference(sipClient)
const { activeSpeaker } = useActiveSpeaker(participants)

const activeSpeakerId = computed(() => activeSpeaker.value?.id ?? null)

const {
  gridCols,
  gridRows,
  tileDimensions,
  gridStyle,
  focusedParticipantId,
  pinnedParticipantId,
  setLayout,
  pinParticipant,
  unpinParticipant,
} = useGalleryLayout(participantCount, {
  containerSize,
  activeSpeakerId,
  gap: 8,
})

const tileStyle = computed(() => ({
  width: `${tileDimensions.value.width}px`,
  height: `${tileDimensions.value.height}px`,
}))

// Track container size
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        containerSize.value = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        }
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.gallery-container {
  width: 100%;
  height: 100%;
}

.participant-tile {
  position: relative;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.participant-tile.is-focused {
  outline: 2px solid #3b82f6;
}

.participant-tile.is-pinned {
  outline: 2px solid #22c55e;
}
</style>
```

#### Layout Modes

| Mode        | Description                                             |
| ----------- | ------------------------------------------------------- |
| `grid`      | Standard grid layout with equal-sized tiles             |
| `speaker`   | Focus on dominant speaker with smaller tiles for others |
| `sidebar`   | Main content with sidebar of participant tiles          |
| `spotlight` | Single participant in focus                             |

---

### useParticipantControls

Provides controls for individual conference participants including mute/unmute, kick, pin, and volume control with permission-based access.

**Source:** [`src/composables/useParticipantControls.ts`](../../src/composables/useParticipantControls.ts)

#### Signature

```typescript
function useParticipantControls(
  participant: Ref<Participant | null>,
  options?: ParticipantControlsOptions
): UseParticipantControlsReturn
```

#### Parameters

| Parameter                | Type                            | Default      | Description                                      |
| ------------------------ | ------------------------------- | ------------ | ------------------------------------------------ |
| `participant`            | `Ref<Participant \| null>`      | -            | Reactive reference to the participant to control |
| `options.isModerator`    | `Ref<boolean>`                  | `ref(false)` | Whether the current user is a moderator          |
| `options.isPinned`       | `Ref<boolean>`                  | `ref(false)` | Whether this participant is currently pinned     |
| `options.initialVolume`  | `number`                        | `1`          | Initial volume level (0-1)                       |
| `options.onMute`         | `(participant) => void`         | -            | Callback when participant is muted               |
| `options.onUnmute`       | `(participant) => void`         | -            | Callback when participant is unmuted             |
| `options.onKick`         | `(participant) => void`         | -            | Callback when participant is kicked              |
| `options.onPin`          | `(participant) => void`         | -            | Callback when participant is pinned              |
| `options.onUnpin`        | `(participant) => void`         | -            | Callback when participant is unpinned            |
| `options.onVolumeChange` | `(participant, volume) => void` | -            | Callback when volume changes                     |

#### Returns: `UseParticipantControlsReturn`

##### Reactive State

| Property  | Type                   | Description                                        |
| --------- | ---------------------- | -------------------------------------------------- |
| `canMute` | `ComputedRef<boolean>` | Can mute/unmute this participant (is moderator)    |
| `canKick` | `ComputedRef<boolean>` | Can kick this participant (is moderator, not self) |
| `canPin`  | `ComputedRef<boolean>` | Can pin this participant (has participant)         |
| `volume`  | `Ref<number>`          | Current volume level (0-1)                         |

##### Methods

| Method            | Signature                 | Description                                                             |
| ----------------- | ------------------------- | ----------------------------------------------------------------------- |
| `toggleMute`      | `() => void`              | Toggle mute state (requires moderator permission)                       |
| `kickParticipant` | `() => void`              | Kick participant from conference (requires moderator, cannot kick self) |
| `togglePin`       | `() => void`              | Toggle pin state                                                        |
| `setVolume`       | `(level: number) => void` | Set volume level (clamped to 0-1)                                       |

#### Usage Example

```typescript
import { ref } from 'vue'
import { useParticipantControls } from 'vuesip'
import type { Participant } from 'vuesip'

const participant = ref<Participant | null>({
  id: 'participant-1',
  displayName: 'John Doe',
  isMuted: false,
  isLocal: false,
  audioLevel: 0.5,
})

const isModerator = ref(true)
const isPinned = ref(false)

const { canMute, canKick, canPin, volume, toggleMute, kickParticipant, togglePin, setVolume } =
  useParticipantControls(participant, {
    isModerator,
    isPinned,
    initialVolume: 1,
    onMute: (p) => console.log(`Muted ${p.displayName}`),
    onUnmute: (p) => console.log(`Unmuted ${p.displayName}`),
    onKick: (p) => console.log(`Kicked ${p.displayName}`),
    onPin: (p) => console.log(`Pinned ${p.displayName}`),
    onUnpin: (p) => console.log(`Unpinned ${p.displayName}`),
    onVolumeChange: (p, v) => console.log(`${p.displayName} volume: ${v}`),
  })

// Check permissions before showing controls
if (canMute.value) {
  toggleMute()
}

if (canKick.value) {
  kickParticipant()
}

// Adjust volume
setVolume(0.5) // 50% volume
```

#### Vue Component Integration

```vue
<template>
  <div class="participant-controls" v-if="participant">
    <span class="name">{{ participant.displayName }}</span>

    <!-- Mute Button -->
    <button v-if="canMute" @click="toggleMute" :title="participant.isMuted ? 'Unmute' : 'Mute'">
      {{ participant.isMuted ? '🔇' : '🔊' }}
    </button>

    <!-- Volume Slider -->
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      :value="volume"
      @input="setVolume(parseFloat(($event.target as HTMLInputElement).value))"
      title="Volume"
    />

    <!-- Pin Button -->
    <button v-if="canPin" @click="togglePin" :class="{ active: isPinned }" title="Pin participant">
      📌
    </button>

    <!-- Kick Button -->
    <button v-if="canKick" @click="kickParticipant" class="kick-btn" title="Remove from conference">
      🚫
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useParticipantControls } from 'vuesip'
import type { Participant } from 'vuesip'

const props = defineProps<{
  participant: Participant | null
  isModerator: boolean
  isPinnedParticipant: boolean
}>()

const emit = defineEmits<{
  (e: 'pin', id: string): void
  (e: 'unpin'): void
  (e: 'kick', id: string): void
}>()

const participantRef = computed(() => props.participant)
const isModeratorRef = computed(() => props.isModerator)
const isPinnedRef = computed(() => props.isPinnedParticipant)

const { canMute, canKick, canPin, volume, toggleMute, kickParticipant, togglePin, setVolume } =
  useParticipantControls(participantRef, {
    isModerator: isModeratorRef,
    isPinned: isPinnedRef,
    onKick: (p) => emit('kick', p.id),
    onPin: (p) => emit('pin', p.id),
    onUnpin: () => emit('unpin'),
  })
</script>

<style scoped>
.participant-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}

button {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button.active {
  background: #3b82f6;
  color: white;
}

.kick-btn {
  background: #ef4444;
  color: white;
}

input[type='range'] {
  width: 80px;
}
</style>
```

#### Permission Matrix

| Action      | Requires                                        |
| ----------- | ----------------------------------------------- |
| Mute/Unmute | Moderator status                                |
| Kick        | Moderator status AND not self (isLocal = false) |
| Pin         | Participant exists                              |
| Volume      | Always available                                |

---

## Constants

All composables use centralized constants for configuration and magic numbers. These are exported from `src/composables/constants.ts`.

**Source:** [`src/composables/constants.ts`](../../src/composables/constants.ts)

### Available Constants

#### REGISTRATION_CONSTANTS

| Constant                  | Value   | Description                                     |
| ------------------------- | ------- | ----------------------------------------------- |
| `DEFAULT_EXPIRES`         | `600`   | Default registration expiry time in seconds     |
| `DEFAULT_MAX_RETRIES`     | `3`     | Default maximum retry attempts                  |
| `REFRESH_PERCENTAGE`      | `0.9`   | Registration refresh percentage (90% of expiry) |
| `EXPIRING_SOON_THRESHOLD` | `30`    | Seconds threshold for "expiring soon" warning   |
| `BASE_RETRY_DELAY`        | `1000`  | Base retry delay in milliseconds                |
| `MAX_RETRY_DELAY`         | `30000` | Maximum retry delay in milliseconds             |

#### PRESENCE_CONSTANTS

| Constant                          | Value  | Description                                     |
| --------------------------------- | ------ | ----------------------------------------------- |
| `DEFAULT_EXPIRES`                 | `3600` | Default presence publish expiry in seconds      |
| `SUBSCRIPTION_REFRESH_PERCENTAGE` | `0.9`  | Subscription refresh percentage (90% of expiry) |
| `DEFAULT_SUBSCRIPTION_EXPIRES`    | `3600` | Default subscription expiry in seconds          |

#### MESSAGING_CONSTANTS

| Constant                    | Value   | Description                                      |
| --------------------------- | ------- | ------------------------------------------------ |
| `COMPOSING_IDLE_TIMEOUT`    | `10000` | Composing indicator idle timeout in milliseconds |
| `COMPOSING_TIMEOUT_SECONDS` | `10`    | Composing indicator timeout in seconds           |

#### CONFERENCE_CONSTANTS

| Constant                   | Value  | Description                                       |
| -------------------------- | ------ | ------------------------------------------------- |
| `DEFAULT_MAX_PARTICIPANTS` | `10`   | Default maximum participants in a conference      |
| `AUDIO_LEVEL_INTERVAL`     | `100`  | Audio level monitoring interval in milliseconds   |
| `STATE_TRANSITION_DELAY`   | `2000` | Conference state transition delay in milliseconds |

#### TRANSFER_CONSTANTS

| Constant             | Value  | Description                                 |
| -------------------- | ------ | ------------------------------------------- |
| `COMPLETION_DELAY`   | `2000` | Transfer completion delay in milliseconds   |
| `CANCELLATION_DELAY` | `1000` | Transfer cancellation delay in milliseconds |

#### HISTORY_CONSTANTS

| Constant                | Value         | Description                       |
| ----------------------- | ------------- | --------------------------------- |
| `DEFAULT_LIMIT`         | `10`          | Default call history limit        |
| `DEFAULT_OFFSET`        | `0`           | Default offset for pagination     |
| `DEFAULT_SORT_ORDER`    | `'desc'`      | Default sort order                |
| `DEFAULT_SORT_BY`       | `'startTime'` | Default sort field                |
| `TOP_FREQUENT_CONTACTS` | `10`          | Top N frequent contacts to return |

#### CALL_CONSTANTS

| Constant               | Value   | Description                  |
| ---------------------- | ------- | ---------------------------- |
| `MAX_CONCURRENT_CALLS` | `5`     | Maximum concurrent calls     |
| `CALL_TIMEOUT`         | `30000` | Call timeout in milliseconds |
| `RING_TIMEOUT`         | `60000` | Ring timeout in milliseconds |

#### MEDIA_CONSTANTS

| Constant                  | Value  | Description                                    |
| ------------------------- | ------ | ---------------------------------------------- |
| `ENUMERATION_RETRY_DELAY` | `1000` | Device enumeration retry delay in milliseconds |
| `DEFAULT_TEST_DURATION`   | `2000` | Device test duration in milliseconds           |
| `AUDIO_LEVEL_THRESHOLD`   | `0.01` | Audio level threshold for device test (0-1)    |

#### DTMF_CONSTANTS

| Constant                 | Value  | Description                                |
| ------------------------ | ------ | ------------------------------------------ |
| `DEFAULT_DURATION`       | `100`  | Default DTMF tone duration in milliseconds |
| `DEFAULT_INTER_TONE_GAP` | `70`   | Default inter-tone gap in milliseconds     |
| `MIN_DURATION`           | `40`   | Minimum allowed duration in milliseconds   |
| `MAX_DURATION`           | `6000` | Maximum allowed duration in milliseconds   |
| `MAX_QUEUE_SIZE`         | `100`  | Maximum DTMF queue size                    |

#### TIMEOUTS

| Constant       | Value  | Description                                 |
| -------------- | ------ | ------------------------------------------- |
| `SHORT_DELAY`  | `1000` | Short delay for UI updates in milliseconds  |
| `MEDIUM_DELAY` | `2000` | Medium delay for operations in milliseconds |
| `LONG_DELAY`   | `5000` | Long delay for cleanup in milliseconds      |

#### RETRY_CONFIG

| Constant                                         | Value    | Description                            |
| ------------------------------------------------ | -------- | -------------------------------------- |
| `calculateBackoff(attempt, baseDelay, maxDelay)` | function | Calculate exponential backoff delay    |
| `BACKOFF_MULTIPLIER`                             | `2`      | Default exponential backoff multiplier |

### Usage Example

```typescript
import {
  REGISTRATION_CONSTANTS,
  DTMF_CONSTANTS,
  CONFERENCE_CONSTANTS,
  TIMEOUTS,
  RETRY_CONFIG,
} from '@/composables/constants'

// Use in your code
const expiryTime = REGISTRATION_CONSTANTS.DEFAULT_EXPIRES
const toneDuration = DTMF_CONSTANTS.DEFAULT_DURATION
const maxParticipants = CONFERENCE_CONSTANTS.DEFAULT_MAX_PARTICIPANTS

// Timeouts
const delay = TIMEOUTS.MEDIUM_DELAY

// Retry logic
const backoffDelay = RETRY_CONFIG.calculateBackoff(2, 1000, 30000)
```

---

## Type Definitions

All composables use TypeScript for type safety. Main type definitions can be found in:

- **Call Types:** `src/types/call.types.ts`
- **Media Types:** `src/types/media.types.ts`
- **History Types:** `src/types/history.types.ts`
- **Presence Types:** `src/types/presence.types.ts`
- **Messaging Types:** `src/types/messaging.types.ts`
- **Conference Types:** `src/types/conference.types.ts`
- **Transfer Types:** `src/types/transfer.types.ts`
- **SIP Types:** `src/types/sip.types.ts`
- **Config Types:** `src/types/config.types.ts`

---

## Best Practices

### 1. Lifecycle Management

Always ensure proper cleanup by using the `autoCleanup` option or manually cleaning up in `onUnmounted`:

```typescript
import { onUnmounted } from 'vue'

const { disconnect } = useSipClient(config, { autoCleanup: false })

onUnmounted(async () => {
  await disconnect()
})
```

### 2. Error Handling

All async methods can throw errors. Always wrap them in try-catch blocks:

```typescript
try {
  await connect()
  await register()
} catch (error) {
  console.error('Connection failed:', error)
}
```

### 3. Reactive State

Use computed properties and watch for reactive updates:

```typescript
import { watch } from 'vue'

const { isRegistered, registrationState } = useSipRegistration(sipClient)

watch(registrationState, (newState) => {
  console.log('Registration state changed:', newState)
})
```

### 4. Event Listeners

Always clean up event listeners to prevent memory leaks:

```typescript
const unsubscribe = onPresenceEvent((event) => {
  console.log('Presence event:', event)
})

// Later...
unsubscribe()
```

### 5. Shared Instances

When using multiple composables, share the SipClient instance:

```typescript
const sipClientRef = ref(null)

const sipClient = useSipClient(config)
sipClientRef.value = sipClient.getClient()

const registration = useSipRegistration(sipClientRef)
const callSession = useCallSession(sipClientRef)
const presence = usePresence(sipClientRef)
```

---

## Related Documentation

- [Core API Reference](./core.md)
- [Plugin System](./plugins.md)
- [Testing Guide](../testing-guide.md)
- [Getting Started](../index.md)
