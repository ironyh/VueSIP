<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="reference"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Reference from './Reference.vue'
import ReferenceSrc from './Reference.vue?raw'
import Custom from './Custom.vue'
import CustomSrc from './Custom.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Star codes are muscle memory. \`*97\` to check voicemail, \`*72\` to set forward-all, \`##\` to blind-transfer the call — the attendants dial them without looking at the screen, and every PBX on earth ships them in subtly different flavours. Your UI has two jobs: show the user what codes are available, and let the admin invent new ones without breaking the built-ins.

Good feature-code UX is not a keypad simulator. It is a reference the user can skim when they forget, plus a safe editor that flags when a custom rule will never fire because a built-in beat it.`

const variants: DemoVariant[] = [
  {
    id: 'reference',
    label: 'Dialpad reference',
    description: 'Searchable card wall of built-in star codes.',
    component: Reference,
    source: ReferenceSrc,
    sourceName: 'Reference.vue',
    intro: `The reference view is what a receptionist pulls up at 8:52 AM when they cannot remember whether it is \`*72\` or \`*73\` to set call-forward. Optimise for scannability: big monospace codes, one-line explanations, fast filter by category. No animations, no accordions — every hidden row is one they will not find.

The category tabs are the trick. "Voicemail" and "Forward" are the two most-used categories; put them first, and let search find the obscure ones like \`*69\` (last-call return) that nobody remembers but everyone occasionally needs.`,
    keyPoints: [
      'Built-in codes live in `features.conf` (Asterisk) or the DefaultModules mapping (FreeSWITCH) — learn the one in front of you',
      '`##` is a near-universal blind-transfer code in-call; `*2` is attended transfer on most modern dialplans',
      '`*97` enters your own voicemail; `*98` prompts for mailbox+PIN — both use `VoiceMailMain()`',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Filter by category, not just by text. Users who have forgotten the exact code remember the verb ("forward") better than the digits.',
      },
      {
        kind: 'warning',
        text: 'Do not let the reference appear complete. There are always tenant-specific codes the built-ins view cannot know about — link to the custom tab.',
      },
      {
        kind: 'note',
        text: '`featuredigittimeout` in `features.conf` controls how long the PBX waits for a feature code after `*`. 2 seconds is too short on mobile; default to 3.',
      },
    ],
    accessibility: [
      'Every code row is a grid with explicit text columns (code / label / app) — no hover-only content.',
      'Filter input has an `aria-label` and uses `type="search"` so assistive tech offers clear/submit.',
      'Category tabs use `role="tab"` with `aria-selected`.',
    ],
    takeaway:
      'Reference, not tutorial. Big monospace codes, short descriptions, and fast filter — that is the whole product.',
  },
  {
    id: 'custom',
    label: 'Custom codes',
    description: 'Tenant-level feature codes with conflict detection.',
    component: Custom,
    source: CustomSrc,
    sourceName: 'Custom.vue',
    intro: `The editor is where it gets dangerous. Overriding \`*5\` for "one-touch record" means your custom \`*5\` will never fire — Asterisk evaluates built-ins first. The UI must flag that in red before the admin saves, because silent conflicts show up weeks later as "my custom code stopped working" tickets.

Generate the dialplan preview live. Operators who edit feature codes are comfortable reading \`extensions.conf\`; hiding the generated output makes them less confident, not more. Show what you are going to write, flag what will break, let them ship.`,
    keyPoints: [
      'Built-ins always win. Flag conflicts at input time and block save until resolved',
      'Reserve `*0*` and `*9*` as tenant-scope prefixes — they never conflict with PBX built-ins',
      'Each custom code maps to a dialplan action: `Dial`, `Goto`, `Macro`, or `Set` — anything else is smell',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the generated dialplan stanza next to the form. Operators who edit feature codes can read `extensions.conf` — hiding it is patronising.',
      },
      {
        kind: 'warning',
        text: 'A conflicting code never generates an error at runtime — it just silently does nothing. Validate at edit time, not at dial time.',
      },
      {
        kind: 'note',
        text: 'For multi-tenant PBXs, namespace custom codes under the tenant context. `*411` for Tenant A and `*411` for Tenant B must not collide at the global level.',
      },
    ],
    accessibility: [
      'Each custom-code row has explicit `aria-label`s on inputs so screen readers announce purpose, not placeholder.',
      'Conflict warnings are rendered inline as text, not as icon-only badges.',
      'Remove (×) buttons carry `aria-label="Remove"` for screen reader clarity.',
    ],
    takeaway:
      'Custom codes are a silent-failure mine. Validate conflicts at edit time, show the generated dialplan, and reserve tenant prefixes.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You can dial feature codes against the live PBX.'
      : 'Register to test live feature codes; the editor works offline regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Asterisk features.conf readable',
    met: true,
    hint: 'Required to enumerate built-ins; falls back to known defaults otherwise.',
  },
  {
    label: 'Dialplan write access',
    met: true,
    hint: 'Required to save custom codes; read-only mode still renders the reference.',
  },
])
</script>
