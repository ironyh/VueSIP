<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="lines"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Lines from './Lines.vue'
import LinesSrc from './Lines.vue?raw'
import SCA from './SCA.vue'
import SCASrc from './SCA.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `The multi-line phone is the Aeron chair of desk telephony. Nobody remembers how they got it — four buttons labelled L1–L4, each an independent call appearance, each with its own hold and hang-up. It predates SIP by decades, but the mental model survived because it just works: one button per conversation, one press to pick up or swap, no menus.

The contemporary twist is Shared Call Appearance — the same L1–L4 buttons visible on every phone in a workgroup. Reception picks up L1, the sales team sees L1 go solid red, the exec can barge in from their own phone. It's all done with RFC 4235 \`dialog\` event subscriptions, and once you see the wire format it's obvious why it took the industry until 2006 to standardise.`

const variants: DemoVariant[] = [
  {
    id: 'lines',
    label: 'Lines',
    description: 'Classic 4-line grid with per-line state and DND.',
    component: Lines,
    source: LinesSrc,
    sourceName: 'Lines.vue',
    intro: `Four lines is the canonical count for a reason — it fits comfortably on a 6-inch LCD, it matches the number of conversations a human can juggle without losing one, and it's what every hardware vendor ships. You can go to 8 or 16, but the UX degrades fast once the user has to count down the grid to find their active call.

Each line has six possible states: idle, dialing, ringing, connected, held, and DND. The grid shows the state colour-first (green edge = talking, muted edge = held, pulsing = ringing) with a text label as backup. Per-line DND is the feature reception staff love — they can mark L3 as "emergency only" without affecting the main lines. Global DND is the single big switch for lunch breaks.`,
    keyPoints: [
      'One button does all six state transitions by context — answer if ringing, hold if connected, resume if held, end when there is something to end',
      'Ringing lines must visually dominate; a held call on L2 should never be louder than an incoming on L4',
      'Per-line DND plus a global DND is worth both — staff want the granularity and the kill switch',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Switching to a ringing line should auto-hold the current talking line. Manual hold-then-answer is power-user territory; the default should be the expected magic.',
      },
      {
        kind: 'note',
        text: 'Asterisk exposes per-line state via \`DEVICE_STATE(SIP/ext)\` and BLF hints. FreeSWITCH\'s \`sofia\` profile emits \`PRESENCE_IN\` events on the ESL. Either way, the client listens and renders.',
      },
      {
        kind: 'warning',
        text: 'DND is not a mute. A DND line that accidentally rings (because a rule override fired) is a worse failure than a mute that leaks audio — users trust DND as a hard boundary.',
      },
    ],
    accessibility: [
      'Each line uses `role="listitem"` inside a `role="list"`; the line state is in text, not just colour.',
      'Per-line DND buttons carry `aria-pressed` and `aria-label="Toggle DND for line {id}"`.',
      'The ringing line uses a CSS animation, but the "RING" label and state colour convey the same information for users with reduced motion.',
    ],
    takeaway:
      'Four lines, six states, one context-sensitive primary button. The hardware phone solved this in 1995; don\'t reinvent it.',
  },
  {
    id: 'sca',
    label: 'Shared appearance',
    description: 'RFC 4235 dialog-info subscription for workgroup lines.',
    component: SCA,
    source: SCASrc,
    sourceName: 'SCA.vue',
    intro: `Shared Call Appearance is what turns a 4-line phone into a team. Every phone in the group subscribes to the same \`appearance-uri\` with \`Event: dialog\`, and the PBX publishes NOTIFYs as state changes. When Reception picks up a call on appearance 1, every phone in the group sees appearance 1 turn red. When reception puts it on hold, everyone sees the colour flip to "held" — and anyone with barge-in rights can press the key and join.

The wire format is the thing to understand. Subscriptions refresh at 3/4 of the expires interval, the NOTIFYs are idempotent \`dialog-info+xml\` payloads, and missed NOTIFYs are recovered by bumping the version number on the next full snapshot. If your PBX doesn't do this, SCA is just a pretty lie.`,
    keyPoints: [
      'Use `Event: dialog` (RFC 4235) for appearance state; `Event: presence` is per-user, not per-line',
      'The PBX is authoritative — never let the client infer shared state from its own events, or you get split-brain UI',
      'Barge-in uses `INVITE` with a `Replaces` header targeting the confirmed dialog; approve it per-user, not per-line',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Subscribe to a parent URI (sales-group@pbx) rather than one per appearance. Traffic drops from N subscriptions to 1, and the XML payload aggregates all appearances.',
      },
      {
        kind: 'warning',
        text: 'SCA is easy to misconfigure such that all phones auto-answer the same call. Always require an explicit user gesture to pick up a shared ringing appearance — never auto-accept on a shared line.',
      },
      {
        kind: 'note',
        text: 'Asterisk\'s \`res_pjsip_notify\` and Kamailio\'s \`dialog\` module both publish RFC 4235 NOTIFYs. FreeSWITCH emits them via \`mod_sofia\` but needs \`multiple-registrations=contact\` in the profile.',
      },
    ],
    accessibility: [
      'Peer appearance list uses semantic markup; state is text-labelled (IDLE / RINGING / TALKING / HELD) in addition to colour.',
      'The wire-format panel is a plain `<pre>` block, so screen readers can be switched into character-by-character mode.',
      'Configuration inputs use explicit `<label>` pairings so field names are announced.',
    ],
    takeaway:
      'SCA is a subscription, not a convention. Show the user the NOTIFY XML once and they understand why the feature behaves the way it does.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Lines can place and receive real calls.'
      : 'Register to make this feel alive; line state is otherwise mock.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport active.',
  },
  {
    label: 'PBX dialog-info support (optional)',
    met: true,
    hint: 'Asterisk, FreeSWITCH and Kamailio publish RFC 4235 NOTIFYs when configured.',
  },
  {
    label: 'Shared appearance URI (optional)',
    met: true,
    hint: 'Needed for SCA; falls back to local 4-line mode otherwise.',
  },
])
</script>
