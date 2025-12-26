/**
 * Shared SIP client instance for playground
 * This ensures all components use the same SIP client state
 *
 * Refactored to create instance on-demand to prevent issues with E2E tests.
 * The instance is created lazily when getPlaygroundSipClient() is called.
 */
import { EventBus } from '../src/core/EventBus'
import { useSipClient } from '../src'
import { useAmi } from '../src/composables/useAmi'

// ============================================================================
// LocalStorage Keys (standardized across all demos)
// ============================================================================
export const STORAGE_KEYS = {
  AMI_URL: 'vuesip-ami-url',
  AMI_USERNAME: 'vuesip-ami-username',
  SIP_URI: 'playground_sip_uri',
  SIP_PASSWORD: 'playground_sip_password',
  SIP_SERVER: 'playground_sip_server',
}

let _playgroundSipClient: ReturnType<typeof useSipClient> | null = null
let _sharedEventBus: EventBus | null = null

/**
 * Get or create the shared playground SIP client instance
 * This is called on-demand rather than at module load time
 */
export function getPlaygroundSipClient() {
  if (!_playgroundSipClient) {
    _sharedEventBus = new EventBus()
    _playgroundSipClient = useSipClient(undefined, {
      eventBus: _sharedEventBus,
      autoCleanup: false,
    })
  }
  return _playgroundSipClient
}

/**
 * Get the shared event bus (for components that need direct access)
 */
export function getSharedEventBus() {
  if (!_sharedEventBus) {
    getPlaygroundSipClient() // This will create the event bus
  }
  return _sharedEventBus!
}

/**
 * Reset the playground SIP client (useful for testing)
 */
export function resetPlaygroundSipClient() {
  if (_playgroundSipClient) {
    _playgroundSipClient.disconnect()
  }
  _playgroundSipClient = null
  _sharedEventBus = null
}

// Backwards compatible export - creates instance on first access via getter
// This allows existing code using `playgroundSipClient` to continue working
let _lazyClient: ReturnType<typeof useSipClient> | null = null
export const playgroundSipClient = new Proxy({} as ReturnType<typeof useSipClient>, {
  get(_target, prop) {
    if (!_lazyClient) {
      _lazyClient = getPlaygroundSipClient()
    }
    const value = (_lazyClient as any)[prop]
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(_lazyClient)
    }
    return value
  },
})

// ============================================================================
// Shared AMI Client
// ============================================================================

let _playgroundAmiClient: ReturnType<typeof useAmi> | null = null

/**
 * Get or create the shared playground AMI client instance
 */
export function getPlaygroundAmiClient() {
  if (!_playgroundAmiClient) {
    _playgroundAmiClient = useAmi()
  }
  return _playgroundAmiClient
}

/**
 * Reset the playground AMI client (useful for testing)
 */
export function resetPlaygroundAmiClient() {
  if (_playgroundAmiClient) {
    _playgroundAmiClient.disconnect()
  }
  _playgroundAmiClient = null
}

// Backwards compatible export - creates instance on first access via getter
let _lazyAmiClient: ReturnType<typeof useAmi> | null = null
export const playgroundAmiClient = new Proxy({} as ReturnType<typeof useAmi>, {
  get(_target, prop) {
    if (!_lazyAmiClient) {
      _lazyAmiClient = getPlaygroundAmiClient()
    }
    const value = (_lazyAmiClient as any)[prop]
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(_lazyAmiClient)
    }
    return value
  },
})

// ============================================================================
// LocalStorage Helpers
// ============================================================================

/**
 * Load saved AMI configuration from localStorage
 */
export function loadAmiConfig(): { url: string; username: string } {
  if (typeof localStorage === 'undefined') {
    return { url: '', username: '' }
  }
  return {
    url: localStorage.getItem(STORAGE_KEYS.AMI_URL) || '',
    username: localStorage.getItem(STORAGE_KEYS.AMI_USERNAME) || '',
  }
}

/**
 * Save AMI configuration to localStorage
 */
export function saveAmiConfig(url: string, username: string): void {
  if (typeof localStorage === 'undefined') return
  if (url) {
    localStorage.setItem(STORAGE_KEYS.AMI_URL, url)
  }
  if (username) {
    localStorage.setItem(STORAGE_KEYS.AMI_USERNAME, username)
  }
}

/**
 * Clear saved AMI configuration from localStorage
 */
export function clearAmiConfig(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.AMI_URL)
  localStorage.removeItem(STORAGE_KEYS.AMI_USERNAME)
}
