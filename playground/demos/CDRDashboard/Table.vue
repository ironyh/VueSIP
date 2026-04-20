<template>
  <div class="cdrt">
    <header class="cdrt__head">
      <div>
        <span class="cdrt__eyebrow">CDR · last 24 h</span>
        <h3 class="cdrt__title">{{ filtered.length }} / {{ rows.length }} rows · {{ totalMin }} min billed</h3>
      </div>
      <div class="cdrt__filters">
        <input type="search" v-model="query" placeholder="Search uri, number, disposition…" aria-label="Search CDR" class="cdrt__search" />
        <select v-model="dir" aria-label="Direction" class="cdrt__select">
          <option value="all">All directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
      </div>
    </header>

    <div class="cdrt__wrap">
      <table class="cdrt__table">
        <thead>
          <tr>
            <th>Start</th>
            <th>From</th>
            <th>To</th>
            <th>Dur</th>
            <th>Disp</th>
            <th class="cdrt__num">Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.id" :class="`cdrt__row cdrt__row--${r.disp}`">
            <td class="cdrt__ts">{{ r.t }}</td>
            <td>
              <code class="cdrt__uri">{{ r.from }}</code>
              <span class="cdrt__arrow">{{ r.dir === 'inbound' ? '←' : '→' }}</span>
            </td>
            <td><code class="cdrt__uri">{{ r.to }}</code></td>
            <td class="cdrt__num">{{ fmtDur(r.duration) }}</td>
            <td><span class="cdrt__disp">{{ r.disp }}</span></td>
            <td class="cdrt__num cdrt__cost">{{ r.cost.toFixed(4) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="cdrt__foot">
      <span>Source: Asterisk `cdr_csv` → Postgres. Cost computed post-hangup against the carrier rate deck; billable duration excludes ring-time.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Disp = 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED'

interface Row {
  id: string
  t: string
  from: string
  to: string
  dir: 'inbound' | 'outbound'
  duration: number
  disp: Disp
  cost: number
}

const rows = ref<Row[]>([
  { id: 'c-0001', t: '14:42:11', from: '+14155550100',        to: 'sip:alex@example.com',   dir: 'inbound',  duration: 182, disp: 'ANSWERED',  cost: 0 },
  { id: 'c-0002', t: '14:38:02', from: 'sip:priya@example.com', to: '+442079460000',       dir: 'outbound', duration: 47,  disp: 'ANSWERED',  cost: 0.0094 },
  { id: 'c-0003', t: '14:21:55', from: '+18005551212',        to: 'sip:jordan@example.com', dir: 'inbound',  duration: 0,   disp: 'NO ANSWER', cost: 0 },
  { id: 'c-0004', t: '13:58:19', from: 'sip:alex@example.com',  to: '+13105551155',        dir: 'outbound', duration: 612, disp: 'ANSWERED',  cost: 0.1224 },
  { id: 'c-0005', t: '13:44:03', from: '+14155550199',        to: 'sip:meera@example.com',  dir: 'inbound',  duration: 0,   disp: 'BUSY',      cost: 0 },
  { id: 'c-0006', t: '13:12:41', from: 'sip:tom@example.com',   to: '+61291234567',        dir: 'outbound', duration: 298, disp: 'ANSWERED',  cost: 0.0894 },
  { id: 'c-0007', t: '12:55:08', from: '+14085550123',        to: 'sip:sofia@example.com',  dir: 'inbound',  duration: 75,  disp: 'ANSWERED',  cost: 0 },
  { id: 'c-0008', t: '12:03:19', from: 'sip:alex@example.com',  to: '+33145551212',        dir: 'outbound', duration: 8,   disp: 'FAILED',    cost: 0 },
  { id: 'c-0009', t: '11:18:52', from: '+16175551001',        to: 'sip:ingrid@example.com', dir: 'inbound',  duration: 421, disp: 'ANSWERED',  cost: 0 },
])

const query = ref('')
const dir = ref<'all' | 'inbound' | 'outbound'>('all')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (dir.value !== 'all' && r.dir !== dir.value) return false
    if (!q) return true
    return r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q) || r.disp.toLowerCase().includes(q)
  })
})

const totalMin = computed(() => Math.round(rows.value.reduce((s, r) => s + r.duration, 0) / 60))
const fmtDur = (s: number) => {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m ? `${m}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`
}
</script>

<style scoped>
.cdrt {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.8rem;
  color: var(--ink); font-family: var(--sans);
}

.cdrt__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.cdrt__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.cdrt__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.cdrt__filters { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.cdrt__search, .cdrt__select {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.4rem 0.6rem;
  font-family: var(--mono); font-size: 0.76rem; color: var(--ink);
}
.cdrt__search:focus, .cdrt__select:focus { outline: none; border-color: var(--accent); }

.cdrt__wrap {
  overflow-x: auto;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
}
.cdrt__table {
  width: 100%; border-collapse: collapse;
  font-family: var(--mono); font-size: 0.78rem;
}
.cdrt__table th {
  text-align: left;
  padding: 0.5rem 0.7rem;
  border-bottom: 1px solid var(--rule);
  font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
  font-weight: 700;
  background: var(--paper-deep);
}
.cdrt__table td {
  padding: 0.45rem 0.7rem;
  border-bottom: 1px solid color-mix(in srgb, var(--rule) 60%, transparent);
  color: var(--ink);
  vertical-align: middle;
}
.cdrt__row--NO.ANSWER, .cdrt__row--NO { opacity: 0.7; }
.cdrt__ts { color: var(--muted); font-variant-numeric: tabular-nums; }

.cdrt__uri {
  font-family: var(--mono); font-size: 0.74rem; color: var(--ink);
}
.cdrt__arrow { margin-left: 0.3rem; color: var(--muted); font-weight: 700; }

.cdrt__num { text-align: right; font-variant-numeric: tabular-nums; }
.cdrt__cost { color: var(--accent); font-weight: 600; }

.cdrt__disp {
  font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.1em;
  padding: 0.15rem 0.4rem; border: 1px solid var(--rule); border-radius: 2px;
  color: var(--muted); background: var(--paper-deep);
}

.cdrt__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.cdrt__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
