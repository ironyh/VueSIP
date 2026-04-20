<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="blind"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'
import { useCallSession } from '../../../src'
import { useCallControls } from '../../../src/composables/useCallControls'
import { useSimulation } from '../../composables/useSimulation'
import { provideCallTransferDemoContext } from './sharedContext'

import Blind from './Blind.vue'
import BlindSrc from './Blind.vue?raw'
import Attended from './Attended.vue'
import AttendedSrc from './Attended.vue?raw'
import QuickTargets from './QuickTargets.vue'
import QuickTargetsSrc from './QuickTargets.vue?raw'

const { isConnected, isRegistered, getClient } = playgroundSipClient
const sipClientRef = computed(() => getClient())
const callSession = useCallSession(sipClientRef)
const controls = useCallControls(sipClientRef)
const simulation = useSimulation()

provideCallTransferDemoContext({ callSession, controls, simulation })

const overview = `Transfer is the SIP feature that separates "dialer apps" from "phone systems". Blind and attended are the two flavours every PBX supports, and they map to two very different UX patterns: blind is a single form field and a commit button; attended is a small multi-step wizard with a parked primary caller and a live consult leg.

Under the hood both are \`SIP REFER\`, but the app-facing API surface is split: blind transfer can be a one-shot action, while attended transfer usually wants \`useCallControls()\` because it owns the temporary consult leg. The interesting work is in the UI: telling the user where they are in the flow, keeping the parked caller visible, and giving them a clean escape hatch.`

const variants: DemoVariant[] = [
  {
    id: 'blind',
    label: 'Blind transfer',
    description: 'One field, one button — the fire-and-forget transfer.',
    component: Blind,
    source: BlindSrc,
    sourceName: 'Blind.vue',
    intro: `Blind transfer is the shortest path from "I need to move this caller" to "they're someone else's problem". You type a target, press the button, and VueSIP sends a SIP REFER. The remote end follows it, your local leg tears down, and the caller is now on the phone with whoever you REFERred them to — without you introducing them.

The stepper underneath mirrors the protocol: REFER is sent, a NOTIFY comes back with the result, and then the local session hangs up. Show this trail in production too — users who see blind transfers fail silently will stop trusting the button.`,
    keyPoints: [
      '`blindTransfer(sessionId, target)` is the entire call',
      'The REFER/NOTIFY round-trip can take a second or two on a slow PBX — show a pending state',
      'On success, your local session ends. If your UI is call-aware, it will reset to idle naturally',
    ],
    notes: [
      {
        kind: 'warning',
        text: 'Blind means blind — if the target doesn\'t pick up or rejects the call, the original caller may end up in voicemail jail. Prefer attended transfer for high-value callers.',
      },
      {
        kind: 'tip',
        text: 'Validate the target input before enabling the button. A malformed URI makes the PBX reply with a 4xx and the user gets a cryptic error instead of a clear "wrong format".',
      },
    ],
    accessibility: [
      'The Transfer button has `aria-live` feedback via the live region on the stage, so status changes are announced.',
      'Error state uses `role="alert"` — screen readers interrupt to announce failure.',
      'Enter in the target input triggers the transfer, matching keyboard expectations.',
    ],
    takeaway:
      'Blind transfer is a one-liner in the composable — the UX work is showing pending and error states clearly.',
  },
  {
    id: 'attended',
    label: 'Attended transfer',
    description: 'Hold, consult, then bridge — the "let me introduce you" flow.',
    component: Attended,
    source: AttendedSrc,
    sourceName: 'Attended.vue',
    intro: `Attended transfer is two calls held in tension. The primary caller goes on hold; you dial the target and consult; if they agree, you bridge the two and drop. If they don't, you cancel the consult and return to the primary. Users routinely abandon the flow halfway — your UI has to make "go back" obvious at every step.

The three-step rail at the top shows where you are; the two panels below show both calls side-by-side. The primary caller's panel stays visible throughout — losing sight of the person you're moving is the most common way attended transfer goes wrong in a real UI.`,
    keyPoints: [
      'State machine: \`idle → primary-held → consulting → bridging → done\`',
      'Always show the parked caller — out-of-sight parked calls are the #1 attended-transfer UX failure',
      'Cancel at any step must return cleanly to the primary, no renegotiation',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Offer a keyboard shortcut ("Enter to complete, Esc to cancel") once the consult is connected. Power users will thank you.',
      },
      {
        kind: 'warning',
        text: 'If the consult call fails to connect, never silently drop back to the primary — tell the user what happened, then restore the call.',
      },
    ],
    accessibility: [
      'The step rail uses `aria-current` semantics — the active step is visually and programmatically distinguished.',
      'The two call panels have explicit eyebrow labels ("Primary call" / "Consult call") so screen reader users can tell them apart.',
      'Cancel and Complete are both real `<button>` elements with clear, contextual labels — "Complete transfer", not "OK".',
    ],
    takeaway:
      'Attended transfer is a multi-step flow disguised as a single feature. The UI is the product — the composable is just the mechanism.',
  },
  {
    id: 'presets',
    label: 'Quick targets',
    description: 'Preset destinations for operators who transfer to the same teams all day.',
    component: QuickTargets,
    source: QuickTargetsSrc,
    sourceName: 'QuickTargets.vue',
    intro: `Not every transfer UI needs a freeform SIP field. Reception, call-center, and operator desks often move callers between the same handful of targets over and over. In those flows, a row of explicit destinations is faster, safer, and easier to learn than typing URIs by hand.

This variant trades flexibility for confidence: the labels are human, the URIs are hidden behind them, and the action is one click. Keep the list small and intentional — once it turns into a directory, you want search or grouping instead.`,
    keyPoints: [
      'Preset transfers reduce typo risk and speed up common operator workflows',
      'Each button can still fire the same blind-transfer primitive under the hood',
      'Best for front-desk handoffs, queue routing, and fixed escalation ladders',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Order the presets by frequency, not alphabetically. Front-desk UIs are throughput tools.',
      },
    ],
    accessibility: [
      'Each preset is a full-width button with a clear label, so the action target is large and easy to scan.',
      'Transfer outcome is repeated in a live status message below the list.',
    ],
    takeaway:
      'If the destination set is small and known, presets beat a text field every time.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your SIP account is registered.'
      : 'Configure SIP in the header, or use Simulation Mode.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Active call',
    met: callSession.state.value === 'active' || callSession.state.value === 'held',
    hint:
      callSession.state.value === 'active' || callSession.state.value === 'held'
        ? 'A live session is active and ready to transfer.'
        : 'Transfer only makes sense mid-call — dial first or run the Active Call scenario.',
  },
  {
    label: 'REFER supported by PBX',
    met: true,
    hint: 'Nearly every modern PBX supports SIP REFER; check your provider\'s docs if in doubt.',
  },
])
</script>
