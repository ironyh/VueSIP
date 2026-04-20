<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="station"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Station from './Station.vue'
import StationSrc from './Station.vue?raw'
import BreakReasons from './BreakReasons.vue'
import BreakReasonsSrc from './BreakReasons.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Agent login is the seatbelt of a call center: nothing else makes sense until the agent is on a queue and in the right state. The first variant is the entry point — station URI, agent ID, queue membership, and a ready/paused toggle — the kind of surface you load on shift-start and never look at again until logout. It's one screen, but every field has meaning to the dialplan on the other side.

The second variant is the companion screen that runs all day: break reasons. Asterisk's \`PAUSE\`/\`UNPAUSE\` actions accept a reason string, and WFM vendors (NICE, Verint, Calabrio) treat those strings as audit-grade identifiers. Getting the codes and caps right is the difference between adherence reporting that works and adherence reporting that's quietly made up.`

const variants: DemoVariant[] = [
  {
    id: 'station',
    label: 'Station login',
    description: 'URI, agent ID, queue membership, and the ready/paused segmented control.',
    component: Station,
    source: StationSrc,
    sourceName: 'Station.vue',
    intro: `The station login screen should be boring. Agents see it twice a day; it needs to be fast, obvious, and immune to typos. This variant uses two inputs (agent ID and station URI) locked while logged in, a list of queues with penalty values, and a three-state segmented control.

The penalty field matters more than it looks. Asterisk queue strategies (\`ringall\`, \`leastrecent\`, \`linear\`) distribute calls by penalty before skill — a support agent with penalty 0 will get pounded before a penalty-5 agent sees anything. Show it in the UI so supervisors understand why Priya's phone never rings.`,
    keyPoints: [
      'Lock identity fields (agent ID, station URI) once logged in — changing them mid-session corrupts the PBX state machine',
      'Show queue penalty explicitly — it determines call distribution order and supervisors need to see it to diagnose "why is X slammed"',
      'Ready / paused / wrap-up are three states, not two — wrap-up is after-call work that still counts toward adherence',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Preserve the last-used queue set in localStorage. Agents rejoin the same queues 95% of the time; remembering defaults saves six clicks per shift.',
      },
      {
        kind: 'note',
        text: 'The station URI differs from the agent URI in hot-desking setups. Asterisk distinguishes \`Interface\` (the device registration) from \`MemberName\` (the human).',
      },
      {
        kind: 'warning',
        text: 'Never let the agent log into queues they\'re not authorized for — validate server-side. Client-side queue lists are presentational only; the PBX is the source of truth.',
      },
    ],
    accessibility: [
      'The state picker is a `role="radiogroup"` with each option `role="radio"` and `aria-checked` — only one state is current.',
      'Queue toggles use `aria-pressed` so screen readers announce joined/unjoined state changes.',
      'Disabled fields keep their label/value visible — we never grey them into illegibility.',
    ],
    takeaway:
      'The login screen is an identity handshake, not a form. Lock what can\'t change mid-session, surface the penalty, and make ready-vs-paused a single click.',
  },
  {
    id: 'breaks',
    label: 'Break reasons',
    description: 'Pause codes, caps, billable flags, and the running pause timer.',
    component: BreakReasons,
    source: BreakReasonsSrc,
    sourceName: 'BreakReasons.vue',
    intro: `Break reasons are a workforce management primitive. Every pause has a code (\`PAUSE · 01\` for lunch, \`· 02\` for breaks, etc.), and those codes end up in adherence reports, payroll, and the coaching session where a supervisor asks why someone was in \`PAUSE · 05\` for 47 minutes.

The cap on each reason is a soft warning, not a hard lock — call centers that block pauses after 10 minutes breed lying agents who pick the "wrong" code. Instead, show the cap, show the running timer, and let the WFM report handle the rest. The billable flag flows through to payroll: training is paid, bathroom isn't (in most jurisdictions).`,
    keyPoints: [
      'Each pause carries a stable code (\`PAUSE · 01\` etc.) — WFM tools match on the code, never the label',
      'Show the cap as an indicator, not an enforcement — blocking pauses creates worse data than capturing long ones',
      'Billable vs non-billable flows through to payroll; that field is load-bearing, not decorative',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Clicking the active reason again should resume, not toggle off into a null state. Agents often tap twice when distracted — make the second tap useful.',
      },
      {
        kind: 'warning',
        text: 'Don\'t collapse bathroom + bio + personal into one "away" bucket. Privacy laws (GDPR especially) require you capture the category, not the detail, but the category needs to exist.',
      },
      {
        kind: 'note',
        text: 'Asterisk\'s \`QueuePause\` AMI action takes a \`Reason\` field; FreeSWITCH exposes it via \`callcenter_config agent set pause_contact\`. The reason string is what ends up in CDRs.',
      },
    ],
    accessibility: [
      'Break buttons use `aria-pressed` to announce active state — colour alone is insufficient.',
      'The running timer has `font-variant-numeric: tabular-nums` so digits don\'t jitter as they tick.',
      'History rows use semantic lists so screen readers can step through recent pauses in order.',
    ],
    takeaway:
      'Pauses are data. Capture the code, show the cap, flag the billable ones — and trust the WFM tool to judge.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Agent URI is live; queue membership will route real calls.'
      : 'Register first — queue joins require a reachable endpoint.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport must be up before AMI actions fire.',
  },
  {
    label: 'AMI / call-center provider (optional)',
    met: true,
    hint: 'Asterisk AMI, FreeSWITCH mod_callcenter, or a cloud ACD provides the pause/unpause primitives.',
  },
  {
    label: 'WFM integration (optional)',
    met: true,
    hint: 'NICE / Verint / Calabrio consume pause codes for adherence reporting.',
  },
])
</script>
