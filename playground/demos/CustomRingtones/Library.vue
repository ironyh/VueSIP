<template>
  <div class="crl">
    <header class="crl__head">
      <div>
        <span class="crl__eyebrow">Ringtone library</span>
        <h3 class="crl__title">{{ tones.length }} tones · {{ customCount }} custom</h3>
      </div>
      <label class="crl__vol">
        <span class="crl__vol-label">Volume</span>
        <input type="range" min="0" max="100" step="5" v-model.number="volume" aria-label="Ringtone volume" />
        <span class="crl__vol-v">{{ volume }}%</span>
      </label>
    </header>

    <section v-for="cat in categories" :key="cat.id" class="crl__cat">
      <h4 class="crl__cat-title">{{ cat.label }}</h4>
      <ul class="crl__list" role="list">
        <li
          v-for="t in tonesByCat[cat.id]"
          :key="t.id"
          class="crl__row"
          :class="{ 'crl__row--selected': selected === t.id, 'crl__row--playing': playing === t.id }"
        >
          <button
            type="button"
            class="crl__play"
            :aria-label="(playing === t.id ? 'Stop preview of ' : 'Preview ') + t.name"
            @click="preview(t.id)"
          >
            <span aria-hidden="true">{{ playing === t.id ? '■' : '▶' }}</span>
          </button>
          <div class="crl__body">
            <span class="crl__name">{{ t.name }}</span>
            <span class="crl__meta">
              <span v-if="t.duration">{{ t.duration.toFixed(1) }}s</span>
              <span v-if="t.waveform" class="crl__sep" aria-hidden="true">·</span>
              <span v-if="t.waveform" class="crl__wave">{{ t.waveform }}</span>
              <span class="crl__sep" aria-hidden="true">·</span>
              <span>{{ t.size }}</span>
            </span>
          </div>
          <div class="crl__tools">
            <button
              type="button"
              class="crl__btn"
              :class="{ 'crl__btn--on': selected === t.id }"
              :aria-pressed="selected === t.id"
              @click="selected = t.id"
            >{{ selected === t.id ? 'Default' : 'Set default' }}</button>
            <button
              v-if="t.category === 'custom'"
              type="button"
              class="crl__btn crl__btn--danger"
              :aria-label="`Remove ${t.name}`"
              @click="remove(t.id)"
            >×</button>
          </div>
        </li>
      </ul>
    </section>

    <div class="crl__upload">
      <div class="crl__upload-head">
        <span class="crl__upload-title">Add custom ringtone</span>
        <span class="crl__upload-hint">MP3 / WAV / OGG · max 5 MB · ≤30 seconds</span>
      </div>
      <button type="button" class="crl__upload-btn" @click="mockUpload">
        + Upload file
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Tone {
  id: string
  name: string
  category: 'classic' | 'modern' | 'rfc3261' | 'custom'
  duration?: number
  size: string
  waveform?: string
}

const categories = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'rfc3261', label: 'RFC-defined' },
  { id: 'custom', label: 'Custom' },
] as const

const tones = ref<Tone[]>([
  { id: 'bell-1955', name: 'Bell Model 500 · ring', category: 'classic', duration: 4.0, size: '48 KB', waveform: 'sine 20Hz AM' },
  { id: 'trimline', name: 'Trimline · electronic warble', category: 'classic', duration: 3.2, size: '62 KB', waveform: 'square 1000/1200Hz' },
  { id: 'office-pbx', name: 'Office PBX double-ring', category: 'classic', duration: 3.8, size: '44 KB', waveform: '440+480Hz · 2s on/4s off' },
  { id: 'marimba', name: 'Marimba', category: 'modern', duration: 2.8, size: '78 KB', waveform: 'struck-bar synth' },
  { id: 'soft-ping', name: 'Soft ping', category: 'modern', duration: 1.4, size: '32 KB', waveform: 'sine burst + reverb' },
  { id: 'chime-three', name: 'Three-tone chime', category: 'modern', duration: 2.2, size: '41 KB', waveform: 'G/B/D triad' },
  { id: 'rfc3261-us', name: 'US cadence (RFC 3261)', category: 'rfc3261', duration: 6.0, size: '120 KB', waveform: '440+480Hz · 2s/4s' },
  { id: 'rfc3261-uk', name: 'UK cadence', category: 'rfc3261', duration: 6.0, size: '120 KB', waveform: '400+450Hz · 0.4/0.2/0.4/2s' },
])

const tonesByCat = computed(() => {
  const out: Record<string, Tone[]> = { classic: [], modern: [], rfc3261: [], custom: [] }
  for (const t of tones.value) out[t.category].push(t)
  return out
})

const customCount = computed(() => tones.value.filter((t) => t.category === 'custom').length)

const volume = ref(75)
const selected = ref('rfc3261-us')
const playing = ref<string | null>(null)
let playTimer: number | null = null

const preview = (id: string) => {
  if (playing.value === id) {
    playing.value = null
    if (playTimer) { clearTimeout(playTimer); playTimer = null }
    return
  }
  playing.value = id
  const dur = tones.value.find((t) => t.id === id)?.duration ?? 2
  if (playTimer) clearTimeout(playTimer)
  playTimer = window.setTimeout(() => {
    playing.value = null
    playTimer = null
  }, Math.min(dur * 1000, 4000))
}

let customId = 0
const mockUpload = () => {
  customId++
  const samples = [
    { name: 'office-greet.mp3', duration: 4.5, size: '142 KB' },
    { name: 'team-anthem.wav', duration: 8.0, size: '1.2 MB' },
    { name: 'dog-bark.ogg', duration: 2.1, size: '58 KB' },
    { name: 'neighbour-cry.mp3', duration: 3.3, size: '108 KB' },
  ]
  const s = samples[customId % samples.length]
  tones.value.push({
    id: `custom-${Date.now()}`,
    name: s.name.replace(/\.[^.]+$/, ''),
    category: 'custom',
    duration: s.duration,
    size: s.size,
    waveform: 'uploaded · decoded',
  })
}

const remove = (id: string) => {
  tones.value = tones.value.filter((t) => t.id !== id)
  if (selected.value === id) selected.value = 'rfc3261-us'
}
</script>

<style scoped>
.crl {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --danger: #a41d08;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}
.crl__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.crl__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.crl__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.crl__vol {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.3rem 0.55rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
}
.crl__vol-label {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
}
.crl__vol input[type='range'] { accent-color: var(--accent); width: 6rem; }
.crl__vol-v {
  font-family: var(--mono); font-size: 0.72rem;
  color: var(--accent); font-variant-numeric: tabular-nums; min-width: 2.5rem; text-align: right;
}

.crl__cat { display: flex; flex-direction: column; gap: 0.4rem; }
.crl__cat-title {
  margin: 0;
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.crl__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.crl__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.6rem; align-items: center;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.65rem;
  transition: all 0.12s;
}
.crl__row--selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.crl__row--playing { border-color: var(--accent); }

.crl__play {
  width: 2.2rem; height: 2.2rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.85rem;
  color: var(--accent); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.crl__play:hover { background: var(--accent); color: var(--paper); border-color: var(--accent); }
.crl__row--playing .crl__play {
  background: var(--accent); color: var(--paper); border-color: var(--accent);
  animation: crl-pulse 1s ease-in-out infinite;
}
@keyframes crl-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent); }
  50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 0%, transparent); }
}

.crl__body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.crl__name { font-weight: 600; font-size: 0.88rem; }
.crl__meta {
  display: inline-flex; gap: 0.35rem; flex-wrap: wrap; align-items: center;
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.crl__sep { opacity: 0.5; }
.crl__wave { color: var(--accent); }

.crl__tools { display: inline-flex; gap: 0.3rem; }
.crl__btn {
  background: transparent; border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.55rem; font-family: var(--mono); font-size: 0.6rem;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
  cursor: pointer; transition: all 0.12s;
}
.crl__btn:hover { color: var(--ink); border-color: var(--ink); }
.crl__btn--on { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.crl__btn--danger { font-size: 0.9rem; line-height: 1; padding: 0.1rem 0.5rem; }
.crl__btn--danger:hover { color: var(--danger); border-color: var(--danger); }

.crl__upload {
  display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;
  background: var(--paper-deep); border: 1px dashed var(--rule); border-radius: 2px;
  padding: 0.7rem 0.85rem;
}
.crl__upload-head { display: flex; flex-direction: column; gap: 0.15rem; }
.crl__upload-title { font-family: var(--mono); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.crl__upload-hint { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); }
.crl__upload-btn {
  background: var(--ink); color: var(--paper); border: 0; border-radius: 2px;
  padding: 0.5rem 0.9rem; font-family: var(--mono); font-size: 0.68rem;
  letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
}
.crl__upload-btn:hover { background: var(--accent); }
</style>
