<template>
  <div class="cmp">
    <header class="cmp__head">
      <div>
        <span class="cmp__eyebrow">Meeting presets</span>
        <h3 class="cmp__title">Mute-on-join, idle-mute, mic gating</h3>
      </div>
    </header>

    <section class="cmp__section">
      <span class="cmp__section-title">Presets</span>
      <div class="cmp__presets" role="radiogroup" aria-label="Meeting preset">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          class="cmp__preset"
          :class="{ 'cmp__preset--on': active === p.id }"
          role="radio"
          :aria-checked="active === p.id"
          @click="apply(p.id)"
        >
          <span class="cmp__preset-name">{{ p.name }}</span>
          <span class="cmp__preset-desc">{{ p.desc }}</span>
          <span class="cmp__preset-tag">{{ p.tag }}</span>
        </button>
      </div>
    </section>

    <section class="cmp__section">
      <span class="cmp__section-title">Active settings</span>
      <ul class="cmp__opts" role="list">
        <li class="cmp__opt">
          <label class="cmp__opt-label">
            <input type="checkbox" v-model="settings.muteOnJoin" />
            <span>Mute on join</span>
          </label>
          <span class="cmp__opt-hint">
            Send initial <code>INVITE</code> with <code>a=sendonly</code> until the user explicitly unmutes.
          </span>
        </li>
        <li class="cmp__opt">
          <label class="cmp__opt-label">
            <input type="checkbox" v-model="settings.idleMute" />
            <span>Auto-mute after idle</span>
          </label>
          <div class="cmp__opt-sub">
            <label>
              <span class="cmp__sub-label">Idle for</span>
              <input
                type="number"
                v-model.number="settings.idleMinutes"
                min="1"
                max="60"
                :disabled="!settings.idleMute"
                class="cmp__num"
              />
              <span class="cmp__unit">min</span>
            </label>
            <span class="cmp__opt-hint">
              Kicks in after no detected voice activity. Defeatable by the user for one-off pauses.
            </span>
          </div>
        </li>
        <li class="cmp__opt">
          <label class="cmp__opt-label">
            <input type="checkbox" v-model="settings.micGate" />
            <span>Mic gate (noise floor)</span>
          </label>
          <div class="cmp__opt-sub">
            <label>
              <span class="cmp__sub-label">Threshold</span>
              <input
                type="range"
                v-model.number="settings.gateDb"
                min="-70"
                max="-20"
                step="1"
                :disabled="!settings.micGate"
                class="cmp__range"
              />
              <span class="cmp__unit">{{ settings.gateDb }} dB</span>
            </label>
            <span class="cmp__opt-hint">
              Below the threshold the mic is gated to silence. Keeps fridge-hum out of the mix without muting the whole line.
            </span>
          </div>
        </li>
        <li class="cmp__opt">
          <label class="cmp__opt-label">
            <input type="checkbox" v-model="settings.selfView" />
            <span>Self-view indicator</span>
          </label>
          <span class="cmp__opt-hint">Show a pulsing dot + waveform so the user can see they\'re live.</span>
        </li>
        <li class="cmp__opt">
          <label class="cmp__opt-label">
            <input type="checkbox" v-model="settings.whisperUnmute" />
            <span>Whisper-unmute warning</span>
          </label>
          <span class="cmp__opt-hint">
            Detect talking-while-muted (speech above threshold for ≥1s) and show a nudge — saves the "you\'re on mute" moment.
          </span>
        </li>
      </ul>
    </section>

    <section class="cmp__section">
      <span class="cmp__section-title">Meter</span>
      <div class="cmp__meter">
        <div class="cmp__meter-track" aria-hidden="true">
          <div class="cmp__meter-threshold" :style="{ left: thresholdPct + '%' }" />
          <div class="cmp__meter-fill" :style="{ width: levelPct + '%' }" :class="{ 'cmp__meter-fill--gated': isGated }" />
        </div>
        <div class="cmp__meter-tags">
          <span class="cmp__meter-tag">{{ levelDb }} dB</span>
          <span class="cmp__meter-tag cmp__meter-tag--accent">gate {{ settings.gateDb }} dB</span>
          <span class="cmp__meter-tag">{{ isGated ? 'gated' : 'open' }}</span>
        </div>
      </div>
    </section>

    <footer class="cmp__summary">
      <span class="cmp__summary-title">Outgoing SDP direction</span>
      <code class="cmp__summary-val">a={{ muteDirection }}</code>
      <span class="cmp__summary-hint">{{ directionHint }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

type PresetId = 'meeting' | 'call-centre' | 'presentation' | 'custom'

const presets: { id: PresetId; name: string; desc: string; tag: string }[] = [
  { id: 'meeting', name: 'Meeting', desc: 'Mute on join, gate noise, whisper-unmute warning on.', tag: 'DEFAULT' },
  { id: 'call-centre', name: 'Call centre', desc: 'Open on join, auto-mute after 10m idle, aggressive gate.', tag: 'AGENT' },
  { id: 'presentation', name: 'Presentation', desc: 'Open, no idle-mute, self-view prominent.', tag: 'HOST' },
  { id: 'custom', name: 'Custom', desc: 'Your current configuration.', tag: 'YOURS' },
]

const settings = reactive({
  muteOnJoin: true,
  idleMute: true,
  idleMinutes: 10,
  micGate: true,
  gateDb: -50,
  selfView: true,
  whisperUnmute: true,
})

const active = ref<PresetId>('meeting')

const apply = (id: PresetId) => {
  active.value = id
  if (id === 'meeting') Object.assign(settings, { muteOnJoin: true, idleMute: true, idleMinutes: 10, micGate: true, gateDb: -50, selfView: true, whisperUnmute: true })
  if (id === 'call-centre') Object.assign(settings, { muteOnJoin: false, idleMute: true, idleMinutes: 10, micGate: true, gateDb: -38, selfView: false, whisperUnmute: false })
  if (id === 'presentation') Object.assign(settings, { muteOnJoin: false, idleMute: false, idleMinutes: 10, micGate: false, gateDb: -50, selfView: true, whisperUnmute: true })
}

const levelDb = ref(-60)
const isGated = computed(() => settings.micGate && levelDb.value < settings.gateDb)
const levelPct = computed(() => Math.max(0, Math.min(100, ((levelDb.value + 70) / 50) * 100)))
const thresholdPct = computed(() => Math.max(0, Math.min(100, ((settings.gateDb + 70) / 50) * 100)))

let meterTimer: number | undefined
onMounted(() => {
  meterTimer = window.setInterval(() => {
    const talking = Math.random() > 0.55
    const base = talking ? -35 + (Math.random() - 0.5) * 10 : -62 + (Math.random() - 0.5) * 8
    levelDb.value = Math.round(base)
  }, 180)
})
onBeforeUnmount(() => {
  if (meterTimer) clearInterval(meterTimer)
})

const muteDirection = computed(() => (settings.muteOnJoin ? 'sendonly' : 'sendrecv'))
const directionHint = computed(() =>
  settings.muteOnJoin
    ? 'Client sends audio, remote treats us as muted; we still receive RTP.'
    : 'Fully bidirectional from the first RTP packet.'
)
</script>

<style scoped>
.cmp {
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
.cmp__head { display: flex; justify-content: space-between; align-items: flex-end; }
.cmp__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.cmp__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.cmp__section { display: flex; flex-direction: column; gap: 0.45rem; }
.cmp__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.cmp__presets {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.4rem;
}
.cmp__preset {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem 0.75rem; cursor: pointer; text-align: left;
  display: flex; flex-direction: column; gap: 0.2rem; color: var(--ink);
  font-family: var(--sans); transition: all 0.12s; position: relative;
}
.cmp__preset:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.cmp__preset--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.cmp__preset-name { font-weight: 600; font-size: 0.88rem; }
.cmp__preset-desc { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); line-height: 1.4; }
.cmp__preset-tag {
  position: absolute; top: 0.5rem; right: 0.55rem;
  font-family: var(--mono); font-size: 0.55rem; letter-spacing: 0.12em;
  padding: 0.1rem 0.35rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.cmp__preset--on .cmp__preset-tag { background: var(--accent); color: var(--paper); border-color: var(--accent); }

.cmp__opts { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.cmp__opt {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.75rem; display: flex; flex-direction: column; gap: 0.2rem;
}
.cmp__opt-label {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-size: 0.88rem; cursor: pointer;
}
.cmp__opt-label input { accent-color: var(--accent); }
.cmp__opt-hint {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
  padding-left: 1.5rem; line-height: 1.4;
}
.cmp__opt-hint code {
  padding: 0 0.3rem; background: var(--paper-deep);
  border: 1px solid var(--rule); border-radius: 2px; color: var(--accent);
}
.cmp__opt-sub {
  padding-left: 1.5rem; display: flex; flex-direction: column; gap: 0.25rem;
}
.cmp__opt-sub label {
  display: inline-flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;
}
.cmp__sub-label {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); min-width: 6ch;
}
.cmp__num {
  width: 4rem; padding: 0.25rem 0.45rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.8rem; font-variant-numeric: tabular-nums; color: var(--ink);
}
.cmp__num:disabled { opacity: 0.5; }
.cmp__num:focus { outline: none; border-color: var(--accent); }
.cmp__range { flex: 1; min-width: 8rem; accent-color: var(--accent); }
.cmp__range:disabled { opacity: 0.5; }
.cmp__unit {
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
  letter-spacing: 0.05em; font-variant-numeric: tabular-nums;
}

.cmp__meter { display: flex; flex-direction: column; gap: 0.3rem; }
.cmp__meter-track {
  position: relative; height: 0.7rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px; overflow: hidden;
}
.cmp__meter-fill {
  height: 100%; background: var(--ok); transition: width 0.1s ease;
}
.cmp__meter-fill--gated { background: var(--muted); }
.cmp__meter-threshold {
  position: absolute; top: 0; bottom: 0; width: 2px;
  background: var(--accent); box-shadow: 0 0 0 1px var(--paper);
}
.cmp__meter-tags { display: inline-flex; gap: 0.5rem; flex-wrap: wrap; }
.cmp__meter-tag {
  font-family: var(--mono); font-size: 0.62rem;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
  padding: 0.15rem 0.4rem; background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  font-variant-numeric: tabular-nums;
}
.cmp__meter-tag--accent { color: var(--accent); border-color: var(--accent); }

.cmp__summary {
  display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
  padding: 0.65rem 0.8rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
}
.cmp__summary-title {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cmp__summary-val {
  font-family: var(--mono); font-size: 0.9rem; font-weight: 700;
  color: var(--accent);
  padding: 0.15rem 0.45rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
}
.cmp__summary-hint {
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
</style>
