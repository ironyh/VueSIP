<template>
  <div class="ns">
    <header class="ns__head">
      <div>
        <span class="ns__eyebrow">Scenario runner</span>
        <h3 class="ns__title">{{ active ? active.label : 'No simulation' }}</h3>
      </div>
      <button
        type="button"
        class="ns__stop"
        :disabled="!active"
        @click="active = null"
        :aria-disabled="!active"
      >
        Stop
      </button>
    </header>

    <ul class="ns__list" role="radiogroup" aria-label="Network scenario">
      <li v-for="s in scenarios" :key="s.id">
        <button
          type="button"
          class="ns__card"
          :class="{ 'ns__card--on': active?.id === s.id }"
          role="radio"
          :aria-checked="active?.id === s.id"
          @click="active = s"
        >
          <span class="ns__card-title">{{ s.label }}</span>
          <span class="ns__card-desc">{{ s.desc }}</span>
          <dl class="ns__kv">
            <template v-for="(v, k) in s.impair" :key="k">
              <dt>{{ k }}</dt>
              <dd>{{ v }}</dd>
            </template>
          </dl>
        </button>
      </li>
    </ul>

    <section v-if="active" class="ns__effect">
      <span class="ns__section-title">Expected effect</span>
      <p class="ns__p">{{ active.effect }}</p>
    </section>

    <footer class="ns__foot">
      <span
        >Applied via <code>chrome://inspect</code> throttling, a local proxy (e.g.
        <code>comcast</code>), or TURN-side impairment. The browser itself does not expose
        impairment APIs.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Scenario {
  id: string
  label: string
  desc: string
  impair: Record<string, string>
  effect: string
}

const scenarios: Scenario[] = [
  {
    id: 'perfect',
    label: 'Perfect LAN',
    desc: 'Gigabit ethernet, same subnet.',
    impair: { latency: '2 ms', jitter: '0 ms', loss: '0 %', bandwidth: '1 Gbps' },
    effect: 'Baseline. Use this to rule out network before blaming anything else.',
  },
  {
    id: 'home-wifi',
    label: 'Home Wi-Fi',
    desc: 'Typical residential 5 GHz.',
    impair: { latency: '25 ms', jitter: '6 ms', loss: '0.2 %', bandwidth: '50 Mbps' },
    effect: 'MOS 4.2 · Opus holds up fine, G.722 fine, H.264 720p stable.',
  },
  {
    id: '4g',
    label: '4G mobile',
    desc: 'Median LTE, mid-city.',
    impair: { latency: '80 ms', jitter: '25 ms', loss: '1.2 %', bandwidth: '12 Mbps' },
    effect: 'MOS 3.8 · noticeable jitter buffer growth, video may drop to 480p simulcast layer.',
  },
  {
    id: '3g',
    label: '3G throttled',
    desc: 'Crowded stadium or old carrier.',
    impair: { latency: '200 ms', jitter: '80 ms', loss: '3 %', bandwidth: '1.5 Mbps' },
    effect: 'MOS 2.9 · one-way audio risk, video basically unusable — fall back to audio-only.',
  },
  {
    id: 'satellite',
    label: 'Satellite / VSAT',
    desc: 'Geostationary link, high RTT.',
    impair: { latency: '600 ms', jitter: '15 ms', loss: '0.5 %', bandwidth: '8 Mbps' },
    effect:
      'Audio quality OK, but talk-over collisions increase dramatically — users will constantly interrupt each other.',
  },
  {
    id: 'lossy',
    label: 'Lossy uplink',
    desc: 'Bad Ethernet cable / crowded AP.',
    impair: { latency: '30 ms', jitter: '10 ms', loss: '5 %', bandwidth: '20 Mbps' },
    effect:
      'MOS 2.5 · Opus packet-loss concealment struggles; expect robotic audio and FEC bursts.',
  },
]

const active = ref<Scenario | null>(null)
</script>

<style scoped>
.ns {
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
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.ns__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.ns__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.ns__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.ns__stop {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.ns__stop:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ns__stop:not(:disabled):hover {
  color: #b91c1c;
  border-color: #b91c1c;
}

.ns__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.45rem;
}
.ns__card {
  width: 100%;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-align: left;
  font-family: var(--sans);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.12s;
}
.ns__card:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.ns__card--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.ns__card-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.ns__card-desc {
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
}

.ns__kv {
  margin: 0.25rem 0 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.1rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.7rem;
}
.ns__kv dt {
  color: var(--muted);
}
.ns__kv dd {
  margin: 0;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.ns__effect {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.ns__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.ns__p {
  margin: 0;
  padding: 0.7rem 0.85rem;
  background: color-mix(in srgb, var(--accent) 6%, var(--paper));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--rule));
  border-radius: 2px;
  font-size: 0.86rem;
  line-height: 1.5;
}

.ns__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.ns__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
