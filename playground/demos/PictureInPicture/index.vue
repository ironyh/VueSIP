<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="controls"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Controls from './Controls.vue'
import ControlsSrc from './Controls.vue?raw'
import Settings from './Settings.vue'
import SettingsSrc from './Settings.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Picture-in-Picture is two APIs. \`video.requestPictureInPicture()\` has been around since 2018 — a single \`<video>\` element pops out, the browser controls what fits inside, and your app can do almost nothing about the UI. \`documentPictureInPicture\` (Chromium 2023+) opens a new \`Window\` in PiP mode that you can render a full Vue tree into, which is how you get real controls: mute, hang up, DTMF keypad, all surviving an app-level tab switch.

Most SIP clients still ship the first kind. This surface shows both — the live PiP controls on a video call, and the tenant-level settings that decide how it behaves.`

const variants: DemoVariant[] = [
  {
    id: 'controls',
    label: 'PiP controls',
    description: 'Video PiP with mute / hang-up overlay in the floating window.',
    component: Controls,
    source: ControlsSrc,
    sourceName: 'Controls.vue',
    intro: `The floating window is the call. Users who tab away want to keep the call visible — and when a call interrupts ("this is important, can you transfer me to billing?"), they need real controls, not just the video feed. That is the whole difference between video PiP (good for passive viewing) and document PiP (good for an active call).

Auto-enter on tab-hide is the most-requested feature and the easiest trap. \`visibilitychange\` fires on every tab switch, including switching to another call in the same app. Gate it on "user is in a live call and the tab is actually backgrounded", not on a naïve listener.`,
    keyPoints: [
      '`video.requestPictureInPicture()` is universal but controls are fixed (play/pause, mute)',
      '`documentPictureInPicture.requestWindow({ width, height })` opens a real Window you can render into',
      'Listen for `leavepictureinpicture` / `window.onpagehide` — PiP exits do not always fire what you expect',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Mirror the PiP window\'s "Close" to "keep call, exit PiP", not "end call". Users click X meaning "bring me back to the big window", not "hang up".',
      },
      {
        kind: 'warning',
        text: 'Safari only supports video PiP, not document PiP. Feature-detect with `"documentPictureInPicture" in window` and fall back.',
      },
      {
        kind: 'note',
        text: 'When PiP is active, your main window is still running JS. Do not re-render the video element into both windows simultaneously — only one can own the MediaStream.',
      },
    ],
    accessibility: [
      'PiP state is a text badge ("INLINE" / "PIP" / "DOCUMENT"), not colour alone.',
      'Enter / Exit controls are real `<button>` elements with appropriate disabled state.',
      'The floating mock uses `role="dialog"` and keeps focusable controls inside it.',
    ],
    takeaway: 'Video PiP is easy; document PiP is the right tool for live call controls. Feature-detect, listen for exits, and keep the X ambiguous.',
  },
  {
    id: 'settings',
    label: 'PiP preferences',
    description: 'Auto-enter policy, size, dock corner, and which controls appear.',
    component: Settings,
    source: SettingsSrc,
    sourceName: 'Settings.vue',
    intro: `Preferences are a place to be honest about what the browser supports. iOS Safari does not have document PiP; Chromium does; Firefox has neither as of this writing. Surfacing that fact in the UI is not a bug — it is respect for the admin who has to decide what fallback to offer.

The control set is the sneaky one. Adding "transfer" to the floating window sounds useful, but PiP windows are 240×135 by default — three buttons fit, not ten. Force the admin to pick which controls matter and accept that the rest live in the main window. "Show every control" is a bad default.`,
    keyPoints: [
      'Default: mute + hangup + camera-toggle. Everything else is clutter in a 240px window',
      'Auto-enter policy belongs in preferences because users disagree strongly about it — some love it, some file tickets',
      'iOS Safari has only `requestPictureInPicture`; the fallback is a floating DOM overlay or inline-only',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Persist the docked corner across sessions. Users drag the PiP to their preferred corner and expect it to remember.',
      },
      {
        kind: 'warning',
        text: 'Giving the floating window a DTMF keypad is tempting but makes the window too cramped. Offer it behind a "more" expand, not as a primary button.',
      },
      {
        kind: 'note',
        text: 'The size options in `requestWindow({ width, height })` are suggestions. The browser may ignore them on low-res displays or when users resize the window.',
      },
    ],
    accessibility: [
      'Size and corner pickers are `role="radiogroup"` with `aria-checked` on each option.',
      'Each control toggle is a labelled `<input type="checkbox">` with a textual description.',
      'iOS fallback is a real `<select>` with explicit named options.',
    ],
    takeaway: 'PiP preferences encode hard tradeoffs. Default to three controls, let users remember their corner, and be honest about iOS limits.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You can enter PiP during a live video call.'
      : 'Register and place a video call to exercise PiP live; the UI mocks the layout offline.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Browser supports Picture-in-Picture',
    met: true,
    hint: 'Chromium / Safari 13+ / iOS 15+ required. Firefox has partial support.',
  },
  {
    label: 'HTTPS context',
    met: true,
    hint: 'PiP and media APIs require a secure context.',
  },
])
</script>
