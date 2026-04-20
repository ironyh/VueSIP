<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="speaker"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import SpeakerBanner from './SpeakerBanner.vue'
import SpeakerBannerSrc from './SpeakerBanner.vue?raw'
import RecordeeView from './RecordeeView.vue'
import RecordeeViewSrc from './RecordeeView.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A recording indicator has two audiences and they have nothing in common. The caller ("speaker") needs legal notice that their voice is being captured — this is a compliance artefact, not a UI. The agent ("recordee" / operator) needs an always-visible confidence signal that recording is actually happening, plus a fast path to bookmark moments worth revisiting.

Build them separately. The speaker banner is content the lawyers write; the agent badge is a workflow primitive. Conflating them — "show the same message to both sides" — is how you end up with agent UIs that look like customer-facing disclaimers and customer disclaimers that look like developer tools.`

const variants: DemoVariant[] = [
  {
    id: 'speaker',
    label: 'Speaker banner',
    description: 'Customer-facing "this call is being recorded" notice, tuned per jurisdiction.',
    component: SpeakerBanner,
    source: SpeakerBannerSrc,
    sourceName: 'SpeakerBanner.vue',
    intro: `The speaker banner is the legal artefact. Its job is to put an unambiguous notice in front of the other party before their voice is captured, and to be easy for a lawyer to audit. Every element — the icon, the text, the visual weight, the citation — has a reason.

The interesting engineering problem is jurisdiction matching. You rarely know at INVITE time whether the caller is in San Francisco (two-party consent) or Nevada (one-party); most deployments fall back to the strictest rule that applies to the agent's region. Show the rule you picked and the citation you applied — auditability beats cleverness.`,
    keyPoints: [
      'Two-party consent states (CA, FL, IL, PA, WA + others) require explicit notice before capture — the "subtle" style is not sufficient',
      'GDPR requires lawful-basis disclosure, retention window, and contact for data-subject rights — plain "we record calls" text is non-compliant',
      'UK / AU accept a periodic beep (15 s tone) in lieu of announcement — mention it in the banner so users understand the audio artefact',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'When jurisdiction is ambiguous, default to the strictest applicable rule. "We recorded you because your lawyer didn\'t object" is not a legal strategy.',
      },
      {
        kind: 'warning',
        text: 'Never hide the banner behind "X this notice" — dismissal must be explicit consent (DTMF 1, verbal ack, or click "I agree"), not a UI-level annoyance toggle.',
      },
      {
        kind: 'note',
        text: "The banner lives in the caller's UI (webRTC softphone, browser SIP page) — for PSTN legs the notice is played as IVR audio before the INVITE completes to the agent.",
      },
    ],
    accessibility: [
      'The banner uses \`role="status"\` with \`aria-live="polite"\` — screen readers announce it without stealing focus from the call controls.',
      'Jurisdiction switcher is a \`role="radiogroup"\` with \`aria-checked\` — one jurisdiction is always selected.',
      'Legal citation is a plain \`<code>\` inside the banner — screen readers read the full reference (e.g. "CA Penal § 632").',
    ],
    takeaway:
      'A compliant banner is content, not UX. Write it with counsel, cite the rule, and let the visual weight match the legal weight.',
  },
  {
    id: 'recordee',
    label: 'Recordee view',
    description: 'Agent-facing persistent badge + per-moment annotation log.',
    component: RecordeeView,
    source: RecordeeViewSrc,
    sourceName: 'RecordeeView.vue',
    intro: `The agent view is a workflow tool. Its job is to answer "is this call being recorded?" at a glance from ten feet away — and to let the agent bookmark moments (consent acknowledged, PII pause window, escalation) without taking focus off the caller.

Annotations are the secret weapon. At review time, a recording without timestamps is a haystack. A recording with five typed bookmarks ("00:58 — customer reading card, paused until 01:18") is a contract. The UX discipline is making annotation cheap during the call: three taps, no modal, no typing required if the tag alone is enough.`,
    keyPoints: [
      'The badge colour and the pulse animation together encode state — a single colour would fail agents with full-colour-blindness (~8% of men)',
      'Annotation tags should be a fixed vocabulary (Consent / PII / Escalation / Note) — freeform tags are unsearchable and inconsistent across agents',
      'Expose the \`callId\` in the badge — when an agent reports "the recording of that call from earlier" to a supervisor, the ID is the only unambiguous identifier',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Bookmark keyboard shortcuts (F1=Consent, F2=PII, F3=Escalation) pay for themselves within a week of agent training — no mouse travel during a live call.',
      },
      {
        kind: 'note',
        text: 'The "Pause" button on the badge maps to \`INFO Record: pause\` — the recording file has a silent gap but the timestamp continuity is preserved for audit.',
      },
      {
        kind: 'warning',
        text: 'Do not let agents edit annotations after the call ends. Annotations are evidence; mutation after the fact destroys their integrity for dispute resolution.',
      },
    ],
    accessibility: [
      'The badge indicator pulses inside a \`@media (prefers-reduced-motion: reduce)\` guard — agents who set that preference see a static dot.',
      'Annotation-tag buttons form a \`role="radiogroup"\` with \`aria-checked\` — the selected tag is announced.',
      'Delete annotation buttons have \`aria-label="Delete annotation at 00:58"\` — the visual × is not meaningful on its own.',
    ],
    takeaway:
      'The agent badge is a confidence signal with bookmarking baked in. Make recording visibly on, pause visibly paused, and annotation a two-click affair.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Indicator reflects real call state.'
      : 'Register to drive the badge from live SIP events; demo is read-only otherwise.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Recording consent flow',
    met: true,
    hint: 'Server-side IVR or WebRTC announcement must fire before capture starts.',
  },
  {
    label: 'Annotation storage',
    met: true,
    hint: 'Annotations persist to your recording metadata store (Postgres, S3 object tags, etc.).',
  },
])
</script>
