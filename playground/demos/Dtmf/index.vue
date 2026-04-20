<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="keypad"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'
import { useCallSession } from '../../../src'
import { provideDtmfSession } from './sharedSession'

import Keypad from './Keypad.vue'
import KeypadSrc from './Keypad.vue?raw'
import IvrMacros from './IvrMacros.vue'
import IvrMacrosSrc from './IvrMacros.vue?raw'

const { isConnected, isRegistered, getClient } = playgroundSipClient
const sipClientRef = computed(() => getClient())
const callSession = useCallSession(sipClientRef)

provideDtmfSession(callSession)

const overview = `DTMF (Dual-Tone Multi-Frequency) is how a softphone pushes digits into an already-connected call — the classic "press 1 for sales, 2 for support" exchange with an IVR. Tones aren't sent over the audio stream; they travel out-of-band as SIP INFO or RFC 4733 events, so they're reliable even on lossy links.

VueSIP exposes this through \`useDTMF(sessionRef)\`, a tiny composable that returns a \`sendTone\` function and a \`canSendDTMF\` flag. You can only send tones while a call is in the \`active\` state — the demos below share the same live playground session, so the call you place elsewhere is the call these keypads and macros will talk to.`

const variants: DemoVariant[] = [
  {
    id: 'keypad',
    label: 'Keypad + sequence',
    description: 'A dialpad for ad-hoc digits and a text input for scripted sequences.',
    component: Keypad,
    source: KeypadSrc,
    sourceName: 'Keypad.vue',
    intro: `The keypad sends one tone per tap; the sequence input queues a string of digits with a 150&nbsp;ms gap between each — enough for most IVRs to register each tone as distinct. Both paths go through the same \`sendTone\` call underneath.

Simulation Mode in the controls at the top lets you exercise the UI without a real PBX: it fakes a call in the \`active\` state so you can click through the keypad. In a real call the tones travel via the session that \`useCallSession\` is currently holding.`,
    keyPoints: [
      '`useDTMF(sessionRef)` returns `sendTone(digit)` and a reactive `canSendDTMF` flag',
      'Only fires while the session is `active` — the UI is disabled otherwise instead of throwing',
      'Sequence automation is a client concern; VueSIP just gives you the per-digit primitive',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Enable Simulation Mode, run the "Active Call" scenario, then tap digits to see the feedback strip update.',
      },
      {
        kind: 'warning',
        text: 'Some PBXes still dislike DTMF faster than ~100ms gaps. If digits get swallowed, slow the sequence down before suspecting SIP.',
      },
    ],
    accessibility: [
      'Each key is a real `<button>` with an `aria-label` like "Send tone 1" — screen readers announce what fires on press.',
      'The "Last tone" strip uses `aria-live="polite"` so each new digit is announced without stealing focus.',
      'Enter on the sequence input triggers the same action as the Send button.',
    ],
    takeaway:
      'DTMF is a one-line composable call — the interesting UX work is making the keypad feel like a keypad.',
  },
  {
    id: 'macros',
    label: 'IVR macros',
    description: 'One-click scripted sequences — voicemail PIN, conference bridge, park/pickup.',
    component: IvrMacros,
    source: IvrMacrosSrc,
    sourceName: 'IvrMacros.vue',
    intro: `Most call-center integrations don't need a freeform keypad — they need a handful of specific sequences hard-wired to buttons. This variant flips that around: the keypad is gone, and what remains is a list of labelled macros that each fire an entire sequence with one click.

Each macro can override the inter-tone gap — blind transfer, for example, uses \`200&nbsp;ms\` because many PBXes need the double-hash prefix to settle before the extension digits arrive. The button stays disabled during playback so you can't double-fire and corrupt an in-flight sequence.`,
    keyPoints: [
      'Macros are plain data — label, icon, digit string, optional per-macro gap',
      'The same `sendTone` primitive drives every macro; no new API to learn',
      'Button disables during playback so the user can\'t queue up a conflicting sequence',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Store macros on the server, not the client, if they contain PINs or account numbers — this demo uses literals so you can read them in the source panel.',
      },
      {
        kind: 'warning',
        text: 'Never log raw macro digits to analytics. For voicemail and conference macros, the digit stream is effectively a password.',
      },
    ],
    accessibility: [
      'Each macro is a single labelled button — the accessible name includes both human label and digit string.',
      'Playback feedback announces the macro name via `aria-live="polite"` so blind users know what\'s happening.',
      'Disabled state during send is conveyed with the real `:disabled` attribute, not just visual styling.',
    ],
    takeaway:
      'A three-word macro list often replaces what would otherwise be a full dialpad — pick the shape that matches the user\'s job.',
  },
]

const hasSupport = typeof window !== 'undefined'

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your SIP account is registered.'
      : 'Configure SIP in the header — or enable Simulation Mode to exercise the UI offline.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport to the SIP server is up.',
  },
  {
    label: 'Active call',
    met: callSession.state.value === 'active',
    hint:
      callSession.state.value === 'active'
        ? 'A live session is active and ready for DTMF.'
        : 'Tones can only be sent mid-call. Dial first, then return here, or use Simulation Mode inside a variant.',
  },
  {
    label: 'Browser support',
    met: hasSupport,
    hint: 'DTMF relies on the underlying WebRTC session.',
  },
])
</script>
