<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="launcher"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import UriLauncher from './UriLauncher.vue'
import UriLauncherSrc from './UriLauncher.vue?raw'
import NumberParser from './NumberParser.vue'
import NumberParserSrc from './NumberParser.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Click-to-call is the oldest shortcut in enterprise telephony: a user sees a phone number in a web page, CRM record, or email and wants to dial it without retyping. Two distinct problems hide inside that one sentence. First, recognising what's callable — \`tel:\` and \`sip:\` URIs have unambiguous schemes, but most real numbers in the wild are naked digits embedded in prose. Second, handing the parsed number off to an actual dialer: the browser's URI handler, the AMI \`Originate\` for agent-first flows, or a direct WebRTC INVITE.

These two surfaces bracket the whole problem. The URI launcher trusts the page: schemes are declared, confidence is high, just fire the handler. The parser trusts nothing: regex over a blob, country-inference from a dropdown, a confirmation step before any INVITE touches the wire.`

const variants: DemoVariant[] = [
  {
    id: 'launcher',
    label: 'URI launcher',
    description: 'Detect tel: / sip: / callto: in marked text and call with one click.',
    component: UriLauncher,
    source: UriLauncherSrc,
    sourceName: 'UriLauncher.vue',
    intro: `\`tel:\` is a standard (RFC 3966), \`sip:\` and \`sips:\` are older still (RFC 3261), and \`callto:\` is a Skype-era relic that somehow survives in LinkedIn and signature footers. Handling all three cleanly is mostly about hand-off: \`tel:\` hits the OS default, \`sip:\` hits whichever app registered for it (your softphone, hopefully), and \`callto:\` gets reinterpreted as whatever you decide.

The confidence score matters because \`tel:\` URIs in signatures are almost always cleanly formatted, but bare numbers in running text aren't. Having the parser expose its own uncertainty — 85% vs. 100% — lets the host UI hide low-confidence matches or group them. Softphones that auto-dial on 70% matches will auto-dial ZIP codes and order numbers; ask any support engineer.`,
    keyPoints: [
      '`tel:` URIs per RFC 3966 may carry `;ext=` and `;phone-context=` parameters — pass them through verbatim, do not flatten them into the digits',
      '`sip:` URIs are reached by your softphone only if `navigator.registerProtocolHandler` was called once successfully, which Chromium silently rejects inside iframes — register from the top-level page',
      'Keep `callto:` support behind a feature flag; it is the single most common false-positive source in parsed text',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Underline-dash styling for detected numbers, not a solid link underline. It reads as "this is callable" without suggesting navigation.',
      },
      {
        kind: 'note',
        text: 'Chromium registers `tel:` handlers per-origin and surfaces a permission prompt the first time; Safari uses OS-wide `LSHandlers`; Firefox keeps its own registry. The UX differs but the URI shape does not.',
      },
      {
        kind: 'warning',
        text: 'Never auto-launch on hover. Accidental calls to customer numbers are a support-contract liability; always require an explicit click.',
      },
    ],
    accessibility: [
      'Scheme filter buttons form a `role="radiogroup"` with `aria-checked` — one of each can be toggled independently.',
      'Each detected row has a `Call` button with `aria-label` naming the full URI: "Call sip:alex@example.com".',
      'Launch receipt uses `role="status"` + `aria-live="polite"` — screen readers announce the launched URI without stealing focus.',
    ],
    takeaway:
      'Detect schemes declaratively, expose confidence, require a click. The URI handler chain does the rest.',
  },
  {
    id: 'parser',
    label: 'Number parser',
    description: 'Paste a blob, extract every phone number, confirm, then batch-dial.',
    component: NumberParser,
    source: NumberParserSrc,
    sourceName: 'NumberParser.vue',
    intro: `This surface is how reps actually work. They paste a CRM record, meeting minutes, an email, a transcript — and expect the dialer to pull out every plausible number. Google's libphonenumber is the gold standard for production parsers; the simplified regex here is a reasonable substitute for client-side pre-filtering but any serious implementation should pipe matches through libphonenumber server-side for validation and E.164 normalisation.

Ambiguity is the central problem. \`2025\` could be an extension, a year, or the tail of a national number without the area code. The default-region dropdown is the single most important control: it flips the interpretation of every bare ten-digit number on the page, and operators in multi-region teams toggle it constantly.`,
    keyPoints: [
      'Always normalise to E.164 (\`+<cc><nsn>\`) before display — every CRM, carrier, and STIR/SHAKEN system speaks E.164 only',
      'Flag ambiguous matches visually; do not include them in "Select all". A 10-digit number with no country hint becomes a wrong-country call the instant the default region is misset',
      'Surface the inter-dial delay as a first-class control — parallel-dialing fifty numbers gets your trunk flagged for robocalling within minutes',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Keep the raw matched text visible next to the E.164 form. When the parser guesses wrong, the user needs to see exactly which substring triggered it.',
      },
      {
        kind: 'note',
        text: 'Extensions (`ext. 4010`, `x4010`) are not phone numbers and cannot be dialed standalone — parse them but tag them clearly as `ext` so batch-dial skips them.',
      },
      {
        kind: 'warning',
        text: "Rate-limit the batch dial at the carrier level. A 50-number click-to-call burst looks identical to a robocall from the upstream carrier's point of view and they will disconnect the trunk.",
      },
    ],
    accessibility: [
      'Each row checkbox has `aria-label="Include +14155550100 in batch"` — the E.164 value is announced, not just "checkbox".',
      'Ambiguous rows get a colour + border highlight _and_ the `ambiguous` text tag — the signal is not colour-only.',
      'Status line uses `role="status"` + `aria-live="polite"` so dial progress is announced without interrupting whatever the user is typing.',
    ],
    takeaway:
      'Parse greedily, confirm explicitly, normalise to E.164, and rate-limit the outbound burst. Every shortcut here has cost someone their trunk.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Dial buttons will issue real INVITEs.'
      : 'Register to place calls; parsing and highlighting work regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport for INVITE.',
  },
  {
    label: 'Protocol handler (optional)',
    met: true,
    hint: '`navigator.registerProtocolHandler("sip", …)` must be called once from the top-level page.',
  },
  {
    label: 'E.164 normaliser',
    met: true,
    hint: 'libphonenumber-js server-side for production; regex pre-filter client-side is a convenience only.',
  },
])
</script>
