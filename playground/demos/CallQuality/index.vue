<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="live"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import LiveMeter from './LiveMeter.vue'
import LiveMeterSrc from './LiveMeter.vue?raw'
import Summary from './Summary.vue'
import SummarySrc from './Summary.vue?raw'
import Banner from './Banner.vue'
import BannerSrc from './Banner.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Call quality surfaces two kinds of data: what's happening right now and what happened last time. The first helps users understand a call that is actively degrading — they see the jitter spike and they know to move rooms. The second is for ops: a post-call recap that lives next to the CDR, so when a customer complains about "the call yesterday at 3pm", you have the numbers.

Both views pull from the same plumbing — RTCPeerConnection.getStats() sampled every second — but the presentation is different. Live needs big numbers and motion. Summary needs percentiles and a timeline so you can spot the event that killed the call.`

const variants: DemoVariant[] = [
  {
    id: 'live',
    label: 'Live meter',
    description: 'MOS, jitter, loss, RTT — sampled every second.',
    component: LiveMeter,
    source: LiveMeterSrc,
    sourceName: 'LiveMeter.vue',
    intro: `The live meter is for the person on the call. Keep it dead simple: four numbers big enough to read at a glance, a verdict chip (Excellent / Acceptable / Degraded) so non-technical users know whether to care, and a 60-second RTT sparkline so the trend is visible even while the current number looks fine.

MOS is computed, not reported. The classic E-model gives you a 1.0–4.5 score from loss + jitter + latency; it's a rough approximation, but it maps to something users understand ("3.4 is acceptable, 2.8 is bad"). Do not invent your own scale.`,
    keyPoints: [
      'Sample `getStats()` at 1 Hz — faster and you fight the browser\'s internal stats cadence',
      'Read `jitter` from `remote-inbound-rtp` (what the peer reports), not `inbound-rtp` (what you receive)',
      'Colour-code thresholds consistently: green <1% loss, amber 1–3%, red >3% — never shift the scale per-call',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Do not log MOS as if it were measured. It is a derived score; store the inputs (loss, jitter, RTT) and recompute on read if the formula changes.',
      },
      {
        kind: 'warning',
        text: 'On mobile, throttle the sampler when the tab is hidden — `getStats()` wakes the CPU and drains battery even when there is nobody looking.',
      },
      {
        kind: 'note',
        text: 'The jitter number from Chrome is in seconds; Firefox has historically reported ms. Normalise to ms before display.',
      },
    ],
    accessibility: [
      'Verdict is conveyed by text ("Acceptable"), not just colour — SR users and colour-blind users get the same info.',
      'Sparkline is marked `aria-hidden="true"`; the numeric RTT cell carries the accessible value.',
      'Metric tiles use tabular numerals so values don\'t jitter horizontally as digits change.',
    ],
    takeaway: 'Live quality is for the user, not the engineer. Pick one score everyone understands and update it smoothly.',
  },
  {
    id: 'summary',
    label: 'Session summary',
    description: 'Per-call recap with percentiles, timeline, verdict.',
    component: Summary,
    source: SummarySrc,
    sourceName: 'Summary.vue',
    intro: `The session summary lives next to the CDR. It is read after the call ended, usually during a complaint ticket or a quality audit, so what matters is the *distribution*: p95 jitter tells you far more than average jitter, and the one RTT spike at minute 2 is the actual reason the customer remembers the call as bad.

A good timeline marks up the inflection points: ICE restarts, codec switches, DTMF, long silences. Those are the fingerprints of whatever went wrong. Without them, the user is left with "it was bad" and no way to act.`,
    keyPoints: [
      'Percentiles over averages — p95 RTT is what users actually experienced during the worst moments',
      'Attach the summary to the CDR row so ops has one place to look when a call is disputed',
      'Include ICE/codec events on the timeline; they are free and they are exactly what explains the MOS dip',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Keep raw per-second samples for 24 hours minimum — you will regret aggregating away the spikes the first time someone asks for details.',
      },
      {
        kind: 'note',
        text: 'SIPREC or server-side recording gives you an out-of-band quality view that survives the client crashing mid-call.',
      },
      {
        kind: 'warning',
        text: 'Do not let MOS alone decide the verdict — a call with MOS 4.1 and a 10-second complete audio dropout is objectively bad, even though average quality was fine.',
      },
    ],
    accessibility: [
      'Timeline event kinds use a text badge plus colour, not colour alone.',
      'Stat tiles use tabular numerals and plain text; no hover is required to read values.',
      'Verdict pill carries the score inline so screen readers announce both the label and the number.',
    ],
    takeaway: 'Summaries are forensic. Keep the raw samples, show percentiles, and timestamp every event that could have moved the score.',
  },
  {
    id: 'banner',
    label: 'Poor network banner',
    description: 'Translate loss/jitter/RTT into a user-facing warning state.',
    component: Banner,
    source: BannerSrc,
    sourceName: 'Banner.vue',
    intro: `Most users do not care about MOS, RTT, or packet loss until the call starts sounding bad. This variant is the layer between the metrics and the person on the phone: one banner, one sentence, one obvious next action. That translation step is what makes quality telemetry useful outside engineering.

Use the thresholds consistently. If "warning" sometimes means a tiny amber chip and sometimes a full red slab, users stop learning what the signal means. Pick a severity ladder once, then let the metrics trigger it.`,
    keyPoints: [
      'Quality telemetry should degrade into a small set of stable UI states, not a wall of numbers',
      'Warn before the call sounds broken; danger states should mean the user needs to act now',
      'Pair every severe state with a concrete action such as retry media or audio-only fallback',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Keep the banner under the toolbar so it is visible without shoving core call controls off-screen.',
      },
      {
        kind: 'warning',
        text: 'Do not auto-dismiss a severe banner after three seconds. A network collapse is not a toast.',
      },
    ],
    accessibility: [
      'Severity is communicated with text, not just colour.',
      'Primary recovery actions remain standard buttons in the same region as the warning.',
      'The metric strip repeats the underlying numbers for users who need detail after hearing the summary.',
    ],
    takeaway:
      'A quality banner is where observability becomes product design: one meaning, one action, no guesswork.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Live stats will be available during real calls.'
      : 'Register to source metrics from real `getStats()` — this surface renders synthetic data otherwise.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'PeerConnection available',
    met: true,
    hint: 'Quality only exists once media is flowing.',
  },
  {
    label: 'CDR storage (for summary)',
    met: true,
    hint: 'Persist per-second samples for 24 h so the recap can render.',
  },
])
</script>
