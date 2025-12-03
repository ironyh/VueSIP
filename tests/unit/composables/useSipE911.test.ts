/**
 * Unit tests for useSipE911 composable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useSipE911 } from '@/composables/useSipE911'
import type { SipClient } from '@/core/SipClient'
import type {  } from '@/types/e911.types'
import type { EventBus } from '@/core/EventBus'

// Mock EventBus
function createMockEventBus() {
  const listeners: Record<string, Map<string, Function>> = {}
  let idCounter = 0

  return {
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = new Map()
      const id = `listener-${idCounter++}`
      listeners[event].set(id, handler)
      return id
    }),
    off: vi.fn((event: string, handlerOrId: Function | string) => {
      const eventListeners = listeners[event]
      if (!eventListeners) return false
      if (typeof handlerOrId === 'string') {
        return eventListeners.delete(handlerOrId)
      }
      for (const [id, handler] of eventListeners) {
        if (handler === handlerOrId) {
          return eventListeners.delete(id)
        }
      }
      return false
    }),
    emit: (event: string, data: unknown) => {
      listeners[event]?.forEach((handler) => handler(data))
    },
    _listeners: listeners,
  }
}

// Mock SIP client
function createMockSipClient() {
  return {
    getConfig: vi.fn(() => ({
      sipUri: 'sip:1001@example.com',
      displayName: 'Test User',
    })),
  }
}

describe('useSipE911', () => {
  let mockClient: ReturnType<typeof createMockSipClient>
  let mockEventBus: ReturnType<typeof createMockEventBus>
  let clientRef: ReturnType<typeof ref<SipClient | null>>

  beforeEach(() => {
    vi.useFakeTimers()
    mockClient = createMockSipClient()
    mockEventBus = createMockEventBus()
    clientRef = ref(mockClient as unknown as SipClient)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const { config, locations, activeCalls, isMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      expect(config.value.enabled).toBe(true)
      expect(config.value.emergencyNumbers).toContain('911')
      expect(config.value.testNumbers).toContain('933')
      expect(config.value.directDialing).toBe(true)
      expect(config.value.onSiteNotification).toBe(true)
      expect(config.value.dispatchableLocationRequired).toBe(true)
      expect(locations.value.size).toBe(0)
      expect(activeCalls.value.size).toBe(0)
      expect(isMonitoring.value).toBe(false)
    })

    it('should accept custom configuration', () => {
      const { config } = useSipE911(clientRef, mockEventBus as unknown as EventBus, {
        config: {
          defaultCallbackNumber: '+15551234567',
          emergencyNumbers: ['911', '112'],
          recordCalls: false,
        },
      })

      expect(config.value.defaultCallbackNumber).toBe('+15551234567')
      expect(config.value.emergencyNumbers).toContain('112')
      expect(config.value.recordCalls).toBe(false)
    })

    it('should auto-start monitoring when autoStart is true', () => {
      const { isMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus, { autoStart: true })

      expect(isMonitoring.value).toBe(true)
      expect(mockEventBus.on).toHaveBeenCalled()
    })

    it('should not start monitoring by default', () => {
      const { isMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      expect(isMonitoring.value).toBe(false)
      expect(mockEventBus.on).not.toHaveBeenCalled()
    })
  })

  describe('monitoring', () => {
    it('should start monitoring', () => {
      const { startMonitoring, isMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      startMonitoring()

      expect(isMonitoring.value).toBe(true)
      // Should subscribe to sip:new_session for outgoing/incoming call detection
      expect(mockEventBus.on).toHaveBeenCalledWith('sip:new_session', expect.any(Function))
      // Should subscribe to sip:call:ended for call state changes
      expect(mockEventBus.on).toHaveBeenCalledWith('sip:call:ended', expect.any(Function))
    })

    it('should stop monitoring', () => {
      const { startMonitoring, stopMonitoring, isMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      startMonitoring()
      expect(isMonitoring.value).toBe(true)

      stopMonitoring()
      expect(isMonitoring.value).toBe(false)
      expect(mockEventBus.off).toHaveBeenCalled()
    })

    it('should not start monitoring twice', () => {
      const { startMonitoring, isMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      startMonitoring()
      const callCount = mockEventBus.on.mock.calls.length

      startMonitoring()
      expect(mockEventBus.on.mock.calls.length).toBe(callCount)
      expect(isMonitoring.value).toBe(true)
    })
  })

  describe('location management', () => {
    it('should add a location', () => {
      const { addLocation, locations, locationList } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const location = addLocation({
        name: 'Main Office',
        type: 'civic',
        civic: {
          houseNumber: '123',
          streetName: 'Main',
          streetSuffix: 'St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
        },
        isDefault: true,
        isVerified: false,
        extensions: ['1001', '1002'],
      })

      expect(location.id).toBeDefined()
      expect(location.name).toBe('Main Office')
      expect(locations.value.size).toBe(1)
      expect(locationList.value).toHaveLength(1)
    })

    it('should update a location', () => {
      const { addLocation, updateLocation, getLocation } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const location = addLocation({
        name: 'Test Location',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      const result = updateLocation(location.id, { name: 'Updated Name' })

      expect(result).toBe(true)
      expect(getLocation(location.id)?.name).toBe('Updated Name')
    })

    it('should remove a location', () => {
      const { addLocation, removeLocation, locations } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const location = addLocation({
        name: 'Test Location',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      expect(locations.value.size).toBe(1)

      const result = removeLocation(location.id)

      expect(result).toBe(true)
      expect(locations.value.size).toBe(0)
    })

    it('should set default location', () => {
      const { addLocation, setDefaultLocation, defaultLocation } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const loc1 = addLocation({
        name: 'Location 1',
        type: 'civic',
        isDefault: true,
        isVerified: false,
        extensions: [],
      })

      const loc2 = addLocation({
        name: 'Location 2',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      expect(defaultLocation.value?.id).toBe(loc1.id)

      setDefaultLocation(loc2.id)

      expect(defaultLocation.value?.id).toBe(loc2.id)
    })

    it('should get location for extension', () => {
      const { addLocation, getLocationForExtension } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      addLocation({
        name: 'Floor 1',
        type: 'civic',
        isDefault: false,
        isVerified: true,
        extensions: ['1001', '1002', '1003'],
      })

      addLocation({
        name: 'Floor 2',
        type: 'civic',
        isDefault: true,
        isVerified: true,
        extensions: ['2001', '2002', '2003'],
      })

      expect(getLocationForExtension('1001')?.name).toBe('Floor 1')
      expect(getLocationForExtension('2001')?.name).toBe('Floor 2')
      expect(getLocationForExtension('9999')?.name).toBe('Floor 2') // Falls back to default
    })

    it('should verify a location', async () => {
      const { addLocation, verifyLocation, getLocation } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const location = addLocation({
        name: 'Test Location',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      expect(location.isVerified).toBe(false)

      const verifyPromise = verifyLocation(location.id)
      vi.advanceTimersByTime(500)
      const result = await verifyPromise

      expect(result).toBe(true)
      expect(getLocation(location.id)?.isVerified).toBe(true)
      expect(getLocation(location.id)?.verifiedAt).toBeDefined()
    })
  })

  describe('notification recipients', () => {
    it('should add a recipient', () => {
      const { addRecipient, config, recipients } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const recipient = addRecipient({
        name: 'Security Team',
        email: 'security@example.com',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      expect(recipient.id).toBeDefined()
      expect(recipient.name).toBe('Security Team')
      expect(config.value.recipients).toHaveLength(1)
      expect(recipients.value).toHaveLength(1)
    })

    it('should update a recipient', () => {
      const { addRecipient, updateRecipient, config } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const recipient = addRecipient({
        name: 'Security Team',
        email: 'security@example.com',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      const result = updateRecipient(recipient.id, { enabled: false })

      expect(result).toBe(true)
      expect(config.value.recipients[0].enabled).toBe(false)
    })

    it('should remove a recipient', () => {
      const { addRecipient, removeRecipient, config } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const recipient = addRecipient({
        name: 'Security Team',
        email: 'security@example.com',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      expect(config.value.recipients).toHaveLength(1)

      const result = removeRecipient(recipient.id)

      expect(result).toBe(true)
      expect(config.value.recipients).toHaveLength(0)
    })

    it('should filter enabled recipients', () => {
      const { addRecipient, recipients } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      addRecipient({
        name: 'Active Recipient',
        email: 'active@example.com',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      addRecipient({
        name: 'Disabled Recipient',
        email: 'disabled@example.com',
        notificationTypes: ['email'],
        enabled: false,
        priority: 2,
      })

      expect(recipients.value).toHaveLength(1)
      expect(recipients.value[0].name).toBe('Active Recipient')
    })
  })

  describe('configuration', () => {
    it('should update configuration', () => {
      const { updateConfig, config } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      updateConfig({
        defaultCallbackNumber: '+15559876543',
        recordCalls: false,
      })

      expect(config.value.defaultCallbackNumber).toBe('+15559876543')
      expect(config.value.recordCalls).toBe(false)
    })

    it('should update lastUpdated on config change', () => {
      const { updateConfig, config } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const before = config.value.lastUpdated

      vi.advanceTimersByTime(1000)
      updateConfig({ recordCalls: false })

      expect(config.value.lastUpdated.getTime()).toBeGreaterThan(before.getTime())
    })
  })

  describe('compliance checking', () => {
    it('should report compliance issues when not configured', () => {
      const { checkCompliance } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const result = checkCompliance()

      expect(result.compliant).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues.some((i) => i.includes('notification recipient'))).toBe(true)
      expect(result.issues.some((i) => i.includes('location'))).toBe(true)
      expect(result.issues.some((i) => i.includes('Callback number'))).toBe(true)
    })

    it('should report compliant when properly configured', () => {
      const { addLocation, addRecipient, updateConfig, checkCompliance } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      updateConfig({ defaultCallbackNumber: '+15551234567' })

      addLocation({
        name: 'Main Office',
        type: 'civic',
        civic: {
          houseNumber: '123',
          streetName: 'Main',
          streetSuffix: 'St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
        },
        isDefault: true,
        isVerified: true,
        extensions: ['1001'],
      })

      addRecipient({
        name: 'Security',
        email: 'security@example.com',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      const result = checkCompliance()

      expect(result.compliant).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect unverified locations', () => {
      const { addLocation, addRecipient, updateConfig, checkCompliance } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      updateConfig({ defaultCallbackNumber: '+15551234567' })

      addLocation({
        name: 'Main Office',
        type: 'civic',
        isDefault: true,
        isVerified: false, // Not verified
        extensions: ['1001'],
      })

      addRecipient({
        name: 'Security',
        email: 'security@example.com',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      const result = checkCompliance()

      expect(result.compliant).toBe(false)
      expect(result.issues.some((i) => i.includes('not verified'))).toBe(true)
    })
  })

  describe('compliance logging', () => {
    it('should log events', () => {
      const { addLocation, complianceLogs, getLogs } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      addLocation({
        name: 'Test Location',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      expect(complianceLogs.value.length).toBeGreaterThan(0)
      expect(getLogs(1)).toHaveLength(1)
    })

    it('should export logs as JSON', () => {
      const { addLocation, exportLogs } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      addLocation({
        name: 'Test Location',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      const json = exportLogs('json')
      const parsed = JSON.parse(json)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBeGreaterThan(0)
    })

    it('should export logs as CSV', () => {
      const { addLocation, exportLogs } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      addLocation({
        name: 'Test Location',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      const csv = exportLogs('csv')

      expect(csv).toContain('id,callId,event,description')
      expect(csv).toContain('location_updated')
    })

    it('should properly escape CSV fields with special characters', () => {
      const { addLocation, exportLogs, complianceLogs: _complianceLogs } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      // Add a location with a comma in the name (quotes get sanitized out)
      addLocation({
        name: 'Test, Location Special',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      const csv = exportLogs('csv')

      // Should properly escape fields with commas by wrapping in quotes
      expect(csv).toContain('"Location added: Test, Location Special"')
    })

    it('should clear old logs', () => {
      const { addLocation, clearOldLogs, complianceLogs } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      // Add some logs
      addLocation({ name: 'Loc1', type: 'civic', isDefault: false, isVerified: false, extensions: [] })

      const initialCount = complianceLogs.value.length

      // Clear logs older than 1 hour in the future (should clear nothing)
      const futureDate = new Date(Date.now() + 60 * 60 * 1000)
      const removed = clearOldLogs(futureDate)

      expect(removed).toBe(initialCount)
      expect(complianceLogs.value.length).toBe(1) // Only the clear log remains
    })
  })

  describe('call history', () => {
    it('should get calls in date range', () => {
      const { callHistory, getCallsInRange } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Manually add a call to history
      callHistory.value.push({
        id: 'test-call',
        channel: 'test-channel',
        callerExtension: '1001',
        callerIdNum: '5551234567',
        callerIdName: 'Test User',
        dialedNumber: '911',
        status: 'completed',
        location: null,
        callbackNumber: '',
        startTime: now,
        endTime: now,
        notificationSent: false,
        notifiedAdmins: [],
        psapCallbackReceived: false,
      })

      const inRange = getCallsInRange(yesterday, tomorrow)
      expect(inRange).toHaveLength(1)

      const outOfRange = getCallsInRange(
        new Date(now.getTime() - 48 * 60 * 60 * 1000),
        new Date(now.getTime() - 24 * 60 * 60 * 1000)
      )
      expect(outOfRange).toHaveLength(0)
    })

    it('should get call by ID', () => {
      const { callHistory, getCall } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      callHistory.value.push({
        id: 'specific-call-id',
        channel: 'test-channel',
        callerExtension: '1001',
        callerIdNum: '5551234567',
        callerIdName: 'Test User',
        dialedNumber: '911',
        status: 'completed',
        location: null,
        callbackNumber: '',
        startTime: new Date(),
        notificationSent: false,
        notifiedAdmins: [],
        psapCallbackReceived: false,
      })

      expect(getCall('specific-call-id')).toBeDefined()
      expect(getCall('non-existent-id')).toBeNull()
    })
  })

  describe('location formatting', () => {
    it('should format civic address', () => {
      const { addLocation, formatLocation } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const location = addLocation({
        name: 'Main Office',
        type: 'civic',
        civic: {
          houseNumber: '123',
          preDirectional: 'N',
          streetName: 'Main',
          streetSuffix: 'St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
          floor: '3',
          room: '301',
        },
        isDefault: true,
        isVerified: true,
        extensions: [],
      })

      const formatted = formatLocation(location)

      expect(formatted).toContain('123')
      expect(formatted).toContain('N')
      expect(formatted).toContain('Main')
      expect(formatted).toContain('Anytown')
      expect(formatted).toContain('CA')
      expect(formatted).toContain('Floor 3')
      expect(formatted).toContain('Room 301')
    })

    it('should format geo coordinates', () => {
      const { addLocation, formatLocation } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const location = addLocation({
        name: 'GPS Location',
        type: 'geo',
        geo: {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(),
        },
        isDefault: true,
        isVerified: true,
        extensions: [],
      })

      const formatted = formatLocation(location)

      expect(formatted).toContain('GPS:')
      expect(formatted).toContain('37.774')
      expect(formatted).toContain('-122.419')
    })
  })

  describe('test notifications', () => {
    it('should send test notification', async () => {
      const onNotificationSent = vi.fn()
      const { addRecipient, sendTestNotification } = useSipE911(clientRef, mockEventBus as unknown as EventBus, {
        onNotificationSent,
      })

      addRecipient({
        name: 'Test Recipient',
        email: 'test@example.com',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      const promise = sendTestNotification()
      vi.advanceTimersByTime(200)
      const result = await promise

      expect(result).toBe(true)
      expect(onNotificationSent).toHaveBeenCalled()
    })

    it('should fail test notification without recipients', async () => {
      const { sendTestNotification, error } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const result = await sendTestNotification()

      expect(result).toBe(false)
      expect(error.value).toContain('No active notification recipients')
    })
  })

  describe('callbacks', () => {
    it('should call onEmergencyCall callback', () => {
      const onEmergencyCall = vi.fn()
      const { startMonitoring, addLocation } = useSipE911(clientRef, mockEventBus as unknown as EventBus, {
        onEmergencyCall,
      })

      addLocation({
        name: 'Office',
        type: 'civic',
        isDefault: true,
        isVerified: true,
        extensions: ['1001'],
      })

      startMonitoring()

      // Simulate outgoing 911 call via sip:new_session event
      mockEventBus.emit('sip:new_session', {
        session: {
          direction: 'outgoing',
          remoteIdentity: { uri: { user: '911' } },
        },
        callId: 'test-call-1',
      })

      expect(onEmergencyCall).toHaveBeenCalled()
      const call = onEmergencyCall.mock.calls[0][0]
      expect(call.dialedNumber).toBe('911')
    })

    it('should call onEvent callback', () => {
      const onEvent = vi.fn()
      const { startMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus, { onEvent })

      startMonitoring()

      // Simulate outgoing 911 call via sip:new_session event
      mockEventBus.emit('sip:new_session', {
        session: {
          direction: 'outgoing',
          remoteIdentity: { uri: { user: '911' } },
        },
        callId: 'test-call-1',
      })

      expect(onEvent).toHaveBeenCalled()
      expect(onEvent.mock.calls.some((call) => call[0].type === 'call_detected')).toBe(true)
    })
  })

  describe('computed properties', () => {
    it('should track active emergency calls', () => {
      const { startMonitoring, hasActiveEmergency, activeCallList, activeCalls } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      startMonitoring()

      expect(hasActiveEmergency.value).toBe(false)
      expect(activeCallList.value).toHaveLength(0)

      // Simulate 911 call via sip:new_session event
      mockEventBus.emit('sip:new_session', {
        session: {
          direction: 'outgoing',
          remoteIdentity: { uri: { user: '911' } },
        },
        callId: 'test-call-1',
      })

      expect(hasActiveEmergency.value).toBe(true)
      expect(activeCallList.value).toHaveLength(1)
      expect(activeCalls.value.size).toBe(1)
    })

    it('should compute stats', () => {
      const { stats, startMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      startMonitoring()

      expect(stats.value.totalCalls).toBe(0)

      // Simulate 911 call via sip:new_session event
      mockEventBus.emit('sip:new_session', {
        session: {
          direction: 'outgoing',
          remoteIdentity: { uri: { user: '911' } },
        },
        callId: 'test-call-1',
      })

      expect(stats.value.totalCalls).toBe(1)

      // Simulate test call via sip:new_session event
      mockEventBus.emit('sip:new_session', {
        session: {
          direction: 'outgoing',
          remoteIdentity: { uri: { user: '933' } },
        },
        callId: 'test-call-2',
      })

      expect(stats.value.testCalls).toBe(1)
      expect(stats.value.totalCalls).toBe(1) // Test calls don't count toward total
    })
  })

  describe('input validation', () => {
    it('should reject invalid extension', () => {
      const { getLocationForExtension } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      expect(getLocationForExtension('')).toBeNull()
      expect(getLocationForExtension('<script>')).toBeNull()
    })

    it('should sanitize location name', () => {
      const { addLocation } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const location = addLocation({
        name: '<script>alert("xss")</script>',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      expect(location.name).not.toContain('<script>')
      expect(location.name).not.toContain('>')
    })

    it('should sanitize location name on update', () => {
      const { addLocation, updateLocation, getLocation } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const location = addLocation({
        name: 'Valid Name',
        type: 'civic',
        isDefault: false,
        isVerified: false,
        extensions: [],
      })

      updateLocation(location.id, { name: '<script>malicious</script>' })

      const updated = getLocation(location.id)
      expect(updated?.name).not.toContain('<script>')
      expect(updated?.name).not.toContain('>')
    })

    it('should sanitize recipient email', () => {
      const { addRecipient, config: _config } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const recipient = addRecipient({
        name: 'Test',
        email: 'test@example.com<script>',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      // Sanitization removes dangerous characters like < and >
      expect(recipient.email).not.toContain('<')
      expect(recipient.email).not.toContain('>')
      // The word "script" remains but the tags are removed
      expect(recipient.email).toBe('test@example.comscript')
    })

    it('should sanitize recipient phone number', () => {
      const { addRecipient } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const recipient = addRecipient({
        name: 'Test',
        phone: '+1-555-123-4567<script>',
        notificationTypes: ['sms'],
        enabled: true,
        priority: 1,
      })

      expect(recipient.phone).not.toContain('<script>')
      expect(recipient.phone).toBe('+1-555-123-4567')
    })

    it('should sanitize recipient webhook URL', () => {
      const { addRecipient } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const recipient = addRecipient({
        name: 'Test',
        webhookUrl: 'https://example.com/webhook<script>',
        notificationTypes: ['webhook'],
        enabled: true,
        priority: 1,
      })

      expect(recipient.webhookUrl).not.toContain('<script>')
    })

    it('should reject invalid webhook URLs', () => {
      const { addRecipient } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const recipient = addRecipient({
        name: 'Test',
        webhookUrl: 'javascript:alert("xss")',
        notificationTypes: ['webhook'],
        enabled: true,
        priority: 1,
      })

      // Invalid URL scheme should be rejected
      expect(recipient.webhookUrl).toBeUndefined()
    })

    it('should sanitize fields on recipient update', () => {
      const { addRecipient, updateRecipient, config } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      const recipient = addRecipient({
        name: 'Original',
        email: 'original@example.com',
        notificationTypes: ['email'],
        enabled: true,
        priority: 1,
      })

      updateRecipient(recipient.id, {
        name: '<script>hacked</script>',
        email: 'hacked@example.com<script>',
      })

      const updated = config.value.recipients.find((r) => r.id === recipient.id)
      expect(updated?.name).not.toContain('<script>')
      expect(updated?.email).not.toContain('<script>')
    })
  })

  describe('client changes', () => {
    it('should handle client changes when monitoring', async () => {
      const { startMonitoring, isMonitoring } = useSipE911(clientRef, mockEventBus as unknown as EventBus)

      startMonitoring()
      expect(isMonitoring.value).toBe(true)

      const initialOffCalls = mockEventBus.off.mock.calls.length
      const initialOnCalls = mockEventBus.on.mock.calls.length

      // Change client
      const newClient = createMockSipClient()
      clientRef.value = newClient as unknown as SipClient

      await nextTick()

      // Should have reinitialized event listeners (off for old, on for new)
      expect(mockEventBus.off.mock.calls.length).toBeGreaterThan(initialOffCalls)
      expect(mockEventBus.on.mock.calls.length).toBeGreaterThan(initialOnCalls)
    })
  })
})
