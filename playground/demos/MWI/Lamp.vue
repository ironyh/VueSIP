<template>
  <div class="mwi">
    <header class="mwi__head">
      <div>
        <span class="mwi__eyebrow">Message-summary indicator</span>
        <h3 class="mwi__title">
          <code>{{ mailbox }}</code> · <span>{{ totalNew }} new</span>
        </h3>
      </div>
      <button type="button" class="mwi__refresh" @click="refresh" aria-label="Re-subscribe">
        Re-subscribe
      </button>
    </header>

    <div class="mwi__stage">
      <div class="mwi__lamp-wrap">
        <div class="mwi__lamp" :class="{ 'mwi__lamp--on': lampOn, 'mwi__lamp--urgent': urgentNew > 0 }" aria-hidden="true">
          <span class="mwi__lamp-halo" />
          <span class="mwi__lamp-core" />
        </div>
        <span class="mwi__lamp-label">{{ lampOn ? 'LAMP ON' : 'LAMP OFF' }}</span>
      </div>
      <div class="mwi__counts">
        <div class="mwi__counter mwi__counter--new">
          <span class="mwi__counter-value">{{ totalNew }}</span>
          <span class="mwi__counter-label">New</span>
        </div>
        <div class="mwi__counter">
          <span class="mwi__counter-value">{{ totalOld }}</span>
          <span class="mwi__counter-label">Saved</span>
        </div>
        <div class="mwi__counter mwi__counter--urgent" v-if="urgentNew">
          <span class="mwi__counter-value">{{ urgentNew }}</span>
          <span class="mwi__counter-label">Urgent</span>
        </div>
      </div>
    </div>

    <section class="mwi__controls" aria-label="Simulate MWI change">
      <span class="mwi__controls-title">Simulate PBX NOTIFY</span>
      <div class="mwi__control-grid">
        <button type="button" class="mwi__sim" @click="simulate(1, 0, false)">+1 new</button>
        <button type="button" class="mwi__sim" @click="simulate(1, 0, true)">+1 urgent</button>
        <button type="button" class="mwi__sim" @click="simulate(-1, 1, false)">Mark read (−1 new, +1 saved)</button>
        <button type="button" class="mwi__sim mwi__sim--primary" @click="clear">Clear all (lamp off)</button>
      </div>
    </section>

    <section class="mwi__accounts">
      <span class="mwi__accounts-title">Monitored mailboxes</span>
      <ul class="mwi__account-list" role="list">
        <li v-for="a in accounts" :key="a.uri" class="mwi__account">
          <div class="mwi__account-lamp" :class="{ 'mwi__account-lamp--on': a.new > 0 }" aria-hidden="true" />
          <div class="mwi__account-body">
            <span class="mwi__account-name">{{ a.label }}</span>
            <code class="mwi__account-uri">{{ a.uri }}</code>
          </div>
          <span class="mwi__account-counts">
            <span class="mwi__account-new">{{ a.new }}</span>
            <span class="mwi__account-sep" aria-hidden="true">/</span>
            <span class="mwi__account-old">{{ a.old }}</span>
          </span>
        </li>
      </ul>
    </section>

    <section class="mwi__rfc">
      <span class="mwi__rfc-title">Spec reference</span>
      <dl class="mwi__rfc-list">
        <dt>RFC 3842</dt><dd>message-summary event package — carries the NOTIFY body</dd>
        <dt>RFC 3458</dt><dd>Messages-Waiting / Voice-Message / Urgent-Messages headers</dd>
        <dt>RFC 3265</dt><dd>SIP-specific event notification (SUBSCRIBE / NOTIFY mechanism)</dd>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const mailbox = 'sip:priya@example.com'
const totalNew = ref(3)
const totalOld = ref(7)
const urgentNew = ref(1)

const lampOn = computed(() => totalNew.value > 0)

const accounts = ref([
  { label: 'Priya Shah', uri: 'sip:priya@example.com', new: 3, old: 7 },
  { label: 'Sales team', uri: 'sip:sales@example.com', new: 0, old: 12 },
  { label: 'On-call', uri: 'sip:oncall@example.com', new: 2, old: 0 },
  { label: 'Alex Okafor', uri: 'sip:alex@example.com', new: 0, old: 4 },
])

const simulate = (dNew: number, dOld: number, urgent: boolean) => {
  totalNew.value = Math.max(0, totalNew.value + dNew)
  totalOld.value = Math.max(0, totalOld.value + dOld)
  if (urgent) urgentNew.value = Math.max(0, urgentNew.value + dNew)
  if (accounts.value[0]) {
    accounts.value[0].new = totalNew.value
    accounts.value[0].old = totalOld.value
  }
}
const clear = () => {
  totalNew.value = 0
  totalOld.value = 0
  urgentNew.value = 0
  if (accounts.value[0]) {
    accounts.value[0].new = 0
    accounts.value[0].old = 0
  }
}
const refresh = () => {
  console.log('re-subscribe', mailbox)
}
</script>

<style scoped>
.mwi {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --urgent: #b91c1c;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}

.mwi__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.mwi__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.mwi__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; display: inline-flex; gap: 0.4rem; align-items: baseline; font-variant-numeric: tabular-nums; }
.mwi__title code { font-family: var(--mono); font-size: 0.88rem; color: var(--accent); }

.mwi__refresh {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.mwi__refresh:hover { color: var(--accent); border-color: var(--accent); }

.mwi__stage {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.5rem;
  align-items: center;
  padding: 1.2rem 1.3rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}

.mwi__lamp-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.mwi__lamp {
  position: relative;
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 50%;
  background: var(--paper-deep);
  border: 2px solid var(--rule);
  transition: all 0.2s;
}
.mwi__lamp-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  background: var(--muted);
  opacity: 0.3;
  transition: background 0.2s, opacity 0.2s, box-shadow 0.2s;
}
.mwi__lamp-halo {
  position: absolute;
  inset: -0.5rem;
  border-radius: 50%;
  background: transparent;
  pointer-events: none;
}
.mwi__lamp--on { border-color: var(--accent); }
.mwi__lamp--on .mwi__lamp-core {
  background: var(--accent);
  opacity: 1;
  box-shadow: 0 0 1.4rem 0.3rem color-mix(in srgb, var(--accent) 45%, transparent);
  animation: mwi-pulse 1.6s ease-in-out infinite;
}
.mwi__lamp--urgent { border-color: var(--urgent); }
.mwi__lamp--urgent .mwi__lamp-core { background: var(--urgent); box-shadow: 0 0 1.4rem 0.3rem color-mix(in srgb, var(--urgent) 45%, transparent); }

@keyframes mwi-pulse {
  50% { box-shadow: 0 0 2rem 0.5rem color-mix(in srgb, var(--accent) 25%, transparent); }
}
@media (prefers-reduced-motion: reduce) { .mwi__lamp--on .mwi__lamp-core { animation: none; } }

.mwi__lamp-label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.mwi__lamp--on + .mwi__lamp-label { color: var(--accent); }

.mwi__counts { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.mwi__counter {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  padding: 0.55rem 0.85rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  min-width: 4.5rem;
}
.mwi__counter-value { font-family: var(--mono); font-size: 1.6rem; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; line-height: 1; }
.mwi__counter-label { font-family: var(--mono); font-size: 0.58rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.mwi__counter--new { border-left: 3px solid var(--accent); }
.mwi__counter--new .mwi__counter-value { color: var(--accent); }
.mwi__counter--urgent { border-left: 3px solid var(--urgent); }
.mwi__counter--urgent .mwi__counter-value { color: var(--urgent); }

.mwi__controls { display: flex; flex-direction: column; gap: 0.4rem; }
.mwi__controls-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.mwi__control-grid { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.mwi__sim {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.12s;
}
.mwi__sim:hover { border-color: var(--accent); color: var(--accent); }
.mwi__sim--primary { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.mwi__sim--primary:hover { background: var(--accent); border-color: var(--accent); color: var(--paper); }

.mwi__accounts { display: flex; flex-direction: column; gap: 0.4rem; }
.mwi__accounts-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.mwi__account-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.mwi__account {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.55rem;
  align-items: center;
  padding: 0.5rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.mwi__account-lamp { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--rule); }
.mwi__account-lamp--on { background: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.mwi__account-body { display: flex; flex-direction: column; gap: 0.05rem; min-width: 0; }
.mwi__account-name { font-size: 0.85rem; font-weight: 600; }
.mwi__account-uri { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mwi__account-counts { font-family: var(--mono); font-size: 0.76rem; font-variant-numeric: tabular-nums; }
.mwi__account-new { color: var(--accent); font-weight: 700; }
.mwi__account-sep { color: var(--muted); margin: 0 0.2rem; }
.mwi__account-old { color: var(--muted); }

.mwi__rfc {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.65rem 0.85rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.mwi__rfc-title {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.mwi__rfc-list { display: grid; grid-template-columns: max-content 1fr; gap: 0.2rem 0.7rem; margin: 0; }
.mwi__rfc-list dt { font-family: var(--mono); font-size: 0.74rem; font-weight: 700; color: var(--accent); }
.mwi__rfc-list dd { margin: 0; font-size: 0.76rem; color: var(--ink); }
</style>
