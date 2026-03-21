# Provider DID Routing Guide

This document describes how VueSIP extracts called number (DID) information from incoming SIP INVITE requests for supported providers.

## Overview

VueSIP extracts DID information from multiple SIP headers and follows a configurable precedence order. The extraction produces three values:

- **candidates**: All possible called numbers found in the INVITE
- **dialed**: The number that was originally dialed (before forwarding)
- **target**: The effective number/extension that received the call

## Supported Providers

### 46elks

**Header behavior:**
- `Request-URI`: Contains the full DID (e.g., `sip:46700000000@voip.46elks.com`)
- `To`: Same as Request-URI user part

**Typical INVITE:**
```
INVITE sip:46700000000@voip.46elks.com SIP/2.0
To: <sip:46700000000@voip.46elks.com>
```

**VueSIP extraction (default preset):**
- `dialed`: 46700000000 (from Request-URI)
- `target`: 46700000000 (from Request-URI)
- Both are identical since 46elks doesn't rewrite the INVITE

**Configuration:** Default preset works out of the box.

---

### Telnyx

**Header behavior:**
- `Request-URI`: Contains the DID (e.g., `sip:+15551234@sip.telnyx.com`)
- `To`: Contains the extension or SIP user (e.g., `<sip:1001@sip.telnyx.com>`)
- `P-Called-Party-ID`: Contains the original DID (e.g., `<sip:+15551234@sip.telnyx.com>`)

**Typical INVITE:**
```
INVITE sip:+15551234@sip.telnyx.com SIP/2.0
To: <sip:1001@sip.telnyx.com>
P-Called-Party-ID: <sip:+15551234@sip.telnyx.com>
```

**VueSIP extraction (default preset):**
- `dialed`: +15551234 (from P-Called-Party-ID, highest precedence)
- `target`: +15551234 (from Request-URI, highest precedence)
- The extension 1001 is available in candidates but not selected as dialed/target

**Configuration:** Default preset works out of the box. P-Called-Party-ID is preferred for dialed.

---

### FreePBX / Asterisk (PJSIP)

**Header behavior:**
- `Request-URI`: Rewritten to the extension (e.g., `sip:1001@pbx.example.com`)
- `To`: Contains the extension (e.g., `<sip:1001@pbx.example.com>`)
- `P-Called-Party-ID`: Contains the original DID (e.g., `<sip:+15550000@pbx.example.com>`)
- `History-Info`: May contain the original number with forwarding index

**Typical INVITE:**
```
INVITE sip:1001@pbx.example.com SIP/2.0
To: <sip:1001@pbx.example.com>
P-Called-Party-ID: <sip:+15550000@pbx.example.com>
```

**VueSIP extraction (freepbx_pjsip preset):**
- `dialed`: +15550000 (from P-Called-Party-ID)
- `target`: 1001 (from Request-URI)

**Configuration:** Use `preset: 'freepbx_pjsip'` in calledIdentity config:

```typescript
const config: SipClientConfig = {
  calledIdentity: {
    preset: 'freepbx_pjsip',
  },
}
```

---

## Header Precedence

### Default Precedence

**For target:**
1. Request-URI (highest)
2. To header
3. P-Called-Party-ID

**For dialed:**
1. P-Called-Party-ID (highest)
2. History-Info
3. Diversion
4. To header
5. Request-URI (lowest)

### Custom Header Mapping

You can map custom X-headers to dialed/target:

```typescript
const config: SipClientConfig = {
  calledIdentity: {
    customHeaderMap: {
      'X-My-DID': 'dialed',    // Map this header to dialed
      'X-Target-Line': 'target', // Map this header to target
    },
    customHeaderPrecedence: ['X-My-DID', 'X-Target-Line'],
  },
}
```

---

## Normalization

By default, VueSIP normalizes phone numbers:

- **stripSeparators**: Removes spaces, dashes, parentheses (default: true)
- **keepPlus**: Keeps the leading + for international format (default: true)

To disable:

```typescript
const config: SipClientConfig = {
  calledIdentity: {
    normalization: {
      enabled: true,
      stripSeparators: false,
      keepPlus: false,
    },
  },
}
```

---

## Testing

Run the unit tests to verify extraction:

```bash
npm test -- --run tests/unit/utils/calledIdentity.test.ts
```

The test suite includes scenarios for:
- 46elks direct INVITE
- Telnyx with P-Called-Party-ID
- FreePBX with extension rewrite
- History-Info precedence
- Diversion headers
- Custom X-header mapping
- Normalization options

---

## Debugging

Enable debug logging to see extraction details:

```typescript
const config: SipClientConfig = {
  debug: true,
  calledIdentity: {
    // ... config
  },
}
```

This logs:
- All headers found in the INVITE
- All candidates extracted
- Final dialed/target selection with source information
