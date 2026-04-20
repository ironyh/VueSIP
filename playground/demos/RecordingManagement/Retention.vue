<template>
  <div class="ret">
    <header class="ret__head">
      <div>
        <span class="ret__eyebrow">Retention &amp; export</span>
        <h3 class="ret__title">{{ activeRules.length }} active rules · {{ holds.length }} on legal hold</h3>
      </div>
    </header>

    <section class="ret__section">
      <span class="ret__section-title">Auto-expire schedule</span>
      <ul class="ret__rules" role="list">
        <li v-for="r in rules" :key="r.id" class="ret__rule" :class="{ 'ret__rule--off': !r.enabled }">
          <div class="ret__rule-body">
            <div class="ret__rule-head">
              <span class="ret__rule-name">{{ r.scope }}</span>
              <code class="ret__rule-window">after {{ r.days }} days</code>
            </div>
            <p class="ret__rule-desc">{{ r.desc }}</p>
          </div>
          <div class="ret__rule-tools">
            <input
              type="number"
              v-model.number="r.days"
              class="ret__days"
              min="1"
              max="3650"
              :disabled="!r.enabled"
              :aria-label="`Retention days for ${r.scope}`"
            />
            <label class="ret__switch">
              <input type="checkbox" v-model="r.enabled" />
              <span class="ret__switch-track" aria-hidden="true"><span class="ret__switch-thumb" /></span>
              <span class="ret__switch-label">{{ r.enabled ? 'On' : 'Off' }}</span>
            </label>
          </div>
        </li>
      </ul>
    </section>

    <section class="ret__section">
      <span class="ret__section-title">Legal hold — preserves recordings past retention</span>
      <ul v-if="holds.length" class="ret__holds" role="list">
        <li v-for="h in holds" :key="h.id" class="ret__hold">
          <div class="ret__hold-body">
            <span class="ret__hold-case">Case {{ h.caseId }}</span>
            <span class="ret__hold-desc">{{ h.matter }}</span>
            <span class="ret__hold-meta">{{ h.count }} recordings · held since {{ h.since }}</span>
          </div>
          <button type="button" class="ret__hold-release" @click="releaseHold(h.id)">Release</button>
        </li>
      </ul>
      <p v-else class="ret__empty-holds">No active legal holds. Add a hold when counsel issues a litigation-hold notice.</p>
      <button type="button" class="ret__add-hold" @click="addHold">+ Add legal hold</button>
    </section>

    <section class="ret__section">
      <span class="ret__section-title">Export queue</span>
      <ul v-if="exports.length" class="ret__exports" role="list">
        <li v-for="e in exports" :key="e.id" class="ret__export">
          <div class="ret__export-body">
            <span class="ret__export-label">{{ e.label }}</span>
            <span class="ret__export-meta">{{ e.count }} recordings · {{ e.format.toUpperCase() }} · {{ e.destination }}</span>
          </div>
          <div class="ret__export-status">
            <div class="ret__progress">
              <div class="ret__progress-fill" :style="{ width: e.progress + '%' }" />
            </div>
            <span class="ret__export-state" :class="`ret__export-state--${e.state}`">{{ e.state }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="ret__empty">Queue empty.</p>
    </section>

    <section class="ret__section ret__section--forecast">
      <span class="ret__section-title">Storage forecast</span>
      <div class="ret__forecast">
        <div class="ret__stat">
          <span class="ret__stat-value">{{ totalRecordings }}</span>
          <span class="ret__stat-label">Recordings</span>
        </div>
        <div class="ret__stat">
          <span class="ret__stat-value">{{ formatSize(totalBytes) }}</span>
          <span class="ret__stat-label">Total size</span>
        </div>
        <div class="ret__stat">
          <span class="ret__stat-value">{{ expiringSoon }}</span>
          <span class="ret__stat-label">Expiring ≤ 7 d</span>
        </div>
        <div class="ret__stat">
          <span class="ret__stat-value">{{ holds.reduce((s, h) => s + h.count, 0) }}</span>
          <span class="ret__stat-label">Held (never expire)</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Rule {
  id: string
  scope: string
  days: number
  desc: string
  enabled: boolean
}

const rules = ref<Rule[]>([
  { id: 'default', scope: 'Default — all recordings', days: 90, desc: 'Applies if no more specific rule matches. Industry standard for general business.', enabled: true },
  { id: 'support', scope: 'Support queue', days: 30, desc: 'Cheaper; support recordings are low legal risk once the ticket closes.', enabled: true },
  { id: 'sales', scope: 'Sales queue', days: 365, desc: 'Kept a year for dispute resolution and contract confirmation.', enabled: true },
  { id: 'vip', scope: 'VIP callers', days: 730, desc: 'Two years — escalation trail for enterprise accounts.', enabled: false },
  { id: 'fin', scope: 'Financial / compliance calls', days: 2555, desc: '7 years — SEC Rule 17a-4, MiFID II equivalent.', enabled: false },
])
const activeRules = computed(() => rules.value.filter((r) => r.enabled))

interface Hold {
  id: number
  caseId: string
  matter: string
  count: number
  since: string
}
const holds = ref<Hold[]>([
  { id: 1, caseId: 'LIT-2026-003', matter: 'Doe v. Example Corp — wrongful dismissal', count: 47, since: '2026-03-14' },
  { id: 2, caseId: 'REG-2026-011', matter: 'FCA enquiry — mis-selling review', count: 218, since: '2026-02-02' },
])
const releaseHold = (id: number) => {
  holds.value = holds.value.filter((h) => h.id !== id)
}
const addHold = () => {
  holds.value.unshift({
    id: Date.now(),
    caseId: `LIT-${new Date().getFullYear()}-${String(holds.value.length + 1).padStart(3, '0')}`,
    matter: 'New hold — matter pending',
    count: 0,
    since: new Date().toISOString().slice(0, 10),
  })
}

const exports = ref([
  { id: 'exp-1', label: 'Monthly QA batch — March', count: 40, format: 'mp3', destination: 's3://qa-export/2026-03', state: 'running', progress: 68 },
  { id: 'exp-2', label: 'LIT-2026-003 discovery', count: 47, format: 'wav', destination: 'sftp://counsel.example/intake', state: 'queued', progress: 0 },
  { id: 'exp-3', label: 'Training corpus v4', count: 1200, format: 'wav', destination: 'gs://ml-corpus/v4', state: 'done', progress: 100 },
] as { id: string; label: string; count: number; format: string; destination: string; state: 'queued' | 'running' | 'done' | 'error'; progress: number }[])

const totalRecordings = 1428
const totalBytes = 9_400_000_000
const expiringSoon = 73

const formatSize = (b: number): string => {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(0)} MB`
  return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
</script>

<style scoped>
.ret {
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
  gap: 1rem;
  color: var(--ink);
  font-family: var(--sans);
}

.ret__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.ret__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.ret__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.ret__section { display: flex; flex-direction: column; gap: 0.5rem; }
.ret__section-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.ret__rules { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.ret__rule {
  display: flex;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  align-items: center;
}
.ret__rule--off { opacity: 0.55; }
.ret__rule-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.ret__rule-head { display: inline-flex; gap: 0.5rem; flex-wrap: wrap; align-items: baseline; }
.ret__rule-name { font-weight: 600; font-size: 0.88rem; }
.ret__rule-window { font-family: var(--mono); font-size: 0.7rem; color: var(--accent); }
.ret__rule-desc { margin: 0; font-size: 0.76rem; color: var(--muted); line-height: 1.45; }
.ret__rule-tools { display: inline-flex; align-items: center; gap: 0.6rem; }
.ret__days {
  width: 4.5rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.45rem;
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--ink);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ret__days:disabled { opacity: 0.45; }
.ret__days:focus { outline: none; border-color: var(--accent); }

.ret__switch { display: inline-flex; align-items: center; gap: 0.45rem; cursor: pointer; }
.ret__switch input { position: absolute; opacity: 0; pointer-events: none; }
.ret__switch-track { width: 2rem; height: 1.1rem; background: var(--rule); border-radius: 999px; position: relative; transition: background 0.15s; }
.ret__switch-thumb { position: absolute; top: 2px; left: 2px; width: 0.9rem; height: 0.9rem; background: var(--paper); border-radius: 50%; transition: transform 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
.ret__switch input:checked + .ret__switch-track { background: var(--accent); }
.ret__switch input:checked + .ret__switch-track .ret__switch-thumb { transform: translateX(0.9rem); }
.ret__switch-label { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); min-width: 1.7rem; }

.ret__holds { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.ret__hold {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: color-mix(in srgb, #b91c1c 5%, var(--paper));
  border: 1px solid #b91c1c;
  border-left: 3px solid #b91c1c;
  border-radius: 2px;
}
.ret__hold-body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.ret__hold-case {
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #b91c1c;
}
.ret__hold-desc { font-size: 0.85rem; font-weight: 600; }
.ret__hold-meta { font-family: var(--mono); font-size: 0.64rem; color: var(--muted); }
.ret__hold-release {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.ret__hold-release:hover { color: var(--ink); border-color: var(--ink); }

.ret__add-hold {
  align-self: flex-start;
  background: transparent;
  border: 1px dashed var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.ret__add-hold:hover { border-color: var(--accent); color: var(--accent); border-style: solid; }

.ret__empty-holds,
.ret__empty {
  margin: 0;
  padding: 0.8rem;
  text-align: center;
  background: var(--paper-deep);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
}

.ret__exports { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.ret__export {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.ret__export-body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.ret__export-label { font-weight: 600; font-size: 0.88rem; }
.ret__export-meta { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); }
.ret__export-status { display: inline-flex; align-items: center; gap: 0.6rem; }
.ret__progress { width: 7rem; height: 0.45rem; background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px; overflow: hidden; }
.ret__progress-fill { height: 100%; background: var(--accent); transition: width 0.3s ease-out; }
.ret__export-state {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  border: 1px solid var(--rule);
  color: var(--muted);
  min-width: 4.5rem;
  text-align: center;
}
.ret__export-state--running { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.ret__export-state--done { color: #047857; border-color: #047857; background: color-mix(in srgb, #047857 8%, transparent); }
.ret__export-state--error { color: #b91c1c; border-color: #b91c1c; background: color-mix(in srgb, #b91c1c 8%, transparent); }

.ret__forecast {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.5rem;
}
.ret__stat {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.6rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--accent);
  border-radius: 2px;
}
.ret__stat-value { font-family: var(--mono); font-size: 1.3rem; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.ret__stat-label { font-family: var(--mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }
</style>
