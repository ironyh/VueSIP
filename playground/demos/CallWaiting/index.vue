<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="active"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Active from './Active.vue'
import ActiveSrc from './Active.vue?raw'
import Behaviour from './Behaviour.vue'
import BehaviourSrc from './Behaviour.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Call waiting is the oldest telephony feature that still catches softphone authors out. The PSTN hid the complexity in-band: a discreet 440 Hz beep in your earpiece, two hook-flashes to swap, and the network did the rest. On SIP, every one of those beats is explicit — a second INVITE arrives while a dialog is established, and the client has to decide what to play, what to \`re-INVITE\` the active party with, and what to send back to the new caller.

This demo covers both halves: the in-the-moment interaction when a second call arrives, and the configuration that governs it. The interaction is where users live; the configuration is where the surprises hide.`

const variants: DemoVariant[] = [
  {
    id: 'active',
    label: 'Active view',
    description: 'Live call with a second-line INVITE arriving.',
    component: Active,
    source: ActiveSrc,
    sourceName: 'Active.vue',
    intro: `The active view is what the user sees during the three seconds they have to decide. Line 1 is the call they're on. Line 2 is the new INVITE, announced by a local tone (never over RTP — that would mix into the other party's audio). The four actions — swap, merge, answer-with-hold, reject — each map to a specific SIP verb, and they're worth labelling with that verb so power users can read the signalling tab and match the UI.

Swap is the classic hook-flash equivalent: hold the active call (re-INVITE a=sendonly), accept the second. Merge is where the abstraction gets thin — most clients do this server-side via REFER to a conference bridge, some do it with a client-side 3-way mixer, and the UX consequences are different. Show the user which one they're getting.`,
    keyPoints: [
      'Call-waiting tone is local-only. Putting it on the RTP stream leaks it to the remote party — embarrassingly common bug',
      'Auto-hold on answer is the default expectation; explicit hold-then-answer is for power users and dispatchers',
      'Merge via REFER is server-resourced (needs a conference bridge); client-side mixing is self-contained but consumes local CPU',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Label buttons with both the user verb and the SIP verb (Hold / re-INVITE a=sendonly). Senior users debug faster when they can read the UI as protocol.',
      },
      {
        kind: 'warning',
        text: 'RFC 3264 a=sendonly means YOU send, the remote receives. Using a=inactive drops RTP both ways — which stops MOH from reaching the held party. Know which you want.',
      },
      {
        kind: 'note',
        text: 'Asterisk bridges held calls into MOH automatically when \`musiconhold\` is configured. FreeSWITCH needs \`sendonly-hold\` on the profile for the same behaviour.',
      },
    ],
    accessibility: [
      'The incoming-call panel uses `role="alert"` so screen readers announce the new arrival.',
      'Action buttons have both visible labels and hint text describing the protocol effect.',
      'The signalling log uses colour plus explicit TX/RX/LOCAL text to distinguish directions.',
    ],
    takeaway:
      'The second-call UI is a three-second decision surface. Show the verbs, play the tone locally, and never let the active party hear what\'s happening on the other line.',
  },
  {
    id: 'behaviour',
    label: 'Behaviour',
    description: 'Max concurrent calls, overflow handling, tone options.',
    component: Behaviour,
    source: BehaviourSrc,
    sourceName: 'Behaviour.vue',
    intro: `Behaviour is the set of choices you make once and forget about — until they bite. Max-concurrent at 1 turns the client into a desk phone from 1998 (you're either available or you're not). Max at 8 lets a dispatcher juggle. Pick a default you can defend and expose the knob for everyone else.

The overflow action — what happens when the cap is hit — is the decision that matters most. Returning 486 Busy Here is honest: the caller knows you're occupied and their voicemail can take the call. Silent drop (200 OK then immediate BYE) hides you but wastes the caller's expectation. Voicemail forwarding via SIP 302 is the customer-service answer, and it's usually right for businesses with shared coverage.`,
    keyPoints: [
      'The default should be: enabled, max=2, tone-with-auto-hold, overflow=busy. That matches 90% of deployment expectations',
      'VIP bypass is almost always wanted — the CEO doesn\'t care that you\'re on another call',
      'Never silently drop a real call without an opt-in; users expect either ring or voicemail, not vanishing',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Test the tone with MOH enabled on the held leg. A surprising number of clients end up with two audio sources overlapping because both try to own the held call\'s audio.',
      },
      {
        kind: 'warning',
        text: 'Setting max-concurrent above 4 without per-call mute/hold controls produces chaos. Either cap low or build the multi-line surface (see Multi-Line demo).',
      },
      {
        kind: 'note',
        text: 'Some carriers reject client-side forwarding via 302 for compliance reasons. If you need forwarding, implement it server-side in dialplan and have the client just signal "do the thing".',
      },
    ],
    accessibility: [
      'The master toggle has an explicit "Enabled / Disabled" text label alongside the switch.',
      'Behaviour and overflow options use `role="radiogroup"` with `aria-checked` — one is always selected.',
      'The counter buttons are labelled with `aria-label="Increase/Decrease"` since the glyphs alone are ambiguous.',
    ],
    takeaway:
      'Call-waiting behaviour is the quiet half of the feature. Sensible defaults, explicit overflow, and a VIP escape hatch keep the loud half predictable.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Real INVITEs will honour the configured policy.'
      : 'Register to test against live calls; configuration works regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport active.',
  },
  {
    label: 'PBX MOH (optional)',
    met: true,
    hint: 'musiconhold on Asterisk or sendonly-hold on FreeSWITCH handles the held audio.',
  },
  {
    label: 'Conference bridge (optional)',
    met: true,
    hint: 'Needed for server-side merge via REFER.',
  },
])
</script>
