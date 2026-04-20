<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="table"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Table from './Table.vue'
import TableSrc from './Table.vue?raw'
import Analytics from './Analytics.vue'
import AnalyticsSrc from './Analytics.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `CDR — Call Detail Records — is the raw ledger of your PBX. Every call that answers, fails, times out, or transfers writes a row: start time, duration, from, to, disposition, cost. Everything downstream (invoicing, fraud detection, capacity planning, your quarterly "why did we spend so much on long-distance" meeting) reads this table.

Two UIs live on top of it. The table view is operational — someone needs to find one specific call, or audit a 24-hour window for a customer complaint. The analytics view is strategic — trend lines, top destinations, peak-hour load. Same data, completely different audiences, completely different visual grammar.`

const variants: DemoVariant[] = [
  {
    id: 'table',
    label: 'Table view',
    description: 'Filterable CDR rows with duration, disposition, cost.',
    component: Table,
    source: TableSrc,
    sourceName: 'Table.vue',
    intro: `A CDR table should look boring on purpose. Dense, monospace numbers, tabular numerals, no decoration beyond what's needed to scan fast. The user came here because something specific happened — a call that got misbilled, a customer who claims they called yesterday — and your job is to help them find it in under 15 seconds.

Disposition is the critical column. ANSWERED / NO ANSWER / BUSY / FAILED map directly to Asterisk's DIALSTATUS channel variable, and if your dashboard uses different names (say, "Unanswered" vs "NO ANSWER"), someone will eventually compare CSV exports and discover the mismatch. Use the raw strings.`,
    keyPoints: [
      "Use Asterisk's raw DIALSTATUS strings (ANSWERED / NO ANSWER / BUSY / FAILED) — do not invent dashboard-only labels",
      'Search across SIP URI *and* E.164 — users will paste either form and the table should not care',
      'Billable duration is not total duration. Separate columns when the difference matters to the user',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Hot-link each row to the full SIP/PCAP trace if you have one. The table is the index; the trace is the body.',
      },
      {
        kind: 'warning',
        text: 'Be careful with cost rounding. Rate decks are usually four-decimal ($0.0094); rounding to cents hides the margin and upsets finance.',
      },
      {
        kind: 'note',
        text: "Asterisk's `cdr_csv` module writes a single line per call; `cdr_odbc` is better for structured queries. Either way, drop an index on the `calldate` + `dst` columns before the table gets big.",
      },
    ],
    accessibility: [
      'Search input has an explicit `aria-label` ("Search CDR") — the placeholder alone does not announce.',
      'Table uses `<th>` for column headers so assistive tech can announce row context.',
      'Disposition is a text badge, not colour alone — opacity communicates muted rows to sighted users as reinforcement only.',
    ],
    takeaway:
      'CDR tables are boring forensic tools. Dense, searchable, monospace, and honest about what "duration" means.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Volume by day, top destinations, average duration, answer rate.',
    component: Analytics,
    source: AnalyticsSrc,
    sourceName: 'Analytics.vue',
    intro: `Analytics is the step back. Nobody looks at a stacked bar chart to find a specific call — they look at it to notice Thursday spikes, weekend drop-offs, or the fact that France just quietly became your third-most-called country. Aggregation is the whole point; keep it coarse enough that trends are visible.

Top destinations is the chart that pays for itself. Any time you see "Nigeria" or "Cuba" appear unexpectedly in the top five, it is almost always fraud — toll-fraud calls routing through your PBX to premium international numbers. Surface it early, alert on it, and consider blocking entire prefixes until someone explicitly enables them.`,
    keyPoints: [
      'Stacked inbound/outbound bars make imbalance obvious; split totals hide it',
      'Top destinations is your fraud-detection canary — sort by calls, flag unexpected prefixes',
      'Answer rate under ~80% is a signal to investigate; high bounce rates often mean wrong numbers or carrier-side dropouts',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show seven days by default, not thirty. A week is enough context for most "has this gotten worse?" questions and it loads faster.',
      },
      {
        kind: 'warning',
        text: 'Do not average costs across answered and non-answered calls. Zero-cost rows drag the mean down and make bad numbers look fine.',
      },
      {
        kind: 'note',
        text: 'Peak-hour analysis is invaluable for capacity planning — it tells you how many concurrent channels you actually need, vs how many you provisioned.',
      },
    ],
    accessibility: [
      'Bar chart is marked `role="img"` with an `aria-label`; the per-day sums are rendered as text under each bar too.',
      'Destinations list uses `<ul role="list">` with a text-only fallback (no icon-only data).',
      'Stat tiles use tabular numerals; no hover is required to read values.',
    ],
    takeaway:
      'Analytics is the canary. Watch top destinations for fraud, watch peak hour for capacity, and always trust the weekly pattern more than one bad day.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your own calls will appear in the ledger.'
      : 'Register so your calls land in the CDR — analytics reads the same table.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'CDR backend (ODBC / CSV)',
    met: true,
    hint: '`cdr_odbc` preferred — indexes on calldate + dst make this viable at scale.',
  },
  {
    label: 'Rate deck (for cost)',
    met: true,
    hint: 'Apply post-hangup; four-decimal precision avoids rounding drift.',
  },
])
</script>
