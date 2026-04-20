<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="today"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Today from './Today.vue'
import TodaySrc from './Today.vue?raw'
import History from './History.vue'
import HistorySrc from './History.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Agent stats live on two time scales. The first is right-now: how is my shift going, am I behind on calls, is my adherence going to get flagged this afternoon. The second is the arc: how does this week compare to last, is my AHT drifting up, where do I rank. Conflating them into a single "dashboard" — the default move — produces a screen that answers neither question well.

These two variants separate the concerns. The "Today" view is the glanceable one; you should be able to read it in two seconds between calls. The "History" view is the one you open during 1:1s and quarterly reviews — a trend line tells you a truth a dashboard can't.`

const variants: DemoVariant[] = [
  {
    id: 'today',
    label: 'Personal KPIs',
    description: 'Today\'s calls, AHT, adherence, and the time-split bar.',
    component: Today,
    source: TodaySrc,
    sourceName: 'Today.vue',
    intro: `The "Today" view is designed to be read at a glance. Six KPI tiles with a trend-vs-yesterday delta, a single stacked bar showing how your logged-in time broke down (talk / hold / wrap / idle), and an adherence gauge. Nothing else.

The time-split bar is the most honest metric on the screen. Utilization percentages can be massaged; a bar showing that 22% of your shift was idle is hard to argue with. That's also why WFM tools (NICE, Verint) compute adherence off the same source: the minute-by-minute state log, not the aggregated counters.`,
    keyPoints: [
      'AHT is talk + hold + wrap — not just talk. Dashboards that show only talk time undersell the agent\'s real workload',
      'Adherence is a percentage of schedule match, not a productivity score — an agent on a scheduled break is 100% adhered',
      'Trend-vs-yesterday deltas are load-bearing; absolute numbers in isolation don\'t tell you if you\'re drifting',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Color the trend arrows in *context* of the metric — higher AHT is bad, higher CSAT is good. Naive "up = green" is a common bug in agent dashboards.',
      },
      {
        kind: 'note',
        text: 'Occupancy (talk+hold+wrap / logged-in) and utilization (talk+hold+wrap / scheduled) are different things. Know which one your WFM report uses before you cite it.',
      },
      {
        kind: 'warning',
        text: 'Don\'t gamify CSAT on a per-call, per-agent basis — agents learn to cherry-pick the survey-prompt moment. Aggregate weekly at minimum.',
      },
    ],
    accessibility: [
      'The time-split bar has an `aria-label` summarising percentages so screen readers don\'t just read a meaningless gauge.',
      'KPI deltas use `+` / `-` prefixes, not just color — the sign is conveyed textually.',
      'The adherence label ("on schedule" / "trailing" / "off schedule") is derived from the percentage, so color is redundant, not primary.',
    ],
    takeaway:
      'A personal KPI screen earns its place by being glanceable. If it takes more than two seconds to read, it\'s a report, not a dashboard.',
  },
  {
    id: 'history',
    label: 'Performance history',
    description: '30-day sparkline, per-metric summary, and team rank.',
    component: History,
    source: HistorySrc,
    sourceName: 'History.vue',
    intro: `The history view is the one you open when something's off — when your supervisor DMs you "got a sec?" or when you're prepping for a 1:1. The sparkline is deliberately small: the question isn't "what was the value on day 14," it's "is the line trending up or down?"

The metric picker is an interaction the "Today" view doesn't have — here you\'re intentionally drilling in. AHT, CSAT, FCR, calls — each tells a different story, and the 7d-vs-prior-7d delta at the bottom is the only number a supervisor is going to care about in a review.`,
    keyPoints: [
      'Sparkline over grid-chart when the question is trend, not absolute value — eye tracks the slope, not the axis',
      'Best / worst / average is a three-line summary that captures variance better than standard deviation (which nobody reads)',
      'Team rank is motivating when it\'s coarse ("3 of 18") and demoralising when it\'s exact — show it without percentile noise',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Lowercase metric IDs (\`aht\`, \`fcr\`, \`csat\`) match what you see in AMI events and BigQuery tables — use the same strings end-to-end so everything greps.',
      },
      {
        kind: 'warning',
        text: 'Don\'t show individual call-level data in a "history" view — it invites micromanagement. Aggregate to day or shift.',
      },
      {
        kind: 'note',
        text: 'For AHT, lower is better; for CSAT/FCR, higher is better. The "best" computation inverts based on metric — hardcode the direction.',
      },
    ],
    accessibility: [
      'The metric picker is a `role="radiogroup"` — keyboard users can arrow between metrics.',
      'The SVG chart has an `aria-label` summarising the current value and metric; the shape is decorative.',
      'Ranking uses the pattern "3 / 18", not a colour-coded medal — screen readers get the number.',
    ],
    takeaway:
      'History exists to answer "am I drifting?" — not "what happened on Tuesday." Keep the chart small and the verdict loud.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Live CDR + AMI events will flow into these metrics.'
      : 'Register to link this agent\'s stats to your session.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'Required for real-time KPI refresh.',
  },
  {
    label: 'CDR / stats source (optional)',
    met: true,
    hint: 'Asterisk CDR, FreeSWITCH mod_cdr_csv, or a cloud CCaaS API powers the numbers.',
  },
  {
    label: 'WFM integration (optional)',
    met: true,
    hint: 'Adherence and schedule come from the WFM system — NICE IEX, Verint, Calabrio.',
  },
])
</script>
