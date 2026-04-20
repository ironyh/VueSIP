<template>
  <div class="hc">
    <header class="hc__head">
      <div>
        <span class="hc__eyebrow">PBX recording smoke-test</span>
        <h3 class="hc__title">
          Last run: <span class="hc__stamp">{{ lastRun || 'never' }}</span>
        </h3>
      </div>
      <button
        type="button"
        class="hc__run"
        :class="{ 'hc__run--running': running }"
        :disabled="running"
        @click="run"
      >
        <span class="hc__run-dot" aria-hidden="true"></span>
        {{ running ? 'Running…' : 'Run smoke test' }}
      </button>
    </header>

    <div
      class="hc__summary"
      :class="`hc__summary--${overallState}`"
      role="status"
      aria-live="polite"
    >
      <span class="hc__summary-icon" aria-hidden="true">{{
        overallState === 'pass' ? '✓' : overallState === 'fail' ? '✗' : '◌'
      }}</span>
      <div class="hc__summary-body">
        <strong class="hc__summary-title">
          {{
            overallState === 'pass'
              ? 'All checks passed'
              : overallState === 'fail'
                ? 'Smoke test failed'
                : overallState === 'running'
                  ? 'Smoke test in progress'
                  : 'Not yet run'
          }}
        </strong>
        <span class="hc__summary-hint"
          >{{ passedCount }} of {{ steps.length }} checks green · {{ formatMs(totalMs) }}</span
        >
      </div>
      <code class="hc__summary-id" v-if="runId">run-{{ runId }}</code>
    </div>

    <section class="hc__steps">
      <span class="hc__steps-title">Pass / fail criteria</span>
      <ol class="hc__step-list" role="list">
        <li v-for="(s, i) in steps" :key="s.id" class="hc__step" :class="`hc__step--${s.state}`">
          <span class="hc__step-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <div class="hc__step-body">
            <div class="hc__step-head">
              <span class="hc__step-name">{{ s.name }}</span>
              <code class="hc__step-assert">{{ s.assert }}</code>
            </div>
            <p class="hc__step-desc">{{ s.desc }}</p>
            <p v-if="s.result" class="hc__step-result" :class="`hc__step-result--${s.state}`">
              {{ s.result }}
            </p>
          </div>
          <span class="hc__step-time">{{ s.ms ? formatMs(s.ms) : '—' }}</span>
        </li>
      </ol>
    </section>

    <section class="hc__config">
      <span class="hc__config-title">Test target</span>
      <dl class="hc__config-list">
        <dt>PBX</dt>
        <dd><code>sip:pbx.example.com:5061</code></dd>
        <dt>Test agent</dt>
        <dd><code>sip:smoke-bot@example.com</code></dd>
        <dt>Test destination</dt>
        <dd><code>sip:echo@example.com</code></dd>
        <dt>Recording path</dt>
        <dd><code>/var/spool/asterisk/monitor/smoke/</code></dd>
        <dt>Expected format</dt>
        <dd><code>WAV · 16 kHz · mono</code></dd>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type StepState = 'idle' | 'running' | 'pass' | 'fail' | 'skipped'

interface Step {
  id: string
  name: string
  assert: string
  desc: string
  state: StepState
  ms: number
  result?: string
}

const stepsDef: Omit<Step, 'state' | 'ms' | 'result'>[] = [
  {
    id: 'ami-connect',
    name: 'AMI connection',
    assert: 'Asterisk Manager login succeeds',
    desc: 'Open AMI WebSocket, authenticate with bot credentials, expect Response: Success.',
  },
  {
    id: 'originate',
    name: 'Test call origination',
    assert: 'Originate echo call from bot',
    desc: 'Originate sip:smoke-bot@example.com → sip:echo@example.com via PJSIP channel with recording enabled.',
  },
  {
    id: 'answered',
    name: 'Call reaches answered state',
    assert: 'ChannelStateDesc: Up within 5 s',
    desc: 'Wait for NewState event with ChannelStateDesc=Up — confirms echo app picked up and RTP flows.',
  },
  {
    id: 'mixmonitor',
    name: 'MixMonitor started',
    assert: 'MixMonitorStart event fired',
    desc: 'Dialplan Monitor/MixMonitor should emit a MixMonitorStart event referencing the channel.',
  },
  {
    id: 'hangup',
    name: 'Clean hangup',
    assert: 'Cause code 16 (Normal clearing)',
    desc: 'Bot hangs up after 3 s; Hangup event must have Cause=16, HangupCauseTxt="Normal Clearing".',
  },
  {
    id: 'file-exists',
    name: 'Recording file on disk',
    assert: 'File size > 5 KB within 2 s of hangup',
    desc: 'Poll Asterisk CLI `file ls` or SFTP directory; file must appear and have plausible size.',
  },
  {
    id: 'file-format',
    name: 'File format and duration',
    assert: 'WAV header + duration ∈ [2, 5] s',
    desc: 'Read WAV header; verify sample rate 16 kHz, channels=1, and duration matches call length.',
  },
  {
    id: 'cleanup',
    name: 'Cleanup',
    assert: 'Test recording deleted',
    desc: 'Delete the smoke-test recording to avoid polluting the library.',
  },
]

const steps = ref<Step[]>(stepsDef.map((s) => ({ ...s, state: 'idle' as StepState, ms: 0 })))
const running = ref(false)
const lastRun = ref<string | null>(null)
const runId = ref<string | null>(null)

const overallState = computed<'idle' | 'running' | 'pass' | 'fail'>(() => {
  if (running.value) return 'running'
  if (steps.value.every((s) => s.state === 'idle')) return 'idle'
  if (steps.value.some((s) => s.state === 'fail')) return 'fail'
  if (steps.value.every((s) => s.state === 'pass' || s.state === 'skipped')) return 'pass'
  return 'running'
})

const passedCount = computed(() => steps.value.filter((s) => s.state === 'pass').length)
const totalMs = computed(() => steps.value.reduce((s, x) => s + x.ms, 0))

const formatMs = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`)

const run = async () => {
  running.value = true
  runId.value = Math.random().toString(36).slice(2, 8)
  steps.value = steps.value.map((s) => ({ ...s, state: 'idle', ms: 0, result: undefined }))

  for (let i = 0; i < steps.value.length; i++) {
    const step = steps.value[i]!
    step.state = 'running'
    const dur = 200 + Math.floor(Math.random() * 420)
    await new Promise((r) => setTimeout(r, dur))
    step.ms = dur
    const isFailCandidate = i === 5 && Math.random() < 0.18
    if (isFailCandidate) {
      step.state = 'fail'
      step.result =
        'Expected file in /var/spool/asterisk/monitor/smoke/ after 2 s — none found. Check MixMonitor filename template.'
      break
    } else {
      step.state = 'pass'
      step.result = stepResult(step.id)
    }
  }
  running.value = false
  lastRun.value = new Date().toISOString().replace('T', ' ').slice(0, 19)
}

const stepResult = (id: string): string | undefined => {
  switch (id) {
    case 'ami-connect':
      return 'AMI authenticated as smoke-bot (permissions: originate, monitor)'
    case 'originate':
      return 'ActionID=ORIG-smoke-001 — Response: Success'
    case 'answered':
      return 'Channel PJSIP/smoke-bot-0000007a reached Up after 1.1 s'
    case 'mixmonitor':
      return 'MixMonitor file: /var/spool/asterisk/monitor/smoke/smoke-001.wav'
    case 'hangup':
      return 'Cause=16 · duration 3.0 s · billsec 3'
    case 'file-exists':
      return 'File 47.8 KB at t+0.4 s after hangup'
    case 'file-format':
      return 'WAV PCM · 16000 Hz · 1 ch · 3.02 s'
    case 'cleanup':
      return 'Deleted · monitor dir clean'
  }
}
</script>

<style scoped>
.hc {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --pass: #047857;
  --fail: #b91c1c;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.hc__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.hc__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.hc__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.hc__stamp {
  font-family: var(--mono);
  font-size: 0.86rem;
  color: var(--accent);
}

.hc__run {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  border-radius: 2px;
  padding: 0.5rem 0.85rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.hc__run:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
}
.hc__run:disabled {
  opacity: 0.7;
  cursor: progress;
}
.hc__run-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--accent);
}
.hc__run--running {
  background: var(--accent);
  border-color: var(--accent);
}
.hc__run--running .hc__run-dot {
  background: var(--paper);
  animation: hc-blink 1s steps(2, start) infinite;
}
@keyframes hc-blink {
  50% {
    opacity: 0.2;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hc__run--running .hc__run-dot {
    animation: none;
  }
}

.hc__summary {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.8rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid var(--rule);
  border-left-width: 3px;
  border-radius: 2px;
  background: var(--paper);
}
.hc__summary--pass {
  border-left-color: var(--pass);
  background: color-mix(in srgb, var(--pass) 5%, var(--paper));
}
.hc__summary--fail {
  border-left-color: var(--fail);
  background: color-mix(in srgb, var(--fail) 5%, var(--paper));
}
.hc__summary--running {
  border-left-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, var(--paper));
}
.hc__summary--idle {
  border-left-color: var(--rule);
  opacity: 0.85;
}

.hc__summary-icon {
  font-size: 1.6rem;
  font-weight: 700;
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--paper);
  border: 2px solid currentColor;
  color: var(--muted);
}
.hc__summary--pass .hc__summary-icon {
  color: var(--pass);
}
.hc__summary--fail .hc__summary-icon {
  color: var(--fail);
}
.hc__summary--running .hc__summary-icon {
  color: var(--accent);
  animation: hc-spin 1.2s linear infinite;
}
@keyframes hc-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .hc__summary--running .hc__summary-icon {
    animation: none;
  }
}

.hc__summary-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.hc__summary-title {
  font-size: 0.95rem;
  font-weight: 700;
}
.hc__summary-hint {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.hc__summary-id {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  padding: 0.25rem 0.45rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}

.hc__steps {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.hc__steps-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.hc__step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.hc__step {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  align-items: start;
}
.hc__step--pass {
  border-left: 3px solid var(--pass);
}
.hc__step--fail {
  border-left: 3px solid var(--fail);
  background: color-mix(in srgb, var(--fail) 4%, var(--paper));
}
.hc__step--running {
  border-left: 3px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 4%, var(--paper));
}
.hc__step--idle {
  opacity: 0.75;
}
.hc__step--skipped {
  opacity: 0.5;
}

.hc__step-num {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--muted);
  padding-top: 0.15rem;
  font-variant-numeric: tabular-nums;
}
.hc__step-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.hc__step-head {
  display: inline-flex;
  gap: 0.5rem;
  align-items: baseline;
  flex-wrap: wrap;
}
.hc__step-name {
  font-weight: 600;
  font-size: 0.88rem;
}
.hc__step-assert {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--accent);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  padding: 0.05rem 0.3rem;
  border-radius: 2px;
}
.hc__step-desc {
  margin: 0;
  font-size: 0.76rem;
  color: var(--muted);
  line-height: 1.45;
}
.hc__step-result {
  margin: 0.15rem 0 0;
  font-family: var(--mono);
  font-size: 0.68rem;
  padding: 0.2rem 0.45rem;
  border-left: 2px solid currentColor;
  line-height: 1.4;
}
.hc__step-result--pass {
  color: var(--pass);
  background: color-mix(in srgb, var(--pass) 6%, transparent);
}
.hc__step-result--fail {
  color: var(--fail);
  background: color-mix(in srgb, var(--fail) 6%, transparent);
}
.hc__step-time {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  padding-top: 0.15rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.hc__config {
  padding: 0.7rem 0.85rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.hc__config-title {
  display: block;
  margin-bottom: 0.4rem;
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.hc__config-list {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.15rem 0.7rem;
}
.hc__config-list dt {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}
.hc__config-list dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--ink);
}
.hc__config-list code {
  font-family: inherit;
}
</style>
