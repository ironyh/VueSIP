<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="dashboard"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import OpsDashboard from './OpsDashboard.vue'
import OpsDashboardSrc from './OpsDashboard.vue?raw'
import IncidentLog from './IncidentLog.vue'
import IncidentLogSrc from './IncidentLog.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A SIP deployment is not one service — it is Asterisk (or FreeSWITCH), a registrar (often PJSIP), an edge proxy (Kamailio, OpenSIPS), a media server, TURN, Redis or Postgres for state, and one or more carrier trunks. Any of them going sideways can kill calls, and each of them reports health in a different dialect. A health surface has to translate all of that into something human.

The operational view answers "what is the state of everything right now?". The incident log answers "what has happened, what auto-healed, and what still needs me?". They are the two halves of runbook UI: at-a-glance status above the fold, narrative of events below.`

const variants: DemoVariant[] = [
  {
    id: 'dashboard',
    label: 'Ops dashboard',
    description: 'Per-service status lights for PBX, registrar, media, TURN, trunks.',
    component: OpsDashboard,
    source: OpsDashboardSrc,
    sourceName: 'OpsDashboard.vue',
    intro: `Group by role, not by hostname. Operators care that "the media server" is healthy; which box is hosting it this week is a detail for the runbook. Roll multiple replicas up into a single row and flag the row warn if any replica is warn.

Carrier OPTIONS are the single most useful health metric you are probably not capturing. A carrier that stops answering OPTIONS is a carrier about to drop your calls; most SIP stacks will send OPTIONS every 60 s if you turn it on, and treating a 408/timeout as "down" gives you a ~2-minute head start on user-visible failures.`,
    keyPoints: [
      'Roll up by role — one row for "registrar" even if there are three PJSIP boxes',
      'Carrier OPTIONS heartbeats catch outbound failures before users notice; enable and surface them',
      'Three states only: ok / warn / down. Anything finer grained belongs in the incident log',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Put the overall banner first. Operators should know if everything is fine in 0.5 seconds without reading rows.',
      },
      {
        kind: 'warning',
        text: 'Do not colour the whole row red — colour a dot and a badge. Red backgrounds are exhausting on a dashboard you stare at all day.',
      },
      {
        kind: 'note',
        text: "Asterisk's `CoreStatus` AMI action returns uptime and last-reload timestamps — useful context but do not mistake it for a liveness check.",
      },
    ],
    accessibility: [
      'State conveyed via text ("WARN", "DOWN") as well as colour and dot — colour-blind readers get the same information.',
      'Each row uses `<dl>` for stat key/value pairs.',
      'Overall pill carries the state in words — "All systems go" / "Attention needed".',
    ],
    takeaway:
      'Ops dashboards are for glancing. Group by role, surface the carrier heartbeat, keep the states to three.',
  },
  {
    id: 'log',
    label: 'Incident log',
    description: 'Chronological events, severity, auto-recovery notes.',
    component: IncidentLog,
    source: IncidentLogSrc,
    sourceName: 'IncidentLog.vue',
    intro: `The incident log is the forensic complement. It captures the events as they happen and, crucially, what the system did about them: trunks failed over, codec preferences shifted, quotas raised. A log that only records problems is half a log; the auto-recovery line is what lets operators trust the automation.

Make it easy to filter to "open" — everything else is context. A 24-hour window with "2 open, 4 resolved" is the useful summary; a 30-day scroll is data science, not ops.`,
    keyPoints: [
      'Log auto-recovery alongside the incident — "trunk failed over" is as important as "trunk timed out"',
      'Keep severity to three levels (info / warn / crit); anyone who wants five will eventually learn to use three',
      'Filter to "open" as the default if anything is open; otherwise show resolved so the place does not look empty',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Link each incident to the dashboards / traces / logs that explain it. An incident without a "see more" link is a dead end.',
      },
      {
        kind: 'warning',
        text: 'Do not write too many messages to the log during a storm — flood control matters. Aggregate repeats ("3x OPTIONS timeout in 60 s") instead of listing them all.',
      },
      {
        kind: 'note',
        text: 'Asterisk `UserEvent`, Kamailio `xlog`, and your media server all emit structured events — feed them into the same log so the narrative is unified.',
      },
    ],
    accessibility: [
      'Filter buttons use `role="radiogroup"` and `aria-checked`.',
      'Severity is a text badge, not colour-only; borders reinforce but do not substitute.',
      'Auto-recovery rows have a distinct label so screen readers announce them separately from the incident body.',
    ],
    takeaway:
      'The log is the story. Always record what the system did next, aggregate during storms, and link out to the full trace.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your own registration will appear as a PJSIP endpoint.'
      : 'Registration optional — this surface is about the server fleet, not your client.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'AMI over WebSocket',
    met: true,
    hint: '`CoreStatus`, `ModuleShow`, `PJSIPShowEndpoints` are the data source.',
  },
  {
    label: 'Carrier OPTIONS pings',
    met: true,
    hint: 'Enable on every trunk — most valuable health signal you can capture.',
  },
])
</script>
