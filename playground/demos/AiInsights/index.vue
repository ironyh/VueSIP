<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="summary"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Summary from './Summary.vue'
import SummarySrc from './Summary.vue?raw'
import LiveCoach from './LiveCoach.vue'
import LiveCoachSrc from './LiveCoach.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `"AI on calls" is two very different products pretending to be one. The post-call summary runs once, asynchronously, on a transcript — cheap tokens, generous latency, read by managers and CRM pipelines. The live coach runs during the call, on streaming audio, with sub-second budgets — expensive compute, ruthless latency, read by an agent under pressure.

Build them separately. Ship the post-call summary first — it carries 80% of the value for 10% of the engineering. Live coach is a quarter-long project minimum, and the UX constraints (no sounds, no blocking modals, never ever in the caller\'s ear) are louder than the model choice.`

const variants: DemoVariant[] = [
  {
    id: 'summary',
    label: 'Post-call summary',
    description: 'TL;DR, topics, action items, sentiment, and transcript excerpt from a finished call.',
    component: Summary,
    source: SummarySrc,
    sourceName: 'Summary.vue',
    intro: `Post-call summary is the high-leverage AI surface. Transcribe the call with Whisper or Deepgram, diarise speakers, feed the transcript to a capable LLM with a structured-output prompt, and you get a TL;DR, topic tags, action items, and a sentiment score. Cost is pennies per call; value is a CRM ticket that basically writes itself.

The trick is the output schema. Do not let the model return free-form prose — constrain it to JSON with typed fields (topics, actions, sentiment). Action items need owner + priority + due date or they are just inspirational text. Topics need mention counts or the UI has no way to rank them.`,
    keyPoints: [
      'Structured output (JSON schema) beats free-form prose every time for downstream automation',
      'Action items must include owner + priority + due date; without them they rot in a rich-text field',
      'Show the transcript excerpt next to the summary so reviewers can spot-check the model without a round trip',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Display a confidence score and surface "human review required" when it drops below threshold. Model hallucinations on action items are the worst kind because they create work that never happened.',
      },
      {
        kind: 'warning',
        text: 'Never let the summary overwrite the transcript. The transcript is the source of truth for legal, compliance, and training; the summary is a derived view that can be regenerated.',
      },
      {
        kind: 'note',
        text: 'GPT-4o at 1,800 tokens is about 1.5 s end-to-end. That is fine for post-call; it is disqualifying for live coach.',
      },
    ],
    accessibility: [
      'Action items are checkboxes inside `<label>` elements with text; priority is shown as text, not only colour.',
      'Transcript lines use tabular numerals for timestamps; role (agent/caller) is a text label, not only a colour.',
      'Sentiment score is rendered as a number, not only as a colour-coded pill.',
    ],
    takeaway: 'Ship post-call summary first. Structured output, owner + priority + due date, confidence score, transcript alongside. That is 80% of the value for 10% of the build.',
  },
  {
    id: 'live-coach',
    label: 'Live coach',
    description: 'Real-time sentiment meter, emotion breakdown, nudges, and talk-listen ratio during a call.',
    component: LiveCoach,
    source: LiveCoachSrc,
    sourceName: 'LiveCoach.vue',
    intro: `Live coach is sentiment, emotion, and nudges on streaming audio — and every design decision is dominated by the constraint that the agent is talking to a human. No sounds (it would leak to the caller). No modal dialogs (the agent cannot afford to dismiss them). No flashing red (the peripheral alarm triggers panic, not reflection).

What works: a tiny meter in the peripheral, a short list of nudges that appear and fade on their own schedule, a talk-listen ratio bar that quietly says "you are dominating this call". The model runs server-side on 1–2 s audio windows; round-trip latency to the coach UI should not exceed 800 ms or the nudge arrives after the moment is gone.`,
    keyPoints: [
      'Sub-1-second round trip is the whole product; anything slower is a post-call summary in disguise',
      'Nudges must be advisory, not prescriptive — "consider acknowledging frustration" beats "say this line"',
      'Talk-listen ratio is the single most valuable coaching signal — agents systematically underestimate how much they talk',
    ],
    notes: [
      {
        kind: 'warning',
        text: 'The coach UI must be muted by default when screen-sharing. A manager reviewing an agent screen-share does not need the caller to see "FRUSTRATED 62%" about themselves.',
      },
      {
        kind: 'tip',
        text: 'Pair the meter with a trend indicator (improving / flat / worsening). A flat −0.3 is different from a −0.3 on the way up; the agent should know which.',
      },
      {
        kind: 'note',
        text: 'Ship with a kill-switch. An agent who has had enough of the coach must be able to turn it off for the current call with one click — fighting the UI is worse than no UI.',
      },
    ],
    accessibility: [
      'Meter has `role="img"` with `aria-label` giving the numeric sentiment value.',
      'Emotion bars show percentages as text next to the visual bar.',
      'Nudges appear as `<li>` elements with text kind (WARN / TIP / INFO), not only a coloured left border.',
    ],
    takeaway: 'Live coach is a latency product first. Sub-second round trip, peripheral meter, advisory nudges, kill-switch for the agent. Build it after the summary, not before.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Live calls can feed the coach pipeline.'
      : 'Register to wire real audio to the transcript pipeline; both surfaces render sample data offline.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Transcription provider',
    met: true,
    hint: 'Whisper, Deepgram, or AssemblyAI streaming endpoint. Required for both variants; diarisation strongly recommended.',
  },
  {
    label: 'LLM with JSON-schema output',
    met: true,
    hint: 'GPT-4o or Claude 3.5 for post-call. Coach should use a smaller, cheaper model (function-calling on streaming windows).',
  },
])
</script>
