<template>
  <div class="grid-demo">
    <div class="grid-demo__head">
      <div>
        <span class="grid-demo__eyebrow">Speed-dial grid</span>
        <h3 class="grid-demo__title">Quick-call tiles</h3>
      </div>
      <div class="grid-demo__tools">
        <span class="grid-demo__filled">{{ filledCount }} / {{ MAX_SLOTS }} filled</span>
        <button
          type="button"
          class="grid-demo__reset"
          @click="clearAll"
          :disabled="filledCount === 0"
        >
          Clear all
        </button>
      </div>
    </div>

    <ul class="grid-demo__grid" role="list">
      <li v-for="(slot, idx) in speedDialSlots" :key="idx" class="grid-demo__cell">
        <button
          v-if="!slot"
          type="button"
          class="grid-demo__empty"
          @click="openDialog(idx)"
          :aria-label="`Add contact to slot ${idx + 1}`"
        >
          <span class="grid-demo__empty-plus" aria-hidden="true">+</span>
          <span class="grid-demo__empty-label">Add contact</span>
          <span class="grid-demo__empty-slot">Slot {{ idx + 1 }}</span>
        </button>

        <div
          v-else
          class="grid-demo__slot"
          :class="{ 'grid-demo__slot--calling': callingIndex === idx }"
        >
          <button
            type="button"
            class="grid-demo__dial"
            @click="dial(slot, idx)"
            :disabled="!canDial"
            :aria-label="`Call ${slot.name}`"
          >
            <span class="grid-demo__avatar">{{ initials(slot.name) }}</span>
            <span class="grid-demo__name">{{ slot.name }}</span>
            <span class="grid-demo__number">{{ slot.number }}</span>
          </button>

          <div class="grid-demo__slot-tools">
            <button
              type="button"
              class="grid-demo__slot-tool"
              @click="openDialog(idx)"
              aria-label="Edit contact"
              title="Edit"
            >
              ✎
            </button>
            <button
              type="button"
              class="grid-demo__slot-tool"
              @click="remove(idx)"
              aria-label="Remove contact"
              title="Remove"
            >
              ×
            </button>
          </div>
        </div>
      </li>
    </ul>

    <p v-if="statusMessage" class="grid-demo__status" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>

    <!-- Minimal inline editor sheet -->
    <div
      v-if="editingIndex !== null"
      class="grid-demo__sheet"
      role="dialog"
      aria-label="Edit speed dial slot"
    >
      <div class="grid-demo__sheet-head">
        <span class="grid-demo__sheet-eyebrow">
          Slot {{ editingIndex + 1 }} · {{ editingContact ? 'Edit' : 'New' }}
        </span>
        <button
          type="button"
          class="grid-demo__sheet-close"
          @click="closeDialog"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label class="grid-demo__field">
        <span class="grid-demo__field-label">Name</span>
        <input
          v-model="draft.name"
          type="text"
          placeholder="Front desk"
          class="grid-demo__field-input"
          @keyup.enter="save"
        />
      </label>

      <label class="grid-demo__field">
        <span class="grid-demo__field-label">SIP URI or number</span>
        <input
          v-model="draft.number"
          type="text"
          placeholder="sip:100@pbx.example.com"
          class="grid-demo__field-input"
          @keyup.enter="save"
        />
      </label>

      <div class="grid-demo__sheet-actions">
        <button
          type="button"
          class="grid-demo__sheet-primary"
          @click="save"
          :disabled="!draft.name.trim() || !draft.number.trim()"
        >
          Save contact
        </button>
        <button type="button" class="grid-demo__sheet-secondary" @click="closeDialog">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

interface SpeedDialContact {
  name: string
  number: string
}

const MAX_SLOTS = 9
const STORAGE_KEY = 'vuesip-speed-dial-grid'

const speedDialSlots = ref<(SpeedDialContact | null)[]>(Array(MAX_SLOTS).fill(null))
const editingIndex = ref<number | null>(null)
const editingContact = ref<SpeedDialContact | null>(null)
const draft = ref<SpeedDialContact>({ name: '', number: '' })
const callingIndex = ref<number | null>(null)
const statusMessage = ref('')
let statusTimer: ReturnType<typeof setTimeout> | null = null

const filledCount = computed(() => speedDialSlots.value.filter(Boolean).length)
const canDial = computed(() => callingIndex.value === null)

const flashStatus = (msg: string) => {
  statusMessage.value = msg
  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    statusMessage.value = ''
  }, 2400)
}

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      speedDialSlots.value = [
        { name: 'Front desk', number: 'sip:100@pbx.example.com' },
        { name: 'Alex Rivera', number: 'sip:alex@example.com' },
        { name: 'Sales', number: 'sip:200@pbx.example.com' },
        null,
        null,
        null,
        null,
        null,
        null,
      ]
      return
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length === MAX_SLOTS) {
      speedDialSlots.value = parsed
    }
  } catch {
    /* ignore */
  }
}

const save = () => {
  const name = draft.value.name.trim()
  const number = draft.value.number.trim()
  if (!name || !number || editingIndex.value === null) return
  speedDialSlots.value[editingIndex.value] = { name, number }
  persist()
  flashStatus(`Saved ${name} to slot ${editingIndex.value + 1}`)
  closeDialog()
}

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(speedDialSlots.value))
  } catch {
    /* ignore */
  }
}

const openDialog = (idx: number) => {
  editingIndex.value = idx
  const existing = speedDialSlots.value[idx]
  editingContact.value = existing
  draft.value = existing ? { ...existing } : { name: '', number: '' }
}

const closeDialog = () => {
  editingIndex.value = null
  editingContact.value = null
  draft.value = { name: '', number: '' }
}

const remove = (idx: number) => {
  const name = speedDialSlots.value[idx]?.name
  speedDialSlots.value[idx] = null
  persist()
  if (name) flashStatus(`Removed ${name}`)
}

const clearAll = () => {
  speedDialSlots.value = Array(MAX_SLOTS).fill(null)
  persist()
  flashStatus('Cleared all slots')
}

const dial = (contact: SpeedDialContact, idx: number) => {
  if (!canDial.value) return
  callingIndex.value = idx
  flashStatus(`Dialing ${contact.name}…`)
  setTimeout(() => {
    callingIndex.value = null
  }, 1200)
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'

onMounted(load)
</script>

<style scoped>
.grid-demo {
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

.grid-demo__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.grid-demo__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.grid-demo__title {
  margin: 0.1rem 0 0 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.005em;
}
.grid-demo__tools {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
}
.grid-demo__filled {
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
}
.grid-demo__reset {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--rule);
  padding: 0.3rem 0.7rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.12s;
}
.grid-demo__reset:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}
.grid-demo__reset:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.grid-demo__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
}
.grid-demo__cell {
  aspect-ratio: 1 / 1;
  min-height: 130px;
}

.grid-demo__empty,
.grid-demo__slot {
  width: 100%;
  height: 100%;
  border-radius: 2px;
  position: relative;
}
.grid-demo__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background: transparent;
  border: 1px dashed var(--rule);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--sans);
}
.grid-demo__empty:hover {
  border-color: var(--accent);
  color: var(--accent);
  border-style: solid;
  background: color-mix(in srgb, var(--accent) 4%, transparent);
}
.grid-demo__empty-plus {
  font-size: 1.4rem;
  line-height: 1;
  font-weight: 300;
}
.grid-demo__empty-label {
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.grid-demo__empty-slot {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  opacity: 0.5;
  text-transform: uppercase;
}

.grid-demo__slot {
  background: var(--paper);
  border: 1px solid var(--rule);
  transition: border-color 0.15s;
}
.grid-demo__slot:hover {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--rule));
}
.grid-demo__slot--calling {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 16%, transparent);
  animation: grid-demo-pulse 1.1s ease-in-out infinite;
}
@keyframes grid-demo-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 16%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent);
  }
}

.grid-demo__dial {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.6rem;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--ink);
  font-family: var(--sans);
  transition: background 0.12s;
}
.grid-demo__dial:hover:not(:disabled) {
  background: var(--paper-deep);
}
.grid-demo__dial:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.grid-demo__avatar {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.grid-demo__name {
  font-size: 0.82rem;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grid-demo__number {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-demo__slot-tools {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  display: inline-flex;
  gap: 0.15rem;
  opacity: 0;
  transition: opacity 0.12s;
}
.grid-demo__slot:hover .grid-demo__slot-tools,
.grid-demo__slot:focus-within .grid-demo__slot-tools {
  opacity: 1;
}
.grid-demo__slot-tool {
  width: 22px;
  height: 22px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
}
.grid-demo__slot-tool:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.grid-demo__status {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

/* Sheet */
.grid-demo__sheet {
  margin-top: 0.4rem;
  padding: 0.85rem 0.95rem 0.95rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--accent);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.grid-demo__sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.grid-demo__sheet-eyebrow {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.grid-demo__sheet-close {
  background: transparent;
  border: 0;
  color: var(--muted);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.3rem;
}
.grid-demo__sheet-close:hover {
  color: var(--accent);
}

.grid-demo__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.grid-demo__field-label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.grid-demo__field-input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.grid-demo__field-input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--paper);
}

.grid-demo__sheet-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.2rem;
}
.grid-demo__sheet-primary,
.grid-demo__sheet-secondary {
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.45rem 0.9rem;
  border-radius: 2px;
  cursor: pointer;
}
.grid-demo__sheet-primary {
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
}
.grid-demo__sheet-primary:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
}
.grid-demo__sheet-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.grid-demo__sheet-secondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--rule);
}
.grid-demo__sheet-secondary:hover {
  color: var(--accent);
  border-color: var(--accent);
}

@media (max-width: 560px) {
  .grid-demo__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
