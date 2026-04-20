<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="active"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Active from './Active.vue'
import ActiveSrc from './Active.vue?raw'
import Picker from './Picker.vue'
import PickerSrc from './Picker.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Screen sharing inside a SIP call is one \`getDisplayMedia()\` call, one \`RTCPeerConnection.addTransceiver\`, and a re-INVITE with a second \`m=video\` line. The mechanics are small; the UX surface is what operators actually spend time on. Pickers are browser-native on desktop but you need to design the in-call controls — start, stop, pause, the banner that tells both sides what is happening.

Two views: the picker (what am I about to share, with the options that matter — fps, content hint, audio) and the active state (here is what the other side sees, with the controls to pause or stop).`

const variants: DemoVariant[] = [
  {
    id: 'active',
    label: 'Active share',
    description: 'In-call preview of what is being shared, with pause / stop controls.',
    component: Active,
    source: ActiveSrc,
    sourceName: 'Active.vue',
    intro: `The presenter needs to see what the other side sees. Not their actual screen — they can see that — but the wrapped version with the presenter's aware-cursor tracking and the watcher count. Trust is built by visible feedback: "3 people watching, bitrate 1.4 Mbps, 24 fps" tells the presenter both that the share is working and that someone is paying attention.

Pause is underused. When you glance at Slack mid-presentation, you should be one click away from pausing the share instead of stopping and restarting. \`RTCRtpSender.replaceTrack(null)\` pauses the video track without renegotiation — the remote side sees a frozen last frame or a "paused" placeholder, and resume is another \`replaceTrack\` later.`,
    keyPoints: [
      'Re-INVITE with a second `m=video` line is the SIP mechanism; modern stacks also support `a=content:slides` as an ATTR hint',
      '`replaceTrack(null)` pauses without renegotiation; use it instead of stop/start for pause UX',
      'Bitrate, fps, and watcher count give the presenter the feedback they need — silence is worse than numbers',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Chrome shows a system-level "sharing" bar. Do not fight it; your in-app banner is secondary to Chrome\'s browser-chrome banner.',
      },
      {
        kind: 'warning',
        text: 'Stopping the share from a browser-level button (the Chrome "Stop sharing" chip) ends the MediaStream without notifying your code. Listen for `track.onended` or users will see a "still sharing" UI when they are not.',
      },
      {
        kind: 'note',
        text: 'Including tab audio via `getDisplayMedia({ audio: true })` is Chrome-only; Safari and Firefox ignore it. Surface the state honestly.',
      },
    ],
    accessibility: [
      'State (sharing / paused / stopped) is a text badge, not colour alone.',
      'Controls are real `<button>` elements; tab audio is a labelled `<input type="checkbox">`.',
      'Watcher count + bitrate use `font-variant-numeric: tabular-nums` so assistive tech renders stable values.',
    ],
    takeaway: 'Active share is about feedback. Show bitrate + fps + watcher count, prefer pause over stop, and listen for `track.onended`.',
  },
  {
    id: 'picker',
    label: 'Source picker',
    description: 'Pre-share picker with source type, frame rate, and content-hint options.',
    component: Picker,
    source: PickerSrc,
    sourceName: 'Picker.vue',
    intro: `Most browsers hand you a native picker via \`getDisplayMedia()\`; on desktop that is the right answer. The cases where a custom picker matters: electron apps, browser extensions that do their own capture, and any product where you want to offer content-hint options (motion / detail / text) that the native picker does not expose.

Content hint is load-bearing. \`track.contentHint = 'text'\` tells the encoder to prioritise sharpness over smoothness — essential for sharing code, slides, or any screen full of small text. Without it, the default encoder setting blurs text at 24 fps to save bandwidth, and your users wonder why their code review looks like a low-res JPEG.`,
    keyPoints: [
      '`track.contentHint = "text"` dramatically improves readability for shared slides / code',
      '15 fps is enough for slides; 30 fps for video or live animation — defaulting to 30 wastes bandwidth',
      'Offer tab / window / screen as explicit tabs; the native picker does this for you but Electron apps have to re-implement',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Default to 24 fps and `contentHint = "detail"`. Those two settings cover 90% of business screen shares cleanly.',
      },
      {
        kind: 'warning',
        text: 'Do not share the wrong screen. Offer a brief thumbnail preview of the selected source before committing the share — misshared secret chats are a real incident class.',
      },
      {
        kind: 'note',
        text: 'The browser picker cannot tell you *which* screen or tab was picked in a privacy-preserving way; the `DisplayMediaStreamConstraints` API returns a generic stream. Your UI should echo what the user selected.',
      },
    ],
    accessibility: [
      'Tabs (`screen / window / tab`) use `role="tab"` with `aria-selected`.',
      'Source cards are real `<button>` elements with `aria-pressed`; keyboard-focusable.',
      'Frame-rate and content-hint pickers are `role="radiogroup"` with `aria-checked` on each chip.',
    ],
    takeaway: 'Set `contentHint` based on what is being shared, default to 24 fps, and make sure the user can see which source they picked.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You can start a screen share inside a live call.'
      : 'Register and place a call first; the UI still demonstrates the pickers offline.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Browser supports getDisplayMedia',
    met: true,
    hint: 'Chromium / Firefox / Safari 13+ required; older browsers cannot share.',
  },
  {
    label: 'Secure context (HTTPS)',
    met: true,
    hint: 'getDisplayMedia only works over HTTPS or localhost.',
  },
])
</script>
