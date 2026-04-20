<template>
  <DemoShell
    :variants="variants"
    :prerequisites="prereqs"
    :overview="overview"
    default-variant="single"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DemoShell, { type DemoVariant, type DemoPrerequisite } from '../../components/DemoShell.vue'
import { playgroundSipClient } from '../../sipClient'

import Single from './Single.vue'
import SingleSrc from './Single.vue?raw'
import Gallery from './Gallery.vue'
import GallerySrc from './Gallery.vue?raw'

const { isConnected, isRegistered } = playgroundSipClient

const overview = `Video calling is two jobs wearing the same hat. The one-to-one case is a stage — you see them, they see you, and the self-view is a polite reminder of your own camera, not the main event. The many-to-many case is a grid — equal tiles, predictable layout, and the stage metaphor breaks as soon as you hit four participants.

These two variants show the two shapes. \`getUserMedia\` + \`RTCPeerConnection\` do the lifting in both cases; VueSIP's \`useCallSession()\` wraps the SDP exchange. The interesting work is in the UI: where the self-view goes, how quality is communicated, when to switch from single view to grid, and how to keep keyboard shortcuts and accessibility labels on all tiles without the UI feeling like a control room.`

const variants: DemoVariant[] = [
  {
    id: 'single',
    label: 'One-to-one',
    description: 'Stage + PiP self-view, with quality badge and device specs.',
    component: Single,
    source: SingleSrc,
    sourceName: 'Single.vue',
    intro: `The one-to-one layout is the "video call" most people think of: a stage for the remote participant and a small self-view somewhere out of the way. PiP (picture-in-picture) in the corner is the default because it preserves stage real estate; a stacked layout is useful when the user is presenting and wants to monitor themselves at equal size.

The quality badge in the top-right is load-bearing: "HD · 30 fps" is reassuring; "Low · 15 fps" tells the user why their network feels sluggish before they blame the app. Tie it to real \`RTCPeerConnection.getStats()\` in production — guessing quality is worse than no badge.`,
    keyPoints: [
      'Self-view in PiP is the default; full stacked layout is for presenters',
      'Camera cycle button beats a dropdown for 1–3 cameras — most users have at most a built-in + one external',
      "Quality badge drives trust — hide the badge if you can't wire real stats, don't fake it",
    ],
    notes: [
      {
        kind: 'tip',
        text: 'The self-view should be muted at the element level (`<video muted>`) — hearing your own mic delayed by a frame is the fastest way to make a user hang up.',
      },
      {
        kind: 'warning',
        text: "Don't hide the mute/camera controls behind a menu. Users want a one-click out when the doorbell rings.",
      },
    ],
    accessibility: [
      'Every control button has both an icon and a label — screen readers don\'t get "🎙".',
      'The quality badge uses colour + label ("HD · 30 fps" / "Low · 15 fps"), not colour alone.',
      'The remote video element has an `aria-label` naming the participant; screen readers announce it as a media region.',
    ],
    takeaway:
      'One-to-one video is a stage. Keep the self-view polite, the controls one-click, and the quality honest.',
  },
  {
    id: 'gallery',
    label: 'Group gallery',
    description: 'Responsive tile grid with active-speaker highlight and flags.',
    component: Gallery,
    source: GallerySrc,
    sourceName: 'Gallery.vue',
    intro: `Once you have four or more participants, the stage metaphor breaks and you need equal tiles. The gallery layout's job is to show who's on the call, who\'s speaking, and who has their hand up — fast. Everything else (detailed stats, device pickers, participant menus) belongs in a secondary panel, not on the tile.

Active speaker highlighting is the most important single pixel in the grid: an accent-coloured border around the current speaker lets users lock onto the conversation even when audio is muted. Hand-raised, muted, and video-off flags cluster in the top-right so the tile has one scan direction.`,
    keyPoints: [
      'Active-speaker highlight is the most valuable one cue in a gallery — everything else is decoration',
      'Flag cluster (muted / video-off / hand / speaking) in one corner, not spread around the tile',
      'Give users 2×2, 3×2, and 3×3 — beyond 9 tiles, pagination or a filmstrip is better than shrinking',
    ],
    notes: [
      {
        kind: 'tip',
        text: 'Sort by recent-speaker on joining, then freeze order. Constantly re-sorting tiles makes users seasick.',
      },
      {
        kind: 'warning',
        text: "When a participant turns off video, don't collapse their tile — keep their avatar visible at the same size, so they stay part of the conversation.",
      },
    ],
    accessibility: [
      'Each tile has an `aria-label` combining name and video state — "Alex Rivera, video" or "Mei Chen, video off".',
      'Layout selector uses `role="radiogroup"` — exactly one layout is always active.',
      'Flag cluster uses emoji with `title` attributes for hover text and `aria-hidden` wrapper so screen readers get the tile label, not a chaotic emoji string.',
    ],
    takeaway:
      'A group gallery is a grid of equals. Highlight the speaker, cluster the flags, and resist the urge to resize on disconnect.',
  },
]

const prereqs = computed<DemoPrerequisite[]>(() => [
  {
    label: 'SIP registered',
    met: isRegistered.value,
    hint: isRegistered.value
      ? 'Your SIP account is registered.'
      : 'Configure SIP in the header to place real video calls.',
  },
  {
    label: 'SIP connected',
    met: isConnected.value,
    hint: 'WebSocket transport is up.',
  },
  {
    label: 'Camera permission',
    met: true,
    hint: 'Real video requires `navigator.mediaDevices.getUserMedia({ video: true })` — allow camera when the browser asks.',
  },
  {
    label: 'VP9 / H.264 codec support',
    met: true,
    hint: "Every evergreen browser supports these; if you're targeting older WebViews, fall back to VP8.",
  },
])
</script>
