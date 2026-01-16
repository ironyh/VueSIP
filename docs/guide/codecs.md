# Codecs & Negotiation

VueSIP supports policy‑based codec selection with automatic negotiation. Use the WebRTC transceiver API when available; fall back to safe SDP reordering for legacy paths.

## Quick Start

Global config (`SipClientConfig`):

```ts
import type { CodecPolicy } from 'vuesip'

const codecPolicy: CodecPolicy = {
  preferTransceiverApi: true,
  allowLegacyFallbacks: true,
  audio: [
    { id: 'opus', priority: 100 },
    { id: 'pcmu', priority: 50 },
  ],
  video: [
    { id: 'vp8', priority: 100 },
    { id: 'h264', priority: 70 },
  ],
}

await adapter.initialize({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'secret',
  codecPolicy,
})
```

Per‑call override:

```ts
await adapter.call('sip:2000@example.com', {
  codecPolicy: {
    audio: [{ id: 'pcmu', priority: 100 }],
    video: [{ id: 'h264', priority: 100 }],
  },
})
```

For incoming calls:

```ts
await session.answer({
  codecPolicy: { audio: [{ id: 'opus', priority: 100 }] },
})
```

## How It Works

- Prefer `RTCRtpTransceiver.setCodecPreferences` on supported browsers.
- If you disable the transceiver API (`preferTransceiverApi: false`), VueSIP applies a conservative SDP transform that reorders the `m=` line payload types for audio/video.
- No `fmtp` parameters are changed by default.

## Provider Presets & Playground

Open the playground and navigate to Utilities → Codec Policy & Negotiation to:

- Choose presets (Default, Asterisk/FreePBX, Telnyx, Twilio)
- Preview negotiated order with simulated remote profiles
- Save custom presets (export/import JSON)
- Place a test call with the current policy
- Toggle “Force SDP fallback” to test legacy interop

## Best Practices

- Default to Opus (audio) and VP8 (video), enable fallbacks only when interop requires it.
- Avoid forcing codecs that are not mutually supported.
- Prefer transceiver API; use SDP fallback for legacy or constrained environments.

## Reference

- API types: `CodecPolicy`, `CodecCapability`
- Composable: `useCodecs()` – capability discovery and policy ordering
- Developer docs: ADR‑0001 Codecs Architecture (`/adr/0001-codecs-architecture`)
