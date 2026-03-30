# AMI Event Usage Audit

**Subtask**: `3fb5cd06-93e2-4e53-bf54-ba5096133bfd`
**Date**: 2026-03-29
**Scope**: All AMI event subscriptions in VueSIP composables

---

## AMI Event Subscriptions Table

| Event Name                                  | File                                 | Handler Function                  | Notes                                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PresenceStateChange`                       | `AmiClient.ts`                       | `emit('presenceChange', ...)`     | Mapped in `handleEvent()`. Used via `useAmi`                                                                                                                           |
| `QueueMemberStatus`                         | `AmiClient.ts`                       | `emit('queueMemberStatus', ...)`  | Mapped in `handleEvent()`. Used by `useAmiQueues`, `useAmiAgentStats`                                                                                                  |
| `QueueCallerJoin`                           | `AmiClient.ts`                       | `emit('queueCallerJoin', ...)`    | Mapped in `handleEvent()`. Used by `useAmiQueues`                                                                                                                      |
| `QueueCallerLeave`                          | `AmiClient.ts`                       | `emit('queueCallerLeave', ...)`   | Mapped in `handleEvent()`. Used by `useAmiQueues`                                                                                                                      |
| `QueueCallerAbandon`                        | `AmiClient.ts`                       | `emit('queueCallerAbandon', ...)` | Mapped in `handleEvent()`. Used by `useAmiQueues`                                                                                                                      |
| `Newchannel`                                | `AmiClient.ts`                       | `emit('newChannel', ...)`         | Mapped in `handleEvent()`. Used by `useAmiCalls`, `useAmiBlacklist`                                                                                                    |
| `Hangup`                                    | `AmiClient.ts`                       | `emit('hangup', ...)`             | Mapped in `handleEvent()`. Used by `useAmiCalls`, `useAmiCallback`, `useAmiPaging`, `useAmiSpy`, `useAmiOriginate`, `useAmiRecording`, `useAmiIVR`, `useAmiRingGroups` |
| `Newstate`                                  | `AmiClient.ts`                       | `emit('newState', ...)`           | Mapped in `handleEvent()`. Used by `useAmiCalls`, `useAmiCallback`, `useAmiPaging`                                                                                     |
| `PeerStatus`                                | `AmiClient.ts`                       | `emit('peerStatus', ...)`         | Mapped in `handleEvent()`. Used by `useAmiPeers`                                                                                                                       |
| `AgentComplete`                             | `useAmiAgentStats.ts`                | `completeHandler`                 | Inside `event` filter. Used by `useAmiAgentStats`                                                                                                                      |
| `AgentRingNoAnswer`                         | `useAmiAgentStats.ts`                | `ringNoAnswerHandler`             | Inside `event` filter. Used by `useAmiAgentStats`                                                                                                                      |
| `Cdr`                                       | `useAmiCDR.ts`                       | `cdrHandler`                      | Inside `event` filter. Used by `useAmiCDR`                                                                                                                             |
| `ConfbridgeJoin`                            | `useAmiConfBridge.ts`                | `handleJoin`                      | Inside `event` filter. Used by `useAmiConfBridge`                                                                                                                      |
| `ConfbridgeLeave`                           | `useAmiConfBridge.ts`                | `handleLeave`                     | Inside `event` filter. Used by `useAmiConfBridge`                                                                                                                      |
| `ConfbridgeTalking`                         | `useAmiConfBridge.ts`                | `handleTalking`                   | Inside `event` filter. Used by `useAmiConfBridge`                                                                                                                      |
| `ConfbridgeListRooms`                       | `useAmiConfBridge.ts`                | list rooms response               | Inside `event` filter. Used by `useAmiConfBridge`                                                                                                                      |
| `ConfbridgeList`                            | `useAmiConfBridge.ts`                | list users response               | Inside `event` filter. Used by `useAmiConfBridge`                                                                                                                      |
| `ContactStatus`                             | `useAmiPjsip.ts`                     | `handleContactStatus`             | Inside `event` filter. Used by `useAmiPjsip`                                                                                                                           |
| `DeviceStateChange`                         | `useAmiPjsip.ts`                     | `handleDeviceState`               | Inside `event` filter. Used by `useAmiPjsip`                                                                                                                           |
| `EndpointList`                              | `useAmiPjsip.ts`                     | list endpoints response           | Parsed in `listEndpoints()`. Not a real-time event subscription                                                                                                        |
| `ContactList`                               | `useAmiPjsip.ts`                     | list contacts response            | Parsed in `listContacts()`. Not a real-time event subscription                                                                                                         |
| `AorList`                                   | `useAmiPjsip.ts`                     | list AORs response                | Parsed in `listAors()`. Not a real-time event subscription                                                                                                             |
| `TransportDetail`                           | `useAmiPjsip.ts`                     | list transports response          | Parsed in `listTransports()`. Not a real-time event subscription                                                                                                       |
| `OutboundRegistrationDetail`                | `useAmiPjsip.ts`                     | list registrations response       | Parsed in `listRegistrations()`. Not a real-time event subscription                                                                                                    |
| `DTMF`                                      | `useAmiIVR.ts`                       | `handleDTMFEvent`                 | Inside `event` filter. Used by `useAmiIVR`                                                                                                                             |
| `DTMFEnd`                                   | `useAmiIVR.ts`                       | `handleDTMFEvent`                 | Inside `event` filter. Used by `useAmiIVR`                                                                                                                             |
| `VarSet`                                    | `useAmiIVR.ts`                       | `handleVarSet`                    | Inside `event` filter. Used by `useAmiIVR`                                                                                                                             |
| `ExtensionStatus`                           | `useAmiRingGroups.ts`                | `handleExtensionStatus`           | Inside `event` filter. Used by `useAmiRingGroups`                                                                                                                      |
| `DeviceStateChange`                         | `useAmiRingGroups.ts`                | `handleExtensionStatus`           | Inside `event` filter. Used by `useAmiRingGroups`                                                                                                                      |
| `Dial`                                      | `useAmiRingGroups.ts`                | `handleDial`                      | Inside `event` filter. Used by `useAmiRingGroups`                                                                                                                      |
| `DialBegin`                                 | `useAmiRingGroups.ts`                | `handleDial`                      | Inside `event` filter. Used by `useAmiRingGroups`                                                                                                                      |
| `Bridge`                                    | `useAmiRingGroups.ts`                | `handleBridge`                    | Inside `event` filter. Used by `useAmiRingGroups`                                                                                                                      |
| `BridgeEnter`                               | `useAmiRingGroups.ts`                | `handleBridge`                    | Inside `event` filter. Used by `useAmiRingGroups`                                                                                                                      |
| `MessageWaiting`                            | `useAmiMWI.ts`                       | inside `event` filter             | Inside `event` filter. Used by `useAmiMWI`                                                                                                                             |
| `VoicemailUserEntry`                        | `useAmiVoicemail.ts`                 | inside `event` filter             | Inside `event` filter. Used by `useAmiVoicemail`                                                                                                                       |
| `VoicemailUserEntryComplete`                | `useAmiVoicemail.ts`                 | inside `event` filter             | Inside `event` filter. Used by `useAmiVoicemail`                                                                                                                       |
| `OriginateResponse`                         | `useAmiOriginate.ts`, `useAmiSpy.ts` | `handleOriginateResponse`         | Inside `event` filter. Used by both originate and spy                                                                                                                  |
| `DialBegin`                                 | `useAmiOriginate.ts`                 | `handleDialBegin`                 | Inside `event` filter. Used by `useAmiOriginate`                                                                                                                       |
| `DialEnd`                                   | `useAmiOriginate.ts`                 | `handleDialEnd`                   | Inside `event` filter. Used by `useAmiOriginate`                                                                                                                       |
| `ParkedCall`                                | `useAmiParking.ts`                   | inside `event` filter             | Inside `event` filter. Used by `useAmiParking`                                                                                                                         |
| `ParkedCallsComplete`                       | `useAmiParking.ts`                   | inside `event` filter             | Inside `event` filter. Used by `useAmiParking`                                                                                                                         |
| `Parkinglot`                                | `useAmiParking.ts`                   | inside `event` filter             | Inside `event` filter. Used by `useAmiParking`                                                                                                                         |
| `ParkinglotsComplete`                       | `useAmiParking.ts`                   | inside `event` filter             | Inside `event` filter. Used by `useAmiParking`                                                                                                                         |
| `Connected\|Transfer\|Bridge\|Rename\|Hold` | `useAmiParking.ts`                   | `onParkingEvent`                  | Generic parkinglot events                                                                                                                                              |
| `Newchannel`                                | `useAmiBlacklist.ts`                 | inside `event` filter             | Used to detect outgoing calls for blacklist check                                                                                                                      |

---

## Event Compatibility Assessment

All AMI events used by VueSIP are **stable, long-established events** present in Asterisk since at least Asterisk 13, and most since Asterisk 1.2/1.4. No events from Asterisk 22+ are used that didn't exist in earlier versions.

### Core Events (Asterisk 1.2+)

- `Newchannel`, `Hangup`, `Newstate`, `Dial`, `DialBegin`, `DialEnd`
- `Bridge`, `BridgeEnter`
- `ExtensionStatus`
- `Cdr`
- `VarSet`, `DTMF`, `DTMFEnd`
- `PresenceStateChange`

### Queue Events (Asterisk 1.2+)

- `QueueMemberStatus`, `QueueCallerJoin`, `QueueCallerLeave`, `QueueCallerAbandon`
- `AgentComplete`, `AgentRingNoAnswer`
- `Agentlogin`, `Agentlogoff` (implied)

### PJSIP Events (Asterisk 12+)

- `PeerStatus`, `ContactStatus`, `DeviceStateChange`
- `EndpointList`, `ContactList`, `AorList`, `TransportDetail`, `OutboundRegistrationDetail` (these are list response events, not subscriptions)

### ConfBridge Events (Asterisk 11+)

- `ConfbridgeJoin`, `ConfbridgeLeave`, `ConfbridgeTalking`
- `ConfbridgeList`, `ConfbridgeListRooms`

### Parking Events (Asterisk 1.6+)

- `ParkedCall`, `ParkedCallsComplete`
- `Parkinglot`, `ParkinglotsComplete`

### MWI/Voicemail Events (Asterisk 1.2+)

- `MessageWaiting`, `VoicemailUserEntry`, `VoicemailUserEntryComplete`

### Originate Events (Asterisk 1.2+)

- `OriginateResponse`

---

## Asterisk Version Notes

| Event             | Certified-20.7 | Certified-22.8 | Notes                     |
| ----------------- | -------------- | -------------- | ------------------------- |
| All core events   | ✅             | ✅             | Stable since Asterisk 1.2 |
| All queue events  | ✅             | ✅             | Stable since Asterisk 1.2 |
| PJSIP events      | ✅             | ✅             | Stable since Asterisk 12  |
| ConfBridge events | ✅             | ✅             | Stable since Asterisk 11  |
| Parking events    | ✅             | ✅             | Stable since Asterisk 1.6 |
| MWI/VM events     | ✅             | ✅             | Stable since Asterisk 1.2 |

**Conclusion**: No event compatibility issues found across all target Asterisk versions (certified-20.7-cert10, certified-22.8-cert2, 21.12.2, 22.9.0, 23.3.0).
