<template>
  <div class="ws">
    <header class="ws__head">
      <div>
        <span class="ws__eyebrow">RTCPeerConnection.getStats()</span>
        <h3 class="ws__title">{{ reports.length }} reports · {{ timestamp }}</h3>
      </div>
      <button type="button" class="ws__btn" @click="refresh" :aria-label="'Refresh stats'">
        ↻ Refresh
      </button>
    </header>

    <section v-for="g in groups" :key="g.id" class="ws__group">
      <header class="ws__group-head">
        <span class="ws__group-title">{{ g.title }}</span>
        <span class="ws__group-count">{{ g.rows.length }}</span>
      </header>
      <ul class="ws__rows" role="list">
        <li v-for="r in g.rows" :key="r.id" class="ws__row">
          <div class="ws__row-head">
            <code class="ws__id">{{ r.id }}</code>
            <span class="ws__kind">{{ r.type }}</span>
          </div>
          <dl class="ws__kv">
            <template v-for="(v, k) in r.fields" :key="k">
              <dt>{{ k }}</dt>
              <dd>{{ v }}</dd>
            </template>
          </dl>
        </li>
      </ul>
    </section>

    <footer class="ws__foot">
      <span
        >Every row here is one <code>RTCStatsReport</code> entry. The <code>type</code> string is
        the contract — program against it, not the id format.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Report {
  id: string
  type: string
  fields: Record<string, string | number>
}

const reports = ref<Report[]>([
  {
    id: 'IT01A',
    type: 'inbound-rtp',
    fields: {
      kind: 'audio',
      codec: 'opus/48000',
      jitter: 0.012,
      packetsReceived: 48_203,
      packetsLost: 14,
      bytesReceived: 1_842_110,
    },
  },
  {
    id: 'OT01A',
    type: 'outbound-rtp',
    fields: {
      kind: 'audio',
      codec: 'opus/48000',
      packetsSent: 48_140,
      bytesSent: 1_798_320,
      targetBitrate: 32_000,
    },
  },
  {
    id: 'RI01A',
    type: 'remote-inbound-rtp',
    fields: {
      kind: 'audio',
      jitter: 0.009,
      packetsLost: 9,
      roundTripTime: 0.098,
      fractionLost: 0.002,
    },
  },
  {
    id: 'CP01',
    type: 'candidate-pair',
    fields: {
      state: 'succeeded',
      nominated: 'true',
      bytesSent: 1_798_320,
      bytesReceived: 1_842_110,
      currentRoundTripTime: 0.088,
      localCandidateId: 'LC0',
      remoteCandidateId: 'RC0',
    },
  },
  {
    id: 'LC0',
    type: 'local-candidate',
    fields: {
      candidateType: 'relay',
      protocol: 'udp',
      address: '203.0.113.10',
      port: 51_442,
      networkType: 'wifi',
    },
  },
  {
    id: 'RC0',
    type: 'remote-candidate',
    fields: { candidateType: 'host', protocol: 'udp', address: '198.51.100.42', port: 56_820 },
  },
  {
    id: 'T01',
    type: 'transport',
    fields: {
      bytesSent: 1_798_320,
      bytesReceived: 1_842_110,
      dtlsState: 'connected',
      selectedCandidatePairId: 'CP01',
    },
  },
])

const timestamp = computed(() => new Date().toLocaleTimeString())

const groups = computed(() => {
  const byType: Record<string, Report[]> = {}
  reports.value.forEach((r) => {
    if (!byType[r.type]) byType[r.type] = []
    byType[r.type].push(r)
  })
  return [
    {
      id: 'media',
      title: 'Media flows',
      rows: [...(byType['inbound-rtp'] || []), ...(byType['outbound-rtp'] || [])],
    },
    { id: 'remote', title: 'Remote reports', rows: byType['remote-inbound-rtp'] || [] },
    {
      id: 'ice',
      title: 'ICE & transport',
      rows: [
        ...(byType['candidate-pair'] || []),
        ...(byType['local-candidate'] || []),
        ...(byType['remote-candidate'] || []),
        ...(byType['transport'] || []),
      ],
    },
  ].filter((g) => g.rows.length)
})

const refresh = () => {
  reports.value = reports.value.map((r) => ({
    ...r,
    fields: Object.fromEntries(
      Object.entries(r.fields).map(([k, v]) =>
        typeof v === 'number' && k !== 'port' && k !== 'state' && k !== 'nominated'
          ? [k, Math.round(v * (1 + (Math.random() - 0.5) * 0.04) * 1000) / 1000]
          : [k, v]
      )
    ),
  }))
}
</script>

<style scoped>
.ws {
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

.ws__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.ws__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.ws__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.ws__btn {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.75rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.ws__btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}

.ws__group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ws__group-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.ws__group-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.ws__group-count {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ws__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.ws__row {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.ws__row-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}
.ws__id {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.1rem 0.35rem;
}
.ws__kind {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.ws__kv {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.15rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.74rem;
}
.ws__kv dt {
  color: var(--muted);
}
.ws__kv dd {
  margin: 0;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ws__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.ws__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
