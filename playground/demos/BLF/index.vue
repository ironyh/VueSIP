<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="wallboard"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Wallboard from './Wallboard.vue'
import WallboardSrc from './Wallboard.vue?raw'
import Config from './Config.vue'
import ConfigSrc from './Config.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Busy Lamp Field is the oldest presence surface in telephony — a literal lamp on the desk phone that lights when a colleague's line is busy. The modern version is SIP \`SUBSCRIBE\` to event \`dialog\` on each watched AOR, with the PBX firing \`NOTIFY\` messages containing \`application/dialog-info+xml\` payloads whenever state changes. Reception desks, attendant consoles, and call-center floors all live or die by how fast those lamps react.

Two surfaces matter: the wallboard — a dense grid that has to stay legible when fifty lines all flip state at once — and the config screen where the operator decides which extensions to watch and what a click does. Most shipping products conflate them and regret it, because the cadences are wildly different: the wallboard updates every second; the config changes every few months.`

const variants: DemoVariant[] = [
  {
    id: 'wallboard',
    label: 'Wallboard',
    description: 'Live grid of watched extensions with lamp states and peer info.',
    component: Wallboard,
    source: WallboardSrc,
    sourceName: 'Wallboard.vue',
    intro: `The wallboard's job is unambiguous at a glance: five states, five colours, no exceptions. Asterisk's \`ExtensionStatus\` events and the RFC 4235 \`dialog-info\` body both distinguish \`idle\`, \`ringing\`, \`busy\` (confirmed dialog), \`dnd\`, and \`offline\` (no registration). Anything past that — on-hold, conferencing, parked — is detail the operator doesn't need on the grid; surface it in a detail popover, not a new colour.

The ringing animation has to pulse, not flash. Seizure-inducing strobes are a real accessibility failure mode in call-center floor displays, and the WCAG threshold is three flashes per second. A 1Hz pulse with a soft box-shadow ripple reads as urgent without crossing that line.`,
    keyPoints: [
      'Map states directly from `dialog-info+xml`: `<dialog state="early">` is ringing, `"confirmed"` is busy, `"terminated"` is idle — do not invent heuristics from call-count deltas',
      'Call duration on a busy lamp comes from the `<start-time>` in the NOTIFY body, not client-side stopwatch math — reconnecting clients must not reset every timer to zero',
      'Show the remote party when available — it turns "2003 is busy" into "2003 is on a call from London", which is the information the receptionist actually needs',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Group tiles by team, not by extension number. Reception wants to see "sales floor" as a block; sorting 2001–2099 numerically scatters a functional group across four rows.',
      },
      {
        kind: 'note',
        text: 'Asterisk `ExtensionState`, FreeSWITCH `sofia::register`, 3CX BLF, and Cisco Unified CM all produce broadly equivalent dialog-info output — the `entity` URI and `state` attribute are the two load-bearing fields.',
      },
      {
        kind: 'warning',
        text: 'Never flash faster than 3Hz. WCAG 2.3.1 is non-negotiable on public-facing wallboards and your support team may be staring at this for eight hours.',
      },
    ],
    accessibility: [
      'Each tile is a `<button>` with an `aria-label` that reads state + peer: "Alex Rivera extension 2001, busy with +14155550100".',
      'Lamp colours are backed by text — "On call", "Ringing", "DND" — so the grid works for the ~8% of men with red/green colour blindness.',
      'Pulse animation uses `box-shadow` ripple at 1Hz, well under the WCAG 2.3.1 three-flash threshold.',
    ],
    takeaway:
      'A wallboard is a status display, not a dashboard. Five colours, duration that comes from the wire, and labels that read out loud.',
  },
  {
    id: 'config',
    label: 'Watch list config',
    description: 'Subscribe and unsubscribe extensions, label them, pick what a click does.',
    component: Config,
    source: ConfigSrc,
    sourceName: 'Config.vue',
    intro: `The config screen is where the power-user surface lives. Every entry becomes a real SIP \`SUBSCRIBE\` dialog with its own \`Expires\` timer and renewal schedule — blow the budget on a softphone and you'll bring down the PBX's subscription table before you notice. RFC 5367's resource-list SUBSCRIBE batches hundreds of watches into one dialog and is the only sensible default above ~20 entries, but it requires server support (kamailio's \`presence\` module, Cisco's BLF SpeedDial, Asterisk's \`res_pjsip\` bulk mode).

The click-action picker is the interesting bit. "Call extension" is the obvious default; "directed pickup" answers a ringing peer's call (\`*8\` on Asterisk's default dialplan); "barge" opens a silent monitor via ChanSpy; "intercom" is paging. Each one maps to a different dialplan target and a different permission model — the UI exists to make that choice deliberate.`,
    keyPoints: [
      'Store the watch list as an ordered array, not a set — operators arrange the wallboard by hand and the order matters',
      'Show subscription status per-row (active / pending / failed) — a silent "failed" is how lamps end up permanently dark for no obvious reason',
      'RFC 5367 resource-list SUBSCRIBE is the default above 20 extensions; below that, individual dialogs are simpler and easier to debug',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Let users subscribe to a full SIP URI, not just an extension number. Federated watches (`sip:alex@partner.example`) are the only way BLF works across PBX boundaries.',
      },
      {
        kind: 'note',
        text: 'Asterisk\'s `pickupgroup=` dialplan setting is the gating factor for "directed pickup" — without matching groups, `*8` returns 603 and the UI looks broken.',
      },
      {
        kind: 'warning',
        text: 'Barge and intercom need explicit permission. Never make them the default action for a newly-watched extension; regulations in most jurisdictions require caller consent for silent monitor.',
      },
    ],
    accessibility: [
      'Favorite toggle is a `<button>` with `aria-pressed` and an explicit `aria-label` ("Favorite 2001").',
      'Subscription-status dot is backed by text ("Subscribed" / "Subscribing…" / "Failed") — the colour is redundant, not load-bearing.',
      'Form field labels are `<span class="blfc__label">` wrapped inside the `<label>` — screen readers announce them before the input.',
    ],
    takeaway:
      'Watch lists are long-lived config. Show the subscription health per row, make the click-action explicit, and batch the SUBSCRIBEs when the server supports it.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'SUBSCRIBE dialogs will establish against the PBX.'
      : 'Register to issue real SUBSCRIBEs; this surface edits watch config regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport for SUBSCRIBE / NOTIFY.',
  },
  {
    label: 'Presence server',
    met: true,
    hint: 'Asterisk res_pjsip, FreeSWITCH sofia-presence, kamailio presence_xml — any RFC 4235 dialog-info producer.',
  },
  {
    label: 'Batch SUBSCRIBE (RFC 5367)',
    met: true,
    hint: 'Optional but strongly recommended above 20 watched extensions.',
  },
])
</script>
