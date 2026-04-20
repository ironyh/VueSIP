<template>
  <div class="vgallery">
    <div class="vgallery__head">
      <div>
        <span class="vgallery__eyebrow">Gallery view</span>
        <h3 class="vgallery__title">{{ participants.length }} participants</h3>
      </div>
      <div class="vgallery__layouts" role="radiogroup" aria-label="Grid layout">
        <button
          v-for="l in layouts"
          :key="l.id"
          type="button"
          class="vgallery__layout"
          :class="{ 'vgallery__layout--on': layout === l.id }"
          role="radio"
          :aria-checked="layout === l.id"
          @click="layout = l.id"
        >
          {{ l.label }}
        </button>
      </div>
    </div>

    <ul
      class="vgallery__grid"
      :style="{ 'grid-template-columns': `repeat(${columns}, 1fr)` }"
      role="list"
    >
      <li
        v-for="p in participants"
        :key="p.id"
        class="vgallery__tile"
        :class="{
          'vgallery__tile--speaking': p.speaking,
          'vgallery__tile--self': p.isSelf,
        }"
      >
        <div class="vgallery__tile-inner" :aria-label="`${p.name} ${p.videoOff ? 'video off' : 'video'}`">
          <template v-if="p.videoOff">
            <span class="vgallery__avatar">{{ initials(p.name) }}</span>
          </template>
          <template v-else>
            <span class="vgallery__stream" :style="{ background: p.gradient }">
              <span
                v-for="n in 5"
                :key="n"
                class="vgallery__stream-bar"
                :style="{ height: `${25 + ((n * p.id * 13) % 55)}%`, animationDelay: `${n * 0.1}s` }"
              />
            </span>
          </template>

          <span class="vgallery__name">
            {{ p.name }}{{ p.isSelf ? ' (you)' : '' }}
          </span>

          <span class="vgallery__flags" aria-hidden="true">
            <span v-if="p.muted" class="vgallery__flag vgallery__flag--muted" title="Muted">🎙</span>
            <span v-if="p.videoOff" class="vgallery__flag" title="Video off">📹</span>
            <span v-if="p.hand" class="vgallery__flag vgallery__flag--hand" title="Hand raised">✋</span>
            <span v-if="p.speaking" class="vgallery__flag vgallery__flag--speaking" title="Speaking">◉</span>
          </span>
        </div>
      </li>
    </ul>

    <div class="vgallery__bar">
      <button
        type="button"
        class="vgallery__ctrl"
        :class="{ 'vgallery__ctrl--on': selfMuted }"
        @click="selfMuted = !selfMuted"
        :aria-pressed="selfMuted"
      >
        {{ selfMuted ? 'Unmute' : 'Mute' }}
      </button>
      <button
        type="button"
        class="vgallery__ctrl"
        :class="{ 'vgallery__ctrl--on': selfVideoOff }"
        @click="selfVideoOff = !selfVideoOff"
        :aria-pressed="selfVideoOff"
      >
        {{ selfVideoOff ? 'Start video' : 'Stop video' }}
      </button>
      <button type="button" class="vgallery__ctrl" @click="addParticipant">
        + Invite
      </button>
      <span class="vgallery__spacer" />
      <button type="button" class="vgallery__ctrl vgallery__ctrl--end">Leave</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Layout = '2x2' | '3x2' | '3x3'
const layouts: { id: Layout; label: string }[] = [
  { id: '2x2', label: '2 × 2' },
  { id: '3x2', label: '3 × 2' },
  { id: '3x3', label: '3 × 3' },
]
const layout = ref<Layout>('3x2')
const columns = computed(() => (layout.value === '2x2' ? 2 : 3))

const selfMuted = ref(false)
const selfVideoOff = ref(false)

interface Participant {
  id: number; name: string; gradient: string; muted: boolean; videoOff: boolean; hand: boolean; speaking: boolean; isSelf: boolean
}

const gradients = [
  'linear-gradient(135deg, #1a1410 0%, #3b2515 100%)',
  'linear-gradient(135deg, #0f1a1f 0%, #1c3540 100%)',
  'linear-gradient(135deg, #1a0f1f 0%, #3a1c40 100%)',
  'linear-gradient(135deg, #1f1a0f 0%, #40351c 100%)',
  'linear-gradient(135deg, #0f1f14 0%, #1c4025 100%)',
  'linear-gradient(135deg, #1f0f0f 0%, #40201c 100%)',
]

const participants = ref<Participant[]>([
  { id: 1, name: 'You', gradient: gradients[0], muted: false, videoOff: false, hand: false, speaking: true, isSelf: true },
  { id: 2, name: 'Alex Rivera', gradient: gradients[1], muted: false, videoOff: false, hand: false, speaking: false, isSelf: false },
  { id: 3, name: 'Priya Shah', gradient: gradients[2], muted: true, videoOff: false, hand: false, speaking: false, isSelf: false },
  { id: 4, name: 'Mei Chen', gradient: gradients[3], muted: false, videoOff: true, hand: false, speaking: false, isSelf: false },
  { id: 5, name: 'Jordan Lee', gradient: gradients[4], muted: false, videoOff: false, hand: true, speaking: false, isSelf: false },
  { id: 6, name: 'Sam Park', gradient: gradients[5], muted: true, videoOff: true, hand: false, speaking: false, isSelf: false },
])

let nextId = 7
const addParticipant = () => {
  const names = ['Casey Morgan', 'Riley Kim', 'Quinn Tan', 'Devon Hart']
  const name = names[(nextId - 7) % names.length]
  participants.value.push({
    id: nextId++,
    name,
    gradient: gradients[nextId % gradients.length],
    muted: false,
    videoOff: false,
    hand: false,
    speaking: false,
    isSelf: false,
  })
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
</script>

<style scoped>
.vgallery {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  color: var(--ink);
  font-family: var(--sans);
}

.vgallery__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.vgallery__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.vgallery__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.vgallery__layouts {
  display: inline-flex;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 2px;
  gap: 2px;
}
.vgallery__layout {
  background: transparent;
  color: var(--muted);
  border: 0;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  border-radius: 2px;
}
.vgallery__layout:hover { color: var(--ink); }
.vgallery__layout--on { background: var(--ink); color: var(--paper); }

.vgallery__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.4rem;
}
.vgallery__tile {
  aspect-ratio: 16 / 10;
  border-radius: 2px;
  overflow: hidden;
  background: #0b0805;
  border: 1px solid transparent;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.vgallery__tile--speaking {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
}
.vgallery__tile-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vgallery__avatar {
  width: 58px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 18%, #0b0805);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 1.2rem;
  font-weight: 700;
}
.vgallery__stream {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  padding: 20% 18%;
  overflow: hidden;
}
.vgallery__stream-bar {
  flex: 1;
  max-width: 14px;
  background: color-mix(in srgb, var(--paper) 35%, transparent);
  border-radius: 2px 2px 0 0;
  animation: vgallery-wave 2.4s ease-in-out infinite;
}
@keyframes vgallery-wave {
  0%, 100% { opacity: 0.55; transform: scaleY(1); }
  50% { opacity: 0.85; transform: scaleY(1.15); }
}

.vgallery__name {
  position: absolute;
  left: 0.5rem;
  bottom: 0.5rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--paper) 85%, transparent);
  background: color-mix(in srgb, #000 55%, transparent);
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  max-width: calc(100% - 5rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vgallery__flags {
  position: absolute;
  right: 0.4rem;
  top: 0.4rem;
  display: inline-flex;
  gap: 0.25rem;
}
.vgallery__flag {
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.18rem 0.3rem;
  background: color-mix(in srgb, #000 50%, transparent);
  border-radius: 2px;
  color: color-mix(in srgb, var(--paper) 85%, transparent);
}
.vgallery__flag--muted { color: var(--accent); }
.vgallery__flag--hand { color: #eab308; }
.vgallery__flag--speaking { color: #48bb78; }

.vgallery__bar {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.55rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.vgallery__ctrl {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.75rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.12s;
}
.vgallery__ctrl:hover { border-color: var(--accent); color: var(--accent); }
.vgallery__ctrl--on {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border-color: var(--accent);
}
.vgallery__ctrl--end {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}
.vgallery__ctrl--end:hover { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.vgallery__spacer { flex: 1; }

@media (max-width: 560px) {
  .vgallery__grid { grid-template-columns: repeat(2, 1fr) !important; }
}
</style>
