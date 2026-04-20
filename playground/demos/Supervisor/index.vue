<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="roster"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Roster from './Roster.vue'
import RosterSrc from './Roster.vue?raw'
import Alerts from './Alerts.vue'
import AlertsSrc from './Alerts.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A supervisor panel is the bridge between an ACD's raw events and a human making tactical decisions. The supervisor needs two feeds: live agent state (who is on what call, for how long) and a noisy channel of threshold-triggered alerts (SLA breaches, long waits, abandon bursts). One drives hands-on intervention — spy, whisper, barge. The other drives attention.

Most "supervisor views" crash these together, and the result is a dashboard where you can't tell if a yellow tile means an agent is paused for lunch or a queue is collapsing. These two variants keep the roster and the alert stream separate, because they answer different questions.`

const variants: DemoVariant[] = [
  {
    id: 'roster',
    label: 'Agent roster',
    description: 'Live agent state with spy, whisper, and barge tools per row.',
    component: Roster,
    source: RosterSrc,
    sourceName: 'Roster.vue',
    intro: `The roster is the supervisor's working surface. Every agent is a row; every row shows state, current call context, and the three supervisor tools that matter: spy (silent monitor), whisper (coach without the caller hearing), barge (join the call). Those map 1:1 to Asterisk's \`ChanSpy\` application with \`w\`, \`whisper\`, and \`barge\` options.

The tools are disabled unless the agent is \`on_call\` — nothing to spy on otherwise. That's not just UX politeness; ChanSpy on an idle channel silently fails in some Asterisk builds and returns a confusing error in others. Better to gate in the UI.

The state badge uses four colours because there are really four meaningful states (ready, on-call, paused, wrap); offline is just muted opacity.`,
    keyPoints: [
      'Spy / whisper / barge map directly to Asterisk \`ChanSpy\` options — keep the verbs consistent end-to-end',
      'Disable supervisor actions when the agent is not on a call — the underlying AMI action will fail, so the UI should say so',
      '\`wrap\` (after-call work) is a real state; collapsing it into \`ready\` or \`paused\` loses adherence accuracy',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Sort agents by state, not alphabetically. On-call and long-paused agents should float to the top — that\'s where the supervisor\'s attention goes.',
      },
      {
        kind: 'warning',
        text: 'Barge is audible to the caller. Train supervisors that barge is a nuclear option — use whisper for coaching, barge only when you\'re resolving a dispute.',
      },
      {
        kind: 'note',
        text: 'FreeSWITCH uses \`eavesdrop\` with \`eavesdrop_whisper_aleg\` / \`eavesdrop_whisper_bleg\` flags. Same three modes, different dialplan incantation.',
      },
    ],
    accessibility: [
      'Every tool button has an `aria-label` that includes the agent\'s name — "Whisper to Alex Rivera", not just "Whisper".',
      'Disabled tools stay in the tab order (a focused screen-reader user can still inspect them) but carry a `title` explaining the disable reason.',
      'The state filter is a `role="radiogroup"` — one filter is always active, keyboard-navigable via arrow keys.',
    ],
    takeaway:
      'A roster is a list of humans doing work. Show the state, the call, and the three tools. Don\'t decorate — supervisors are scanning, not admiring.',
  },
  {
    id: 'alerts',
    label: 'Queue alerts',
    description: 'SLA breaches, long waits, abandon rate, and ack/dismiss workflow.',
    component: Alerts,
    source: AlertsSrc,
    sourceName: 'Alerts.vue',
    intro: `The alerts surface is an inbox, not a dashboard. Each item is a threshold-triggered event with a severity, a queue, a human-readable message, and a \`firedAt\` timestamp. The supervisor's workflow is: ack the ones they've seen, dismiss the ones no longer relevant, ignore the rest.

The thresholds at the top of the panel are a deliberate UX choice. Hiding thresholds in a settings page turns "why did this fire?" into a support ticket; surfacing them inline means a supervisor can tune sensitivity mid-shift when a queue is running hot or cold. SLA alerts fire every 30s in real deployments — de-duping by count (\`×3\`) keeps the list legible.`,
    keyPoints: [
      'Thresholds live next to the alerts they generate — hiding them in settings breeds supervisors who stop trusting the alerts',
      'Ack and dismiss are different verbs: ack means "I\'ve seen this," dismiss means "this is no longer true"',
      'De-dupe by \`(kind, queue)\` and show a count — raw logs of every 30-second SLA sample are useless',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Sort by ack-state first, severity second, time third. An unacked warning from 10m ago is more important than an acked critical from 30s ago.',
      },
      {
        kind: 'warning',
        text: 'Don\'t auto-clear critical alerts. Supervisors need to explicitly close the loop; silent clearing hides under-staffing patterns from the weekly review.',
      },
      {
        kind: 'note',
        text: 'SLA is an interval measurement — "80% of calls answered within 20 seconds over the last 15 minutes." Alert on the interval, not on a single call.',
      },
    ],
    accessibility: [
      'Severity is shown textually ("critical" / "warning" / "info") alongside border-left colour — colour is never load-bearing.',
      'Dismiss buttons have `aria-label="Dismiss {kind} alert"` — the visual × is not meaningful alone.',
      'Threshold inputs are real `<input type="number">` fields with min/max — keyboard users can arrow through values.',
    ],
    takeaway:
      'Alerts are an inbox. Show the threshold that produced them, let the supervisor ack or dismiss, and de-dupe mercilessly.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Supervisor audio path is up; spy / whisper / barge will route.'
      : 'Register to bind a listening leg for ChanSpy.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'Transport is required for AMI originate / spy actions.',
  },
  {
    label: 'Supervisor AMI permissions (optional)',
    met: true,
    hint: 'ChanSpy originate requires the \`originate\` and \`command\` privileges in manager.conf.',
  },
  {
    label: 'Alert event source (optional)',
    met: true,
    hint: 'Prometheus + Alertmanager, or a PBX-integrated rules engine, feeds the alert stream.',
  },
])
</script>
