<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="reconnect"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Reconnect from './Reconnect.vue'
import ReconnectSrc from './Reconnect.vue?raw'
import Inspector from './Inspector.vue'
import InspectorSrc from './Inspector.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Session persistence is the "I accidentally reloaded the tab during a call" problem. A cold JS heap means a lost peer connection, but the SIP dialog on the server side can survive — if you refresh the REGISTER with a fresh CSeq, send an UPDATE on the existing \`Call-ID\`, and re-negotiate media via ICE restart, the remote party never knew you hiccupped.

The UI surface is two things: the reconnect timeline (what is happening, in what order, and how long each step took), and the storage inspector (what we put where, and why — because secrets in the wrong bucket become a security incident).`

const variants: DemoVariant[] = [
  {
    id: 'reconnect',
    label: 'Reconnect timeline',
    description: 'Step-by-step animation of dehydrate → rehydrate → media restore.',
    component: Reconnect,
    source: ReconnectSrc,
    sourceName: 'Reconnect.vue',
    intro: `Reload survival is a dance with seven steps and the order matters. Dehydrate on \`pagehide\` writes the dialog snapshot to sessionStorage; on boot the app rehydrates Pinia, reconnects the WebSocket, re-registers with fresh CSeq (critical — reusing an old CSeq is where stacks break), then re-hails the existing \`Call-ID\` with UPDATE or re-INVITE, and finally restarts ICE to restore media.

Each step has a real cost. Dehydrate is cheap; WebSocket reconnect depends on the network; REGISTER refresh depends on the registrar; ICE restart is the slowest because it re-gathers candidates and re-negotiates SRTP. Showing the elapsed time for each step makes it clear where a given reload was slow — and whether the 2.2 s total is the user's pain or the server's.`,
    keyPoints: [
      'Always use a fresh CSeq on the post-reload REGISTER; reusing the pre-reload value triggers 481 Call/Transaction Does Not Exist',
      'Preserve the `+sip.instance` contact parameter so the registrar recognises you as the same device',
      'ICE restart is required — media candidates from before the reload are stale; do not attempt to reuse them',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Dehydrate on `pagehide`, not `beforeunload`. `beforeunload` is unreliable on mobile and bfcache-broken; `pagehide` is the web platform\'s blessed "I am backgrounding" event.',
      },
      {
        kind: 'warning',
        text: 'Do not attempt reconnect for > ~6 seconds without surfacing a visible banner. Users who reloaded on purpose think the app is broken if reconnect takes silent seconds.',
      },
      {
        kind: 'note',
        text: 'Server-side timers matter. If the session-expires refresh window lapses before you reconnect, the registrar will have dropped the dialog, and re-hail becomes a fresh INVITE — which is a different UX.',
      },
    ],
    accessibility: [
      'The timeline is an `<ol>` with text labels and descriptions; state is not colour-only.',
      'Elapsed time uses tabular numerals so assistive tech renders values stably.',
      'Simulate / Reset buttons are real `<button>` elements with text labels.',
    ],
    takeaway: 'Reload survival is a seven-step pipeline. Fresh CSeq, preserve instance-id, ICE restart, and surface the whole timeline while it runs.',
  },
  {
    id: 'inspector',
    label: 'Storage inspector',
    description: 'What lives in sessionStorage, localStorage, and IndexedDB — with visible sizes.',
    component: Inspector,
    source: InspectorSrc,
    sourceName: 'Inspector.vue',
    intro: `Where you put state encodes your security model. \`sessionStorage\` survives reload but not tab-close; \`localStorage\` survives both but also sits plaintext in devtools; \`IndexedDB\` is the only one that can hold encrypted credentials without leaking to casual inspection.

The inspector surface makes the tradeoff obvious. The dialog snapshot lives in \`sessionStorage\` because it is ephemeral and shouldn't outlive the tab. User preferences live in \`localStorage\` — losing them on reload is annoying, they are not sensitive. Credentials and recordings live in IndexedDB, encrypted at rest, and are never echoed back in the UI.`,
    keyPoints: [
      'sessionStorage for transient call state; localStorage for preferences; IndexedDB for anything sensitive',
      'Never put SIP secrets or access tokens in localStorage — devtools makes them trivially visible',
      'IndexedDB objects can be encrypted with a WebCrypto key derived from WebAuthn; that is the correct pattern for persistent creds',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show byte size per entry. Storage quota is silently enforced by the browser; users hitting 5 MB on localStorage will see silent write failures that are a nightmare to debug.',
      },
      {
        kind: 'warning',
        text: 'Clearing localStorage on sign-out is tempting but too aggressive — it wipes dock position and UI preferences too. Scope the clear to your auth namespace.',
      },
      {
        kind: 'note',
        text: 'Private-browsing mode silently downgrades IndexedDB to memory-only in some browsers. Feature-detect and warn users whose session will be lost on tab close.',
      },
    ],
    accessibility: [
      'Storage tabs use `role="tab"` with `aria-selected`; content updates preserving scroll.',
      'Each row is a collapsible disclosure with text labels, not icon-only buttons.',
      'Values are rendered in `<pre>` with preserved whitespace — copyable and screen-readable.',
    ],
    takeaway: 'Storage is a security decision. sessionStorage for calls, localStorage for prefs, IndexedDB for secrets — and show the sizes.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Reconnect will exercise the live registrar.'
      : 'Register to see real reconnect behaviour; the timeline still animates offline.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Registrar supports session-expires refresh',
    met: true,
    hint: 'RFC 4028 — required to keep a dialog alive across a reload window.',
  },
  {
    label: 'IndexedDB available',
    met: true,
    hint: 'Needed for encrypted credential storage; falls back to session-scoped login otherwise.',
  },
])
</script>
