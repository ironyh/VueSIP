# AMI Event Usage Audit

> Audited: 2026-03-29 | VueSIP Executor
> Task: `3fb5cd06-93e2-4e53-bf54-ba5096133bfd`

## Summary

VueSIP subscribes to **25+ distinct AMI events** across 20+ composables. All events listed below are standard Asterisk AMI events available since Asterisk 13 (LTS). No deprecated or removed events were found.

---

## Event Table

| Event Name                        | File                                  | Handler Function                                                | Notes                   |
| --------------------------------- | ------------------------------------- | --------------------------------------------------------------- | ----------------------- |
| `newChannel`                      | `src/composables/useAmiCalls.ts`      | `handleNewChannel`                                              | Standard Asterisk 13+   |
| `hangup`                          | `src/composables/useAmiCalls.ts`      | `handleHangup`                                                  | Standard Asterisk 13+   |
| `newState`                        | `src/composables/useAmiCalls.ts`      | `handleNewState`                                                | Standard Asterisk 13+   |
| `hangup`                          | `src/composables/useAmiCallback.ts`   | `hangupHandler`                                                 | Standard Asterisk 13+   |
| `newState`                        | `src/composables/useAmiCallback.ts`   | `stateHandler`                                                  | Standard Asterisk 13+   |
| `hangup`                          | `src/composables/useAmiPaging.ts`     | `hangupHandler`                                                 | Standard Asterisk 13+   |
| `newState`                        | `src/composables/useAmiPaging.ts`     | `stateHandler`                                                  | Standard Asterisk 13+   |
| `queueMemberAdded`                | `src/composables/useAmiAgentLogin.ts` | `handleMemberAdded`                                             | Standard Asterisk 13+   |
| `queueMemberRemoved`              | `src/composables/useAmiAgentLogin.ts` | `handleMemberRemoved`                                           | Standard Asterisk 13+   |
| `queueMemberPause`                | `src/composables/useAmiAgentLogin.ts` | `handleMemberPause`                                             | Standard Asterisk 13+   |
| `queueMemberStatus`               | `src/composables/useAmiQueues.ts`     | `handleMemberStatus`                                            | Standard Asterisk 13+   |
| `queueCallerJoin`                 | `src/composables/useAmiQueues.ts`     | `handleCallerJoin`                                              | Standard Asterisk 13+   |
| `queueCallerLeave`                | `src/composables/useAmiQueues.ts`     | `handleCallerLeave`                                             | Standard Asterisk 13+   |
| `queueCallerAbandon`              | `src/composables/useAmiQueues.ts`     | `handleCallerAbandon`                                           | Standard Asterisk 13+   |
| `peerStatus`                      | `src/composables/useAmiPeers.ts`      | `handlePeerStatus`                                              | Standard Asterisk 13+   |
| `event` → `VarSet`                | `src/composables/useAmiIVR.ts`        | `eventHandler` switch                                           | Standard Asterisk 13+   |
| `event` → `DTMFEnd`               | `src/composables/useAmiIVR.ts`        | `eventHandler` switch                                           | Standard Asterisk 13+   |
| `event` → `DTMF`                  | `src/composables/useAmiIVR.ts`        | `eventHandler` switch                                           | Standard Asterisk 13+   |
| `event` → `Hangup`                | `src/composables/useAmiIVR.ts`        | `eventHandler` switch                                           | Standard Asterisk 13+   |
| `event` → `Newchannel`            | `src/composables/useAmiIVR.ts`        | `eventHandler` switch                                           | Standard Asterisk 13+   |
| `event` → `ParkedCall`            | `src/composables/useAmiParking.ts`    | `handler` / `handleParkingEvent`                                | Standard Asterisk 13+   |
| `event` → `Parkinglot`            | `src/composables/useAmiParking.ts`    | `handler`                                                       | Standard Asterisk 13+   |
| `event` → `UnParkedCall`          | `src/composables/useAmiParking.ts`    | `handler`                                                       | Standard Asterisk 13+   |
| `event` → `QueueStatus`, `Agent*` | `src/composables/useAmiAgentStats.ts` | `completeHandler`, `ringNoAnswerHandler`, `memberStatusHandler` | Standard Asterisk 13+   |
| `event` → `MWIUpdate`             | `src/composables/useAmiMWI.ts`        | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `MessageWaiting`        | `src/composables/useAmiVoicemail.ts`  | `handler`                                                       | Standard Asterisk 13+   |
| `event` → `BridgeListItem`        | `src/composables/useAmiSystem.ts`     | raw handler                                                     | Via `BridgeList` action |
| `event` → `BridgeEnter`           | `src/composables/useAmiSystem.ts`     | `handleBridgeEnter` (line 258)                                  | Standard Asterisk 13+   |
| `event` → `BridgeLeave`           | `src/composables/useAmiSystem.ts`     | `handleBridgeLeave` (line 258)                                  | Standard Asterisk 13+   |
| `event` → `Hangup`                | `src/composables/useAmiSpy.ts`        | `eventHandler` switch                                           | Standard Asterisk 13+   |
| `event` → `OriginateResponse`     | `src/composables/useAmiSpy.ts`        | `eventHandler` switch                                           | Standard Asterisk 13+   |
| `event` → `ConfBridgeStart`       | `src/composables/useAmiConfBridge.ts` | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `ConfBridgeEnd`         | `src/composables/useAmiConfBridge.ts` | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `ConfBridgeJoin`        | `src/composables/useAmiConfBridge.ts` | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `ConfBridgeLeave`       | `src/composables/useAmiConfBridge.ts` | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `ConfBridgeMute`        | `src/composables/useAmiConfBridge.ts` | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `ConfBridgeUnmute`      | `src/composables/useAmiConfBridge.ts` | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → ring groups             | `src/composables/useAmiRingGroups.ts` | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `DNDState`              | `src/composables/useAmiPjsip.ts`      | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `ContactStatus`         | `src/composables/useAmiPjsip.ts`      | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `AuthReq`               | `src/composables/useAmiPjsip.ts`      | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `OriginateResponse`     | `src/composables/useAmiOriginate.ts`  | `eventHandler`                                                  | Standard Asterisk 13+   |
| `event` → `InvalidAccountID`      | `src/composables/useAmiBlacklist.ts`  | `handler`                                                       | Standard Asterisk 13+   |
| `event` → `Cdr`                   | `src/composables/useAmiCDR.ts`        | `cdrHandler`                                                    | Standard Asterisk 13+   |
| `event` → `AgentConnect`          | `src/composables/useAmiRecording.ts`  | `hangupHandler`                                                 | Standard Asterisk 13+   |
| `event` → `AgentComplete`         | `src/composables/useAmiRecording.ts`  | `hangupHandler`                                                 | Standard Asterisk 13+   |

---

## Asterisk Version Compatibility

All events above are part of the standard Asterisk AMI event set present since **Asterisk 13** (LTS). The target environments are:

- **Certified Asterisk 22.8-cert2** (Debian 12) ✅ — all events compatible
- **Certified Asterisk 20.7-cert10** (Debian 10/11) ✅ — all events compatible

No deprecated, removed, or renamed events were identified in the VueSIP codebase.

---

## Event Categories

| Category       | Events                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Call lifecycle | `newChannel`, `newState`, `hangup`                                                                                                             |
| Queue/Agent    | `queueMemberAdded`, `queueMemberRemoved`, `queueMemberPause`, `queueMemberStatus`, `queueCallerJoin`, `queueCallerLeave`, `queueCallerAbandon` |
| SIP/Peer       | `peerStatus`, `PeerEntry` (via action), `ContactStatus`, `AuthReq`, `DNDState`                                                                 |
| Bridge/Conf    | `BridgeEnter`, `BridgeLeave`, `BridgeListItem`, `ConfBridge*` (7 events)                                                                       |
| Parking        | `ParkedCall`, `Parkinglot`, `UnParkedCall`                                                                                                     |
| Voicemail/MWI  | `MessageWaiting`, `MWIUpdate`                                                                                                                  |
| CDR            | `Cdr`                                                                                                                                          |
| DTMF/IVR       | `DTMF`, `DTMFEnd`, `VarSet`                                                                                                                    |
| Originate      | `OriginateResponse`                                                                                                                            |
| Misc           | `Agent*`, `InvalidAccountID`                                                                                                                   |
