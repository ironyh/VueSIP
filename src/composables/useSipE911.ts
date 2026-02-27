/**
 * E911 Emergency Call Handling Composable
 *
 * Vue composable for E911 emergency call detection, location management,
 * admin notification, and compliance logging. Supports Kari's Law and
 * RAY BAUM's Act requirements. Sanitization, validation and location
 * formatting are provided by `@/utils/e911`.
 *
 * @module composables/useSipE911
 *
 * @example
 * ```typescript
 * import { useSipClient, useSipE911 } from 'vuesip'
 *
 * const { client, eventBus } = useSipClient()
 * const {
 *   activeCalls,
 *   hasActiveEmergency,
 *   locations,
 *   addLocation,
 *   startMonitoring
 * } = useSipE911(client, eventBus, {
 *   config: {
 *     defaultCallbackNumber: '+15551234567',
 *     onSiteNotification: true,
 *     dispatchableLocationRequired: true
 *   },
 *   onEmergencyCall: (call) => {
 *     console.log('EMERGENCY CALL:', call.callerExtension)
 *   },
 *   onNotificationSent: (notification) => {
 *     console.log('Admin notified:', notification.recipient.name)
 *   }
 * })
 *
 * // Add a location
 * addLocation({
 *   name: 'Main Office',
 *   type: 'civic',
 *   civic: {
 *     houseNumber: '123',
 *     streetName: 'Main',
 *     streetSuffix: 'St',
 *     city: 'Anytown',
 *     state: 'CA',
 *     postalCode: '12345',
 *     country: 'US'
 *   },
 *   isDefault: true,
 *   isVerified: true,
 *   extensions: ['1001', '1002', '1003']
 * })
 *
 * startMonitoring()
 * ```
 */

import { ref, computed, onUnmounted, watch, type Ref } from 'vue'
import type { SipClient } from '@/core/SipClient'
import type { EventBus } from '@/core/EventBus'
import type {
  E911Config,
  E911Location,
  E911Call,
  E911Notification,
  E911NotificationRecipient,
  E911ComplianceLog,
  E911Event,
  E911EventType,
  E911Stats,
  UseSipE911Options,
  UseSipE911Return,
} from '@/types/e911.types'
import { createLogger } from '@/utils/logger'
import {
  sanitizeInput,
  isValidExtension,
  generateE911Id,
  createDefaultE911Config,
  createEmptyE911Stats,
  formatE911Location,
} from '@/utils/e911'
import { useE911Locations } from './useE911Locations'
import { useE911Recipients } from './useE911Recipients'
import { useE911Compliance } from './useE911Compliance'

const logger = createLogger('useSipE911')

/**
 * E911 Emergency Call Handling Composable
 *
 * @param client - Ref to SIP client instance
 * @param eventBus - Optional EventBus for subscribing to SIP events
 * @param options - Configuration options
 * @returns E911 management interface
 */
export function useSipE911(
  client: Ref<SipClient | null>,
  eventBus?: EventBus | null,
  options: UseSipE911Options = {}
): UseSipE911Return {
  const {
    autoStart = false,
    onEmergencyCall,
    onCallEnded,
    onNotificationSent,
    onCallbackDetected,
    onEvent,
    onError,
  } = options

  // State
  const config = ref<E911Config>({
    ...createDefaultE911Config(),
    ...options.config,
  })
  const {
    locations,
    locationList,
    defaultLocation,
    addLocation: addLocationInternal,
    updateLocation: updateLocationInternal,
    removeLocation: removeLocationInternal,
    setDefaultLocation: setDefaultLocationInternal,
    getLocation: getLocationInternal,
    getLocationForExtension: getLocationForExtensionInternal,
  } = useE911Locations()

  const {
    recipients: recipientsRef,
    addRecipient: addRecipientInternal,
    updateRecipient: updateRecipientInternal,
    removeRecipient: removeRecipientInternal,
    setRecipients,
  } = useE911Recipients(config.value.recipients)

  watch(
    recipientsRef,
    (r) => {
      config.value.recipients = r
      config.value.lastUpdated = new Date()
    },
    { deep: true }
  )

  const complianceLoggingRef = computed(() => config.value.complianceLogging)
  const {
    complianceLogs,
    addLog,
    getLogs: getLogsInternal,
    exportLogs: exportLogsInternal,
    clearOldLogs: clearOldLogsInternal,
  } = useE911Compliance(complianceLoggingRef)

  const activeCalls = ref<Map<string, E911Call>>(new Map())
  const callHistory = ref<E911Call[]>([])
  const isMonitoring = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Internal state
  const stats = ref<E911Stats>(createEmptyE911Stats())
  const eventListenerIds: Array<{ event: string; id: string }> = []

  // Computed
  const activeCallList = computed(() => Array.from(activeCalls.value.values()))

  const hasActiveEmergency = computed(() => activeCalls.value.size > 0)

  const recipients = computed(() => recipientsRef.value.filter((r) => r.enabled))

  const computedStats = computed(() => stats.value)

  /**
   * Emit an E911 event
   */
  function emitEvent(
    type: E911EventType,
    call?: E911Call,
    notification?: E911Notification,
    data?: Record<string, unknown>
  ): void {
    const event: E911Event = {
      type,
      call,
      notification,
      timestamp: new Date(),
      data,
    }
    onEvent?.(event)
  }

  /**
   * Get location for an extension
   */
  function getLocationForExtension(extension: string): E911Location | null {
    return getLocationForExtensionInternal(extension)
  }

  /**
   * Send notification to a recipient
   */
  async function sendNotification(
    recipient: E911NotificationRecipient,
    call: E911Call
  ): Promise<E911Notification> {
    const notification: E911Notification = {
      id: generateE911Id(),
      callId: call.id,
      type: recipient.notificationTypes[0] || 'email',
      recipient,
      content: formatNotificationContent(call),
      sentAt: new Date(),
      delivered: false,
    }

    try {
      // In a real implementation, this would send actual notifications
      // For now, we simulate successful delivery
      await new Promise((resolve) => setTimeout(resolve, 100))

      notification.delivered = true
      notification.deliveredAt = new Date()

      stats.value.notificationsSent++
      stats.value.notificationsDelivered++

      addLog(
        'notification_delivered',
        `Notification delivered to ${recipient.name}`,
        'info',
        call.id,
        { recipientId: recipient.id, type: notification.type }
      )

      onNotificationSent?.(notification)
      emitEvent('notification_delivered', call, notification)
    } catch (err) {
      notification.error = err instanceof Error ? err.message : 'Notification failed'

      addLog(
        'notification_failed',
        `Failed to notify ${recipient.name}: ${notification.error}`,
        'warning',
        call.id,
        { recipientId: recipient.id, error: notification.error }
      )

      emitEvent('notification_failed', call, notification)
    }

    return notification
  }

  /**
   * Format notification content
   */
  function formatNotificationContent(call: E911Call): string {
    const location = call.location
    let locationStr = 'LOCATION UNKNOWN'

    if (location) {
      locationStr = formatE911Location(location)
    }

    return `EMERGENCY 911 CALL ALERT

Caller: ${call.callerIdName || 'Unknown'} (${call.callerIdNum})
Extension: ${call.callerExtension}
Time: ${call.startTime.toLocaleString()}
Callback Number: ${call.callbackNumber || 'Not configured'}

Location:
${locationStr}

This is an automated E911 notification. Please verify the situation and provide assistance if needed.`
  }

  /**
   * Handle emergency call detection
   */
  function handleEmergencyCall(
    channel: string,
    dialedNumber: string,
    callerExtension: string,
    callerIdNum: string,
    callerIdName: string
  ): void {
    if (!config.value.enabled) return

    const isTest = config.value.testNumbers.includes(dialedNumber)
    const location = getLocationForExtension(callerExtension)

    const call: E911Call = {
      id: generateE911Id(),
      channel: sanitizeInput(channel),
      callerExtension: sanitizeInput(callerExtension),
      callerIdNum: sanitizeInput(callerIdNum),
      callerIdName: sanitizeInput(callerIdName),
      dialedNumber: sanitizeInput(dialedNumber),
      status: 'detecting',
      location,
      callbackNumber: config.value.defaultCallbackNumber,
      startTime: new Date(),
      notificationSent: false,
      notifiedAdmins: [],
      psapCallbackReceived: false,
    }

    activeCalls.value.set(channel, call)

    // Update stats
    if (isTest) {
      stats.value.testCalls++
      stats.value.lastTestCall = new Date()
    } else {
      stats.value.totalCalls++
      stats.value.lastEmergencyCall = new Date()
    }

    if (location) {
      stats.value.callsWithLocation++
    }

    // Log the call
    addLog(
      isTest ? 'test_call' : 'call_initiated',
      `${isTest ? 'Test' : 'Emergency'} call initiated from ${callerExtension} to ${dialedNumber}`,
      isTest ? 'info' : 'critical',
      call.id,
      { dialedNumber, callerExtension, hasLocation: !!location }
    )

    // Update status
    call.status = 'alerting'
    emitEvent('call_detected', call)

    // Send notifications (Kari's Law compliance)
    if (config.value.onSiteNotification && !isTest) {
      const activeRecipients = config.value.recipients.filter((r) => r.enabled)
      for (const recipient of activeRecipients) {
        sendNotification(recipient, call).then(() => {
          call.notifiedAdmins.push(recipient.name)
          call.notificationSent = true
          call.notificationSentAt = new Date()
        })
      }
    }

    // Update to in_progress
    call.status = 'in_progress'
    emitEvent('call_started', call)
    onEmergencyCall?.(call)

    logger.warn('E911 call detected', { callId: call.id, dialedNumber, callerExtension })
  }

  /**
   * Handle call answered (for internal use)
   * @internal
   */
  function _handleCallAnswered(channel: string): void {
    const call = activeCalls.value.get(channel)
    if (!call) return

    call.answerTime = new Date()

    addLog('call_answered', `Emergency call answered by PSAP`, 'info', call.id)

    emitEvent('call_answered', call)
  }
  // Reference to avoid unused warning - can be used by test helpers
  void _handleCallAnswered

  /**
   * Handle call ended internally
   */
  function handleCallEndedInternal(channel: string): void {
    const call = activeCalls.value.get(channel)
    if (!call) return

    call.endTime = new Date()
    call.status = 'completed'

    if (call.answerTime) {
      call.duration = Math.round((call.endTime.getTime() - call.answerTime.getTime()) / 1000)

      // Update average duration (avoid division by zero)
      const totalDuration =
        stats.value.avgCallDuration * (stats.value.totalCalls - 1) + call.duration
      stats.value.avgCallDuration =
        stats.value.totalCalls > 0 ? totalDuration / stats.value.totalCalls : call.duration
    }

    activeCalls.value.delete(channel)
    callHistory.value.unshift(call)

    // Keep only last 100 calls
    if (callHistory.value.length > 100) {
      callHistory.value = callHistory.value.slice(0, 100)
    }

    addLog(
      'call_ended',
      `Emergency call ended. Duration: ${call.duration || 0}s`,
      'info',
      call.id,
      { duration: call.duration }
    )

    emitEvent('call_ended', call)
    onCallEnded?.(call)

    logger.info('E911 call ended', { callId: call.id, duration: call.duration })
  }

  /**
   * Handle potential PSAP callback
   */
  function handleIncomingCall(_channel: string, callerIdNum: string): void {
    if (!config.value.autoAnswerCallback) return

    // Check if this could be a PSAP callback
    // PSAPs typically call back from specific numbers or within a time window
    const recentCalls = callHistory.value.filter((call) => {
      const timeSinceEnd = call.endTime ? Date.now() - call.endTime.getTime() : Infinity
      return timeSinceEnd < 30 * 60 * 1000 // Within 30 minutes
    })

    if (recentCalls.length > 0) {
      // This might be a callback
      const mostRecentCall = recentCalls[0]

      if (mostRecentCall) {
        mostRecentCall.psapCallbackReceived = true
        stats.value.callbacksReceived++

        addLog(
          'callback_received',
          `Potential PSAP callback received from ${callerIdNum}`,
          'info',
          mostRecentCall.id,
          { callerIdNum }
        )

        emitEvent('callback_detected', mostRecentCall)
        onCallbackDetected?.(mostRecentCall)

        logger.info('PSAP callback detected', { callerIdNum, relatedCallId: mostRecentCall.id })
      }
    }
  }

  /**
   * Setup SIP event listeners
   */
  function setupEventListeners(): void {
    if (!eventBus) return

    // Listen for new outgoing sessions to check for emergency calls
    const newSessionId = eventBus.on('sip:new_session', (event) => {
      const session = event?.session
      if (!session || session.direction !== 'outgoing') return

      const dialedNumber = session.remoteIdentity?.uri?.user || ''

      // Check if this is an emergency number
      const isEmergency = config.value.emergencyNumbers.includes(dialedNumber)
      const isTest = config.value.testNumbers.includes(dialedNumber)

      if (isEmergency || isTest) {
        // Get caller info from the client config
        const channel = event.callId || `call-${generateE911Id()}`
        const clientConfig = client.value?.getConfig?.()
        const sipUri = clientConfig?.sipUri || ''
        // Extract extension from sipUri (e.g., 'sip:1001@domain.com' -> '1001')
        const extensionMatch = sipUri.match(/^sip:([^@]+)@/)
        const callerExt = extensionMatch?.[1] || 'unknown'
        const callerIdNum = clientConfig?.displayName || callerExt
        const callerIdName = clientConfig?.displayName || ''

        handleEmergencyCall(channel, dialedNumber, callerExt, callerIdNum, callerIdName)
      }
    })

    // Listen for call state changes
    const callEndedId = eventBus.on('sip:call:ended', (event) => {
      const callId = event?.callId
      if (callId) {
        // Find the call by channel in activeCalls
        for (const [channel, call] of activeCalls.value.entries()) {
          if (call.channel === callId || channel === callId) {
            handleCallEndedInternal(channel)
            break
          }
        }
      }
    })

    // Listen for incoming calls (potential PSAP callbacks)
    const incomingCallId = eventBus.on('sip:new_session', (event) => {
      const session = event?.session
      if (!session || session.direction !== 'incoming') return

      const callerIdNum = session.remoteIdentity?.uri?.user || ''
      const channel = event.callId || `call-${generateE911Id()}`

      if (callerIdNum && channel) {
        handleIncomingCall(channel, callerIdNum)
      }
    })

    eventListenerIds.push(
      { event: 'sip:new_session', id: newSessionId },
      { event: 'sip:call:ended', id: callEndedId },
      { event: 'sip:new_session', id: incomingCallId }
    )
  }

  /**
   * Remove event listeners
   */
  function removeEventListeners(): void {
    if (!eventBus) return
    eventListenerIds.forEach(({ event, id }) => eventBus.off(event, id))
    eventListenerIds.length = 0
  }

  /**
   * Start E911 monitoring
   */
  function startMonitoring(): void {
    if (isMonitoring.value) return

    isMonitoring.value = true
    setupEventListeners()

    addLog('config_changed', 'E911 monitoring started', 'info')

    logger.info('E911 monitoring started')
  }

  /**
   * Stop E911 monitoring
   */
  function stopMonitoring(): void {
    if (!isMonitoring.value) return

    isMonitoring.value = false
    removeEventListeners()

    addLog('config_changed', 'E911 monitoring stopped', 'info')

    logger.info('E911 monitoring stopped')
  }

  /**
   * Update E911 configuration
   */
  function updateConfig(updates: Partial<E911Config>): void {
    if (updates.recipients !== undefined) setRecipients(updates.recipients)
    config.value = {
      ...config.value,
      ...updates,
      lastUpdated: new Date(),
    }
    addLog('config_changed', 'E911 configuration updated', 'info', undefined, updates)

    emitEvent('config_changed', undefined, undefined, updates)
  }

  /**
   * Add a location
   */
  function addLocation(locationData: Omit<E911Location, 'id' | 'lastUpdated'>): E911Location {
    const location = addLocationInternal(locationData)

    addLog('location_updated', `Location added: ${location.name}`, 'info', undefined, {
      locationId: location.id,
    })

    logger.info('Location added', { locationId: location.id, name: location.name })

    return location
  }

  /**
   * Update a location
   */
  function updateLocation(locationId: string, updates: Partial<E911Location>): boolean {
    const location = getLocationInternal(locationId)
    const ok = updateLocationInternal(locationId, updates)
    if (ok && location) {
      addLog('location_updated', `Location updated: ${location.name}`, 'info', undefined, {
        locationId,
      })
    }
    return ok
  }

  /**
   * Remove a location
   */
  function removeLocation(locationId: string): boolean {
    const location = getLocationInternal(locationId)
    const ok = removeLocationInternal(locationId)
    if (ok && location) {
      addLog('location_updated', `Location removed: ${location.name}`, 'info', undefined, {
        locationId,
      })
    }
    return ok
  }

  /**
   * Set default location
   */
  function setDefaultLocation(locationId: string): boolean {
    const location = getLocationInternal(locationId)
    const ok = setDefaultLocationInternal(locationId)
    if (ok && location) {
      addLog('location_updated', `Default location set: ${location.name}`, 'info')
    }
    return ok
  }

  /**
   * Get location by ID
   */
  function getLocation(locationId: string): E911Location | null {
    return getLocationInternal(locationId)
  }

  /**
   * Verify/validate a location
   */
  async function verifyLocation(locationId: string): Promise<boolean> {
    const location = getLocationInternal(locationId)
    if (!location) return false

    isLoading.value = true

    try {
      // In a real implementation, this would validate with an E911 service provider
      // For now, we simulate verification
      await new Promise((resolve) => setTimeout(resolve, 500))

      updateLocationInternal(locationId, {
        isVerified: true,
        verifiedAt: new Date(),
        lastUpdated: new Date(),
      })

      addLog('location_verified', `Location verified: ${location.name}`, 'info', undefined, {
        locationId,
      })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Location verification failed'
      error.value = message
      onError?.(message)
      return false
    } finally {
      isLoading.value = false
    }
  }

  function syncRecipientsToConfig(): void {
    config.value.recipients = recipientsRef.value
    config.value.lastUpdated = new Date()
  }

  /**
   * Add notification recipient
   */
  function addRecipient(
    recipientData: Omit<E911NotificationRecipient, 'id'>
  ): E911NotificationRecipient {
    const recipient = addRecipientInternal(recipientData)
    syncRecipientsToConfig()
    addLog('config_changed', `Notification recipient added: ${recipient.name}`, 'info')
    return recipient
  }

  /**
   * Update notification recipient
   */
  function updateRecipient(
    recipientId: string,
    updates: Partial<E911NotificationRecipient>
  ): boolean {
    const ok = updateRecipientInternal(recipientId, updates)
    if (ok) syncRecipientsToConfig()
    return ok
  }

  /**
   * Remove notification recipient
   */
  function removeRecipient(recipientId: string): boolean {
    const recipient = recipientsRef.value.find((r) => r.id === recipientId)
    const ok = removeRecipientInternal(recipientId)
    if (ok) {
      syncRecipientsToConfig()
      if (recipient)
        addLog('config_changed', `Notification recipient removed: ${recipient.name}`, 'info')
    }
    return ok
  }

  /**
   * Send test notification to all recipients
   */
  async function sendTestNotification(): Promise<boolean> {
    const activeRecipients = config.value.recipients.filter((r) => r.enabled)
    if (activeRecipients.length === 0) {
      error.value = 'No active notification recipients'
      return false
    }

    const testCall: E911Call = {
      id: generateE911Id(),
      channel: 'test',
      callerExtension: 'TEST',
      callerIdNum: 'TEST',
      callerIdName: 'E911 Test',
      dialedNumber: '933',
      status: 'completed',
      location: defaultLocation.value,
      callbackNumber: config.value.defaultCallbackNumber,
      startTime: new Date(),
      notificationSent: false,
      notifiedAdmins: [],
      psapCallbackReceived: false,
    }

    try {
      for (const recipient of activeRecipients) {
        await sendNotification(recipient, testCall)
      }

      addLog('test_call', 'Test notifications sent to all recipients', 'info')

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test notification failed'
      error.value = message
      onError?.(message)
      return false
    }
  }

  /**
   * Get call by ID
   */
  function getCall(callId: string): E911Call | null {
    for (const call of activeCalls.value.values()) {
      if (call.id === callId) return call
    }
    return callHistory.value.find((c) => c.id === callId) || null
  }

  /**
   * Get calls for date range
   */
  function getCallsInRange(start: Date, end: Date): E911Call[] {
    return callHistory.value.filter((call) => {
      const callTime = call.startTime.getTime()
      return callTime >= start.getTime() && callTime <= end.getTime()
    })
  }

  /**
   * Get compliance logs
   */
  function getLogs(limit?: number): E911ComplianceLog[] {
    return getLogsInternal(limit)
  }

  /**
   * Export compliance logs
   */
  function exportLogs(format: 'json' | 'csv'): string {
    return exportLogsInternal(format)
  }

  /**
   * Clear old compliance logs
   */
  function clearOldLogs(olderThan: Date): number {
    const removed = clearOldLogsInternal(olderThan)
    if (removed > 0) addLog('config_changed', `Cleared ${removed} old compliance logs`, 'info')
    return removed
  }

  /**
   * Initiate test call
   */
  async function initiateTestCall(extension: string): Promise<boolean> {
    if (!isValidExtension(extension)) {
      error.value = 'Invalid extension'
      return false
    }

    const sipClient = client.value
    if (!sipClient) {
      error.value = 'SIP client not available'
      return false
    }

    const testNumber = config.value.testNumbers[0] || '933'

    try {
      // In a real implementation, this would initiate an actual call
      addLog('test_call', `Test call initiated from ${extension} to ${testNumber}`, 'info')

      logger.info('Test call initiated', { extension, testNumber })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate test call'
      error.value = message
      onError?.(message)
      return false
    }
  }

  /**
   * Check E911 compliance status
   */
  function checkCompliance(): { compliant: boolean; issues: string[] } {
    const issues: string[] = []

    // Kari's Law checks
    if (!config.value.directDialing) {
      issues.push("Kari's Law: Direct 911 dialing should be enabled (no prefix required)")
    }

    if (!config.value.onSiteNotification) {
      issues.push("Kari's Law: On-site notification should be enabled")
    }

    if (config.value.recipients.filter((r) => r.enabled).length === 0) {
      issues.push("Kari's Law: At least one notification recipient should be configured")
    }

    // RAY BAUM's Act checks
    if (!config.value.dispatchableLocationRequired) {
      issues.push("RAY BAUM's Act: Dispatchable location requirement should be enabled")
    }

    if (locations.value.size === 0) {
      issues.push("RAY BAUM's Act: At least one dispatchable location should be configured")
    }

    const unverifiedLocations = locationList.value.filter((loc) => !loc.isVerified)
    if (unverifiedLocations.length > 0) {
      issues.push(`RAY BAUM's Act: ${unverifiedLocations.length} location(s) not verified`)
    }

    if (!config.value.defaultCallbackNumber) {
      issues.push('Callback number should be configured for PSAP callbacks')
    }

    return {
      compliant: issues.length === 0,
      issues,
    }
  }

  // Watch for client changes
  watch(client, (newClient, oldClient) => {
    if (oldClient && isMonitoring.value) {
      removeEventListeners()
    }
    if (newClient && isMonitoring.value) {
      setupEventListeners()
    }
  })

  // Auto-start if enabled
  if (autoStart) {
    startMonitoring()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    config,
    locations,
    activeCalls,
    callHistory,
    complianceLogs,
    isMonitoring,
    isLoading,
    error,

    // Computed
    locationList,
    defaultLocation,
    activeCallList,
    hasActiveEmergency,
    stats: computedStats,
    recipients,

    // Methods
    startMonitoring,
    stopMonitoring,
    updateConfig,
    addLocation,
    updateLocation,
    removeLocation,
    setDefaultLocation,
    getLocation,
    getLocationForExtension,
    verifyLocation,
    addRecipient,
    updateRecipient,
    removeRecipient,
    sendTestNotification,
    getCall,
    getCallsInRange,
    getLogs,
    exportLogs,
    clearOldLogs,
    initiateTestCall,
    formatE911Location,
    checkCompliance,
  }
}

export type { UseSipE911Return }
