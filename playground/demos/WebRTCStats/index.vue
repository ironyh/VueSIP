<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="dashboard"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Dashboard from './Dashboard.vue'
import DashboardSrc from './Dashboard.vue?raw'
import Graphs from './Graphs.vue'
import GraphsSrc from './Graphs.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `RTCPeerConnection.getStats() returns a blob of reports — one per inbound stream, outbound stream, codec, transport, ICE candidate, candidate pair, and DTLS handshake. It is a firehose, and the naive view (render it all as JSON) is useless. The two useful presentations are categorised and charted.

The dashboard view parses getStats() into panels by type so you can answer "what's happening on the ICE transport right now?". The graphs view takes the handful of numbers anyone actually watches — RTT, jitter, loss, bitrate, FPS — and turns them into 60-second sparklines so the shape of the call is obvious.`

const variants: DemoVariant[] = [
  {
    id: 'dashboard',
    label: 'Stats dashboard',
    description: 'getStats() parsed into categorised panels (media / remote / ICE).',
    component: Dashboard,
    source: DashboardSrc,
    sourceName: 'Dashboard.vue',
    intro: `Group by the \`type\` field, not by stream id. The ids are ephemeral — Chrome's look like "IT01A", Firefox's look like GUIDs, and Safari changes them between versions. The type strings (\`inbound-rtp\`, \`remote-inbound-rtp\`, \`candidate-pair\`) are the stable contract.

The most asked question this view answers is "which candidate pair is actually being used?". Filter \`candidate-pair\` for \`nominated === true\` + \`state === 'succeeded'\`, then resolve \`localCandidateId\` / \`remoteCandidateId\` — that tells you if you're going peer-to-peer or through TURN.`,
    keyPoints: [
      'Program against `type` strings — `inbound-rtp`, `outbound-rtp`, `remote-inbound-rtp`, `candidate-pair`, `transport`',
      "`remote-inbound-rtp` is the peer's report about *you* — that's where real jitter and loss live",
      'Unit drift: Chrome reports jitter in seconds, older Firefox in ms. Normalise on read',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Dump getStats() to JSON once per call and attach it to bug reports. It is the single most useful artefact when diagnosing "audio is choppy".',
      },
      {
        kind: 'warning',
        text: 'Do not block the render on getStats() — on mobile it can take 20+ ms. Sample on a timer, render from reactive state.',
      },
      {
        kind: 'note',
        text: 'The legacy callback-style getStats() was removed. You want the promise form: `await pc.getStats()` returns an `RTCStatsReport` (a `Map`-like).',
      },
    ],
    accessibility: [
      'Each report row uses `<dl>` so label/value pairs are announced as related.',
      'Refresh button carries an explicit `aria-label` — the ↻ glyph alone is meaningless to SR users.',
      'Group counts ("4 reports") are plain text inside the heading strip, not tooltip-only.',
    ],
    takeaway:
      'getStats() is categorical data — render it categorically. Group by `type`, surface the nominated candidate pair, keep the raw report in your back pocket.',
  },
  {
    id: 'graphs',
    label: 'Graphs',
    description: 'Time-series sparklines for the metrics anyone actually watches.',
    component: Graphs,
    source: GraphsSrc,
    sourceName: 'Graphs.vue',
    intro: `Graphs beat numbers for spotting degradation. A single RTT of 280 ms does not tell you whether the call is falling off a cliff or just had one bad moment; 60 seconds of data, sparkline style, does.

Keep the charts small. These are diagnostics, not dashboards — the whole point is that six sparklines fit next to each other and tell the story at a glance. Fancy axes, gridlines, and tooltips make it harder to read, not easier.`,
    keyPoints: [
      'Six metrics cover 95% of real-world use: RTT, jitter, loss, outbound bitrate, FPS, NACK count',
      'Min / p95 / max underneath each sparkline gives the distribution without a histogram',
      'Colour the line by current tier, not by series — red means "now bad", not "this metric is red"',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Ring buffers, not arrays. A 60-sample window rotating every second gives you 1 Hz sparkline resolution with zero GC pressure.',
      },
      {
        kind: 'warning',
        text: 'SVG sparklines scale beautifully but allocate new DOM on every update. For >6 charts or >60 samples, switch to canvas or react state-less to the update.',
      },
      {
        kind: 'note',
        text: 'NACK count is a leading indicator — it rises before loss does, because NACKs are the client asking for a retransmit. Watch it for early warning.',
      },
    ],
    accessibility: [
      'SVG charts are decorative (`aria-hidden="true"`); the numeric current value + min/p95/max carry the information.',
      'Current value colour is paired with a classname selector; the numeric value itself is always visible.',
      'Card layout uses grid with minmax so small viewports get a single column without hidden metrics.',
    ],
    takeaway:
      'Graphs are for pattern recognition. Keep them small, keep them colour-coded by threshold, and always show percentiles next to the line.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Stats will come from real calls once you dial.'
      : 'Register to drive `getStats()` from a live peer connection; this surface renders synthetic data otherwise.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'PeerConnection available',
    met: true,
    hint: 'Stats only exist during a call — there is nothing to sample before INVITE completes.',
  },
  {
    label: 'Sample store (optional)',
    met: true,
    hint: 'Keep 5–10 min of raw samples if you want meaningful p95 / p99.',
  },
])
</script>
