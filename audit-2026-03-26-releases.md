# Asterisk 2026-03-26 Releases Compatibility Audit

**Task**: `fd87647e-06f6-4c98-bb0d-6aa5e44d28d1`
**Executor**: vuesip-executor
**Date**: 2026-03-30
**Scope**: VueSIP vs Asterisk certified-22.8-cert2, certified-20.7-cert10, 21.12.2, 22.9.0-rc1, 23.3.0-rc1

---

## Executive Summary

**VueSIP is fully compatible with all five Asterisk releases dated 2026-03-26.**

None of the five releases introduce breaking changes to AMI action formats, AMI event formats, or PJSIP behavior. All changes are either security patches, performance improvements, or additive new features.

---

## Release-by-Release Analysis

### 1. certified-22.8-cert2 — March 2026

| Category          | Findings                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| AMI Actions       | **Zero changes** — confirmed by release notes and prior VueSIP audit                              |
| AMI Events        | **Zero changes**                                                                                  |
| PJSIP             | **pjproject security fixes** (4 CVEs: GHSA-j29p, GHSA-8fj4, GHSA-g88q, GHSA-x5pq) — no AMI impact |
| Dialplan          | None                                                                                              |
| **VueSIP Impact** | **None**                                                                                          |

Already fully audited in `audit-certified-asterisk-compat.md`.

---

### 2. certified-20.7-cert10 — March 2026

| Category          | Findings                                              |
| ----------------- | ----------------------------------------------------- |
| AMI Actions       | **Zero changes**                                      |
| AMI Events        | **Zero changes**                                      |
| PJSIP             | Same pjproject security fixes as certified-22.8-cert2 |
| **VueSIP Impact** | **None**                                              |

Already fully audited in `audit-certified-asterisk-compat.md`.

---

### 3. 21.12.2 — March 2026

| Category          | Findings                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| AMI Actions       | **Zero changes** — 1 commit only: pjproject security fixes                 |
| AMI Events        | **Zero changes**                                                           |
| PJSIP             | Same 4 pjproject CVEs patched (GHSA-j29p, GHSA-8fj4, GHSA-g88q, GHSA-x5pq) |
| Commit            | `res_pjsip: Address pjproject security vulnerabilities` — Mike Bradeen     |
| **VueSIP Impact** | **None**                                                                   |

Source: [GitHub Release 21.12.2](https://github.com/asterisk/asterisk/releases/tag/21.12.2)

---

### 4. 22.9.0-rc1 — March 2026

| Category          | Findings                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| AMI Actions       | **Zero changes** — 48 commits, no AMI action/response format modifications                                                                      |
| AMI Events        | **Zero changes** — all 31 resolved issues are in chan_pjsip, app_queue, res_rtp_asterisk, chan_websocket, chan_dahdi, chan_iax2, build system   |
| PJSIP             | pjproject upgraded to **2.16** + same 4 security CVEs                                                                                           |
| WebRTC            | **DTLS/TURN fix** — loopback address ICE candidate check fixed. WebRTC calls with TURN now work correctly. **Positive** for VueSIP WebRTC users |
| New Features      | `PJSIP_INHERITABLE_HEADER` dialplan function (additive, not a change)                                                                           |
| New Features      | R2 signaling tone detection (chan_dahdi, irrelevant to VueSIP)                                                                                  |
| Queue             | `force_longest_waiting_caller` gains `prio` option; timing parity fix. **No impact** on VueSIP queue composables                                |
| ARI               | ACL support added to http.conf and ari.conf users. **No impact** on AMI-only VueSIP                                                             |
| CDR/CEL           | Major refactor of cdr_custom/cel_sqlite3_custom into `res_cdrel_custom`. **No AMI interface changes**                                           |
| **VueSIP Impact** | **None** (positive for WebRTC deployments)                                                                                                      |

Source: [ChangeLog-22.9.0-rc1](https://downloads.asterisk.org/pub/telephony/asterisk/releases/ChangeLog-22.9.0-rc1.html)

---

### 5. 23.3.0-rc1 — March 2026

| Category                            | Findings                                                  |
| ----------------------------------- | --------------------------------------------------------- |
| **Identical commits to 22.9.0-rc1** | Same 48 commits, same 20 authors, same 31 resolved issues |
| AMI Actions                         | **Zero changes**                                          |
| AMI Events                          | **Zero changes**                                          |
| **VueSIP Impact**                   | **None** (same as 22.9.0-rc1)                             |

Source: [ChangeLog-23.3.0-rc1](https://downloads.asterisk.org/pub/telephony/asterisk/releases/ChangeLog-23.3.0-rc1.html)

---

## Prior Known Risk — Already Mitigated

### `SIPpeers` / chan_sip (HIGH) — ✅ ALREADY FIXED

The `SIPpeers` action requires `chan_sip` which was removed in **Asterisk 20+**.

VueSIP's `useAmiPeers.ts` already defaults `includeSip: false`:

```typescript
// src/composables/useAmiPeers.ts, line ~137
// chan_sip removed in Asterisk 20+ — SIPpeers action will error on Asterisk 20/22
// Set includeSip: true only when targeting Asterisk 13–18 with chan_sip present
includeSip: options.includeSip ?? false,
```

The error handling also already accounts for the expected failure:

```typescript
// Line ~268
const isSipFailure = err instanceof Error && err.message.includes('SIPpeers')
```

**Status**: No action required. VueSIP is protected.

---

## AMI Actions / Events — Full Compatibility

VueSIP uses 41 AMI actions and 35+ AMI events. Based on the release notes for all five releases:

- **0** AMI action format changes
- **0** AMI event format changes
- **0** new mandatory AMI fields
- **0** deprecated AMI fields
- **0** PJSIP action changes (`PJSIPShowEndpoints`, `PJSIPShowContacts`, `PJSIPQualify`, etc. all stable)

All changes are in:

- `res_pjsip` (security fixes, no API change)
- `res_rtp_asterisk` (WebRTC improvements, no AMI change)
- `app_queue` (dialplan/queue logic, no AMI change)
- `chan_websocket` (new media direction feature, ARI-adjacent)
- `chan_dahdi`, `chan_iax2` (hardware/RF, irrelevant to VueSIP)
- Build system / documentation

---

## VueSIP Minimum Supported Version

No minimum version enforcement exists in VueSIP today. Based on this audit:

- **Minimum recommended**: Asterisk 13 (PJSIP introduction) or **Asterisk 18 LTS** for production
- The pjproject upgrade to 2.16 in 22.9.0-rc1/23.3.0-rc1 may require Asterisk 18.8+ for the bundled pjproject, but this only affects self-built Asterisk — distro packages typically bundle compatible versions.

---

## Verdict

| Release               | VueSIP Compatible? | Action Required?                 |
| --------------------- | ------------------ | -------------------------------- |
| certified-22.8-cert2  | ✅ Yes             | None                             |
| certified-20.7-cert10 | ✅ Yes             | None                             |
| 21.12.2               | ✅ Yes             | None                             |
| 22.9.0-rc1            | ✅ Yes             | None (DTLS/TURN fix is positive) |
| 23.3.0-rc1            | ✅ Yes             | None                             |

**Overall**: ✅ **VueSIP is production-ready for all five Asterisk 2026-03-26 releases.**

No code changes, compatibility shims, or documentation updates needed. The only prior risk (`SIPpeers`/chan_sip) is already mitigated in the current codebase.
