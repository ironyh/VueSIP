<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="account"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Account from './Account.vue'
import AccountSrc from './Account.vue?raw'
import Preferences from './Preferences.vue'
import PreferencesSrc from './Preferences.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A settings screen is two things awkwardly glued: identity (who you are, what you can log in from, how to reset access) and preferences (how the app should behave for you). Mixing them produces a spiralling scroll where "delete my account" lives one toggle away from "notification sounds". Splitting them is the cheapest, highest-leverage UX move in the product.

The account view is for security-sensitive operations — device revocation, secret reset, sign-out everywhere, delete — presented with the weight and spacing they deserve. The preferences view is a calm list of toggles and selects for per-user behaviour.`

const variants: DemoVariant[] = [
  {
    id: 'account',
    label: 'Account',
    description: 'SIP credentials, registered devices, and dangerous actions.',
    component: Account,
    source: AccountSrc,
    sourceName: 'Account.vue',
    intro: `Identity and security live here. The secret is never displayed — "reset" is the only way out — and registered devices get their own list with revoke buttons, because a stolen laptop is the most common "help, someone is using my extension" ticket and a self-service fix saves a support call.

The danger zone is a hard-fought UI convention and it works. Red borders, confirmation prompts, explicit consequences in the copy ("recordings tombstoned for 30 days") — this is where users routinely make expensive mistakes, so slow them down.`,
    keyPoints: [
      'Never echo the current secret; reset is the only path, via email verified link',
      'Revoke per-device, not just "sign out" — a stolen phone wants granular logout',
      'Danger-zone actions always have a confirmation prompt or a typed-match ("type DELETE to confirm")',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the User-Agent string of each registration. "Polycom VVX 450 · firmware 6.4.5" is much more recognisable than "endpoint-7f3a".',
      },
      {
        kind: 'warning',
        text: 'Sign-out-everywhere should not drop active calls. Users treat it as "future sessions revoked", not as "kill my current meeting".',
      },
      {
        kind: 'note',
        text: 'Tombstone periods are a UX feature, not a bug. Saying "restorable for 30 days" is kinder and reduces "I deleted my voicemails, help" tickets.',
      },
    ],
    accessibility: [
      'Every key/value row uses `<dt>` / `<dd>` semantics so screen readers announce label then value.',
      'Destructive buttons carry text colour + border + text — colour is reinforcement, not the sole signal.',
      'Toast confirming secret-reset is plain text in a semantic region, not an ARIA-live anti-pattern.',
    ],
    takeaway: 'Account settings is where users make expensive mistakes. Slow them down, reveal nothing sensitive, and let them revoke per-device.',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    description: 'Behaviour toggles grouped into call handling, audio, and notifications.',
    component: Preferences,
    source: PreferencesSrc,
    sourceName: 'Preferences.vue',
    intro: `Preferences are the quiet view. Most users touch them once and forget they exist, which means the organisation into visible groups is everything. Three groups cover 95% of real-world requests — call handling (ring time, auto-answer, DND defaults), audio (codec preference, AEC, noise suppression), and notifications (missed-call email, voicemail transcription).

The sneaky hard bit is that "preferences" applies on top of admin-enforced policy. If the admin says "codec must be Opus on this tenant", the per-user codec picker is a lie. Either disable it with a tooltip or remove it — silently ignoring the user's choice is worse than not having it.`,
    keyPoints: [
      'Group preferences by behaviour, not by data type — users think in "what does this do", not in "is this a toggle or a select"',
      'Admin policy supersedes user preference; surface that explicitly when it does',
      'Ring duration and DND defaults are the two most-touched fields; make them first-class',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the target of email notifications ("sent to alex@example.com") inline. Users forget which email is on file and default to "notifications don\'t work".',
      },
      {
        kind: 'warning',
        text: 'Disabling AEC in a browser client produces feedback loops within seconds. Treat the toggle as a "pro mode" option with a warning, not a casual switch.',
      },
      {
        kind: 'note',
        text: 'Voicemail transcription triggers compliance questions (recording consent). Couple the toggle with a short disclaimer, not a 12-page policy link.',
      },
    ],
    accessibility: [
      'Each preference is a labelled row with strong/paragraph semantics so screen readers hear title-then-description.',
      'Checkboxes are wrapped in `<label>` with visible on/off text — the state is not colour-only.',
      'Dirty-state badge uses text ("UNSAVED" / "SAVED") plus colour.',
    ],
    takeaway: 'Preferences are a quiet form. Group by behaviour, defer to admin policy, and always show who the notifications go to.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'The devices list reflects live registrations.'
      : 'Register to see your active devices; the form is fully usable offline.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Identity provider (SSO or local)',
    met: true,
    hint: 'Required to sign-out-everywhere; local-only users see a narrower account panel.',
  },
  {
    label: 'Per-user settings store',
    met: true,
    hint: 'Preferences persist via tenant config; in-memory only is a data-loss bug.',
  },
])
</script>
