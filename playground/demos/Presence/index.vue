<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="personal"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Personal from './Personal.vue'
import PersonalSrc from './Personal.vue?raw'
import Roster from './Roster.vue'
import RosterSrc from './Roster.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `SIP presence is two flows glued at the spine: you \`PUBLISH\` your own state (PIDF documents over SIP — RFC 3856/3903), and you \`SUBSCRIBE\` to the people you care about, receiving their state back through \`NOTIFY\`. The presence server fans one publish out to many watchers, and fans many subscriptions in to a single source of truth.

The UI work splits along that same seam. A self-status surface is for the human deciding what to broadcast — a small, declarative, almost calm surface. A roster is where the noise lives — dozens of people, constantly changing, needing filters, grouping, and a clear "who can I interrupt right now?" signal. These are the two halves; most products ship both.`

const variants: DemoVariant[] = [
  {
    id: 'personal',
    label: 'Self status',
    description: 'Broadcast your own availability with optional note and auto-triggers.',
    component: Personal,
    source: PersonalSrc,
    sourceName: 'Personal.vue',
    intro: `The self-status card is the authoring surface for your PIDF document. Five canonical states (Available, Busy, Away, Do-Not-Disturb, Offline) cover every SIP client ever built — don't invent new ones unless your PBX actually supports them, or watchers will just see "unknown" and tune you out.

The status note is the only soft input here, and it's the most valuable. "In a meeting until 3 PM" prevents ten interruptions; a colored dot prevents zero. Budget your pixels accordingly. The auto-triggers (on-call → Busy, DND → Unavailable, idle → Away) are the real win — humans forget to flip switches, the client doesn't.`,
    keyPoints: [
      'PIDF \`PUBLISH\` is a fire-and-forget — the server holds your doc and fans it to watchers. You re-publish on state change only, not on a timer',
      "Five states is the ceiling, not a suggestion. Custom states silently degrade to Unknown on watchers that don't recognise them",
      'Auto-triggers (call/DND/idle) belong in the client, not the server — the server has no idea your OS is idle',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the "since" timestamp. When a user has been "Busy · since 14:02" for four hours, they want to know before they forget and leave the office in DND.',
      },
      {
        kind: 'warning',
        text: "Don't default Idle → Away to on. It's a privacy concession (watchers infer you're AFK), and opting in is the polite ask.",
      },
      {
        kind: 'note',
        text: 'Notes are published in the PIDF \`<note>\` element and watchers SHOULD display them — but some clients ignore them entirely. Treat them as nice-to-have, not load-bearing.',
      },
    ],
    accessibility: [
      'State cards form a `role="radiogroup"` with `aria-checked` on each option — exactly one state is always active.',
      'The avatar status dot is `aria-hidden` (decorative); the state is conveyed in text next to the name for screen readers.',
      'Auto-trigger toggles are plain checkboxes with associated labels — no custom ARIA needed.',
    ],
    takeaway:
      'The self-status surface succeeds by being small, legible, and opinionated about the five canonical states.',
  },
  {
    id: 'roster',
    label: 'Watched roster',
    description: 'Group, search, and filter the people you subscribe to.',
    component: Roster,
    source: RosterSrc,
    sourceName: 'Roster.vue',
    intro: `A roster is the watcher side — one \`SUBSCRIBE\` per contact, one \`NOTIFY\` stream back per state change. For small teams a flat list works; past ~15 contacts you need grouping (by team, by state) and filters (hide offline, search). The row layout is the same sturdy pattern every directory uses: avatar with state dot, name, URI, tools.

The call/message affordances are where SIP presence earns its keep. A call button that goes disabled the instant the peer flips to DND is worth the entire subscription stack — watchers avoid interruptions without thinking about it. That "don't call me" signal is the whole point of the system; honour it in the UI.`,
    keyPoints: [
      'Group by state for triage ("who\'s available right now?"), group by team for recall ("find me someone from Design"). Offer both — users switch constantly',
      'Disable the call button when the peer is DND or Offline. A greyed button teaches the user the state faster than a red dot ever will',
      "A SUBSCRIBE dialog is per-contact — unsubscribe when the user removes someone from the roster, or you'll leak dialogs",
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Sort within each group: Available first, then Busy → Away → DND → Offline. Alphabetical is a distant second — users are looking for "who can I reach" before "Alex or Alice".',
      },
      {
        kind: 'note',
        text: 'The roster is client-state. You\'re maintaining the list of URIs locally and issuing SUBSCRIBEs on load; there\'s no server-side "roster" in base SIP (XCAP can provide one but few PBXs expose it).',
      },
      {
        kind: 'warning',
        text: 'Polling SUBSCRIBEs eats server resources. Most PBXs cap watchers per user at 50–100; plan the UX for that ceiling, don\'t hand users a "watch 500 people" button.',
      },
    ],
    accessibility: [
      'Each row exposes state in a text chip ("Available", "Busy", "Do-Not-Disturb") — colour is reinforcement, not the only channel.',
      'Group-by buttons use `role="radiogroup"` / `role="radio"` with `aria-checked`; exactly one grouping is always active.',
      'Call/message tools are `<button>` with `aria-label` including the contact name; disabled state is conveyed by the native `disabled` attribute.',
    ],
    takeaway:
      'A good roster is 20% layout and 80% respecting the signal — DND means don\'t call, not "a red dot".',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'PUBLISH and SUBSCRIBE will hit your PBX once wired up.'
      : 'Configure SIP in the header; presence is UI-only until then.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Presence server (PIDF / SIMPLE)',
    met: true,
    hint: 'Most modern PBXs (Asterisk, FreeSWITCH, Kamailio) speak PIDF out of the box.',
  },
  {
    label: 'Watcher allowlist / XCAP',
    met: true,
    hint: 'Privacy rules — who is allowed to SUBSCRIBE to you — are typically managed out-of-band via XCAP or the PBX UI.',
  },
])
</script>
