<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="scenarios"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Scenarios from './Scenarios.vue'
import ScenariosSrc from './Scenarios.vue?raw'
import Custom from './Custom.vue'
import CustomSrc from './Custom.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `You cannot ship a SIP/WebRTC app without testing it on a bad network. The problem is that bad networks are inconvenient to find on purpose — you need a way to summon packet loss, jitter, and latency on demand, in controlled doses, so you can tell whether your PLC / jitter buffer / codec choice actually helps.

The two canonical interfaces: presets for "simulate a 4G connection" (you don't need to know the numbers, just the shape), and raw sliders for "what happens at exactly 280 ms + 4% loss?". Both compile down to the same underlying tool — Linux tc, macOS Network Link Conditioner, Clumsy, or a mitmproxy impairment script — but the UI is very different.`

const variants: DemoVariant[] = [
  {
    id: 'scenarios',
    label: 'Scenario runner',
    description: 'Pre-baked presets: home Wi-Fi, 4G, satellite, lossy uplink.',
    component: Scenarios,
    source: ScenariosSrc,
    sourceName: 'Scenarios.vue',
    intro: `Scenarios encode ground truth: "this is what 4G actually looks like at 5pm on a Tuesday". The numbers come from measurement, not intuition, and they should stay pinned to real-world references so you do not end up testing against a fantasy network.

The stadium 3G preset is the one everybody forgets. Crowded cells with 200+ ms RTT and 3% loss is not a theoretical case — it is the default when your users are at a conference. If your app survives "3G throttled", it survives the real world.`,
    keyPoints: [
      'Latency, jitter, loss, bandwidth — the four knobs that matter. Anything else is a rounding error',
      'Tie each preset to an actual measurement source, not a guess',
      'Always include a "perfect LAN" option; users need it to rule out the network before blaming anything else',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Record a short call under each scenario and attach the mp4 / webm to the scenario description. Nothing teaches "3% loss" like hearing it.',
      },
      {
        kind: 'warning',
        text: 'Scenarios run outside the browser — a proxy, a tc rule, or a kernel module. The browser cannot impair its own traffic.',
      },
      {
        kind: 'note',
        text: 'Symmetric impairment is unrealistic. Real networks often have clean downstream and lossy upstream — simulate asymmetrically when it matters.',
      },
    ],
    accessibility: [
      'Scenario cards form a `role="radiogroup"` with `aria-checked` — keyboard users get radio-group navigation.',
      'Impairment values render as `<dl>` pairs so screen readers match each number to its label.',
      'Stop button carries `aria-disabled` when there is no active scenario.',
    ],
    takeaway:
      'Scenarios encode lived experience of a network. Pin them to real measurements and never let "good Wi-Fi" be your only test case.',
  },
  {
    id: 'custom',
    label: 'Custom profile',
    description: 'Sliders for each impairment with a live effect preview.',
    component: Custom,
    source: CustomSrc,
    sourceName: 'Custom.vue',
    intro: `Presets cover 95% of testing; sliders cover the edge cases. "What happens at exactly the packet loss threshold where Opus PLC gives up?" is a slider question, and answering it teaches more about your stack than five presets in a row.

Compute a rough MOS from the sliders and describe the expected symptoms in plain text. Users who are not WebRTC specialists need a translation layer between "80 ms jitter" and "audio will sound laggy". Without it, the sliders are just numbers.`,
    keyPoints: [
      'Describe the *effect* of the settings in plain English — "noticeable delay", "robotic audio" — not just the impairment numbers',
      'Compute MOS live so users get an aggregate-quality read as they move sliders',
      'Reset to a sane default; there will always be someone who drags loss to 100% and wonders why nothing works',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Show the 150 ms latency ceiling as a visual marker on the slider — that\'s the ITU G.114 "comfort" cutoff.',
      },
      {
        kind: 'warning',
        text: "Bandwidth cap + high latency is a congestion-control test, not a quality test. Be clear about which you're simulating.",
      },
      {
        kind: 'note',
        text: 'Jitter buffers compensate for variance but add latency. Users who only test with high jitter miss the follow-on effect on RTT.',
      },
    ],
    accessibility: [
      'Each slider has a visible value read-out; screen readers get the native range-input announcements too.',
      'Hints live inside the `<label>` so they are grouped with the control, not orphaned.',
      'Effect bullets are plain text — no colour-only information.',
    ],
    takeaway:
      'Sliders let you probe the edges. Translate numbers into symptoms, otherwise the UI is just a very precise way to make things worse.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Register complete — use a real call to actually feel the impairment.'
      : 'This surface designs scenarios; you still need a registered client to exercise them.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Impairment tool (tc / NLC / Clumsy)',
    met: true,
    hint: 'Browsers cannot impair themselves — configure a system-level tool.',
  },
  {
    label: 'Reference recordings',
    met: true,
    hint: 'Optional — attach captures so QA knows what each preset actually sounds like.',
  },
])
</script>
