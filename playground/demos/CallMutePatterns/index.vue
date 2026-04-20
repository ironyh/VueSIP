<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="hotkeys"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Hotkeys from './Hotkeys.vue'
import HotkeysSrc from './Hotkeys.vue?raw'
import Presets from './Presets.vue'
import PresetsSrc from './Presets.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Mute is the single most-used control in a softphone, and it's the one vendors get wrong most often. "Mute" isn't one thing — it's either a local MediaStreamTrack toggle (instantaneous, no signalling), a \`re-INVITE\` with \`a=sendonly\` (tells the remote you're quiet), or a DTMF-style feature code (server-mediated). Each has different latency, different semantics for hold-music, and different failure modes. This demo is about the UX wrappers around that decision.

Two wrappers, same underlying mute. The first is the hotkey surface: push-to-talk, push-to-mute, toggle — with a key the user can rebind. The second is meeting presets: mute-on-join, idle-mute, mic-gating — the policy layer that matters when you join a call with 20 people on it and the last thing anyone needs is your keyboard clatter.`

const variants: DemoVariant[] = [
  {
    id: 'hotkeys',
    label: 'Hotkeys',
    description: 'Push-to-talk vs push-to-mute vs toggle, with rebindable key.',
    component: Hotkeys,
    source: HotkeysSrc,
    sourceName: 'Hotkeys.vue',
    intro: `Push-to-talk is for radio-style channels where you're muted by default and the burden is on you to prove you have something to say. Push-to-mute inverts the relationship: you're live until you explicitly muzzle yourself — which is what most conferencing software gets right. Toggle is the oldest and most dangerous, because the user forgets which state they're in.

Which you expose as the default depends on the venue. Dispatch and call-centre work wants PTT; VoIP meeting clients want toggle; gaming voice channels lean PTT or voice-activated. The key — Space by default — is always worth making rebindable. Users run their lives in a keyboard lattice; "Space" competes with Discord, OBS, Slack, and the browser's scrolling.`,
    keyPoints: [
      "Mute the local audio track (track.enabled = false); don't re-INVITE with a=sendonly for every toggle — the signalling overhead stacks up",
      'Debounce the key: keyup-then-keydown within 50ms is usually the OS auto-repeat, not a real gesture',
      'Rebinding must capture the next keydown and survive the user pressing Escape to cancel — the contract they already know from every game',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Log the mute-timeline with millisecond precision. "How long was I open" is the first question a user asks after realising they left PTT latched.',
      },
      {
        kind: 'warning',
        text: 'Space as a global hotkey conflicts with scrolling web pages. If your client runs in a browser tab, scope the hotkey to a focused element and expose a separate "global hotkey" for desktop wrappers.',
      },
      {
        kind: 'note',
        text: 'WebHID lets you bind a physical PTT footswitch (Infinity, Savi) as a HID descriptor, bypassing the keyboard entirely. Worth offering for transcriptionists and dispatchers.',
      },
    ],
    accessibility: [
      'Mode selector is a `role="radiogroup"` with `aria-checked` — only one mode can be active.',
      'The practice stage is `tabindex="0"` focusable and announces itself as interactive.',
      'Mute state is announced via explicit text ("OPEN" / "MUTED") beside the icon — colour alone is insufficient.',
    ],
    takeaway:
      "Hotkey mute is a reflex. Pick a default that matches the venue, make the key rebindable, and always show the user whether they're hot.",
  },
  {
    id: 'presets',
    label: 'Presets',
    description: 'Mute on join, idle-mute timer, mic gate threshold.',
    component: Presets,
    source: PresetsSrc,
    sourceName: 'Presets.vue',
    intro: `Presets are the UX shortcut that says "I know what this looks like, just do it." Meeting mode is the expected default for most knowledge-worker calls: mute on join, gate background noise, warn when you're talking while muted. Call-centre mode inverts it — agents need to be audible the moment they pick up, and the noise floor of an open office calls for aggressive gating. Presentation mode turns off the safety rails because the presenter wants total control.

The three dials underneath — join state, idle-mute, mic gate — compose into dozens of useful combinations and a handful of foot-gun ones. Gating at -38 dB is fine for an open-plan office; gating at -20 dB cuts off anyone speaking softly. The gate threshold slider is the one knob that deserves a visualiser — show the live level next to the threshold and users instantly understand what they're setting.`,
    keyPoints: [
      'Mute-on-join sends the first INVITE with a=sendonly; some carriers downgrade this to a=inactive, which breaks receive audio — test against your PBX',
      'Idle-mute needs a "you talked recently" signal, not just "you moved the mouse" — voice activity is the right source',
      'Mic gate is not a mute. Gating attenuates to silence when below threshold; the mic is still open, which keeps conversation natural when you resume',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the gate threshold as a tick on the live meter. Users pick their number by seeing where their voice lives and where their fridge lives — numbers alone are abstract.',
      },
      {
        kind: 'warning',
        text: 'Whisper-unmute detection (talking while muted) uses the mic even when "muted" — make sure your privacy copy explains this. Chromium\'s mic indicator will stay on; users will ask.',
      },
      {
        kind: 'note',
        text: "Asterisk \`app_mixmonitor\` and FreeSWITCH \`mod_audio_fork\` can do server-side gating before the bridge. If you have PBX control, prefer server-side — it's consistent across clients.",
      },
    ],
    accessibility: [
      'Preset cards use `role="radio"` inside a `role="radiogroup"` with `aria-checked` — keyboard-navigable and announced correctly.',
      'The idle-minute spinner is a native `<input type="number">`; VoiceOver/NVDA announce the min/max bounds.',
      'The mic meter exposes the live level in text ("-38 dB") alongside the visual bar for users who can\'t see colour transitions.',
    ],
    takeaway:
      'Presets are opinions you ship as defaults. Make them explicit, let users peel them apart, and visualise the one knob (gate dB) that users cannot set by number alone.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Mute toggles will affect the live media track.'
      : 'Register and place a call to affect live audio; settings persist regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport active.',
  },
  {
    label: 'Microphone permission (optional)',
    met: true,
    hint: 'Needed for voice-activity detection and mic gating.',
  },
  {
    label: 'Keyboard focus (optional)',
    met: true,
    hint: 'Hotkeys require a focused element unless wrapped in a desktop app with global capture.',
  },
])
</script>
