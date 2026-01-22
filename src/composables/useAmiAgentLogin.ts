/**
 * AMI Agent Login Composable
 *
 * Vue composable for agent queue login/logout management via AMI.
 * Supports multi-queue login, session tracking, pause management,
 * and shift management with persistence options.
 *
 * @module composables/useAmiAgentLogin
 */

import { ref, computed, onUnmounted } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiMessage } from '@/types/ami.types'
import type {
  AgentLoginStatus,
  AgentQueueMembership,
  AgentSession,
  AgentLoginOptions,
  AgentLogoutOptions,
  AgentPauseOptions,
  UseAmiAgentLoginOptions,
  UseAmiAgentLoginReturn,
  AmiQueueMemberAddedEvent,
  AmiQueueMemberRemovedEvent,
  AmiQueueMemberPauseEvent,
} from '@/types/agent.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiAgentLogin')

/** Storage key for agent session persistence */
const STORAGE_KEY_PREFIX = 'vuesip_agent_session_'

/** Maximum valid penalty value in Asterisk */
const MAX_PENALTY = 1000

/** Minimum valid penalty value */
const MIN_PENALTY = 0

/** Pattern for valid queue names (alphanumeric, underscore, hyphen) */
const VALID_QUEUE_PATTERN = /^[a-zA-Z0-9_-]+$/

/** Pattern for valid interface names */
const VALID_INTERFACE_PATTERN = /^[a-zA-Z0-9_/.-]+$/

/**
 * Validate queue name to prevent injection attacks
 */
function isValidQueueName(queue: string): boolean {
  return (
    typeof queue === 'string' &&
    queue.length > 0 &&
    queue.length <= 128 &&
    VALID_QUEUE_PATTERN.test(queue)
  )
}

/**
 * Validate interface name
 */
function isValidInterface(iface: string): boolean {
  return (
    typeof iface === 'string' &&
    iface.length > 0 &&
    iface.length <= 128 &&
    VALID_INTERFACE_PATTERN.test(iface)
  )
}

/**
 * Validate and clamp penalty value
 */
function validatePenalty(penalty: number): number {
  if (typeof penalty !== 'number' || isNaN(penalty)) {
    return 0
  }
  return Math.max(MIN_PENALTY, Math.min(MAX_PENALTY, Math.floor(penalty)))
}

/**
 * Sanitize string for storage (remove potential XSS vectors)
 */
function sanitizeForStorage(value: string): string {
  if (typeof value !== 'string') return ''
  // Remove potentially dangerous characters but allow basic alphanumeric + common chars
  return value.replace(/[<>"'&]/g, '').slice(0, 256)
}

/**
 * Create initial agent session
 */
function createInitialSession(options: UseAmiAgentLoginOptions): AgentSession {
  return {
    agentId: options.agentId,
    interface: options.interface,
    name: options.name || options.agentId,
    status: 'logged_out',
    queues: [],
    loginTime: null,
    sessionDuration: 0,
    totalCallsHandled: 0,
    totalTalkTime: 0,
    isPaused: false,
    pauseReason: undefined,
    shiftStart: options.shift ? getShiftStart(options.shift) : undefined,
    shiftEnd: options.shift ? getShiftEnd(options.shift) : undefined,
    isOnShift: options.shift ? isWithinShift(options.shift) : true,
    serverId: undefined,
  }
}

/**
 * Get shift start time for today
 */
function getShiftStart(shift: { startHour: number; startMinute: number; timezone?: string }): Date {
  const now = new Date()
  const start = new Date(now)
  start.setHours(shift.startHour, shift.startMinute, 0, 0)
  return start
}

/**
 * Get shift end time for today
 */
function getShiftEnd(shift: {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  timezone?: string
}): Date {
  const now = new Date()
  const end = new Date(now)
  end.setHours(shift.endHour, shift.endMinute, 0, 0)
  // Handle overnight shifts
  if (
    shift.endHour < shift.startHour ||
    (shift.endHour === shift.startHour && shift.endMinute < shift.startMinute)
  ) {
    end.setDate(end.getDate() + 1)
  }
  return end
}

/**
 * Check if current time is within shift hours
 */
function isWithinShift(shift: {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  daysOfWeek: number[]
  timezone?: string
}): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay()

  // Check if today is a shift day
  if (!shift.daysOfWeek.includes(dayOfWeek)) {
    return false
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = shift.startHour * 60 + shift.startMinute
  const endMinutes = shift.endHour * 60 + shift.endMinute

  // Handle overnight shifts
  // NOTE: end time is treated as inclusive at the minute granularity.
  // Example: endHour=23,endMinute=59 should include the entire 23:59 minute.
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

/**
 * Format duration in seconds to HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * AMI Agent Login Composable
 *
 * Provides reactive agent session management functionality for Vue components.
 * Supports queue login/logout, pause management, and shift tracking.
 *
 * @param client - AMI client instance (from useAmi().getClient())
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * await ami.connect({ url: 'ws://pbx.example.com:8080' })
 *
 * const {
 *   session,
 *   isLoggedIn,
 *   login,
 *   logout,
 *   pause,
 *   unpause,
 * } = useAmiAgentLogin(ami.getClient()!, {
 *   agentId: 'agent1001',
 *   interface: 'PJSIP/1001',
 *   name: 'John Doe',
 *   defaultQueues: ['sales', 'support'],
 *   pauseReasons: ['Break', 'Lunch', 'Training'],
 *   persistState: true,
 * })
 *
 * // Login to queues
 * await login({ queues: ['sales', 'support'] })
 *
 * // Pause agent
 * await pause({ reason: 'Lunch' })
 *
 * // Logout
 * await logout()
 * ```
 */
export function useAmiAgentLogin(
  client: AmiClient | null,
  options: UseAmiAgentLoginOptions
): UseAmiAgentLoginReturn {
  // ============================================================================
  // Input Validation
  // ============================================================================

  if (!options.agentId || typeof options.agentId !== 'string' || options.agentId.length === 0) {
    throw new Error('Invalid agentId: must be a non-empty string')
  }

  if (!isValidInterface(options.interface)) {
    throw new Error('Invalid interface: must be a valid SIP interface (e.g., PJSIP/1001)')
  }

  // ============================================================================
  // Configuration with defaults
  // ============================================================================

  const config = {
    agentId: options.agentId,
    interface: options.interface,
    name: options.name || options.agentId,
    availableQueues: options.availableQueues || [],
    defaultQueues: options.defaultQueues || [],
    defaultPenalty: options.defaultPenalty ?? 0,
    shift: options.shift,
    autoLogoutAfterShift: options.autoLogoutAfterShift ?? false,
    pauseReasons: options.pauseReasons || ['Break', 'Lunch', 'Meeting', 'Training', 'Other'],
    persistState: options.persistState ?? false,
    storageKeyPrefix: options.storageKeyPrefix || STORAGE_KEY_PREFIX,
    onStatusChange: options.onStatusChange,
    onQueueChange: options.onQueueChange,
    onShiftStart: options.onShiftStart,
    onShiftEnd: options.onShiftEnd,
    sessionUpdateInterval: options.sessionUpdateInterval ?? 1000,
  }

  // ============================================================================
  // State
  // ============================================================================

  const session = ref<AgentSession>(createInitialSession(options))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let sessionTimer: ReturnType<typeof setInterval> | null = null
  let shiftTimer: ReturnType<typeof setInterval> | null = null
  let timedPauseTimer: ReturnType<typeof setTimeout> | null = null
  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  const status = computed<AgentLoginStatus>(() => session.value.status)

  const isLoggedIn = computed(
    () => session.value.status !== 'logged_out' && session.value.queues.length > 0
  )

  const isPaused = computed(() => session.value.isPaused)

  const isOnCall = computed(
    () => session.value.queues.some((q) => q.inCall) || session.value.status === 'on_call'
  )

  const isOnShift = computed(() => session.value.isOnShift)

  const loggedInQueues = computed(() =>
    session.value.queues.filter((q) => q.isMember).map((q) => q.queue)
  )

  const sessionDurationFormatted = computed(() => formatDuration(session.value.sessionDuration))

  // ============================================================================
  // Persistence
  // ============================================================================

  const storageKey = `${config.storageKeyPrefix}${config.agentId}`

  /**
   * Save session to localStorage
   */
  function saveSession(): void {
    if (!config.persistState) return

    try {
      // Only store validated queue names
      const validQueues = session.value.queues
        .map((q) => q.queue)
        .filter((q) => isValidQueueName(q))

      const data = {
        queues: validQueues,
        loginTime: session.value.loginTime?.toISOString(),
        totalCallsHandled: Math.max(0, Math.floor(session.value.totalCallsHandled)),
        totalTalkTime: Math.max(0, Math.floor(session.value.totalTalkTime)),
      }
      localStorage.setItem(storageKey, JSON.stringify(data))
      logger.debug('Session saved to localStorage', { agentId: sanitizeForStorage(config.agentId) })
    } catch (err) {
      logger.warn('Failed to save session to localStorage', err)
    }
  }

  /**
   * Load session from localStorage
   */
  function loadSession(): { queues: string[]; loginTime: Date | null } | null {
    if (!config.persistState) return null

    try {
      const data = localStorage.getItem(storageKey)
      if (!data) return null

      const parsed = JSON.parse(data)

      // Validate loaded queue names
      const queues = Array.isArray(parsed.queues)
        ? parsed.queues.filter((q: unknown) => typeof q === 'string' && isValidQueueName(q))
        : []

      // Validate login time
      let loginTime: Date | null = null
      if (parsed.loginTime && typeof parsed.loginTime === 'string') {
        const parsedDate = new Date(parsed.loginTime)
        // Only accept valid dates within reasonable range (not in future, not older than 7 days)
        const now = Date.now()
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
        if (
          !isNaN(parsedDate.getTime()) &&
          parsedDate.getTime() <= now &&
          parsedDate.getTime() >= sevenDaysAgo
        ) {
          loginTime = parsedDate
        }
      }

      return { queues, loginTime }
    } catch (err) {
      logger.warn('Failed to load session from localStorage', err)
      // Clear potentially corrupted data
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Ignore storage errors
      }
      return null
    }
  }

  /**
   * Clear persisted session
   */
  function clearPersistedSession(): void {
    if (!config.persistState) return

    try {
      localStorage.removeItem(storageKey)
      logger.debug('Persisted session cleared', { agentId: config.agentId })
    } catch (err) {
      logger.warn('Failed to clear persisted session', err)
    }
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Update agent status based on current state
   */
  function updateStatus(): void {
    const oldStatus = session.value.status
    let newStatus: AgentLoginStatus = 'logged_out'

    if (session.value.queues.length === 0 || !session.value.queues.some((q) => q.isMember)) {
      newStatus = 'logged_out'
    } else if (session.value.queues.some((q) => q.inCall)) {
      newStatus = 'on_call'
    } else if (session.value.isPaused) {
      newStatus = 'paused'
    } else {
      newStatus = 'logged_in'
    }

    if (newStatus !== oldStatus) {
      session.value.status = newStatus
      config.onStatusChange?.(newStatus, session.value)
      logger.debug('Agent status changed', { from: oldStatus, to: newStatus })
    }
  }

  // ============================================================================
  // Queue Membership Methods
  // ============================================================================

  /**
   * Login to queues
   */
  const login = async (loginOptions: AgentLoginOptions): Promise<void> => {
    if (!client) {
      error.value = 'AMI client not connected'
      throw new Error(error.value)
    }

    isLoading.value = true
    error.value = null

    try {
      const queuesToJoin =
        loginOptions.queues.length > 0 ? loginOptions.queues : config.defaultQueues

      if (queuesToJoin.length === 0) {
        throw new Error('No queues specified for login')
      }

      // Validate all queue names before attempting any logins
      const invalidQueues = queuesToJoin.filter((q) => !isValidQueueName(q))
      if (invalidQueues.length > 0) {
        throw new Error(`Invalid queue name(s): ${invalidQueues.join(', ')}`)
      }

      for (const queue of queuesToJoin) {
        const rawPenalty =
          loginOptions.penalties?.[queue] ?? loginOptions.defaultPenalty ?? config.defaultPenalty
        const penalty = validatePenalty(rawPenalty)

        await client.queueAdd(queue, config.interface, {
          memberName: sanitizeForStorage(loginOptions.memberName || config.name),
          penalty,
        })

        // Update local state
        const existingQueue = session.value.queues.find((q) => q.queue === queue)
        if (existingQueue) {
          existingQueue.isMember = true
          existingQueue.penalty = penalty
          existingQueue.loginTime = Math.floor(Date.now() / 1000)
        } else {
          session.value.queues.push({
            queue,
            interface: config.interface,
            isMember: true,
            isPaused: false,
            pauseReason: undefined,
            penalty,
            callsTaken: 0,
            lastCall: 0,
            loginTime: Math.floor(Date.now() / 1000),
            inCall: false,
          })
        }

        config.onQueueChange?.(queue, true)
        logger.info('Logged into queue', { queue, agent: config.agentId })
      }

      // Set login time if this is first login
      if (!session.value.loginTime) {
        session.value.loginTime = new Date()
      }

      updateStatus()
      saveSession()

      // Start session timer
      startSessionTimer()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to login to queues'
      logger.error('Queue login failed', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout from queues
   */
  const logout = async (logoutOptions?: AgentLogoutOptions): Promise<void> => {
    if (!client) {
      error.value = 'AMI client not connected'
      throw new Error(error.value)
    }

    isLoading.value = true
    error.value = null

    try {
      const queuesToLeave = logoutOptions?.queues?.length
        ? logoutOptions.queues
        : session.value.queues.filter((q) => q.isMember).map((q) => q.queue)

      for (const queue of queuesToLeave) {
        await client.queueRemove(queue, config.interface)

        // Update local state
        const queueMembership = session.value.queues.find((q) => q.queue === queue)
        if (queueMembership) {
          queueMembership.isMember = false
        }

        config.onQueueChange?.(queue, false)
        logger.info('Logged out of queue', {
          queue,
          agent: config.agentId,
          reason: logoutOptions?.reason,
        })
      }

      // Check if fully logged out
      const stillLoggedIn = session.value.queues.some((q) => q.isMember)
      if (!stillLoggedIn) {
        session.value.loginTime = null
        stopSessionTimer()
      }

      updateStatus()

      if (logoutOptions?.clearPersistence) {
        clearPersistedSession()
      } else {
        saveSession()
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to logout from queues'
      logger.error('Queue logout failed', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Pause in queues
   */
  const pause = async (pauseOptions: AgentPauseOptions): Promise<void> => {
    if (!client) {
      error.value = 'AMI client not connected'
      throw new Error(error.value)
    }

    isLoading.value = true
    error.value = null

    try {
      const queuesToPause = pauseOptions.queues?.length
        ? pauseOptions.queues
        : session.value.queues.filter((q) => q.isMember).map((q) => q.queue)

      for (const queue of queuesToPause) {
        await client.queuePause(queue, config.interface, true, pauseOptions.reason)

        // Update local state
        const queueMembership = session.value.queues.find((q) => q.queue === queue)
        if (queueMembership) {
          queueMembership.isPaused = true
          queueMembership.pauseReason = pauseOptions.reason
        }

        logger.debug('Paused in queue', { queue, reason: pauseOptions.reason })
      }

      // Update global pause state
      session.value.isPaused = session.value.queues.some((q) => q.isMember && q.isPaused)
      session.value.pauseReason = pauseOptions.reason

      updateStatus()
      saveSession()

      // Handle timed pause
      if (pauseOptions.duration && pauseOptions.duration > 0) {
        // Clear any existing timed pause timer
        if (timedPauseTimer) {
          clearTimeout(timedPauseTimer)
        }
        timedPauseTimer = setTimeout(async () => {
          timedPauseTimer = null
          await unpause(queuesToPause)
        }, pauseOptions.duration * 1000)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to pause in queues'
      logger.error('Queue pause failed', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Unpause in queues
   */
  const unpause = async (queues?: string[]): Promise<void> => {
    if (!client) {
      error.value = 'AMI client not connected'
      throw new Error(error.value)
    }

    isLoading.value = true
    error.value = null

    try {
      const queuesToUnpause = queues?.length
        ? queues
        : session.value.queues.filter((q) => q.isMember && q.isPaused).map((q) => q.queue)

      for (const queue of queuesToUnpause) {
        await client.queuePause(queue, config.interface, false)

        // Update local state
        const queueMembership = session.value.queues.find((q) => q.queue === queue)
        if (queueMembership) {
          queueMembership.isPaused = false
          queueMembership.pauseReason = undefined
        }

        logger.debug('Unpaused in queue', { queue })
      }

      // Update global pause state
      session.value.isPaused = session.value.queues.some((q) => q.isMember && q.isPaused)
      if (!session.value.isPaused) {
        session.value.pauseReason = undefined
      }

      updateStatus()
      saveSession()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to unpause in queues'
      logger.error('Queue unpause failed', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Toggle login state for a queue
   */
  const toggleQueue = async (queue: string, penalty?: number): Promise<void> => {
    const membership = session.value.queues.find((q) => q.queue === queue)

    if (membership?.isMember) {
      await logout({ queues: [queue] })
    } else {
      await login({
        queues: [queue],
        penalties: penalty !== undefined ? { [queue]: penalty } : undefined,
      })
    }
  }

  /**
   * Set penalty for a queue
   */
  const setPenalty = async (queue: string, penalty: number): Promise<void> => {
    if (!client) {
      error.value = 'AMI client not connected'
      throw new Error(error.value)
    }

    if (!isValidQueueName(queue)) {
      error.value = 'Invalid queue name'
      throw new Error(error.value)
    }

    const validatedPenalty = validatePenalty(penalty)
    await client.queuePenalty(queue, config.interface, validatedPenalty)

    // Update local state
    const queueMembership = session.value.queues.find((q) => q.queue === queue)
    if (queueMembership) {
      queueMembership.penalty = validatedPenalty
    }

    saveSession()
    logger.debug('Penalty updated', { queue, penalty: validatedPenalty })
  }

  // ============================================================================
  // Session Methods
  // ============================================================================

  /**
   * Refresh session state from AMI
   */
  const refresh = async (): Promise<void> => {
    if (!client) {
      error.value = 'AMI client not connected'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const queueData = await client.getQueueStatus()

      // Reset queue memberships
      const updatedQueues: AgentQueueMembership[] = []

      for (const queue of queueData) {
        const member = queue.members.find((m) => m.interface === config.interface)

        if (member) {
          updatedQueues.push({
            queue: queue.name,
            interface: config.interface,
            isMember: true,
            isPaused: member.paused,
            pauseReason: member.pausedReason || undefined,
            penalty: member.penalty,
            callsTaken: member.callsTaken,
            lastCall: member.lastCall,
            loginTime: member.loginTime,
            inCall: member.inCall,
          })
        }
      }

      session.value.queues = updatedQueues
      session.value.isPaused = updatedQueues.some((q) => q.isPaused)

      if (updatedQueues.length > 0 && !session.value.loginTime) {
        // Restore login time from earliest queue login
        const earliestLogin = Math.min(
          ...updatedQueues.map((q) => q.loginTime).filter((t) => t > 0)
        )
        if (earliestLogin > 0) {
          session.value.loginTime = new Date(earliestLogin * 1000)
        }
      }

      updateStatus()
      logger.debug('Session refreshed', { queueCount: updatedQueues.length })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to refresh session'
      logger.error('Session refresh failed', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get available queues
   */
  const getAvailableQueues = (): string[] => config.availableQueues

  /**
   * Get pause reasons
   */
  const getPauseReasons = (): string[] => config.pauseReasons

  /**
   * Check if logged into specific queue
   */
  const isLoggedIntoQueue = (queue: string): boolean => {
    const membership = session.value.queues.find((q) => q.queue === queue)
    return membership?.isMember ?? false
  }

  /**
   * Get queue membership details
   */
  const getQueueMembership = (queue: string): AgentQueueMembership | null => {
    return session.value.queues.find((q) => q.queue === queue) || null
  }

  /**
   * Start session tracking
   */
  const startSession = (): void => {
    if (!session.value.loginTime) {
      session.value.loginTime = new Date()
    }
    startSessionTimer()
    saveSession()
  }

  /**
   * End session
   */
  const endSession = async (): Promise<void> => {
    await logout({ clearPersistence: true })
    session.value = createInitialSession(options)
    stopSessionTimer()
  }

  // ============================================================================
  // Timers
  // ============================================================================

  /**
   * Start session duration timer
   */
  function startSessionTimer(): void {
    if (sessionTimer) return

    sessionTimer = setInterval(() => {
      if (session.value.loginTime) {
        session.value.sessionDuration = Math.floor(
          (Date.now() - session.value.loginTime.getTime()) / 1000
        )
      }
    }, config.sessionUpdateInterval)
  }

  /**
   * Stop session duration timer
   */
  function stopSessionTimer(): void {
    if (sessionTimer) {
      clearInterval(sessionTimer)
      sessionTimer = null
    }
  }

  /**
   * Start shift monitoring timer
   */
  function startShiftTimer(): void {
    if (!config.shift || shiftTimer) return

    const shift = config.shift
    shiftTimer = setInterval(() => {
      const wasOnShift = session.value.isOnShift
      session.value.isOnShift = isWithinShift(shift)
      session.value.shiftStart = getShiftStart(shift)
      session.value.shiftEnd = getShiftEnd(shift)

      if (wasOnShift && !session.value.isOnShift) {
        // Shift ended
        config.onShiftEnd?.()

        if (config.autoLogoutAfterShift && isLoggedIn.value) {
          logout({ reason: 'Shift ended', clearPersistence: true }).catch((err) =>
            logger.error('Auto-logout after shift failed', err)
          )
        }
      } else if (!wasOnShift && session.value.isOnShift) {
        // Shift started
        config.onShiftStart?.()
      }
    }, 60000) // Check every minute
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleMemberAdded = (event: AmiMessage<AmiQueueMemberAddedEvent>): void => {
    const data = event.data
    // Validate event data
    if (!data || typeof data.Interface !== 'string' || typeof data.Queue !== 'string') {
      logger.warn('Invalid QueueMemberAdded event data', { data })
      return
    }
    if (data.Interface !== config.interface) return
    if (!isValidQueueName(data.Queue)) {
      logger.warn('Invalid queue name in QueueMemberAdded event', { queue: data.Queue })
      return
    }

    const existingQueue = session.value.queues.find((q) => q.queue === data.Queue)
    if (existingQueue) {
      existingQueue.isMember = true
      existingQueue.penalty = parseInt(data.Penalty || '0', 10)
    } else {
      session.value.queues.push({
        queue: data.Queue,
        interface: config.interface,
        isMember: true,
        isPaused: data.Paused === '1',
        pauseReason: undefined,
        penalty: parseInt(data.Penalty || '0', 10),
        callsTaken: parseInt(data.CallsTaken || '0', 10),
        lastCall: 0,
        loginTime: Math.floor(Date.now() / 1000),
        inCall: false,
      })
    }

    if (!session.value.loginTime) {
      session.value.loginTime = new Date()
      startSessionTimer()
    }

    session.value.serverId = event.server_id
    config.onQueueChange?.(data.Queue, true)
    updateStatus()
    saveSession()
    logger.debug('Member added event received', { queue: data.Queue })
  }

  const handleMemberRemoved = (event: AmiMessage<AmiQueueMemberRemovedEvent>): void => {
    const data = event.data
    // Validate event data
    if (!data || typeof data.Interface !== 'string' || typeof data.Queue !== 'string') {
      logger.warn('Invalid QueueMemberRemoved event data', { data })
      return
    }
    if (data.Interface !== config.interface) return
    if (!isValidQueueName(data.Queue)) {
      logger.warn('Invalid queue name in QueueMemberRemoved event', { queue: data.Queue })
      return
    }

    const queueMembership = session.value.queues.find((q) => q.queue === data.Queue)
    if (queueMembership) {
      queueMembership.isMember = false
    }

    // Check if fully logged out
    const stillLoggedIn = session.value.queues.some((q) => q.isMember)
    if (!stillLoggedIn) {
      session.value.loginTime = null
      stopSessionTimer()
    }

    config.onQueueChange?.(data.Queue, false)
    updateStatus()
    saveSession()
    logger.debug('Member removed event received', { queue: data.Queue })
  }

  const handleMemberPause = (event: AmiMessage<AmiQueueMemberPauseEvent>): void => {
    const data = event.data
    // Validate event data
    if (!data || typeof data.Interface !== 'string' || typeof data.Queue !== 'string') {
      logger.warn('Invalid QueueMemberPause event data', { data })
      return
    }
    if (data.Interface !== config.interface) return
    if (!isValidQueueName(data.Queue)) {
      logger.warn('Invalid queue name in QueueMemberPause event', { queue: data.Queue })
      return
    }

    const queueMembership = session.value.queues.find((q) => q.queue === data.Queue)
    if (queueMembership) {
      queueMembership.isPaused = data.Paused === '1'
      queueMembership.pauseReason = data.PausedReason || data.Reason || undefined
    }

    // Update global pause state
    session.value.isPaused = session.value.queues.some((q) => q.isMember && q.isPaused)
    if (session.value.isPaused) {
      session.value.pauseReason = data.PausedReason || data.Reason || undefined
    } else {
      session.value.pauseReason = undefined
    }

    updateStatus()
    saveSession()
    logger.debug('Member pause event received', { queue: data.Queue, paused: data.Paused })
  }

  // ============================================================================
  // Setup Event Listeners
  // ============================================================================

  const setupEventListeners = (): void => {
    if (!client) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type EventHandler = (event: AmiMessage<any>) => void

    // Cast handlers since AmiClientEvents uses generic AmiEventData
    // but our handlers expect specific event types
    client.on('queueMemberAdded', handleMemberAdded as EventHandler)
    client.on('queueMemberRemoved', handleMemberRemoved as EventHandler)
    client.on('queueMemberPause', handleMemberPause as EventHandler)

    eventCleanups.push(() => {
      client.off('queueMemberAdded', handleMemberAdded as EventHandler)
      client.off('queueMemberRemoved', handleMemberRemoved as EventHandler)
      client.off('queueMemberPause', handleMemberPause as EventHandler)
    })
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  if (client) {
    setupEventListeners()

    // Restore persisted session
    const persisted = loadSession()
    if (persisted?.queues?.length) {
      logger.info('Restoring persisted session', { queues: persisted.queues })
      // Auto-refresh to sync with actual queue state
      refresh().catch((err) => logger.error('Failed to restore session', err))
    }
  }

  // Start shift monitoring
  if (config.shift) {
    session.value.isOnShift = isWithinShift(config.shift)
    session.value.shiftStart = getShiftStart(config.shift)
    session.value.shiftEnd = getShiftEnd(config.shift)
    startShiftTimer()
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    stopSessionTimer()
    if (shiftTimer) {
      clearInterval(shiftTimer)
      shiftTimer = null
    }
    if (timedPauseTimer) {
      clearTimeout(timedPauseTimer)
      timedPauseTimer = null
    }
    eventCleanups.forEach((cleanup) => cleanup())
    saveSession()
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    session,
    status,
    isLoggedIn,
    isPaused,
    isOnCall,
    isOnShift,
    loggedInQueues,
    sessionDurationFormatted,
    isLoading,
    error,

    // Methods
    login,
    logout,
    pause,
    unpause,
    toggleQueue,
    setPenalty,
    refresh,
    getAvailableQueues,
    getPauseReasons,
    isLoggedIntoQueue,
    getQueueMembership,
    startSession,
    endSession,
  }
}
