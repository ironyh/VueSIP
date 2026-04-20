<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="priority"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Priority from './Priority.vue'
import PrioritySrc from './Priority.vue?raw'
import Negotiation from './Negotiation.vue'
import NegotiationSrc from './Negotiation.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Codec policy is two questions, asked at opposite ends of a call. What does the tenant prefer? — answered by a priority list in \`pjsip.conf\`. What actually got chosen? — answered by the SDP answer in the INVITE handshake. Both views matter; operators set the policy and then diagnose why Call #501 ended up on μ-law when they asked for Opus.

The answer to "why μ-law" is almost always "the other side only offered μ-law". Codec negotiation is a set intersection, not a preference winner, and the UX trick is showing the offer/answer pair side by side so the outcome is derivable.`

const variants: DemoVariant[] = [
  {
    id: 'priority',
    label: 'Priority list',
    description: 'Ordered allow-list with drag/keyboard reorder and a config preview.',
    component: Priority,
    source: PrioritySrc,
    sourceName: 'Priority.vue',
    intro: `The priority list is the tenant's wishlist. Opus first means "if both sides can speak Opus, speak Opus"; the position of a codec determines the \`allow =\` line order in \`pjsip.conf\`, and the order is meaningful — Asterisk walks it left-to-right when picking a match.

Blocked codecs need their own visible section. Hiding them inside a dropdown sends the message that they were never available; showing them greyed with a "+ enable" button makes the design space visible. G.729 is the classic — blocked by default (licensed), easy to enable when a customer ships a G.729 deployment.`,
    keyPoints: [
      '`disallow = all` before `allow = opus,g722,ulaw` is the safe Asterisk idiom; the order on the allow line matters',
      'Blocked ≠ absent. Keep G.729 and legacy Speex visible so operators can re-enable them without hunting',
      'The offer is a list; the answer is usually a subset. Never assume the peer will honour your preference order',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show bitrate and sample rate next to each codec. "Opus 48 kHz / 32 kbps" explains the choice better than "Opus" alone.',
      },
      {
        kind: 'warning',
        text: 'G.729 is licensed per channel. Enabling it in the UI does not grant the license — pair the toggle with a link to the license entitlement.',
      },
      {
        kind: 'note',
        text: 'Browser WebRTC stacks always include Opus at the top of their offer regardless of the PBX policy. Your Opus-first order is only honoured when the peer is also ordered.',
      },
    ],
    accessibility: [
      'Reorder controls are real `<button>` elements with `aria-label="Move up/down"`; keyboard users can reorder without a mouse.',
      'Enabled / blocked split uses explicit section headings, not colour alone.',
      'Config preview is rendered as `<pre>` — copyable and screen-readable.',
    ],
    takeaway: 'Codec priority is an ordered allow-list with a blocked tier. Show both, preserve order, and echo the generated `pjsip.conf` line.',
  },
  {
    id: 'negotiation',
    label: 'Negotiation log',
    description: 'Per-call SDP offer/answer with the chosen codec highlighted.',
    component: Negotiation,
    source: NegotiationSrc,
    sourceName: 'Negotiation.vue',
    intro: `The negotiation log is the receipts. When a customer asks "why did my call drop to PCMU?", this is the surface that answers. Offer on the left (what we proposed), answer on the right (what they agreed to), chosen codec pulled to the top.

Design for the support engineer. Collapse by default, expand on click, keep the last 5–10 calls around. SDP is intimidating, but shown as simple \`m=\` and \`a=rtpmap\` lines it is perfectly readable — and explaining codec picks using the raw SDP is how operators build the mental model that prevents future tickets.`,
    keyPoints: [
      'Offer/answer is a set intersection; the chosen codec is the first match on your offer that also appears in their answer',
      'PSTN trunks almost always downgrade to ulaw/alaw — no amount of Opus-first policy changes that',
      'Record both sides. Without the peer\'s offer/answer you cannot explain the outcome',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Surface the chosen codec as a pill, not just inside the SDP. Engineers scanning the log want "Opus" / "ulaw" at a glance.',
      },
      {
        kind: 'warning',
        text: 'Opus being in the offer does not mean it will be used. Legacy SBCs strip codecs they do not understand; some middleboxes even rewrite SDP.',
      },
      {
        kind: 'note',
        text: 'If `telephone-event/8000` is missing from the answer, DTMF will be sent inband or via INFO — worth surfacing separately in the log.',
      },
    ],
    accessibility: [
      'Each row is keyboard-focusable with visible hover/focus; toggle is a text "+" / "−", not an icon alone.',
      'Offer and answer panels are labelled `<pre>` blocks with preserved whitespace.',
      'Inbound / outbound direction is a text chip with colour reinforcement.',
    ],
    takeaway: 'The negotiation log is the forensic view. Show offer and answer side by side, pull the chosen codec to the top, and keep enough history to diagnose.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'New calls will appear in the negotiation log.'
      : 'Register to generate live negotiation entries; history is pre-seeded.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'PJSIP with codec modules loaded',
    met: true,
    hint: 'Opus needs `codec_opus.so`; G.722 / ulaw / alaw are built-in.',
  },
  {
    label: 'SDP logging enabled',
    met: true,
    hint: '`pjsip set logger on` or equivalent; needed for the negotiation view.',
  },
])
</script>
