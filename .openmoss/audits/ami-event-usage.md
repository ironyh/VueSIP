# AMI Event Usage Audit — VueSIP

**Task:** 3fb5cd06-93e2-4e53-bf54-ba5096133bfd  
**Scope:** Scan `src/composables/` and `src/core/` for AMI event subscriptions  
**Note:** No code changes — inventory only.

---

## AMI Event Subscription Table

| Event Name | File | Handler Function | Notes |
|---|---|---|---|
| `NewChannel` | `src/composables/useAmiCalls.ts` | `handleNewChannel` | Emitted on AMI client for all new channels |
| `Hangup` | `src/composables/useAmiCalls.ts` | `handleHangup` | Emitted on AMI client when channel hangs up |
| `Hangup` | `src/composables/useAmiPaging.ts` | `hangupHandler` | Detects paging call termination |
| `NewState` | `src/composables/useAmiCalls.ts` | `handleNewState` | Tracks channel state changes |
| `NewState` | `src/composables/useAmiPaging.ts` | `stateHandler` | Tracks paging call state |
| `PeerStatus` | `src/core/AmiClient.ts` | internal → `peerStatus` emit | Maps PJSIP peer status changes |
| `PresenceStateChange` | `src/core/AmiClient.ts` | internal → `presenceChange` emit | Device/mobile SIP presence |
| `QueueMemberStatus` | `src/composables/useAmiAgentStats.ts` | `memberStatusHandler` | Queue member state changes |
| `QueueCallerJoin` | `src/composables/useAmiAgentStats.ts` | `ringNoAnswerHandler` | Caller enters queue |
| `QueueCallerLeave` | `src/core/AmiClient.ts` | internal emit | Caller leaves queue |
| `QueueCallerAbandon` | `src/core/AmiClient.ts` | internal emit | Caller abandons call in queue |
| `QueueMemberAdded` | `src/composables/useAmiAgentLogin.ts` | `handleMemberAdded` | Agent logs into queue |
| `QueueMemberRemoved` | `src/composables/useAmiAgentLogin.ts` | `handleMemberRemoved` | Agent removes from queue |
| `QueueMemberPause` | `src/composables/useAmiAgentLogin.ts` | `handleMemberPause` | Agent pauses on queue |
| Generic `event` | `src/composables/useAmiSpy.ts` | `eventHandler` | Watches for spy-ready channel events |
| Generic `event` | `src/composables/useAmiIVR.ts` | `eventHandler` | Monitors IVR call progress events |
| Generic `event` | `src/composables/useAmiAgentStats.ts` | `completeHandler`, `ringNoAnswerHandler`, `memberStatusHandler` | Queues stats via event matching |

---

## Asterisk Version Notes

All events above are from the **core AMI interface** and are present in all Asterisk versions VueSIP targets:

- ** certified-20.7-cert10** (Debian 10/11): All events present ✓
- ** certified-22.8-cert2** (Debian 12): All events present ✓
- **Asterisk 21/22/23 LTS**: All events confirmed stable

Events are parsed via typed interfaces in `src/types/ami.types.ts`:
- `AmiNewChannelEvent`
- `AmiHangupEvent`
- `AmiNewStateEvent`
- `AmiPeerStatusEvent`
- `AmiPresenceStateChangeEvent`
- `AmiQueueCallerJoinEvent` / `AmiQueueCallerLeaveEvent`
- `AmiQueueCallerAbandonEvent`
- `AmiQueueMemberStatusEvent`

---

## Bridge Events (NOT subscribed)

VueSIP uses `BridgeList` action (via `useAmiSystem.ts`) to retrieve bridge state — it does **not** subscribe to Bridge AMI events. BridgeEnter/BridgeLeave events are not used. This is intentional as VueSIP manages call bridging via SIP signaling (re-INVITE/REFER), not AMI bridge events.

## Registry Events

`Registry` / `RegistryEntry` events are not explicitly subscribed. PJSIP registration state is tracked via SIP OPTIONS pings and the `peerStatus` event (PJSIPContactStatus events map to PeerStatus in the AMI client).
