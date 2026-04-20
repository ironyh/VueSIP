<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="lamp"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Lamp from './Lamp.vue'
import LampSrc from './Lamp.vue?raw'
import SubscriptionDebug from './SubscriptionDebug.vue'
import SubscriptionDebugSrc from './SubscriptionDebug.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Message Waiting Indication is the oldest surviving consumer UI element in telephony: a lamp on the phone that lights up when you have voicemail. The protocol behind it is embarrassingly simple — subscribe to \`message-summary\` (RFC 3842), receive NOTIFYs with a count — and yet the failure modes are endless because the subscription lifecycle is invisible to users.

Build two surfaces. A consumer-grade lamp + badge that says "you have voicemail" without any SIP jargon, and a developer-grade subscription inspector that shows the actual SUBSCRIBE / NOTIFY traffic, the expiry timers, and the mailbox-to-dialog mapping. The former is what ships; the latter is what you need at 3 AM when the lamp won't go off.`

const variants: DemoVariant[] = [
  {
    id: 'lamp',
    label: 'Indicator lamp',
    description: 'Classic "new voicemail" lamp with count badge and simulate-NOTIFY controls.',
    component: Lamp,
    source: LampSrc,
    sourceName: 'Lamp.vue',
    intro: `The lamp is the consumer surface. It answers one question: do I have voicemail? Everything else — the count, the urgent flag, the per-mailbox breakdown — is elaboration on that single bit. Respect the bit first: make "on" visually obvious at ten feet, make "off" boring and unobtrusive.

The urgent flag (RFC 3458 \`Urgent-Messages\`) deserves its own visual treatment — red, not orange. On-call routing uses urgent; if your lamp collapses urgent into "new" you have silently broken a production workflow.`,
    keyPoints: [
      'Animate the lamp only when state changes or when urgent flag is set — constant animation erodes attention value',
      'Count badge should max out at "99+" — three-digit counts are noise, the actual number is available by tapping through',
      'Per-mailbox breakdown matters for users who monitor a team mailbox (sales@, oncall@) in addition to their own — surface all subscribed accounts, not just the primary',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Mirror the lamp state to the browser favicon and page title. Users alt-tab all day; the tab strip is how they notice new messages without coming back to this page.',
      },
      {
        kind: 'note',
        text: "The lamp is a view of the latest NOTIFY's \`Voice-Message: N/M\` header. No polling, no local counting — the server is the source of truth and NOTIFYs are idempotent.",
      },
      {
        kind: 'warning',
        text: 'Never derive the lamp state from "did I play a message client-side?" — users read voicemail on multiple devices. The PBX tracks "is message marked as read" and sends a fresh NOTIFY; trust it.',
      },
    ],
    accessibility: [
      'The lamp pulses via CSS animation gated by \`@media (prefers-reduced-motion: reduce)\` — the visual state remains clear without motion.',
      'Count badges are paired with plain-text labels ("3 new") — colour and position are not the sole indicators.',
      'The urgent counter is independent of the new counter with a red border — ensures colour-blind users can distinguish the two via placement.',
    ],
    takeaway:
      'The lamp is one bit made legible. Respect the bit first, layer counts and urgency on top, and mirror state to every surface the user watches.',
  },
  {
    id: 'debug',
    label: 'Subscription debug',
    description: 'Raw SUBSCRIBE / NOTIFY trace with account register and spec references.',
    component: SubscriptionDebug,
    source: SubscriptionDebugSrc,
    sourceName: 'SubscriptionDebug.vue',
    intro: `The debug view is for the operator staring at "why won't the lamp go off?" at 3 AM. The single most useful thing it can do is show the SIP trace with direction, timestamps, and method colouring — and let you filter by SUBSCRIBE / NOTIFY / responses so the signal survives contact with reality.

The second most useful thing is surfacing subscription state per mailbox: active, pending, terminated. A \`terminated;reason=noresource\` event explains 80% of "why is the lamp stuck on" bugs — somebody deleted the mailbox server-side, the client kept the stale count, and nobody told the user.`,
    keyPoints: [
      'Show raw message bodies — an MWI problem with \`Voice-Message: 3/7\` parsed as "3 new" is different from one where the header is missing entirely, and the difference is only visible in the body',
      'Include subscription \`Expires\` and current \`expiresIn\` — MWI that silently expires (no re-SUBSCRIBE) is a common failure mode that looks identical to "no new messages"',
      'Filter by method — at scale, NOTIFY floods the log; filtering SUBSCRIBE-only is how you debug refresh-cycle bugs',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Add a "copy as cURL" button on each SUBSCRIBE event. When the client misbehaves, being able to reproduce the request from a sip-cli tool is worth an hour of guessing.',
      },
      {
        kind: 'note',
        text: 'Subscription state transitions: \`pending\` → \`active\` → \`terminated\`. Terminated subscriptions should not be re-SUBSCRIBEd automatically when \`reason=noresource\` or \`reason=rejected\` — you will spam the PBX and possibly trip rate limits.',
      },
      {
        kind: 'warning',
        text: 'Do not log full NOTIFY bodies in production telemetry — mailbox URIs are PII in many jurisdictions. Hash or truncate before shipping to a third-party log aggregator.',
      },
    ],
    accessibility: [
      'The filter checkboxes are plain \`<label>\`-wrapped inputs — screen readers announce the filter name and state.',
      'Capture toggle uses \`aria-pressed\` with a visible state-change label ("Capture" / "Pause capture") — the pulse indicator is decorative.',
      'Trace events use a monospaced \`<pre>\` block — screen readers read each line in order without ARIA guesswork.',
    ],
    takeaway:
      "MWI is simple until it isn't. A raw trace + per-mailbox state view is the entire toolkit you need when the lamp misbehaves.",
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Client can SUBSCRIBE to message-summary events.'
      : 'Register first; MWI SUBSCRIBEs depend on a live registration.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'PBX mailbox with MWI support',
    met: true,
    hint: 'Asterisk voicemail.conf, FreeSWITCH mod_voicemail — all emit message-summary NOTIFYs.',
  },
  {
    label: 'Event package authorization',
    met: true,
    hint: 'Registrar must be configured to accept SUBSCRIBEs to message-summary from the registered user.',
  },
])
</script>
