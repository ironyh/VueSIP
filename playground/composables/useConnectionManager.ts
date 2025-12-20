import { ref, computed } from 'vue'

export interface SavedConnection {
  id: string
  name: string
  uri: string
  sipUri: string
  password?: string
  displayName?: string
  savePassword?: boolean
  isDefault?: boolean
}

const STORAGE_KEY = 'vuesip-connections'
const ACTIVE_CONNECTION_KEY = 'vuesip-active-connection'

export function useConnectionManager() {
  // State
  const savedConnections = ref<SavedConnection[]>([])
  const activeConnectionId = ref<string | null>(null)

  // Load from storage
  const loadConnections = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        savedConnections.value = JSON.parse(stored)
      } else {
        // Default demo connection
        savedConnections.value = [
          {
            id: 'demo-1',
            name: 'Demo Server',
            uri: 'wss://sip.example.com',
            sipUri: 'sip:user@example.com',
            displayName: 'Demo User',
            savePassword: false,
            isDefault: true,
          },
        ]
      }

      const active = localStorage.getItem(ACTIVE_CONNECTION_KEY)
      if (active) {
        activeConnectionId.value = active
      }
    } catch (e) {
      console.error('Failed to load connections', e)
    }
  }

  // Save to storage
  const saveConnections = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConnections.value))
  }

  // Initialize
  loadConnections()

  // Actions
  const addConnection = (connection: Omit<SavedConnection, 'id'>) => {
    const newConnection = {
      ...connection,
      id: crypto.randomUUID(),
    }
    savedConnections.value.push(newConnection)
    saveConnections()
    return newConnection
  }

  const updateConnection = (id: string, updates: Partial<SavedConnection>) => {
    const index = savedConnections.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      savedConnections.value[index] = { ...savedConnections.value[index], ...updates }
      saveConnections()
    }
  }

  const removeConnection = (id: string) => {
    savedConnections.value = savedConnections.value.filter((c) => c.id !== id)
    saveConnections()
    if (activeConnectionId.value === id) {
      activeConnectionId.value = null
      localStorage.removeItem(ACTIVE_CONNECTION_KEY)
    }
  }

  const setActiveConnection = (id: string | null) => {
    activeConnectionId.value = id
    if (id) {
      localStorage.setItem(ACTIVE_CONNECTION_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_CONNECTION_KEY)
    }
  }

  // Computed
  const defaultConnection = computed(() => {
    return savedConnections.value.find((c) => c.isDefault) || savedConnections.value[0] || null
  })

  const activeConnection = computed(() => {
    return savedConnections.value.find((c) => c.id === activeConnectionId.value) || null
  })

  return {
    savedConnections,
    activeConnection,
    defaultConnection,
    addConnection,
    updateConnection,
    removeConnection,
    setActiveConnection,
  }
}
