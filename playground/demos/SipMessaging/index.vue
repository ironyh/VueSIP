<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="conversation"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Conversation from './Conversation.vue'
import ConversationSrc from './Conversation.vue?raw'
import Inbox from './Inbox.vue'
import InboxSrc from './Inbox.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `SIP MESSAGE (RFC 3428) is the protocol's in-session text messaging primitive — short, per-message transactions that look more like SMS than XMPP. You can send IM between any two SIP UAs that support it, and many PBXs relay it as part of the account.

The UI patterns are not novel — they're the same "conversation plus inbox" shapes every messaging app has converged on — but the SIP mechanics are different: no roster sync, no read-receipts standard (you fake them with \`NOTIFY\`), and message delivery is best-effort. These two variants show the conversation view (single thread) and the inbox (thread list) — the two surfaces every SIP messaging client needs.`

const variants: DemoVariant[] = [
  {
    id: 'conversation',
    label: 'Conversation',
    description: 'Single-thread chat with bubbles, receipts, and typing indicator.',
    component: Conversation,
    source: ConversationSrc,
    sourceName: 'Conversation.vue',
    intro: `The conversation view is a single thread between two SIP URIs — ink-coloured outgoing bubbles on the right, paper-coloured incoming bubbles on the left, and the classic "my bubble has a tail on the bottom-right, theirs on the bottom-left" asymmetry that makes the thread readable at a glance.

Read receipts in SIP are a simulation — the protocol doesn't guarantee them, so the cycle here is \`sending → sent → delivered → read\`, with "read" being synthesised from peer-side telemetry. Show them if you have them; hide them if you don't. A ghost "read" timestamp that never advances is worse than none at all.`,
    keyPoints: [
      'SIP MESSAGE is stateless — each message is its own transaction, no connection to maintain',
      'Group timestamps ("3h ago", then absolute dates) only when gaps exceed ~30 minutes',
      "Typing indicators ride on \`NOTIFY\` in most implementations — optional, and many PBXs don't support them",
    ],
    notes: [
      {
        kind: 'tip',
        text: "Auto-scroll to the bottom only when the user is already near the bottom. If they're reading history, snatching the scroll on a new message is infuriating.",
      },
      {
        kind: 'warning',
        text: "Don't pretend you have delivery receipts you don't have. A SIP MESSAGE returning 200 OK means the server accepted it — not that the peer received it.",
      },
    ],
    accessibility: [
      'The stream is `role="log"` with `aria-live="polite"` — screen readers announce new messages without interrupting.',
      'Composer `<textarea>` has a visually-hidden label ("Message") for screen readers; Enter sends, Shift+Enter newlines (standard).',
      'Read receipts are text ("Read"), not icon-only, so screen reader users hear status changes.',
    ],
    takeaway:
      "A conversation view is a well-worn pattern — the SIP-specific work is being honest about what you know vs. what you're faking.",
  },
  {
    id: 'inbox',
    label: 'Inbox',
    description: 'Thread list with unread counts, filters, search, and pinning.',
    component: Inbox,
    source: InboxSrc,
    sourceName: 'Inbox.vue',
    intro: `The inbox is where threads live between conversations. Four jobs: show which threads are unread, which are pinned, which are drafts, and let me search. Pinned rises to the top; unread bolds; drafts show a tiny "Draft" badge that's worth its weight in rescued messages.

The avatar-name-preview-timestamp layout has been stable in messaging UIs for over a decade for a reason: it gives four data points in one row with zero visual noise. Resist the urge to add a fifth.`,
    keyPoints: [
      'Unread badge is a count, not just a dot — users want to know scale before clicking',
      'Pinned threads rise to the top; secondary sort is recency — no third sort needed',
      'Search matches both name and preview; users remember "the latency thing" more reliably than "Priya"',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show drafts inline in the thread row. A "Draft" label is how users remember they started typing something hours ago — losing drafts silently kills trust.',
      },
      {
        kind: 'note',
        text: "SIP has no server-side thread store by default. You're maintaining this list client-side — IndexedDB with a per-URI index is the usual pattern.",
      },
    ],
    accessibility: [
      'Each row is a single `<button>` — screen readers announce it as one thing, with `aria-label` including unread count.',
      'Tab filters use `role="radiogroup"` / `role="radio"` — exactly one is always active.',
      'Unread badges use `aria-hidden` on the visual count; the button label conveys the count in words.',
    ],
    takeaway:
      'An inbox is a well-understood layout. The interesting product work is deciding what counts as a thread — by URI, by subject, or something you invent.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Real MESSAGE will be sent once you wire up the composer.'
      : 'Configure SIP in the header; until then, this is a UI-only simulation.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'PBX supports SIP MESSAGE',
    met: true,
    hint: 'Nearly every modern PBX relays MESSAGE; legacy gear may require a gateway.',
  },
  {
    label: 'Client-side thread store',
    met: true,
    hint: 'SIP has no server inbox — persist threads locally (IndexedDB) or sync via a backend.',
  },
])
</script>
