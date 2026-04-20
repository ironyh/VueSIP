<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="schedule"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Schedule from './Schedule.vue'
import ScheduleSrc from './Schedule.vue?raw'
import Overrides from './Overrides.vue'
import OverridesSrc from './Overrides.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Time conditions gate the dialplan by wall clock: "during business hours, send to the reception queue; otherwise, voicemail." Every PBX has the concept, and every PBX implements it slightly differently — Asterisk's GotoIfTime, FreeSWITCH's time_of_day app, FreePBX's visual timegroups. The SIP is boring; the UX is where quality shows.

The two canonical surfaces split predictably: a weekly-hours editor with holidays for the normal case, and a manual-override panel for "we closed early because of the snowstorm." Same underlying condition, completely different reason-to-edit.`

const variants: DemoVariant[] = [
  {
    id: 'schedule',
    label: 'Schedule editor',
    description: 'Business hours grid + holiday list.',
    component: Schedule,
    source: ScheduleSrc,
    sourceName: 'Schedule.vue',
    intro: `A grid. Seven rows, some hours wide, and you click cells. Resist the urge to make it cleverer than that — "working hours configurators" always start as drop-downs with "9 am to 5 pm, lunch 12-1" and end as a grid anyway because the exceptions multiply.

Holidays are what separate real time conditions from demo time conditions. A schedule that doesn't honour Thanksgiving is a schedule the operations team will override manually every year, which is the definition of bad software. Keep the list compact, use ISO dates for clarity, and allow rules like "close at 12:00" for the half-days.`,
    keyPoints: [
      'Always include a timezone — schedules are not portable, and UTC-only is a bug waiting to happen',
      'Holidays override the grid; the grid does not override holidays',
      '`GotoIfTime(09:00-18:00|mon-fri|*|*?open,s,1)` is the Asterisk incantation; almost everything else is sugar on top',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the current state (open / closed) prominently. Nothing demoralises operators like editing a schedule and not knowing whether it is currently active.',
      },
      {
        kind: 'warning',
        text: 'Daylight saving changes break naive time conditions. Always store in the IANA zone (America/Los_Angeles), not a UTC offset.',
      },
      {
        kind: 'note',
        text: 'The grid is not great beyond hour granularity. For half-hour businesses (clinics, salons), render 30-min cells — weekly view fits on mobile fine.',
      },
    ],
    accessibility: [
      'Each cell has an `aria-label` that reads "Mon 09:00 — open" / "closed" so SR users can audit without a mouse.',
      'Current-state badge uses text (OPEN / CLOSED) and colour together; not colour alone.',
      'Holiday list is a plain `<ul>` with text-only rules.',
    ],
    takeaway: 'A schedule is a grid with holidays on top. Pick a timezone, show current state, and do not over-engineer the editor.',
  },
  {
    id: 'overrides',
    label: 'Manual override',
    description: 'Force open / closed with a duration and an audit log.',
    component: Overrides,
    source: OverridesSrc,
    sourceName: 'Overrides.vue',
    intro: `Manual overrides are the release valve for when reality disagrees with the schedule. Snow day, fire drill, CEO decided to give everyone Friday afternoon off — the grid cannot express all of that, and it shouldn't try.

Every override must have an expiry. "Force closed until Monday at 09:00" is fine; "force closed forever" is how you end up with a support line that has been silently closed for eight months. Offer the common durations as buttons and require a deliberate choice to go indefinite.`,
    keyPoints: [
      'Every override carries an expiry; auto-revert to schedule is the default, indefinite is an opt-in',
      'Log who flipped it, when, and why — post-incident reviews depend on this',
      'Store in AstDB / Redis / whatever survives restart; a process memory flag is not a real override',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Allow "close early today" and "open early tomorrow" as one-click buttons — they cover 80% of manual overrides.',
      },
      {
        kind: 'warning',
        text: 'Do not let overrides persist across PBX restarts silently. At boot, surface any still-active override in the operator dashboard.',
      },
      {
        kind: 'note',
        text: 'Couple overrides with an announcement. Going "Force closed — snow day" should also swap the IVR greeting; linking the two in one form saves ops an extra step.',
      },
    ],
    accessibility: [
      'Mode picker uses `role="radiogroup"` / `role="radio"` with `aria-checked`.',
      'The audit log has four clearly labelled text columns (time, user, mode, reason); no hover-only info.',
      'Duration buttons are real `<button>` elements, keyboard-focusable, with a visible `--on` state.',
    ],
    takeaway: 'Overrides are a permission slip with an expiry. Make expiry the default and log everything.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'You can dial a schedule-gated extension right now.'
      : 'Register to exercise a live time-condition — this surface edits policy regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'AMI over WebSocket',
    met: true,
    hint: 'Required to flip AstDB keys without editing the dialplan.',
  },
  {
    label: 'Persistent store (AstDB / Redis)',
    met: true,
    hint: 'Overrides must survive restart — in-memory only is a subtle data-loss bug.',
  },
])
</script>
