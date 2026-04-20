<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="rules"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Rules from './Rules.vue'
import RulesSrc from './Rules.vue?raw'
import Headset from './Headset.vue'
import HeadsetSrc from './Headset.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Auto-answer is a small feature with a wide blast radius. Done right, it's a warehouse phone answering a page in under 100ms; done wrong, it's a microphone broadcasting your breakfast to the entire office. The SIP side is a one-liner — inspect \`Call-Info\` or \`Alert-Info\`, accept on match. The interesting work is the policy surface around it: which calls qualify, how loud the warning beep is, whether the mic starts muted.

Two surfaces cover 90% of real deployments. The first is a rules editor for dispatcher-style per-caller auto-answer — the Asterisk intercom pattern. The second is headset integration, where a hardware long-press on the hook switch answers without the user touching the phone at all. Both rely on the same \`session.accept()\` call; they differ only in what triggers it.`

const variants: DemoVariant[] = [
  {
    id: 'rules',
    label: 'Rules',
    description: 'Per-caller and per-header auto-answer policy.',
    component: Rules,
    source: RulesSrc,
    sourceName: 'Rules.vue',
    intro: `The rules list is the dispatcher's control panel. Each row declares a match condition (header pattern, From-URI range, time window) and an action (answer delay, audio route, beep-or-silent). The first matching rule wins — a trick borrowed from firewall chains — which keeps the mental model simple and the audit trail readable.

The Call-Info trigger is the battle-tested one. Asterisk's \`SIPAddHeader("Call-Info: <sip:x>;answer-after=0")\` has been the canonical intercom signal since 2006, and every serious client — Polycom, Yealink, Snom, Linphone — honours it. Copy that convention; don't invent a vendor-specific header unless you're prepared to document it forever.`,
    keyPoints: [
      'First-match-wins beats weighted scoring — users can read the list top-to-bottom and predict the outcome',
      'Always expose the delay in milliseconds; zero-delay auto-answer on a mis-identified call is how embarrassing stories happen',
      'Record the audio route (speaker / headset / muted) per rule — an intercom to a warehouse speaker is different from a queue callback to an agent headset',
    ],
    notes: [
      {
        kind: 'tip',
        text: "Ship the intercom rule enabled by default with delay=0 and a short beep. It's what every deployment wants and it's the one thing nobody configures correctly on first boot.",
      },
      {
        kind: 'warning',
        text: 'Never auto-answer on match of the From display name alone — display names are unauthenticated free-text. Match on the authenticated URI or P-Asserted-Identity.',
      },
      {
        kind: 'note',
        text: "Asterisk, FreeSWITCH and Kamailio can all enforce the same rules server-side via dialplan. Client-side rules are for hosted/SaaS deployments where you don't own the PBX.",
      },
    ],
    accessibility: [
      'Each rule has a labelled toggle switch with explicit "On / Off" text — colour is not the only signal.',
      'The master auto-answer toggle disables child switches via the native `disabled` attribute, which screen readers announce.',
      'The simulator input fields have explicit `<label>` wrappers so screen readers announce the header name.',
    ],
    takeaway:
      "Rules are cheap to write and expensive to debug. Keep the matcher ordered, show the predicate, and default to a beep the user can't mistake for silence.",
  },
  {
    id: 'headset',
    label: 'Headset',
    description: 'HID call-control button as the auto-answer trigger.',
    component: Headset,
    source: HeadsetSrc,
    sourceName: 'Headset.vue',
    intro: `Headsets are the unsung hero of auto-answer. A long-press on the hook switch fires a HID event, the browser hands it to the app via \`navigator.hid\` or the OEM SDK (Jabra Xpress, Poly Lens), and the app turns it into \`session.accept()\`. The user's hands never leave the keyboard; the call is answered in under a frame.

The mapping from HID byte to SIP verb is the thing worth exposing in the UI. Users debug "why didn't the headset answer?" by checking whether the HID event arrived, not by reading SIP traces. Showing the raw byte stream alongside the action it triggered shortens the feedback loop from minutes to seconds.`,
    keyPoints: [
      'Call Control Usage Page (0x0B) is the vendor-neutral HID spec — stick to it and avoid the per-vendor SDK soup',
      'Short-press answer, long-press auto-answer-and-route-to-speaker is the convention; users learn it once across devices',
      'Mute state must round-trip — if the user mutes via the headset button, the app UI must reflect it, and vice-versa',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Log the raw HID report bytes. Ninety percent of "headset not working" tickets are solved by seeing that the browser never got the event in the first place.',
      },
      {
        kind: 'warning',
        text: 'WebHID requires HTTPS and user permission per device. Plan for the permission flow in onboarding — users will not hunt for the gear icon.',
      },
      {
        kind: 'note',
        text: "Jabra and Poly both ship Chromium-native SDKs that wrap WebHID. Use them when you need call-control LEDs (busy light) — raw HID can read buttons but can't reliably drive LEDs across vendors.",
      },
    ],
    accessibility: [
      'The hook-switch simulator button has `aria-label="Simulate hook switch"` since the glyph alone is not announced.',
      'The HID event log uses `role="log"` with `aria-live="polite"` so new entries are announced without interrupting.',
      'The connection status pairs a colour swatch with explicit "Connected / Disconnected" text.',
    ],
    takeaway:
      'Headsets turn auto-answer into a muscle-memory interaction. Show the bytes, honour the long-press convention, and never forget to round-trip the mute state.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Auto-answer rules will evaluate on real INVITEs.'
      : 'Register to test against live incoming calls; configuration edits apply regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport active.',
  },
  {
    label: 'WebHID support (optional)',
    met: true,
    hint: 'Chromium browsers expose navigator.hid for headset call-control buttons.',
  },
  {
    label: 'PBX intercom header (optional)',
    met: true,
    hint: 'Asterisk SIPAddHeader or FreeSWITCH sip_h_Call-Info sends the answer-after=0 trigger.',
  },
])
</script>
