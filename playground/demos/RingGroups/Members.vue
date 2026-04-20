<template>
  <div class="rgm">
    <header class="rgm__head">
      <div>
        <span class="rgm__eyebrow">Ring group {{ group.ext }}</span>
        <h3 class="rgm__title">{{ group.name }} · {{ reachable }} / {{ agents.length }} reachable</h3>
      </div>
      <div class="rgm__strat" role="radiogroup" aria-label="Ring strategy">
        <button
          v-for="s in strategies"
          :key="s.id"
          type="button"
          class="rgm__s"
          :class="{ 'rgm__s--on': group.strategy === s.id }"
          role="radio"
          :aria-checked="group.strategy === s.id"
          @click="group.strategy = s.id"
        >
          <span class="rgm__s-name">{{ s.label }}</span>
          <span class="rgm__s-desc">{{ s.desc }}</span>
        </button>
      </div>
    </header>

    <ul class="rgm__agents" role="list">
      <li
        v-for="a in agents"
        :key="a.ext"
        class="rgm__agent"
        :class="{ 'rgm__agent--off': a.status !== 'available' }"
      >
        <span class="rgm__dot" :class="`rgm__dot--${a.status}`" aria-hidden="true" />
        <code class="rgm__ext">{{ a.ext }}</code>
        <div class="rgm__meta">
          <span class="rgm__name">{{ a.name }}</span>
          <span class="rgm__status">{{ a.status }} · {{ a.device }}</span>
        </div>
        <span class="rgm__order" v-if="group.strategy === 'hunt'">Position {{ a.position }}</span>
        <label class="rgm__switch">
          <input type="checkbox" v-model="a.enabled" />
          <span>{{ a.enabled ? 'In rotation' : 'Paused' }}</span>
        </label>
      </li>
    </ul>

    <footer class="rgm__foot">
      <span>In Asterisk terms: <code>Queue({{ group.ext }},,,,30)</code> or <code>Dial(PJSIP/a&amp;PJSIP/b&amp;PJSIP/c,30)</code> for ringall. Strategy maps to queue `strategy=` or to the ampersand list.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

type Strategy = 'ringall' | 'hunt' | 'random' | 'least-recent'
type Status = 'available' | 'busy' | 'dnd' | 'offline'

const strategies: Array<{ id: Strategy; label: string; desc: string }> = [
  { id: 'ringall',      label: 'Ring all',      desc: 'All phones ring simultaneously. Fastest pickup, loudest office.' },
  { id: 'hunt',         label: 'Hunt',          desc: 'Try in order; next on timeout. Classic receptionist escalation.' },
  { id: 'random',       label: 'Random',        desc: 'Shuffle on each call. Simple fairness without fairness math.' },
  { id: 'least-recent', label: 'Least-recent',  desc: 'Oldest-idle agent first. Proper fairness for busy groups.' },
]

const group = reactive({
  ext: '601',
  name: 'Support · West',
  strategy: 'hunt' as Strategy,
})

interface Agent { ext: string; name: string; device: string; status: Status; enabled: boolean; position: number }

const agents = reactive<Agent[]>([
  { ext: '2101', name: 'Alex Rivera',  device: 'PJSIP/desktop', status: 'available', enabled: true,  position: 1 },
  { ext: '2102', name: 'Priya Shah',   device: 'PJSIP/mobile',  status: 'available', enabled: true,  position: 2 },
  { ext: '2103', name: 'Jordan Lee',   device: 'PJSIP/desktop', status: 'busy',      enabled: true,  position: 3 },
  { ext: '2104', name: 'Meera Kapoor', device: 'PJSIP/webrtc',  status: 'dnd',       enabled: false, position: 4 },
  { ext: '2105', name: 'Tom Andresen', device: 'PJSIP/desktop', status: 'available', enabled: true,  position: 5 },
  { ext: '2106', name: 'Sofía García', device: 'PJSIP/mobile',  status: 'offline',   enabled: true,  position: 6 },
])

const reachable = computed(() => agents.filter((a) => a.enabled && a.status === 'available').length)
</script>

<style scoped>
.rgm {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.85rem;
  color: var(--ink); font-family: var(--sans);
}

.rgm__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap; }
.rgm__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.rgm__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.rgm__strat {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.3rem;
  width: 100%;
}
.rgm__s {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.7rem;
  display: flex; flex-direction: column; gap: 0.2rem;
  font-family: var(--sans); color: var(--ink); cursor: pointer; text-align: left;
  transition: all 0.12s;
}
.rgm__s:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.rgm__s--on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, transparent); }
.rgm__s-name { font-weight: 600; font-size: 0.88rem; }
.rgm__s-desc { font-family: var(--mono); font-size: 0.64rem; color: var(--muted); }

.rgm__agents { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.rgm__agent {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.8rem;
  display: grid;
  grid-template-columns: auto 4.5rem 1fr auto auto;
  gap: 0.6rem;
  align-items: center;
  transition: opacity 0.12s;
}
.rgm__agent--off { opacity: 0.55; }

.rgm__dot { width: 10px; height: 10px; border-radius: 50%; }
.rgm__dot--available { background: #15803d; }
.rgm__dot--busy { background: #d97706; }
.rgm__dot--dnd { background: #b91c1c; }
.rgm__dot--offline { background: var(--muted); }

.rgm__ext {
  font-family: var(--mono); font-size: 0.82rem; font-weight: 700; color: var(--accent);
}
.rgm__meta { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.rgm__name { font-size: 0.88rem; font-weight: 500; }
.rgm__status {
  font-family: var(--mono); font-size: 0.64rem; color: var(--muted);
  letter-spacing: 0.05em;
}
.rgm__order {
  font-family: var(--mono); font-size: 0.62rem;
  padding: 0.15rem 0.4rem; background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  color: var(--muted); letter-spacing: 0.06em;
}
.rgm__switch {
  display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer;
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
}
.rgm__switch input { accent-color: var(--accent); }

.rgm__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.rgm__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
