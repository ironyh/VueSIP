<template>
  <div class="sca">
    <header class="sca__head">
      <div>
        <span class="sca__eyebrow">Shared Call Appearance</span>
        <h3 class="sca__title">{{ cfg.appearanceUri }}</h3>
      </div>
      <span class="sca__state" :class="{ 'sca__state--on': subscribed }">
        <span class="sca__dot" />
        {{ subscribed ? 'SUBSCRIBED' : 'IDLE' }}
      </span>
    </header>

    <section class="sca__section">
      <span class="sca__section-title">Appearance URI</span>
      <div class="sca__row">
        <label class="sca__field">
          <span class="sca__label">Shared URI</span>
          <input type="text" v-model="cfg.appearanceUri" class="sca__input" />
        </label>
        <label class="sca__field">
          <span class="sca__label">Appearance count</span>
          <input type="number" v-model.number="cfg.appearances" min="1" max="16" class="sca__input" />
        </label>
        <label class="sca__field">
          <span class="sca__label">Expires</span>
          <div class="sca__stepper">
            <input type="number" v-model.number="cfg.expires" min="60" step="60" class="sca__input" />
            <span class="sca__unit">sec</span>
          </div>
        </label>
      </div>
    </section>

    <section class="sca__section">
      <span class="sca__section-title">Options</span>
      <ul class="sca__opts" role="list">
        <li class="sca__opt">
          <label class="sca__opt-label">
            <input type="checkbox" v-model="cfg.dialogInfo" />
            <span>Subscribe to <code>dialog</code> events (RFC 4235)</span>
          </label>
          <span class="sca__opt-hint">Peers see ringing/confirmed/terminated state on each appearance.</span>
        </li>
        <li class="sca__opt">
          <label class="sca__opt-label">
            <input type="checkbox" v-model="cfg.bargeIn" />
            <span>Allow barge-in on confirmed appearances</span>
          </label>
          <span class="sca__opt-hint">
            Second phone can join an active call (<code>INVITE Replaces</code>); useful for executive-assistant setups.
          </span>
        </li>
        <li class="sca__opt">
          <label class="sca__opt-label">
            <input type="checkbox" v-model="cfg.privacy" />
            <span>Private hold (peers stay idle)</span>
          </label>
          <span class="sca__opt-hint">Hold is local; shared phones don't show the held appearance. Off by default.</span>
        </li>
      </ul>
    </section>

    <section class="sca__section">
      <span class="sca__section-title">Wire format</span>
      <pre class="sca__wire"><code>{{ wireFormat }}</code></pre>
    </section>

    <section class="sca__section">
      <span class="sca__section-title">Peer appearances</span>
      <ul class="sca__peers" role="list">
        <li
          v-for="p in peers"
          :key="p.id"
          class="sca__peer"
          :class="`sca__peer--${p.state}`"
        >
          <span class="sca__peer-n">{{ p.id }}</span>
          <div class="sca__peer-body">
            <span class="sca__peer-dev">{{ p.device }}</span>
            <span class="sca__peer-meta">{{ stateLabel(p.state) }}<span v-if="p.remote"> · {{ p.remote }}</span></span>
          </div>
          <span class="sca__peer-tag">{{ p.location }}</span>
        </li>
      </ul>
    </section>

    <footer class="sca__foot">
      <span>Subscribe expiry refreshes at 3/4 of the interval ({{ Math.round(cfg.expires * 0.75) }}s).</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

type PeerState = 'idle' | 'ringing' | 'confirmed' | 'held'

interface Peer {
  id: number
  device: string
  location: string
  state: PeerState
  remote?: string
}

const cfg = reactive({
  appearanceUri: 'sip:sales-group@pbx.example.com',
  appearances: 4,
  expires: 3600,
  dialogInfo: true,
  bargeIn: false,
  privacy: true,
})

const subscribed = ref(true)

const peers = ref<Peer[]>([
  { id: 1, device: 'Yealink T46U · Reception', location: 'Desk', state: 'confirmed', remote: 'sip:+14155551000' },
  { id: 2, device: 'Softphone · Sales-02', location: 'Remote', state: 'ringing', remote: 'sip:+442079462030' },
  { id: 3, device: 'Polycom VVX411 · Sales-03', location: 'Desk', state: 'held', remote: 'sip:+14155551111' },
  { id: 4, device: 'Grandstream GXP2170 · Sales-04', location: 'Desk', state: 'idle' },
])

const stateLabel = (s: PeerState) =>
  ({ idle: 'IDLE', ringing: 'RINGING', confirmed: 'TALKING', held: 'HELD' }[s])

const wireFormat = computed(() => `SUBSCRIBE ${cfg.appearanceUri} SIP/2.0
Event: dialog
Expires: ${cfg.expires}
Accept: application/dialog-info+xml
Subscription-State: active

— server pushes NOTIFY (RFC 4235) —

<?xml version="1.0"?>
<dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info"
             version="${Math.floor(Math.random() * 500)}"
             state="${subscribed.value ? 'partial' : 'full'}"
             entity="${cfg.appearanceUri}">
${peers.value
  .filter((p) => p.state !== 'idle')
  .map((p) => `  <dialog id="appearance-${p.id}" call-id="…" direction="${p.state === 'ringing' ? 'incoming' : 'outgoing'}">
    <state>${p.state}</state>
    <remote><identity>${p.remote}</identity></remote>
  </dialog>`)
  .join('\n')}
</dialog-info>`)
</script>

<style scoped>
.sca {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --ok: #047857;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}
.sca__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.sca__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.sca__title {
  margin: 0.1rem 0 0;
  font-family: var(--mono); font-size: 0.88rem; font-weight: 600; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sca__state {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.25rem 0.55rem; border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.62rem;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
}
.sca__dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.sca__state--on { color: var(--ok); border-color: var(--ok); background: color-mix(in srgb, var(--ok) 8%, transparent); }

.sca__section { display: flex; flex-direction: column; gap: 0.45rem; }
.sca__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.sca__row {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem;
}
.sca__field { display: flex; flex-direction: column; gap: 0.25rem; }
.sca__label {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.sca__input {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.44rem 0.6rem; font-family: var(--mono); font-size: 0.82rem; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.sca__input:focus { outline: none; border-color: var(--accent); }
.sca__stepper { display: inline-flex; align-items: center; gap: 0.4rem; }
.sca__unit {
  font-family: var(--mono); font-size: 0.66rem;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);
}

.sca__opts { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.sca__opt {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.75rem; display: flex; flex-direction: column; gap: 0.15rem;
}
.sca__opt-label {
  display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;
}
.sca__opt-label input { accent-color: var(--accent); }
.sca__opt-label code {
  padding: 0 0.3rem; background: var(--paper-deep); border: 1px solid var(--rule);
  border-radius: 2px; color: var(--accent); font-family: var(--mono); font-size: 0.8em;
}
.sca__opt-hint {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted); padding-left: 1.5rem;
}
.sca__opt-hint code {
  padding: 0 0.3rem; background: var(--paper-deep); border: 1px solid var(--rule);
  border-radius: 2px; color: var(--accent); font-family: var(--mono); font-size: 0.9em;
}

.sca__wire {
  margin: 0; padding: 0.7rem 0.85rem;
  background: var(--ink); color: var(--paper);
  border-radius: 2px; overflow: auto; max-height: 14rem;
}
.sca__wire code {
  font-family: var(--mono); font-size: 0.72rem; line-height: 1.5; letter-spacing: 0.02em;
  white-space: pre;
}

.sca__peers { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.sca__peer {
  display: grid; grid-template-columns: auto 1fr auto; gap: 0.7rem; align-items: center;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid var(--rule);
}
.sca__peer--confirmed { border-left-color: var(--ok); }
.sca__peer--ringing {
  border-left-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, var(--paper));
}
.sca__peer--held { border-left-color: var(--muted); }
.sca__peer-n {
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  color: var(--accent);
  padding: 0.25rem 0.45rem; background: var(--paper-deep);
  border: 1px solid var(--rule); border-radius: 2px;
}
.sca__peer-body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.sca__peer-dev { font-size: 0.88rem; font-weight: 600; }
.sca__peer-meta { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); }
.sca__peer-tag {
  font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 0.18rem 0.4rem;
  background: var(--paper-deep); border: 1px solid var(--rule);
  border-radius: 2px; color: var(--muted);
}

.sca__foot {
  padding: 0.5rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
</style>
