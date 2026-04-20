<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="inbox"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Inbox from './Inbox.vue'
import InboxSrc from './Inbox.vue?raw'
import Greetings from './Greetings.vue'
import GreetingsSrc from './Greetings.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Voicemail is two surfaces pretending to be one feature. There's the inbox — a list of messages with transcription, playback, call-back — and there's the greeting recorder, which is the other side of the same mailbox: the thing the caller hears when you don't answer. Treat them as one screen and both become cluttered; treat them as two surfaces linked by a mailbox identity and each gets to be good at its job.

Under the hood they share the message-summary event (RFC 3842) for delivery notification and a PBX mailbox (\`VoiceMailMain\` in Asterisk, \`voicemail\` in FreeSWITCH) for storage. Above that shared substrate, the UX splits: the inbox is consumption, the greeting recorder is production, and the bridge is the mailbox id.`

const variants: DemoVariant[] = [
  {
    id: 'inbox',
    label: 'Inbox',
    description: 'List of voicemails with transcription preview, unread badges, scrubber playback.',
    component: Inbox,
    source: InboxSrc,
    sourceName: 'Inbox.vue',
    intro: `A voicemail inbox is a reading app, not a phone app. The single design insight that matters: the transcription preview is the list row. Users scan transcriptions, not playback timestamps — and when the transcription is missing they scan the caller identity instead. Lead with the content, not the timestamp.

Unread state is the second axis. A lamp (left border), a badge, and a "mark as read" button are three ways users actually use — keep all three. The urgent flag (RFC 3458 MWI "Messages-Waiting: yes; Urgent-Messages: 1") deserves its own visual treatment; on-call ops teams route escalations through voicemail more often than product managers think.`,
    keyPoints: [
      'Transcription confidence (Deepgram / Whisper / AWS Transcribe all report per-utterance confidence) should be shown — an 83% transcript is an okay summary, a 48% transcript is misleading',
      'Playback should not auto-mark-as-read until ≥3 seconds played — otherwise users who mis-click a row lose the unread indicator on messages they did not hear',
      'Call-back is the most-used action. Put it next to play, not in a menu',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Preserve the original audio forever (or per retention policy) — transcriptions drift as models improve and users will ask for re-transcription of old messages with the 2027 model.',
      },
      {
        kind: 'warning',
        text: 'Anonymous / withheld-ID voicemails are 90% spam but 10% important (whistleblowers, domestic-violence victims using * 67). Do not hide them — grey them out and let the user decide.',
      },
      {
        kind: 'note',
        text: 'Message-delivery is a subscription to the \`message-summary\` event package (RFC 3842). The inbox itself is fetched from the PBX VM API — the SUBSCRIBE just tells you when to re-fetch.',
      },
    ],
    accessibility: [
      'Unread state is a combination of a visible coloured lamp, a visible "Mark read" button, and \`role="list"\` semantics — no single channel carries the state.',
      'Play buttons have \`aria-label="Play voicemail from {caller}"\` with state-aware text when playing — the ▶/‖ glyph is not meaningful alone.',
      'Delete and Mark-read / Mark-new buttons use \`aria-pressed\` for the toggle state — screen readers announce the effect.',
    ],
    takeaway:
      'The inbox is a reading surface. Lead with transcription, keep the three unread signals, and treat call-back as a primary action.',
  },
  {
    id: 'greetings',
    label: 'Greeting recorder',
    description: 'Record / review / set greetings per-state (Busy, Away, After-hours, Holiday) with dialplan preview.',
    component: Greetings,
    source: GreetingsSrc,
    sourceName: 'Greetings.vue',
    intro: `The greeting recorder is the other side of the mailbox: the thing callers hear when you don't pick up. The UX problem is not "record a greeting" — that's a single button — it's "which greeting plays when?" Users want different messages for different states (on another call, away, holiday) without learning dialplan syntax.

The answer is: show the state, show the trigger, show the script you recorded, show which one is active right now. Then show the compiled dialplan underneath — collapsible — so the power user can read exactly what will play. Hide the compilation and users lose trust; show it without the high-level selector and users give up.`,
    keyPoints: [
      'Record per-state greetings but always fall through to a default — missing a holiday greeting should not result in a dial tone on Thanksgiving',
      'Store the script alongside the audio. When the user re-records "Away" three months later, the script is the anchor they rewrite against',
      'Show the dialplan preview — it is how admins catch "I set the after-hours greeting but my business-hours rule is wrong so it plays at 3 PM" bugs before deployment',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Offer a "read my greeting text aloud" TTS option as a fallback for users who are uncomfortable recording themselves. Quality is worse; usability for first-time setup is dramatically better.',
      },
      {
        kind: 'warning',
        text: 'The "Forward to mobile" fallback bypasses voicemail entirely. Make the target number editable inline — hardcoding it in the dialplan is how PII leaks during role changes.',
      },
      {
        kind: 'note',
        text: 'Greetings live as files in the PBX (Asterisk: \`/var/lib/asterisk/sounds/\`; FreeSWITCH: \`$${sounds_dir}\`). The UI uploads and the PBX references them by name in the dialplan.',
      },
    ],
    accessibility: [
      'Record button has \`aria-pressed\` — screen readers announce "Recording" vs. "Record" as pressed state.',
      'Play buttons are disabled (not hidden) when no recording exists, with \`:disabled\` styling — the reason is explicit.',
      'Fallback-mode buttons form a \`role="radiogroup"\` with \`aria-checked\` — one mode is always selected, announced when changed.',
    ],
    takeaway:
      'Greetings are policy expressed as audio. Per-state scripts + a dialplan preview make the policy legible without sacrificing the power-user path.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Inbox syncs from MWI NOTIFYs (RFC 3842).'
      : 'Register to receive message-summary events; demo data is static otherwise.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Voicemail server (PBX mailbox)',
    met: true,
    hint: 'Asterisk VoiceMailMain, FreeSWITCH mod_voicemail, or hosted equivalent.',
  },
  {
    label: 'Transcription service (optional)',
    met: true,
    hint: 'Whisper / Deepgram / AWS Transcribe — inbox degrades gracefully if absent.',
  },
])
</script>
