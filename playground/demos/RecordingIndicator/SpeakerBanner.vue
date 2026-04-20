<template>
  <div class="rib">
    <header class="rib__head">
      <div>
        <span class="rib__eyebrow">Speaker-side notice</span>
        <h3 class="rib__title">Jurisdiction: <code>{{ jurisdiction }}</code></h3>
      </div>
      <div class="rib__modes" role="radiogroup" aria-label="Jurisdiction">
        <button
          v-for="j in jurisdictions"
          :key="j.id"
          type="button"
          class="rib__mode"
          :class="{ 'rib__mode--on': jurisdiction === j.id }"
          role="radio"
          :aria-checked="jurisdiction === j.id"
          @click="jurisdiction = j.id"
          :title="j.desc"
        >{{ j.label }}</button>
      </div>
    </header>

    <div class="rib__preview">
      <div class="rib__banner" :class="`rib__banner--${mode.style}`" role="status" aria-live="polite">
        <span class="rib__banner-icon" aria-hidden="true">{{ mode.icon }}</span>
        <div class="rib__banner-body">
          <strong class="rib__banner-title">{{ mode.title }}</strong>
          <span class="rib__banner-text">{{ mode.text }}</span>
        </div>
        <span class="rib__banner-meta">
          <code>{{ mode.ref }}</code>
        </span>
      </div>

      <div class="rib__frame">
        <div class="rib__frame-head">
          <span class="rib__frame-dot" />
          <span class="rib__frame-dot" />
          <span class="rib__frame-dot" />
          <code class="rib__frame-url">softphone.example/call</code>
        </div>
        <div class="rib__frame-body">
          <div class="rib__call">
            <span class="rib__call-label">In call</span>
            <code class="rib__call-party">Priya Shah · +14155550100</code>
            <span class="rib__call-time">00:47</span>
          </div>
        </div>
      </div>
    </div>

    <section class="rib__matrix" aria-label="Legal matrix">
      <span class="rib__matrix-title">Regional notice requirements</span>
      <table class="rib__table">
        <thead>
          <tr>
            <th>Region</th>
            <th>Minimum notice</th>
            <th>Consent basis</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in regions" :key="r.region" :class="{ 'rib__row--active': r.region === jurisdiction }">
            <td><code>{{ r.region }}</code></td>
            <td>{{ r.notice }}</td>
            <td>{{ r.consent }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Jurisdiction = 'US-1P' | 'US-2P' | 'EU' | 'UK' | 'AU' | 'JP'

const jurisdictions = [
  { id: 'US-1P' as const, label: 'US (1-party)', desc: '38 states + federal — only caller needs to consent' },
  { id: 'US-2P' as const, label: 'US (2-party)', desc: 'CA, FL, IL, PA, WA + 7 others — both sides must consent' },
  { id: 'EU' as const, label: 'EU (GDPR)', desc: 'Explicit lawful basis required; data-subject rights apply' },
  { id: 'UK' as const, label: 'UK', desc: 'ICO guidance; periodic beep accepted for monitoring' },
  { id: 'AU' as const, label: 'AU', desc: 'Telecommunications Interception Act; beep accepted' },
  { id: 'JP' as const, label: 'JP', desc: 'APPI — notice-based; explicit consent for sensitive data' },
]

const jurisdiction = ref<Jurisdiction>('US-2P')

interface Mode {
  style: 'subtle' | 'prominent' | 'modal'
  icon: string
  title: string
  text: string
  ref: string
}

const mode = computed<Mode>(() => {
  switch (jurisdiction.value) {
    case 'US-1P':
      return { style: 'subtle', icon: '◉', title: 'Call is being recorded', text: 'Recording is logged for quality review.', ref: '18 U.S.C. § 2511' }
    case 'US-2P':
      return { style: 'prominent', icon: '⚠', title: 'This call is being recorded', text: 'By staying on the line you consent to recording for quality and training. Say "stop recording" to opt out.', ref: 'CA Penal § 632' }
    case 'EU':
      return { style: 'modal', icon: '🛡', title: 'Recording with GDPR notice', text: 'Lawful basis: legitimate interest (quality assurance). Retention 30 days. You may request deletion via privacy@example.com.', ref: 'GDPR Art. 6(1)(f)' }
    case 'UK':
      return { style: 'prominent', icon: '🔔', title: 'Recorded — periodic beep enabled', text: 'You will hear a short tone every 15 seconds throughout the call.', ref: 'ICO RIPA' }
    case 'AU':
      return { style: 'prominent', icon: '🔔', title: 'Call recorded — tone present', text: 'A recording indicator tone is played periodically in compliance with the TIA.', ref: 'TIA 1979' }
    case 'JP':
      return { style: 'subtle', icon: 'ⓘ', title: 'この通話は録音されています', text: 'This call is being recorded for quality purposes.', ref: 'APPI 法' }
  }
})

const regions = [
  { region: 'US-1P', notice: 'None required', consent: 'One-party (caller)' },
  { region: 'US-2P', notice: 'Announcement at start', consent: 'All parties' },
  { region: 'EU', notice: 'Full GDPR notice', consent: 'Lawful basis + rights' },
  { region: 'UK', notice: 'Periodic beep (15 s)', consent: 'Implied by continuation' },
  { region: 'AU', notice: 'Periodic beep', consent: 'Implied by continuation' },
  { region: 'JP', notice: 'Announcement', consent: 'Notice-based' },
]
</script>

<style scoped>
.rib {
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

.rib__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.rib__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.rib__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.rib__title code { font-family: var(--mono); font-size: 0.85rem; color: var(--accent); }

.rib__modes { display: inline-flex; flex-wrap: wrap; gap: 0.25rem; }
.rib__mode {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.rib__mode:hover { border-color: var(--ink); color: var(--ink); }
.rib__mode--on { background: var(--ink); color: var(--paper); border-color: var(--ink); }

.rib__preview { display: flex; flex-direction: column; gap: 0.6rem; }

.rib__banner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
}
.rib__banner--subtle {
  background: var(--paper-deep);
  border-left: 3px solid var(--muted);
}
.rib__banner--prominent {
  background: color-mix(in srgb, var(--accent) 10%, var(--paper));
  border-left: 3px solid var(--accent);
}
.rib__banner--modal {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
  border-left: 3px solid var(--accent);
}
.rib__banner-icon { font-size: 1.1rem; }
.rib__banner-body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.rib__banner-title { font-size: 0.9rem; font-weight: 700; }
.rib__banner-text { font-size: 0.78rem; line-height: 1.4; opacity: 0.88; }
.rib__banner-meta {
  font-family: var(--mono);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.7;
}
.rib__banner-meta code { font-family: var(--mono); }

.rib__frame {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  overflow: hidden;
}
.rib__frame-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.6rem;
  background: var(--paper-deep);
  border-bottom: 1px solid var(--rule);
}
.rib__frame-dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--rule); }
.rib__frame-dot:nth-child(1) { background: #e06c4a; }
.rib__frame-dot:nth-child(2) { background: #e2b437; }
.rib__frame-dot:nth-child(3) { background: #6ca97b; }
.rib__frame-url { margin-left: 0.5rem; font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
.rib__frame-body { padding: 1.2rem 1rem; display: grid; place-items: center; min-height: 4rem; }

.rib__call {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.8rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.78rem;
}
.rib__call-label {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.rib__call-party { color: var(--ink); }
.rib__call-time { color: var(--muted); font-variant-numeric: tabular-nums; }

.rib__matrix { display: flex; flex-direction: column; gap: 0.4rem; }
.rib__matrix-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.rib__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
}
.rib__table th {
  text-align: left;
  padding: 0.4rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  background: var(--paper-deep);
  border-bottom: 1px solid var(--rule);
}
.rib__table td {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.rib__table tr:last-child td { border-bottom: 0; }
.rib__table code { font-family: var(--mono); font-size: 0.72rem; color: var(--accent); }
.rib__row--active { background: color-mix(in srgb, var(--accent) 8%, transparent); }
.rib__row--active td { font-weight: 600; }
</style>
