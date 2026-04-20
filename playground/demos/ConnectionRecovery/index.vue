<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="transport"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Transport from './Transport.vue'
import TransportSrc from './Transport.vue?raw'
import Settings from './Settings.vue'
import SettingsSrc from './Settings.vue?raw'
import Continuity from './Continuity.vue'
import ContinuitySrc from './Continuity.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A SIP-over-WebSocket client is one lost packet away from being useless. Mobile networks change SSID, laptops suspend, corporate proxies murder idle sockets, and carriers do maintenance at 2am. Your client is going to lose its transport, and what it does next determines whether users notice.

Recovery is two problems: the transport layer (reconnect the socket, re-establish TLS, re-REGISTER on a fresh CSeq) and the policy layer (how often to ping, how long to back off, when to give up). The transport view shows the state machine and a live event log; the settings view is the admin knob set for tuning it.`

const variants: DemoVariant[] = [
  {
    id: 'transport',
    label: 'Transport view',
    description: 'WebSocket state machine + exponential backoff timeline.',
    component: Transport,
    source: TransportSrc,
    sourceName: 'Transport.vue',
    intro: `Five states cover it: idle → connecting → connected → retrying → failed. Every transition emits an event worth logging, because when a customer says "I lost the call at 3pm", the transport log is the first place you look.

The crucial thing the state machine enforces: on reconnect you must re-REGISTER on a fresh CSeq and with fresh auth. Some stacks try to resume the old dialog and then confuse themselves when the registrar returns 481 Call/Transaction Does Not Exist. Start clean on every new socket.`,
    keyPoints: [
      'Exponential backoff with jitter — base 200 ms, cap at ~30 s. Thundering herds are real after registrar restarts',
      'Re-REGISTER on fresh CSeq after every reconnect; do not attempt to resume old dialogs over a new socket',
      'Log onopen / onclose / onerror verbatim — those three events explain 90% of "my call just dropped" tickets',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Surface the state to the user. A small "Reconnecting…" chip in the toolbar beats a silent stall every time.',
      },
      {
        kind: 'warning',
        text: 'Do not auto-reconnect forever. After ~5 min of consecutive failure, stop and ask the user — the device is probably offline and you are just draining the battery.',
      },
      {
        kind: 'note',
        text: 'WebSocket close code 1006 is the mystery abort — it means "something happened, no detail available". Assume the worst and reconnect.',
      },
    ],
    accessibility: [
      'Drop / reconnect buttons expose disabled state via `disabled` and visual opacity.',
      'State machine labels are plain text with distinct classes — colour is reinforcement, not the sole channel.',
      'Log region is scrollable with preserved order; each event has a timestamp in tabular numerals.',
    ],
    takeaway: 'Transport recovery is a little state machine with a loud log. Keep the state machine boring and the log verbose.',
  },
  {
    id: 'settings',
    label: 'Recovery settings',
    description: 'Keepalive, retry policy, jitter, fallback transport.',
    component: Settings,
    source: SettingsSrc,
    sourceName: 'Settings.vue',
    intro: `The defaults are fine for 80% of deployments. The remaining 20% have a reason — corporate firewalls that kill idle sockets at 60 s, carriers that need OPTIONS every 45 s, networks where the first retry has to be fast because users on phones will not wait.

Fallback transport is the setting most people get wrong. "Downgrade to ws://" sounds helpful until you realise it breaks auth on any registrar requiring TLS. For browser clients, the honest answer is usually "no fallback" — fail, wait, retry — because the alternative transports are mostly unreachable from a browser anyway.`,
    keyPoints: [
      'WebSocket ping (CRLF frame) is RFC 7118 default; 30 s suits most NATs',
      'Enable jitter on retry backoff — it is a one-line fix for post-incident thundering herds',
      'Fallback transport is more marketing than mitigation in browser land; be honest about what it costs',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Align SIP OPTIONS interval with your registrar\'s qualify frequency (usually 60 s). Double-pinging wastes battery and does not help.',
      },
      {
        kind: 'warning',
        text: 'Unlimited max-attempts is a user-hostile default. Give up after ~7 attempts (~3 min) and surface it to the user; resume on next user gesture.',
      },
      {
        kind: 'note',
        text: 'Keepalive too aggressive on mobile drains battery noticeably. Consider pausing pings on `visibilitychange` when the tab is hidden for >60 s.',
      },
    ],
    accessibility: [
      'Numeric inputs carry `min`/`max` attributes and `inputmode="numeric"` shows the right keyboard on mobile.',
      'Fallback options are a `role="radiogroup"` with `aria-checked`; one is always selected.',
      'Each input has a hint in the same `<label>` so SR users hear the explanation in order.',
    ],
    takeaway: 'The retry policy is the contract between your client and your users: be patient, add jitter, and know when to stop.',
  },
  {
    id: 'continuity',
    label: 'Mid-call continuity',
    description: 'The banner, timeline, and control policy users see while a live call reconnects.',
    component: Continuity,
    source: ContinuitySrc,
    sourceName: 'Continuity.vue',
    intro: `The transport log is for engineers. The continuity banner is for the person in the call when the Wi-Fi drops in the elevator. Users do not care whether the failure is ICE, WebSocket, or registrar churn; they care whether the app is still trying, whether the caller identity is preserved, and whether they need to redial.

This variant focuses on that layer. It keeps caller context pinned, promotes reconnect state into a visible banner, and only restores advanced controls after the signaling path is back. That sequence is the difference between "the app froze" and "the app recovered the call".`,
    keyPoints: [
      'Keep the caller identity and timer visible while recovery is in progress',
      'Re-enable advanced controls only after transport and REGISTER are both restored',
      'Escalate to a persistent failure state once the retry budget is exhausted',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Treat reconnect as a stateful banner, not a toast. A transport flap is not transient from the user\'s perspective.',
      },
      {
        kind: 'warning',
        text: 'Never silently snap back to normal if media did not actually recover. Users will keep talking into dead air.',
      },
    ],
    accessibility: [
      'Recovery state is a text banner with explicit actions, not an icon-only badge.',
      'The timeline steps remain readable in linear order for screen readers.',
      'Primary retry actions stay as normal buttons in the warning region.',
    ],
    takeaway:
      'Recovery UX is a promise to the user: say what is happening, keep the call anchored, and admit when the retry budget is gone.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Reconnect testing will drive a real REGISTER sequence.'
      : 'Register first to see realistic reconnect behaviour; the transport view still animates without it.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'WebSocket transport',
    met: true,
    hint: 'Required — browser SIP stacks only speak ws/wss.',
  },
  {
    label: 'Registrar with PRACK + keep-alive',
    met: true,
    hint: 'Most modern SIP registrars support this; verify with `pjsip show endpoint`.',
  },
])
</script>
