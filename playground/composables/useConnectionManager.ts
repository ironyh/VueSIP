/**
 * Connection Manager Composable
 *
 * Manages multiple named SIP connections with browser persistence.
 * Allows users to save, edit, delete, and switch between different SIP server configurations.
 */
import { ref, computed, watch as _watch } from 'vue'

// ============================================================================
// Types
// ============================================================================

export interface SavedConnection {
  /** Unique identifier for the connection */
  id: string
  /** User-friendly name for the connection */
  name: string
  /** WebSocket URI for the SIP server */
  uri: string
  /** SIP URI for registration */
  sipUri: string
  /** Optional password (only stored if user opts in) */
  password?: string
  /** Display name for SIP registration */
  displayName: string
  /** Whether to save the password */
  savePassword: boolean
  /** Creation timestamp */
  createdAt: string
  /** Last used timestamp */
  lastUsedAt?: string
}

export interface ConnectionManagerState {
  /** All saved connections */
  connections: SavedConnection[]
  /** ID of the default connection */
  defaultConnectionId: string | null
  /** ID of the currently active connection */
  activeConnectionId: string | null
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY = 'vuesip-connection-manager'
const STORAGE_VERSION = 'v1'
const FULL_STORAGE_KEY = `${STORAGE_KEY}-${STORAGE_VERSION}`

// ============================================================================
// Composable
// ============================================================================

// Singleton state (shared across all component instances)
let _state: ReturnType<typeof createState> | null = null

function createState() {
  const connections = ref<SavedConnection[]>([])
  const defaultConnectionId = ref<string | null>(null)
  const activeConnectionId = ref<string | null>(null)

  return {
    connections,
    defaultConnectionId,
    activeConnectionId,
  }
}

function getState() {
  if (!_state) {
    _state = createState()
  }
  return _state
}

/**
 * Connection Manager composable
 *
 * Provides CRUD operations for managing saved SIP connections
 * with localStorage persistence.
 */
export function useConnectionManager() {
  const state = getState()
  const { connections, defaultConnectionId, activeConnectionId } = state

  // ============================================================================
  // Computed Properties
  // ============================================================================

  /** Get the default connection */
  const defaultConnection = computed(() => {
    if (!defaultConnectionId.value) return null
    return connections.value.find((c) => c.id === defaultConnectionId.value) || null
  })

  /** Get the currently active connection */
  const activeConnection = computed(() => {
    if (!activeConnectionId.value) return null
    return connections.value.find((c) => c.id === activeConnectionId.value) || null
  })

  /** Get all connections sorted by last used */
  const sortedConnections = computed(() => {
    return [...connections.value].sort((a, b) => {
      // Default connection comes first
      if (a.id === defaultConnectionId.value) return -1
      if (b.id === defaultConnectionId.value) return 1

      // Then sort by last used
      const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
      const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
      return bTime - aTime
    })
  })

  /** Check if there are any saved connections */
  const hasConnections = computed(() => connections.value.length > 0)

  /** Get count of saved connections */
  const connectionCount = computed(() => connections.value.length)

  // ============================================================================
  // Persistence Methods
  // ============================================================================

  /** Load state from localStorage */
  function loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem(FULL_STORAGE_KEY)
      if (stored) {
        const data: ConnectionManagerState = JSON.parse(stored)
        connections.value = data.connections || []
        defaultConnectionId.value = data.defaultConnectionId || null
        activeConnectionId.value = data.activeConnectionId || null
      }
    } catch (error) {
      console.error('[ConnectionManager] Failed to load from storage:', error)
    }
  }

  /** Save state to localStorage */
  function saveToStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const data: ConnectionManagerState = {
        connections: connections.value,
        defaultConnectionId: defaultConnectionId.value,
        activeConnectionId: activeConnectionId.value,
      }
      localStorage.setItem(FULL_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('[ConnectionManager] Failed to save to storage:', error)
    }
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /** Generate a unique ID */
  function generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /** Add a new connection */
  function addConnection(connection: Omit<SavedConnection, 'id' | 'createdAt'>): SavedConnection {
    const newConnection: SavedConnection = {
      ...connection,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }

    connections.value.push(newConnection)

    // If this is the first connection, make it the default
    if (connections.value.length === 1) {
      defaultConnectionId.value = newConnection.id
    }

    saveToStorage()
    return newConnection
  }

  /** Update an existing connection */
  function updateConnection(
    id: string,
    updates: Partial<Omit<SavedConnection, 'id' | 'createdAt'>>
  ): SavedConnection | null {
    const index = connections.value.findIndex((c) => c.id === id)
    if (index === -1) return null

    const updated = {
      ...connections.value[index],
      ...updates,
    }
    connections.value[index] = updated
    saveToStorage()
    return updated
  }

  /** Delete a connection */
  function deleteConnection(id: string): boolean {
    const index = connections.value.findIndex((c) => c.id === id)
    if (index === -1) return false

    connections.value.splice(index, 1)

    // Clear default if deleted
    if (defaultConnectionId.value === id) {
      defaultConnectionId.value = connections.value.length > 0 ? connections.value[0].id : null
    }

    // Clear active if deleted
    if (activeConnectionId.value === id) {
      activeConnectionId.value = null
    }

    saveToStorage()
    return true
  }

  /** Get a connection by ID */
  function getConnection(id: string): SavedConnection | null {
    return connections.value.find((c) => c.id === id) || null
  }

  /** Get a connection by name */
  function getConnectionByName(name: string): SavedConnection | null {
    return connections.value.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null
  }

  // ============================================================================
  // Selection Methods
  // ============================================================================

  /** Set the default connection */
  function setDefaultConnection(id: string | null): void {
    if (id && !connections.value.find((c) => c.id === id)) {
      console.warn('[ConnectionManager] Cannot set default: connection not found')
      return
    }
    defaultConnectionId.value = id
    saveToStorage()
  }

  /** Set the active connection (the one currently in use) */
  function setActiveConnection(id: string | null): void {
    if (id && !connections.value.find((c) => c.id === id)) {
      console.warn('[ConnectionManager] Cannot set active: connection not found')
      return
    }
    activeConnectionId.value = id

    // Update last used timestamp
    if (id) {
      const connection = connections.value.find((c) => c.id === id)
      if (connection) {
        connection.lastUsedAt = new Date().toISOString()
      }
    }

    saveToStorage()
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /** Check if a name is already in use */
  function isNameTaken(name: string, excludeId?: string): boolean {
    return connections.value.some(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== excludeId
    )
  }

  /** Duplicate a connection with a new name */
  function duplicateConnection(id: string, newName: string): SavedConnection | null {
    const original = getConnection(id)
    if (!original) return null

    return addConnection({
      ...original,
      name: newName,
      password: original.savePassword ? original.password : undefined,
    })
  }

  /** Export all connections (without passwords) */
  function exportConnections(): SavedConnection[] {
    return connections.value.map((c) => ({
      ...c,
      password: undefined, // Never export passwords
    }))
  }

  /** Import connections from exported data */
  function importConnections(imported: SavedConnection[]): number {
    let count = 0
    for (const conn of imported) {
      // Skip if name already exists
      if (isNameTaken(conn.name)) continue

      addConnection({
        name: conn.name,
        uri: conn.uri,
        sipUri: conn.sipUri,
        displayName: conn.displayName,
        savePassword: false,
        password: undefined,
      })
      count++
    }
    return count
  }

  /** Clear all connections */
  function clearAllConnections(): void {
    connections.value = []
    defaultConnectionId.value = null
    activeConnectionId.value = null
    saveToStorage()
  }

  // ============================================================================
  // Migration from old storage format
  // ============================================================================

  /** Migrate from old credential storage format */
  function migrateFromLegacyStorage(): void {
    if (typeof localStorage === 'undefined') return

    const oldCredentials = localStorage.getItem('vuesip-credentials')
    const oldOptions = localStorage.getItem('vuesip-credentials-options')

    if (oldCredentials && oldOptions && connections.value.length === 0) {
      try {
        const creds = JSON.parse(oldCredentials)
        const opts = JSON.parse(oldOptions)

        if (creds.uri && creds.sipUri) {
          const migrated = addConnection({
            name: 'Default Connection',
            uri: creds.uri,
            sipUri: creds.sipUri,
            displayName: creds.displayName || '',
            password: opts.savePassword ? creds.password : undefined,
            savePassword: opts.savePassword || false,
          })

          setDefaultConnection(migrated.id)
          console.log('[ConnectionManager] Migrated legacy credentials')
        }
      } catch (error) {
        console.error('[ConnectionManager] Failed to migrate legacy credentials:', error)
      }
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  // Load from storage on first access
  loadFromStorage()

  // Migrate legacy storage if needed
  migrateFromLegacyStorage()

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    // State (reactive)
    connections: computed(() => connections.value),
    defaultConnectionId: computed(() => defaultConnectionId.value),
    activeConnectionId: computed(() => activeConnectionId.value),

    // Computed
    defaultConnection,
    activeConnection,
    sortedConnections,
    hasConnections,
    connectionCount,

    // CRUD
    addConnection,
    updateConnection,
    deleteConnection,
    getConnection,
    getConnectionByName,

    // Selection
    setDefaultConnection,
    setActiveConnection,

    // Utilities
    isNameTaken,
    duplicateConnection,
    exportConnections,
    importConnections,
    clearAllConnections,

    // Storage
    loadFromStorage,
    saveToStorage,
  }
}

export type ConnectionManager = ReturnType<typeof useConnectionManager>
