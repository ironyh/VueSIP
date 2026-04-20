<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="queue"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Queue from './Queue.vue'
import QueueSrc from './Queue.vue?raw'
import Policy from './Policy.vue'
import PolicySrc from './Policy.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Callbacks turn a queued wait into a promise. The caller leaves the queue, the system remembers them, and an agent calls back when the wait would have expired. The contact-centre literature calls this "virtual queueing" and the operational win is real — abandon rates drop by half, caller satisfaction rises, and nothing about the underlying \`app_queue\` or FreeSWITCH queue engine changes. The only new surface is the queue of pending outbound originates and the policy that governs them.

This demo splits the surface the way real dashboards do: a live queue for the supervisor who wants to see who's waiting, and a policy editor for the manager who decides what happens after three no-answers at 19:45 on a Friday. They're adjacent views on the same data and they get confused when merged.`

const variants: DemoVariant[] = [
  {
    id: 'queue',
    label: 'Queue',
    description: 'Pending callback requests with priority, ETA, and retry state.',
    component: Queue,
    source: QueueSrc,
    sourceName: 'Queue.vue',
    intro: `The queue is a priority-sorted list: VIP first, then high, then normal, with ETA as the tie-breaker inside each tier. Overdue entries are surfaced at the top with a red edge — the supervisor's eye lands there first because that's the only category that needs action right now.

Each row shows three things the agent actually uses: the number (always as E.164, copyable), the attempt counter (so they know whether to try harder or hand it to voicemail), and the ETA relative to now. Relative time ("in 12m", "4m overdue") beats absolute time for this use case — the supervisor's clock is Now, not 14:32:17.`,
    keyPoints: [
      'Sort by priority tier first, ETA second — a VIP scheduled in an hour still outranks a normal request that\'s due in five minutes',
      'The attempt counter drives agent behaviour: attempt 1/3 means "try calling", attempt 3/3 means "this one needs a plan B"',
      'Always show the last result (no-answer, busy, failed) — an agent deciding whether to try again needs the context from the previous try',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Wire the "Call now" button to AMI Originate with a distinctive X-Callback-ID header. The agent sees the context pop in their softphone and knows why they\'re calling before the remote answers.',
      },
      {
        kind: 'note',
        text: 'In FreeSWITCH, \`callcenter_config\` exposes queue abandons as events you can subscribe to for automatic callback enrolment. Asterisk\'s app_queue needs a bit more glue via \`QUEUE_MEMBER\` and AMI events.',
      },
      {
        kind: 'warning',
        text: 'Don\'t auto-execute callbacks from the UI — a race between the supervisor clicking "Call now" and the scheduler firing leads to duplicate originates. Lock the row, or let the scheduler own all originates and demote the UI to a "bump priority" action.',
      },
    ],
    accessibility: [
      'The priority badge pairs a background colour with an explicit text label (VIP / HIGH / STD).',
      'Cancel buttons carry `aria-label="Cancel callback for {number}"` so the × glyph is meaningful to screen readers.',
      'The stats grid uses a semantic heading hierarchy; the overdue count is announced alongside the total.',
    ],
    takeaway:
      'Keep the queue predictable: priority first, ETA second, state never hidden. Supervisors scan this list, they don\'t study it.',
  },
  {
    id: 'policy',
    label: 'Policy',
    description: 'Business hours, retry strategy, failure routing.',
    component: Policy,
    source: PolicySrc,
    sourceName: 'Policy.vue',
    intro: `Policy is the invisible layer that decides "callback at 07:50 Saturday — go or wait?". Get this wrong and either you interrupt people at home or you quietly drop requests the caller will remember. Get it right and the supervisor never thinks about it.

The three dials that matter: the business window (what counts as a valid time to call back), retry strategy (how many tries, at what interval, with what backoff), and failure action (what happens after the last try fails). Exponential backoff is tempting but wrong for callbacks — after 4 hours of silence, no caller wants to hear from you. Linear or fixed intervals win in practice; exponential is for API retries where the counterparty is a machine, not a person who's already forgotten they called.`,
    keyPoints: [
      'Business hours must be per-timezone of the callee, not per-office — a US caller logged to a UK queue is still protected by TCPA rules',
      'Max-retries at 3 with 15-minute intervals is the industry default and it\'s defaulted for a reason — higher numbers correlate with formal complaints',
      'The failure action is the most important single choice — "notify agent" keeps a human in the loop; "drop" silently fails; "voicemail" is a compromise that needs good scripting',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Preview the retry schedule as concrete minute offsets (15m, 38m, 75m) rather than just "linear backoff". Managers configure this once a quarter and can\'t remember what "×1.5" means by Thursday.',
      },
      {
        kind: 'warning',
        text: 'TCPA (US Telephone Consumer Protection Act) mandates 08:00–21:00 callee-local for consumer callbacks. Enforce it in code, not in policy docs — lawsuits start at exactly 07:59.',
      },
      {
        kind: 'note',
        text: 'Cap outbound originates per hour at the trunk level too. A runaway retry loop against a broken SIP peer can exhaust trunk channels and take down other queues — defence in depth.',
      },
    ],
    accessibility: [
      'Day-of-week toggles are native `<button>` elements with `aria-pressed` — state changes are announced.',
      'Failure-action options use `role="radiogroup"` / `role="radio"` with `aria-checked`; only one can be active.',
      'Time inputs use `<input type="time">` so screen readers expose the hours/minutes spinner natively.',
    ],
    takeaway:
      'Policy is the safety net under the queue. Show the retry schedule concretely, enforce regulatory windows in code, and default the failure action to something a human will notice.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Outbound callbacks will originate from the registered identity.'
      : 'Register to execute real callback originates; the queue and policy UI work regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport active.',
  },
  {
    label: 'AMI / ESL (optional)',
    met: true,
    hint: 'Asterisk AMI or FreeSWITCH ESL provides queue-abandon events for automatic enrolment.',
  },
  {
    label: 'Scheduler (optional)',
    met: true,
    hint: 'Separate scheduler service fires due callbacks; UI is read/edit only.',
  },
])
</script>
