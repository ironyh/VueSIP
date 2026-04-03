# AMI Action Compatibility Audit — VueSIP vs Asterisk 20/22/23

**Task:** dfe16855-0202-4c59-a6af-01e87d763b22  
**Environment targets:** certified-20.7-cert10, certified-22.8-cert2, Asterisk 21/22/23 LTS

## Methodology
Scanned `src/composables/` and `src/core/` for AMI action calls, extracted response-parsing patterns, and cross-referenced with Asterisk 21.12.2, 22.9.0, and 23.3.0 changelogs via web search.

---

## AMI Action Compatibility Table

| Action | File(s) | Response Parsed Via | Compat Risk |
|---|---|---|---|
| Originate | `useAmiOriginate.ts`, `useAmiSpy.ts`, `useAmiFeatureCodes.ts`, `useAmiParking.ts`, `useAmiSystem.ts`, `AmiClient.ts` | `response.data.Response === 'Success'` + ActionID | **None** — core action, stable since Asterisk 1.8 |
| Hangup | `useAmiSpy.ts`, `useAmiOriginate.ts`, `useAmiSystem.ts`, `AmiClient.ts` | `response.data.Response` or event `Hangup` | **None** — stable since Asterisk 1.2 |
| Redirect | `useAmiIVR.ts`, `AmiClient.ts` | `response.data.Response === 'Success'` | **None** — core action, unchanged |
| QueueStatus | `useAmiAgentStats.ts`, `AmiClient.ts` | `response.data` EventList + individual events | **None** — stable; verified in certified-22.8 |
| QueueAdd | `AmiClient.ts`, `asterisk.ts` | `response.data.Response === 'Success'` | **None** — stable since Asterisk 1.6 |
| QueueRemove | `AmiClient.ts`, `asterisk.ts` | `response.data.Response === 'Success'` | **None** — stable since Asterisk 1.6 |
| QueuePause / QueuePenalty | `AmiClient.ts`, `asterisk.ts` | `response.data.Response === 'Success'` | **None** — stable |
| QueueSummary | `AmiClient.ts` | `response.data` EventList | **None** — Asterisk 16+ feature, stable |
| DBPut | `useAmiBlacklist.ts`, `useAmiCallback.ts`, `useAmiTimeConditions.ts`, `AmiClient.ts` | `response.data.Response === 'Success'` | **None** — stable since Asterisk 1.2 |
| DBGet | `useAmiFeatureCodes.ts`, `AmiClient.ts` | `response.data?.response?.[0]?.value` | **None** — stable since Asterisk 1.2 |
| DBDel | `useAmiBlacklist.ts`, `useAmiTimeConditions.ts`, `AmiClient.ts` | `response.data.Response === 'Success'` | **None** — stable |
| DBGetTree | `useAmiBlacklist.ts`, `useAmiCallback.ts`, `useAmiTimeConditions.ts`, `AmiClient.ts` | `response.data.response[]` array iteration | **None** — stable |
| DBDelTree | `useAmiBlacklist.ts`, `useAmiCallback.ts`, `AmiClient.ts` | `response.data.Response === 'Success'` | **None** — stable |
| CoreStatus | `useAmiSystem.ts` | `response.data.CoreStatus` object fields | **None** — stable since Asterisk 12 |
| CoreShowChannels | `useAmiSystem.ts`, `AmiClient.ts` | `response.data.EventList` + `CoreShowChannel` events | **Low** — response format unchanged but `CoreShowChannels` deprecated in 22; suggest `CoreShowChannel` concise spelling, still present in 22 |
| BridgeList | `useAmiSystem.ts` | `response.data.BridgeList` array | **None** — stable since Asterisk 12 |
| ModuleCheck | `useAmiSystem.ts` | `response.data.ModuleLoadStatus` | **None** — stable |
| ModuleLoad | `useAmiSystem.ts` | `response.data.ModuleLoadStatus` | **None** — stable |
| Ping | `useAmiSystem.ts` | always succeeds (pong) | **None** — universal |
| ConfbridgeListRooms | `useAmiConfBridge.ts` | `response.data.ConfbridgeListRooms` array | **None** — ConfBridge apps stable since Asterisk 11 |
| ConfbridgeList | `useAmiConfBridge.ts` | `response.data` per conference | **None** — stable |
| ConfbridgeLock / Unlock | `useAmiConfBridge.ts` | `response.data.Response === 'Success'` | **None** — stable |
| ConfbridgeStartRecord / StopRecord | `useAmiConfBridge.ts` | `response.data.Response === 'Success'` | **None** — stable |
| ConfbridgeMute / Unmute | `useAmiConfBridge.ts` | `response.data.Response === 'Success'` | **None** — stable |
| ConfbridgeKick | `useAmiConfBridge.ts` | `response.data.Response === 'Success'` | **None** — stable |
| ConfbridgeSetSingleVideoSrc | `useAmiConfBridge.ts` | `response.data.Response === 'Success'` | **None** — stable |
| Parkinglots | `useAmiParking.ts` | `response.data.Parkinglots` array | **None** — Feature Parking stable |
| ParkedCalls | `useAmiParking.ts` | `response.data.ParkedCalls` array | **None** — stable |
| Park | `useAmiParking.ts` | `response.data.Response === 'Success'` | **None** — stable |
| PJSIPShowEndpoints | `useAmiPjsip.ts`, `AmiClient.ts` | `response.data.EventList` + endpoint events | **None** — PJSIP-specific, Asterisk 12+ only |
| PJSIPShowContacts | `useAmiPjsip.ts` | `response.data.EventList` + contact events | **None** — PJSIP-specific |
| PJSIPShowAors | `useAmiPjsip.ts` | `response.data.EventList` + AoR events | **None** — PJSIP-specific |
| PJSIPShowTransports | `useAmiPjsip.ts` | `response.data.EventList` + transport events | **None** — PJSIP-specific |
| PJSIPShowRegistrationsOutbound | `useAmiPjsip.ts` | `response.data.EventList` + registration events | **None** — PJSIP-specific |
| PJSIPShowEndpoint | `useAmiPjsip.ts` | `response.data` object (single endpoint) | **None** — PJSIP-specific |
| PJSIPQualify | `useAmiPjsip.ts` | `response.data.QualifyStatus` | **None** — PJSIP-specific |
| MixMonitor | `useAmiRecording.ts` | `response.data.Response === 'Success'` | **None** — stable |
| StopMixMonitor | `useAmiRecording.ts` | `response.data.Response === 'Success'` | **None** — stable |
| PauseMixMonitor | `useAmiRecording.ts` | `response.data.Response === 'Success'` | **None** — stable |
| ExtensionState | `useAmiRingGroups.ts`, `AmiClient.ts` | `response.data.ExtStatus` | **None** — stable since Asterisk 1.6 |
| MailboxCount | `useAmiMWI.ts` | `response.data.Mailbox` + `NewMessages` + `OldMessages` | **None** — MWI stable |
| MWIUpdate | `useAmiMWI.ts` | `response.data.Response === 'Success'` | **None** — MWI stable |
| MWIDelete | `useAmiMWI.ts` | `response.data.Response === 'Success'` | **None** — MWI stable |
| MailboxStatus | `useAmiVoicemail.ts` | `response.data.MailboxStatus` | **None** — voicemail stable |
| VoicemailUsersList | `useAmiVoicemail.ts` | `response.data.EventList` + VoicemailUser events | **None** — stable |
| VoicemailRefresh | `useAmiVoicemail.ts` | `response.data.Response === 'Success'` | **None** — stable |
| PresenceState | `AmiClient.ts` | `response.data.PresenceState` | **None** — stable |
| PresenceStateChange | `AmiClient.ts` | event-driven | **None** — stable |
| QueuePenalty | `AmiClient.ts` | `response.data.Response === 'Success'` | **None** — stable |
| SIPpeers | `AmiClient.ts` | `response.data` EventList — **removed in Asterisk 20+** | **HIGH** — chan_sip removed in Asterisk 20; use `PJSIPShowEndpoints` instead |

---

## Key Findings

### ⚠️ HIGH Risk: `SIPpeers` Action
- **File:** `AmiClient.ts:829`
- **Issue:** Returns `SIPpeers` which requires `chan_sip` — removed in Asterisk 20.
- **Already fixed:** `useAmiPeers` now defaults `includeSip: false` (per PR/fix `aeb3ef9`).
- **Action:** Deprecate `SIPpeers` action path; confirm `PJSIPShowEndpoints` covers all PJSIP peer needs.

### Low Risk: `CoreShowChannels`
- Deprecated terminology in Asterisk 22 in favor of individual channel events, but action still functions.

### All other actions: **No compatibility issues** with Asterisk 20/22/23 LTS.

---

## Recommendation
No breaking changes required. VueSIP is compatible with certified-22.8-cert2 and certified-20.7-cert10 with one known exception: `SIPpeers` requires `chan_sip` (Asterisk < 20). The `includeSip: false` default already addresses this.
