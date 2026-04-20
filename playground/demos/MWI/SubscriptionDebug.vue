<template>
  <div class="sub">
    <header class="sub__head">
      <div>
        <span class="sub__eyebrow">Subscription trace</span>
        <h3 class="sub__title">{{ subscriptions.length }} active subscriptions · {{ trace.length }} events captured</h3>
      </div>
      <div class="sub__actions">
        <button type="button" class="sub__btn" @click="clear">Clear</button>
        <button
          type="button"
          class="sub__btn sub__btn--primary"
          :class="{ 'sub__btn--recording': recording }"
          :aria-pressed="recording"
          @click="recording = !recording"
        >
          <span class="sub__btn-dot" aria-hidden="true" />
          {{ recording ? 'Pause capture' : 'Capture' }}
        </button>
      </div>
    </header>

    <section class="sub__subs">
      <span class="sub__subs-title">Monitored accounts</span>
      <ul class="sub__sub-list" role="list">
        <li v-for="s in subscriptions" :key="s.uri" class="sub__sub">
          <span class="sub__sub-state" :class="`sub__sub-state--${s.state}`">{{ s.state }}</span>
          <code class="sub__sub-uri">{{ s.uri }}</code>
          <span class="sub__sub-exp">expires {{ s.expiresIn }} s</span>
          <span class="sub__sub-dialog">dialog {{ s.dialogId }}</span>
        </li>
      </ul>
    </section>

    <section class="sub__trace">
      <div class="sub__trace-head">
        <span class="sub__trace-title">SIP trace</span>
        <div class="sub__filters">
          <label><input type="checkbox" v-model="showSubscribe" /> SUBSCRIBE</label>
          <label><input type="checkbox" v-model="showNotify" /> NOTIFY</label>
          <label><input type="checkbox" v-model="showResponses" /> 2xx responses</label>
        </div>
      </div>
      <div class="sub__trace-body">
        <div v-for="(ev, i) in filteredTrace" :key="i" class="sub__event" :class="`sub__event--${ev.direction}`">
          <div class="sub__event-head">
            <code class="sub__event-ts">{{ ev.ts }}</code>
            <span class="sub__event-dir">{{ ev.direction === 'out' ? '→' : '←' }}</span>
            <span class="sub__event-method" :class="`sub__event-method--${ev.method.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`">{{ ev.method }}</span>
            <code class="sub__event-uri">{{ ev.uri }}</code>
          </div>
          <pre class="sub__event-body"><code>{{ ev.body }}</code></pre>
        </div>
      </div>
    </section>

    <section class="sub__explain">
      <span class="sub__explain-title">Reading the trace</span>
      <dl class="sub__explain-list">
        <dt><code>SUBSCRIBE … Event: message-summary</code></dt>
        <dd>Client asks the registrar to notify it of mailbox changes. Refresh every <code>Expires</code> seconds or the subscription terminates.</dd>
        <dt><code>NOTIFY … application/simple-message-summary</code></dt>
        <dd>Server pushes the current mailbox state — message counts, urgent flag, account URI. Always idempotent, can be re-sent.</dd>
        <dt><code>Subscription-State: terminated;reason=noresource</code></dt>
        <dd>Mailbox deleted server-side. Client should stop re-SUBSCRIBEing and clear local state.</dd>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const recording = ref(true)

const subscriptions = ref([
  { uri: 'sip:priya@example.com', state: 'active' as const, expiresIn: 2847, dialogId: 'd-7f2e' },
  { uri: 'sip:sales@example.com', state: 'active' as const, expiresIn: 2912, dialogId: 'd-9a41' },
  { uri: 'sip:oncall@example.com', state: 'pending' as const, expiresIn: 12, dialogId: 'd-0c88' },
])

interface Event {
  ts: string
  direction: 'in' | 'out'
  method: string
  uri: string
  body: string
}

const trace = ref<Event[]>([
  {
    ts: '14:32:07.412',
    direction: 'out',
    method: 'SUBSCRIBE',
    uri: 'sip:priya@example.com',
    body: `SUBSCRIBE sip:priya@example.com SIP/2.0
Event: message-summary
Accept: application/simple-message-summary
Expires: 3600
From: <sip:priya@example.com>;tag=a7c2
To: <sip:priya@example.com>
Call-ID: d-7f2e@198.51.100.7
CSeq: 1 SUBSCRIBE
Contact: <sip:priya@198.51.100.7:5061;transport=wss>`,
  },
  {
    ts: '14:32:07.488',
    direction: 'in',
    method: '200 OK',
    uri: 'sip:priya@example.com',
    body: `SIP/2.0 200 OK
Expires: 3600
Subscription-State: active;expires=3600`,
  },
  {
    ts: '14:32:07.493',
    direction: 'in',
    method: 'NOTIFY',
    uri: 'sip:priya@example.com',
    body: `NOTIFY sip:priya@198.51.100.7:5061 SIP/2.0
Event: message-summary
Subscription-State: active;expires=3600
Content-Type: application/simple-message-summary

Messages-Waiting: yes
Message-Account: sip:priya@example.com
Voice-Message: 3/7 (1/0)`,
  },
  {
    ts: '14:35:22.017',
    direction: 'in',
    method: 'NOTIFY',
    uri: 'sip:priya@example.com',
    body: `NOTIFY sip:priya@198.51.100.7:5061 SIP/2.0
Event: message-summary
Subscription-State: active;expires=3428

Messages-Waiting: yes
Message-Account: sip:priya@example.com
Voice-Message: 2/8 (0/0)
(* message marked as read — urgent cleared *)`,
  },
  {
    ts: '14:41:04.221',
    direction: 'in',
    method: 'NOTIFY',
    uri: 'sip:oncall@example.com',
    body: `NOTIFY sip:priya@198.51.100.7:5061 SIP/2.0
Event: message-summary
Subscription-State: terminated;reason=noresource

(* mailbox was deleted server-side *)`,
  },
])

const showSubscribe = ref(true)
const showNotify = ref(true)
const showResponses = ref(true)
const filteredTrace = computed(() =>
  trace.value.filter((ev) => {
    if (!showSubscribe.value && ev.method.includes('SUBSCRIBE')) return false
    if (!showNotify.value && ev.method.includes('NOTIFY')) return false
    if (!showResponses.value && ev.method.match(/^[12345]\d\d /)) return false
    return true
  })
)

const clear = () => { trace.value = [] }
</script>

<style scoped>
.sub {
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

.sub__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.sub__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.sub__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.sub__actions { display: inline-flex; gap: 0.3rem; }
.sub__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
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
.sub__btn:hover { color: var(--ink); border-color: var(--ink); }
.sub__btn--primary { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.sub__btn-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--muted); }
.sub__btn--recording { background: var(--accent); border-color: var(--accent); }
.sub__btn--recording .sub__btn-dot { background: var(--paper); animation: sub-blink 1s steps(2, start) infinite; }
@keyframes sub-blink { 50% { opacity: 0.2; } }
@media (prefers-reduced-motion: reduce) { .sub__btn--recording .sub__btn-dot { animation: none; } }

.sub__subs { display: flex; flex-direction: column; gap: 0.4rem; }
.sub__subs-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.sub__sub-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.sub__sub {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 0.55rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
}
.sub__sub-state {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  border: 1px solid currentColor;
}
.sub__sub-state--active { color: #047857; background: color-mix(in srgb, #047857 8%, transparent); }
.sub__sub-state--pending { color: #b45309; background: color-mix(in srgb, #b45309 8%, transparent); }
.sub__sub-state--terminated { color: var(--muted); }
.sub__sub-uri { color: var(--ink); overflow: hidden; text-overflow: ellipsis; }
.sub__sub-exp, .sub__sub-dialog { color: var(--muted); font-size: 0.66rem; font-variant-numeric: tabular-nums; }

.sub__trace { display: flex; flex-direction: column; gap: 0.4rem; }
.sub__trace-head { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; }
.sub__trace-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.sub__filters { display: inline-flex; gap: 0.8rem; font-family: var(--mono); font-size: 0.7rem; color: var(--muted); }
.sub__filters label { display: inline-flex; align-items: center; gap: 0.3rem; cursor: pointer; }
.sub__filters input { accent-color: var(--accent); }

.sub__trace-body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 28rem;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.sub__event {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
}
.sub__event--out { border-left: 3px solid var(--accent); }
.sub__event--in { border-left: 3px solid var(--muted); }
.sub__event-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  background: color-mix(in srgb, var(--paper-deep) 60%, transparent);
  width: 100%;
  box-sizing: border-box;
  flex-wrap: wrap;
}
.sub__event-ts { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.sub__event-dir { font-family: var(--mono); font-weight: 700; color: var(--accent); }
.sub__event-method {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  background: var(--ink);
  color: var(--paper);
}
.sub__event-method--notify { background: var(--accent); }
.sub__event-method--200-ok { background: #047857; }
.sub__event-uri { font-family: var(--mono); font-size: 0.7rem; color: var(--ink); }
.sub__event-body {
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 0.68rem;
  line-height: 1.55;
  overflow: auto;
  white-space: pre;
}

.sub__explain {
  padding: 0.7rem 0.85rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--accent);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.sub__explain-title {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.sub__explain-list { margin: 0; display: grid; gap: 0.3rem 0.6rem; grid-template-columns: max-content 1fr; }
.sub__explain-list dt { font-family: var(--mono); font-size: 0.68rem; color: var(--accent); align-self: start; }
.sub__explain-list dt code { font-family: inherit; }
.sub__explain-list dd { margin: 0; font-size: 0.78rem; color: var(--ink); line-height: 1.45; }
.sub__explain-list dd code { font-family: var(--mono); font-size: 0.85em; background: var(--paper); border: 1px solid var(--rule); padding: 0.05rem 0.3rem; border-radius: 2px; }
</style>
