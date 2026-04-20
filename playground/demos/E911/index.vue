<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="enrolment"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Enrolment from './Enrolment.vue'
import EnrolmentSrc from './Enrolment.vue?raw'
import ActiveCall from './ActiveCall.vue'
import ActiveCallSrc from './ActiveCall.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `E911 is the one feature where the UX mistake is a federal violation. Kari's Law (2020) says a user must be able to dial 911 directly without a prefix digit; RAY BAUM'S Act §506 (2022) says every 911 call must carry a dispatchable location. A softphone without both is not just worse-than-useless — it is illegal to ship in the US.

The two surfaces are enrolment (where the admin tells the system which desk is which) and the active-call indicator (where the user is reassured that help is coming and dispatch has the address). Neither is optional.`

const variants: DemoVariant[] = [
  {
    id: 'enrolment',
    label: 'Location enrolment',
    description: 'Dispatchable location form with MSAG verification and compliance flags.',
    component: Enrolment,
    source: EnrolmentSrc,
    sourceName: 'Enrolment.vue',
    intro: `The enrolment form is how an admin proves — with specificity — where a given endpoint sits. Street address alone will not cut it: RAY BAUM wants a floor, a suite, a desk, enough specificity that a responder running up stairs finds the right human in under a minute. "447 Larkin St" gets them to the lobby. "447 Larkin St, Floor 3, Desk 3-17-W" gets them to Alex.

Verification against the MSAG (Master Street Address Guide) is non-negotiable. A free-text address field that has never been matched against MSAG is a ticket waiting to happen when the fire is real. Intrado, Bandwidth, RedSky — the CLEC you use for SIP trunking almost certainly exposes an MSAG lookup API; call it on save, not at dial-time.`,
    keyPoints: [
      'Dispatchable Location = street + unit + floor + desk/room, not just civic address',
      'Verify against MSAG on save; surface confidence score and last-verified date prominently',
      'Callback number is mandatory — PSAPs dial back on disconnect, and that number must reach the caller, not a reception ACD',
    ],
    notes: [
      {
        kind: 'warning',
        text: 'Kari\'s Law (no-prefix 911) is enforced; RAY BAUM\'S Act §506 (dispatchable location) is enforced. Non-compliance is not a deficiency — it is a finable offence. Every E911 build must mark these flags as required, not optional.',
      },
      {
        kind: 'tip',
        text: 'Front-desk notify matters because 911 often gets dialed accidentally — a user hitting 9 then 11 by muscle memory. A SIP NOTIFY to reception lets security intercept a wrong-number before the fire trucks roll.',
      },
      {
        kind: 'note',
        text: 'For WFH users, you cannot enrol once and trust it forever. Prompt a location refresh on app launch if the user\'s IP address has changed by more than a /24.',
      },
    ],
    accessibility: [
      'Form inputs carry visible `<span>` labels above each control — never placeholder-only labels.',
      'Compliance flags are real `<input type="checkbox">` inside a `<label>`; state is not colour-only.',
      'Error / verification messages appear in an `aria-live` region adjacent to the submit button.',
    ],
    takeaway: 'Enrolment is a legal surface. MSAG-verify every address, require dispatchable specificity, and treat Kari\'s Law + RAY BAUM as non-negotiable.',
  },
  {
    id: 'active-call',
    label: 'Active-call indicator',
    description: 'The "911 is on the line" UI — banner, location confirm, and locked controls.',
    component: ActiveCall,
    source: ActiveCallSrc,
    sourceName: 'ActiveCall.vue',
    intro: `An active emergency call is not a normal call and the UI must say so. Loud banner, red pulse, location displayed for the user to confirm verbally ("I\'m at 447 Larkin, third floor"), and — critically — controls that are normally useful (hold, transfer, park) disabled by policy. A PSAP expects uninterrupted audio from dial to disconnect; no feature you added for corporate calls should risk that.

The notifications panel shows the concurrent fan-out: SIP NOTIFY to reception, email to security, PagerDuty page to the on-call lead. None of this happens without the emergency flag, and the emergency flag is set the moment the dialled string matches /^9?11$/.`,
    keyPoints: [
      'Disable hold, transfer, park on emergency calls — policy, not feature',
      'Display the dispatchable location visibly so the caller can verbally confirm it to dispatch',
      'Flag the CDR with emergency=true; FCC retention is 5 years for emergency call records',
    ],
    notes: [
      {
        kind: 'warning',
        text: 'Do not auto-end the call on the PBX side if the user hangs up accidentally. PSAPs expect to keep the line open; let the dispatcher release, not the user.',
      },
      {
        kind: 'tip',
        text: 'Concurrent notify (email + SIP + paging) gives someone onsite a chance to intercept if 911 was dialed by accident. The front desk finding the user faster than the fire truck is the goal.',
      },
      {
        kind: 'note',
        text: 'Route 911 over a dedicated SIP trunk with G.711 (no Opus) — many PSAPs still run analog gateways that cannot negotiate modern codecs.',
      },
    ],
    accessibility: [
      'The "ON THE LINE" banner has a text label; red pulse is supplementary, not the sole signal.',
      'Call-info grid uses `<dt>` / `<dd>` semantic markup for screen readers.',
      'Disabled controls carry `title` text explaining why they are blocked.',
    ],
    takeaway: 'An E911 UI says loudly "help is coming" while locking away any feature that could interrupt audio. Banner, location confirm, disabled controls, concurrent notify.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'A real 911 dial is disabled; the indicator runs in simulation.'
      : 'Register to wire up the real emergency route (gated behind test numbers, never production 911).',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'E911 trunk with PIDF-LO support',
    met: true,
    hint: 'Your ITSP must accept Geolocation headers; Bandwidth, RedSky, Intrado all do.',
  },
  {
    label: 'Kari\'s Law + RAY BAUM compliance',
    met: true,
    hint: 'Non-negotiable for US deployments. Check with counsel before shipping.',
  },
])
</script>
