<template>
  <div class="pip">
    <header class="pip__head">
      <div>
        <span class="pip__eyebrow">Video PiP · {{ remote.name }}</span>
        <h3 class="pip__title">{{ duration }} · {{ resolution }}</h3>
      </div>
      <span class="pip__state" :class="`pip__state--${state}`">{{ state.toUpperCase() }}</span>
    </header>

    <div class="pip__stage">
      <div class="pip__video" :aria-label="`Video from ${remote.name}`">
        <div class="pip__video-initials">{{ initials(remote.name) }}</div>
        <div class="pip__video-label">{{ remote.name }}</div>
        <div class="pip__self" :aria-label="'Self preview'">
          <span>You</span>
        </div>
      </div>

      <div v-if="state === 'pip'" class="pip__pip" role="dialog" aria-label="Picture-in-Picture window">
        <div class="pip__pip-chrome">
          <span>PiP · {{ remote.name }}</span>
          <button type="button" class="pip__pip-x" aria-label="Close PiP" @click="state = 'inline'">×</button>
        </div>
        <div class="pip__pip-body">
          <div class="pip__video-initials pip__video-initials--small">{{ initials(remote.name) }}</div>
        </div>
        <div class="pip__pip-controls">
          <button type="button" class="pip__icon" aria-label="Mute">🔇</button>
          <button type="button" class="pip__icon pip__icon--danger" aria-label="End call">✕</button>
        </div>
      </div>
    </div>

    <section class="pip__actions">
      <button
        type="button"
        class="pip__btn pip__btn--primary"
        :disabled="state === 'pip'"
        @click="state = 'pip'"
      >Enter PiP</button>
      <button
        type="button"
        class="pip__btn"
        :disabled="state !== 'pip'"
        @click="state = 'inline'"
      >Exit PiP</button>
      <button type="button" class="pip__btn" @click="state = 'document'">Document PiP</button>
      <span class="pip__info">Chromium · <code>documentPictureInPicture</code> supported · iOS Safari uses <code>requestPictureInPicture()</code></span>
    </section>

    <footer class="pip__foot">
      <span>
        Video-only PiP is <code>video.requestPictureInPicture()</code>. Document PiP opens a full Vue tree in the floating window,
        which is how you get call controls that survive tabbing away.
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

type State = 'inline' | 'pip' | 'document'

const remote = { name: 'Priya Patel' }
const resolution = '1280×720 @ 30fps'
const state = ref<State>('inline')
const duration = ref('00:02:14')

const initials = (n: string) => n.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()

let secs = 134
const t = window.setInterval(() => {
  secs += 1
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  duration.value = `00:${m}:${s}`
}, 1000)
onBeforeUnmount(() => clearInterval(t))
</script>

<style scoped>
.pip {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.85rem;
  color: var(--ink); font-family: var(--sans);
}

.pip__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.pip__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.pip__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.pip__state {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.55rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.pip__state--inline { color: var(--muted); }
.pip__state--pip { color: var(--accent); border-color: var(--accent); }
.pip__state--document { color: #15803d; border-color: #15803d; }

.pip__stage { position: relative; }
.pip__video {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #2a1f17, #151210);
  border: 1px solid var(--rule); border-radius: 2px;
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.pip__video-initials {
  width: 5rem; height: 5rem; border-radius: 50%;
  background: var(--accent); color: var(--paper);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-weight: 700; font-size: 1.4rem;
  letter-spacing: 0.04em;
}
.pip__video-initials--small { width: 2.5rem; height: 2.5rem; font-size: 0.7rem; }
.pip__video-label {
  position: absolute; bottom: 0.5rem; left: 0.5rem;
  padding: 0.2rem 0.45rem;
  background: rgba(0,0,0,0.45); color: var(--paper);
  font-family: var(--mono); font-size: 0.7rem;
  border-radius: 2px;
}
.pip__self {
  position: absolute; right: 0.5rem; bottom: 0.5rem;
  width: 22%; aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #3a2e24, #1f1a15);
  border: 1px solid #4a3a2a; border-radius: 2px;
  display: flex; align-items: center; justify-content: center;
  color: var(--paper); font-family: var(--mono); font-size: 0.66rem;
  letter-spacing: 0.04em;
}

.pip__pip {
  position: absolute; right: 1rem; bottom: 1rem;
  width: 220px;
  background: #151210; color: var(--paper);
  border: 1px solid #332820; border-radius: 2px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.pip__pip-chrome {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.35rem 0.5rem;
  font-family: var(--mono); font-size: 0.66rem; color: #c2a37a;
  background: #1f1a15;
  border-bottom: 1px solid #332820;
}
.pip__pip-x {
  background: transparent; border: 0;
  color: #c2a37a; font-size: 1rem; cursor: pointer;
  padding: 0 0.25rem;
}
.pip__pip-body {
  aspect-ratio: 16 / 9;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #2a1f17, #151210);
}
.pip__pip-controls {
  display: flex; justify-content: flex-end; gap: 0.3rem;
  padding: 0.35rem 0.5rem;
  background: #1f1a15;
  border-top: 1px solid #332820;
}

.pip__actions { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.pip__btn {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.85rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink); cursor: pointer;
}
.pip__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pip__btn--primary { background: var(--accent); border-color: var(--accent); color: var(--paper); }
.pip__info {
  margin-left: auto;
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
}
.pip__info code {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.25rem; color: var(--accent);
}

.pip__icon {
  background: transparent; border: 1px solid #332820; border-radius: 2px;
  width: 1.75rem; height: 1.5rem;
  font-size: 0.75rem; cursor: pointer;
  color: #c2a37a;
}
.pip__icon--danger { color: #ef4444; border-color: #7f1d1d; }

.pip__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.pip__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
