<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="dialplan"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Dialplan from './Dialplan.vue'
import DialplanSrc from './Dialplan.vue?raw'
import BridgeSettings from './BridgeSettings.vue'
import BridgeSettingsSrc from './BridgeSettings.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `ConfBridge is Asterisk's modern audio-mixing conference application — the successor to MeetMe, and the one you actually want in production. Rooms are declared in the dialplan, their acoustic and moderation behaviour comes from named profiles in confbridge.conf, and runtime control happens over AMI actions like ConfBridgeKick and ConfBridgeLock.

These two variants split the surface by who operates it. The dialplan view is what the telephony admin edits with vim at 3am: extensions.conf plus confbridge.conf profiles. The settings panel is what an app-admin screen looks like — per-bridge PIN, capacity, muted-on-join — driven by AMI so it survives reloads without touching files.`

const variants: DemoVariant[] = [
  {
    id: 'dialplan',
    label: 'Native dialplan',
    description: 'extensions.conf + confbridge.conf as the PBX admin sees it.',
    component: Dialplan,
    source: DialplanSrc,
    sourceName: 'Dialplan.vue',
    intro: `The dialplan view is the source of truth. ConfBridge() takes three arguments — room, bridge profile, user profile — and everything about the room's feel (mixing rate, video mode, music-on-hold, admin privileges) comes from those named profiles, not from inline flags.

Separating bridge profiles from user profiles is what makes ConfBridge reusable. The same bridge can host 100 listeners on default_user and three admins on admin_user without reconfiguring the room itself. That orthogonality is the whole point; treat them like classes, not config files.`,
    keyPoints: [
      'Bridge profiles control the room: `max_members`, `mixing_interval`, `video_mode`, `record_conference`',
      'User profiles control the participant: `admin`, `marked`, `music_on_hold_when_empty`, `announce_user_count`',
      'Reload with `module reload app_confbridge.so` — changes take effect on the next join, not mid-call',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Keep bridge profile names descriptive — `exec_team_bridge`, not `default_bridge`. You will thank yourself when you have twelve of them.',
      },
      {
        kind: 'note',
        text: 'For mixed audio + video, set `video_mode=talker` and leave the SFU decision to Asterisk. Do not try to switch video mode at runtime; it re-negotiates SDP.',
      },
      {
        kind: 'warning',
        text: 'A room with no bridge profile silently uses the built-in defaults — including 2 members max. Always pass the second argument explicitly.',
      },
    ],
    accessibility: [
      'Code block is plain `<pre><code>` — screen readers read it linearly without announcing syntax colours.',
      'Profile settings render as `<dl>` so assistive tech can pair each option with its value.',
      'File path chip is visually a badge but semantically a plain inline span — announced as text.',
    ],
    takeaway: 'The dialplan view is the truth. Show the profiles separately so users learn ConfBridge the way it actually models rooms.',
  },
  {
    id: 'settings',
    label: 'Bridge settings',
    description: 'Per-bridge PIN, capacity, muted-on-join toggles.',
    component: BridgeSettings,
    source: BridgeSettingsSrc,
    sourceName: 'BridgeSettings.vue',
    intro: `The settings panel is the app-admin surface. It talks to Asterisk over AMI — ConfBridgeSetSingleVideoSrc, ConfBridgeLock, ConfBridgeStartRecord — and the PIN / max / mute toggles translate to live re-profiling.

The honest trade-off here is that runtime AMI tweaks do not survive an asterisk -rx "core restart". Good ops treats this UI as the mutation layer and writes the result back to confbridge.conf asynchronously; the worst version treats AMI as the source of truth and loses its state every Tuesday at 4am.`,
    keyPoints: [
      'Lock toggle maps to `ConfBridgeLock` / `ConfBridgeUnlock` — new SIP INVITEs get 486 Busy until unlocked',
      'Record path writes via MixMonitor under the hood; the bridge carries on if the path is unwritable',
      '`muted_on_join` is a user-profile flag, not a per-call thing — switch users into `listener_user` for listen-only',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Keep user PIN short (4 digits) and admin PIN longer (6+). People type the user PIN dozens of times; admins enter theirs rarely.',
      },
      {
        kind: 'warning',
        text: 'If `endMarked` is enabled and the only admin drops from a flaky connection, the whole room dies. Always have two admins for long meetings.',
      },
      {
        kind: 'note',
        text: 'Asterisk emits `ConfbridgeJoin`/`ConfbridgeLeave`/`ConfbridgeTalking` events — wire them up for live participant UI and talk-indicator dots.',
      },
    ],
    accessibility: [
      'Lock button uses `aria-pressed` so the state change is announced ("pressed" / "not pressed").',
      'Each toggle has a visible hint inside the `<label>` — hint and name are read together as one prompt.',
      'Numeric PIN inputs use `inputmode="numeric"` to surface the right soft keyboard on mobile.',
    ],
    takeaway: 'Runtime AMI control is powerful but ephemeral — treat this panel as the mutation layer, never the source of truth.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You can dial the room extension directly.'
      : 'Register an endpoint to actually join a bridge — this surface edits policy regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'AMI over WebSocket (required)',
    met: true,
    hint: 'ConfBridge control actions are AMI-only — the proxy must be reachable.',
  },
  {
    label: 'app_confbridge loaded',
    met: true,
    hint: 'Verify with `module show like confbridge` on the Asterisk CLI.',
  },
])
</script>
