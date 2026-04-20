<template>
  <div class="cbp">
    <header class="cbp__head">
      <div>
        <span class="cbp__eyebrow">Callback policy</span>
        <h3 class="cbp__title">Business hours, retries, failure routing</h3>
      </div>
    </header>

    <section class="cbp__section">
      <span class="cbp__section-title">Business window</span>
      <div class="cbp__row">
        <label class="cbp__field">
          <span class="cbp__label">Open</span>
          <input type="time" v-model="hours.open" class="cbp__input" />
        </label>
        <label class="cbp__field">
          <span class="cbp__label">Close</span>
          <input type="time" v-model="hours.close" class="cbp__input" />
        </label>
        <label class="cbp__field">
          <span class="cbp__label">Timezone</span>
          <select v-model="hours.tz" class="cbp__input cbp__input--select">
            <option>America/New_York</option>
            <option>Europe/London</option>
            <option>Europe/Amsterdam</option>
            <option>Asia/Singapore</option>
          </select>
        </label>
      </div>
      <div class="cbp__days">
        <button
          v-for="(d, i) in days"
          :key="i"
          type="button"
          class="cbp__day"
          :class="{ 'cbp__day--on': d.on }"
          :aria-pressed="d.on"
          @click="d.on = !d.on"
        >
          {{ d.name }}
        </button>
      </div>
    </section>

    <section class="cbp__section">
      <span class="cbp__section-title">Retry policy</span>
      <div class="cbp__retry">
        <label class="cbp__field">
          <span class="cbp__label">Max attempts</span>
          <input
            type="number"
            v-model.number="retry.max"
            min="1"
            max="10"
            class="cbp__input cbp__input--num"
          />
        </label>
        <label class="cbp__field">
          <span class="cbp__label">Between tries</span>
          <div class="cbp__stepper">
            <input
              type="number"
              v-model.number="retry.intervalMin"
              min="1"
              class="cbp__input cbp__input--num"
            />
            <span class="cbp__unit">min</span>
          </div>
        </label>
        <label class="cbp__field">
          <span class="cbp__label">Backoff</span>
          <select v-model="retry.backoff" class="cbp__input cbp__input--select">
            <option value="fixed">Fixed</option>
            <option value="linear">Linear (×1.5)</option>
            <option value="expo">Exponential (×2)</option>
          </select>
        </label>
      </div>
      <div class="cbp__preview">
        <span class="cbp__preview-label">Retry schedule</span>
        <div class="cbp__preview-row">
          <span v-for="(r, i) in retrySchedule" :key="i" class="cbp__chip">
            <span class="cbp__chip-n">#{{ i + 1 }}</span>
            <span class="cbp__chip-t">{{ r }}</span>
          </span>
        </div>
      </div>
    </section>

    <section class="cbp__section">
      <span class="cbp__section-title">On final failure</span>
      <div class="cbp__actions" role="radiogroup" aria-label="Failure action">
        <button
          v-for="a in failActions"
          :key="a.id"
          type="button"
          class="cbp__action"
          :class="{ 'cbp__action--on': failAction === a.id }"
          role="radio"
          :aria-checked="failAction === a.id"
          @click="failAction = a.id"
        >
          <span class="cbp__action-label">{{ a.label }}</span>
          <span class="cbp__action-desc">{{ a.desc }}</span>
          <span class="cbp__action-code">{{ a.code }}</span>
        </button>
      </div>
    </section>

    <section class="cbp__section">
      <span class="cbp__section-title">Quotas & guardrails</span>
      <ul class="cbp__guards" role="list">
        <li class="cbp__guard">
          <label class="cbp__guard-label">
            <input type="checkbox" v-model="guards.rateLimitHour" />
            <span>Rate-limit outbound callbacks per hour</span>
          </label>
          <span class="cbp__guard-hint"
            >Cap: {{ guards.rateLimitPerHour }}/hr across all agents.</span
          >
        </li>
        <li class="cbp__guard">
          <label class="cbp__guard-label">
            <input type="checkbox" v-model="guards.respectDnc" />
            <span>Honour internal Do-Not-Call list</span>
          </label>
          <span class="cbp__guard-hint">Checked on every attempt, not just at queue-time.</span>
        </li>
        <li class="cbp__guard">
          <label class="cbp__guard-label">
            <input type="checkbox" v-model="guards.tcpaWindow" />
            <span>Enforce TCPA window (08:00–21:00 caller-local)</span>
          </label>
          <span class="cbp__guard-hint">US consumer regulation; ignore for B2B deployments.</span>
        </li>
        <li class="cbp__guard">
          <label class="cbp__guard-label">
            <input type="checkbox" v-model="guards.abandonedOnly" />
            <span>Only callback abandoned queue calls</span>
          </label>
          <span class="cbp__guard-hint">Excludes callbacks from voicemail or IVR menus.</span>
        </li>
      </ul>
    </section>

    <footer class="cbp__foot">
      <span class="cbp__foot-dot" :class="{ 'cbp__foot-dot--on': openNow }"></span>
      <span class="cbp__foot-label">
        <strong>{{ openNow ? 'Inside business hours' : 'Outside business hours' }}</strong> · final
        failure → <em>{{ currentFailLabel }}</em> · {{ retry.max }} attempts at
        {{ retry.intervalMin }}m {{ retry.backoff }}
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

type FailId = 'voicemail' | 'notify' | 'drop' | 'email'

const hours = reactive({ open: '09:00', close: '18:00', tz: 'Europe/London' })
const days = ref([
  { name: 'Mon', on: true },
  { name: 'Tue', on: true },
  { name: 'Wed', on: true },
  { name: 'Thu', on: true },
  { name: 'Fri', on: true },
  { name: 'Sat', on: false },
  { name: 'Sun', on: false },
])

const retry = reactive({
  max: 3,
  intervalMin: 15,
  backoff: 'linear' as 'fixed' | 'linear' | 'expo',
})

const retrySchedule = computed(() => {
  const out: string[] = []
  let total = 0
  for (let i = 0; i < retry.max; i++) {
    let mult = 1
    if (retry.backoff === 'linear') mult = 1 + i * 0.5
    if (retry.backoff === 'expo') mult = Math.pow(2, i)
    total += Math.round(retry.intervalMin * mult)
    out.push(total < 60 ? `${total}m` : `${(total / 60).toFixed(1)}h`)
  }
  return out
})

const failActions: { id: FailId; label: string; desc: string; code: string }[] = [
  {
    id: 'voicemail',
    label: 'To voicemail',
    desc: 'Drop a pre-recorded message and close the request.',
    code: 'AMI Originate → vm context',
  },
  {
    id: 'notify',
    label: 'Notify agent',
    desc: 'Push to the assigned agent; they decide whether to retry.',
    code: 'WebSocket · X-Callback-Retry',
  },
  {
    id: 'drop',
    label: 'Mark abandoned',
    desc: 'No further action; close with status=failed.',
    code: 'status=failed · reason=max-retries',
  },
  {
    id: 'email',
    label: 'Email summary',
    desc: 'Send the caller a rescheduling link.',
    code: 'SMTP · template cb-missed',
  },
]
const failAction = ref<FailId>('notify')
const currentFailLabel = computed(() => failActions.find((a) => a.id === failAction.value)!.label)

const guards = reactive({
  rateLimitHour: true,
  rateLimitPerHour: 60,
  respectDnc: true,
  tcpaWindow: false,
  abandonedOnly: true,
})

const openNow = computed(() => {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  if (!days.value[day]?.on) return false
  const [oh, om] = hours.open.split(':').map(Number)
  const [ch, cm] = hours.close.split(':').map(Number)
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= oh * 60 + om && mins < ch * 60 + cm
})
</script>

<style scoped>
.cbp {
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
  gap: 0.95rem;
  color: var(--ink);
  font-family: var(--sans);
}
.cbp__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
}
.cbp__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cbp__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.cbp__section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.cbp__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.cbp__row,
.cbp__retry {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
}
.cbp__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.cbp__label {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.cbp__input {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.44rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.85rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.cbp__input:focus {
  outline: none;
  border-color: var(--accent);
}
.cbp__input--num {
  max-width: 100%;
}
.cbp__input--select {
  padding: 0.38rem 0.5rem;
}
.cbp__stepper {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.cbp__unit {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cbp__days {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.cbp__day {
  padding: 0.35rem 0.65rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.cbp__day:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.cbp__day--on {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}

.cbp__preview {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.cbp__preview-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.cbp__preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.cbp__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.18rem 0.45rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
.cbp__chip-n {
  color: var(--muted);
}
.cbp__chip-t {
  color: var(--accent);
  font-weight: 700;
}

.cbp__actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.4rem;
}
.cbp__action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.75rem;
  text-align: left;
  color: var(--ink);
  font-family: var(--sans);
  cursor: pointer;
  transition: all 0.12s;
}
.cbp__action:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.cbp__action--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.cbp__action-label {
  font-weight: 600;
  font-size: 0.88rem;
}
.cbp__action-desc {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.cbp__action-code {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin-top: 0.15rem;
}

.cbp__guards {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.cbp__guard {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.cbp__guard-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  cursor: pointer;
}
.cbp__guard-label input {
  accent-color: var(--accent);
}
.cbp__guard-hint {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  padding-left: 1.5rem;
}

.cbp__foot {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.cbp__foot-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}
.cbp__foot-dot--on {
  background: var(--ok);
}
.cbp__foot-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.03em;
}
.cbp__foot-label strong {
  color: var(--ink);
  font-weight: 700;
}
.cbp__foot-label em {
  color: var(--accent);
  font-style: normal;
}
</style>
