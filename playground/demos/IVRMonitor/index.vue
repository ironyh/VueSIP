<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="flow"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import FlowMap from './FlowMap.vue'
import FlowMapSrc from './FlowMap.vue?raw'
import Sessions from './Sessions.vue'
import SessionsSrc from './Sessions.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `IVR monitoring is the difference between "my menu feels wrong" and "22% of callers abandon at the support-triage prompt." The first is a vibe; the second is an action item. These two surfaces give you both axes: the aggregate flow map for drop-off and optimisation decisions, and a live session log for debugging specific caller paths.

Most IVR dashboards collapse both into a single Sankey diagram that looks impressive and answers nothing. Keeping them separate respects that you're asking two genuinely different questions: one is "is the IVR designed well?", the other is "what is caller 415-555-0100 doing right now?"`

const variants: DemoVariant[] = [
  {
    id: 'flow',
    label: 'Flow map',
    description: 'Menu-by-menu traversal with visit counts, drop-off, and DTMF distribution.',
    component: FlowMap,
    source: FlowMapSrc,
    sourceName: 'FlowMap.vue',
    intro: `The flow map is where you answer design questions: which prompt is too long, which option is buried, which branch nobody takes. Each node shows visits, average time spent, drop-off percentage, and the full DTMF distribution — which digit got pressed how often.

The drop-off threshold is 15% for a reason. Industry benchmarks put healthy IVR drop-off at 5–10% per node; anything over 15% means the prompt is broken (too long, ambiguous, or asking for something the caller doesn't know). Flag those in red and don't apologise — a supervisor should see problems at a glance, not have to compute percentages.`,
    keyPoints: [
      'Show DTMF distribution inline, not in a drill-down — "47% pressed 2" is the insight you\'re scanning for',
      '15% drop-off is the action threshold; under that is noise, over is a menu redesign',
      "Include the exact prompt text — you can't optimise a menu without seeing what the caller actually hears",
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Track "zero input" separately from "wrong input" — they usually have different causes. Zero input = prompt too long; wrong input = options ambiguous.',
      },
      {
        kind: 'warning',
        text: "Don't A/B test IVR menus on production traffic without a rollback plan. A bad menu redesign can burn a day's worth of calls; monitor the first hour religiously.",
      },
      {
        kind: 'note',
        text: 'Asterisk logs IVR navigation via \`BackGround\` / \`WaitExten\` / \`Read\` applications. The dialplan variable \`${EXTEN}\` is your DTMF; \`${CDR(dstchannel)}\` is the destination.',
      },
    ],
    accessibility: [
      'Nodes are focusable with `role="button"`, `tabindex="0"`, and `aria-pressed` — keyboard users can navigate and select.',
      'Drop-off cells bold the number and add a colour class; "22%" is legible even to monochrome users.',
      'The DTMF bars have matching numeric percentages, so the bar length is redundant to the text, not primary.',
    ],
    takeaway:
      'A flow map is a menu audit. Show visits, drop-off, and DTMF distribution per node — and flag the ones over 15%.',
  },
  {
    id: 'sessions',
    label: 'Session log',
    description: 'Live caller paths with DTMF keypresses and per-session outcome.',
    component: Sessions,
    source: SessionsSrc,
    sourceName: 'Sessions.vue',
    intro: `The session log is where you debug individual calls. Each row is one caller's journey through the IVR, rendered as a horizontal breadcrumb (\`root → main [2] → support [2] → queue\`) with the DTMF digits inline. A blinking cursor at the end marks sessions still in progress.

This is the view you open when a customer calls back angry about "pressing 2 and ending up somewhere weird." The raw path tells you what they actually pressed, not what they say they pressed — and the timestamps narrow the search space in your CDR table. Pause / resume lets you freeze the log mid-incident.`,
    keyPoints: [
      "Render DTMF as a styled \`<kbd>\` element — it's literally the keypress, and the affordance matches",
      'The live cursor (\`▌\`) is worth the CSS animation; it unambiguously marks in-flight sessions',
      "Pause and clear are necessary controls — a streaming log you can't stop is unusable in an incident",
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Cap the visible list at ~12 rows. Infinite scroll on a live log is how supervisors miss the row they wanted to read.',
      },
      {
        kind: 'warning',
        text: "Don't log DTMF into plain text files if callers enter PINs or card numbers via IVR — the path will contain them. Mask or truncate on capture.",
      },
      {
        kind: 'note',
        text: "Every AMI \`VarSet\` event where the variable starts with \`IVR_\` is a breadcrumb if your dialplan sets them. FreeSWITCH's \`CHANNEL_STATE\` with \`CF_IVR\` gives similar granularity.",
      },
    ],
    accessibility: [
      'Status is a text badge ("navigating", "abandoned") plus border colour — screen readers get the word.',
      'The pause/resume control is a real `<button>` with `aria-pressed` — its state changes are announced.',
      'Session paths are semantic lists of steps, not div soup; keyboard users can tab through rows.',
    ],
    takeaway:
      'A session log is a debug view. One row per caller, one DTMF per step, and a pause button for when you need to read it.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your endpoint can be a target for IVR-originated transfers.'
      : 'Register to receive calls transferred out of the IVR.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'Transport must be up before AMI events flow.',
  },
  {
    label: 'IVR event source (optional)',
    met: true,
    hint: 'Asterisk \`VarSet\` events with \`IVR_*\` variables, or FreeSWITCH channel events, feed this view.',
  },
  {
    label: 'CDR storage (optional)',
    met: true,
    hint: 'Aggregate flow-map numbers come from CDR + custom IVR breadcrumbs, usually in Postgres or BigQuery.',
  },
])
</script>
