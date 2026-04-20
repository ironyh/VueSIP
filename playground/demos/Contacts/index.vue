<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="directory"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Directory from './Directory.vue'
import DirectorySrc from './Directory.vue?raw'
import Detail from './Detail.vue'
import DetailSrc from './Detail.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A contact list is a softphone's map of the world. Half of it is inventory — names, numbers, companies, tags — and half of it is a live ops surface because every row has a presence dot that has to be right. Get the first half wrong and the rep can't find the customer; get the second half wrong and they dial a mobile number while the person sits next to them on a desk phone.

Two surfaces matter. The directory is how you find a person. The detail view is what you see after finding them: the list of ways to reach them, ranked by preference, annotated with presence, backed by call history. The same contact record drives both, but the UI goals are opposite — scan-and-filter on one side, depth-and-context on the other.`

const variants: DemoVariant[] = [
  {
    id: 'directory',
    label: 'Directory',
    description: 'Searchable, filterable grid of contacts with presence and favorites.',
    component: Directory,
    source: DirectorySrc,
    sourceName: 'Directory.vue',
    intro: `The directory card layout is load-bearing. Lists are denser but force linear scanning; cards let the eye jump. The avatar corner dot (available / busy / DND / away / offline) is backed by SIP SUBSCRIBE + presence — \`application/pidf+xml\` over event \`presence\`, per RFC 3856 — and the single most common failure mode is stale dots when the subscription silently lapses. Show "Synced Nm ago" somewhere visible or the operator will never know to refresh.

Search has to match across name, company, title, number, and tag, and it has to be substring — not prefix. Users type "lon" expecting to find "London" in a company name and "Tomás León" via the surname, and getting neither because the search is token-prefix-only is a paper cut that compounds thirty times a day.`,
    keyPoints: [
      'Presence dots are backed by RFC 3856 `pidf+xml`; the values map cleanly: `open` → available, `closed` → offline, with activity extensions (`busy`, `away`, `dnd`) per RFC 4480',
      'Avatar colour should be deterministic from name — same name always gets the same hue — so "Alex" looks the same across every device the team uses',
      'Tags are a flat, user-editable facet; groups/folders are not. Nearly every directory that shipped with hierarchy regretted it and added tags on top',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Substring search, not prefix. "lon" should hit London-based Tomás León and also anyone at "London Logistics".',
      },
      {
        kind: 'note',
        text: 'LDAP, CardDAV (RFC 6352), and vendor CRM APIs (HubSpot, Salesforce, Zendesk) all produce the same contact shape. Federate at the service layer, not the UI.',
      },
      {
        kind: 'warning',
        text: 'Never colour-code presence as the only signal. A text label ("Available" / "Busy") in the card body covers colour-blindness, greyscale monitors, and high-contrast OS themes.',
      },
    ],
    accessibility: [
      'Filter toggles are a `role="radiogroup"` with `aria-checked` — one filter is always selected.',
      'Favorite button is `aria-pressed` with a dynamic `aria-label` ("Favorite Alex Rivera"); the star is decorative.',
      'Call/Message buttons have explicit `aria-label` with the contact name — screen readers announce the target.',
    ],
    takeaway:
      'A directory is a search surface first, a dashboard second. Substring match, deterministic avatars, and presence that admits when it has gone stale.',
  },
  {
    id: 'detail',
    label: 'Contact detail',
    description: 'Single-contact drill-down with numbers, call history, and notes.',
    component: Detail,
    source: DetailSrc,
    sourceName: 'Detail.vue',
    intro: `The detail view ranks reachability. A preferred SIP URI at the top, mobile and desk below, the internal extension fourth, chat handle last — because that's the order a salesperson will try them. One-click "Call" next to every row matters more than looking pretty: the moment you make the user paste a number into a separate dialer field, the contact record has failed at its job.

The "Recent calls" block is the quietest productivity win in the whole product. Showing the last five interactions inline removes the "where did we leave off?" context switch that otherwise kicks you out to the CDR page. Private notes live below; they must be explicitly scoped as local — operators put account passwords and deal terms in contact notes all the time, and an unexpected sync to a shared PBX would be a breach.`,
    keyPoints: [
      'Order URIs by preference, not by type — the user marked something as preferred because calling the mobile vs. the desk is a meaningful choice',
      'Every URI row has a copy button — half the time the operator is pasting the number into a CRM, not dialing',
      'Notes are explicitly local; label them as such. Never sync notes back to the PBX, XCAP store, or shared CRM without consent',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Inline call history beats tabbed history. Five rows with direction arrow + duration is enough context to resume a thread.',
      },
      {
        kind: 'note',
        text: 'Presence can carry a free-text note ("Free until 3:30pm PT") via PIDF `<status><note>`. Surface it — it\'s the difference between "Away" and "Away, back Thursday".',
      },
      {
        kind: 'warning',
        text: 'Do not auto-push notes to a shared store. Users treat the notes field like a password manager; even one unexpected sync destroys that trust permanently.',
      },
    ],
    accessibility: [
      'Call / Copy buttons have `aria-label` naming the target URI — "Call sip:alex@example.com", not just "Call".',
      'Direction arrows (`←` / `→` / `×`) have `aria-label` on the container ("inbound", "outbound", "missed") so the symbol is announced as a word.',
      'Notes textarea has `aria-label="Private notes"` and a visible "stored locally" hint — scope is both announced and legible.',
    ],
    takeaway:
      'A contact detail is a reachability list with evidence. Preferred URI first, one-click call everywhere, private notes that stay private.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Call buttons will originate real INVITEs.'
      : 'Register to place calls; this surface works on static data regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport for INVITE and SUBSCRIBE.',
  },
  {
    label: 'Presence source',
    met: true,
    hint: 'SIMPLE SUBSCRIBE to event `presence` (RFC 3856), or carrier presence feed.',
  },
  {
    label: 'Directory source (optional)',
    met: true,
    hint: 'LDAP, CardDAV, or CRM federation — federate at the service layer, not the UI.',
  },
])
</script>
