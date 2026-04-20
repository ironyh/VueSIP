<template>
  <div class="cgq">
    <header class="cgq__head">
      <div>
        <span class="cgq__eyebrow">Gallery · equal grid</span>
        <h3 class="cgq__title">{{ members.length }} tiles · {{ columns }} cols</h3>
      </div>
      <div class="cgq__cols" role="radiogroup" aria-label="Columns">
        <button
          v-for="n in [2, 3, 4]"
          :key="n"
          type="button"
          class="cgq__col"
          :class="{ 'cgq__col--on': columns === n }"
          role="radio"
          :aria-checked="columns === n"
          @click="columns = n"
        >
          {{ n }}×
        </button>
      </div>
    </header>

    <ul class="cgq__grid" :style="{ '--cols': columns }" role="list">
      <li
        v-for="m in members"
        :key="m.id"
        class="cgq__tile"
        :class="{ 'cgq__tile--muted': m.muted }"
      >
        <div class="cgq__video" :style="{ background: m.tint }">
          <span class="cgq__initials">{{ m.initials }}</span>
          <span v-if="m.isSelf" class="cgq__pill cgq__pill--self">You</span>
          <span v-if="m.muted" class="cgq__pill cgq__pill--mute" aria-label="Muted">Muted</span>
        </div>
        <div class="cgq__meta">
          <span class="cgq__name">{{ m.name }}</span>
          <span class="cgq__codec">{{ m.codec }}</span>
        </div>
      </li>
    </ul>

    <footer class="cgq__foot">
      <span
        >Spotlight disabled — all tiles render at the same size regardless of dominant speaker. Good
        for panels, bad for 1-on-1.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Member {
  id: number
  name: string
  initials: string
  tint: string
  muted: boolean
  isSelf: boolean
  codec: string
}

const columns = ref(3)

const members = ref<Member[]>([
  {
    id: 1,
    name: 'Alex Rivera',
    initials: 'AR',
    tint: '#c2410c1a',
    muted: false,
    isSelf: true,
    codec: 'Opus · 48k',
  },
  {
    id: 2,
    name: 'Priya Shah',
    initials: 'PS',
    tint: '#1a14101a',
    muted: false,
    isSelf: false,
    codec: 'VP8 · 720p',
  },
  {
    id: 3,
    name: 'Jordan Lee',
    initials: 'JL',
    tint: '#6b5d4a1a',
    muted: true,
    isSelf: false,
    codec: 'VP8 · 480p',
  },
  {
    id: 4,
    name: 'Meera Kapoor',
    initials: 'MK',
    tint: '#8b45131a',
    muted: false,
    isSelf: false,
    codec: 'H.264 · 720p',
  },
  {
    id: 5,
    name: 'Tom Andresen',
    initials: 'TA',
    tint: '#4a55681a',
    muted: false,
    isSelf: false,
    codec: 'VP8 · 720p',
  },
  {
    id: 6,
    name: 'Sofía García',
    initials: 'SG',
    tint: '#7b32911a',
    muted: true,
    isSelf: false,
    codec: 'VP8 · 360p',
  },
  {
    id: 7,
    name: 'Leo Okafor',
    initials: 'LO',
    tint: '#2d5f3e1a',
    muted: false,
    isSelf: false,
    codec: 'VP8 · 480p',
  },
  {
    id: 8,
    name: 'Yuki Tanaka',
    initials: 'YT',
    tint: '#a03a4c1a',
    muted: false,
    isSelf: false,
    codec: 'AV1 · 720p',
  },
  {
    id: 9,
    name: 'Ingrid Holm',
    initials: 'IH',
    tint: '#3a5a7c1a',
    muted: false,
    isSelf: false,
    codec: 'VP8 · 360p',
  },
])
</script>

<style scoped>
.cgq {
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
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.cgq__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.cgq__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cgq__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cgq__cols {
  display: inline-flex;
  gap: 0.2rem;
}
.cgq__col {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.cgq__col--on {
  color: var(--paper);
  background: var(--accent);
  border-color: var(--accent);
}

.cgq__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: 0.5rem;
}
.cgq__tile {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.cgq__tile--muted {
  opacity: 0.7;
}

.cgq__video {
  position: relative;
  aspect-ratio: 16 / 10;
  border: 1px solid var(--rule);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cgq__initials {
  font-family: var(--mono);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.06em;
}
.cgq__pill {
  position: absolute;
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
}
.cgq__pill--self {
  top: 6px;
  left: 6px;
  background: var(--accent);
  color: var(--paper);
}
.cgq__pill--mute {
  bottom: 6px;
  left: 6px;
  background: var(--ink);
  color: var(--paper);
}

.cgq__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.cgq__name {
  font-size: 0.85rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cgq__codec {
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.cgq__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
</style>
