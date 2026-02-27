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

- Enable `debug: true` when connecting so JsSIP debug logs are available.
- With `debug: true`, `SipClient` also logs an `Incoming called identity snapshot` object on every inbound INVITE. This includes:
  - `requestUri` (raw Request-URI)
  - `headers` (values for `To`, `P-Called-Party-ID`, `History-Info`, `Diversion`, plus any `customHeaderMap` headers)
  - `extracted` (`candidates`, `dialed`, `target`)
- Log `session.calledNumberCandidates` when validating a new provider.
- If your PBX/proxy rewrites the INVITE, focus first on `P-Called-Party-ID`, `History-Info`, and `Diversion`.

## Real header examples

The following examples show representative SIP header values for inbound INVITEs. Actual captures may vary by provider, PBX version, and forwarding/transfer settings. Use them to interpret `Incoming called identity snapshot` and to choose the right `calledIdentity` preset or precedence.

### Direct-to-provider (e.g. 46elks, Telnyx)

The DID is often in Request-URI and/or To:

```
INVITE sip:+46123456789@edge.46elks.com;transport=wss SIP/2.0
To: <sip:+46123456789@edge.46elks.com>
From: <sip:+46987654321@edge.46elks.com>;tag=...
```

- **Request-URI:** `sip:+46123456789@...` → dialed DID.
- **To:** same number here; with default precedence, `dialed` and `target` both resolve to this DID.

With forwarding, the provider may add Diversion:

```
To: <sip:1001@pbx.example.com>
Diversion: <sip:+46123456789@provider.com>;reason=unconditional
```

- **Dialed** (originally called): `+46123456789` from `Diversion`.
- **Target** (current To): `1001` from `To`. Use `dialedPrecedence` so that `diversion` is preferred for `dialed` when you need the original DID.

### FreePBX / Asterisk re-INVITE (provider → PBX → endpoint)

The provider sends the DID to the PBX; the PBX re-INVITEs the extension with Request-URI/To rewritten to the extension. The original DID is often only in P-Called-Party-ID, History-Info, or Diversion:

```
INVITE sip:1001@192.168.1.10:5060 SIP/2.0
To: <sip:1001@192.168.1.10>
P-Called-Party-ID: <sip:+46123456789@provider.com>
History-Info: <sip:+46123456789@provider.com>;index=1
```

- **Request-URI / To:** extension `1001` (current target).
- **P-Called-Party-ID / History-Info:** original DID `+46123456789`. With `preset: 'freepbx_pjsip'`, VueSip prefers these for `dialed`, so `session.calledNumberDialed` will be the DID, not the extension.

If the PBX only passes the DID in a custom header:

```
X-Called-DID: +46123456789
```

Configure `customHeaderMap` and `customHeaderPrecedence` as in the example in the FreePBX section above.

### Which header wins by default

- **Dialed** (originally called): default precedence is `['p-called-party-id', 'history-info', 'diversion', 'to', 'request-uri']`. The first header present with a valid value wins.
- **Target** (current INVITE target): default precedence is `['request-uri', 'to', 'p-called-party-id']`.

To override, set `calledIdentity.dialedPrecedence` and/or `calledIdentity.targetPrecedence` in your config (e.g. put `diversion` or `history-info` earlier for `dialed` when your provider puts the DID there).
