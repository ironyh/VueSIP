<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :state="shellState"
    :overview="overview"
    default-variant="minimal"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'
import { useCallSession } from '../../../src'
import { provideBasicCallSession } from './sharedSession'
import { canHangupFromState, isIncomingCallState } from './uiState'

import Minimal from './Minimal.vue'
import WithContacts from './WithContacts.vue'
import Diagnostic from './Diagnostic.vue'

import MinimalSrc from './Minimal.vue?raw'
import WithContactsSrc from './WithContacts.vue?raw'
import DiagnosticSrc from './Diagnostic.vue?raw'

const { isConnected, isRegistered, getClient } = playgroundSipClient
const sipClientRef = computed(() => getClient())
const callSession = useCallSession(sipClientRef)
const { state, remoteUri, isOnHold, isMuted, duration, answer, reject, hangup } = callSession

provideBasicCallSession(callSession)

const overview = `A basic audio call is the smallest useful unit of a SIP client: one party dials a target, the other answers, they talk, someone hangs up. VueSIP exposes this through two composables — \`useSipClient\` for the connection/registration layer and \`useCallSession\` for the call itself.

The three examples below walk that workflow from the least possible UI up to a diagnostic surface that lets you inspect every state transition. In the playground they all observe the same live session, so you can compare three UI treatments of one call without reconnecting between sections. Each source panel still shows the exact component running above it.`

const variants: DemoVariant[] = [
  {
    id: 'minimal',
    label: 'Minimal dialer',
    description: 'The smallest SIP call UI that still works — one input, two buttons.',
    component: Minimal,
    source: MinimalSrc,
    sourceName: 'Minimal.vue',
    intro: `Start here if you've never wired VueSIP into a component before. Everything state-related comes from \`useCallSession(sipClientRef)\` — \`state\` tells you where in the call lifecycle you are (\`idle\`, \`calling\`, \`active\`, \`held\`, …) and \`makeCall\` / \`hangup\` are the only two actions you ever call.

Notice the UI is always visible: when the SIP client isn't connected the buttons are disabled and an info banner explains why, rather than hiding the interface entirely. That pattern scales better than showing-and-hiding on connection status.`,
    keyPoints: [
      'One-to-one mapping: template state ↔ composable state',
      'Bare numbers like "2000" are normalized to a full SIP URI before dialing',
      'No hold, mute, or transfer — just make and hang up',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Copy this file as a starting template — rename the component and drop your own branding around the dial row.',
      },
    ],
    accessibility: [
      'The dial input is labelled via a `<label for>` — screen readers announce "Dial an extension or URI".',
      'Enter on the input triggers the same action as the Call button.',
      "Buttons use semantic `:disabled` rather than visual-only greying, so assistive tech knows they're inert.",
    ],
    takeaway:
      'If your app only needs outgoing audio calls, this ~40-line component is the whole feature.',
  },
  {
    id: 'contacts',
    label: 'With a contacts list',
    description: 'Speed dial for common extensions, plus free-form URI entry.',
    component: WithContacts,
    source: WithContactsSrc,
    sourceName: 'WithContacts.vue',
    intro: `Real call UIs rarely ask users to type SIP URIs — they show a contact directory. This variant layers a speed-dial list on top of the minimal dialer: clicking a contact calls the same \`dial()\` helper the text input uses.

Ringing and in-call states reuse the same \`useCallSession\` surface, so adding contacts doesn't cost you any extra state management. The avatar renders an emoji when the contact provides one, otherwise it falls back to initials.`,
    keyPoints: [
      'Contacts are plain data — swap in anything you fetch from your backend',
      'Incoming-call UI is handled by the same component, branching on \`state\`',
      'Works offline from the live server — buttons stay visible but disabled',
    ],
    notes: [
      {
        kind: 'note',
        text: 'The avatar field accepts any short string — emoji, initials, or a single letter. Render a real <img> if you have profile pictures.',
      },
      {
        kind: 'warning',
        text: "Don't trust extension numbers from an external source blindly. Validate the format server-side before storing them as contacts.",
      },
    ],
    accessibility: [
      'Each contact button is a single focusable target; name and extension are both part of the accessible name.',
      'The speed-dial list uses an `<ul>` so screen readers announce its length.',
      'The avatar has `aria-hidden="true"` — it\'s decorative relative to the contact name.',
    ],
    takeaway: "Adding a directory is pure template work; the composable layer doesn't change.",
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic with simulation',
    description: 'Drive the full call state machine — with or without a live SIP server.',
    component: Diagnostic,
    source: DiagnosticSrc,
    sourceName: 'Diagnostic.vue',
    intro: `Testing every branch of a call — incoming, busy, declined, held, muted, reconnecting — against a real PBX is painful. This variant wraps the composable in a simulation layer so you can script scenarios (outgoing, incoming, hold, transfer…) without touching a server.

When Simulation Mode is off, the same UI drives the real \`useCallSession\`; when it's on, it drives a fake one with the exact same shape. That's the pattern we use for Storybook-style states and end-to-end tests in this repo.`,
    keyPoints: [
      'Toggle "Simulation Mode" in the controls to run scenarios without a server',
      'Every call-state transition is observable in the State inspector below',
      'The simulated session implements the same interface as the real one',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Use this variant as your design workspace — every state the real session can enter is one click away.',
      },
      {
        kind: 'warning',
        text: 'Simulation Mode does not exercise WebRTC or the network. Media-path bugs will only show up against a live server.',
      },
    ],
    accessibility: [
      'The Simulation toggle is a real `<button>`, not a div-with-role — keyboard-accessible by default.',
      'State changes are reflected in visible text so screen readers track progress; consider adding `aria-live="polite"` on the state display in production.',
    ],
    takeaway:
      'Simulation lets you build and demo the UI before your SIP server is even configured.',
  },
]

const hasMic = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your SIP account is registered and ready.'
      : 'Open "Configure SIP connection" in the header — or try the Diagnostic variant with Simulation Mode on.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport to the SIP server is up.',
  },
  {
    label: 'WebRTC microphone',
    met: hasMic,
    hint: hasMic
      ? 'getUserMedia is available in this browser.'
      : 'This browser has no getUserMedia. Use Chrome/Firefox/Safari on HTTPS.',
  },
])

const shellState = computed(() => ({
  connected: isConnected.value,
  registered: isRegistered.value,
  callState: state.value,
  remoteUri: remoteUri.value,
  duration: duration.value,
  onHold: isOnHold.value,
  muted: isMuted.value,
}))

const onKey = (event: KeyboardEvent) => {
  const tag = (event.target as HTMLElement | null)?.tagName
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA'

  if (event.key === 'Escape' && canHangupFromState(state.value)) {
    event.preventDefault()
    void hangup()
    return
  }

  if (event.key === 'Escape' && isIncomingCallState(state.value)) {
    event.preventDefault()
    void reject(486)
    return
  }

  if (event.key === ' ' && !inInput && isIncomingCallState(state.value)) {
    event.preventDefault()
    void answer({ audio: true, video: false })
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
