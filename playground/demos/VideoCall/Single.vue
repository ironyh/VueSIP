<template>
  <div class="vsingle">
    <div class="vsingle__stage" :class="{ 'vsingle__stage--pip': layout === 'pip' }">
      <div class="vsingle__remote" :aria-label="`Remote video of ${remoteName}`">
        <div class="vsingle__placeholder" aria-hidden="true">
          <span class="vsingle__pulse"></span>
          <span class="vsingle__initials">{{ initials(remoteName) }}</span>
        </div>
        <span class="vsingle__remote-label">{{ remoteName }}</span>
        <span class="vsingle__quality" :class="`vsingle__quality--${quality}`">
          <span class="vsingle__q-dot" aria-hidden="true"></span>
          {{
            quality === 'good' ? 'HD · 30 fps' : quality === 'fair' ? 'SD · 24 fps' : 'Low · 15 fps'
          }}
        </span>
      </div>

      <div class="vsingle__self" :class="{ 'vsingle__self--off': selfOff }">
        <template v-if="selfOff">
          <span class="vsingle__self-off">Camera off</span>
        </template>
        <template v-else>
          <span class="vsingle__self-grid" aria-hidden="true">
            <span
              v-for="n in 6"
              :key="n"
              class="vsingle__self-bar"
              :style="{ height: `${20 + ((n * 9) % 60)}%` }"
            ></span>
          </span>
          <span class="vsingle__self-label">You</span>
        </template>
      </div>
    </div>

    <div class="vsingle__bar">
      <button
        type="button"
        class="vsingle__btn"
        :class="{ 'vsingle__btn--off': muted }"
        @click="muted = !muted"
        :aria-pressed="muted"
      >
        <span aria-hidden="true">{{ muted ? '🎙' : '🎙' }}</span>
        <span>{{ muted ? 'Unmute' : 'Mute' }}</span>
      </button>
      <button
        type="button"
        class="vsingle__btn"
        :class="{ 'vsingle__btn--off': selfOff }"
        @click="selfOff = !selfOff"
        :aria-pressed="selfOff"
      >
        <span aria-hidden="true">📹</span>
        <span>{{ selfOff ? 'Start video' : 'Stop video' }}</span>
      </button>
      <button
        type="button"
        class="vsingle__btn"
        @click="layout = layout === 'pip' ? 'stacked' : 'pip'"
      >
        <span aria-hidden="true">◱</span>
        <span>{{ layout === 'pip' ? 'Stack layout' : 'PiP layout' }}</span>
      </button>
      <button
        type="button"
        class="vsingle__btn"
        @click="cycleCamera"
        :disabled="cameras.length < 2"
      >
        <span aria-hidden="true">↻</span>
        <span>{{ currentCam.label }}</span>
      </button>
      <button type="button" class="vsingle__btn vsingle__btn--end">
        <span aria-hidden="true">✕</span>
        <span>End</span>
      </button>
    </div>

    <dl class="vsingle__specs">
      <div>
        <dt>Resolution</dt>
        <dd>1280 × 720</dd>
      </div>
      <div>
        <dt>Bitrate</dt>
        <dd>1.2 Mbps</dd>
      </div>
      <div>
        <dt>Codec</dt>
        <dd>VP9</dd>
      </div>
      <div>
        <dt>RTT</dt>
        <dd>48 ms</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const remoteName = 'Alex Rivera'
const muted = ref(false)
const selfOff = ref(false)
const layout = ref<'pip' | 'stacked'>('pip')
const quality = ref<'good' | 'fair' | 'poor'>('good')

const cameras = [
  { id: 'front', label: 'Front camera' },
  { id: 'back', label: 'Back camera' },
  { id: 'external', label: 'Logitech C920' },
]
const camIndex = ref(0)
const currentCam = computed(() => cameras[camIndex.value])
const cycleCamera = () => {
  camIndex.value = (camIndex.value + 1) % cameras.length
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
</script>

<style scoped>
.vsingle {
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
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.vsingle__stage {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #0b0805;
  border: 1px solid var(--ink);
  border-radius: 2px;
  overflow: hidden;
}
.vsingle__remote {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vsingle__placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.vsingle__pulse {
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--accent) 60%, transparent);
  animation: vsingle-pulse 2.2s ease-in-out infinite;
}
@keyframes vsingle-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.18);
    opacity: 0.15;
  }
}
.vsingle__initials {
  width: 112px;
  height: 112px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 22%, #0b0805);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.vsingle__remote-label {
  position: absolute;
  left: 0.75rem;
  bottom: 0.65rem;
  font-family: var(--mono);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--paper) 85%, transparent);
  background: color-mix(in srgb, #000 50%, transparent);
  padding: 0.25rem 0.55rem;
  border-radius: 2px;
  backdrop-filter: blur(4px);
}
.vsingle__quality {
  position: absolute;
  right: 0.75rem;
  top: 0.65rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--paper) 75%, transparent);
  background: color-mix(in srgb, #000 50%, transparent);
  padding: 0.25rem 0.55rem;
  border-radius: 2px;
}
.vsingle__q-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #48bb78;
}
.vsingle__quality--fair .vsingle__q-dot {
  background: #eab308;
}
.vsingle__quality--poor .vsingle__q-dot {
  background: var(--accent);
}

.vsingle__self {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  width: 28%;
  max-width: 220px;
  aspect-ratio: 4 / 3;
  background: #1a1410;
  border: 1px solid color-mix(in srgb, var(--paper) 20%, transparent);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, var(--paper) 60%, transparent);
  overflow: hidden;
}
.vsingle__stage--pip .vsingle__self {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.vsingle__self-grid {
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
  height: 50%;
}
.vsingle__self-bar {
  width: 5px;
  background: color-mix(in srgb, var(--accent) 55%, transparent);
  border-radius: 1px;
}
.vsingle__self-label {
  position: absolute;
  left: 0.4rem;
  bottom: 0.4rem;
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--paper) 65%, transparent);
}
.vsingle__self-off {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.vsingle__bar {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.vsingle__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.12s;
}
.vsingle__btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.vsingle__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.vsingle__btn--off {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border-color: var(--accent);
}
.vsingle__btn--end {
  margin-left: auto;
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}
.vsingle__btn--end:hover:not(:disabled) {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.vsingle__specs {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
  background: var(--paper);
}
.vsingle__specs > div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.55rem 0.75rem;
  border-right: 1px solid var(--rule);
}
.vsingle__specs > div:last-child {
  border-right: 0;
}
.vsingle__specs dt {
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.vsingle__specs dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 620px) {
  .vsingle__specs {
    grid-template-columns: repeat(2, 1fr);
  }
  .vsingle__specs > div:nth-child(2) {
    border-right: 0;
  }
  .vsingle__specs > div:nth-child(3),
  .vsingle__specs > div:nth-child(4) {
    border-top: 1px solid var(--rule);
  }
}
</style>
