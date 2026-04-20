<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="roster"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Roster from './Roster.vue'
import RosterSrc from './Roster.vue?raw'
import Controls from './Controls.vue'
import ControlsSrc from './Controls.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Conference calls in SIP happen in one of two places. Either the PBX mixes audio on a bridge and every participant has a simple leg to it (easy for the client, heavy on the server) — or each client mixes everything it hears locally in a full mesh (easy on the server, brutal on the client past three participants). In practice, nearly every production system uses the bridge — it's why your PBX has a \`ConfBridge\` module.

That gives the client two distinct UIs: a participant-facing roster (who's here, who's talking, mute/hold/remove) and a moderator-facing control panel (audio policy, recording, waiting room, bulk actions). Some products fold both into one view; the good ones separate them because the audiences and cadences differ.`

const variants: DemoVariant[] = [
  {
    id: 'roster',
    label: 'Participants',
    description:
      'Live participant list with per-person mute, hold, remove, and active-speaker highlighting.',
    component: Roster,
    source: RosterSrc,
    sourceName: 'Roster.vue',
    intro: `The roster is a list of who's currently on the bridge, what their state is, and what you can do to them. Active-speaker highlight is the one visual cue that earns its weight — a pulse ring around the speaking participant is how you recover the "look at who's talking" signal you'd have in a room.

Per-person controls (mute, hold, remove) belong here, not in a modal. A hover-reveal or always-visible tool strip — your call, but make sure the action is one click away. Moderators using this in real meetings don't have time to dig.`,
    keyPoints: [
      "Active speaker is a per-message push from the bridge — don't compute it client-side from raw audio levels",
      'Ringing participants (invited via \`REFER\`, not yet answered) deserve a distinct visual — dashed border is the quiet convention',
      'Per-participant controls issue \`INFO\` or \`REFER\` commands to the bridge, not new dialogs — the participant stays on the same leg',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the total bridge timer separately from per-participant joined-at times. Users want to know both "how long has this call been going" and "when did Priya drop in".',
      },
      {
        kind: 'warning',
        text: 'The "remove" button removes from YOUR view of the bridge — the PBX decides if you\'re authorised. Send the command optimistically but prepare to reconcile with a 403.',
      },
      {
        kind: 'note',
        text: "Invite-by-URI uses out-of-dialog \`REFER\` in most PBXs. The invitee dials out and auto-joins — you don't own the leg once they accept.",
      },
    ],
    accessibility: [
      'Each participant row exposes state in text ("Live", "Ringing", "On hold") alongside colour.',
      'Per-person buttons use `aria-pressed` for mute/hold (toggle) and `aria-label` for remove (icon-only).',
      "The speaking indicator is `aria-hidden` — the speaker's name is already announced via live DOM changes.",
    ],
    takeaway:
      "A conference roster is a hot surface. Prioritise scannability over chrome: whose turn is it, who's muted, who's holding.",
  },
  {
    id: 'controls',
    label: 'Moderator controls',
    description: 'Bridge-wide policy: audio join mode, recording, waiting room, and bulk actions.',
    component: Controls,
    source: ControlsSrc,
    sourceName: 'Controls.vue',
    intro: `Moderator controls are the bridge-wide settings that affect every participant at once. Audio policy decides how new joiners arrive (unmuted, muted, moderator-gated). Recording is a policy decision with compliance implications (the announcement toggle isn't optional in most jurisdictions). The waiting room is how you enforce identity checks before someone joins.

Bulk actions are dangerous — "end call for all" is one misclick away from ending a meeting nobody wanted to end. The convention is to separate destructive from reversible actions visually (colour, position) and to prefer confirmation for the truly final ones. This demo doesn't confirm; a real product should.`,
    keyPoints: [
      '"Muted join" is the right default for anything over ~5 participants — unmuted join turns a 20-person call into background noise',
      "Recording announcements are legally required in many places (two-party consent). Default the toggle on; don't let the moderator forget",
      'Waiting-room admission is the only mechanism in SIP for identity-gating a conference — some PBXs do it natively, others require a custom dialplan',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the bridge mixer\'s live level. Moderators glance at it to confirm audio is actually flowing — a "muted bridge" surprise is worse than a ringing phone.',
      },
      {
        kind: 'warning',
        text: 'Bulk "end call for all" should confirm. This demo doesn\'t because it\'s illustrative; in production, a confirm dialog has saved more meetings than it has frustrated moderators.',
      },
      {
        kind: 'note',
        text: 'Lock is distinct from waiting-room: lock stops new \`INVITE\`s dead (486 or 603). Waiting-room accepts the INVITE but parks it until admitted.',
      },
    ],
    accessibility: [
      'Audio policy uses `role="radiogroup"` / `role="radio"` with `aria-checked` — one option is always active.',
      'Recording button uses `aria-pressed` to convey the on/off state.',
      'Lock button has `aria-pressed` and includes the state in its label ("Bridge locked" vs "Bridge open") for screen readers.',
    ],
    takeaway:
      'Moderator controls are policy, not chrome. Make destructive actions obvious, compliance actions unmissable, and bridge state always visible.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Ready to join a bridge and issue participant-scoped commands.'
      : 'Register to dial into a conference bridge.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'ConfBridge / MeetMe (PBX-side)',
    met: true,
    hint: 'Asterisk ConfBridge, FreeSWITCH conference, or any SIP-standard conference bridge.',
  },
  {
    label: 'Moderator authorisation',
    met: true,
    hint: 'Per-participant and bulk actions require PIN or AOR-based moderator role.',
  },
])
</script>
