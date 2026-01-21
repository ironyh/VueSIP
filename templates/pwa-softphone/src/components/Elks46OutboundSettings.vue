<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { use46ElksApi, type Elks46Number } from 'vuesip'

const props = defineProps<{
  isConnected: boolean
}>()

const emit = defineEmits<{
  updated: []
}>()

const STORAGE_KEY = 'vuesip_46elks_credentials'
const ENABLED_NUMBERS_KEY = 'vuesip_46elks_enabled_numbers'
const NUMBER_LABELS_KEY = 'vuesip_46elks_number_labels'

const enabledNumbers = ref<Record<string, boolean>>({})
const numberLabels = ref<Record<string, string>>({})

const savedCredentials = ref<{ username: string; password: string } | null>(null)

const { isLoading, error, isAuthenticated, numbers, authenticate, clear } = use46ElksApi()

const loadCredentials = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { username?: string; password?: string }
    if (parsed?.username && parsed?.password) {
      savedCredentials.value = { username: parsed.username, password: parsed.password }
    }
  } catch {
    // ignore
  }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(ENABLED_NUMBERS_KEY)
    if (raw) enabledNumbers.value = JSON.parse(raw) as Record<string, boolean>
  } catch {
    // ignore
  }
  try {
    const raw = localStorage.getItem(NUMBER_LABELS_KEY)
    if (raw) numberLabels.value = JSON.parse(raw) as Record<string, string>
  } catch {
    // ignore
  }
}

function persistPrefs() {
  try {
    localStorage.setItem(ENABLED_NUMBERS_KEY, JSON.stringify(enabledNumbers.value))
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(NUMBER_LABELS_KEY, JSON.stringify(numberLabels.value))
  } catch {
    // ignore
  }
  emit('updated')
}

onMounted(() => {
  loadCredentials()
  loadPrefs()
})

watch(
  enabledNumbers,
  () => {
    persistPrefs()
  },
  { deep: true }
)

watch(
  numberLabels,
  () => {
    persistPrefs()
  },
  { deep: true }
)

const knownNumbers = computed(() => {
  const set = new Set<string>()
  for (const k of Object.keys(enabledNumbers.value)) set.add(k)
  for (const k of Object.keys(numberLabels.value)) set.add(k)
  for (const n of numbers.value) set.add(n.number)
  return Array.from(set).sort()
})

async function refreshFrom46Elks() {
  if (!savedCredentials.value) return
  const ok = await authenticate(savedCredentials.value.username, savedCredentials.value.password)
  if (!ok) return

  // Seed new numbers as enabled + seed label from provider name
  for (const n of numbers.value) {
    if (!(n.number in enabledNumbers.value)) {
      enabledNumbers.value[n.number] = true
    }
    if (!(n.number in numberLabels.value) && n.name) {
      numberLabels.value[n.number] = n.name
    }
  }
}

function displayNameForNumber(num: string): string {
  const provider = numbers.value.find((n) => n.number === num) as Elks46Number | undefined
  return provider?.name || ''
}
</script>

<template>
  <div class="settings-section">
    <h3>46elks Outbound Lines</h3>

    <p class="hint">
      Choose which caller IDs are available in the swipe list. Add labels so you don’t need to
      remember numbers.
    </p>

    <div v-if="!savedCredentials" class="info">
      Save your 46elks credentials during login ("Remember credentials") to refresh your numbers
      here.
    </div>

    <button
      v-if="savedCredentials"
      class="refresh-btn"
      type="button"
      :disabled="isLoading"
      @click="refreshFrom46Elks"
    >
      {{ isLoading ? 'Refreshing...' : 'Refresh numbers from 46elks' }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="numbers">
      <label v-for="num in knownNumbers" :key="num" class="number-row">
        <input v-model="enabledNumbers[num]" type="checkbox" />
        <span class="number">{{ num }}</span>
        <input
          v-model="numberLabels[num]"
          class="label"
          type="text"
          :placeholder="displayNameForNumber(num) || 'Label'"
        />
      </label>
    </div>

    <p v-if="props.isConnected" class="hint">
      Tip: swipe the Call button left/right to switch active outbound line.
    </p>

    <button v-if="isAuthenticated" class="refresh-btn secondary" type="button" @click="clear">
      Sign out of 46elks session
    </button>
  </div>
</template>

<style scoped>
.hint {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.info {
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0.5rem 0 1rem;
}

.error {
  margin: 0.5rem 0;
  color: var(--color-error);
  font-size: 0.875rem;
}

.refresh-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn.secondary {
  margin-top: 0.75rem;
}

.numbers {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.number-row {
  display: grid;
  grid-template-columns: 18px 1fr 1fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.number-row input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.number {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.label {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
}

@media (max-width: 420px) {
  .number-row {
    grid-template-columns: 18px 1fr;
  }
  .label {
    grid-column: 1 / -1;
  }
}
</style>
