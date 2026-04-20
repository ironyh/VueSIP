<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="speaker"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import SpeakerView from './SpeakerView.vue'
import SpeakerViewSrc from './SpeakerView.vue?raw'
import EqualGrid from './EqualGrid.vue'
import EqualGridSrc from './EqualGrid.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `A conference gallery is the room. Every other piece of UX around the call — chat, reactions, screen share — hangs off this grid, so getting it right matters. The two canonical layouts exist because meetings have two moods: someone is presenting, or everyone is contributing, and the same layout cannot serve both well.

Speaker view optimises for the listening meeting: one large tile for whoever is talking, everyone else shrunk into a strip below. Equal grid optimises for the panel or standup: every face at the same size, nobody gets a thumb-sized square because they are quiet. Switching between them is a product choice, not a technical one — both are achievable with the same RTCRtpReceiver plumbing.`

const variants: DemoVariant[] = [
  {
    id: 'speaker',
    label: 'Speaker view',
    description: 'Active speaker gets the stage; everyone else thumbnailed.',
    component: SpeakerView,
    source: SpeakerViewSrc,
    sourceName: 'SpeakerView.vue',
    intro: `Speaker view only works if dominant-speaker detection is good. Use WebRTC's audio-level extension (RFC 6464) or the SFU's voice-activity hints — do not try to measure audio levels in JavaScript, the precision is not worth the CPU.

The hardest bit is debouncing. Natural conversation has overlaps and interjections, and a gallery that flips every 200 ms is seasick-inducing. 800–1200 ms of dwell time feels right for most meetings; shorter for interviews, longer for lectures.`,
    keyPoints: [
      'Switch on the RTP `voice-activity` header extension, not client-side audio analysis',
      'Debounce the active-speaker swap by ~800 ms or you will induce motion sickness',
      'Reserve a spot for "self" — people expect to see themselves even when not speaking',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'The active-speaker tile should fade in, not cut. A 200 ms cross-fade prevents the room from feeling like a channel-flip.',
      },
      {
        kind: 'note',
        text: 'Most SFUs (Jitsi, LiveKit, mediasoup) send dominant-speaker as a data channel event. Prefer that to computing it yourself.',
      },
      {
        kind: 'warning',
        text: 'Do not promote someone who unmuted but has not spoken — wait for actual audio level. Unmute latency fools detectors into flashing briefly.',
      },
    ],
    accessibility: [
      'Rotate button has an `aria-label` that includes the current speaker name, announced on focus.',
      'Mute indicator is a text badge ("Muted"), not colour alone — visible to colour-blind users.',
      'Audio level bars are decorative; the `aria-label="Audio level"` on the wrapper tells SR users what they are skipping.',
    ],
    takeaway:
      'Speaker view works when the stage feels decisive — pick a dwell time, honour mute state, and always keep "self" visible.',
  },
  {
    id: 'grid',
    label: 'Equal grid',
    description: 'Spotlight disabled — every tile renders at the same size.',
    component: EqualGrid,
    source: EqualGridSrc,
    sourceName: 'EqualGrid.vue',
    intro: `Equal grid throws away hierarchy. That is a feature for panels, standups, and "everyone on mute" broadcast meetings where you want to scan faces rather than focus on one. The price is that above ~9 tiles, nobody is legible.

If you support both layouts, let the user pin — equal grid with an override tile for someone specific. That is the common middle ground: the CTO presents, but I still want to see my team's reactions at the same size as each other.`,
    keyPoints: [
      'Cap the grid at a sensible max (usually 25 tiles) — beyond that, paginate or fall back to audio-only',
      'Honour aspect ratio (16:10 or 16:9) — distorted video reads as low quality even when the bits are fine',
      'Request lower simulcast layers for tiles beneath a size threshold — do not deliver 720p to a 120 px thumbnail',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'A column-count picker beats an auto-sizer. Users want predictable layouts; auto-fit columns make them hunt for faces across resizes.',
      },
      {
        kind: 'warning',
        text: 'Do not make the muted state invisible — colour alone is a contrast failure. Use an explicit badge.',
      },
      {
        kind: 'note',
        text: 'VP8 + simulcast handles the "too many 720p streams" problem; AV1 is better quality but uses far more CPU when decoding 12 tiles.',
      },
    ],
    accessibility: [
      'Column selector uses `role="radiogroup"` / `role="radio"` with `aria-checked` — one option is always selected.',
      "Each tile surfaces the codec info as plain text so it's readable without hover.",
      'Muted badge has an `aria-label` — the "Muted" text is visible to sighted users too, not colour-only.',
    ],
    takeaway:
      'Equal grid removes hierarchy on purpose. Keep tiles sensibly sized, ask for the right simulcast layer, and never hide mute state behind colour.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Register complete — you could join a real video bridge.'
      : 'Register to test with actual media tracks; this surface renders layout regardless.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'getUserMedia video (optional)',
    met: true,
    hint: 'Needed to render your own tile — otherwise a placeholder stands in.',
  },
  {
    label: 'Dominant-speaker source',
    met: true,
    hint: 'SFU event, RTP extension, or client-side audio analysis.',
  },
])
</script>
