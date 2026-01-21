# Multi-DID (Called Line) Routing

VueSip can extract the _called number / line identity_ ("DID") from inbound INVITEs and expose it on the call session for UI labeling and routing.

This guide focuses on:

- Which SIP fields/headers commonly carry the called DID
- How this differs between direct-to-provider vs PBX (FreePBX/Asterisk)
- How to adjust VueSip's selection logic per provider

## What VueSip Extracts

On inbound calls, VueSip extracts a candidate list from several sources and then derives two concepts:

- `dialed`: the _originally called_ DID/line (best effort)
- `target`: the _current target_ of the INVITE (best effort)

The extracted values are available on the call session:

- `session.calledNumberCandidates[]`
- `session.calledNumberDialed`
- `session.calledNumberTarget`

## Configuring Selection Behavior

Use `SipClientConfig.calledIdentity` to choose a preset and/or override precedence:

```ts
import type { SipClientConfig } from 'vuesip'

const config: SipClientConfig = {
  uri: 'wss://pbx.example.com:8089/ws',
  sipUri: 'sip:1001@pbx.example.com',
  password: '***',
  calledIdentity: {
    preset: 'default',
    // dialedPrecedence: ['p-called-party-id', 'history-info', 'diversion', 'to', 'request-uri'],
    // targetPrecedence: ['request-uri', 'to', 'p-called-party-id'],
  },
}
```

Built-in presets:

- `default`
- `freepbx_pjsip`

## Provider Notes

### 46elks

Typical behavior (direct-to-provider):

- The DID is commonly visible in the INVITE `Request-URI` and/or `To`.
- Forwarding scenarios may add `Diversion`.

Recommendation:

- Start with `preset: 'default'`.
- If you use forwarding/redirect features heavily, consider prioritizing `diversion` and `history-info` higher for `dialed`.

### Telnyx

Typical behavior:

- `To` often reflects the dialed number.
- Some configurations include `P-Called-Party-ID` and/or `History-Info`.

Recommendation:

- Start with `preset: 'default'`.
- If you observe Telnyx preserving the dialed DID in `P-Called-Party-ID`, keep the default `dialedPrecedence` (it already prefers that).

### FreePBX / Asterisk (PJSIP)

Important distinction: provider leg vs endpoint leg.

When your softphone registers directly to a trunk/provider (no PBX in the middle), the dialed DID is commonly in `Request-URI` and/or `To`.

When FreePBX receives the provider call and then _re-INVITEs_ your endpoint, FreePBX often rewrites the INVITE target to an internal extension. In that case:

- `Request-URI` may contain the extension (not the DID)
- `To` may contain the extension (not the DID)

To preserve the original DID to the endpoint, FreePBX/Asterisk should pass it via one of:

- `P-Called-Party-ID` (preferred when available)
- `History-Info`
- `Diversion`

Recommendation:

- Use `preset: 'freepbx_pjsip'`.
- If you do not see a DID at the endpoint, verify which header is being passed by your FreePBX dialplan/trunk settings and map it with `customHeaderMap` if needed.

Example (custom header mapping):

```ts
calledIdentity: {
  preset: 'freepbx_pjsip',
  customHeaderMap: {
    'X-Original-To': 'dialed',
    'X-Called-DID': 'dialed',
  },
  customHeaderPrecedence: ['X-Called-DID', 'X-Original-To'],
}
```

## Debugging Tips

- Log `session.calledNumberCandidates` when validating a new provider.
- If your PBX/proxy rewrites the INVITE, focus first on `P-Called-Party-ID`, `History-Info`, and `Diversion`.
