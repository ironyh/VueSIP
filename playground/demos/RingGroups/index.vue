<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="members"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Members from './Members.vue'
import MembersSrc from './Members.vue?raw'
import StrategySettings from './StrategySettings.vue'
import StrategySettingsSrc from './StrategySettings.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A ring group is a dialable extension that maps to a set of phones. Someone calls 601; the PBX rings some combination of the team; whoever answers wins. Every detail behind "some combination" — strategy, timeout, failover, music — is what distinguishes a friendly ring group from a queue people hate.

Two surfaces, two decisions. Membership and strategy deserve one screen: who is in, what is their order, and how the ring distributes. Timing, failover, and music-on-hold deserve a second screen because they are edited rarely and together.`

const variants: DemoVariant[] = [
  {
    id: 'members',
    label: 'Members & strategy',
    description:
      'Agents in the group with live status; pick ringall / hunt / random / least-recent.',
    component: Members,
    source: MembersSrc,
    sourceName: 'Members.vue',
    intro: `Ringall is the default because it is the loudest: everyone's phone rings, first to pick up wins. It works fine for small teams; for groups bigger than six it becomes the famous "office-hellscape where every incoming call interrupts everyone."

Hunt is better once you have five or more agents. It rings the first on the list; if they don't answer within the timeout, it rings the second; and so on. The real insight is that order matters less than people expect — a five-agent hunt group with a 10-second timeout rings almost as fast as ringall, and the office stays quieter.`,
    keyPoints: [
      'Ringall = <code>Dial(PJSIP/a&amp;PJSIP/b&amp;PJSIP/c)</code>; everything else is <code>Queue()</code> with a `strategy=` parameter',
      'Live status comes from BLF / PJSIP qualify — do not ring agents marked DND or offline',
      'Keep a paused state separate from removed. Agents paused for lunch should reappear the same way',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the qualify latency next to each agent when debugging — 3+ seconds of qualify means their device is flaky before any call lands.',
      },
      {
        kind: 'warning',
        text: 'least-recent is fair but rarely what people expect. Educate users first; surprise rotation is the top support ticket.',
      },
      {
        kind: 'note',
        text: 'FreePBX calls "ring groups" one thing and "queues" another. Under the hood, FreePBX ring groups are simpler — no MOH, no wrap-up — and Queue() is the full product.',
      },
    ],
    accessibility: [
      'Strategy picker is `role="radiogroup"` with `aria-checked`.',
      'Status dot is paired with an accessible text label ("available", "busy") — colour is reinforcement.',
      'Pause toggle reads "In rotation" / "Paused" so screen readers get the meaning of the switch.',
    ],
    takeaway:
      'Ring groups are a distribution policy plus a roster. Pick strategy honestly, honour live status, and keep paused agents visible.',
  },
  {
    id: 'settings',
    label: 'Strategy settings',
    description: 'Timeouts, failover, music-on-hold, wrap-up.',
    component: StrategySettings,
    source: StrategySettingsSrc,
    sourceName: 'StrategySettings.vue',
    intro: `Ring timeout is the single knob everyone undertunes. Twenty-two seconds (four rings) is the sweet spot — long enough that an agent can actually get to the phone, short enough that callers do not abandon before failover kicks in.

Failover chains matter more than people think. A group that ends in voicemail is fine; a group that ends in "eternal ringing" loses the customer. Spell out the full chain: backup group → voicemail → on-call SMS. Each step should have an explicit timeout.`,
    keyPoints: [
      '22 s (four rings) is the empirical caller-patience ceiling; longer and abandonment climbs fast',
      'Always have a failover chain ending somewhere deterministic — voicemail, forwarding, SMS page',
      'Wrap-up time after every answered call is agent-welfare and statistics-accuracy; enable it',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Silence MOH on internal groups. Hearing the same jazz-bed on every internal transfer fatigues staff in a way recording does not reveal.',
      },
      {
        kind: 'warning',
        text: 'Announcing queue position is useful for long queues and condescending for short ones. Enable only when expected waits exceed 60 s.',
      },
      {
        kind: 'note',
        text: 'The retry delay is between agents, not between rings. Setting it to 0 with hunt means the next agent starts ringing the instant the previous one stops.',
      },
    ],
    accessibility: [
      'Numeric inputs are right-aligned with tabular numerals and carry their units as a separate label.',
      'Each failover step has a numbered badge and a plain-text target so SR users hear the order.',
      'Toggles use native checkboxes with visible labels, not colour-only affordances.',
    ],
    takeaway:
      'Good ring groups fail well. Short timeouts, a clear failover chain, and honest music-on-hold beat any clever strategy.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You can be included in a group as an endpoint.'
      : 'Register to actually receive ring group calls — this surface edits membership regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'AMI for queue reload',
    met: true,
    hint: 'Required to apply strategy changes without a full dialplan reload.',
  },
  {
    label: 'BLF / qualify (for live status)',
    met: true,
    hint: '`pjsip show endpoint` + subscription from the panel for live dots.',
  },
])
</script>
