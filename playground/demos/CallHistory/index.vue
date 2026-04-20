<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="log"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Log from './Log.vue'
import LogSrc from './Log.vue?raw'
import Stats from './Stats.vue'
import StatsSrc from './Stats.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Call history is a surprisingly load-bearing feature. Users scan it to answer "who did I miss", "what was that number", and "how much time did I spend on the phone this week". Those are three very different questions, and a single flat list serves none of them well.

Two variants here. A **chronological log** answers the first two questions — recent activity, grouped by day, filterable by direction, with search. A **statistics dashboard** answers the third — aggregates, hour-of-day patterns, top callers, and the incoming-vs-outgoing split. Both read from the same underlying call-history store; they're two lenses onto the same data.`

const variants: DemoVariant[] = [
  {
    id: 'log',
    label: 'Activity log',
    description: 'Chronological feed with filter, search, and redial.',
    component: Log,
    source: LogSrc,
    sourceName: 'Log.vue',
    intro: `The activity log is the "what just happened" view. Users come here after a missed call, after a meeting, or while hunting for "that number I called last Thursday". Three primitives make this work: direction filter, text search, and day-grouping. Everything else is noise.

Missed calls get the accent colour — not because they're alarms, but because missed is the status the user most needs to spot at a glance. Answered calls stay calm and ink-coloured. The tools (redial, delete) appear on hover so the row stays clean until the user intends to act.`,
    keyPoints: [
      'Group by Today / Yesterday / This week / Older — absolute dates only appear when relative stops helping',
      'Filter tabs include counts so the user sees the scope before clicking',
      'Redial + delete per row are enough; bulk operations belong in a settings view, not the main log',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Search should match both display name and URI. Users remember "alex" but also "@example.com" — both should land the same row.',
      },
      {
        kind: 'warning',
        text: 'Delete is a destructive action on real history. In production, add an undo snackbar or a 24-hour soft-delete window before wiping the row for good.',
      },
    ],
    accessibility: [
      'Filter buttons use `role="radiogroup"` / `role="radio"` with `aria-checked` — exactly one is always selected.',
      'Empty-state message is tied to the current query so screen-reader users hear "No calls match \\"alex\\"", not just "empty".',
      'Status messages ("Redialing…", "Deleted …") go through an `aria-live="polite"` region so interaction feedback is announced without interrupting.',
    ],
    takeaway:
      'A call log is a feed. Keep the row clean, promote missed calls, and let filter + search do the heavy lifting.',
  },
  {
    id: 'stats',
    label: 'Statistics dashboard',
    description: 'Aggregates, hour-of-day histogram, top callers, direction split.',
    component: Stats,
    source: StatsSrc,
    sourceName: 'Stats.vue',
    intro: `The statistics dashboard is the "zoom out" view. Instead of individual entries, it answers questions about your calling patterns: when am I on the phone, who am I calling most, how much is incoming vs outgoing. A good stats view is read-only and unambiguous — users shouldn't have to interpret numbers or resolve overlapping charts to get the answer.

The three KPIs up top cover 80% of the curiosity. The hour-of-day histogram reveals working patterns without needing a Y-axis label — the peak hour is called out in accent orange so you see it before you read any numbers. Top callers is a simple bar race, capped at five, because longer lists stop being insights and start being directories.`,
    keyPoints: [
      'Three KPIs maximum at the top — "total, talk time, answer rate" — more and users start skimming',
      'Peak-hour highlight in the histogram is the primary payoff; don\'t bury it in a legend',
      'Cap top-callers at five — a long leaderboard is a directory in disguise',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Seed your demo data deterministically (this one uses Mulberry32). Flickering bars between renders make a stats page feel unreliable.',
      },
      {
        kind: 'note',
        text: 'Formatting matters: "1h 23m" beats "83 minutes", and "78%" beats "0.78". Use tabular numerals (`font-variant-numeric: tabular-nums`) so digits don\'t dance when values change.',
      },
    ],
    accessibility: [
      'Histogram has a single `role="img"` with an aria-label summarising peak hour — screen readers get the insight without crawling 24 bars.',
      'Each bar has a `title` with the hour and count for sighted users hovering.',
      'KPIs use `<span>` labels tied to their values; all tabular numerals render with `font-variant-numeric: tabular-nums` for parity between light and dark.',
    ],
    takeaway:
      'A stats dashboard pays off in seconds, not minutes. Three numbers, one chart, one leaderboard — that\'s the whole value.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Real call history will populate as you make/receive calls.'
      : 'Demo data is used until a SIP account is configured.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'History store',
    met: true,
    hint: 'In production, persist history to IndexedDB or a backend. The demo uses in-memory sample data.',
  },
  {
    label: 'Session-end subscription',
    met: true,
    hint: 'Wire `useCallSession`\'s terminated events into your history store to record every call automatically.',
  },
])
</script>
