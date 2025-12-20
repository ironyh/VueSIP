<template>
  <div class="connection-manager">
    <div class="header">
      <h3>Saved Connections</h3>
      <button @click="showAddForm = true" class="btn btn-sm btn-primary" v-if="!showAddForm">
        Add New
      </button>
    </div>

    <!-- Connection List -->
    <div v-if="!showAddForm" class="connection-list">
      <div
        v-for="conn in savedConnections"
        :key="conn.id"
        class="connection-item"
        :class="{ active: activeConnection?.id === conn.id }"
      >
        <div class="connection-details">
          <div class="connection-name">
            {{ conn.name }}
            <span v-if="conn.isDefault" class="badge">Default</span>
          </div>
          <div class="connection-uri">{{ conn.sipUri }} @ {{ conn.uri }}</div>
        </div>
        <div class="connection-actions">
          <button
            v-if="activeConnection?.id !== conn.id"
            @click="$emit('connect', conn)"
            class="btn btn-sm btn-secondary"
            :disabled="connecting"
          >
            Connect
          </button>
          <button
            v-else
            @click="$emit('disconnect')"
            class="btn btn-sm btn-danger"
            :disabled="connecting"
          >
            Disconnect
          </button>
          <button @click="removeConnection(conn.id)" class="btn-icon" title="Remove">✕</button>
        </div>
      </div>
      <div v-if="savedConnections.length === 0" class="empty-state">No saved connections.</div>
    </div>

    <!-- Add Form -->
    <div v-else class="add-form config-panel">
      <h4>New Connection</h4>
      <form @submit.prevent="saveNewConnection">
        <div class="form-group">
          <label>Name</label>
          <input v-model="newConnection.name" type="text" required placeholder="My Server" />
        </div>
        <div class="form-group">
          <label>WebSocket URI</label>
          <input
            v-model="newConnection.uri"
            type="text"
            required
            placeholder="wss://sip.example.com"
          />
        </div>
        <div class="form-group">
          <label>SIP URI</label>
          <input
            v-model="newConnection.sipUri"
            type="text"
            required
            placeholder="sip:user@example.com"
          />
        </div>
        <div class="form-group">
          <label>Display Name</label>
          <input v-model="newConnection.displayName" type="text" placeholder="John Doe" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="newConnection.password" type="password" placeholder="Optional" />
        </div>
        <div class="form-group checkbox-label">
          <label>
            <input type="checkbox" v-model="newConnection.savePassword" />
            Save Password
          </label>
        </div>

        <div class="form-actions">
          <button type="button" @click="showAddForm = false" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">Save Connection</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConnectionManager, type SavedConnection } from '../composables/useConnectionManager'

defineProps<{
  isConnected: boolean
  isRegistered: boolean
  connecting: boolean
  connectionError: string
}>()

defineEmits<{
  (e: 'connect', conn: SavedConnection): void
  (e: 'disconnect'): void
}>()

const { savedConnections, activeConnection, addConnection, removeConnection } =
  useConnectionManager()
const showAddForm = ref(false)

const newConnection = ref<Partial<SavedConnection>>({
  name: '',
  uri: '',
  sipUri: '',
  displayName: '',
  password: '',
  savePassword: false,
})

const saveNewConnection = () => {
  if (newConnection.value.name && newConnection.value.uri && newConnection.value.sipUri) {
    addConnection(newConnection.value as any)
    showAddForm.value = false
    // Reset form
    newConnection.value = {
      name: '',
      uri: '',
      sipUri: '',
      displayName: '',
      password: '',
      savePassword: false,
    }
  }
}
</script>

<style scoped>
.connection-manager {
  /* Styles inherited from parent or scoped here */
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.connection-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.connection-item.active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}
.connection-name {
  font-weight: 600;
}
.connection-uri {
  font-size: 0.8rem;
  opacity: 0.7;
}
.connection-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.btn-icon {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.1rem;
}
.btn-icon:hover {
  color: #ef4444;
}
.badge {
  background: var(--primary);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  margin-left: 0.5rem;
}
</style>
