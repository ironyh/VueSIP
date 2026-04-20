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
import Editor from './Editor.vue'
import EditorSrc from './Editor.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `User management is a CRUD screen that pretends to be simple and is not. Every user is an endpoint (PJSIP or chan_sip), an auth row, an identity in your SSO, a mailbox in voicemail.conf, a queue member, a set of permissions in a dozen different contexts. Screens that model it as "name + email + password" ship as demo-ware; real products split the list view and the editor.

The list is a directory: fast, filterable, presence-aware. The editor is a tabbed form where profile, endpoint config, and per-user capability flags each get their own panel — because pretending they are one thing is the bug.`

const variants: DemoVariant[] = [
  {
    id: 'directory',
    label: 'Directory',
    description: 'Live user list with role and presence filters.',
    component: Directory,
    source: DirectorySrc,
    sourceName: 'Directory.vue',
    intro: `A directory is built for lookup, not admin. The admin scanning the list at 9:15 wants to find Priya's extension, not re-audit the database. Big names, visible extensions, presence dots — "oh she's on a call, I'll try later".

The role chip is load-bearing. Admins can break the system; agents can answer calls; extensions are service accounts (faxes, warehouse phones) that nobody should log in as. Surfacing that distinction in the list view prevents the classic "I gave the warehouse phone admin rights for debugging and forgot to revoke" incident.`,
    keyPoints: [
      'Presence comes from PJSIP `device-state` or BLF subscriptions, not the database; poll/subscribe, do not infer from registration alone',
      'Role chips must be visible in the list view — the editor is too late to notice someone is an admin',
      'Filter by role (admin/agent/ext) separately from search — agents rarely want to see fax gateways',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show SIP URI alongside display name. Two users named "Alex" happen, and the URI is the disambiguator admins actually trust.',
      },
      {
        kind: 'warning',
        text: 'Never show the auth secret in the list. Never. Not even with "click to reveal". Secrets leave the database over exactly one path: reset flow.',
      },
      {
        kind: 'note',
        text: 'Service extensions (faxes, loudspeakers, warehouse phones) belong in the same table. Hide them behind a filter, do not force admins to juggle two pages.',
      },
    ],
    accessibility: [
      'Every row is a grid with explicit text for name, URI, extension, role, and status — no icon-only content.',
      'Presence uses a coloured dot plus a text label ("online", "on call", etc).',
      'Filters have `aria-label` on the search input and a real `<select>` for role.',
    ],
    takeaway: 'A directory is a lookup, not an audit. Big names, visible roles, live presence, and never show secrets.',
  },
  {
    id: 'editor',
    label: 'User editor',
    description: 'Tabbed form for profile, endpoint config, and capability flags.',
    component: Editor,
    source: EditorSrc,
    sourceName: 'Editor.vue',
    intro: `A user is three schemas wearing one trenchcoat: the profile (name, email, role), the endpoint (PJSIP auth, transport, max contacts), and the capability set (can record, can dial international, can override time conditions). Putting them on one scrolling page produces either a scroll of doom or a clever collapse that hides the dangerous fields behind an accordion where nobody finds them.

Tabs solve it. Each panel stays short enough to eyeball. The "unsaved" banner is visible regardless of the active tab — because leaving the page with changes is how admins lose edits they forgot to save.`,
    keyPoints: [
      'Split profile / endpoint / capabilities into explicit sections — one form with 27 fields is a trap',
      'Dirty state must be surfaced globally, not per-tab; warn on navigate-away',
      'Never display the current secret. Show "••••" and offer reset — there is no legitimate reason to read it back',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Generate secrets server-side on save. A client-side random-password field feels nice but is weaker and ends up in browser history.',
      },
      {
        kind: 'warning',
        text: 'Capability flags are permissions. Changing "international dialing" from off to on needs an audit log entry, not a silent save.',
      },
      {
        kind: 'note',
        text: 'PJSIP `max_contacts` defaults to 1, which silently kicks the desk phone when the softphone registers. Offer 2–3 as the sane default.',
      },
    ],
    accessibility: [
      'Tabs use `role="tab"` with `aria-selected`; each panel is revealed with `v-show` to preserve tab order.',
      'Capabilities are real `<input type="checkbox">` with label+description grouped in the same `<label>`.',
      'Unsaved indicator is a text badge ("UNSAVED" / "SAVED"), not a colour dot alone.',
    ],
    takeaway: 'A user editor is three forms in a coat. Tab profile / endpoint / caps, surface dirty state globally, and never echo secrets.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Live presence data will drive the directory.'
      : 'Register to see realistic presence; the editor is fully usable without it.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'PJSIP realtime backend',
    met: true,
    hint: 'Required to write auth/endpoint rows; static config is read-only.',
  },
  {
    label: 'Admin session',
    met: true,
    hint: 'Role=admin required to save edits; other roles see read-only view.',
  },
])
</script>
