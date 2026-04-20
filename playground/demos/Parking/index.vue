<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="slots"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Slots from './Slots.vue'
import SlotsSrc from './Slots.vue?raw'
import Settings from './Settings.vue'
import SettingsSrc from './Settings.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Call parking is a 90s feature that refuses to die because it works. Transfer a call to slot 701, walk to another office, dial 701 from that phone, resume — no hold-music chain, no attended-transfer dance, no \`REFER\` failures across sketchy endpoints. The dialplan primitive is \`Park()\`, the UX surface is two things: the live slot wall (who is parked where) and the lot config (ranges, timeouts, return behaviour).

Modern UIs bury it under "transfer to queue" but attendants still park. The trick is surfacing timeouts: a call parked for 3 minutes is a caller who has given up; the UI should shout, not whisper.`

const variants: DemoVariant[] = [
  {
    id: 'slots',
    label: 'Slot grid',
    description: 'Live view of parked calls with timers and retrieve controls.',
    component: Slots,
    source: SlotsSrc,
    sourceName: 'Slots.vue',
    intro: `The grid is a map. Each tile is a slot, occupied or empty, and the timer is the important bit — it tells you whether the parked caller is still with you or has hung up in disgust. Tiles over the comeback threshold should visibly escalate (warning colour, larger timer) because every second past 60s is a bad-call-in-progress.

Retrieve is one click. Do not make the attendant dial the slot number — they know it from the tile, the UI knows it, and asking them to repeat it is hostile. A single "Retrieve" button initiates the call back to that slot from the attendant's extension, end of story.`,
    keyPoints: [
      '`Park()` is the Asterisk primitive; `blind_xfer` to the park extension (default 700) is the old-phone way',
      'Slots are announced back to the parker by voice unless silent-park is enabled — silent only works if the handset shows slot info',
      'Timeouts must return the call somewhere. Default is back to parker; dropping the call is user-hostile',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Surface the caller ID, not just the slot number. "Slot 704: +1 646 555 0139" is useful; "Slot 704" alone is trivia.',
      },
      {
        kind: 'warning',
        text: 'Parking lots fill up faster than you expect. Size for peak + 25%, not average — nothing worse than a full lot during an escalation.',
      },
      {
        kind: 'note',
        text: 'Asterisk 13+ exposes the lot via `ParkedCalls` AMI event. Hook that stream to keep the grid live — polling `Command: parking show` is a smell.',
      },
    ],
    accessibility: [
      'Each slot tile is a `<li>` with a visible number; retrieve buttons are real `<button>` elements.',
      'Warning state uses colour plus an escalated border width, not colour alone.',
      'Timer is in a monospace, tabular-numerals font so screen magnifiers render it stably.',
    ],
    takeaway: 'A parking lot view is a wall of timers. Make elapsed time impossible to miss and retrieval one click.',
  },
  {
    id: 'settings',
    label: 'Lot configuration',
    description: 'Ranges, timeouts, MoH, return rules — with a live config preview.',
    component: Settings,
    source: SettingsSrc,
    sourceName: 'Settings.vue',
    intro: `Parking configuration is where policy lives. The hard calls are timeout (45s is the classic, 60s for sales floors, 90s if you have a small team and want fewer comebacks) and the return rule (back to the parker is the safest default; context routing is for larger orgs with after-hours queues).

Showing the generated \`features.conf\` stanza next to the form is the trick. Operators do not want to learn a new abstraction — they want to see that changing a field produces the config line they would have written by hand. This view makes that explicit.`,
    keyPoints: [
      '`parkingtime = 45` in features.conf is the canonical Asterisk default',
      '`comebacktoorigin = yes` is the sane default; use comeback contexts only when the parker might have logged off',
      'Music-on-hold class is the parkee\'s audio; choose something neutral, never a brand jingle they already heard in the IVR',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Generate the config preview live so operators can eyeball it before saving. Surprise is how misconfiguration ships to production.',
      },
      {
        kind: 'warning',
        text: 'Increasing `parkingtime` past 60s starts generating abandon-from-park tickets. Callers think you forgot them.',
      },
      {
        kind: 'note',
        text: 'FreePBX stores these in the `parkinglot` table; FreeSWITCH uses `park_extension` dialplan apps — the UI layer is the same, the plumbing is different.',
      },
    ],
    accessibility: [
      'Every form field uses a `<dt>` / `<dd>` pair so screen readers announce label-then-value in order.',
      'Return-rule options are a `role="radiogroup"` with `aria-checked`.',
      'Numeric inputs specify `min` / `max` and use `font-variant-numeric: tabular-nums` for stable alignment.',
    ],
    takeaway: 'Parking config is small but load-bearing. Show the generated file, default timeouts to 45 seconds, and always send timeouts back to the parker.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You can park / retrieve against the live lot.'
      : 'Register to exercise the live parking lot; the config view still works offline.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'AMI `ParkedCalls` event stream',
    met: true,
    hint: 'Required to keep the slot grid live without polling.',
  },
  {
    label: 'Asterisk features.conf loaded',
    met: true,
    hint: 'Lot must exist in `features.conf` or `res_parking.conf` (Asterisk 13+).',
  },
])
</script>
