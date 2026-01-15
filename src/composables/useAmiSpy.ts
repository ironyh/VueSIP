/**
 * AMI ChanSpy Composable
 *
 * Vue composable for supervisor call monitoring via Asterisk AMI ChanSpy.
 * Provides silent listen, whisper (speak to agent only), and barge (speak to both parties).
 *
 * @module composables/useAmiSpy
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiAction, AmiMessage, AmiEventData } from '@/types/ami.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiSpy')

/**
 * Safely match channel names to prevent false positives from substring matching.
 * AMI channel names follow patterns like "PJSIP/1001-00000001" where the base
 * channel is followed by a unique identifier separated by a hyphen.
 *
 * @param eventChannel - Channel name from the AMI event
 * @param targetChannel - Channel we're looking for
 * @returns True if the channels match (either exact or base channel match)
 */
function channelMatches(
  eventChannel: string | undefined,
  targetChannel: string | undefined
): boolean {
  if (!eventChannel || !targetChannel) return false

  // Exact match
  if (eventChannel === targetChannel) return true

  // Match base channel: "PJSIP/1001-00000001" should match "PJSIP/1001"
  // but "PJSIP/100" should NOT match "PJSIP/1001"
  const eventBase = eventChannel.split('-')[0]
  return eventBase === targetChannel
}

// ============================================================================
// Types
// ============================================================================

/**
 * Spy mode options
 */
export type SpyMode = 'listen' | 'whisper' | 'barge'

/**
 * Options for initiating a spy session
 */
export interface SpyOptions {
  /** Supervisor's channel (e.g., PJSIP/supervisor) */
  supervisorChannel: string
  /** Agent's channel to spy on */
  targetChannel: string
  /** Spy mode (default: 'listen') */
  mode?: SpyMode
  /** ChanSpy group to spy on */
  group?: string
  /** Volume adjustment (-4 to 4) */
  volume?: number
  /** Whisper volume adjustment */
  whisperVolume?: number
  /** Only spy on specific group (enforces group filter) */
  enforceGroup?: boolean
  /** Custom ChanSpy options string (advanced) */
  customOptions?: string
}

/**
 * Active spy session information
 */
export interface SpySession {
  /** Unique session identifier */
  id: string
  /** Supervisor's channel */
  supervisorChannel: string
  /** Target agent's channel being monitored */
  targetChannel: string
  /** Current spy mode */
  mode: SpyMode
  /** Session start time */
  startTime: Date
  /** The ChanSpy channel created */
  spyChannel?: string
  /** Unique ID of the spy channel */
  uniqueId?: string
  /** Action ID used to initiate the spy */
  actionId?: string
  /** Server ID for multi-server setups */
  serverId?: number
}

/**
 * Composable options
 */
export interface UseAmiSpyOptions {
  /** Use AMI events for session tracking (default: true) */
  useEvents?: boolean
  /** Default spy mode (default: 'listen') */
  defaultMode?: SpyMode
  /** Default volume adjustment */
  defaultVolume?: number
  /** Callback when spy session starts */
  onSpyStart?: (session: SpySession) => void
  /** Callback when spy session ends */
  onSpyEnd?: (session: SpySession) => void
  /** Callback when mode changes */
  onModeChange?: (session: SpySession, oldMode: SpyMode) => void
  /** Callback on error */
  onError?: (error: string, session?: SpySession) => void
}

/**
 * Return type for useAmiSpy composable
 */
export interface UseAmiSpyReturn {
  // State
  /** Whether currently spying */
  isSpying: Ref<boolean>
  /** Current spy mode */
  currentMode: Ref<SpyMode | null>
  /** Current active spy session */
  currentSession: Ref<SpySession | null>
  /** All active spy sessions (by session ID) */
  activeSessions: Ref<Map<string, SpySession>>
  /** Error message */
  error: Ref<string | null>

  // Actions
  /** Start a spy session with full options */
  spy: (options: SpyOptions) => Promise<SpySession>
  /** Start silent listen mode */
  listen: (supervisorChannel: string, targetChannel: string) => Promise<SpySession>
  /** Start whisper mode (speak to agent only) */
  whisper: (supervisorChannel: string, targetChannel: string) => Promise<SpySession>
  /** Start barge mode (speak to both parties) */
  barge: (supervisorChannel: string, targetChannel: string) => Promise<SpySession>

  // Mode switching (during active spy)
  /** Switch to silent listen mode */
  switchToListen: () => Promise<void>
  /** Switch to whisper mode */
  switchToWhisper: () => Promise<void>
  /** Switch to barge mode */
  switchToBarge: () => Promise<void>

  // Control
  /** Stop the current spy session */
  stopSpying: () => Promise<void>
  /** Stop a specific spy session by ID */
  stopSession: (sessionId: string) => Promise<void>
  /** Adjust spy volume */
  adjustVolume: (volume: number) => Promise<void>
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `spy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate unique action ID
 */
function generateActionId(): string {
  return `spy-action-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Build ChanSpy options string based on mode and settings
 */
function buildChanSpyOptions(
  mode: SpyMode,
  options: {
    group?: string
    volume?: number
    whisperVolume?: number
    enforceGroup?: boolean
    customOptions?: string
  }
): string {
  const parts: string[] = []

  // q = quiet mode (don't play beep on join)
  parts.push('q')

  // Mode-specific options
  switch (mode) {
    case 'listen':
      // Silent monitoring - no additional options needed beyond 'q'
      break
    case 'whisper':
      // w = whisper mode (speak to spied channel only)
      parts.push('w')
      break
    case 'barge':
      // B = barge mode (speak to both channels)
      parts.push('B')
      break
  }

  // Volume adjustment (-4 to 4)
  if (options.volume !== undefined) {
    const vol = Math.max(-4, Math.min(4, options.volume))
    parts.push(`v(${vol})`)
  }

  // Whisper volume adjustment
  if (options.whisperVolume !== undefined && (mode === 'whisper' || mode === 'barge')) {
    const vol = Math.max(-4, Math.min(4, options.whisperVolume))
    parts.push(`V(${vol})`)
  }

  // Group filtering
  if (options.group) {
    parts.push(`g(${options.group})`)
    if (options.enforceGroup) {
      parts.push('e')
    }
  }

  // Custom options (advanced usage)
  if (options.customOptions) {
    parts.push(options.customOptions)
  }

  return parts.join('')
}

/**
 * AMI ChanSpy Composable
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const {
 *   isSpying,
 *   currentMode,
 *   listen,
 *   whisper,
 *   barge,
 *   stopSpying,
 *   switchToWhisper
 * } = useAmiSpy(computed(() => ami.getClient()))
 *
 * // Silent listen to an agent's call
 * await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
 *
 * // Switch to whisper mode
 * await switchToWhisper()
 *
 * // Or start directly in barge mode
 * await barge('PJSIP/supervisor', 'PJSIP/agent-00000001')
 *
 * // Stop monitoring
 * await stopSpying()
 * ```
 */
export function useAmiSpy(
  amiClientRef: Ref<AmiClient | null>,
  options: UseAmiSpyOptions = {}
): UseAmiSpyReturn {
  const {
    useEvents = true,
    defaultMode = 'listen',
    defaultVolume,
    onSpyStart,
    onSpyEnd,
    onModeChange,
    onError,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const isSpying = ref(false)
  const currentMode = ref<SpyMode | null>(null)
  const currentSession = ref<SpySession | null>(null)
  const activeSessions = ref<Map<string, SpySession>>(new Map())
  const error = ref<string | null>(null)

  // Internal tracking
  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Send an AMI action
   */
  async function doAction(action: AmiAction): Promise<Record<string, unknown>> {
    const client = amiClientRef.value
    if (!client) {
      throw new Error('AMI client not connected')
    }
    const response = await client.sendAction(action)
    return response.data as Record<string, unknown>
  }

  /**
   * Set error state and call callback
   */
  function setError(message: string, session?: SpySession): void {
    error.value = message
    onError?.(message, session)
    logger.error('Spy error', { message, session })
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null
  }

  // ============================================================================
  // Core Actions
  // ============================================================================

  /**
   * Start a spy session with full options
   */
  async function spy(spyOptions: SpyOptions): Promise<SpySession> {
    clearError()

    // Validate required fields
    if (!spyOptions.supervisorChannel) {
      const errorMsg = 'Supervisor channel is required'
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    if (!spyOptions.targetChannel) {
      const errorMsg = 'Target channel is required'
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    const client = amiClientRef.value
    if (!client) {
      const errorMsg = 'AMI client not connected'
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    const mode = spyOptions.mode || defaultMode
    const sessionId = generateSessionId()
    const actionId = generateActionId()

    // Build ChanSpy options
    const chanSpyOpts = buildChanSpyOptions(mode, {
      group: spyOptions.group,
      volume: spyOptions.volume ?? defaultVolume,
      whisperVolume: spyOptions.whisperVolume,
      enforceGroup: spyOptions.enforceGroup,
      customOptions: spyOptions.customOptions,
    })

    // Extract target channel name (strip the unique ID suffix for ChanSpy)
    // ChanSpy uses the channel technology/name without the unique identifier
    // e.g., PJSIP/1001-00000001 -> PJSIP/1001
    const targetForSpy = spyOptions.targetChannel.replace(/-[0-9a-f]+$/i, '')

    // Build ChanSpy data string
    const chanSpyData = chanSpyOpts ? `${targetForSpy},${chanSpyOpts}` : targetForSpy

    logger.debug('Starting spy session', {
      sessionId,
      supervisorChannel: spyOptions.supervisorChannel,
      targetChannel: spyOptions.targetChannel,
      mode,
      chanSpyData,
    })

    try {
      // Originate call to supervisor with ChanSpy application
      const action: AmiAction = {
        Action: 'Originate',
        ActionID: actionId,
        Channel: spyOptions.supervisorChannel,
        Application: 'ChanSpy',
        Data: chanSpyData,
        Async: 'true',
      }

      const response = await doAction(action)

      const success = response.Response === 'Success'

      if (!success) {
        const errorMsg = String(response.Message || 'Failed to start spy session')
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      // Create session object
      const session: SpySession = {
        id: sessionId,
        supervisorChannel: spyOptions.supervisorChannel,
        targetChannel: spyOptions.targetChannel,
        mode,
        startTime: new Date(),
        actionId,
      }

      // Update state
      activeSessions.value.set(sessionId, session)
      currentSession.value = session
      currentMode.value = mode
      isSpying.value = true

      // Call callback
      onSpyStart?.(session)

      logger.info('Spy session started', {
        sessionId,
        mode,
        target: spyOptions.targetChannel,
      })

      return session
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start spy session'
      if (!error.value) {
        setError(errorMsg)
      }
      throw err
    }
  }

  /**
   * Start silent listen mode
   */
  async function listen(supervisorChannel: string, targetChannel: string): Promise<SpySession> {
    return spy({
      supervisorChannel,
      targetChannel,
      mode: 'listen',
    })
  }

  /**
   * Start whisper mode (speak to agent only)
   */
  async function whisper(supervisorChannel: string, targetChannel: string): Promise<SpySession> {
    return spy({
      supervisorChannel,
      targetChannel,
      mode: 'whisper',
    })
  }

  /**
   * Start barge mode (speak to both parties)
   */
  async function barge(supervisorChannel: string, targetChannel: string): Promise<SpySession> {
    return spy({
      supervisorChannel,
      targetChannel,
      mode: 'barge',
    })
  }

  // ============================================================================
  // Mode Switching
  // ============================================================================

  /**
   * Switch spy mode during active session
   * This requires stopping current spy and restarting with new mode
   */
  async function switchMode(newMode: SpyMode): Promise<void> {
    if (!currentSession.value) {
      const errorMsg = 'No active spy session to switch mode'
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    const session = currentSession.value
    const oldMode = session.mode

    if (oldMode === newMode) {
      logger.debug('Already in requested mode', { mode: newMode })
      return
    }

    logger.debug('Switching spy mode', { from: oldMode, to: newMode })

    // Stop current spy session
    await stopSpying()

    // Start new spy session with new mode
    await spy({
      supervisorChannel: session.supervisorChannel,
      targetChannel: session.targetChannel,
      mode: newMode,
    })

    // Call mode change callback with new session
    if (currentSession.value) {
      onModeChange?.(currentSession.value, oldMode)
    }
  }

  /**
   * Switch to silent listen mode
   */
  async function switchToListen(): Promise<void> {
    return switchMode('listen')
  }

  /**
   * Switch to whisper mode
   */
  async function switchToWhisper(): Promise<void> {
    return switchMode('whisper')
  }

  /**
   * Switch to barge mode
   */
  async function switchToBarge(): Promise<void> {
    return switchMode('barge')
  }

  // ============================================================================
  // Control
  // ============================================================================

  /**
   * Stop the current spy session
   */
  async function stopSpying(): Promise<void> {
    if (!currentSession.value) {
      logger.debug('No active spy session to stop')
      return
    }

    await stopSession(currentSession.value.id)
  }

  /**
   * Stop a specific spy session by ID
   */
  async function stopSession(sessionId: string): Promise<void> {
    const session = activeSessions.value.get(sessionId)
    if (!session) {
      logger.debug('Session not found', { sessionId })
      return
    }

    logger.debug('Stopping spy session', { sessionId })

    try {
      const client = amiClientRef.value
      if (client) {
        // Try to hangup the spy channel
        const channelToHangup = session.spyChannel || session.supervisorChannel

        await doAction({
          Action: 'Hangup',
          Channel: channelToHangup,
        }).catch((err) => {
          // Ignore hangup errors - channel might already be gone
          logger.debug('Hangup during stop failed (channel may not exist)', err)
        })
      }
    } catch (err) {
      logger.debug('Error stopping session', err)
    }

    // Clean up session state
    activeSessions.value.delete(sessionId)

    // If this was the current session, clear it
    if (currentSession.value?.id === sessionId) {
      const endedSession = currentSession.value
      currentSession.value = null
      currentMode.value = null
      isSpying.value = activeSessions.value.size > 0

      // Call callback
      onSpyEnd?.(endedSession)
    }

    logger.info('Spy session stopped', { sessionId })
  }

  /**
   * Adjust spy volume
   * Note: This requires restarting the spy with new volume settings
   */
  async function adjustVolume(volume: number): Promise<void> {
    if (!currentSession.value) {
      const errorMsg = 'No active spy session to adjust volume'
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    const session = currentSession.value
    const clampedVolume = Math.max(-4, Math.min(4, volume))

    logger.debug('Adjusting spy volume', { volume: clampedVolume })

    // Stop current spy session
    await stopSpying()

    // Restart with new volume
    await spy({
      supervisorChannel: session.supervisorChannel,
      targetChannel: session.targetChannel,
      mode: session.mode,
      volume: clampedVolume,
    })
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  function setupEvents(): void {
    const client = amiClientRef.value
    if (!client || !useEvents) return

    const handleHangup = (eventData: { Channel?: string; Cause?: string }) => {
      // Check if the hangup is for any of our spy sessions using safe channel matching
      for (const [sessionId, session] of activeSessions.value) {
        if (
          eventData.Channel &&
          (eventData.Channel === session.spyChannel ||
            channelMatches(eventData.Channel, session.supervisorChannel))
        ) {
          logger.debug('Spy channel hangup detected', { sessionId, channel: eventData.Channel })

          // Clean up the session
          activeSessions.value.delete(sessionId)

          if (currentSession.value?.id === sessionId) {
            const endedSession = currentSession.value
            currentSession.value = null
            currentMode.value = null
            isSpying.value = activeSessions.value.size > 0
            onSpyEnd?.(endedSession)
          }

          break
        }
      }
    }

    const handleOriginateResponse = (eventData: {
      ActionID?: string
      Response?: string
      Channel?: string
      Uniqueid?: string
      Reason?: string
    }) => {
      // Find session by action ID
      for (const session of activeSessions.value.values()) {
        if (session.actionId === eventData.ActionID) {
          if (eventData.Response === 'Success') {
            // Update session with channel info
            session.spyChannel = eventData.Channel
            session.uniqueId = eventData.Uniqueid
            logger.debug('Spy channel established', {
              sessionId: session.id,
              spyChannel: eventData.Channel,
            })
          } else {
            // Spy failed
            const errorMsg = eventData.Reason || 'Spy originate failed'
            setError(errorMsg, session)
            activeSessions.value.delete(session.id)

            if (currentSession.value?.id === session.id) {
              currentSession.value = null
              currentMode.value = null
              isSpying.value = activeSessions.value.size > 0
            }
          }
          break
        }
      }
    }

    // Subscribe to events
    const eventHandler = (event: AmiMessage<AmiEventData>) => {
      const data = event.data
      switch (data.Event) {
        case 'Hangup':
          handleHangup(data as unknown as { Channel?: string; Cause?: string })
          break
        case 'OriginateResponse':
          handleOriginateResponse(
            data as unknown as {
              ActionID?: string
              Response?: string
              Channel?: string
              Uniqueid?: string
              Reason?: string
            }
          )
          break
      }
    }

    client.on('event', eventHandler)
    eventCleanups.push(() => client.off('event', eventHandler))
  }

  function cleanupEvents(): void {
    eventCleanups.forEach((cleanup) => cleanup())
    eventCleanups.length = 0
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  watch(
    amiClientRef,
    (newClient, oldClient) => {
      if (oldClient) {
        cleanupEvents()
      }
      if (newClient) {
        setupEvents()
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    cleanupEvents()
    // Stop all active sessions
    for (const sessionId of activeSessions.value.keys()) {
      stopSession(sessionId).catch(() => {
        // Ignore errors during cleanup
      })
    }
    activeSessions.value.clear()
    currentSession.value = null
    currentMode.value = null
    isSpying.value = false
  })

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // State
    isSpying,
    currentMode,
    currentSession,
    activeSessions,
    error,

    // Actions
    spy,
    listen,
    whisper,
    barge,

    // Mode switching
    switchToListen,
    switchToWhisper,
    switchToBarge,

    // Control
    stopSpying,
    stopSession,
    adjustVolume,
  }
}
