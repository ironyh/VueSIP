<template>
  <div class="cpn">
    <header class="cpn__head">
      <div>
        <span class="cpn__eyebrow">SDP negotiation log · last 5 calls</span>
        <h3 class="cpn__title">{{ calls.length }} recorded · {{ opusCount }} picked Opus</h3>
      </div>
    </header>

    <ul class="cpn__list" role="list">
      <li v-for="c in calls" :key="c.id" class="cpn__row" @click="open = open === c.id ? null : c.id">
        <span class="cpn__time">{{ c.time }}</span>
        <span class="cpn__dir" :class="`cpn__dir--${c.dir}`">{{ c.dir }}</span>
        <span class="cpn__peer">{{ c.peer }}</span>
        <span class="cpn__chosen">
          <span class="cpn__codec">{{ c.chosen }}</span>
          <span class="cpn__meta">{{ c.rate }} Hz</span>
        </span>
        <span class="cpn__toggle" :aria-expanded="open === c.id">{{ open === c.id ? '−' : '+' }}</span>

        <div v-if="open === c.id" class="cpn__detail">
          <div class="cpn__sdp">
            <span class="cpn__sdp-title">Offer (local)</span>
            <pre class="cpn__pre">{{ c.offer }}</pre>
          </div>
          <div class="cpn__sdp">
            <span class="cpn__sdp-title">Answer (remote)</span>
            <pre class="cpn__pre">{{ c.answer }}</pre>
          </div>
        </div>
      </li>
    </ul>

    <footer class="cpn__foot">
      <span>Negotiation is a left-to-right intersection. If your side offers <code>opus,g722,ulaw</code> and peer offers <code>g711,alaw,ulaw</code>, you get <code>ulaw</code> — the highest common denominator, not the theoretical best.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Call {
  id: string
  time: string
  dir: 'in' | 'out'
  peer: string
  chosen: string
  rate: number
  offer: string
  answer: string
}

const calls: Call[] = [
  {
    id: 'c-501',
    time: '14:02:11',
    dir: 'in',
    peer: 'sip:alex@example.com',
    chosen: 'opus',
    rate: 48000,
    offer: 'm=audio 10004 UDP/TLS/RTP/SAVPF 111 103 9 0 8\na=rtpmap:111 opus/48000/2\na=rtpmap:103 ISAC/16000\na=rtpmap:9 G722/8000\na=rtpmap:0 PCMU/8000\na=rtpmap:8 PCMA/8000',
    answer: 'm=audio 12034 UDP/TLS/RTP/SAVPF 111 9 0\na=rtpmap:111 opus/48000/2\na=rtpmap:9 G722/8000\na=rtpmap:0 PCMU/8000',
  },
  {
    id: 'c-500',
    time: '13:48:22',
    dir: 'out',
    peer: '+14155550100 (PSTN via Bandwidth)',
    chosen: 'ulaw',
    rate: 8000,
    offer: 'm=audio 10006 RTP/AVP 111 9 0 8 101\na=rtpmap:111 opus/48000/2\na=rtpmap:9 G722/8000\na=rtpmap:0 PCMU/8000\na=rtpmap:8 PCMA/8000\na=rtpmap:101 telephone-event/8000',
    answer: 'm=audio 24880 RTP/AVP 0 101\na=rtpmap:0 PCMU/8000\na=rtpmap:101 telephone-event/8000',
  },
  {
    id: 'c-499',
    time: '13:24:51',
    dir: 'out',
    peer: '+442079460344 (UK · Twilio)',
    chosen: 'ulaw',
    rate: 8000,
    offer: 'm=audio 10008 RTP/AVP 111 9 0 8\na=rtpmap:111 opus/48000/2\na=rtpmap:0 PCMU/8000',
    answer: 'm=audio 19304 RTP/AVP 0\na=rtpmap:0 PCMU/8000',
  },
  {
    id: 'c-498',
    time: '12:58:03',
    dir: 'in',
    peer: 'sip:priya@example.com',
    chosen: 'opus',
    rate: 48000,
    offer: 'm=audio 10010 UDP/TLS/RTP/SAVPF 111 9 0\na=rtpmap:111 opus/48000/2',
    answer: 'm=audio 14022 UDP/TLS/RTP/SAVPF 111\na=rtpmap:111 opus/48000/2',
  },
  {
    id: 'c-497',
    time: '12:12:44',
    dir: 'in',
    peer: 'Polycom VVX 450 (sip:2104@example.com)',
    chosen: 'g722',
    rate: 16000,
    offer: 'm=audio 10012 RTP/AVP 9 0 8\na=rtpmap:9 G722/8000\na=rtpmap:0 PCMU/8000',
    answer: 'm=audio 26018 RTP/AVP 9 0\na=rtpmap:9 G722/8000\na=rtpmap:0 PCMU/8000',
  },
]

const open = ref<string | null>('c-500')
const opusCount = computed(() => calls.filter(c => c.chosen === 'opus').length)
</script>

<style scoped>
.cpn {
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

.cpn__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.cpn__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.cpn__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.cpn__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.cpn__row {
  display: grid;
  grid-template-columns: 6rem 3rem 1fr 8rem 1.5rem;
  gap: 0.55rem; align-items: center;
  padding: 0.5rem 0.7rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  cursor: pointer;
}
.cpn__row:hover { border-color: color-mix(in srgb, var(--accent) 35%, var(--rule)); }

.cpn__time { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.cpn__dir {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 0.15rem 0.35rem; border-radius: 2px; text-align: center;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.cpn__dir--in { color: #15803d; border-color: #15803d; }
.cpn__dir--out { color: var(--accent); border-color: var(--accent); }
.cpn__peer { font-family: var(--mono); font-size: 0.78rem; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cpn__chosen { display: flex; flex-direction: column; gap: 0.1rem; text-align: right; }
.cpn__codec {
  font-family: var(--mono); font-weight: 700; font-size: 0.84rem; color: var(--accent);
  letter-spacing: 0.04em;
}
.cpn__meta { font-family: var(--mono); font-size: 0.64rem; color: var(--muted); }

.cpn__toggle {
  font-family: var(--mono); font-size: 1rem; font-weight: 700;
  color: var(--muted); text-align: center;
}

.cpn__detail {
  grid-column: 1 / -1;
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem;
  padding-top: 0.55rem; margin-top: 0.35rem;
  border-top: 1px dashed var(--rule);
}
@media (max-width: 700px) { .cpn__detail { grid-template-columns: 1fr; } }
.cpn__sdp { display: flex; flex-direction: column; gap: 0.25rem; }
.cpn__sdp-title {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.cpn__pre {
  margin: 0;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.7rem;
  font-family: var(--mono); font-size: 0.7rem; line-height: 1.5; color: var(--ink);
  overflow-x: auto;
  white-space: pre;
}

.cpn__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.cpn__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
