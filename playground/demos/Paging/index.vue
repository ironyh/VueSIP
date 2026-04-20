<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="multicast"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Multicast from './Multicast.vue'
import MulticastSrc from './Multicast.vue?raw'
import Intercom from './Intercom.vue'
import IntercomSrc from './Intercom.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Paging is two completely different features wearing the same hat. Multicast page is a one-to-many broadcast — hold a button, every speakerphone on the floor hears you — and Intercom is a 1:1 auto-answer call that kicks a target extension's speaker on without a ring.

They share a mental model ("talk without asking permission") but the plumbing is different: multicast RTP to a group address versus a unicast INVITE with a special header the endpoint recognises. Same confusing word, two separate features, and operators always ask for both.`

const variants: DemoVariant[] = [
  {
    id: 'multicast',
    label: 'Multicast page',
    description: 'Broadcast to a paging group with push-to-talk.',
    component: Multicast,
    source: MulticastSrc,
    sourceName: 'Multicast.vue',
    intro: `Multicast RTP is the scaling trick. One packet leaves the server, the network replicates it to every subscribed phone, and you page a hundred handsets with the bandwidth of one call. The cost is that the phones need provisioning (they must be told which group addresses to listen on) and the network has to cooperate — IGMP snooping, no blocking of 239.0.0.0/8, multicast crossing VLAN boundaries via PIM if you're unlucky.

Push-to-talk matters here. A paging UI with a "start" and "stop" button is a footgun; you will forget to stop it. Hold-to-talk matches the radio metaphor people already know, and releasing the button guarantees the broadcast ends.`,
    keyPoints: [
      'Multicast RTP scales flat — 1 phone or 1,000 costs the same bandwidth on the uplink',
      'Phones must subscribe via provisioning (`paging-group=sales` in config files); the PBX does not push membership',
      'Use 239.0.0.0/8 (admin-scoped) addresses, not link-local, if multicast has to cross VLANs',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Offer a "pre-announce tone" (half-second chime) before the audio. People hear the chime, know to listen; without it they miss the first second of every page.',
      },
      {
        kind: 'warning',
        text: 'Multicast across VPNs almost never works out of the box. If you have remote workers, either tunnel it explicitly or degrade to unicast paging via `Page()` with a member list.',
      },
      {
        kind: 'note',
        text: 'Asterisk `app_page()` and FreeSWITCH `bgapi uuid_broadcast` both work; the PBX choice matters less than the endpoint provisioning.',
      },
    ],
    accessibility: [
      'Push-to-talk button uses `aria-pressed` and is keyboard-operable (Space).',
      'Group picker is a `role="radiogroup"` with `aria-checked` on each option.',
      'Live state is a text badge ("LIVE" / "IDLE"), not colour alone.',
    ],
    takeaway:
      'Multicast paging is efficient broadcast with a push-to-talk UI — hold to talk, release to stop, and make sure the network carries 239.x.',
  },
  {
    id: 'intercom',
    label: 'Intercom',
    description: '1:1 auto-answer call with speaker engagement.',
    component: Intercom,
    source: IntercomSrc,
    sourceName: 'Intercom.vue',
    intro: `Intercom is just a call with the "please don't ring, just turn on the speaker" header set. Polycom and Yealink look for \`Call-Info: answer-after=0\`; Cisco wants \`Alert-Info: Intercom\`. Both are implementation details of the endpoint — the PBX side is one \`SIPAddHeader\` before \`Dial()\`.

The social consequences are the interesting bit. Intercom bypasses consent: the receiver has no chance to say "hold on, I'm in a meeting". Good intercom UX at least announces who is intercoming (caller name spoken by the phone), and falls back to a ring if the extension is already on a call.`,
    keyPoints: [
      'Add `Call-Info: answer-after=0` (Polycom/Yealink) or `Alert-Info: Intercom` (Cisco) — endpoint-specific',
      'Do not intercom a busy extension; fall back to ring or refuse the page',
      'Announce-only vs two-way — let the operator decide whether the target can reply',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Default to two-way. "Hey, I need you in the conference room" gets an answer; announce-only is for PA systems, not peer-to-peer.',
      },
      {
        kind: 'warning',
        text: "Intercom across DND / call-forward is a rights escalation. Honour the target's status unless the caller has an explicit override permission.",
      },
      {
        kind: 'note',
        text: 'Some handsets play a short tone before answering. Do not disable it — it is the only consent signal the receiver gets.',
      },
    ],
    accessibility: [
      'Target picker marks busy extensions with both text ("on a call") and `disabled`, not colour alone.',
      'Timeline uses a simple `<ol>` with textual state descriptions screen readers can follow in order.',
      'The `Two-way / Announce-only` toggle is a real checkbox with an explicit label change on both states.',
    ],
    takeaway:
      'Intercom is a unicast call with an auto-answer header and a social contract. Honour DND, default to two-way, and always identify the caller.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You can page / intercom live extensions.'
      : 'Register to drive real pages — this view still demonstrates the UX without it.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Multicast RTP on LAN',
    met: true,
    hint: 'Required for multicast paging; skipped for intercom.',
  },
  {
    label: 'Endpoint provisioning',
    met: true,
    hint: 'Phones must be told which paging groups to subscribe to.',
  },
])
</script>
