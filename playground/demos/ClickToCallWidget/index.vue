<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="button"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import EmbeddableButton from './EmbeddableButton.vue'
import EmbeddableButtonSrc from './EmbeddableButton.vue?raw'
import IntegrationConfig from './IntegrationConfig.vue'
import IntegrationConfigSrc from './IntegrationConfig.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A click-to-call widget is what happens when the whole dialer has to live as a single \`<script src>\` tag on someone else's marketing site. It's a much stricter brief than the internal softphone: host CSS can't leak in, host JS can't reach the SDP, and the visitor almost certainly hasn't granted microphone access before. The widget has to solve all three — style isolation via Shadow DOM, a same-origin iframe for the PeerConnection, and a first-time permission flow that survives a cold page load.

Two surfaces bracket this. The embeddable button is what the host site sees — a single floating or inline CTA that opens into a panel when tapped. The integration config is what the host site's developer sees — a snippet generator that writes the \`window.VueSIPWidget\` config the loader reads.`

const variants: DemoVariant[] = [
  {
    id: 'button',
    label: 'Embeddable button',
    description: 'How the widget actually renders inside a host page.',
    component: EmbeddableButton,
    source: EmbeddableButtonSrc,
    sourceName: 'EmbeddableButton.vue',
    intro: `The button is the whole product. When it's idle, it's a CTA that matches the host site's density without blending in so far that nobody clicks it. When it's ringing, it turns into a small panel with a pulse and a Cancel. When it's connected, the panel shows a duration timer and a Hang up. The state transitions are one-way — idle → ringing → on-call → ended → idle — and the visual language has to make the current state unambiguous from across the room.

The demo renders the widget inside a mock browser chrome on purpose. Widgets look different in context than in isolation, and every time a partner ships a button that looks great in Figma but wrong on their actual landing page, the problem is that nobody tested it against the real host's typography and background.`,
    keyPoints: [
      'Three themes (warm / mono / neon) cover ~90% of real host sites; more themes is a support burden without matching upside',
      'Ring-pulse is a CSS keyframe on a gradient — not a spinner — so it reads as "outgoing call" rather than "loading"',
      'Duration timer uses `font-variant-numeric: tabular-nums` so the digits don\'t jitter as they tick',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Ship the widget styles inside a Shadow DOM root. `all: initial` on the host element is not enough — it misses inherited CSS custom properties and the host\'s `font-family`.',
      },
      {
        kind: 'note',
        text: 'Twilio, Aircall, and Dialpad all ship widgets that look broadly like this — a floating CTA that expands into a small panel. The convergence is not accidental; it is what works.',
      },
      {
        kind: 'warning',
        text: 'Never auto-open the panel on page load. A surprise mic-permission prompt is a hostile first impression, and some browsers will silently deny the permission for the rest of the session.',
      },
    ],
    accessibility: [
      'Top-level state has `role="status"` + `aria-live="polite"` so transitions are announced without stealing focus.',
      'CTA button has an explicit `aria-label="Call {name}"` — the icon + sub-line are decorative.',
      'Theme picker is a `role="radiogroup"`; the colour swatches are paired with text labels.',
    ],
    takeaway:
      'The widget is the product. Shadow DOM for style isolation, one-way state transitions, never surprise the visitor with a permission prompt.',
  },
  {
    id: 'config',
    label: 'Integration config',
    description: 'Generate the copy-paste snippet with security policy baked in.',
    component: IntegrationConfig,
    source: IntegrationConfigSrc,
    sourceName: 'IntegrationConfig.vue',
    intro: `The snippet generator exists because nobody enjoys writing a hand-rolled config object. Every field in the form maps to exactly one key in \`window.VueSIPWidget\`, which the loader reads on \`DOMContentLoaded\`. The generated code is boring on purpose — it's a config blob plus a script tag — because clever snippets are how host sites end up with broken CSP and unexplained XSS vectors.

The security section is the load-bearing part. An \`allowlist\` of origins is checked at load time; calls from anywhere else refuse to establish. \`requireTls\` blocks loading over plain HTTP, which WebRTC doesn't permit anyway but some hosts get confused about. Rate-limiting is a visitor-scoped \`localStorage\` counter; it won't stop a determined attacker but it does stop the one bored visitor who discovered they can place 200 free international calls.`,
    keyPoints: [
      'The loader checks `window.location.origin` against the allowlist before doing anything else — fail fast, fail loudly',
      'Every option has a sensible default so a host that forgets to set anything still gets a working, restricted widget (no allowlist = widget refuses to load)',
      '`localStorage` rate-limit counters are scoped per visitor-origin pair — a shared kiosk browser still blocks on the third call even if the visitor clears cookies',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Use `rel="preconnect"` to the PBX WebSocket host from the snippet. TLS + WebSocket handshake + SIP REGISTER is a 600ms tax the user pays on the first click; preconnect halves it.',
      },
      {
        kind: 'note',
        text: 'CSP-friendly deploy: the widget is a single `<script src>` on a known origin. No `eval`, no inline `<script>` beyond the config object, so most hosts\' existing CSP policies accept it.',
      },
      {
        kind: 'warning',
        text: 'Never put SIP credentials in the client snippet. Use a short-lived token endpoint that the widget exchanges for a temporary SIP password scoped to one call.',
      },
    ],
    accessibility: [
      'All form inputs have explicit `aria-label` — the small eyebrow spans inside `<label>` are also announced first.',
      'Copy button turns from "Copy snippet" to "Copied ✓" and announces the change via `aria-label` update.',
      'Theme picker uses `role="radiogroup"` + swatch + text label — not colour-only.',
    ],
    takeaway:
      'A good snippet generator is deliberately boring. Validate origin, require TLS, rate-limit, and never leak credentials into host-page JS.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Widget calls will establish real INVITEs.'
      : 'Register to place calls; config and preview work regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport (WSS) — WebRTC requires secure context.',
  },
  {
    label: 'HTTPS host page',
    met: true,
    hint: '`getUserMedia` is blocked on plain HTTP in every current browser.',
  },
  {
    label: 'Short-lived token endpoint',
    met: true,
    hint: 'Back-end issues a temporary SIP password per call; never ship static credentials to the client.',
  },
])
</script>
