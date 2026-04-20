<template>
  <div class="grt">
    <header class="grt__head">
      <div>
        <span class="grt__eyebrow">Greeting recorder</span>
        <h3 class="grt__title">
          Active: <code class="grt__active">{{ activeName }}</code>
        </h3>
      </div>
    </header>

    <section class="grt__section">
      <span class="grt__section-title">Per-state greeting</span>
      <ul class="grt__states" role="list">
        <li
          v-for="g in greetings"
          :key="g.id"
          class="grt__state"
          :class="{ 'grt__state--active': activeId === g.id, 'grt__state--empty': !g.recorded }"
        >
          <div class="grt__state-body">
            <div class="grt__state-head">
              <span class="grt__state-name">{{ g.name }}</span>
              <code class="grt__state-trigger">{{ g.trigger }}</code>
              <span v-if="!g.recorded" class="grt__pill grt__pill--missing">Not recorded</span>
              <span v-else class="grt__pill grt__pill--ok">{{ formatDuration(g.duration) }}</span>
            </div>
            <p class="grt__state-desc">{{ g.desc }}</p>
            <p v-if="g.script" class="grt__script">"{{ g.script }}"</p>
          </div>
          <div class="grt__state-tools">
            <button
              type="button"
              class="grt__record"
              :class="{ 'grt__record--on': recordingId === g.id }"
              @click="toggleRecord(g.id)"
              :aria-pressed="recordingId === g.id"
            >
              <span class="grt__record-dot" aria-hidden="true" />
              {{ recordingId === g.id ? 'Recording…' : g.recorded ? 'Re-record' : 'Record' }}
            </button>
            <button
              type="button"
              class="grt__play"
              :disabled="!g.recorded"
              :aria-label="`Play ${g.name}`"
              @click="preview(g.id)"
            >{{ previewId === g.id ? '‖' : '▶' }}</button>
            <button
              type="button"
              class="grt__set"
              :class="{ 'grt__set--on': activeId === g.id }"
              :disabled="!g.recorded"
              :aria-pressed="activeId === g.id"
              @click="activeId = g.id"
            >{{ activeId === g.id ? 'Default' : 'Set default' }}</button>
          </div>
        </li>
      </ul>
    </section>

    <section class="grt__section">
      <span class="grt__section-title">Fallback behaviour</span>
      <div class="grt__fallback" role="radiogroup" aria-label="Fallback behaviour">
        <button
          v-for="f in fallbacks"
          :key="f.id"
          type="button"
          class="grt__fallback-btn"
          :class="{ 'grt__fallback-btn--on': fallback === f.id }"
          role="radio"
          :aria-checked="fallback === f.id"
          @click="fallback = f.id"
        >
          <span class="grt__fallback-label">{{ f.label }}</span>
          <span class="grt__fallback-desc">{{ f.desc }}</span>
        </button>
      </div>
    </section>

    <section class="grt__section grt__section--dial">
      <span class="grt__section-title">Dialplan preview</span>
      <pre class="grt__dial"><code>{{ dialPreview }}</code></pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

interface Greeting {
  id: string
  name: string
  trigger: string
  desc: string
  script?: string
  recorded: boolean
  duration: number
}

const greetings = ref<Greeting[]>([
  {
    id: 'default',
    name: 'Default greeting',
    trigger: 'catch-all',
    desc: 'Plays when no other state matches.',
    script: 'Hi, you\'ve reached Priya. I\'m unable to take your call — leave a message with your name and number and I\'ll get back to you.',
    recorded: true,
    duration: 14,
  },
  {
    id: 'busy',
    name: 'Busy',
    trigger: 'sip-486',
    desc: 'Plays when all lines are engaged (486 Busy Here upstream).',
    script: 'I\'m on another call right now — please leave a message or try again shortly.',
    recorded: true,
    duration: 9,
  },
  {
    id: 'away',
    name: 'Away',
    trigger: 'presence=away',
    desc: 'Triggered by presence state (step away, do-not-disturb).',
    script: 'I\'m away from my desk. For urgent matters, email me at priya@example.com.',
    recorded: true,
    duration: 11,
  },
  {
    id: 'afterhours',
    name: 'After-hours',
    trigger: 'time not in business_hours',
    desc: 'Plays outside 09:00–17:00 local time; falls through to default on weekends.',
    recorded: false,
    duration: 0,
  },
  {
    id: 'holiday',
    name: 'Holiday',
    trigger: 'date in holiday_list',
    desc: 'Seasonal / statutory holiday override.',
    recorded: false,
    duration: 0,
  },
])

const activeId = ref<string>('default')
const activeName = computed(() => greetings.value.find((g) => g.id === activeId.value)?.name ?? '—')

const recordingId = ref<string | null>(null)
const previewId = ref<string | null>(null)
let recordTimer: ReturnType<typeof setTimeout> | null = null

const toggleRecord = (id: string) => {
  if (recordingId.value === id) {
    const g = greetings.value.find((x) => x.id === id)
    if (g) {
      g.recorded = true
      g.duration = 12
    }
    recordingId.value = null
    if (recordTimer) clearTimeout(recordTimer)
  } else {
    recordingId.value = id
    recordTimer = setTimeout(() => {
      const g = greetings.value.find((x) => x.id === id)
      if (g) {
        g.recorded = true
        g.duration = 12
      }
      recordingId.value = null
    }, 3500)
  }
}
onBeforeUnmount(() => {
  if (recordTimer) clearTimeout(recordTimer)
})

const preview = (id: string) => {
  previewId.value = previewId.value === id ? null : id
}

const fallbacks = [
  { id: 'voicemail' as const, label: 'Take a message', desc: 'Caller records; transcribed to inbox (default).' },
  { id: 'announcement' as const, label: 'Announcement only', desc: 'Plays greeting, disconnects — no message recorded.' },
  { id: 'forward' as const, label: 'Forward to mobile', desc: 'Bridges to +1-415-555-0199 after greeting.' },
  { id: 'ring' as const, label: 'Keep ringing', desc: 'No voicemail at all — 180 Ringing indefinitely.' },
]
const fallback = ref<'voicemail' | 'announcement' | 'forward' | 'ring'>('voicemail')

const dialPreview = computed(() => [
  '# Asterisk dialplan excerpt',
  'exten => priya,1,NoOp(Voicemail fallback chain)',
  greetings.value.filter((g) => g.recorded && g.id !== 'default').map((g) => `  same => n,ExecIf($[${g.trigger}]?Playback(greet-${g.id}))`).join('\n'),
  `  same => n,Playback(greet-${activeId.value})`,
  fallback.value === 'voicemail' ? '  same => n,VoiceMail(priya@default,u)  ; "u" = unavail, leave message' :
  fallback.value === 'announcement' ? '  same => n,Hangup()' :
  fallback.value === 'forward' ? '  same => n,Dial(PJSIP/+14155550199,30,g)' :
  '  same => n,WaitExten(300)',
].filter(Boolean).join('\n'))

const formatDuration = (sec: number): string => `${sec}s`
</script>

<style scoped>
.grt {
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

.grt__head {
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.grt__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.grt__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.grt__active { font-family: var(--mono); font-size: 0.88rem; color: var(--accent); }

.grt__section { display: flex; flex-direction: column; gap: 0.5rem; }
.grt__section-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.grt__states { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.grt__state {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.7rem;
  padding: 0.7rem 0.85rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.grt__state--active { border-left: 3px solid var(--accent); background: color-mix(in srgb, var(--accent) 5%, var(--paper)); }
.grt__state--empty { opacity: 0.78; }

.grt__state-body { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.grt__state-head { display: inline-flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
.grt__state-name { font-weight: 600; font-size: 0.9rem; }
.grt__state-trigger { font-family: var(--mono); font-size: 0.68rem; color: var(--accent); background: var(--paper-deep); border: 1px solid var(--rule); padding: 0.05rem 0.3rem; border-radius: 2px; }
.grt__pill {
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  border: 1px solid var(--rule);
}
.grt__pill--ok { color: #047857; border-color: #047857; }
.grt__pill--missing { color: var(--muted); background: var(--paper-deep); }
.grt__state-desc { margin: 0; font-size: 0.76rem; color: var(--muted); line-height: 1.45; }
.grt__script { margin: 0.25rem 0 0; font-size: 0.8rem; font-style: italic; color: var(--ink); padding: 0.35rem 0.5rem; background: var(--paper-deep); border-left: 2px solid var(--rule); border-radius: 0 2px 2px 0; line-height: 1.5; }

.grt__state-tools { display: inline-flex; flex-direction: column; gap: 0.3rem; align-items: stretch; min-width: 9rem; }
.grt__record {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: var(--accent);
  color: var(--paper);
  border: 1px solid var(--accent);
  border-radius: 2px;
  padding: 0.4rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.grt__record:hover { background: var(--ink); border-color: var(--ink); }
.grt__record--on { background: var(--ink); border-color: var(--ink); }
.grt__record-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--paper); }
.grt__record--on .grt__record-dot { animation: grt-blink 0.9s steps(2, start) infinite; }
@keyframes grt-blink { 50% { opacity: 0.2; } }
@media (prefers-reduced-motion: reduce) { .grt__record--on .grt__record-dot { animation: none; } }

.grt__play, .grt__set {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.grt__play:hover:not(:disabled),
.grt__set:hover:not(:disabled) { color: var(--ink); border-color: var(--ink); }
.grt__play:disabled,
.grt__set:disabled { opacity: 0.4; cursor: not-allowed; }
.grt__set--on { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }

.grt__fallback { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0.35rem; }
.grt__fallback-btn {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.55rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
}
.grt__fallback-btn:hover { border-color: var(--ink); }
.grt__fallback-btn--on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.grt__fallback-btn--on .grt__fallback-desc { color: color-mix(in srgb, var(--paper) 70%, transparent); }
.grt__fallback-label { font-weight: 600; font-size: 0.85rem; }
.grt__fallback-desc { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.05em; color: var(--muted); }

.grt__dial {
  margin: 0;
  padding: 0.7rem 0.85rem;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
  line-height: 1.55;
  overflow: auto;
  max-height: 14rem;
}
</style>
