<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="list"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import List from './List.vue'
import ListSrc from './List.vue?raw'
import Rules from './Rules.vue'
import RulesSrc from './Rules.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A blacklist is two tools masquerading as one: a list of specific numbers you've decided to block, and a rules engine that blocks patterns you haven't seen yet. The first is reactive — somebody spammed you, you add them. The second is proactive — you declare whole classes of calls (premium-rate prefixes, anonymous callers, neighbour-spoofing) unworthy before any of them ring.

Most UIs bundle both into a single "block list" page and regret it. The two have different cadences: individual entries churn constantly, rules get set once and audited rarely. Showing them as separate surfaces keeps each one focused.`

const variants: DemoVariant[] = [
  {
    id: 'list',
    label: 'Blocked numbers',
    description: 'Reactive list of specific numbers and URIs you\'ve blocked.',
    component: List,
    source: ListSrc,
    sourceName: 'List.vue',
    intro: `The blocked-numbers list is the user's journal of "people I've dealt with." Each entry is small: the number, an optional reason, when it was added, and how many times it's triggered since. The "hits" counter is the satisfaction payoff — seeing "312 blocked" on a spammer feels earned.

Pause-vs-delete is the key interaction. Users who remove an entry often regret it when the caller returns; a "paused" state lets them disable without losing the entry. Block for free, pause when unsure, delete only when they're sure the number is safe.`,
    keyPoints: [
      'Store both E.164 numbers and SIP URIs — blocking \`sip:spam@evil.com\` is a different match than blocking a number',
      'Always capture a reason field; six months later nobody remembers why they blocked +1-800-XXX-XXXX',
      'The hit counter motivates users to keep the list curated — a zero-hit entry for a year is probably safe to remove',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Pause > delete. Users toggle items off to test whether a caller still spams, then toggle back on when they do.',
      },
      {
        kind: 'note',
        text: 'SIP blocking can happen at the PBX (preferred — the call never wakes the client) or at the client (informational only — the call still rings, you just reject it locally).',
      },
      {
        kind: 'warning',
        text: 'Don\'t block the caller\'s display name — it\'s spoofable. Always match on the From URI or the authenticated identity if STIR/SHAKEN is in play.',
      },
    ],
    accessibility: [
      'The active/paused toggle is a `<button>` with `aria-pressed` — screen readers announce the state change.',
      'Remove button uses `aria-label="Remove {number}"` — the visual × is not meaningful on its own.',
      'Search input has an explicit `aria-label` ("Search blacklist").',
    ],
    takeaway:
      'A blocked-numbers list is a journal of grievances. Make it easy to add, easy to pause, hard to forget why.',
  },
  {
    id: 'rules',
    label: 'Rules engine',
    description: 'Pattern-based blocking, default action, and global filters.',
    component: Rules,
    source: RulesSrc,
    sourceName: 'Rules.vue',
    intro: `The rules engine is the proactive half. Instead of enumerating every spam number, you declare whole categories unworthy: premium-rate prefixes, short codes, anonymous callers, numbers matching your own area code (the classic neighbour-spoofing pattern).

The single most important decision here is the default action — and the choices matter more than users realise. \`SIP 603 Decline\` tells the caller you exist but don't want them; silent drop (\`200 OK\` then immediate \`BYE\`) burns their retry budget without confirming reachability; voicemail catches false positives. Pick based on your threat model: businesses that can't afford false positives choose voicemail, individuals who never want to hear the call choose reject.`,
    keyPoints: [
      '\`SIP 603 Decline\` is the polite reject; \`486 Busy\` fakes availability; silent drop hides you entirely — pick the one that matches your threat model',
      'Allowlist-first is almost always right — users have more contacts than rules, and a false positive on a friend is worse than a false negative on a stranger',
      'STIR/SHAKEN reputation feeds catch what hand-written patterns miss; enable them when available',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Keep patterns shown as literal regex in the UI. Users who write rules want to see the exact pattern; hiding it behind a "smart blocker" wizard erodes trust.',
      },
      {
        kind: 'warning',
        text: 'Blocking short codes (3–5 digits) breaks things — banks, 911, internal PBX extensions. Leave it off by default and let power users enable it.',
      },
      {
        kind: 'note',
        text: 'Rules run server-side when your PBX supports them (Asterisk \`dialplan\`, FreeSWITCH \`sofia-profile\`). The client-side version is a fallback for hosted / cloud services.',
      },
    ],
    accessibility: [
      'Default-action buttons form a `role="radiogroup"` with `aria-checked` — one action is always selected.',
      'Each rule has a custom switch with a visible "On / Off" text label — colour is not the only indicator.',
      'Global filters are plain checkboxes; hints are inside the label wrapper so they\'re announced in order.',
    ],
    takeaway:
      'Rules catch what lists can\'t. Show the pattern, be explicit about the response, and treat allowlist as a peer — not an afterthought.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Client-side rejects will issue real SIP responses.'
      : 'Register to enforce blocks on incoming calls; this surface edits policy regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Server-side blocking (optional)',
    met: true,
    hint: 'Most PBXs (Asterisk, FreeSWITCH) can enforce rules before the call reaches the client.',
  },
  {
    label: 'STIR/SHAKEN feed (optional)',
    met: true,
    hint: 'Reputation database improves detection; enabled per-carrier.',
  },
])
</script>
