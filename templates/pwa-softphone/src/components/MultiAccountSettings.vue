<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

export interface MultiAccountEntry {
  id: string
  name: string
  uri: string
  sipUri: string
  password: string
  displayName?: string
  enabled: boolean
}

const props = defineProps<{
  isConnecting: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  back: []
  connect: [
    config: {
      mode: 'multi'
      accounts: MultiAccountEntry[]
      outboundAccountId: string | null
    },
  ]
}>()

const STORAGE_KEY = 'vuesip-multi-accounts'
const OUTBOUND_KEY = 'vuesip-multi-outbound-account'

const accounts = ref<MultiAccountEntry[]>([])
const outboundAccountId = ref<string | null>(null)

function createEmptyAccount(): MultiAccountEntry {
  return {
    id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Account',
    uri: '',
    sipUri: '',
    password: '',
    displayName: '',
    enabled: true,
  }
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MultiAccountEntry[]
      accounts.value = Array.isArray(parsed) ? parsed : []
    }
  } catch {
    // ignore
  }

  try {
    outboundAccountId.value = localStorage.getItem(OUTBOUND_KEY)
  } catch {
    // ignore
  }

  if (accounts.value.length === 0) {
    accounts.value = [createEmptyAccount()]
  }

  // Ensure outbound is set to a real enabled account.
  if (!outboundAccountId.value || !accounts.value.some((a) => a.id === outboundAccountId.value)) {
    outboundAccountId.value = accounts.value[0]?.id ?? null
  }
})

watch(
  accounts,
  (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  },
  { deep: true }
)

watch(outboundAccountId, (next) => {
  try {
    if (next) localStorage.setItem(OUTBOUND_KEY, next)
    else localStorage.removeItem(OUTBOUND_KEY)
  } catch {
    // ignore
  }
})

function addAccount() {
  const a = createEmptyAccount()
  a.name = `Account ${accounts.value.length + 1}`
  accounts.value = [...accounts.value, a]
  if (!outboundAccountId.value) outboundAccountId.value = a.id
}

function removeAccount(id: string) {
  accounts.value = accounts.value.filter((a) => a.id !== id)
  if (outboundAccountId.value === id) {
    outboundAccountId.value = accounts.value[0]?.id ?? null
  }
}

const enabledAccounts = computed(() => accounts.value.filter((a) => a.enabled))
const isValid = computed(() => {
  if (enabledAccounts.value.length === 0) return false
  return enabledAccounts.value.every((a) => a.uri.trim() && a.sipUri.trim() && a.password.trim())
})

function submit() {
  if (!isValid.value) return
  emit('connect', {
    mode: 'multi',
    accounts: accounts.value,
    outboundAccountId: outboundAccountId.value,
  })
}
</script>

<template>
  <div class="multi-settings">
    <div class="login-header">
      <button class="back-btn" @click="emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div class="header-content">
        <h2>Multi-Account (Advanced)</h2>
        <p>Register multiple SIP accounts at once</p>
      </div>
    </div>

    <div class="accounts">
      <div class="accounts-header">
        <h3>Accounts</h3>
        <button class="secondary-btn" type="button" @click="addAccount">Add</button>
      </div>

      <div v-for="acc in accounts" :key="acc.id" class="account-card">
        <div class="account-top">
          <input v-model="acc.name" class="name" type="text" placeholder="Account name" />

          <label class="toggle">
            <input v-model="acc.enabled" type="checkbox" />
            <span>Enabled</span>
          </label>
        </div>

        <div class="row">
          <label>Outbound</label>
          <input
            type="radio"
            name="outbound"
            :value="acc.id"
            v-model="outboundAccountId"
            :disabled="!acc.enabled"
          />
        </div>

        <div class="grid">
          <div class="field">
            <label>WebSocket Server</label>
            <input v-model="acc.uri" type="url" placeholder="wss://sip.example.com:8089/ws" />
          </div>

          <div class="field">
            <label>SIP URI</label>
            <input v-model="acc.sipUri" type="text" placeholder="sip:1001@sip.example.com" />
          </div>

          <div class="field">
            <label>Password</label>
            <input v-model="acc.password" type="password" placeholder="SIP password" />
          </div>

          <div class="field">
            <label>Display Name (optional)</label>
            <input v-model="acc.displayName" type="text" placeholder="VueSIP User" />
          </div>
        </div>

        <button class="danger-link" type="button" @click="removeAccount(acc.id)">Remove</button>
      </div>
    </div>

    <p v-if="props.errorMessage" class="error-message">{{ props.errorMessage }}</p>

    <button
      class="connect-btn"
      type="button"
      :disabled="!isValid || props.isConnecting"
      @click="submit"
    >
      <svg
        v-if="props.isConnecting"
        class="spinner"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
        />
      </svg>
      <span>{{ props.isConnecting ? 'Connecting...' : 'Connect All' }}</span>
    </button>
  </div>
</template>

<style scoped>
.multi-settings {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.accounts {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.accounts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.accounts-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.secondary-btn {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
}

.account-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.account-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.name {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.field input {
  padding: 0.75rem 0.85rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.danger-link {
  align-self: flex-end;
  background: transparent;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  font-size: 0.875rem;
}

.error-message {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: 0.875rem;
  margin: 0;
}

.connect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
