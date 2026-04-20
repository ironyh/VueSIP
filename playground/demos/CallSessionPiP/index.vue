<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="widget"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Widget from './Widget.vue'
import WidgetSrc from './Widget.vue?raw'
import Docks from './Docks.vue'
import DocksSrc from './Docks.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Not every call is video. Voice-only calls still need to persist while the user moves around the app — opening a ticket, pulling up a customer record, reading a knowledge-base article — and the answer is a floating DOM widget, not the browser's PiP API. Same motivation as video PiP, completely different plumbing.

A session widget is a Vue component mounted once at app root, kept alive across route changes, rendered \`position: fixed\`. It holds the peer connection, surfaces mute and hang-up, and dodges the browser-PiP complexity (no permissions, no API quirks, works in Firefox).`

const variants: DemoVariant[] = [
  {
    id: 'widget',
    label: 'Session mini-widget',
    description: 'Floating audio-only dock with avatar, timer, VU meter, and mute/end controls.',
    component: Widget,
    source: WidgetSrc,
    sourceName: 'Widget.vue',
    intro: `The mini-widget is the entire "call persists while I navigate" story, and it is simpler than every fancy PiP alternative. One fixed-position component, a timer, a mute toggle, a red hang-up. Add a VU meter and you have the only other thing users want — visual proof that audio is flowing.

The sneaky bit is the lifecycle. Mount the widget at app root above the router outlet; do not mount it per route or every page nav will kill the peer connection. Vue does not unmount top-level components on route change, so the widget and the SIP session it holds survive naturally.`,
    keyPoints: [
      'Mount the widget once at app root; routing happens below it',
      'Keep the SIP session reference in a Pinia / Vuex store — the widget reads, does not own',
      'VU meter uses `getStats()` inbound audioLevel; refresh every 500–1000 ms, not every frame',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Cap the widget width at ~360px. Wider is tempting but steals real estate; narrower drops the timer.',
      },
      {
        kind: 'warning',
        text: 'Do not put confirmation dialogs inside the widget ("End this call?"). The widget is for active control; the confirmation lives in a modal above the whole app.',
      },
      {
        kind: 'note',
        text: 'Mobile Safari behaviour: the page can be backgrounded briefly when switching apps. A well-designed widget survives, but the audio may pause until the user foregrounds — that is iOS, not your bug.',
      },
    ],
    accessibility: [
      'Widget has `role="region"` with an `aria-label` identifying the peer; mute uses `aria-pressed`.',
      'VU meter is purely decorative and `aria-hidden`; audio level is also available as text elsewhere.',
      'Timer uses tabular numerals; colour is reinforcement, not the sole cue for muted state.',
    ],
    takeaway: 'The session widget is a small, fixed-position Vue component that holds the call. Keep it narrow, label the mute, and listen to audioLevel for the VU.',
  },
  {
    id: 'docks',
    label: 'Dock positions',
    description: 'Per-user preference for where the widget lives and how it behaves.',
    component: Docks,
    source: DocksSrc,
    sourceName: 'Docks.vue',
    intro: `Users have opinions about where the widget lives. Bottom-right is the default (Slack, Zoom, Teams all picked it), but power users on ultrawide monitors hate it — the widget is 1500px from where they are reading. Give them four corners and a full-width bar option, persist the choice in \`localStorage\`, and drag-to-reposition for the hyper-custom.

"Collapse on route change" is the polite option. For users who hate the widget, it compresses to a tiny "📞 02:14" chip in the toolbar during navigation, then re-expands when they dwell. Default off — adding motion on every nav is distracting — but offer it as a preference for power users.`,
    keyPoints: [
      'Four corners + bottom bar cover 95% of real preferences; do not offer more presets',
      'Drag-to-reposition must snap to edges and persist per user, not per device',
      'Always-on-top of modals is almost always right; mute is a call action, modals are app actions',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Bottom-right is the correct default. Every messaging product landed on it; do not be clever.',
      },
      {
        kind: 'warning',
        text: 'Do not auto-switch dock corners based on the page content. Users expect the widget where they last left it, not where the UI "thinks" it should go.',
      },
      {
        kind: 'note',
        text: 'Full-width bottom bar is the accessibility win — easier to hit on touch screens, stable target, does not obscure content. Offer it as an option even if it is not the default.',
      },
    ],
    accessibility: [
      'Position picker is a `role="radiogroup"` with `aria-checked` and accessible labels.',
      'Behaviour toggles are real `<input type="checkbox">` elements wrapped in labels.',
      'Dock preview is purely visual; the picker labels carry the semantic meaning.',
    ],
    takeaway: 'Users want to park the widget. Offer four corners plus a bar, persist their choice, and keep it above modals.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'An active call will populate the live widget.'
      : 'Register and place a call to see the live widget populate; the layout works offline.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Vue Router persistent root',
    met: true,
    hint: 'Widget must be mounted above the router outlet to survive navigation.',
  },
  {
    label: 'localStorage available',
    met: true,
    hint: 'Required to persist dock position per user.',
  },
])
</script>
