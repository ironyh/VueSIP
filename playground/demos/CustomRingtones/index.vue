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
import Rules from './Rules.vue'
import RulesSrc from './Rules.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Ringtones are the user's audio identity for incoming calls. Everyone has opinions — nobody wants the default, half the office wants their own, and at least one person wants the theme from a 90s sitcom. Your softphone either respects that preference or gets uninstalled.

Two halves to get right. The library is the inventory — built-in tones, RFC 3261 cadences, and the user's own uploads, with preview and a volume that persists across sessions. The rules engine is the clever bit — a list of caller-group and time-of-day predicates that map to specific tones. VIP contacts ring with the triad; after 22:00 everyone gets silent; the on-call escalation header rings like a 1970s office PBX until someone answers.`

const variants: DemoVariant[] = [
  {
    id: 'library',
    label: 'Library',
    description: 'Built-in, RFC-defined, and uploaded tones with preview.',
    component: Library,
    source: LibrarySrc,
    sourceName: 'Library.vue',
    intro: `The library splits into four drawers: classic (Bell, Trimline, PBX double-ring — the analogue reference points), modern (marimba, soft ping, chime triads — what users actually pick), RFC-defined (US and UK cadences from RFC 3261 Appendix, in case you need the exact on/off timings), and custom uploads. The drawers exist because picking from a flat list of 40 tones is cognitive overload; the categories let the user commit to a mood before picking a pitch.

Preview is the one interaction that has to feel instant. Users flick through tones the way they flick through ringtone menus on a handset — tap, listen, tap, listen. Load on demand with the Web Audio API, cap preview at four seconds, and make the stop button appear inline on the currently-playing row. Volume is a separate concern from the device volume; the user wants a persistent "my ringtones are 75%" preference that survives restarts.`,
    keyPoints: [
      'RFC 3261 ring cadences (US: 2s on / 4s off at 440+480 Hz; UK: 0.4/0.2/0.4/2s at 400+450 Hz) are worth shipping — power users recognise them, and they double as accessibility defaults',
      'Cap preview at 4 seconds even if the file is longer; nobody needs to hear the full 30-second bedroom recording during selection',
      'Uploads should decode to a canonical PCM format on ingest — variable-bitrate MP3 and opus-in-ogg render inconsistently on older Chromium',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Cache decoded AudioBuffers in IndexedDB. Re-decoding a 1 MB WAV on every preview tap is wasteful and noticeable on laptops.',
      },
      {
        kind: 'warning',
        text: 'User uploads are a content-policy minefield. Strip ID3 tags, scan for copyright-matched fingerprints if you ship consumer, and keep custom tones out of any shared-workspace directory by default.',
      },
      {
        kind: 'note',
        text: 'Asterisk stores custom ringtones in `/var/lib/asterisk/sounds/custom/` and references them via `ALERT_INFO`. FreeSWITCH uses `Alert-Info` headers pointing at `https://` URLs — the phone fetches on INVITE, which is latency-sensitive.',
      },
    ],
    accessibility: [
      'Play buttons carry explicit `aria-label="Preview {name}" / "Stop preview of {name}"` that switch with state.',
      'The "Set default" / "Default" toggle uses `aria-pressed` so the current default is announced.',
      'Tone metadata (duration, waveform, size) is in text rather than icons; screen readers get the same context sighted users get from the visual row.',
    ],
    takeaway:
      'Categorise tones by mood, preview instantly, cap playback at four seconds, cache decoded buffers. The library is a taste interface — get out of the user\'s way.',
  },
  {
    id: 'rules',
    label: 'Rules',
    description: 'Caller-group and time-of-day predicates mapped to tones.',
    component: Rules,
    source: RulesSrc,
    sourceName: 'Rules.vue',
    intro: `The rules engine is what separates a phone from an appliance. Each rule is a predicate (caller group, number prefix, P-Asserted-Identity, or arbitrary SIP header) bound to a tone, with an active window (hours of day, days of week). The list evaluates top-down, first match wins, and the fallback at the bottom handles the "no rule matched" case.

The temptation is to build a full expression language. Resist it. Three predicate types cover 95% of user intent: "who is this caller", "what number did they dial from", and "does the INVITE carry a specific header". The header case is the escape hatch for PBX automation — your monitoring system fires a call with \`X-Priority: urgent\` and it rings with the 1970s office PBX tone regardless of the hour.`,
    keyPoints: [
      'First-match-wins ordering is the mental model users expect from firewall rules and mail filters; drag-to-reorder is not optional',
      'Time windows should support wrap-around (22:00 → 07:00) because "quiet hours" is always an overnight case',
      'The custom SIP header predicate is the one users won\'t invent unprompted; ship it with `X-Priority: urgent` as an example and let the automation people find it',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Log which rule fired for the last 50 calls. Users debug rules by looking at the log, not by re-reading their own predicates.',
      },
      {
        kind: 'warning',
        text: 'Time-of-day rules must resolve against the user\'s local clock, not the PBX\'s. International teams will have one user whose "quiet hours" overlap with another user\'s working day if you pick wrong.',
      },
      {
        kind: 'note',
        text: 'Asterisk `ALERT_INFO` can be set per-dialplan-match with `Set(__ALERT_INFO=<url>)`. FreeSWITCH uses `sip_invite_params=Alert-Info:<url>` on the bridge leg. Either way, the client honours the header; the rule engine here is just choosing which header to inject.',
      },
    ],
    accessibility: [
      'Each rule row carries explicit `<label>`-wrapped form controls so screen readers announce field names with values.',
      'The day-of-week toggles are buttons with `aria-pressed` rather than checkboxes, matching the visual pattern users expect.',
      'Enable/disable state is a checkbox with an explicit ON/OFF text label; disabled rules also dim visually for sighted users.',
    ],
    takeaway:
      'Three predicates, first-match-wins, time windows that wrap past midnight, and a fallback tone. Ship the automation hook (custom header) for the 5% of users who will build something remarkable with it.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Incoming INVITEs will honour the configured rules.'
      : 'Register to hear rules fire on real calls; settings persist regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport active.',
  },
  {
    label: 'Web Audio + media decode (optional)',
    met: true,
    hint: 'Required for preview playback and custom file decode.',
  },
  {
    label: 'PBX Alert-Info support (optional)',
    met: true,
    hint: 'Asterisk, FreeSWITCH and most SBCs propagate the header unchanged.',
  },
])
</script>
