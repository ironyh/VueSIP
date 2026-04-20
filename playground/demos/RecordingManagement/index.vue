<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="library"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Library from './Library.vue'
import LibrarySrc from './Library.vue?raw'
import Retention from './Retention.vue'
import RetentionSrc from './Retention.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Recording management is the boring half of the recording feature — and the half that actually decides whether your product is sellable into regulated industries. The library is the user-facing surface (find a recording, play it, share it); retention is the policy surface (when does a recording expire, who holds it past expiry, how does it get out of your system when required).

Most playgrounds skip retention. Real deployments cannot. Sarbanes-Oxley (7 years), MiFID II (5 years), HIPAA (6 years), GDPR right-to-erasure — each of these turns "when do we delete" into a legal question, not a storage one. The UI needs to be explicit about the policy in force, let counsel override it (legal hold), and produce an audit trail for each access.`

const variants: DemoVariant[] = [
  {
    id: 'library',
    label: 'Library',
    description:
      'Browsable list with filters, scrubber playback, and bulk download / share / delete.',
    component: Library,
    source: LibrarySrc,
    sourceName: 'Library.vue',
    intro: `The library is the supervisor's search engine. It needs three things right: a filter that matches how people actually remember a call ("last Tuesday, caller was Priya, about 10 minutes"), a scrubber that lets you skip to the bookmarked moment, and a way to export a batch without downloading them one by one.

The non-obvious rule: always show the caller identity twice — display name AND underlying URI / E.164. Display names are spoofable and change; URIs are stable. Agents remember names; auditors need URIs.`,
    keyPoints: [
      'Duration and size filters are more useful than date filters — "calls longer than 15 minutes from last week" is how supervisors find the interesting ones',
      'Selection checkboxes + batch export are the single most-used feature for QA sampling workflows — expose them, do not bury in a menu',
      'The scrubber should jump to annotation timestamps (01:58 PII pause) — the annotations from the in-call surface are what make the library navigable',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Keep the play button as the primary action on each row. QA agents listen to hundreds of recordings; every extra click is friction at scale.',
      },
      {
        kind: 'note',
        text: 'The list is paginated server-side in production — the filter chips compose into a single \`search(params)\` call against the PBX recording API or your S3 index.',
      },
      {
        kind: 'warning',
        text: 'Delete is not delete. In most jurisdictions "delete" means "soft-delete + 30-day grace + crypto-erase." Hard-delete-from-UI without confirmation is how recordings under legal hold get destroyed.',
      },
    ],
    accessibility: [
      'Row play/pause button has \`aria-label="Play {caller}"\` and toggles to "Pause" during playback — the glyph alone is not meaningful.',
      'Filter chips are \`role="radiogroup"\` with \`aria-checked\` — one period and one duration are always selected.',
      'Delete buttons have \`aria-label="Delete {caller}"\` so screen readers know the target of the × glyph.',
    ],
    takeaway:
      'The library is a search engine for voice. Identity twice, annotations as jump-points, and batch operations as first-class actions.',
  },
  {
    id: 'retention',
    label: 'Retention &amp; export',
    description: 'Auto-expire rules, legal-hold register, and the export queue.',
    component: Retention,
    source: RetentionSrc,
    sourceName: 'Retention.vue',
    intro: `Retention is policy with teeth. You configure the rule once, the system enforces it forever, and a month later somebody discovers a compliance failure because the default was wrong. The UI has to make the policy legible at a glance — you should be able to answer "how long do we keep support recordings?" in under five seconds.

Legal hold is the escape hatch. When counsel issues a litigation hold, those recordings must persist even if the retention clock says delete. Treat holds as first-class objects with case IDs, matter descriptions, and a visible release action — not an invisible flag.`,
    keyPoints: [
      'Scope rules by queue / tag, not per-recording — individual overrides explode into chaos at >1000 recordings',
      'Legal hold lives in its own register, not a boolean on the recording — the case ID is the audit artefact when deletion is contested',
      'Export destinations (S3, SFTP, GCS) need credentials rotation and progress visibility; silent failures during the DOJ discovery window are career-ending',
    ],
    notes: [
      {
        kind: 'warning',
        text: 'Never let retention-day inputs go to zero. "0 days" looks like "unlimited" to half your users and "delete immediately" to the other half — enforce a minimum and surface the default explicitly.',
      },
      {
        kind: 'tip',
        text: 'Emit an audit-log entry on every export job, legal-hold add/release, and retention-rule change. Auditors ask for these logs; making them easy to produce turns a multi-day fire drill into an afternoon.',
      },
      {
        kind: 'note',
        text: 'The 7-year option (SEC 17a-4, MiFID II) usually forces WORM storage or object-lock — flagging it at rule-creation time prevents expensive "oh we need to rehome 5 TB" discoveries.',
      },
    ],
    accessibility: [
      'Retention-day inputs have \`aria-label="Retention days for {scope}"\` — the numeric input is meaningful only in the context of its row.',
      'Rule toggles use a custom switch with visible "On" / "Off" text — colour is not the only state indicator.',
      'Export progress bars are paired with a text \`ret__export-state\` label ("running", "done", "error") — screen readers get state changes without needing to parse the bar.',
    ],
    takeaway:
      'Retention is a contract with your future legal team. Write it explicitly, expose holds as first-class, and audit every change.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Library can surface live recordings from your PBX.'
      : 'Not required for browsing the library once recordings are indexed.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Recording store (S3 / MinIO / filesystem)',
    met: true,
    hint: 'Recordings live in object storage; the library queries the index, not the bytes.',
  },
  {
    label: 'Audit log sink',
    met: true,
    hint: 'Every access / export / deletion writes to your SIEM for compliance evidence.',
  },
])
</script>
