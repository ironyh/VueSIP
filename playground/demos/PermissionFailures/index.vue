<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="mic-denied"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { useMediaDevices } from '../../../src'

import MicrophoneDenied from './MicrophoneDenied.vue'
import MicrophoneDeniedSrc from './MicrophoneDenied.vue?raw'
import OutputFallback from './OutputFallback.vue'
import OutputFallbackSrc from './OutputFallback.vue?raw'
import SecureContext from './SecureContext.vue'
import SecureContextSrc from './SecureContext.vue?raw'

const mediaDevices = useMediaDevices(undefined, { autoEnumerate: false, autoMonitor: false })

const overview = `Permission failures are where a polished calling app either feels trustworthy or brittle. The browser knows why media failed, but if your UI only shows "microphone error", users are forced to debug browser settings, OS routing, and TLS policy by trial and error.

This demo focuses on the failure states around media access: blocked microphone permission, missing or disappearing output devices, and insecure origins that make \`getUserMedia()\` impossible before the prompt even appears. These are not edge cases — they are onboarding states.`

const variants: DemoVariant[] = [
  {
    id: 'mic-denied',
    label: 'Mic denied',
    description: 'The browser prompt was rejected and the app must explain how to recover.',
    component: MicrophoneDenied,
    source: MicrophoneDeniedSrc,
    sourceName: 'MicrophoneDenied.vue',
    intro: `Denied permission is different from "not asked yet". Once the browser has a stored denial, your app usually cannot re-trigger the prompt programmatically. The only honest UI is one that admits the block, points to browser settings, and offers a fallback so the user is not trapped.`,
    keyPoints: [
      'Treat denied and prompt as different states with different actions',
      'Browser settings guidance is product work, not an implementation detail',
      'Keep the user\'s draft work and chosen contact intact while they recover permissions',
    ],
    notes: [
      {
        kind: 'warning',
        text: 'A disabled Call button without explanation reads like a broken app, not a permission problem.',
      },
    ],
    accessibility: [
      'Permission state is written as text in the warning region.',
      'Primary recovery actions are normal buttons, not hidden behind icons.',
    ],
    takeaway:
      'Permission-denied UI should feel like a recovery path, not a dead end.',
  },
  {
    id: 'output-fallback',
    label: 'Output fallback',
    description: 'When speakers vanish or `setSinkId` is unavailable, degrade gracefully.',
    component: OutputFallback,
    source: OutputFallbackSrc,
    sourceName: 'OutputFallback.vue',
    intro: `Speaker routing is messy in the browser. Sometimes there is only a default device, sometimes Bluetooth disappears mid-call, and sometimes the browser does not support output switching at all. Your UI needs a fallback story that still makes sense when the ideal device picker cannot render.`,
    keyPoints: [
      'Explain when output follows the system default instead of pretending device switching exists',
      'Keep the previously selected device visible briefly when it disappears so the user understands the fallback',
      'Turn the failure into troubleshooting guidance before the user places a live call',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'A small "Audio moved to MacBook Speakers" toast can save a lot of confusion when Bluetooth drops.',
      },
    ],
    accessibility: [
      'Device status is communicated with text labels like "Disconnected" and "Fallback route".',
    ],
    takeaway:
      'Output fallback UX is mostly about being explicit about what the browser can and cannot control.',
  },
  {
    id: 'secure-context',
    label: 'Secure context',
    description: 'HTTPS and localhost rules before permission prompts even matter.',
    component: SecureContext,
    source: SecureContextSrc,
    sourceName: 'SecureContext.vue',
    intro: `The most confusing media failure is the one that never reaches the permission prompt. On plain HTTP origins the browser blocks camera and microphone APIs outright. That means your UI has to gate earlier and explain the deployment requirement before the user blames their headset.`,
    keyPoints: [
      'Guard media actions behind `window.isSecureContext` checks',
      'Explain that localhost is allowed even though plain HTTP production is not',
      'Treat insecure-origin failures as deployment errors, not user mistakes',
    ],
    notes: [
      {
        kind: 'warning',
        text: 'If you wait until the user presses Call to mention HTTPS, you have already wasted their trust.',
      },
    ],
    accessibility: [
      'The remediation text is inline, not hidden in a tooltip.',
    ],
    takeaway:
      'Secure-context gating is the first permission check, even though it has nothing to do with the browser prompt.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'Secure context',
    met: typeof window !== 'undefined' && window.isSecureContext,
    hint: typeof window !== 'undefined' && window.isSecureContext
      ? 'Media APIs can run in this origin.'
      : 'Use HTTPS or localhost to unlock `getUserMedia()`.',
  },
  {
    label: 'MediaDevices API',
    met: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
    hint: 'Required for enumeration and permission requests.',
  },
  {
    label: 'Microphone permission',
    met: mediaDevices.hasAudioPermission.value,
    hint: mediaDevices.hasAudioPermission.value
      ? 'Browser has granted microphone access.'
      : 'Useful for seeing the healthy state; the failure demos still work without it.',
  },
])
</script>
