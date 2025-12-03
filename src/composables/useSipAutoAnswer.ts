/**
 * useSipAutoAnswer Composable
 *
 * Provides automatic call answering functionality for SIP clients.
 * Supports intercom mode, configurable delays, header detection,
 * whitelist-based filtering, and per-extension settings.
 *
 * @packageDocumentation
 */

import { ref, computed, onUnmounted, watch } from 'vue'
import type {
  AutoAnswerMode,
  IntercomMode,
  AutoAnswerTrigger,
  AutoAnswerHeaders,
  AutoAnswerWhitelistEntry,
  AutoAnswerSettings,
  AutoAnswerEvent,
  AutoAnswerStats,
  PendingAutoAnswer,
  UseSipAutoAnswerOptions,
  UseSipAutoAnswerReturn,
} from '../types/autoanswer.types'

// Re-export types for convenience
export type {
  AutoAnswerMode,
  IntercomMode,
  AutoAnswerTrigger,
  AutoAnswerHeaders,
  AutoAnswerWhitelistEntry,
  AutoAnswerSettings,
  AutoAnswerEvent,
  AutoAnswerStats,
  PendingAutoAnswer,
  UseSipAutoAnswerOptions,
  UseSipAutoAnswerReturn,
}

/**
 * Default auto-answer settings
 */
const DEFAULT_SETTINGS: AutoAnswerSettings = {
  enabled: false,
  mode: 'disabled',
  delay: 0,
  maxDelay: 5000,
  playAnnouncement: false,
  announcementUrl: undefined,
  intercomMode: 'duplex',
  intercomMuteOnAnswer: false,
  detectHeaders: true,
  triggerHeaders: ['Call-Info', 'Alert-Info', 'X-Auto-Answer'],
  whitelist: [],
  playBeep: true,
  beepUrl: undefined,
  showNotification: true,
  notificationDuration: 2000,
}

/**
 * Default statistics
 */
const DEFAULT_STATS: AutoAnswerStats = {
  totalAutoAnswered: 0,
  headerTriggered: 0,
  whitelistTriggered: 0,
  intercomTriggered: 0,
  allCallsTriggered: 0,
  skipped: 0,
  averageDelay: 0,
  lastEvent: undefined,
}

/**
 * Validate delay value
 */
function isValidDelay(delay: number, maxDelay: number): boolean {
  return typeof delay === 'number' && delay >= 0 && delay <= maxDelay && Number.isFinite(delay)
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  // Allow relative paths, data URLs, and absolute URLs
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize string input
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  // Remove dangerous characters (keep + for phone numbers, * for wildcards, @ and . for SIP URIs)
  sanitized = sanitized.replace(/[<>'";&|`$\\]/g, '')
  return sanitized.trim().slice(0, 255)
}

/**
 * Check if a caller matches a whitelist pattern
 */
function matchesPattern(caller: string, pattern: string): boolean {
  if (!caller || !pattern) return false

  const normalizedCaller = caller.toLowerCase().replace(/[^a-z0-9@.]/g, '')
  const normalizedPattern = pattern.toLowerCase().replace(/[^a-z0-9@.*]/g, '')

  // Handle wildcard patterns
  if (normalizedPattern.includes('*')) {
    // Escape dots first (so they match literal dots), then convert wildcards
    const regexPattern = normalizedPattern
      .replace(/\./g, '\\.') // Escape dots to match literal dots
      .replace(/\*/g, '.*') // Convert * to regex wildcard
      .replace(/\?/g, '.') // Convert ? to single char wildcard
    try {
      const regex = new RegExp(`^${regexPattern}$`)
      return regex.test(normalizedCaller)
    } catch {
      return false
    }
  }

  // Exact match
  return normalizedCaller === normalizedPattern || normalizedCaller.includes(normalizedPattern)
}

/**
 * Parse auto-answer headers
 */
function parseAutoAnswerHeaders(headers: Partial<AutoAnswerHeaders>): {
  isAutoAnswer: boolean
  isIntercom: boolean
  delay?: number
} {
  const result = { isAutoAnswer: false, isIntercom: false, delay: undefined as number | undefined }

  // Check Call-Info header for answer-after
  if (headers['Call-Info']) {
    const callInfo = headers['Call-Info'].toLowerCase()
    if (callInfo.includes('answer-after=')) {
      result.isAutoAnswer = true
      const match = callInfo.match(/answer-after=(\d+)/)
      if (match && match[1]) {
        result.delay = parseInt(match[1], 10) * 1000 // Convert to ms
      }
    }
  }

  // Check Alert-Info header
  if (headers['Alert-Info']) {
    const alertInfo = headers['Alert-Info'].toLowerCase()
    if (alertInfo.includes('auto-answer') || alertInfo.includes('intercom')) {
      result.isAutoAnswer = true
      if (alertInfo.includes('intercom')) {
        result.isIntercom = true
      }
    }
  }

  // Check X-Auto-Answer header
  if (headers['X-Auto-Answer']) {
    const value = headers['X-Auto-Answer'].toLowerCase()
    if (value === 'true' || value === '1' || value === 'yes') {
      result.isAutoAnswer = true
    }
  }

  // Check Cisco intercom header
  if (headers['X-Cisco-Intercom']) {
    result.isAutoAnswer = true
    result.isIntercom = true
  }

  // Check Polycom intercom header
  if (headers['X-Polycom-Intercom']) {
    result.isAutoAnswer = true
    result.isIntercom = true
  }

  return result
}

/**
 * Vue composable for automatic call answering
 *
 * @param options - Configuration options
 * @returns Auto-answer state and methods
 *
 * @example
 * ```typescript
 * import { useSipAutoAnswer } from 'vuesip'
 *
 * const {
 *   settings,
 *   isEnabled,
 *   enable,
 *   disable,
 *   setMode,
 *   shouldAutoAnswer,
 *   addToWhitelist
 * } = useSipAutoAnswer({
 *   onAutoAnswer: (event) => {
 *     console.log('Auto-answered call from', event.caller)
 *   }
 * })
 *
 * // Enable auto-answer for all calls
 * setMode('all')
 * enable()
 *
 * // Or enable only for whitelisted numbers
 * setMode('whitelist')
 * addToWhitelist({ pattern: '+1555*', name: 'Office', enabled: true })
 * ```
 */
export function useSipAutoAnswer(
  options: UseSipAutoAnswerOptions = {}
): UseSipAutoAnswerReturn {
  const {
    initialSettings,
    storageKey = 'vuesip_auto_answer',
    persist = false,
    onAutoAnswer,
    onPending,
    onCancelled,
    onSkipped,
    onError,
  } = options

  // State - create deep copy to avoid shared state
  const settings = ref<AutoAnswerSettings>({
    ...DEFAULT_SETTINGS,
    whitelist: [], // Always start with fresh array
    triggerHeaders: [...DEFAULT_SETTINGS.triggerHeaders], // Copy array
    ...initialSettings,
    // Ensure whitelist from initialSettings is also copied
    ...(initialSettings?.whitelist ? { whitelist: [...initialSettings.whitelist] } : {}),
  })
  const pendingCalls = ref<PendingAutoAnswer[]>([])
  const stats = ref<AutoAnswerStats>({ ...DEFAULT_STATS })
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const recentEvents = ref<AutoAnswerEvent[]>([])

  // Track pending timers for cleanup
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

  // Computed
  const isEnabled = computed(() => settings.value.enabled && settings.value.mode !== 'disabled')
  const mode = computed(() => settings.value.mode)

  // Load settings from storage
  const loadSettings = (): void => {
    if (!persist) return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)

        // Validate parsed data is an object
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Invalid stored settings format')
        }

        // Validate and sanitize whitelist entries
        const whitelist = Array.isArray(parsed.whitelist)
          ? parsed.whitelist
              .filter(
                (entry: unknown): entry is AutoAnswerWhitelistEntry =>
                  typeof entry === 'object' &&
                  entry !== null &&
                  typeof (entry as Record<string, unknown>).pattern === 'string'
              )
              .map((entry: AutoAnswerWhitelistEntry) => ({
                pattern: sanitizeInput(entry.pattern),
                name: entry.name ? sanitizeInput(entry.name) : undefined,
                enabled: Boolean(entry.enabled),
                delay: typeof entry.delay === 'number' ? entry.delay : undefined,
                intercomMode: entry.intercomMode,
                addedAt: new Date(entry.addedAt),
              }))
          : []

        settings.value = {
          ...DEFAULT_SETTINGS,
          // Only apply safe primitive values from parsed data
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
          mode: ['disabled', 'all', 'whitelist', 'intercom'].includes(parsed.mode)
            ? parsed.mode
            : DEFAULT_SETTINGS.mode,
          delay: typeof parsed.delay === 'number' && isValidDelay(parsed.delay, DEFAULT_SETTINGS.maxDelay)
            ? parsed.delay
            : DEFAULT_SETTINGS.delay,
          intercomMode: ['duplex', 'simplex'].includes(parsed.intercomMode)
            ? parsed.intercomMode
            : DEFAULT_SETTINGS.intercomMode,
          playBeep: typeof parsed.playBeep === 'boolean' ? parsed.playBeep : DEFAULT_SETTINGS.playBeep,
          showNotification: typeof parsed.showNotification === 'boolean'
            ? parsed.showNotification
            : DEFAULT_SETTINGS.showNotification,
          whitelist,
        }
      }
    } catch (_err) {
      error.value = 'Failed to load auto-answer settings'
      onError?.('Failed to load auto-answer settings')
    }
  }

  // Save settings to storage
  const saveSettings = (): void => {
    if (!persist) return

    try {
      localStorage.setItem(storageKey, JSON.stringify(settings.value))
    } catch (_err) {
      error.value = 'Failed to save auto-answer settings'
      onError?.('Failed to save auto-answer settings')
    }
  }

  // Watch for settings changes and persist
  if (persist) {
    watch(settings, () => {
      saveSettings()
    }, { deep: true })

    // Load on init
    loadSettings()
  }

  // Enable/Disable
  const enable = (): void => {
    settings.value.enabled = true
    if (settings.value.mode === 'disabled') {
      settings.value.mode = 'all'
    }
  }

  const disable = (): void => {
    settings.value.enabled = false
    cancelAllPending()
  }

  const toggle = (): void => {
    if (isEnabled.value) {
      disable()
    } else {
      enable()
    }
  }

  // Mode Management
  const setMode = (newMode: AutoAnswerMode): void => {
    settings.value.mode = newMode
    if (newMode === 'disabled') {
      settings.value.enabled = false
      cancelAllPending()
    } else if (!settings.value.enabled) {
      settings.value.enabled = true
    }
  }

  // Settings Management
  const updateSettings = (newSettings: Partial<AutoAnswerSettings>): void => {
    // Validate delay if provided
    if (newSettings.delay !== undefined) {
      const maxDelay = newSettings.maxDelay ?? settings.value.maxDelay
      if (!isValidDelay(newSettings.delay, maxDelay)) {
        error.value = `Invalid delay: must be between 0 and ${maxDelay}ms`
        onError?.(`Invalid delay: must be between 0 and ${maxDelay}ms`)
        return
      }
    }

    // Validate URLs if provided
    if (newSettings.announcementUrl !== undefined && newSettings.announcementUrl !== '') {
      if (!isValidUrl(newSettings.announcementUrl)) {
        error.value = 'Invalid announcement URL'
        onError?.('Invalid announcement URL')
        return
      }
    }

    if (newSettings.beepUrl !== undefined && newSettings.beepUrl !== '') {
      if (!isValidUrl(newSettings.beepUrl)) {
        error.value = 'Invalid beep URL'
        onError?.('Invalid beep URL')
        return
      }
    }

    settings.value = { ...settings.value, ...newSettings }
    error.value = null
  }

  const resetSettings = (): void => {
    settings.value = { ...DEFAULT_SETTINGS }
    cancelAllPending()
  }

  const setDelay = (delay: number): void => {
    if (!isValidDelay(delay, settings.value.maxDelay)) {
      error.value = `Invalid delay: must be between 0 and ${settings.value.maxDelay}ms`
      onError?.(`Invalid delay: must be between 0 and ${settings.value.maxDelay}ms`)
      return
    }
    settings.value.delay = delay
    error.value = null
  }

  const setIntercomMode = (newMode: IntercomMode): void => {
    settings.value.intercomMode = newMode
  }

  // Whitelist Management
  const addToWhitelist = (entry: Omit<AutoAnswerWhitelistEntry, 'addedAt'>): void => {
    if (!entry.pattern) {
      error.value = 'Pattern is required'
      onError?.('Pattern is required')
      return
    }

    const sanitizedPattern = sanitizeInput(entry.pattern)
    if (!sanitizedPattern) {
      error.value = 'Invalid pattern'
      onError?.('Invalid pattern')
      return
    }

    // Check for duplicates
    const exists = settings.value.whitelist.some(
      (e) => e.pattern.toLowerCase() === sanitizedPattern.toLowerCase()
    )
    if (exists) {
      error.value = 'Pattern already exists in whitelist'
      onError?.('Pattern already exists in whitelist')
      return
    }

    settings.value.whitelist.push({
      pattern: sanitizedPattern,
      name: entry.name ? sanitizeInput(entry.name) : undefined,
      enabled: entry.enabled,
      delay: entry.delay,
      intercomMode: entry.intercomMode,
      addedAt: new Date(),
    })
    error.value = null
  }

  const removeFromWhitelist = (pattern: string): void => {
    const index = settings.value.whitelist.findIndex(
      (e) => e.pattern.toLowerCase() === pattern.toLowerCase()
    )
    if (index !== -1) {
      settings.value.whitelist.splice(index, 1)
    }
  }

  const updateWhitelistEntry = (
    pattern: string,
    updates: Partial<AutoAnswerWhitelistEntry>
  ): void => {
    const entry = settings.value.whitelist.find(
      (e) => e.pattern.toLowerCase() === pattern.toLowerCase()
    )
    if (entry) {
      if (updates.name !== undefined) {
        entry.name = updates.name ? sanitizeInput(updates.name) : undefined
      }
      if (updates.enabled !== undefined) entry.enabled = updates.enabled
      if (updates.delay !== undefined) entry.delay = updates.delay
      if (updates.intercomMode !== undefined) entry.intercomMode = updates.intercomMode
    }
  }

  const clearWhitelist = (): void => {
    settings.value.whitelist = []
  }

  const isWhitelisted = (number: string): boolean => {
    return settings.value.whitelist.some(
      (entry) => entry.enabled && matchesPattern(number, entry.pattern)
    )
  }

  // Find matching whitelist entry
  const findWhitelistMatch = (caller: string): AutoAnswerWhitelistEntry | undefined => {
    return settings.value.whitelist.find(
      (entry) => entry.enabled && matchesPattern(caller, entry.pattern)
    )
  }

  // Check if call should be auto-answered
  const shouldAutoAnswer = (
    callId: string,
    caller: string,
    headers?: Partial<AutoAnswerHeaders>
  ): {
    shouldAnswer: boolean
    trigger?: AutoAnswerTrigger
    delay: number
    isIntercom: boolean
  } => {
    // Default response
    const noAnswer = {
      shouldAnswer: false,
      trigger: undefined,
      delay: 0,
      isIntercom: false,
    }

    // Check if auto-answer is enabled
    if (!isEnabled.value) {
      stats.value.skipped++
      onSkipped?.(callId, 'Auto-answer is disabled')
      return noAnswer
    }

    // Check headers first (always if detectHeaders is enabled)
    if (settings.value.detectHeaders && headers) {
      const headerResult = parseAutoAnswerHeaders(headers)
      if (headerResult.isAutoAnswer) {
        // Check if the header type is in our trigger list
        const hasMatchingHeader = settings.value.triggerHeaders.some(
          (h) => headers[h] !== undefined
        )
        if (hasMatchingHeader) {
          return {
            shouldAnswer: true,
            trigger: headerResult.isIntercom ? 'intercom' : 'header',
            delay: headerResult.delay ?? settings.value.delay,
            isIntercom: headerResult.isIntercom,
          }
        }
      }
    }

    // Check mode-specific rules
    switch (settings.value.mode) {
      case 'all':
        return {
          shouldAnswer: true,
          trigger: 'all_calls',
          delay: settings.value.delay,
          isIntercom: false,
        }

      case 'whitelist': {
        const match = findWhitelistMatch(caller)
        if (match) {
          return {
            shouldAnswer: true,
            trigger: 'whitelist',
            delay: match.delay ?? settings.value.delay,
            isIntercom: match.intercomMode !== undefined,
          }
        }
        stats.value.skipped++
        onSkipped?.(callId, 'Caller not in whitelist')
        return noAnswer
      }

      case 'intercom':
        // Only answer if intercom header is present
        if (headers) {
          const headerResult = parseAutoAnswerHeaders(headers)
          if (headerResult.isIntercom) {
            return {
              shouldAnswer: true,
              trigger: 'intercom',
              delay: headerResult.delay ?? settings.value.delay,
              isIntercom: true,
            }
          }
        }
        stats.value.skipped++
        onSkipped?.(callId, 'No intercom header present')
        return noAnswer

      default:
        return noAnswer
    }
  }

  // Record auto-answer event
  const recordEvent = (event: AutoAnswerEvent): void => {
    // Update stats
    stats.value.totalAutoAnswered++

    switch (event.trigger) {
      case 'header':
        stats.value.headerTriggered++
        break
      case 'whitelist':
        stats.value.whitelistTriggered++
        break
      case 'intercom':
        stats.value.intercomTriggered++
        break
      case 'all_calls':
        stats.value.allCallsTriggered++
        break
    }

    // Update average delay
    const totalDelay =
      stats.value.averageDelay * (stats.value.totalAutoAnswered - 1) + event.delay
    stats.value.averageDelay = totalDelay / stats.value.totalAutoAnswered

    stats.value.lastEvent = event

    // Add to recent events (keep last 100)
    recentEvents.value.unshift(event)
    if (recentEvents.value.length > 100) {
      recentEvents.value.pop()
    }

    // Trigger callback
    onAutoAnswer?.(event)
  }

  // Add pending auto-answer (internal function for future use with SIP event integration)
  const _addPending = (
    callId: string,
    caller: string,
    displayName: string | undefined,
    trigger: AutoAnswerTrigger,
    delay: number,
    isIntercom: boolean,
    matchedEntry?: AutoAnswerWhitelistEntry,
    matchedHeaders?: Partial<AutoAnswerHeaders>
  ): void => {
    // Remove any existing pending for this call
    cancelPending(callId)

    const pending: PendingAutoAnswer = {
      callId,
      caller,
      displayName,
      trigger,
      remainingTime: delay,
      totalDelay: delay,
      cancellable: true,
    }

    pendingCalls.value.push(pending)
    onPending?.(pending)

    // Set up timer if delay > 0
    if (delay > 0) {
      const timerId = setTimeout(() => {
        // Remove from pending
        const index = pendingCalls.value.findIndex((p) => p.callId === callId)
        if (index !== -1) {
          pendingCalls.value.splice(index, 1)
        }
        pendingTimers.delete(callId)

        // Record event
        recordEvent({
          callId,
          caller,
          displayName,
          trigger,
          delay,
          isIntercom,
          intercomMode: isIntercom ? settings.value.intercomMode : undefined,
          matchedWhitelistEntry: matchedEntry,
          matchedHeaders,
          timestamp: new Date(),
        })
      }, delay)

      pendingTimers.set(callId, timerId)
      pending.timerId = timerId
    } else {
      // Immediate auto-answer
      const index = pendingCalls.value.findIndex((p) => p.callId === callId)
      if (index !== -1) {
        pendingCalls.value.splice(index, 1)
      }

      recordEvent({
        callId,
        caller,
        displayName,
        trigger,
        delay: 0,
        isIntercom,
        intercomMode: isIntercom ? settings.value.intercomMode : undefined,
        matchedWhitelistEntry: matchedEntry,
        matchedHeaders,
        timestamp: new Date(),
      })
    }
  }

  // Cancel pending auto-answer
  const cancelPending = (callId: string): void => {
    const timerId = pendingTimers.get(callId)
    if (timerId) {
      clearTimeout(timerId)
      pendingTimers.delete(callId)
    }

    const index = pendingCalls.value.findIndex((p) => p.callId === callId)
    if (index !== -1) {
      pendingCalls.value.splice(index, 1)
      onCancelled?.(callId, 'User cancelled')
    }
  }

  // Cancel all pending auto-answers
  const cancelAllPending = (): void => {
    for (const [callId, timerId] of pendingTimers) {
      clearTimeout(timerId)
      onCancelled?.(callId, 'All pending cancelled')
    }
    pendingTimers.clear()
    pendingCalls.value = []
  }

  // Manually trigger auto-answer
  const triggerAutoAnswer = (callId: string): void => {
    const pending = pendingCalls.value.find((p) => p.callId === callId)
    if (pending) {
      cancelPending(callId)
      recordEvent({
        callId,
        caller: pending.caller,
        displayName: pending.displayName,
        trigger: 'manual',
        delay: 0,
        isIntercom: false,
        timestamp: new Date(),
      })
    }
  }

  // Announcement settings
  const setAnnouncementUrl = (url: string): void => {
    if (url && !isValidUrl(url)) {
      error.value = 'Invalid announcement URL'
      onError?.('Invalid announcement URL')
      return
    }
    settings.value.announcementUrl = url || undefined
    error.value = null
  }

  const setPlayAnnouncement = (play: boolean): void => {
    settings.value.playAnnouncement = play
  }

  // Statistics
  const resetStats = (): void => {
    stats.value = { ...DEFAULT_STATS }
    recentEvents.value = []
  }

  const getRecentEvents = (limit: number = 10): AutoAnswerEvent[] => {
    return recentEvents.value.slice(0, limit)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cancelAllPending()
  })

  // Mark internal function as intentionally unused (for future SIP event integration)
  void _addPending

  return {
    // Reactive State
    settings,
    isEnabled,
    mode,
    pendingCalls,
    stats,
    isLoading,
    error,

    // Enable/Disable
    enable,
    disable,
    toggle,

    // Mode Management
    setMode,

    // Settings Management
    updateSettings,
    resetSettings,
    setDelay,
    setIntercomMode,

    // Whitelist Management
    addToWhitelist,
    removeFromWhitelist,
    updateWhitelistEntry,
    clearWhitelist,
    isWhitelisted,

    // Call Handling
    shouldAutoAnswer,
    cancelPending,
    cancelAllPending,
    triggerAutoAnswer,

    // Announcement
    setAnnouncementUrl,
    setPlayAnnouncement,

    // Statistics
    resetStats,
    getRecentEvents,

    // Persistence
    saveSettings,
    loadSettings,
  }
}
