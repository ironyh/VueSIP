/**
 * FreePBX Presence Bridge
 *
 * Core implementation for subscribing to FreePBX presence status
 * and tracking expected return times for nurses/staff.
 *
 * Supports both SIP SUBSCRIBE and REST API polling modes.
 *
 * @module core/FreePBXPresenceBridge
 */

import type { UA } from 'jssip/lib/UA'
import {
  FreePBXPresenceCode,
  ExtendedAwayReason,
  type ReturnTimeSpec,
  type FreePBXPresenceStatus,
  type FreePBXPresenceEvent,
  type FreePBXPresenceSubscriptionOptions,
  type FreePBXPresenceBridgeConfig,
  DEFAULT_RETURN_TIME_PATTERNS,
  mapFreePBXToPresenceState,
  formatRemainingTime,
  formatReturnTime,
} from '@/types/freepbx-presence.types'
import { PresenceState } from '@/types/presence.types'
import { createLogger } from '@/utils/logger'

/**
 * Generic subscription type for SIP presence subscriptions
 * JsSIP doesn't export a Subscription type, so we define a minimal interface
 */
interface SIPSubscription {
  terminate: () => void
}

const log = createLogger('FreePBXPresenceBridge')

/**
 * FreePBX hint state to presence code mapping
 */
const HINT_STATE_MAP: Record<string, FreePBXPresenceCode> = {
  'NOT_INUSE': FreePBXPresenceCode.Available,
  'INUSE': FreePBXPresenceCode.OnPhone,
  'BUSY': FreePBXPresenceCode.Busy,
  'UNAVAILABLE': FreePBXPresenceCode.Offline,
  'RINGING': FreePBXPresenceCode.OnPhone,
  'ONHOLD': FreePBXPresenceCode.OnPhone,
  'IDLE': FreePBXPresenceCode.Available,
}

/**
 * FreePBX Presence Bridge Class
 *
 * Handles presence subscriptions and return time tracking for FreePBX extensions.
 * Supports SIP SUBSCRIBE method for real-time updates and REST API polling fallback.
 */
export class FreePBXPresenceBridge {
  private ua: UA | null = null
  private config: FreePBXPresenceBridgeConfig
  private subscriptions: Map<string, SIPSubscription> = new Map()
  private presenceStatus: Map<string, FreePBXPresenceStatus> = new Map()
  private returnTimeTimers: Map<string, ReturnType<typeof setInterval>> = new Map()
  private pollingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0

  // Event callbacks
  private onPresenceUpdate: ((event: FreePBXPresenceEvent) => void) | null = null
  private onReturnTimeUpdate: ((extension: string, returnTime: ReturnTimeSpec | null) => void) | null = null

  /**
   * Create a FreePBX Presence Bridge instance
   *
   * @param config - Bridge configuration
   */
  constructor(config: FreePBXPresenceBridgeConfig) {
    this.config = {
      amiPort: 5038,
      restPort: 443,
      useRestApi: false,
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      parseReturnTime: true,
      returnTimePatterns: DEFAULT_RETURN_TIME_PATTERNS,
      ...config,
    }

    log.debug('FreePBXPresenceBridge created', { host: config.host })
  }

  /**
   * Set the JsSIP User Agent for SIP subscriptions
   *
   * @param ua - JsSIP UA instance
   */
  setUserAgent(ua: UA | null): void {
    this.ua = ua

    if (ua) {
      log.debug('User agent set for presence subscriptions')
    } else {
      // Clean up subscriptions when UA is removed
      this.unsubscribeAll()
    }
  }

  /**
   * Subscribe to presence updates for extensions
   *
   * @param options - Subscription options
   */
  async subscribe(options: FreePBXPresenceSubscriptionOptions): Promise<void> {
    log.info('Subscribing to presence updates', { extensions: options.extensions })

    // Store callbacks
    if (options.onPresenceUpdate) {
      this.onPresenceUpdate = options.onPresenceUpdate
    }
    if (options.onReturnTimeUpdate) {
      this.onReturnTimeUpdate = options.onReturnTimeUpdate
    }

    // Determine which extensions to subscribe to
    const extensions = options.extensions === 'all'
      ? await this.fetchAllExtensions()
      : options.extensions

    if (this.config.useRestApi) {
      // Use REST API polling
      await this.startPolling(extensions, options.pollingInterval || 5000)
    } else {
      // Use SIP SUBSCRIBE
      await this.subscribeViaSIP(extensions)
    }
  }

  /**
   * Subscribe to presence via SIP SUBSCRIBE method
   *
   * Note: JsSIP doesn't have a built-in subscribe() method for presence.
   * This would require extending JsSIP or using a custom implementation.
   * For now, we fall back to REST API polling which is more reliable.
   */
  private async subscribeViaSIP(extensions: string[]): Promise<void> {
    if (!this.ua) {
      log.warn('Cannot subscribe via SIP: No UA available, falling back to REST API')
      await this.startPolling(extensions, 5000)
      return
    }

    // JsSIP doesn't have native SUBSCRIBE support for presence
    // Fall back to REST API polling for reliability
    log.info('SIP SUBSCRIBE not natively supported in JsSIP, using REST API polling')
    await this.startPolling(extensions, 5000)
  }

  /**
   * Parse PIDF (Presence Information Data Format) document
   * Public method for parsing presence documents when SIP SUBSCRIBE is supported
   */
  parsePIDF(xml: string, extension: string): Partial<FreePBXPresenceStatus> {
    const result: Partial<FreePBXPresenceStatus> = {
      extension,
      pidfDocument: xml,
    }

    try {
      // Simple XML parsing - in production, use a proper XML parser
      // Extract basic state
      const basicMatch = xml.match(/<basic>([^<]+)<\/basic>/i)
      if (basicMatch && basicMatch[1]) {
        result.presenceCode = basicMatch[1].toLowerCase() === 'open'
          ? FreePBXPresenceCode.Available
          : FreePBXPresenceCode.Offline
      }

      // Extract note/status message (may contain return time)
      const noteMatch = xml.match(/<note[^>]*>([^<]+)<\/note>/i)
      if (noteMatch && noteMatch[1]) {
        const statusMessage = noteMatch[1]
        result.awayMessage = statusMessage

        // Parse return time from status message
        if (this.config.parseReturnTime) {
          const returnTime = this.parseReturnTimeFromMessage(statusMessage)
          if (returnTime) {
            result.returnTime = returnTime
            result.presenceCode = FreePBXPresenceCode.ExtendedAway
            result.awayReason = this.detectAwayReason(statusMessage)
          }
        }
      }

      // Extract device state hint
      const deviceMatch = xml.match(/state="([^"]+)"/i)
      if (deviceMatch && deviceMatch[1]) {
        const hintState = deviceMatch[1].toUpperCase()
        result.hintState = hintState

        if (HINT_STATE_MAP[hintState]) {
          result.presenceCode = HINT_STATE_MAP[hintState]
        }
      }

      // Extract display name
      const displayMatch = xml.match(/<display-name>([^<]+)<\/display-name>/i)
      if (displayMatch && displayMatch[1]) {
        result.displayName = displayMatch[1]
      }
    } catch (error) {
      log.error('Error parsing PIDF document:', error)
    }

    return result
  }

  /**
   * Parse return time from status message
   */
  private parseReturnTimeFromMessage(message: string): ReturnTimeSpec | null {
    if (!message) return null

    // Use custom parser if provided
    if (this.config.returnTimeParser) {
      return this.config.returnTimeParser(message)
    }

    const patterns = this.config.returnTimePatterns || DEFAULT_RETURN_TIME_PATTERNS

    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match) {
        return this.parseMatchedTime(match)
      }
    }

    return null
  }

  /**
   * Parse matched time regex groups into ReturnTimeSpec
   */
  private parseMatchedTime(match: RegExpMatchArray): ReturnTimeSpec | null {
    const now = new Date()
    let returnTime: Date | null = null
    let durationMinutes: number | undefined

    const matchedStr = match[0]
    const group1 = match[1] || ''
    const group2 = match[2] || ''

    // Pattern: "2:30 PM" or "14:30" - absolute time
    if (matchedStr.includes(':') && !matchedStr.toLowerCase().includes('in')) {
      returnTime = this.parseTimeString(group1, now)
    }
    // Pattern: "30 minutes" or "1 hour" - relative duration
    else if (group2) {
      const amount = parseInt(group1, 10)
      const unit = group2.toLowerCase()

      if (unit.startsWith('h')) {
        durationMinutes = amount * 60
      } else {
        durationMinutes = amount
      }

      returnTime = new Date(now.getTime() + durationMinutes * 60000)
    }
    // Pattern: "~15m" or "~2h" - shorthand
    else if (matchedStr.includes('~')) {
      const amount = parseInt(group1, 10)
      const unit = group2.toLowerCase() || 'm'

      durationMinutes = unit === 'h' ? amount * 60 : amount
      returnTime = new Date(now.getTime() + durationMinutes * 60000)
    }

    if (!returnTime) return null

    const remainingMs = returnTime.getTime() - now.getTime()

    return {
      returnTime,
      durationMinutes,
      remainingMs: Math.max(0, remainingMs),
      isOverdue: remainingMs < 0,
      formattedTime: formatReturnTime(returnTime),
      formattedRemaining: formatRemainingTime(remainingMs),
    }
  }

  /**
   * Parse time string like "2:30 PM" or "14:30" into Date
   */
  private parseTimeString(timeStr: string, referenceDate: Date): Date {
    const result = new Date(referenceDate)

    // Try to parse 12-hour format (2:30 PM, 2:30pm, 2:30p)
    const match12h = timeStr.match(/(\d{1,2}):(\d{2})\s*([ap]m?)?/i)
    if (match12h && match12h[1] && match12h[2]) {
      let hours = parseInt(match12h[1], 10)
      const minutes = parseInt(match12h[2], 10)
      const meridiem = match12h[3]?.toLowerCase() || ''

      if (meridiem.startsWith('p') && hours < 12) {
        hours += 12
      } else if (meridiem.startsWith('a') && hours === 12) {
        hours = 0
      }

      result.setHours(hours, minutes, 0, 0)

      // If parsed time is earlier than now, assume tomorrow
      if (result.getTime() < referenceDate.getTime()) {
        result.setDate(result.getDate() + 1)
      }

      return result
    }

    return result
  }

  /**
   * Detect away reason from status message
   */
  private detectAwayReason(message: string): ExtendedAwayReason {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('lunch')) return ExtendedAwayReason.Lunch
    if (lowerMessage.includes('break')) return ExtendedAwayReason.Break
    if (lowerMessage.includes('meeting')) return ExtendedAwayReason.Meeting
    if (lowerMessage.includes('round')) return ExtendedAwayReason.Rounds
    if (lowerMessage.includes('patient')) return ExtendedAwayReason.WithPatient
    if (lowerMessage.includes('procedure')) return ExtendedAwayReason.InProcedure
    if (lowerMessage.includes('vacation')) return ExtendedAwayReason.Vacation
    if (lowerMessage.includes('out of office') || lowerMessage.includes('ooo')) {
      return ExtendedAwayReason.OutOfOffice
    }

    return ExtendedAwayReason.Away
  }

  /**
   * Start REST API polling for presence updates
   */
  private async startPolling(extensions: string[], intervalMs: number): Promise<void> {
    log.info('Starting REST API polling for presence', { extensions: extensions.length, intervalMs })

    // Initial fetch
    await this.pollPresenceStatus(extensions)

    // Set up polling interval
    this.pollingTimer = setInterval(() => {
      this.pollPresenceStatus(extensions).catch((error) => {
        log.error('Polling error:', error)
      })
    }, intervalMs)
  }

  /**
   * Poll FreePBX REST API for presence status
   */
  private async pollPresenceStatus(extensions: string[]): Promise<void> {
    if (!this.config.apiToken) {
      log.warn('No API token configured for REST API polling')
      return
    }

    try {
      const baseUrl = `https://${this.config.host}:${this.config.restPort}`
      const headers: HeadersInit = {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
      }

      for (const extension of extensions) {
        try {
          // Fetch presence status from FreePBX REST API
          const response = await fetch(
            `${baseUrl}/api/presence/${extension}`,
            { headers }
          )

          if (response.ok) {
            const data = await response.json()
            this.updatePresenceFromREST(extension, data)
          } else {
            log.warn(`Failed to fetch presence for ${extension}: ${response.status}`)
          }
        } catch (error) {
          log.error(`Error polling presence for ${extension}:`, error)
        }
      }
    } catch (error) {
      log.error('REST API polling error:', error)
    }
  }

  /**
   * Update presence status from REST API response
   */
  private updatePresenceFromREST(extension: string, data: any): void {
    const presenceData: Partial<FreePBXPresenceStatus> = {
      extension,
      presenceCode: this.mapRESTStatusToCode(data.status),
      displayName: data.displayName || data.name,
      department: data.department,
      location: data.location,
      awayMessage: data.statusMessage,
    }

    // Parse return time from status message
    if (this.config.parseReturnTime && data.statusMessage) {
      const returnTime = this.parseReturnTimeFromMessage(data.statusMessage)
      if (returnTime) {
        presenceData.returnTime = returnTime
        presenceData.presenceCode = FreePBXPresenceCode.ExtendedAway
        presenceData.awayReason = this.detectAwayReason(data.statusMessage)
      }
    }

    this.updatePresenceStatus(extension, presenceData)
  }

  /**
   * Map REST API status string to FreePBX presence code
   */
  private mapRESTStatusToCode(status: string): FreePBXPresenceCode {
    const statusMap: Record<string, FreePBXPresenceCode> = {
      'available': FreePBXPresenceCode.Available,
      'on_phone': FreePBXPresenceCode.OnPhone,
      'busy': FreePBXPresenceCode.Busy,
      'away': FreePBXPresenceCode.Away,
      'extended_away': FreePBXPresenceCode.ExtendedAway,
      'lunch': FreePBXPresenceCode.Lunch,
      'meeting': FreePBXPresenceCode.InMeeting,
      'dnd': FreePBXPresenceCode.Busy,
      'offline': FreePBXPresenceCode.Offline,
    }

    return statusMap[status.toLowerCase()] || FreePBXPresenceCode.Offline
  }

  /**
   * Update presence status and emit events
   */
  private updatePresenceStatus(extension: string, data: Partial<FreePBXPresenceStatus>): void {
    const previousStatus = this.presenceStatus.get(extension)

    // Build complete status object
    const currentStatus: FreePBXPresenceStatus = {
      uri: `sip:${extension}@${this.config.host}`,
      state: mapFreePBXToPresenceState(data.presenceCode || FreePBXPresenceCode.Offline),
      lastUpdated: new Date(),
      presenceCode: data.presenceCode || FreePBXPresenceCode.Offline,
      extension,
      ...previousStatus,
      ...data,
    }

    // Determine event type
    let eventType: FreePBXPresenceEvent['type'] = 'presence_updated'

    if (previousStatus) {
      if (previousStatus.presenceCode !== currentStatus.presenceCode) {
        eventType = 'status_changed'
      } else if (
        data.returnTime &&
        (!previousStatus.returnTime ||
         previousStatus.returnTime.returnTime.getTime() !== data.returnTime.returnTime.getTime())
      ) {
        eventType = 'return_time_updated'
      }
    }

    // Store updated status
    this.presenceStatus.set(extension, currentStatus)

    // Update return time countdown timer
    if (currentStatus.returnTime) {
      this.startReturnTimeCountdown(extension, currentStatus.returnTime)
    } else {
      this.stopReturnTimeCountdown(extension)
    }

    // Emit event
    this.emitPresenceEvent({
      type: eventType,
      extension,
      uri: `sip:${extension}@${this.config.host}`,
      previousStatus,
      currentStatus,
      timestamp: new Date(),
    })
  }

  /**
   * Start countdown timer for return time updates
   */
  private startReturnTimeCountdown(extension: string, _returnTime: ReturnTimeSpec): void {
    // Clear existing timer
    this.stopReturnTimeCountdown(extension)

    // Update return time every second
    const timer = setInterval(() => {
      const status = this.presenceStatus.get(extension)
      if (!status?.returnTime) {
        this.stopReturnTimeCountdown(extension)
        return
      }

      const now = new Date()
      const remainingMs = status.returnTime.returnTime.getTime() - now.getTime()
      const isOverdue = remainingMs < 0

      // Update return time spec
      const updatedReturnTime: ReturnTimeSpec = {
        ...status.returnTime,
        remainingMs: Math.max(0, remainingMs),
        isOverdue,
        formattedRemaining: formatRemainingTime(remainingMs),
      }

      // Check if just became overdue
      if (isOverdue && !status.returnTime.isOverdue) {
        // Emit overdue event
        this.emitPresenceEvent({
          type: 'return_time_expired',
          extension,
          uri: `sip:${extension}@${this.config.host}`,
          currentStatus: {
            ...status,
            returnTime: updatedReturnTime,
          },
          timestamp: new Date(),
        })
      }

      // Update stored status
      this.presenceStatus.set(extension, {
        ...status,
        returnTime: updatedReturnTime,
      })

      // Emit return time update callback
      if (this.onReturnTimeUpdate) {
        this.onReturnTimeUpdate(extension, updatedReturnTime)
      }
    }, 1000)

    this.returnTimeTimers.set(extension, timer)
  }

  /**
   * Stop return time countdown timer
   */
  private stopReturnTimeCountdown(extension: string): void {
    const timer = this.returnTimeTimers.get(extension)
    if (timer) {
      clearInterval(timer)
      this.returnTimeTimers.delete(extension)
    }
  }

  /**
   * Emit presence event to callback
   */
  private emitPresenceEvent(event: FreePBXPresenceEvent): void {
    if (this.onPresenceUpdate) {
      try {
        this.onPresenceUpdate(event)
      } catch (error) {
        log.error('Error in presence update callback:', error)
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(extensions: string[]): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      log.error('Max reconnection attempts reached')
      return
    }

    const interval = this.config.reconnectInterval || 5000
    const backoffInterval = interval * Math.pow(1.5, this.reconnectAttempts)

    log.info(`Scheduling reconnect in ${backoffInterval}ms (attempt ${this.reconnectAttempts + 1})`)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++
      try {
        await this.subscribeViaSIP(extensions)
        this.reconnectAttempts = 0 // Reset on success
      } catch (error) {
        log.error('Reconnection attempt failed:', error)
        this.scheduleReconnect(extensions)
      }
    }, backoffInterval)
  }

  /**
   * Fetch all extensions from FreePBX
   */
  private async fetchAllExtensions(): Promise<string[]> {
    if (!this.config.apiToken) {
      log.warn('Cannot fetch all extensions without API token')
      return []
    }

    try {
      const baseUrl = `https://${this.config.host}:${this.config.restPort}`
      const response = await fetch(
        `${baseUrl}/api/extensions`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        return data.extensions?.map((ext: any) => ext.extension || ext.number) || []
      }
    } catch (error) {
      log.error('Error fetching extensions:', error)
    }

    return []
  }

  /**
   * Get default presence status for an extension
   * Note: Currently unused but reserved for future use when fetching unknown extensions
   */
  getDefaultPresenceStatus(extension: string): FreePBXPresenceStatus {
    return {
      uri: `sip:${extension}@${this.config.host}`,
      state: PresenceState.Offline,
      lastUpdated: new Date(),
      presenceCode: FreePBXPresenceCode.Offline,
      extension,
    }
  }

  /**
   * Get presence status for an extension
   *
   * @param extension - Extension number
   * @returns Presence status or undefined
   */
  getPresenceStatus(extension: string): FreePBXPresenceStatus | undefined {
    return this.presenceStatus.get(extension)
  }

  /**
   * Get all presence statuses
   *
   * @returns Map of extension to presence status
   */
  getAllPresenceStatuses(): Map<string, FreePBXPresenceStatus> {
    return new Map(this.presenceStatus)
  }

  /**
   * Get return time for an extension
   *
   * @param extension - Extension number
   * @returns Return time spec or undefined
   */
  getReturnTime(extension: string): ReturnTimeSpec | undefined {
    return this.presenceStatus.get(extension)?.returnTime
  }

  /**
   * Set custom return time for an extension
   *
   * @param extension - Extension number
   * @param returnTime - Return time Date or duration in minutes
   */
  setReturnTime(extension: string, returnTime: Date | number): void {
    const status = this.presenceStatus.get(extension)
    if (!status) {
      log.warn(`Cannot set return time: Extension ${extension} not found`)
      return
    }

    const returnDate = typeof returnTime === 'number'
      ? new Date(Date.now() + returnTime * 60000)
      : returnTime

    const remainingMs = returnDate.getTime() - Date.now()

    const returnTimeSpec: ReturnTimeSpec = {
      returnTime: returnDate,
      durationMinutes: typeof returnTime === 'number' ? returnTime : undefined,
      remainingMs: Math.max(0, remainingMs),
      isOverdue: remainingMs < 0,
      formattedTime: formatReturnTime(returnDate),
      formattedRemaining: formatRemainingTime(remainingMs),
    }

    this.updatePresenceStatus(extension, {
      returnTime: returnTimeSpec,
      presenceCode: FreePBXPresenceCode.ExtendedAway,
    })
  }

  /**
   * Clear return time for an extension
   *
   * @param extension - Extension number
   */
  clearReturnTime(extension: string): void {
    const status = this.presenceStatus.get(extension)
    if (!status) return

    this.stopReturnTimeCountdown(extension)

    this.updatePresenceStatus(extension, {
      returnTime: undefined,
      presenceCode: FreePBXPresenceCode.Available,
      awayReason: undefined,
      awayMessage: undefined,
    })
  }

  /**
   * Unsubscribe from a specific extension
   *
   * @param extension - Extension to unsubscribe from
   */
  unsubscribe(extension: string): void {
    const subscription = this.subscriptions.get(extension)
    if (subscription) {
      try {
        subscription.terminate()
      } catch (error) {
        log.error(`Error terminating subscription for ${extension}:`, error)
      }
      this.subscriptions.delete(extension)
    }

    this.stopReturnTimeCountdown(extension)
    this.presenceStatus.delete(extension)

    log.debug(`Unsubscribed from extension ${extension}`)
  }

  /**
   * Unsubscribe from all extensions
   */
  unsubscribeAll(): void {
    // Terminate all SIP subscriptions
    for (const [extension, subscription] of this.subscriptions) {
      try {
        subscription.terminate()
      } catch (error) {
        log.error(`Error terminating subscription for ${extension}:`, error)
      }
    }
    this.subscriptions.clear()

    // Stop all return time timers
    for (const [extension] of this.returnTimeTimers) {
      this.stopReturnTimeCountdown(extension)
    }

    // Clear presence data
    this.presenceStatus.clear()

    log.debug('Unsubscribed from all extensions')
  }

  /**
   * Destroy the bridge and clean up resources
   */
  destroy(): void {
    log.debug('Destroying FreePBXPresenceBridge')

    // Mark as destroyed (intentionally unused - reserved for future async operation guards)

    // Stop polling
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }

    // Cancel reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // Unsubscribe from all
    this.unsubscribeAll()

    // Clear callbacks
    this.onPresenceUpdate = null
    this.onReturnTimeUpdate = null

    // Clear UA reference
    this.ua = null

    log.info('FreePBXPresenceBridge destroyed')
  }
}
