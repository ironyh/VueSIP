<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="formats"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'
import { useCallSession } from '../../../src'
import { useSimulation } from '../../composables/useSimulation'
import { provideCallTimerDemoContext } from './sharedContext'

import Timer from './Timer.vue'
import TimerSrc from './Timer.vue?raw'
import Billable from './Billable.vue'
import BillableSrc from './Billable.vue?raw'
import Breakdown from './Breakdown.vue'
import BreakdownSrc from './Breakdown.vue?raw'

const { isConnected, isRegistered, getClient } = playgroundSipClient
const sipClientRef = computed(() => getClient())
const callSession = useCallSession(sipClientRef)
const simulation = useSimulation()

provideCallTimerDemoContext({ callSession, simulation })

const overview = `A ticking call timer is one of those details that looks trivial and lies — do it naively with \`setInterval\` and you'll either drift by seconds per minute or leak timers across unmounts. VueSIP handles the ticking inside \`useCallSession\`, so your template just reads \`duration\` and reformats it.

This page shows three timer surfaces that solve different jobs: classic format cards, a billable meter, and a breakdown that separates active talk time from hold time. Pick the one that matches the decision your user is making, not just the number you happen to have.`

const variants: DemoVariant[] = [
  {
    id: 'formats',
    label: 'Duration formats',
    description: 'One live counter, four presentations you can drop into any call UI.',
    component: Timer,
    source: TimerSrc,
    sourceName: 'Timer.vue',
    intro: `The hero display is just \`formatMMSS(duration)\` scaled up and inverted on dark ink — common in call bars and PiP windows. The four cards below show the same value reformatted; each formatter is a pure function, so you can tree-shake the ones you don't need.

\`duration\` updates once per second and stays put while a call is on hold, so you don't have to special-case the hold state in your display code. When the call ends, the session transitions out of \`active\` and the display snaps back to the idle placeholder.`,
    keyPoints: [
      'Read `duration` (seconds) off `useCallSession` — no interval management in your component',
      'Formatters are pure functions; keep them in a shared util if you reuse them across views',
      'Pause/resume is transparent — `duration` keeps its value while `state === "on-hold"`',
    ],
    notes: [
      {
        kind: 'tip',
        text: "Use `font-variant-numeric: tabular-nums` on the timer so digits don't jitter as they change. The hero display uses it here.",
      },
      {
        kind: 'note',
        text: 'The human-readable format trims zero units — "5m 3s" instead of "0h 5m 3s". Decide whether your UI prefers brevity or alignment with siblings.',
      },
    ],
    accessibility: [
      'The live timer is wrapped in `aria-live="polite"` so updates are announced without interrupting reading.',
      'The idle placeholder uses `role="status"` so screen readers know it\'s a state message, not content.',
      'Raw stats below use a `<dl>` so each label/value pair is programmatically associated.',
    ],
    takeaway:
      "Format it four ways and the ticking is still someone else's problem — that's the point of a composable.",
  },
  {
    id: 'billable',
    label: 'Billable meter',
    description:
      'Rate × rounded duration — a live running charge with a configurable billing increment.',
    component: Billable,
    source: BillableSrc,
    sourceName: 'Billable.vue',
    intro: `Billable time isn't wall-clock time. Carriers and legal time tend to round up to a billing increment — 6&nbsp;s (\`1/10\` minute), 30&nbsp;s, or a full minute — and then multiply by a per-minute rate. This variant lets you twiddle both and watch the running charge recompute as the meter crosses each boundary.

The meter bar fills toward the next increment, so you can see when the charge is about to tick up. At the boundary the charge snaps to the next unit — this is \`Math.ceil(duration / increment)\`, not interpolation. That snap is the whole point: billable minutes are discrete.`,
    keyPoints: [
      'Billable seconds = `Math.ceil(duration / increment) * increment` — a pure, idempotent calc',
      'Unit price derives from the rate: `(ratePerMinute / 60) * increment` — change either to see the meter re-baseline',
      'All currency formatting goes through `Intl.NumberFormat` for locale-correct output',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Use 6&nbsp;s increments for telecom-style billing, 60&nbsp;s for legal/consulting — the UI is the same, the only change is the rounding granularity.',
      },
      {
        kind: 'warning',
        text: 'Never derive the final invoice amount from client-side state. This display is for the user; the server of record should recompute charges from authoritative call-detail records.',
      },
    ],
    accessibility: [
      'The running charge sits inside an `aria-live="polite"` region so screen readers announce boundary changes.',
      'Rate and increment controls are real `<label>` + `<input>`/`<select>` pairs — no custom spinners to re-implement.',
      'The meter is decorative (`aria-hidden="true"`); the textual "Next increment at Xs" line is what assistive tech reads.',
    ],
    takeaway:
      'If it rounds up and charges by the minute, you already own the hard part — the display is two computed refs and a progress bar.',
  },
  {
    id: 'breakdown',
    label: 'Active vs hold breakdown',
    description: 'Split talk time from hold time so the number reflects what actually happened.',
    component: Breakdown,
    source: BreakdownSrc,
    sourceName: 'Breakdown.vue',
    intro: `A single duration number hides the part support teams actually care about: how long the caller spent talking versus listening to hold music. This variant treats "active" and "held" as separate buckets, then shows their ratio beside the total session length.

The point isn't accounting precision down to the millisecond — it's giving agents and supervisors a usable mental model. A five-minute call with four minutes on hold feels very different from a five-minute conversation, and the UI should make that obvious.`,
    keyPoints: [
      'Active time comes from `useCallSession().duration`; hold time is tracked separately when the session enters hold',
      'A simple two-segment bar is enough to expose whether the call was conversation-heavy or wait-heavy',
      'This is ideal in QA dashboards, call history detail views, and SLA coaching tools',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'If you ship this in analytics, compute the authoritative numbers from server-side CDRs too. The UI is a guide, not a source of truth.',
      },
    ],
    accessibility: [
      'The bar is decorative; the real signal is duplicated in text percentages and durations.',
      'Each metric is a `<dt>/<dd>` pair so screen readers read label and value together.',
    ],
    takeaway:
      'A timer becomes more useful the moment it stops pretending all seconds mean the same thing.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your SIP account is registered.'
      : 'Configure SIP in the header, or use Simulation Mode.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is open.',
  },
  {
    label: 'Active call',
    met: callSession.state.value === 'active' || callSession.state.value === 'held',
    hint:
      callSession.state.value === 'active' || callSession.state.value === 'held'
        ? 'A live session is active and the timer page is observing it.'
        : 'Duration only ticks while a session is active. Hold the call to compare active vs hold time in the third variant.',
  },
])
</script>
