<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="board"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Board from './Board.vue'
import BoardSrc from './Board.vue?raw'
import Waiting from './Waiting.vue'
import WaitingSrc from './Waiting.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Queue monitoring is the supervisor's radar. There are two questions it has to answer: "are my queues healthy?" (aggregate) and "who is waiting right now?" (individual). Both matter — but they want different screens. A multi-queue board is scanned in seconds to find the outlier; a per-queue waiting list is read line-by-line to decide who to help.

Bundling them produces a wall-of-numbers screen where both jobs are harder. These two variants separate the signal and the detail: the board tells you which queue is on fire, the waiting list tells you which caller to rescue.`

const variants: DemoVariant[] = [
  {
    id: 'board',
    label: 'Queue board',
    description: 'Multi-queue overview with SLA, waiting, active, agents-ready.',
    component: Board,
    source: BoardSrc,
    sourceName: 'Board.vue',
    intro: `The queue board answers one question: which queue is not okay? It's the NOC dashboard of the ACD — quick to scan, colour-coded by threshold, and intentionally sparse on detail. Every row is a queue; every queue shows the same seven numbers.

SLA ("80/20" — 80% of calls answered within 20 seconds) is the traditional yardstick, but the useful field on this screen is \`longest wait\`. Aggregates lie about tail latency; a queue at 85% SLA with a 7-minute longest-wait still has a furious caller. Show both, highlight when either crosses a threshold.`,
    keyPoints: [
      'Colour on the border-left, not the background — tinted rows become illegible on projectors in NOCs',
      'Strategy names (\`ringall\`, \`leastrecent\`, \`linear\`, \`wrandom\`) go straight from Asterisk\'s \`queues.conf\` — don\'t translate them',
      'Longest-wait deserves equal billing to SLA; aggregate numbers can hide one very angry caller',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Auto-refresh at 3–5 seconds. Sub-second polling is a performance tax with no operational benefit; supervisors don\'t need millisecond fidelity.',
      },
      {
        kind: 'warning',
        text: 'Don\'t hide empty queues. A queue showing 0/0/0 is a negative data point — it tells you the queue is drained (good) or broken (bad).',
      },
      {
        kind: 'note',
        text: 'FreeSWITCH\'s \`callcenter_config\` uses different strategy names (\`agent-with-least-talk-time\`, \`round-robin\`). The board\'s job is to show what the PBX reports, not translate.',
      },
    ],
    accessibility: [
      'Alert rows use `border-left` color plus text ("SL 58%") — colour is never the only channel.',
      'Numeric cells use `font-variant-numeric: tabular-nums` so columns align for screen-reader row traversal.',
      'The live-refresh toggle is a real checkbox with a text label, not just a pulsing dot.',
    ],
    takeaway:
      'A queue board is a NOC screen. One queue per row, seven numbers per queue, borders that flag trouble — nothing else.',
  },
  {
    id: 'waiting',
    label: 'Waiting list',
    description: 'Per-caller view with live wait timers, entry channel, and pickup actions.',
    component: Waiting,
    source: WaitingSrc,
    sourceName: 'Waiting.vue',
    intro: `The waiting list is the other half of the supervisor's job: deciding which caller needs rescuing. Each row is a human with a ticking timer; the queue name has already been chosen. Position 1 is the next to be picked up; a 3-minute wait at position 5 is a call about to be lost.

The interesting column is \`entry\` — where did this caller come from (IVR path, callback, direct dial). When a supervisor picks someone up early, they do it based on context: a callback caller who's been waiting twice once already, or a priority flag from the CRM. Show the entry path so the supervisor isn't flying blind.`,
    keyPoints: [
      'Live-ticking wait timers are the only reason to poll — render them from client-side elapsed math to avoid flooding the backend',
      'Entry channel (IVR branch, callback, direct) determines how the supervisor prioritises — show it explicitly',
      '"Pick up" and "Drop" should be the only actions — a queue detail view is not the place for transfers or notes',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Track join timestamp, not a decrementing counter. The UI ticks locally off \`Date.now() - joinedAt\`, which survives tab-backgrounding without drift.',
      },
      {
        kind: 'warning',
        text: '"Drop" is a destructive action — the caller hears a SIP 603 or BYE. Require a confirm modal in production; this demo keeps it one click for clarity.',
      },
      {
        kind: 'note',
        text: 'Asterisk exposes queue position via the \`QueueCallerJoin\` / \`QueueCallerLeave\` AMI events; FreeSWITCH uses \`callcenter::info\`. Both are push — no need to poll.',
      },
    ],
    accessibility: [
      'Each action button has an `aria-label` that includes the caller\'s number — "Pick up +14155550100" is announced, not just "Pick up".',
      'Row colour-coding uses `border-left`; the critical wait also bolds the duration text so the urgency is textual.',
      'The queue picker is a native `<select>` with `aria-label`, so keyboard users arrow through queues without hunting.',
    ],
    takeaway:
      'One row per caller, one live timer, two actions. The supervisor\'s decision ("who do I help next?") should take less than a second.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Pickup actions will issue REFER / AMI Redirect to your endpoint.'
      : 'Register to bind pickup actions to a real leg.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'Transport must be up for supervisor actions.',
  },
  {
    label: 'Queue event stream (optional)',
    met: true,
    hint: 'Asterisk AMI (\`QueueCallerJoin\`/\`QueueCallerLeave\`) or FreeSWITCH ESL pushes the updates.',
  },
  {
    label: 'Supervisor role (optional)',
    met: true,
    hint: 'Pickup / drop actions usually require elevated AMI permissions.',
  },
])
</script>
