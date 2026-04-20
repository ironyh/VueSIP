<template>
  <div class="cbs">
    <header class="cbs__head">
      <div>
        <span class="cbs__eyebrow">Bridge {{ bridge.id }}</span>
        <h3 class="cbs__title">{{ bridge.name }} · {{ bridge.members }} / {{ bridge.max }}</h3>
      </div>
      <button
        type="button"
        class="cbs__lock"
        :class="{ 'cbs__lock--on': bridge.locked }"
        :aria-pressed="bridge.locked"
        @click="bridge.locked = !bridge.locked"
      >
        {{ bridge.locked ? 'Locked' : 'Lock bridge' }}
      </button>
    </header>

    <section class="cbs__section">
      <span class="cbs__section-title">PIN access</span>
      <div class="cbs__row">
        <label class="cbs__field">
          <span class="cbs__label">User PIN</span>
          <input type="text" v-model="bridge.userPin" maxlength="8" class="cbs__input" inputmode="numeric" />
        </label>
        <label class="cbs__field">
          <span class="cbs__label">Admin PIN</span>
          <input type="text" v-model="bridge.adminPin" maxlength="8" class="cbs__input" inputmode="numeric" />
        </label>
      </div>
    </section>

    <section class="cbs__section">
      <span class="cbs__section-title">Capacity &amp; recording</span>
      <div class="cbs__row">
        <label class="cbs__field">
          <span class="cbs__label">Max members</span>
          <input type="number" v-model.number="bridge.max" min="2" max="500" class="cbs__input" />
        </label>
        <label class="cbs__field">
          <span class="cbs__label">Record path</span>
          <input type="text" v-model="bridge.recordPath" class="cbs__input" :disabled="!bridge.record" />
        </label>
      </div>
    </section>

    <section class="cbs__section">
      <span class="cbs__section-title">Behaviour</span>
      <ul class="cbs__toggles" role="list">
        <li v-for="t in toggles" :key="t.key" class="cbs__toggle">
          <label>
            <input type="checkbox" v-model="bridge[t.key]" />
            <span class="cbs__toggle-name">{{ t.label }}</span>
            <span class="cbs__toggle-hint">{{ t.hint }}</span>
          </label>
        </li>
      </ul>
    </section>

    <footer class="cbs__foot">
      <span>Effective on next <code>ConfBridge()</code> entry — existing members keep their current profile.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

interface Bridge {
  id: string
  name: string
  members: number
  max: number
  locked: boolean
  userPin: string
  adminPin: string
  record: boolean
  recordPath: string
  mutedOnJoin: boolean
  announceJoin: boolean
  waitForAdmin: boolean
  endMarked: boolean
  [k: string]: string | number | boolean
}

const bridge = reactive<Bridge>({
  id: '1000',
  name: 'Weekly ops sync',
  members: 7,
  max: 25,
  locked: false,
  userPin: '4821',
  adminPin: '9103',
  record: true,
  recordPath: '/var/spool/asterisk/monitor/conf-1000.wav',
  mutedOnJoin: false,
  announceJoin: true,
  waitForAdmin: true,
  endMarked: true,
})

const toggles: Array<{ key: keyof Bridge; label: string; hint: string }> = [
  { key: 'mutedOnJoin', label: 'Muted on join', hint: 'New users arrive muted; admins unmute.' },
  { key: 'announceJoin', label: 'Announce join/leave', hint: 'Plays "name has joined" on entry.' },
  { key: 'waitForAdmin', label: 'Wait for admin', hint: 'Plays MOH until a marked user arrives.' },
  { key: 'endMarked', label: 'End when marked leaves', hint: 'Bridge closes when all admins disconnect.' },
  { key: 'record', label: 'Record conference', hint: 'MixMonitor written to the path above.' },
]
</script>

<style scoped>
.cbs {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.9rem;
  color: var(--ink); font-family: var(--sans);
}

.cbs__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.cbs__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.cbs__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.cbs__lock {
  background: transparent; border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.85rem;
  font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); cursor: pointer; transition: all 0.12s;
}
.cbs__lock:hover { color: var(--ink); border-color: var(--ink); }
.cbs__lock--on {
  color: var(--paper); background: var(--accent); border-color: var(--accent);
}

.cbs__section { display: flex; flex-direction: column; gap: 0.45rem; }
.cbs__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cbs__row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
@media (max-width: 620px) { .cbs__row { grid-template-columns: 1fr; } }

.cbs__field { display: flex; flex-direction: column; gap: 0.25rem; }
.cbs__label {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cbs__input {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.6rem;
  font-family: var(--mono); font-size: 0.85rem; color: var(--ink);
}
.cbs__input:focus { outline: none; border-color: var(--accent); }
.cbs__input:disabled { opacity: 0.5; }

.cbs__toggles { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.cbs__toggle {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.8rem;
}
.cbs__toggle label {
  display: grid; grid-template-columns: auto 1fr; gap: 0.1rem 0.6rem;
  cursor: pointer; align-items: baseline;
}
.cbs__toggle input { accent-color: var(--accent); margin-top: 0.15rem; grid-row: 1 / 3; }
.cbs__toggle-name { font-weight: 600; font-size: 0.88rem; }
.cbs__toggle-hint {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
}

.cbs__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.cbs__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
