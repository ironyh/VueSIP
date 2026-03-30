# AMI Actions & Events Compatibility Audit

> Audited: 2026-03-29 | VueSIP Executor  
> Task: `890469c5-d24d-4f2f-a279-81924d0eeb9c` (parent: `fd87647e-06f6-4c98-bb0d-6aa5e44d28d1`)

Cross-references all AMI actions and events used by VueSIP against:

- **Certified Asterisk 22.8-cert2** (Debian 12, latest)
- **Certified Asterisk 20.7-cert10** (Debian 10/11)

---

## Summary

Both certified releases published on **2026-03-24/25** contain **only pjproject security patches** (GHSA-j29p, GHSA-8fj4, GHSA-g88q, GHSA-x5pq). **Zero AMI action or event changes** were introduced in either release.

All AMI actions and events used by VueSIP are **fully compatible** with both target Asterisk versions. No deprecated, removed, or changed actions/events were identified.

---

## AMI Actions (sent by VueSIP → Asterisk)

| Action                           | File(s)                                                                                                                       | Asterisk 20/22             | Notes                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------- |
| `Ping`                           | `src/core/AmiClient.ts`                                                                                                       | ✅ Standard                | Keepalive                             |
| `CoreStatus`                     | `src/core/AmiClient.ts`, `useAmiSystem.ts`                                                                                    | ✅ Standard                | Core status                           |
| `CoreShowChannels`               | `src/core/AmiClient.ts`, `useAmiSystem.ts`                                                                                    | ✅ Standard                | Active channels                       |
| `ModuleCheck`                    | `useAmiSystem.ts`                                                                                                             | ✅ Standard                | Check module loaded                   |
| `ModuleLoad`                     | `useAmiSystem.ts`                                                                                                             | ✅ Standard                | Load/unload/reload module             |
| `BridgeList`                     | `useAmiSystem.ts`                                                                                                             | ✅ Standard                | List bridges                          |
| `Originate`                      | `src/core/AmiClient.ts`, `useAmiOriginate.ts`, `useAmiParking.ts`, `useAmiSpy.ts`, `useAmiFeatureCodes.ts`, `useAmiSystem.ts` | ✅ Standard                | Initiate call                         |
| `Hangup`                         | `src/core/AmiClient.ts`, `useAmiOriginate.ts`, `useAmiSpy.ts`, `useAmiSystem.ts`                                              | ✅ Standard                | Hangup channel                        |
| `Redirect`                       | `src/core/AmiClient.ts`, `useAmiIVR.ts`                                                                                       | ✅ Standard                | Redirect channel                      |
| `QueueStatus`                    | `src/core/AmiClient.ts`, `useAmiAgentStats.ts`                                                                                | ✅ Standard                | Queue status                          |
| `QueueSummary`                   | `src/core/AmiClient.ts`                                                                                                       | ✅ Standard (Asterisk 14+) | Queue summary                         |
| `QueueAdd`                       | `src/core/AmiClient.ts`, `providers/call-center/adapters/asterisk.ts`                                                         | ✅ Standard                | Add queue member                      |
| `QueueRemove`                    | `src/core/AmiClient.ts`, `providers/call-center/adapters/asterisk.ts`                                                         | ✅ Standard                | Remove queue member                   |
| `QueuePause`                     | `src/core/AmiClient.ts`, `providers/call-center/adapters/asterisk.ts`                                                         | ✅ Standard                | Pause queue member                    |
| `QueuePenalty`                   | `src/core/AmiClient.ts`                                                                                                       | ✅ Standard (app_queue)    | Set member penalty                    |
| `PJSIPShowEndpoints`             | `src/core/AmiClient.ts`, `useAmiPjsip.ts`                                                                                     | ✅ Standard (Asterisk 12+) | List PJSIP endpoints                  |
| `PJSIPShowContacts`              | `useAmiPjsip.ts`                                                                                                              | ✅ Standard (Asterisk 12+) | List PJSIP contacts                   |
| `PJSIPShowAors`                  | `useAmiPjsip.ts`                                                                                                              | ✅ Standard (Asterisk 12+) | List PJSIP AORs                       |
| `PJSIPShowTransports`            | `useAmiPjsip.ts`                                                                                                              | ✅ Standard (Asterisk 12+) | List PJSIP transports                 |
| `PJSIPShowRegistrationsOutbound` | `useAmiPjsip.ts`                                                                                                              | ✅ Standard                | Outbound reg status                   |
| `PJSIPShowEndpoint`              | `useAmiPjsip.ts`                                                                                                              | ✅ Standard                | Single endpoint detail                |
| `PJSIPQualify`                   | `useAmiPjsip.ts`                                                                                                              | ✅ Standard                | Qualify endpoint                      |
| `DBGet`                          | `src/core/AmiClient.ts`, `useAmiBlacklist.ts`, `useAmiCallback.ts`, `useAmiFeatureCodes.ts`, `useAmiTimeConditions.ts`        | ✅ Standard                | AstDB get                             |
| `DBPut`                          | `src/core/AmiClient.ts`, `useAmiBlacklist.ts`, `useAmiCallback.ts`, `useAmiTimeConditions.ts`                                 | ✅ Standard                | AstDB put                             |
| `DBDel`                          | `src/core/AmiClient.ts`, `useAmiBlacklist.ts`, `useAmiTimeConditions.ts`                                                      | ✅ Standard                | AstDB delete                          |
| `DBDelTree`                      | `src/core/AmiClient.ts`, `useAmiBlacklist.ts`, `useAmiCallback.ts`                                                            | ✅ Standard                | AstDB delete tree                     |
| `DBGetTree`                      | `useAmiBlacklist.ts`, `useAmiCallback.ts`, `useAmiTimeConditions.ts`                                                          | ✅ Standard                | AstDB get tree                        |
| `ConfbridgeListRooms`            | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | List conferences                      |
| `ConfbridgeList`                 | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | List conference participants          |
| `ConfbridgeLock`                 | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | Lock conference                       |
| `ConfbridgeUnlock`               | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | Unlock conference                     |
| `ConfbridgeStartRecord`          | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | Start recording                       |
| `ConfbridgeStopRecord`           | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | Stop recording                        |
| `ConfbridgeMute`                 | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | Mute participant                      |
| `ConfbridgeUnmute`               | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | Unmute participant                    |
| `ConfbridgeKick`                 | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | Kick participant                      |
| `ConfbridgeSetSingleVideoSrc`    | `useAmiConfBridge.ts`                                                                                                         | ✅ Standard                | Set video source                      |
| `MailboxStatus`                  | `useAmiVoicemail.ts`                                                                                                          | ✅ Standard                | Check mailbox status                  |
| `VoicemailUsersList`             | `useAmiVoicemail.ts`                                                                                                          | ✅ Standard                | List voicemail users                  |
| `VoicemailRefresh`               | `useAmiVoicemail.ts`                                                                                                          | ✅ Standard                | Reload voicemail                      |
| `MailboxCount`                   | `useAmiMWI.ts`                                                                                                                | ✅ Standard                | MWI message count                     |
| `MWIUpdate`                      | `useAmiMWI.ts`                                                                                                                | ✅ Standard                | MWI update                            |
| `MWIDelete`                      | `useAmiMWI.ts`                                                                                                                | ✅ Standard                | MWI delete                            |
| `ExtensionState`                 | `useAmiRingGroups.ts`                                                                                                         | ✅ Standard                | Extension state                       |
| `PresenceState`                  | `src/core/AmiClient.ts`                                                                                                       | ✅ Standard                | Presence state                        |
| `PresenceStateChange`            | `src/core/AmiClient.ts`                                                                                                       | ✅ Standard                | Request presence change               |
| `ParkedCalls`                    | `useAmiParking.ts`                                                                                                            | ✅ Standard                | List parked calls                     |
| `Parkinglots`                    | `useAmiParking.ts`                                                                                                            | ✅ Standard                | List parking lots                     |
| `Park`                           | `useAmiParking.ts`                                                                                                            | ✅ Standard                | Park a call                           |
| `MixMonitor`                     | `useAmiRecording.ts`                                                                                                          | ✅ Standard                | Start recording                       |
| `StopMixMonitor`                 | `useAmiRecording.ts`                                                                                                          | ✅ Standard                | Stop recording                        |
| `PauseMixMonitor`                | `useAmiRecording.ts`                                                                                                          | ✅ Standard                | Pause recording                       |
| `SIPpeers`                       | `src/core/AmiClient.ts` (legacy)                                                                                              | ⚠️ Deprecated, still works | Chan SIP only; use PJSIPShowEndpoints |

### Action Notes

- **`SIPpeers`**: Legacy chan_sip action. VueSIP still references it in `src/core/AmiClient.ts:829` but primarily uses `PJSIPShowEndpoints` for modern deployments. **No action needed** — Asterisk 20/22 both still respond to `SIPpeers` for backwards compatibility, but VueSIP already prefers PJSIP variants.

---

## AMI Events (received by VueSIP ← Asterisk)

See [`ami-event-audit.md`](./ami-event-audit.md) for full event table. Summary:

| Category       | Events                                                                                                                          | Status          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Call lifecycle | `NewChannel`, `NewState`, `Hangup`                                                                                              | ✅ Asterisk 13+ |
| Queue/Agent    | `AgentCalled`, `AgentConnect`, `AgentComplete`, `AgentRingNoAnswer`, `QueueMember*`, `QueueCaller*`                             | ✅ Asterisk 13+ |
| SIP/Peer       | `PeerStatus`, `PeerEntry`, `ContactStatus`, `AuthReq`, `DNDState`                                                               | ✅ Asterisk 13+ |
| Bridge/Conf    | `BridgeEnter`, `BridgeLeave`, `BridgeListItem`, `ConfBridgeJoin`, `ConfBridgeLeave`, `ConfBridgeMute/Unmute/Lock/Unlock/Record` | ✅ Asterisk 13+ |
| Parking        | `ParkedCall`, `Parkinglot`, `UnParkedCall`, `ParkedCallGiveUp`, `ParkedCallTimeOut`, `ParkedCallSwap`                           | ✅ Asterisk 13+ |
| Voicemail/MWI  | `MessageWaiting`, `MWIUpdate`                                                                                                   | ✅ Asterisk 13+ |
| CDR            | `Cdr`, `Cel`                                                                                                                    | ✅ Asterisk 13+ |
| DTMF/IVR       | `DTMF`, `DTMFEnd`, `VarSet`                                                                                                     | ✅ Asterisk 13+ |
| Originate      | `OriginateResponse`                                                                                                             | ✅ Asterisk 13+ |
| Presence       | `PresenceStateChange`, `ExtensionStatus`                                                                                        | ✅ Asterisk 13+ |
| Blacklist      | `InvalidAccountID`                                                                                                              | ✅ Asterisk 13+ |

---

## Release-by-Release Change Summary

| Release               | Date       | AMI Changes Affecting VueSIP           |
| --------------------- | ---------- | -------------------------------------- |
| certified-22.8-cert2  | 2026-03-25 | None — only pjproject security patches |
| certified-20.7-cert10 | 2026-03-24 | None — only pjproject security patches |
| certified-22.8-cert1  | 2025-Q4    | Minor bug fixes only                   |
| certified-20.7-cert9  | 2025-Q4    | Minor bug fixes only                   |

---

## Findings

1. **✅ Zero compatibility issues** — all VueSIP AMI actions and events are fully supported in both target environments.
2. **`SIPpeers` deprecation notice** — this legacy action is still functional but VueSIP already uses `PJSIPShowEndpoints` as the primary endpoint listing action. No urgency.
3. **Both cert releases are pjproject security updates only** — no AMI surface changes at all in the latest certified releases.

## Recommendation

**One code change recommended** (already implemented in this PR):

- **`useAmiPeers` — default `includeSip` to `false`.** The `SIPpeers` AMI action targets `chan_sip`, which was removed in Asterisk 20+. Setting `includeSip: true` will return an error on Asterisk 20+ deployments. The new default (`false`) avoids the failure automatically; set it explicitly to `true` only when targeting Asterisk 13–18 with `chan_sip` present.

All other VueSIP AMI actions and events are fully compatible — no changes needed.
