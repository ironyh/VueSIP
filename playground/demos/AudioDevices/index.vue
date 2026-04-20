<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="picker"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'
import { useMediaDevices } from '../../../src'

import Picker from './Picker.vue'
import PickerSrc from './Picker.vue?raw'
import LevelMeter from './LevelMeter.vue'
import LevelMeterSrc from './LevelMeter.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient
const mediaDevices = useMediaDevices(undefined, { autoEnumerate: false, autoMonitor: false })

const overview = `A SIP client lives or dies by its audio pipeline. Users will forgive almost any cosmetic glitch; they will not forgive a call where they can't hear the other side — or worse, can't be heard. VueSIP surfaces the browser's device story through \`useMediaDevices()\`, which wraps \`navigator.mediaDevices.enumerateDevices()\` with reactive state, permission tracking, and helpers for switching the active device mid-call.

The two variants here split the problem: a device **picker** for the settings view, and a **level meter** for the "can you hear me now?" moment right before someone dials out. Both are small components you can drop into a preferences panel or a pre-flight check screen.`

const variants: DemoVariant[] = [
  {
    id: 'picker',
    label: 'Device picker',
    description: 'Settings-style list of microphones and speakers, click to switch.',
    component: Picker,
    source: PickerSrc,
    sourceName: 'Picker.vue',
    intro: `The picker is a permission gate plus two radio-group lists — one for \`audioinput\`, one for \`audiooutput\`. Device labels are empty until microphone permission is granted, so the first render shows generic "Microphone abc123…" placeholders. Once the user grants access, VueSIP re-enumerates and the real labels land automatically.

Switching devices mid-call is free: VueSIP tells the active \`RTCPeerConnection\` to replace its \`MediaStreamTrack\`, so there's no audio dropout and no renegotiation. Good for headset swaps, bluetooth reconnects, and the classic "wait, wrong mic" moment.`,
    keyPoints: [
      '`useMediaDevices()` returns reactive \`audioInputDevices\` / \`audioOutputDevices\` + selected IDs',
      'Labels are empty until the user grants mic permission — design the empty state first, not last',
      'Switching a selected device hot-swaps the track on the live PC — no renegotiation needed',
    ],
    notes: [
      {
        kind: 'warning',
        text: "Output-device selection (setSinkId) still has patchy browser support — Firefox only landed it in 2024. Always fall back gracefully if the API isn't present.",
      },
      {
        kind: 'tip',
        text: 'Persist the selected IDs to localStorage. Next session, restore them if they still exist in the enumerated list; fall back to the default otherwise.',
      },
    ],
    accessibility: [
      'Each list is a `<ul>` with `role="radiogroup"` and its own `aria-label` — "Microphone" / "Speaker".',
      'Items are real `<button role="radio">` with `aria-checked` reflecting selection — not just a styled div.',
      'The toast feedback uses `role="status"` so switches are announced without stealing focus.',
    ],
    takeaway:
      'The device picker is small on purpose — the interesting UX work is around permission timing and empty states.',
  },
  {
    id: 'meter',
    label: 'Level meter + tone',
    description:
      'Live microphone peak and a 440&nbsp;Hz speaker test — the "can you hear me?" check.',
    component: LevelMeter,
    source: LevelMeterSrc,
    sourceName: 'LevelMeter.vue',
    intro: `Before someone dials out, they want to know their headset is picked up and their speakers aren't muted at the OS level. This variant answers both questions: press **Test mic** to see a 24-segment peak meter react to your voice, press **Play tone** to send a short 440&nbsp;Hz sine through the selected output.

The mic path uses \`AnalyserNode.getByteFrequencyData()\` averaged across the FFT bins, then normalized to 0–100. It's not a proper VU meter — that would need peak hold and RMS weighting — but it's enough to answer "is anything getting through?" at a glance.`,
    keyPoints: [
      'Hold the WebAudio graph (context, analyser, source) in refs so you can stop cleanly on unmount',
      'Call `stream.getTracks().forEach(t => t.stop())` — closing the AudioContext alone leaves the mic indicator lit in the tab chrome',
      'For the tone, create a short-lived `AudioContext` per press; let it GC when the oscillator stops',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Colour the last few segments red so users learn to associate "peaking into red" with clipping — same language as every DAW they\'ve seen.',
      },
      {
        kind: 'warning',
        text: "Don't leave the analyser running when the component is hidden. The browser will keep the mic indicator lit and users will assume you're eavesdropping.",
      },
    ],
    accessibility: [
      'The meter bar itself is `aria-hidden` — the numeric readout and status text are the accessible surface.',
      'Button state ("Test mic" / "Stop") flips on click so screen-reader users hear the new action, not a generic "toggle".',
      'Tone playback is time-boxed to 800&nbsp;ms so users who can\'t see the "Playing…" label aren\'t stuck with an indefinite sound.',
    ],
    takeaway:
      "Two meters, one purpose: give users a five-second pre-flight check so they don't discover their mic is dead when the boss answers.",
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your SIP account is registered.'
      : 'Not strictly required for device enumeration — helpful for context.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is open.',
  },
  {
    label: 'Microphone permission',
    met: mediaDevices.hasAudioPermission.value,
    hint: mediaDevices.hasAudioPermission.value
      ? 'Microphone permission granted — real device labels are available.'
      : 'Device labels are blank until permission is granted. Simulation mode fakes the devices.',
  },
  {
    label: 'Secure context',
    met: typeof window !== 'undefined' && window.isSecureContext,
    hint: '`getUserMedia` only works on HTTPS or localhost.',
  },
])
</script>
