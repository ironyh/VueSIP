<template>
  <div class="spr">
    <header class="spr__head">
      <div>
        <span class="spr__eyebrow">Reconnect · {{ stateLabel }}</span>
        <h3 class="spr__title">{{ peer.name }} · call {{ peer.callId }}</h3>
      </div>
      <span class="spr__state" :class="`spr__state--${state}`">{{ state.toUpperCase() }}</span>
    </header>

    <div class="spr__timeline">
      <ol class="spr__steps" role="list">
        <li
          v-for="step in steps"
          :key="step.key"
          class="spr__step"
          :class="{
            'spr__step--done': indexOf(step.key) < currentIndex,
            'spr__step--on':   indexOf(step.key) === currentIndex,
          }"
        >
          <span class="spr__step-dot" />
          <div class="spr__step-body">
            <span class="spr__step-label">{{ step.label }}</span>
            <span class="spr__step-desc">{{ step.desc }}</span>
          </div>
          <span class="spr__step-time">{{ step.time }}</span>
        </li>
      </ol>
    </div>

    <section class="spr__grid">
      <div class="spr__kv">
        <dt>Stored call-id</dt>
        <dd>{{ peer.callId }}</dd>
      </div>
      <div class="spr__kv">
        <dt>CSeq on rehydrate</dt>
        <dd>{{ cseq }} (fresh)</dd>
      </div>
      <div class="spr__kv">
        <dt>Local DTLS fingerprint</dt>
        <dd>{{ fingerprint }}</dd>
      </div>
      <div class="spr__kv">
        <dt>Refresh interval</dt>
        <dd>SE = 1800s · UAC refresher</dd>
      </div>
    </section>

    <section class="spr__controls">
      <button type="button" class="spr__btn" @click="simulate">Simulate tab reload</button>
      <button type="button" class="spr__btn" @click="reset">Reset</button>
      <span class="spr__hint">Uses <code>sessionStorage</code> for the call dialog snapshot; <code>localStorage</code> for preferences.</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const peer = { name: 'Priya Patel', callId: 'b8a7c9…' }

const steps = [
  { key: 'dehydrate', label: 'Dehydrate',            desc: 'Call dialog snapshot written to sessionStorage on `pagehide`.',         time: '−0.0s' },
  { key: 'reload',    label: 'Tab reload',           desc: 'JS heap lost; SIP peer connection closed.',                             time: '0.0s' },
  { key: 'rehydrate', label: 'Rehydrate',            desc: 'App boots, reads snapshot, restores Pinia store.',                      time: '0.3s' },
  { key: 'connect',   label: 'WebSocket reconnect',  desc: 'Transport up; no registrar interaction yet.',                           time: '0.8s' },
  { key: 'register',  label: 'REGISTER refresh',     desc: 'Fresh CSeq; auth via stored credentials; contact reuses instance-id.',  time: '1.1s' },
  { key: 'rehail',    label: 'Dialog re-hail',       desc: 'UPDATE or re-INVITE with existing `Call-ID`; remote stays on the line.', time: '1.6s' },
  { key: 'live',      label: 'Media re-established', desc: 'ICE restart finishes; RTP flows; UI restores controls.',                time: '2.2s' },
]
const order = steps.map(s => s.key)
const indexOf = (k: string) => order.indexOf(k)

const state = ref<'idle' | 'restoring' | 'live' | 'failed'>('idle')
const stateLabel = computed(() => state.value === 'idle' ? 'waiting for reload' : state.value)
const currentIndex = ref(-1)
const cseq = ref(1013)
const fingerprint = '7a:3f:c1:b2:99:04:5e:ab:…'

let timers: number[] = []
const simulate = () => {
  reset()
  state.value = 'restoring'
  steps.forEach((_, i) => {
    timers.push(window.setTimeout(() => {
      currentIndex.value = i
      if (i === steps.length - 1) state.value = 'live'
    }, i * 380))
  })
}
const reset = () => {
  timers.forEach(clearTimeout); timers = []
  currentIndex.value = -1
  state.value = 'idle'
}
onBeforeUnmount(reset)
</script>

<style scoped>
.spr {
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

.spr__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.spr__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.spr__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.spr__state {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.55rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.spr__state--restoring { color: var(--accent); border-color: var(--accent); }
.spr__state--live { color: #15803d; border-color: #15803d; }
.spr__state--failed { color: #b91c1c; border-color: #b91c1c; }

.spr__timeline {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem 0.8rem;
}
.spr__steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.spr__step {
  display: grid; grid-template-columns: 14px 1fr auto;
  gap: 0.5rem; align-items: flex-start;
  padding: 0.25rem 0;
  border-bottom: 1px dashed var(--rule);
  opacity: 0.45;
  transition: opacity 0.2s;
}
.spr__step:last-child { border-bottom: 0; }
.spr__step--done { opacity: 0.8; }
.spr__step--on { opacity: 1; }

.spr__step-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--rule); border: 1px solid var(--muted);
  margin-top: 4px;
}
.spr__step--done .spr__step-dot { background: #15803d; border-color: #15803d; }
.spr__step--on .spr__step-dot { background: var(--accent); border-color: var(--accent); }

.spr__step-body { display: flex; flex-direction: column; gap: 0.15rem; }
.spr__step-label { font-weight: 600; font-size: 0.88rem; }
.spr__step-desc { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); line-height: 1.4; }
.spr__step-time { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); font-variant-numeric: tabular-nums; }

.spr__grid {
  display: grid; gap: 0.4rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin: 0;
}
.spr__kv {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.7rem;
  display: flex; flex-direction: column; gap: 0.1rem;
}
.spr__kv dt {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.spr__kv dd {
  margin: 0;
  font-family: var(--mono); font-size: 0.82rem; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.spr__controls { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.spr__btn {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.9rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink); cursor: pointer;
}
.spr__btn:hover { border-color: var(--accent); color: var(--accent); }
.spr__hint {
  margin-left: auto;
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
}
.spr__hint code {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.25rem; color: var(--accent);
}
</style>
