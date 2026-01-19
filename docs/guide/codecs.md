---
title: Codecs & Negotiation
outline: deep
---

# Codecs & Negotiation (Preview)

VueSip provides a preview `useCodecs` composable and a minimal SDP transformer to help prefer modern codecs (e.g., Opus) while maintaining interoperability with legacy SIP systems (e.g., G.711).

Key goals:

- Prefer best quality codecs (Opus) when possible
- Interoperate with legacy PBXs via G.711 (PCMU/PCMA)
- Use `RTCRtpTransceiver.setCodecPreferences` when available
- Fall back to safe SDP reordering when necessary

This feature is negotiation-only (no transcoding). Browsers don’t transcode audio between codecs; we order preferences to influence the offer/answer.

## Quick Start

```ts
import { useCodecs, DefaultSdpTransformer } from 'vuesip'

// Create a transformer for SDP fallback
const transformer = new DefaultSdpTransformer()

// Initialize with defaults (Opus first, allow G.711 fallbacks)
const { policy, getLocalCapabilities, applyToTransceiver, transformSdp } = useCodecs(
  undefined,
  transformer
)

// 1) Inspect local capabilities
const caps = getLocalCapabilities()
console.log(
  'Local audio codecs:',
  caps.audio.map((c) => c.mimeType)
)

// 2) Prefer codecs via transceiver when available
// Example in call setup (adapter or your WebRTC flow):
pc.getTransceivers().forEach((t) => {
  if (t.receiver.track?.kind === 'audio' || t.sender.track?.kind === 'audio') {
    applyToTransceiver(t, 'audio')
  }
})

// 3) SDP fallback (only when transceiver API unavailable)
const sdpOut = transformSdp(sdpIn, 'audio')
```

## Default Policy

The default policy is conservative and interoperable:

- Audio: Opus (preferred), then PCMU, then PCMA
- Video: VP9, VP8, then H264
- `preferTransceiverApi: true` — try `setCodecPreferences` first
- `allowLegacyFallbacks: true` — allow G.711 and H.264 baseline

Override with your own priorities:

```ts
const customPolicy = {
  preferTransceiverApi: true,
  allowLegacyFallbacks: true,
  audio: [
    { id: 'pcmu', priority: 100 },
    { id: 'opus', priority: 50 },
  ],
}

const codecs = useCodecs(customPolicy, transformer)
```

## Browser Behavior

- Chrome/Edge: `setCodecPreferences` supported on transceivers.
- Firefox/Safari: Partial or different behavior; use SDP fallback if needed.
- When falling back, we only reorder the m= line payloads for the target kind. We preserve `telephone-event` (DTMF) and `CN` (comfort noise) by keeping non-preferred payloads in their relative order.

## Opus Parameters (Optional)

You can attach fmtp hints in your policy if you also manage SDP parameters in your adapter:

```ts
audio: [{ id: 'opus', priority: 100, fmtp: { ptime: 20, stereo: 0, useinbandfec: 1, usedtx: 1 } }]
```

Note: The provided transformer focuses on safe reordering. If you need fmtp updates, do so in your adapter’s SDP handling with care.

## Adapter Integration

Where you create offers/answers:

1. Try transceiver preferences right after transceivers exist
2. If not supported, pass SDP through `transformSdp(sdp, 'audio')` before sending.

This keeps negotiation safe and minimal.

## Testing

Unit tests cover policy ordering, mutual capability filtering, and SDP reordering, including:

- Preserving `telephone-event` and `CN`
- Unknown PT handling (no rtpmap)
- Video m= reordering
- Single-section transform

See: `tests/unit/codecs/*`

## Design Notes

Architecture overview: `docs/adr/0001-codecs-architecture.md`

This is a preview API. Feedback welcome as we expand adapter hooks and examples.
