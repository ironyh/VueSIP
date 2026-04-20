<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="toggle"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Toggle from './Toggle.vue'
import ToggleSrc from './Toggle.vue?raw'
import Schedule from './Schedule.vue'
import ScheduleSrc from './Schedule.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Do Not Disturb looks trivial — a toggle that rejects calls — but it is one of the features users touch most often, so the UX has to be fast, reassuring, and unambiguous. A cold "ON" with no feedback leaves people wondering if it actually worked; a loud red banner wears thin after the third meeting of the day. The sweet spot is a calm, confident status that answers three questions without being asked: *is it on, since when, and what happens to callers*.

Two variants here: a manual **Toggle** for the "I'm going heads-down right now" case, and a weekly **Schedule** for the "always off after 6 PM" case. Both map to the same underlying SIP behaviour — reject incoming sessions with a \`486 Busy Here\` (or \`603 Decline\`) — but the mental models are different, so the UIs are different.`

const variants: DemoVariant[] = [
  {
    id: 'toggle',
    label: 'Manual toggle',
    description: 'One switch, clear status, a log of what it caught.',
    component: Toggle,
    source: ToggleSrc,
    sourceName: 'Toggle.vue',
    intro: `The manual toggle is the "now" version of DND. Users flip it when a meeting starts and flip it back when they're free. The whole card exists to make that two-second interaction trustworthy: the switch gives instant state, the side badge confirms it at a glance, and the "Rejected while DND was on" log is the breadcrumb trail that proves the feature worked when the user wasn't looking.

Notice the small "since" indicator — once DND has been on for more than a minute, a quiet label shows how long. It's the difference between "is this still on?" anxiety and "yes, 14 minutes and counting" calm.`,
    keyPoints: [
      'Response code is configurable: \`486 Busy Here\` hints the caller to try later; \`603 Decline\` is a firmer "no"',
      'Stats are the proof: rejected count + session duration make the feature feel real rather than magical',
      'Log rejected callers even if you don\'t forward them — users will want to check later',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Keep the toggle colour subdued when on — a hot red or orange fatigues fast and feels alarming. The accent dot is enough; let the rest of the card stay calm.',
      },
      {
        kind: 'warning',
        text: 'Don\'t log caller identity to a persistent store without thinking about privacy. An in-memory session log is fine; a permanent "missed while DND" history belongs under your call-history feature with its own retention policy.',
      },
    ],
    accessibility: [
      'The switch is a real `<input type="checkbox">` styled as a track+thumb — keyboard and screen-reader users get native semantics.',
      'The side badge updates live (`aria-live` implicit via re-render); the label reads "DND" or "RING" so status is never colour-only.',
      'Rejection count updates are announced politely via a live region, not an alert, to avoid interrupting the user mid-task.',
    ],
    takeaway:
      'A good DND toggle answers "is it on, since when, and what happened" without the user having to ask. Everything else is garnish.',
  },
  {
    id: 'schedule',
    label: 'Weekly schedule',
    description: 'Time-windowed DND for recurring focus and after-hours.',
    component: Schedule,
    source: ScheduleSrc,
    sourceName: 'Schedule.vue',
    intro: `The schedule variant is for the "every weekday from 9 to noon I'm in deep work" or "after 6 PM don't call me" patterns. Once configured, it's invisible — the value is that the user never has to remember to toggle. That invisibility is also the risk: if the schedule silently fires at the wrong time, the user won't notice until they miss a call. So the Now strip at the top is load-bearing: it tells the user, live, which window (if any) is active right now.

Each window is independently editable — label, from/to, day chips, enabled switch. Overnight windows (22:00 → 07:00) are handled by the active-window computed: when \`from > to\`, the window spans midnight.`,
    keyPoints: [
      'The active-window computed evaluates on a minute-scale tick — no need to recompute on every render',
      'Overnight windows require the \`from > to\` branch; miss it and "After hours" silently breaks',
      'Day chips are toggle buttons with \`aria-pressed\` — not checkboxes — because the visual pattern reads as a pill row',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Let users name their windows. "Deep work block" in the label is far more memorable than "Window 2" when they come back to edit the schedule three weeks later.',
      },
      {
        kind: 'note',
        text: 'The "Now" strip switches to the accent colour when any window is active — this is the primary feedback that the schedule is working. Without it, users lose trust in the silent magic.',
      },
    ],
    accessibility: [
      'Each window is a list item with an accessible label input and grouped day buttons with `role="group"`.',
      'Time inputs are native `<input type="time">` — full OS-level keyboard and screen-reader support.',
      'Day chips use `aria-pressed` so toggling state is announced correctly.',
    ],
    takeaway:
      'Recurring DND is a "set it and forget it" feature — the UI\'s job is to make sure the user never has to wonder whether it\'s currently firing.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your SIP account is registered — DND rejections will be sent for real.'
      : 'DND still works in simulation; configure SIP to reject actual incoming calls.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Incoming call subscription',
    met: true,
    hint: 'DND needs a session-state watcher — `useCallSession` or equivalent subscription.',
  },
  {
    label: 'Local clock trusted',
    met: true,
    hint: 'Schedule windows use the browser clock. Warn users if their system time looks wrong.',
  },
])
</script>
