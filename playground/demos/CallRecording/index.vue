<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="in-call"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import InCall from './InCall.vue'
import InCallSrc from './InCall.vue?raw'
import Policy from './Policy.vue'
import PolicySrc from './Policy.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Call recording is two distinct jobs glued together by a shared data model. There's the in-call surface — a big red button, a clear meter, unambiguous pause — and there's the policy surface where somebody at 2 AM decides "record sales, don't record HR, keep it 90 days." Mix them into one screen and both get worse.

The non-negotiable technical bits are trivial. The hard part is legal. Two-party consent states (California, Florida, Illinois, Pennsylvania) require both sides to agree; the EU layers GDPR lawful-basis on top; the UK and Australia accept a periodic beep as sufficient notice. Build the legal primitives — announcement, beep, consent flag — into the core, not a plugin.`

const variants: DemoVariant[] = [
  {
    id: 'in-call',
    label: 'In-call control',
    description: 'Record / pause / resume with legal-announcement toggle during an active call.',
    component: InCall,
    source: InCallSrc,
    sourceName: 'InCall.vue',
    intro: `The in-call surface is the agent's cockpit. One big button, one clear state, one timer. The state machine has exactly four states — idle, recording, paused, stopped — and the UI reflects the current state without making the agent guess.

The pause button matters more than people realise. A customer reads a credit card number or a medical ID; the agent pauses, takes the number, resumes. Without pause, PCI compliance forces you to either post-process and redact (expensive, error-prone) or not record those calls at all (kills your training corpus). \`INFO Record: pause\` is one line of SIP — worth ten thousand in compliance fees.`,
    keyPoints: [
      'Client-side recording via \`MediaRecorder\` is just the audio — real server-side recording uses \`INFO Record: on/off\` (RFC 6086) or SIPREC (RFC 7866) for 3rd-party capture',
      'Pause/resume is a legal feature, not a convenience — PCI-DSS 3.2 specifically requires credit-card capture to be excluded from recordings',
      'The legal-announcement toggle is per-call, not per-account — agents in multi-jurisdiction queues need to opt in to announcement when the caller location is unknown',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the recording state in the page title (\`● Recording — John Smith\`). Users alt-tab away, and the tab favicon is how they remember they left a session recording.',
      },
      {
        kind: 'warning',
        text: 'Never start recording before the consent announcement finishes playing. Race conditions here are the single most common recording-compliance failure.',
      },
      {
        kind: 'note',
        text: 'The Web Audio API meter shown here is cosmetic — it animates from the live \`MediaStream\`, it does not drive actual capture. The \`MediaRecorder\` itself is the ground truth.',
      },
    ],
    accessibility: [
      'The REC indicator pulses via CSS animation wrapped in \`@media (prefers-reduced-motion: reduce)\` — motion-sensitive users see a static dot.',
      'State changes are announced via \`aria-live="polite"\` on the timer — screen readers get "Recording 00:47" without stealing focus.',
      'Start button is disabled (not hidden) when consent is unchecked, with \`:disabled\` styling — the reason is visible, not implicit.',
    ],
    takeaway:
      'The in-call surface has one job: let the agent record or not record without thinking. Pause is not a convenience, it is a compliance primitive.',
  },
  {
    id: 'policy',
    label: 'Recording policy',
    description: 'Auto-record rules by direction / caller / queue, retention window, consent text.',
    component: Policy,
    source: PolicySrc,
    sourceName: 'Policy.vue',
    intro: `Policy is the 2 AM screen — the admin decides once, and it runs until someone argues with legal. The rule surface is intentionally expression-based (\`direction=in\`, \`queue in ("sales","vip-sales")\`) because the real-world overlaps nobody can predict: "record sales but not when the customer is in Germany and we haven't completed KYC."

Retention is the quiet killer. A 7-day default is cheap and legal; a 7-year default is a \$200,000/year storage bill and a bull's-eye for subpoenas. Make the default visible, make the choices justified, and always show the computed dialplan so the admin can diff what they changed before they deploy it.`,
    keyPoints: [
      'Expose the match expression as code — \`direction=in\` is clearer and more auditable than a wizard-built "when inbound" rule',
      'Always preview the compiled policy (Asterisk dialplan, FreeSWITCH \`mod_record\`, or a JSON contract your PBX proxy consumes) before saving — blind saves are how production gets silently mis-recorded',
      'Retention must be visible on every rule — a hidden default is a lawsuit waiting for someone to sort records by date',
    ],
    notes: [
      {
        kind: 'warning',
        text: 'GDPR, CCPA, and HIPAA all treat recordings as personal data. "Keep forever" is never the right default — even for regulated industries, explicit retention is safer than implicit indefinite.',
      },
      {
        kind: 'tip',
        text: 'DTMF opt-in ("press 1 to acknowledge") shifts legal responsibility to the caller and is durable evidence of consent. Prefer it over announcement-only in high-risk verticals.',
      },
      {
        kind: 'note',
        text: 'Server-side rules live in the PBX dialplan (\`MixMonitor\` in Asterisk, \`record_session\` in FreeSWITCH). The client never sees the rule; it only sees \`INFO Record: on\` if you want agent-visible status.',
      },
    ],
    accessibility: [
      'Rule toggles use a custom switch pattern with text label ("On" / "Off") — colour is not the only state signal.',
      'Retention + consent-mode options form a \`role="radiogroup"\` with \`aria-checked\` — one option is always selected.',
      'The computed-policy preview is a plain \`<pre>\` — screen readers read it as code without decorative ARIA.',
    ],
    takeaway:
      'Policy is a contract. Make it readable, auditable, and reversible — and always show the diff before it ships.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Record INFO messages will reach the PBX on real calls.'
      : 'Register to send \`INFO Record\` messages; policy editing works regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Server-side recording (required for SIPREC)',
    met: true,
    hint: 'Asterisk MixMonitor, FreeSWITCH mod_record, or a dedicated SIPREC SRS.',
  },
  {
    label: 'Legal review (always)',
    met: true,
    hint: 'Default announcement text and retention window should be approved by counsel, not engineers.',
  },
])
</script>
