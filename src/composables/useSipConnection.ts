/**
 * useSipConnection - Low-level SIP connection management composable.
 *
 * Provides direct control over JsSIP User Agent connection lifecycle,
 * including registration, unregistration, and connection state tracking.
 * This is a simpler alternative to useSipClient for cases where fine-grained
 * control over the connection is needed.
 *
 * @packageDocumentation
 */

import { ref, type Ref } from 'vue'
import JsSIP, { type UA } from 'jssip'

// Type definitions for the composable
type SipConfig = {
  username?: string
  server?: string
  password?: string
  displayName?: string
  autoRegister?: boolean
  sockets?: unknown[]
  uri?: string
  [key: string]: unknown
}
type SipError = Error & { code?: number; reason?: string; cause?: Error }

export interface UseSipConnectionReturn {
  isConnected: Ref<boolean>
  isRegistered: Ref<boolean>
  isConnecting: Ref<boolean>
  error: Ref<SipError | null>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  register: () => Promise<void>
  unregister: () => Promise<void>
}

export function useSipConnection(config: SipConfig): UseSipConnectionReturn {
  const isConnected = ref(false)
  const isRegistered = ref(false)
  const isConnecting = ref(false)
  const error = ref<SipError | null>(null)

  let ua: UA | null = null

  // Store handler references for cleanup
  type UaEventHandler = () => void
  const handlers: {
    connecting: UaEventHandler
    connected: UaEventHandler
    disconnected: UaEventHandler
    registered: UaEventHandler
    unregistered: UaEventHandler
    registrationFailed: (e: { cause: Error; response?: { status_code: number } }) => void
  } = {
    connecting: () => {
      isConnecting.value = true
    },
    connected: () => {
      isConnected.value = true
      isConnecting.value = false
      if (config.autoRegister !== false) {
        register().catch((err) => {
          error.value = {
            name: 'RegistrationError',
            code: -1,
            message: 'Failed to register with SIP server',
            cause: err,
          }
        })
      }
    },
    disconnected: () => {
      isConnected.value = false
      isRegistered.value = false
      isConnecting.value = false
    },
    registered: () => {
      isRegistered.value = true
    },
    unregistered: () => {
      isRegistered.value = false
    },
    registrationFailed: (e) => {
      isConnecting.value = false
      error.value = {
        name: 'RegistrationError',
        code: e.response?.status_code || -1,
        message: 'Failed to register with SIP server',
        cause: e.cause,
      }
    },
  }

  const connect = async (): Promise<void> => {
    try {
      isConnecting.value = true
      error.value = null

      // Build SIP URI
      const username = config.username || ''
      const server = config.server || ''
      const sipUri = `sip:${username}@${server}`

      // Create UA configuration
      const uaConfig: JsSIP.UAConfiguration = {
        uri: sipUri,
        password: config.password,
        display_name: config.displayName || config.username,
        sockets: config.sockets || [new JsSIP.WebSocketInterface(`wss://${server}`)],
        register: config.autoRegister !== false,
        session_timers: true,
      }

      ua = new JsSIP.UA(uaConfig)

      // Set up event handlers (store references for cleanup)
      ua.on('connecting', handlers.connecting)
      ua.on('connected', handlers.connected)
      ua.on('disconnected', handlers.disconnected)
      ua.on('registered', handlers.registered)
      ua.on('unregistered', handlers.unregistered)
      ua.on('registrationFailed', handlers.registrationFailed)

      ua.start()
    } catch (err) {
      isConnecting.value = false
      error.value = {
        name: 'ConnectionError',
        code: -1,
        message: 'Failed to connect to SIP server',
        cause: err as Error,
      }
      throw err
    }
  }

  const disconnect = async (): Promise<void> => {
    try {
      if (ua) {
        // Remove event handlers to prevent memory leaks
        ua.off('connecting', handlers.connecting)
        ua.off('connected', handlers.connected)
        ua.off('disconnected', handlers.disconnected)
        ua.off('registered', handlers.registered)
        ua.off('unregistered', handlers.unregistered)
        ua.off('registrationFailed', handlers.registrationFailed)

        // Unregister first if registered, then stop
        if (isRegistered.value) {
          ua.unregister()
        }
        ua.stop()
        ua = null
      }

      isConnected.value = false
      isRegistered.value = false
      isConnecting.value = false
    } catch (err) {
      error.value = {
        name: 'SipError',
        code: -1,
        message: 'Failed to disconnect from SIP server',
        cause: err as Error,
      }
      throw err
    }
  }

  const register = async (): Promise<void> => {
    try {
      if (!ua) {
        throw new Error('UA not initialized')
      }
      ua.register()
    } catch (err) {
      error.value = {
        name: 'SipError',
        code: -1,
        message: 'Failed to register with SIP server',
        cause: err as Error,
      }
      throw err
    }
  }

  const unregister = async (): Promise<void> => {
    try {
      if (!ua) {
        throw new Error('UA not initialized')
      }
      ua.unregister()
      isRegistered.value = false
    } catch (err) {
      error.value = {
        name: 'SipError',
        code: -1,
        message: 'Failed to unregister from SIP server',
        cause: err as Error,
      }
      throw err
    }
  }

  return {
    isConnected,
    isRegistered,
    isConnecting,
    error,
    connect,
    disconnect,
    register,
    unregister,
  }
}
