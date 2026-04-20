<template>
  <div class="pol">
    <header class="pol__head">
      <div>
        <span class="pol__eyebrow">Recording policy</span>
        <h3 class="pol__title">{{ enabledRules }} of {{ rules.length }} auto-record rules active</h3>
      </div>
      <span class="pol__retention">
        Retention: <strong>{{ retentionDays }}d</strong>
      </span>
    </header>

    <section class="pol__section">
      <span class="pol__section-title">Auto-record trigger</span>
      <ul class="pol__rules" role="list">
        <li v-for="r in rules" :key="r.id" class="pol__rule" :class="{ 'pol__rule--off': !r.enabled }">
          <div class="pol__rule-body">
            <div class="pol__rule-head">
              <span class="pol__rule-name">{{ r.name }}</span>
              <code class="pol__rule-match">{{ r.match }}</code>
            </div>
            <p class="pol__rule-desc">{{ r.desc }}</p>
          </div>
          <label class="pol__switch">
            <input type="checkbox" v-model="r.enabled" />
            <span class="pol__switch-track" aria-hidden="true"><span class="pol__switch-thumb" /></span>
            <span class="pol__switch-label">{{ r.enabled ? 'On' : 'Off' }}</span>
          </label>
        </li>
      </ul>
    </section>

    <section class="pol__section">
      <span class="pol__section-title">Retention window</span>
      <div class="pol__retention-options" role="radiogroup" aria-label="Retention">
        <button
          v-for="r in retentionChoices"
          :key="r.value"
          type="button"
          class="pol__chip"
          :class="{ 'pol__chip--on': retentionDays === r.value }"
          role="radio"
          :aria-checked="retentionDays === r.value"
          @click="retentionDays = r.value"
        >
          <span class="pol__chip-value">{{ r.label }}</span>
          <span class="pol__chip-hint">{{ r.hint }}</span>
        </button>
      </div>
    </section>

    <section class="pol__section">
      <span class="pol__section-title">Consent announcement</span>
      <textarea
        v-model="consentText"
        class="pol__textarea"
        rows="2"
        aria-label="Consent announcement text"
      />
      <div class="pol__consent-modes" role="radiogroup" aria-label="Consent mode">
        <button
          v-for="m in consentModes"
          :key="m.id"
          type="button"
          class="pol__mode"
          :class="{ 'pol__mode--on': consentMode === m.id }"
          role="radio"
          :aria-checked="consentMode === m.id"
          @click="consentMode = m.id"
        >
          <span class="pol__mode-label">{{ m.label }}</span>
          <span class="pol__mode-desc">{{ m.desc }}</span>
        </button>
      </div>
    </section>

    <section class="pol__section pol__section--preview">
      <span class="pol__section-title">Computed policy (what the PBX will do)</span>
      <pre class="pol__preview"><code>{{ policyPreview }}</code></pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Rule {
  id: string
  name: string
  match: string
  desc: string
  enabled: boolean
}

const rules = ref<Rule[]>([
  { id: 'inbound', name: 'All inbound calls', match: 'direction=in', desc: 'Records every answered inbound, regardless of destination or queue.', enabled: true },
  { id: 'outbound', name: 'All outbound calls', match: 'direction=out', desc: 'Records every outbound. Often disabled for regulatory reasons in the EU.', enabled: false },
  { id: 'queue-sales', name: 'Sales queue', match: 'queue in ("sales","vip-sales")', desc: 'Recorded for coaching and dispute resolution.', enabled: true },
  { id: 'queue-support', name: 'Support queue', match: 'queue="support"', desc: 'Records support calls for QA sampling.', enabled: true },
  { id: 'vip', name: 'VIP callers', match: 'from matches /^\\+1415555(01\\d\\d)$/', desc: 'Escalation recording for known VIPs (Priya Shah, etc.).', enabled: false },
  { id: 'afterhours', name: 'After-hours', match: 'time not in business_hours', desc: 'Records overflow to on-call engineer.', enabled: true },
])

const retentionChoices = [
  { value: 7, label: '7 days', hint: 'Cheap; legal minimum in most jurisdictions' },
  { value: 30, label: '30 days', hint: 'Default for most SMB deployments' },
  { value: 90, label: '90 days', hint: 'Standard for B2B / contract work' },
  { value: 365, label: '1 year', hint: 'Regulated industries, training corpus' },
  { value: 2555, label: '7 years', hint: 'Financial / healthcare compliance' },
] as const

const retentionDays = ref<number>(90)
const consentText = ref('This call may be recorded for quality and training purposes.')
const consentMode = ref<'announcement' | 'beep' | 'dtmf' | 'none'>('announcement')
const consentModes = [
  { id: 'announcement' as const, label: 'Announcement', desc: 'IVR plays consent text at call start' },
  { id: 'beep' as const, label: 'Periodic beep', desc: '1400 Hz every 15 s (UK/AU accepted)' },
  { id: 'dtmf' as const, label: 'DTMF opt-in', desc: 'Press 1 to acknowledge recording' },
  { id: 'none' as const, label: 'No notice', desc: 'Only legal in one-party consent states' },
]

const enabledRules = computed(() => rules.value.filter((r) => r.enabled).length)

const policyPreview = computed(() => {
  const active = rules.value.filter((r) => r.enabled).map((r) => `  ${r.match}`)
  return [
    '# dialplan snippet (Asterisk style)',
    'if (',
    active.length ? active.join(' ||\n') : '  false',
    ') then {',
    `  MixMonitor(\${UNIQUEID}.wav,b,${consentMode.value === 'beep' ? 'beep=15' : ''})`,
    consentMode.value === 'announcement' ? `  Playback(consent-notice)  # "${consentText.value.slice(0, 40)}…"` : '',
    `  Set(REC_RETAIN=${retentionDays.value}d)`,
    '}',
  ]
    .filter(Boolean)
    .join('\n')
})
</script>

<style scoped>
.pol {
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
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}

.pol__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid var(--rule);
}
.pol__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.pol__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.pol__retention {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}
.pol__retention strong { color: var(--accent); font-weight: 700; }

.pol__section { display: flex; flex-direction: column; gap: 0.5rem; }
.pol__section-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.pol__rules { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.pol__rule {
  display: flex;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  align-items: center;
}
.pol__rule--off { opacity: 0.55; }
.pol__rule-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.pol__rule-head { display: inline-flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.pol__rule-name { font-weight: 600; font-size: 0.88rem; }
.pol__rule-match {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--accent);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  padding: 0.05rem 0.3rem;
  border-radius: 2px;
}
.pol__rule-desc { margin: 0; font-size: 0.76rem; color: var(--muted); line-height: 1.45; }

.pol__switch { display: inline-flex; align-items: center; gap: 0.45rem; cursor: pointer; }
.pol__switch input { position: absolute; opacity: 0; pointer-events: none; }
.pol__switch-track {
  width: 2rem;
  height: 1.1rem;
  background: var(--rule);
  border-radius: 999px;
  position: relative;
  transition: background 0.15s;
}
.pol__switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 0.9rem;
  height: 0.9rem;
  background: var(--paper);
  border-radius: 50%;
  transition: transform 0.15s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}
.pol__switch input:checked + .pol__switch-track { background: var(--accent); }
.pol__switch input:checked + .pol__switch-track .pol__switch-thumb { transform: translateX(0.9rem); }
.pol__switch-label {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  min-width: 1.7rem;
}

.pol__retention-options { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pol__chip {
  display: inline-flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.45rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
}
.pol__chip:hover { border-color: var(--ink); }
.pol__chip--on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.pol__chip--on .pol__chip-hint { color: color-mix(in srgb, var(--paper) 65%, transparent); }
.pol__chip-value { font-family: var(--mono); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; }
.pol__chip-hint { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.06em; color: var(--muted); }

.pol__textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.65rem;
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--ink);
  resize: vertical;
}
.pol__textarea:focus { outline: none; border-color: var(--accent); }

.pol__consent-modes { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.pol__mode {
  display: inline-flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.45rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  cursor: pointer;
  min-width: 10rem;
  text-align: left;
  transition: all 0.12s;
}
.pol__mode:hover { border-color: var(--ink); }
.pol__mode--on { background: var(--accent); color: var(--paper); border-color: var(--accent); }
.pol__mode--on .pol__mode-desc { color: color-mix(in srgb, var(--paper) 80%, transparent); }
.pol__mode-label { font-weight: 600; font-size: 0.82rem; }
.pol__mode-desc { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.06em; color: var(--muted); }

.pol__preview {
  margin: 0;
  padding: 0.7rem 0.85rem;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
  line-height: 1.5;
  overflow: auto;
  max-height: 14rem;
}
</style>
