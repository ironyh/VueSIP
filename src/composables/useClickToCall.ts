/**
 * Click-to-Call Widget Composable
 *
 * Provides a drag-and-drop click-to-call widget that can be embedded in any website.
 * Supports SIP/WebRTC calling with mock mode for testing and demos.
 *
 * @module composables/useClickToCall
 */

import { ref, shallowRef, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { useSipMock } from './useSipMock'
import { useSipClient } from './useSipClient'
import { useCallSession } from './useCallSession'
import type { SipClient } from '../core/SipClient'
import type { SipClientConfig } from '../types/config.types'
import { createLogger } from '../utils/logger'
import type { UseSipAdapter, ReadonlyRef } from '@/types/sipAdapter.types'
import type { MockCallState } from '@/composables/useSipMock'
import { CallState } from '@/types/call.types'

const log = createLogger('useClickToCall')

// =============================================================================
// Types
// =============================================================================

/**
 * Widget position options
 */
export type ClickToCallPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

/**
 * Widget theme options
 */
export type ClickToCallTheme = 'light' | 'dark' | 'auto'

/**
 * Widget size options
 */
export type ClickToCallSize = 'small' | 'medium' | 'large'

/**
 * SIP configuration for real mode
 */
export interface SipConfiguration {
  /** WebSocket URI for SIP server */
  wsUri: string
  /** SIP URI (e.g., sip:user@domain.com) */
  sipUri: string
  /** SIP password */
  password: string
  /** Display name for caller ID */
  displayName?: string
}

/**
 * Options for configuring the click-to-call widget
 */
export interface ClickToCallOptions {
  // Position
  /** Initial position of the widget */
  position?: ClickToCallPosition
  /** Horizontal offset from edge in pixels */
  offsetX?: number
  /** Vertical offset from edge in pixels */
  offsetY?: number

  // Behavior
  /** Whether the widget can be dragged */
  draggable?: boolean
  /** Whether the widget can be minimized */
  minimizable?: boolean
  /** Persist position to localStorage */
  persistPosition?: boolean

  // SIP Configuration
  /** SIP/WebRTC configuration for real mode */
  sipConfig?: SipConfiguration

  // Mock mode for testing
  /** Enable mock mode (simulated calls) */
  mockMode?: boolean

  // Default call target
  /** Default phone number to call */
  defaultNumber?: string

  // Appearance
  /** Widget theme */
  theme?: ClickToCallTheme
  /** Primary accent color (CSS color value) */
  primaryColor?: string
  /** Widget size */
  size?: ClickToCallSize

  // Callbacks
  /** Called when a call starts */
  onCallStart?: (number: string) => void
  /** Called when a call ends */
  onCallEnd?: (duration: number) => void
  /** Called when an error occurs */
  onError?: (error: Error) => void
}

/**
 * Return type for useClickToCall composable
 */
export interface UseClickToCallReturn {
  // Widget state
  /** Whether the widget is visible */
  isVisible: Ref<boolean>
  /** Whether the widget is minimized */
  isMinimized: Ref<boolean>
  /** Whether the widget is being dragged */
  isDragging: Ref<boolean>
  /** Current position of the widget */
  position: Ref<{ x: number; y: number }>

  // Call state (from underlying SIP)
  /** Whether connected to SIP server */
  isConnected: ReadonlyRef<boolean>
  /** Whether currently on a call */
  isOnCall: ComputedRef<boolean>
  /** Current call state */
  callState: ReadonlyRef<string>
  /** Current call duration in seconds */
  callDuration: Ref<number>
  /** Remote party phone number */
  remoteNumber: Ref<string | null>

  // Widget controls
  /** Show the widget */
  show: () => void
  /** Hide the widget */
  hide: () => void
  /** Minimize the widget */
  minimize: () => void
  /** Maximize the widget */
  maximize: () => void
  /** Reset position to initial */
  resetPosition: () => void

  // Call controls
  /** Make a call */
  call: (number?: string) => Promise<void>
  /** Hang up the current call */
  hangup: () => Promise<void>
  /** Answer an incoming call */
  answer: () => Promise<void>

  // Configuration
  /** Update configuration at runtime */
  configure: (options: Partial<ClickToCallOptions>) => void

  // CSS custom properties for theming
  /** CSS variables for styling the widget */
  cssVars: ComputedRef<Record<string, string>>
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'vuesip-click-to-call-position'

const SIZE_DIMENSIONS: Record<ClickToCallSize, { width: number; height: number }> = {
  small: { width: 280, height: 360 },
  medium: { width: 320, height: 420 },
  large: { width: 380, height: 500 },
}

const THEME_COLORS = {
  light: {
    bg: '#ffffff',
    bgSecondary: '#f5f5f5',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e0e0e0',
  },
  dark: {
    bg: '#1a1a1a',
    bgSecondary: '#2d2d2d',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    border: '#404040',
  },
}

const DEFAULT_PRIMARY_COLOR = '#4CAF50'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate initial position based on position option and offsets
 */
function calculateInitialPosition(
  positionOption: ClickToCallPosition,
  offsetX: number,
  offsetY: number,
  widgetWidth: number,
  widgetHeight: number
): { x: number; y: number } {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768

  let x: number
  let y: number

  switch (positionOption) {
    case 'top-left':
      x = offsetX
      y = offsetY
      break
    case 'top-right':
      x = viewportWidth - widgetWidth - offsetX
      y = offsetY
      break
    case 'bottom-left':
      x = offsetX
      y = viewportHeight - widgetHeight - offsetY
      break
    case 'bottom-right':
    default:
      x = viewportWidth - widgetWidth - offsetX
      y = viewportHeight - widgetHeight - offsetY
      break
  }

  return { x, y }
}

/**
 * Constrain position to viewport bounds
 */
function constrainToViewport(
  pos: { x: number; y: number },
  widgetWidth: number,
  widgetHeight: number
): { x: number; y: number } {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768

  return {
    x: Math.max(0, Math.min(pos.x, viewportWidth - widgetWidth)),
    y: Math.max(0, Math.min(pos.y, viewportHeight - widgetHeight)),
  }
}

/**
 * Load position from localStorage
 */
function loadPersistedPosition(): { x: number; y: number } | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return { x: parsed.x, y: parsed.y }
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  return null
}

/**
 * Save position to localStorage
 */
function savePosition(pos: { x: number; y: number }): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  } catch {
    // Ignore localStorage errors
  }
}

// =============================================================================
// Real SIP Implementation
// =============================================================================

/**
 * Adapter to bridge real SIP client with the interface expected by useClickToCall
 */
function useRealSip(sipConfig: SipConfiguration): UseSipAdapter {
  // Normalize config
  const clientConfig: SipClientConfig = {
    uri: sipConfig.wsUri,
    sipUri: sipConfig.sipUri,
    password: sipConfig.password,
    displayName: sipConfig.displayName,
    // Add defaults
    wsOptions: {
      connectionTimeout: 10000,
      maxReconnectionAttempts: 3,
    },
    registrationOptions: {
      autoRegister: true,
      expires: 600,
    },
  }

  // Initialize SIP client
  const {
    connect: clientConnect,
    disconnect: clientDisconnect,
    isConnected,
    getClient,
    error: clientError,
  } = useSipClient(clientConfig, {
    autoConnect: false,
    autoCleanup: true,
  })

  // Track the client instance for useCallSession
  const clientRef = shallowRef<SipClient | null>(null)

  // Initialize call session
  const {
    makeCall,
    hangup: sessionHangup,
    answer: sessionAnswer,
    state: sessionState,
    session,
    remoteUri,
    remoteDisplayName,
  } = useCallSession(clientRef)

  // Map CallState enum to widget/MockCallState
  function mapCallState(state: CallState): MockCallState {
    switch (state) {
      case CallState.Idle:
        return 'idle'
      case CallState.Calling:
        return 'calling'
      case CallState.Ringing:
        return 'ringing'
      case CallState.Answering:
      case CallState.EarlyMedia:
        return 'calling'
      case CallState.Active:
        return 'active'
      case CallState.Held:
      case CallState.RemoteHeld:
        return 'held'
      case CallState.Terminating:
        return 'active'
      case CallState.Terminated:
      case CallState.Failed:
        return 'ended'
      default: {
        const _never: never = state
        void _never
        return 'idle'
      }
    }
  }

  const callState = computed<MockCallState>(() => mapCallState(sessionState.value))

  // Prefer display name, fallback to URI if available
  const adapterRemoteNumber = computed<string | null>(() => {
    const name = remoteDisplayName?.value ?? null
    const uri = remoteUri?.value ?? null
    return name || uri || null
  })

  // Wrap connect to update clientRef
  async function connect() {
    await clientConnect()
    clientRef.value = getClient()
  }

  // Wrap disconnect
  async function disconnect() {
    await clientDisconnect()
    clientRef.value = null
  }

  // Wrap call
  async function call(number: string) {
    await makeCall(number, { audio: true, video: false })
    // Return ID to match interface
    return session.value?.id || ''
  }

  // Wrap hangup
  async function hangup() {
    await sessionHangup()
  }

  // Wrap answer
  async function answer() {
    await sessionAnswer()
  }

  // Return object matching UseSipAdapter interface
  return {
    isConnected,
    callState,
    error: computed(() => clientError.value?.message || null),
    remoteNumber: adapterRemoteNumber,

    connect,
    disconnect,
    call,
    hangup,
    answer,
  }
}

// =============================================================================
// Composable Implementation
// =============================================================================

/**
 * Click-to-Call Widget Composable
 *
 * Provides a complete click-to-call widget implementation with drag-and-drop,
 * theming, and SIP/WebRTC integration.
 *
 * @param options - Configuration options
 * @returns Widget state and controls
 *
 * @example
 * ```typescript
 * const {
 *   isVisible,
 *   isMinimized,
 *   position,
 *   call,
 *   hangup,
 *   cssVars
 * } = useClickToCall({
 *   position: 'bottom-right',
 *   mockMode: true,
 *   defaultNumber: '+1234567890',
 *   theme: 'light',
 *   onCallStart: (number) => console.log('Calling', number),
 *   onCallEnd: (duration) => console.log('Call ended after', duration, 'seconds')
 * })
 * ```
 */
export function useClickToCall(options: ClickToCallOptions = {}): UseClickToCallReturn {
  // ===========================================================================
  // Configuration
  // ===========================================================================

  const config = ref<
    Required<Omit<ClickToCallOptions, 'sipConfig' | 'onCallStart' | 'onCallEnd' | 'onError'>> & {
      sipConfig?: SipConfiguration
      onCallStart?: (number: string) => void
      onCallEnd?: (duration: number) => void
      onError?: (error: Error) => void
    }
  >({
    position: options.position ?? 'bottom-right',
    offsetX: options.offsetX ?? 20,
    offsetY: options.offsetY ?? 20,
    draggable: options.draggable ?? true,
    minimizable: options.minimizable ?? true,
    persistPosition: options.persistPosition ?? false,
    sipConfig: options.sipConfig,
    mockMode: options.mockMode ?? true,
    defaultNumber: options.defaultNumber ?? '',
    theme: options.theme ?? 'light',
    primaryColor: options.primaryColor ?? DEFAULT_PRIMARY_COLOR,
    size: options.size ?? 'medium',
    onCallStart: options.onCallStart,
    onCallEnd: options.onCallEnd,
    onError: options.onError,
  })

  // ===========================================================================
  // Widget State
  // ===========================================================================

  const isVisible = ref(true)
  const isMinimized = ref(false)
  const isDragging = ref(false)

  // Calculate widget dimensions based on size
  const widgetDimensions = computed(() => SIZE_DIMENSIONS[config.value.size])

  // Calculate initial position
  const initialPosition = calculateInitialPosition(
    config.value.position,
    config.value.offsetX,
    config.value.offsetY,
    widgetDimensions.value.width,
    widgetDimensions.value.height
  )

  // Try to load persisted position
  let startPosition = initialPosition
  if (config.value.persistPosition) {
    const persisted = loadPersistedPosition()
    if (persisted) {
      startPosition = constrainToViewport(
        persisted,
        widgetDimensions.value.width,
        widgetDimensions.value.height
      )
    }
  }

  const position = ref(startPosition)

  // ===========================================================================
  // SIP/Mock Client
  // ===========================================================================
  let sipClient: UseSipAdapter

  if (config.value.mockMode || !config.value.sipConfig) {
    sipClient = useSipMock({
      connectDelay: 500,
      registerDelay: 300,
      ringDelay: 2000,
      connectCallDelay: 1000,
    }) as unknown as UseSipAdapter
  } else {
    log.info('Initializing real SIP mode')
    sipClient = useRealSip(config.value.sipConfig)
  }

  // ===========================================================================
  // Call State
  // ===========================================================================

  const callDuration = ref(0)
  const remoteNumber = ref<string | null>(null)
  let durationTimer: ReturnType<typeof setInterval> | null = null

  const isOnCall = computed(() => {
    const state = sipClient.callState.value
    return state === 'active' || state === 'ringing' || state === 'calling' || state === 'held'
  })

  // ===========================================================================
  // Duration Timer
  // ===========================================================================

  function startDurationTimer(): void {
    if (durationTimer) return

    callDuration.value = 0
    durationTimer = setInterval(() => {
      callDuration.value += 1
    }, 1000)
  }

  function stopDurationTimer(): void {
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
  }

  // Watch call state to manage duration timer and callbacks
  watch(
    () => sipClient.callState.value,
    (newState, oldState) => {
      // If ringing (possible inbound), hydrate remote number from adapter when available
      if (newState === 'ringing' && !remoteNumber.value) {
        // Use adapter-provided remote if available
        const rn = (sipClient as { remoteNumber?: { value: string | null } }).remoteNumber?.value
        if (rn) {
          remoteNumber.value = rn
        }
      }

      // Start timer when call becomes active
      if (newState === 'active' && oldState !== 'active') {
        startDurationTimer()
      }

      // Stop timer when call ends
      if (
        (newState === 'ended' || newState === 'idle') &&
        (oldState === 'active' ||
          oldState === 'ringing' ||
          oldState === 'calling' ||
          oldState === 'held')
      ) {
        const duration = callDuration.value
        stopDurationTimer()

        // Notify callback for any call attempt lifecycle (even 0s on no-answer/failure)
        config.value.onCallEnd?.(duration)

        // Reset state
        callDuration.value = 0
        remoteNumber.value = null
      }
    }
  )
  // ===========================================================================
  // CSS Variables
  // ===========================================================================

  const cssVars = computed<Record<string, string>>(() => {
    // Detect system preference when theme is 'auto'
    let resolvedTheme: 'light' | 'dark' = 'light'
    if (config.value.theme === 'auto') {
      // Check for system dark mode preference via matchMedia
      if (typeof window !== 'undefined' && window.matchMedia) {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
    } else {
      resolvedTheme = config.value.theme
    }
    const theme = resolvedTheme
    const colors = THEME_COLORS[theme]
    const dimensions = widgetDimensions.value

    return {
      '--ctc-width': `${dimensions.width}px`,
      '--ctc-height': `${dimensions.height}px`,
      '--ctc-bg': colors.bg,
      '--ctc-bg-secondary': colors.bgSecondary,
      '--ctc-text': colors.text,
      '--ctc-text-secondary': colors.textSecondary,
      '--ctc-border': colors.border,
      '--ctc-primary': config.value.primaryColor,
      '--ctc-primary-hover': adjustColor(config.value.primaryColor, -10),
      '--ctc-primary-active': adjustColor(config.value.primaryColor, -20),
      '--ctc-shadow': '0 4px 20px rgba(0, 0, 0, 0.15)',
      '--ctc-radius': '12px',
    }
  })

  // ===========================================================================
  // Widget Controls
  // ===========================================================================

  function show(): void {
    isVisible.value = true
    log.debug('Widget shown')
  }

  function hide(): void {
    isVisible.value = false
    log.debug('Widget hidden')
  }

  function minimize(): void {
    if (!config.value.minimizable) return
    isMinimized.value = true
    log.debug('Widget minimized')
  }

  function maximize(): void {
    isMinimized.value = false
    log.debug('Widget maximized')
  }

  function resetPosition(): void {
    const newPosition = calculateInitialPosition(
      config.value.position,
      config.value.offsetX,
      config.value.offsetY,
      widgetDimensions.value.width,
      widgetDimensions.value.height
    )
    position.value = newPosition

    if (config.value.persistPosition) {
      savePosition(newPosition)
    }

    log.debug('Position reset to initial')
  }

  // ===========================================================================
  // Call Controls
  // ===========================================================================

  async function call(number?: string): Promise<void> {
    const targetNumber = number || config.value.defaultNumber

    if (!targetNumber) {
      const error = new Error('No phone number provided')
      log.error('Call failed:', error.message)
      config.value.onError?.(error)
      throw error
    }

    try {
      // Connect if not already connected
      if (!sipClient.isConnected.value) {
        await sipClient.connect()
      }

      // Set remote number before call
      remoteNumber.value = targetNumber

      // Notify callback
      config.value.onCallStart?.(targetNumber)

      // Make the call
      await sipClient.call(targetNumber)
      log.info('Call started to', targetNumber)
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Call failed')
      log.error('Call failed:', err.message)
      config.value.onError?.(err)
      remoteNumber.value = null
      throw err
    }
  }

  async function hangup(): Promise<void> {
    try {
      await sipClient.hangup()
      log.info('Hangup requested')
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Hangup failed')
      log.error('Hangup failed:', err.message)
      config.value.onError?.(err)
      throw err
    }
  }

  async function answer(): Promise<void> {
    try {
      await sipClient.answer()
      log.info('Call answered')
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Answer failed')
      log.error('Answer failed:', err.message)
      config.value.onError?.(err)
      throw err
    }
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  function configure(newOptions: Partial<ClickToCallOptions>): void {
    log.debug('Updating configuration', newOptions)

    if (newOptions.position !== undefined) config.value.position = newOptions.position
    if (newOptions.offsetX !== undefined) config.value.offsetX = newOptions.offsetX
    if (newOptions.offsetY !== undefined) config.value.offsetY = newOptions.offsetY
    if (newOptions.draggable !== undefined) config.value.draggable = newOptions.draggable
    if (newOptions.minimizable !== undefined) config.value.minimizable = newOptions.minimizable
    if (newOptions.persistPosition !== undefined)
      config.value.persistPosition = newOptions.persistPosition
    if (newOptions.sipConfig !== undefined) config.value.sipConfig = newOptions.sipConfig
    if (newOptions.mockMode !== undefined) config.value.mockMode = newOptions.mockMode
    if (newOptions.defaultNumber !== undefined)
      config.value.defaultNumber = newOptions.defaultNumber
    if (newOptions.theme !== undefined) config.value.theme = newOptions.theme
    if (newOptions.primaryColor !== undefined) config.value.primaryColor = newOptions.primaryColor
    if (newOptions.size !== undefined) config.value.size = newOptions.size
    if (newOptions.onCallStart !== undefined) config.value.onCallStart = newOptions.onCallStart
    if (newOptions.onCallEnd !== undefined) config.value.onCallEnd = newOptions.onCallEnd
    if (newOptions.onError !== undefined) config.value.onError = newOptions.onError
  }

  // ===========================================================================
  // Position Persistence
  // ===========================================================================

  if (config.value.persistPosition) {
    watch(
      position,
      (newPos) => {
        savePosition(newPos)
      },
      { deep: true }
    )
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  onUnmounted(() => {
    stopDurationTimer()
    log.debug('Click-to-call composable unmounted')
  })

  // ===========================================================================
  // Return Public API
  // ===========================================================================

  return {
    // Widget state
    isVisible,
    isMinimized,
    isDragging,
    position,

    // Call state
    isConnected: sipClient.isConnected,
    isOnCall,
    callState: sipClient.callState,
    callDuration,
    remoteNumber,

    // Widget controls
    show,
    hide,
    minimize,
    maximize,
    resetPosition,

    // Call controls
    call,
    hangup,
    answer,

    // Configuration
    configure,

    // CSS variables
    cssVars,
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Adjust a hex color by a percentage
 * Supports both short (#fff) and long (#ffffff) hex formats
 */
function adjustColor(hex: string, percent: number): string {
  // Remove # if present
  let cleanHex = hex.replace('#', '')

  // Handle 3-character hex codes by expanding to 6 characters
  // e.g., #fff -> #ffffff, #abc -> #aabbcc
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('')
  }

  // Validate hex format
  if (cleanHex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    // Return original if invalid
    return hex
  }

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  // Adjust each channel
  const adjust = (value: number) => {
    const adjusted = value + (value * percent) / 100
    return Math.max(0, Math.min(255, Math.round(adjusted)))
  }

  // Convert back to hex
  const toHex = (value: number) => value.toString(16).padStart(2, '0')

  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`
}
