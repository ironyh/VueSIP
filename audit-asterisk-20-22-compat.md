# Asterisk 20/22 Compatibility Audit

**Subtask**: `bcec3271-61c9-4c42-930d-884012a5a8c6`
**Date**: 2026-03-29
**Scope**: res_ami, pjsip/chan_pjsip usage for Asterisk 20/22

---

## Architecture Overview

VueSIP connects to Asterisk via the **amiws WebSocket proxy**, which abstracts the raw TCP/TLS AMI connection. This means:

- VueSIP itself is not tightly coupled to specific Asterisk ABI versions
- AMI actions must still be version-compatible with the target Asterisk
- The amiws layer is a separate dependency that must also be compatible

---

## AMI Action Compatibility Analysis

### ✅ FULLY COMPATIBLE — PJSIP Actions (Asterisk 12+ → 20/22)

| Action                           | File                             | Compatibility               |
| -------------------------------- | -------------------------------- | --------------------------- |
| `PJSIPShowEndpoints`             | `useAmiPjsip.ts`, `AmiClient.ts` | ✅ Stable since Asterisk 12 |
| `PJSIPShowEndpoint`              | `useAmiPjsip.ts`                 | ✅ Stable since Asterisk 12 |
| `PJSIPShowContacts`              | `useAmiPjsip.ts`                 | ✅ Stable since Asterisk 12 |
| `PJSIPShowAors`                  | `useAmiPjsip.ts`                 | ✅ Stable since Asterisk 12 |
| `PJSIPShowTransports`            | `useAmiPjsip.ts`                 | ✅ Stable since Asterisk 12 |
| `PJSIPShowRegistrationsOutbound` | `useAmiPjsip.ts`                 | ✅ Stable                   |
| `PJSIPQualify`                   | `useAmiPjsip.ts`                 | ✅ Stable since Asterisk 12 |

All PJSIP actions are part of `res_pjsip` and are fully supported in both certified-22.8-cert2 and certified-20.7-cert10.

### ✅ FULLY COMPATIBLE — Core AMI Actions

| Action                                                                    | File                                                  | Compatibility          |
| ------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| `Originate`                                                               | `useAmiOriginate.ts`, `AmiClient.ts`, multiple others | ✅ Core AMI, unchanged |
| `Hangup`                                                                  | Multiple                                              | ✅ Core AMI, unchanged |
| `Ping`                                                                    | `useAmiSystem.ts`                                     | ✅ Core AMI, unchanged |
| `CoreStatus`                                                              | `useAmiSystem.ts`                                     | ✅ Core AMI, unchanged |
| `CoreShowChannels`                                                        | `useAmiSystem.ts`                                     | ✅ Core AMI, unchanged |
| `BridgeList`                                                              | `useAmiSystem.ts`                                     | ✅ Core AMI, unchanged |
| `DBPut`, `DBGet`, `DBGetTree`, `DBDel`, `DBDelTree`                       | `AmiClient.ts`, multiple                              | ✅ Core AMI, unchanged |
| `QueueStatus`, `QueueSummary`                                             | `AmiClient.ts`, `useAmiAgentStats.ts`                 | ✅ Core AMI, unchanged |
| `QueueAdd`, `QueuePause`, `QueueRemove`, `QueuePenalty`                   | `AmiClient.ts`                                        | ✅ Core AMI, unchanged |
| `PresenceState`, `PresenceStateChange`                                    | `AmiClient.ts`                                        | ✅ Core AMI, unchanged |
| `ExtensionState`                                                          | `AmiClient.ts`, `useAmiRingGroups.ts`                 | ✅ Core AMI, unchanged |
| `ParkedCalls`, `Parkinglots`, `Park`                                      | `useAmiParking.ts`                                    | ✅ Core AMI, unchanged |
| `MixMonitor`, `PauseMixMonitor`, `StopMixMonitor`                         | `useAmiRecording.ts`                                  | ✅ Core AMI, unchanged |
| `ConfbridgeList`, `ConfbridgeStartRecord`, etc.                           | `useAmiConfBridge.ts`                                 | ✅ Core AMI, unchanged |
| `Redirect`                                                                | `useAmiIVR.ts`                                        | ✅ Core AMI, unchanged |
| `ModuleLoad`, `ModuleCheck`                                               | `useAmiSystem.ts`                                     | ✅ Core AMI, unchanged |
| `VoicemailRefresh`, `MailboxCount`, `MailboxStatus`, `VoicemailUsersList` | `useAmiVoicemail.ts`                                  | ✅ Core AMI, unchanged |
| `MWIUpdate`, `MWIDelete`                                                  | `useAmiMWI.ts`                                        | ✅ Core AMI, unchanged |

### ⚠️ CONDITIONAL RISK — Legacy SIP (`SIPpeers`)

| Action     | File                                           | Risk                                    |
| ---------- | ---------------------------------------------- | --------------------------------------- |
| `SIPpeers` | `AmiClient.ts:getSipPeers()`, `useAmiPeers.ts` | ⚠️ **chan_sip removed in Asterisk 20+** |

**Details**:

- `AmiClient.getSipPeers()` sends `Action: SIPpeers`
- `useAmiPeers()` calls this by default when `includeSip: true` (the default)
- In Asterisk 20+, chan_sip is **removed entirely** — `SIPpeers` will return an error or empty list
- Peer entries with `channelType === 'SIP'` (as opposed to `'PJSIP'`) come from this action

**Code path**:

```
useAmiPeers(client, { includeSip: true })  // DEFAULT
  → client.getSipPeers()
    → Action: SIPpeers  ❌ FAILS on Asterisk 20/22
```

**Recommended fix**:

```typescript
// In useAmiPeers options, default includeSip to false for Asterisk 20+:
const config = {
  includeSip: options.includeSip ?? false, // chan_sip gone in Asterisk 20+
  includePjsip: options.includePjsip ?? true,
}
```

Or add version detection — if Asterisk version >= 20, disable SIP peers automatically.

---

## PJSIP Channel Format — COMPATIBLE

VueSIP constructs channel strings as `PJSIP/<endpoint>` throughout:

- `useAmiPaging.ts`: `PJSIP/${extension}`
- `useAmiSpy.ts`: parses `PJSIP/<name>-<id>` patterns
- `useAmiOriginate.ts`: `channel: 'PJSIP/...'`
- AMI types: examples consistently use `PJSIP/` prefix

This is the **only** format supported by Asterisk 20/22 (chan_sip is gone). ✅

---

## Asterisk Version Detection

VueSIP **does not currently detect or track the Asterisk server version**. There is no minimum version documented or enforced.

**Recommendation**: Add a version check on AMI connect:

```typescript
const response = await doAction({ Action: 'CoreStatus' })
// Parse Asterisk version from response.SoftwareVersion or similar
```

---

## amiws Proxy Layer

VueSIP depends on amiws for AMI access. Compatibility considerations:

- amiws is a thin WebSocket↔TCP proxy — it passes AMI actions/responses through
- No specific amiws version requirements are documented in the codebase
- Recommend verifying amiws works with Asterisk 20/22's AMI (minor version, mostly stable)

---

## Dialplan Dependencies

VueSIP does **not** have hard-coded dialplan context dependencies. Dialplan context names (`from-internal`, `ext-local`, etc.) are configured via user settings, not hardcoded. ✅

---

## Verdict

| Area                    | Status                                      |
| ----------------------- | ------------------------------------------- |
| PJSIP actions           | ✅ Fully compatible                         |
| Core AMI actions        | ✅ Fully compatible                         |
| Legacy SIP peers        | ⚠️ Fails on Asterisk 20+ (chan_sip removed) |
| Channel format (PJSIP/) | ✅ Compatible                               |
| Dialplan dependencies   | ✅ No hardcoded contexts                    |
| amiws compatibility     | ⚠️ Unverified (low risk — thin proxy)       |

**Overall**: VueSIP is compatible with Asterisk 20/22 for the PJSIP-only stack. The only breaking change is the legacy `SIPpeers` action, which should be disabled by default for Asterisk 20+ environments.

---

## Recommended Actions

1. **Change `includeSip` default to `false`** in `useAmiPeers` — the SIP peers feature is for chan_sip which doesn't exist in Asterisk 20+
2. **Add Asterisk version detection** on connect to auto-set `includeSip: false` for v20+
3. **Document minimum Asterisk version** as 13 (when PJSIP was introduced) or 18 (LTS)
4. **Update PJSIP types** if needed for any new fields in certified-22.8-cert2 changelog
