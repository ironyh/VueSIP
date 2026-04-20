<template>
  <div class="crt">
    <header class="crt__head">
      <div>
        <span class="crt__eyebrow">WebSocket transport</span>
        <h3 class="crt__title">State · {{ state.toUpperCase() }}</h3>
      </div>
      <div class="crt__ctrl">
        <button type="button" class="crt__btn" @click="drop" :disabled="state !== 'connected'">Drop link</button>
        <button type="button" class="crt__btn" @click="recover" :disabled="state === 'connected'">Force reconnect</button>
      </div>
    </header>

    <section class="crt__machine">
      <span class="crt__section-title">State machine</span>
      <ol class="crt__states" role="list">
        <li
          v-for="s in states"
          :key="s"
          class="crt__state"
          :class="{ 'crt__state--on': state === s, 'crt__state--past': past.includes(s) }"
        >
          <span class="crt__state-num">{{ s[0].toUpperCase() }}</span>
          <span class="crt__state-label">{{ s }}</span>
        </li>
      </ol>
    </section>

    <section class="crt__backoff">
      <span class="crt__section-title">Retry backoff</span>
      <div class="crt__bars">
        <div
          v-for="(ms, i) in backoff"
          :key="i"
          class="crt__bar"
          :class="{ 'crt__bar--active': i === attempt - 1 && state === 'retrying' }"
          :style="{ height: Math.min(100, ms / 100) + '%' }"
        >
          <span class="crt__bar-label">{{ ms }}ms</span>
        </div>
      </div>
      <p class="crt__note">Exponential with 50 ms jitter · cap at 30 s · resets on `onopen`.</p>
    </section>

    <ul class="crt__log" role="list">
      <li v-for="(l, i) in log" :key="i" class="crt__log-row">
        <span class="crt__stamp">{{ l.t }}</span>
        <span class="crt__ev">{{ l.msg }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

type State = 'idle' | 'connecting' | 'connected' | 'retrying' | 'failed'
const states: State[] = ['idle', 'connecting', 'connected', 'retrying', 'failed']

const state = ref<State>('connected')
const past = ref<State[]>(['idle', 'connecting', 'connected'])
const attempt = ref(0)
const log = ref<Array<{ t: string; msg: string }>>([
  { t: '00:00.00', msg: 'wss://pbx.example.com/ws — onopen' },
  { t: '00:00.12', msg: 'SIP REGISTER → 200 OK (q=1.0, expires=3600)' },
])

const backoff = [200, 400, 800, 1600, 3200, 6400, 12800]
let timer = 0

const now = () => {
  const d = new Date()
  return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${Math.floor(d.getMilliseconds() / 10).toString().padStart(2, '0')}`
}

const drop = () => {
  if (state.value !== 'connected') return
  past.value = [...past.value, state.value]
  state.value = 'retrying'
  attempt.value = 1
  log.value.push({ t: now(), msg: 'WebSocket onclose (1006, abnormal) — starting reconnect' })
  scheduleRetry()
}

const recover = () => {
  window.clearTimeout(timer)
  state.value = 'connecting'
  log.value.push({ t: now(), msg: 'Forcing reconnect…' })
  window.setTimeout(() => {
    state.value = 'connected'
    past.value = [...past.value, 'connected']
    attempt.value = 0
    log.value.push({ t: now(), msg: 'wss:// handshake · REGISTER re-sent on fresh CSeq' })
  }, 400)
}

const scheduleRetry = () => {
  const delay = backoff[Math.min(attempt.value - 1, backoff.length - 1)]
  log.value.push({ t: now(), msg: `Attempt ${attempt.value} scheduled in ${delay} ms` })
  timer = window.setTimeout(() => {
    if (attempt.value >= 3) {
      state.value = 'connected'
      attempt.value = 0
      log.value.push({ t: now(), msg: 'Connect succeeded · re-REGISTER on new CSeq' })
    } else {
      attempt.value += 1
      scheduleRetry()
    }
  }, 600)
}

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<style scoped>
.crt {
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

.crt__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.crt__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.crt__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.05em; }
.crt__ctrl { display: inline-flex; gap: 0.3rem; }
.crt__btn {
  background: transparent; border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.4rem 0.8rem;
  font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); cursor: pointer;
}
.crt__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.crt__btn:not(:disabled):hover { color: var(--ink); border-color: var(--accent); }

.crt__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
  display: block; margin-bottom: 0.4rem;
}

.crt__machine {}
.crt__states {
  list-style: none; padding: 0; margin: 0;
  display: flex; gap: 0.3rem; overflow-x: auto;
}
.crt__state {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.75rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
  min-width: 90px;
  opacity: 0.5;
  transition: all 0.15s;
}
.crt__state--past { opacity: 0.8; }
.crt__state--on {
  opacity: 1;
  background: color-mix(in srgb, var(--accent) 10%, var(--paper));
  border-color: var(--accent);
}
.crt__state-num {
  font-family: var(--mono); font-size: 0.95rem; font-weight: 700; color: var(--accent);
}
.crt__state-label {
  font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.08em; color: var(--muted);
}

.crt__backoff {}
.crt__bars {
  display: flex; gap: 0.35rem; align-items: flex-end;
  height: 72px;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem;
}
.crt__bar {
  flex: 1;
  background: var(--rule);
  border-radius: 2px;
  position: relative;
  min-height: 8%;
  transition: background 0.15s;
}
.crt__bar--active { background: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.crt__bar-label {
  position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
  font-family: var(--mono); font-size: 0.6rem; color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.crt__note { margin: 1.5rem 0 0; font-family: var(--mono); font-size: 0.7rem; color: var(--muted); }

.crt__log {
  list-style: none; padding: 0.55rem 0.75rem; margin: 0;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  display: flex; flex-direction: column; gap: 0.2rem;
  max-height: 180px; overflow-y: auto;
}
.crt__log-row { display: grid; grid-template-columns: 8ch 1fr; gap: 0.6rem; }
.crt__stamp { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.crt__ev { font-family: var(--mono); font-size: 0.75rem; color: var(--ink); }
</style>
