<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="grid"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Grid from './Grid.vue'
import GridSrc from './Grid.vue?raw'
import List from './List.vue'
import ListSrc from './List.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Speed-dial is the cheapest feature to add and one of the hardest to keep tidy. The premise is a one-click call to a frequent contact, but as usage grows the list inflates, the labels go stale, and nobody bothers to curate anymore. Good speed-dial UIs make the first three contacts instant to reach and the rest easy to find — and they stop there.

These two variants cover the two shapes that matter. A **grid of tiles** is for quick visual recognition of a small, hand-picked set (think desk phone shortcut buttons). A **list directory** is for a larger pool that the user wants to sort, star, and skim. Same underlying API — \`useCallSession().makeCall(number)\` — but the surface is different because the job is different.`

const variants: DemoVariant[] = [
  {
    id: 'grid',
    label: 'Tile grid',
    description: 'Nine hand-picked slots, click to dial, optimise for speed.',
    component: Grid,
    source: GridSrc,
    sourceName: 'Grid.vue',
    intro: `The tile grid is the "desk phone buttons" pattern — a small, opinionated set of contacts the user commits to caring about. Nine slots is enough for a receptionist's most-used extensions without turning into a scrollable wall of faces. Every tile is a single visual unit: initials, name, number, one click.

The empty slots are as important as the filled ones. They invite the user to fill them without pressure — dashed borders, no alarm colours, the word "Add contact" instead of "Empty". The edit sheet slides in below the grid rather than popping a modal, so the user stays anchored to the tiles they're editing.`,
    keyPoints: [
      'Nine slots, not nine-plus — opinionated scarcity forces curation',
      '\`makeCall(contact.number)\` is the whole dial flow; everything else is state persistence and UI feedback',
      'Persist to \`localStorage\` as a fixed-length array so the slot index is stable across sessions',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Initials in a circle beat fetched avatars nine times out of ten: no loading state, no CORS, no broken images, and they render identically light and dark.',
      },
      {
        kind: 'warning',
        text: 'Don\'t auto-populate empty slots from call history. Users expect speed-dial to be deliberate. If you auto-fill, the "remove" click rate will spike and trust in the feature will drop.',
      },
    ],
    accessibility: [
      'Each empty slot is a real `<button>` with an aria-label naming the slot number — screen readers announce "Add contact to slot 4, button".',
      'Edit and remove tools live inside each filled slot and are announced per-contact, not as a floating overlay.',
      'Enter in either field saves the contact, matching form-keyboard expectations.',
    ],
    takeaway:
      'A speed-dial grid is a commitment device. Keep the set small, make the empty slots inviting, and let users curate in peace.',
  },
  {
    id: 'list',
    label: 'Directory list',
    description: 'Sortable directory with call stats, VIP flags, and recency.',
    component: List,
    source: ListSrc,
    sourceName: 'List.vue',
    intro: `The list directory is the "my team" pattern — a larger pool of people the user calls regularly, with enough context per row to pick the right one. Each row answers three questions: who is this, how often do I call them, and when did I last talk to them. That's usually enough to short-circuit a full phonebook lookup.

Sort controls at the top are the user's cheat code: most-called by default, recent for "who did I just miss", A-Z when memory fails. The VIP star is a one-click elevation — marking a contact VIP is how speed-dial stays tidy without forcing the user to prune.`,
    keyPoints: [
      'Three sort modes (frequency / recent / A-Z) cover 95% of retrieval intents — more than that is overkill',
      'Show call count and average duration inline; they\'re the cheapest form of "why do I call this person"',
      'VIP is a single boolean — not a tier system — because tier systems are where UIs go to die',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Relative time ("3h ago") wins for recency; absolute time ("March 14") wins for audit logs. Use relative here.',
      },
      {
        kind: 'note',
        text: 'Call stats are illustrative — wire them to a real call-history store in production. If stats are inaccurate, users stop trusting the sort.',
      },
    ],
    accessibility: [
      'Sort segmented control uses `role="radiogroup"` / `role="radio"` with `aria-checked` — not toggle buttons — because exactly one is always selected.',
      'VIP star uses `aria-pressed` so toggling is announced correctly.',
      'The dial button text flips to "Dialing…" during the in-flight state so screen readers get confirmation without relying on colour.',
    ],
    takeaway:
      'A speed-dial list is a lightweight CRM row. Give it just enough context to pick the right contact, and one very obvious button to call them.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your SIP account is registered — dials will place real calls.'
      : 'Configure SIP in the header to place real calls, or use simulation.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Call session composable',
    met: true,
    hint: '`useCallSession(sipClient)` exposes `makeCall(number)` — the whole dial flow.',
  },
  {
    label: 'Persistent storage',
    met: true,
    hint: 'Grid uses `localStorage`; a real app would sync to a backend contacts service.',
  },
])
</script>
