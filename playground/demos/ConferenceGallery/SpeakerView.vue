<template>
  <div class="cg">
    <header class="cg__head">
      <div>
        <span class="cg__eyebrow">Gallery · speaker mode</span>
        <h3 class="cg__title">{{ members.length }} participants · {{ activeName }}</h3>
      </div>
      <button
        type="button"
        class="cg__btn"
        @click="cycle"
        :aria-label="`Cycle active speaker — currently ${activeName}`"
      >
        Rotate speaker
      </button>
    </header>

    <div class="cg__stage">
      <div class="cg__main" :class="{ 'cg__main--talking': active.talking }">
        <div class="cg__main-tile" :style="{ background: active.tint }">
          <span class="cg__main-initials">{{ active.initials }}</span>
        </div>
        <div class="cg__main-meta">
          <span class="cg__main-name">{{ active.name }}</span>
          <span class="cg__main-sub">{{ active.uri }}</span>
          <span class="cg__levels" aria-label="Audio level">
            <span
              v-for="n in 12"
              :key="n"
              class="cg__level-bar"
              :class="{ 'cg__level-bar--on': active.level >= n }"
            ></span>
          </span>
        </div>
      </div>
    </div>

    <ul class="cg__strip" role="list">
      <li
        v-for="m in others"
        :key="m.id"
        class="cg__thumb"
        :class="{ 'cg__thumb--muted': m.muted, 'cg__thumb--talking': m.talking }"
      >
        <div class="cg__thumb-tile" :style="{ background: m.tint }">
          <span>{{ m.initials }}</span>
        </div>
        <span class="cg__thumb-name">{{ m.name }}</span>
        <span v-if="m.muted" class="cg__thumb-mute" aria-label="Muted">M</span>
      </li>
    </ul>

    <footer class="cg__foot">
      <span
        >Active speaker detection uses RTCP `voice-activity` extension — switch is debounced by 800
        ms to avoid cutting back-and-forth.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

interface Member {
  id: number
  name: string
  uri: string
  initials: string
  tint: string
  muted: boolean
  talking: boolean
  level: number
}

const members = ref<Member[]>([
  {
    id: 1,
    name: 'Alex Rivera',
    uri: 'sip:alex@example.com',
    initials: 'AR',
    tint: '#c2410c1a',
    muted: false,
    talking: true,
    level: 8,
  },
  {
    id: 2,
    name: 'Priya Shah',
    uri: 'sip:priya@example.com',
    initials: 'PS',
    tint: '#1a14101a',
    muted: false,
    talking: false,
    level: 2,
  },
  {
    id: 3,
    name: 'Jordan Lee',
    uri: 'sip:jordan@example.com',
    initials: 'JL',
    tint: '#6b5d4a1a',
    muted: true,
    talking: false,
    level: 0,
  },
  {
    id: 4,
    name: 'Meera Kapoor',
    uri: 'sip:meera@example.com',
    initials: 'MK',
    tint: '#8b45131a',
    muted: false,
    talking: false,
    level: 3,
  },
  {
    id: 5,
    name: 'Tom Andresen',
    uri: 'sip:tom@example.com',
    initials: 'TA',
    tint: '#4a55681a',
    muted: false,
    talking: false,
    level: 1,
  },
  {
    id: 6,
    name: 'Sofía García',
    uri: 'sip:sofia@example.com',
    initials: 'SG',
    tint: '#7b32911a',
    muted: true,
    talking: false,
    level: 0,
  },
])

const activeId = ref(1)
const active = computed(
  () => members.value.find((m) => m.id === activeId.value) || members.value[0]
)
const activeName = computed(() => active.value.name)
const others = computed(() => members.value.filter((m) => m.id !== activeId.value))

const cycle = () => {
  const idx = members.value.findIndex((m) => m.id === activeId.value)
  const next = members.value[(idx + 1) % members.value.length]
  members.value.forEach((m) => (m.talking = false))
  next.talking = true
  activeId.value = next.id
}

const interval = window.setInterval(() => {
  members.value.forEach((m) => {
    if (m.muted) {
      m.level = 0
      return
    }
    m.level = Math.max(0, Math.min(12, m.level + Math.floor(Math.random() * 5 - 2)))
  })
}, 500)
onBeforeUnmount(() => window.clearInterval(interval))
</script>

<style scoped>
.cg {
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

.cg__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.cg__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cg__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.cg__btn {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.cg__btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}

.cg__stage {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 1rem;
}
.cg__main {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}
.cg__main--talking .cg__main-tile {
  box-shadow: 0 0 0 3px var(--accent);
}

.cg__main-tile {
  width: 160px;
  height: 100px;
  border-radius: 2px;
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 2.1rem;
  font-weight: 700;
  color: var(--ink);
  transition: box-shadow 0.15s;
}
.cg__main-initials {
  letter-spacing: 0.08em;
}

.cg__main-meta {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.cg__main-name {
  font-size: 1.1rem;
  font-weight: 600;
}
.cg__main-sub {
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--muted);
}
.cg__levels {
  display: inline-flex;
  gap: 2px;
  margin-top: 0.2rem;
}
.cg__level-bar {
  width: 6px;
  height: 14px;
  background: var(--rule);
  border-radius: 1px;
}
.cg__level-bar--on {
  background: var(--accent);
}

.cg__strip {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.4rem;
}
.cg__thumb {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  position: relative;
  transition: border-color 0.12s;
}
.cg__thumb--talking {
  border-color: var(--accent);
}
.cg__thumb--muted {
  opacity: 0.55;
}
.cg__thumb-tile {
  width: 100%;
  height: 52px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
}
.cg__thumb-name {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.cg__thumb-mute {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
}

.cg__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.cg__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
