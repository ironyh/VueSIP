# ADR-0001: Codecs Architecture and Best Practices

Status: Proposed

Date: 2026-01-16

Context

- We need a consistent, extensible way to detect, prefer, and negotiate audio/video codecs across browsers and SIP backends (JsSIP/WebRTC).
- Developers should be able to: query capabilities, set preferences/policies, and have negotiation applied automatically with safe fallbacks.
- Modern WebRTC offers `RTCRtpTransceiver.setCodecPreferences`; older stacks may require SDP reordering. SIP stacks may need SDP transformations.

Goals

- Provide a typed API to:
  - Inspect local codec capabilities by media kind.
  - Configure codec preferences and policies (global/per-kind/per-use-case).
  - Apply preferences during session setup using transceiver preferences when available; otherwise, SDP transformation.
  - Support auto-handshake policy that picks best mutually supported codec given remote capabilities.
- Keep it easy to adopt (one composable + optional config provider wiring) and easy to extend (pluggable policy and SDP transformer).

Design Overview

- Types and Interfaces (in `src/codecs/types.ts`):
  - `MediaKind`, `CodecId`, `CodecPreference`, `CodecPolicy`, `CodecMatch`, `CodecCapabilities`.
  - `SdpTransformer` interface for fallback SDP munging.
- Composable `useCodecs` (in `src/codecs/useCodecs.ts`):
  - `getLocalCapabilities(kind)` via `RTCRtpSender.getCapabilities`.
  - `setPreferences(prefs)` stores preferences/policy.
  - `applyToTransceiver(transceiver, kind)` uses `setCodecPreferences` if supported.
  - `negotiate(localCaps, remoteCaps, policy)` returns chosen ordered list.
  - `transformSdp(sdp)` applies fallback ordering via `SdpTransformer` when needed.
- Adapter Hook Integration:
  - Provide hooks to apply codec preferences before offer/answer.
  - For JsSIP adapter: when creating a call, after obtaining transceivers apply preferences; if not available, pass SDP through transformer prior to sending.

Best Practices & Standards

- Prefer Opus for audio; fallback to PCMU/PCMA when interop with legacy SIP is needed.
- Prefer VP8/VP9; allow H264 as fallback (baseline profile) when interop is required.
- Avoid codec forcing that breaks interoperability; always compute mutual support.
- Use `setCodecPreferences` where possible (safer than SDP munging).
- Keep SDP transforms minimal, idempotent, and isolated behind `SdpTransformer`.
- Detect and respect remote `fmtp` params (packetization, profile-level-id) when transforming SDP.

Developer Experience

- Single place to configure: `ConfigProvider` accepts `codecPolicy` with sane defaults.
- Renderless composable usable in apps or adapters.
- Clear types, examples, and test coverage for policy resolution.

Testing Strategy

- Unit tests: policy resolution, capability parsing, ordering decisions, and SDP transformer behavior with sample SDPs.
- Integration tests (mocked): ensure adapter applies preferences (transceiver path and fallback SDP path).

Open Questions

- How much legacy SDP interop do we support initially (e.g., telephone-event/DTMF payload mapping)?
- Should we expose per-call overrides vs. provider-level defaults only?

Decision

- Implement types + composable + minimal transformer, integrate with adapter hooks.
- Ship with conservative defaults and opt-in advanced policies.

Consequences

- Clear extension points for new codecs and vendor-specific constraints.
