/**
 * Unit tests for useAmiIVR composable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiIVR } from '@/composables/useAmiIVR'
import type { AmiClient } from '@/core/AmiClient'

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useAmiIVR', () => {
  let mockClient: AmiClient
  let eventHandlers: Map<string, Set<(event: unknown) => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    eventHandlers = new Map()

    mockClient = {
      on: vi.fn((event: string, handler: (data: unknown) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, new Set())
        }
        eventHandlers.get(event)!.add(handler)
      }),
      off: vi.fn((event: string, handler: (data: unknown) => void) => {
        eventHandlers.get(event)?.delete(handler)
      }),
      sendAction: vi.fn().mockResolvedValue({ data: { Response: 'Success' } }),
      isConnected: vi.fn().mockReturnValue(true),
    } as unknown as AmiClient
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  function emitEvent(eventData: unknown) {
    const handlers = eventHandlers.get('event')
    const amiMessage = {
      type: 'event' as const,
      server_id: 1,
      server_name: 'test',
      ssl: false,
      data: eventData,
    }
    handlers?.forEach((handler) => handler(amiMessage))
  }

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ivrs, isMonitoring, isLoading, error } = useAmiIVR(clientRef)

      expect(ivrs.value.size).toBe(0)
      expect(isMonitoring.value).toBe(false)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should auto-start when autoStart option is true', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { isMonitoring } = useAmiIVR(clientRef, {
        autoStart: true,
        ivrIds: ['ivr-main'],
      })

      expect(isMonitoring.value).toBe(true)
    })

    it('should initialize IVRs from ivrIds option', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { ivrs, startMonitoring } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main', 'ivr-support', 'ivr-sales'],
      })

      startMonitoring()

      expect(ivrs.value.size).toBe(3)
      expect(ivrs.value.has('ivr-main')).toBe(true)
      expect(ivrs.value.has('ivr-support')).toBe(true)
      expect(ivrs.value.has('ivr-sales')).toBe(true)
    })
  })

  describe('Monitoring Control', () => {
    it('should start monitoring when startMonitoring is called', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, isMonitoring } = useAmiIVR(clientRef)

      startMonitoring()

      expect(isMonitoring.value).toBe(true)
      expect(mockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })

    it('should stop monitoring when stopMonitoring is called', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, stopMonitoring, isMonitoring } = useAmiIVR(clientRef)

      startMonitoring()
      expect(isMonitoring.value).toBe(true)

      stopMonitoring()
      expect(isMonitoring.value).toBe(false)
      expect(mockClient.off).toHaveBeenCalled()
    })

    it('should not start monitoring twice', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring } = useAmiIVR(clientRef)

      startMonitoring()
      startMonitoring()

      expect(mockClient.on).toHaveBeenCalledTimes(1)
    })
  })

  describe('IVR Management', () => {
    it('should get IVR by ID', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getIVR } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const ivr = getIVR('ivr-main')
      expect(ivr).toBeDefined()
      expect(ivr?.id).toBe('ivr-main')
    })

    it('should return null for non-existent IVR', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getIVR } = useAmiIVR(clientRef)

      startMonitoring()

      const ivr = getIVR('non-existent')
      expect(ivr).toBeNull()
    })

    it('should select IVR for detailed view', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, selectIVR, selectedIVR } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()
      selectIVR('ivr-main')

      expect(selectedIVR.value).toBeDefined()
      expect(selectedIVR.value?.id).toBe('ivr-main')
    })

    it('should deselect IVR when null is passed', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, selectIVR, selectedIVR } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()
      selectIVR('ivr-main')
      selectIVR(null)

      expect(selectedIVR.value).toBeNull()
    })

    it('should enable IVR', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, enableIVR, getIVR } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()
      const ivr = getIVR('ivr-main')
      if (ivr) ivr.enabled = false

      const result = await enableIVR('ivr-main')

      expect(result).toBe(true)
      expect(getIVR('ivr-main')?.enabled).toBe(true)
    })

    it('should disable IVR', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, disableIVR, getIVR } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const result = await disableIVR('ivr-main')

      expect(result).toBe(true)
      expect(getIVR('ivr-main')?.enabled).toBe(false)
    })
  })

  describe('Caller Tracking', () => {
    it('should track caller entering IVR via VarSet event', async () => {
      const onCallerEntered = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCallers, ivrs: _ivrs } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
        onCallerEntered,
      })

      startMonitoring()

      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
        CallerIDNum: '5551234567',
        CallerIDName: 'John Doe',
      })

      await nextTick()

      const callers = getCallers('ivr-main')
      expect(callers.length).toBe(1)
      expect(callers[0].callerIdNum).toBe('5551234567')
      expect(callers[0].callerIdName).toBe('John Doe')
      expect(onCallerEntered).toHaveBeenCalled()
    })

    it('should track caller exiting IVR', async () => {
      const onCallerExited = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCallers } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
        onCallerExited,
      })

      startMonitoring()

      // Enter IVR
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
        CallerIDNum: '5551234567',
      })

      await nextTick()
      expect(getCallers('ivr-main').length).toBe(1)

      // Exit IVR
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_EXIT',
        Value: '1001',
      })

      await nextTick()

      expect(getCallers('ivr-main').length).toBe(0)
      expect(onCallerExited).toHaveBeenCalledWith('ivr-main', 'PJSIP/1001-00000001', '1001')
    })

    it('should track caller abandoning (hangup) in IVR', async () => {
      const onCallerExited = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCallers, getStats } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
        onCallerExited,
      })

      startMonitoring()

      // Enter IVR
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
        CallerIDNum: '5551234567',
      })

      await nextTick()

      // Hangup
      emitEvent({
        Event: 'Hangup',
        Channel: 'PJSIP/1001-00000001',
      })

      await nextTick()

      expect(getCallers('ivr-main').length).toBe(0)
      expect(getStats('ivr-main')?.abandonedCalls).toBe(1)
    })

    it('should get specific caller', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
        CallerIDNum: '5551234567',
      })

      await nextTick()

      const caller = getCaller('ivr-main', 'PJSIP/1001-00000001')
      expect(caller).toBeDefined()
      expect(caller?.callerIdNum).toBe('5551234567')
    })

    it('should return null for non-existent caller', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const caller = getCaller('ivr-main', 'non-existent')
      expect(caller).toBeNull()
    })
  })

  describe('DTMF Handling', () => {
    it('should track DTMF input', async () => {
      const onEvent = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
        onEvent,
      })

      startMonitoring()

      // Enter IVR
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
        CallerIDNum: '5551234567',
      })

      await nextTick()

      // DTMF input
      emitEvent({
        Event: 'DTMFEnd',
        Channel: 'PJSIP/1001-00000001',
        Digit: '1',
      })

      await nextTick()

      const caller = getCaller('ivr-main', 'PJSIP/1001-00000001')
      expect(caller?.dtmfInput).toBe('1')
      expect(caller?.state).toBe('inputting')
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dtmf_received',
          digit: '1',
        })
      )
    })

    it('should track multiple DTMF inputs', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      // Enter IVR
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
      })

      await nextTick()

      // Multiple DTMF inputs
      emitEvent({ Event: 'DTMFEnd', Channel: 'PJSIP/1001-00000001', Digit: '1' })
      emitEvent({ Event: 'DTMFEnd', Channel: 'PJSIP/1001-00000001', Digit: '2' })
      emitEvent({ Event: 'DTMFEnd', Channel: 'PJSIP/1001-00000001', Digit: '3' })

      await nextTick()

      const caller = getCaller('ivr-main', 'PJSIP/1001-00000001')
      expect(caller?.dtmfInput).toBe('123')
    })

    it('should ignore invalid DTMF digits', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      // Enter IVR
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
      })

      await nextTick()

      // Invalid DTMF
      emitEvent({ Event: 'DTMFEnd', Channel: 'PJSIP/1001-00000001', Digit: 'A' })

      await nextTick()

      const caller = getCaller('ivr-main', 'PJSIP/1001-00000001')
      expect(caller?.dtmfInput).toBe('')
    })

    it('should allow trackDTMF public method', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, trackDTMF, getCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      // Enter IVR
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
      })

      await nextTick()

      trackDTMF('PJSIP/1001-00000001', '5')

      const caller = getCaller('ivr-main', 'PJSIP/1001-00000001')
      expect(caller?.dtmfInput).toBe('5')
    })
  })

  describe('Breakout', () => {
    it('should breakout caller from IVR', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, breakoutCaller, getCallers } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      // Enter IVR
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
        CallerIDNum: '5551234567',
      })

      await nextTick()

      const result = await breakoutCaller('ivr-main', 'PJSIP/1001-00000001', '2001')

      expect(result.success).toBe(true)
      expect(result.destination).toBe('2001')
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'Redirect',
        Channel: 'PJSIP/1001-00000001',
        Context: 'from-internal',
        Exten: '2001',
        Priority: '1',
      })
      expect(getCallers('ivr-main').length).toBe(0)
    })

    it('should return error for invalid IVR ID', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { breakoutCaller } = useAmiIVR(clientRef)

      const result = await breakoutCaller('<script>', 'PJSIP/1001-00000001', '2001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid IVR ID')
    })

    it('should return error for invalid channel', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, breakoutCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const result = await breakoutCaller('ivr-main', '<script>', '2001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid channel')
    })

    it('should return error for invalid destination', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, breakoutCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const result = await breakoutCaller('ivr-main', 'PJSIP/1001-00000001', '<script>')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid destination')
    })

    it('should return error when caller not found', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, breakoutCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const result = await breakoutCaller('ivr-main', 'PJSIP/1001-00000001', '2001')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Caller not found in IVR')
    })

    it('should breakout all callers from IVR', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, breakoutAllCallers, getCallers } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      // Enter multiple callers
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
      })
      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1002-00000002',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
      })

      await nextTick()
      expect(getCallers('ivr-main').length).toBe(2)

      const results = await breakoutAllCallers('ivr-main', '2001')

      expect(results.length).toBe(2)
      expect(results.every((r) => r.success)).toBe(true)
      expect(getCallers('ivr-main').length).toBe(0)
    })
  })

  describe('Statistics', () => {
    it('should get IVR statistics', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getStats } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const stats = getStats('ivr-main')
      expect(stats).toBeDefined()
      expect(stats?.totalCallers).toBe(0)
      expect(stats?.currentCallers).toBe(0)
    })

    it('should update statistics when caller enters', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getStats } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
      })

      await nextTick()

      const stats = getStats('ivr-main')
      expect(stats?.totalCallers).toBe(1)
      expect(stats?.currentCallers).toBe(1)
    })

    it('should update peak callers', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getStats } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      // Enter 3 callers
      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1001-00000001', Variable: 'IVR_CONTEXT', Value: 'ivr-main' })
      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1002-00000002', Variable: 'IVR_CONTEXT', Value: 'ivr-main' })
      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1003-00000003', Variable: 'IVR_CONTEXT', Value: 'ivr-main' })

      await nextTick()

      expect(getStats('ivr-main')?.peakCallers).toBe(3)

      // One caller exits
      emitEvent({ Event: 'Hangup', Channel: 'PJSIP/1001-00000001' })

      await nextTick()

      // Peak should remain 3
      expect(getStats('ivr-main')?.peakCallers).toBe(3)
      expect(getStats('ivr-main')?.currentCallers).toBe(2)
    })

    it('should clear statistics', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getStats, clearStats } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      // Generate some stats
      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1001-00000001', Variable: 'IVR_CONTEXT', Value: 'ivr-main' })
      emitEvent({ Event: 'Hangup', Channel: 'PJSIP/1001-00000001' })

      await nextTick()

      expect(getStats('ivr-main')?.totalCallers).toBe(1)

      clearStats('ivr-main')

      const stats = getStats('ivr-main')
      expect(stats?.totalCallers).toBe(0)
      expect(stats?.abandonedCalls).toBe(0)
    })

    it('should return null for non-existent IVR stats', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { getStats } = useAmiIVR(clientRef)

      const stats = getStats('non-existent')
      expect(stats).toBeNull()
    })
  })

  describe('Computed Properties', () => {
    it('should compute total callers across all IVRs', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, totalCallers } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main', 'ivr-support'],
      })

      startMonitoring()

      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1001-00000001', Variable: 'IVR_CONTEXT', Value: 'ivr-main' })
      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1002-00000002', Variable: 'IVR_CONTEXT', Value: 'ivr-support' })

      await nextTick()

      expect(totalCallers.value).toBe(2)
    })

    it('should compute all callers list', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, allCallers } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main', 'ivr-support'],
      })

      startMonitoring()

      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1001-00000001', Variable: 'IVR_CONTEXT', Value: 'ivr-main', CallerIDNum: '111' })
      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1002-00000002', Variable: 'IVR_CONTEXT', Value: 'ivr-support', CallerIDNum: '222' })

      await nextTick()

      expect(allCallers.value.length).toBe(2)
      expect(allCallers.value.map((c) => c.callerIdNum).sort()).toEqual(['111', '222'])
    })

    it('should compute active IVRs', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, activeIVRs } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main', 'ivr-support', 'ivr-sales'],
      })

      startMonitoring()

      emitEvent({ Event: 'VarSet', Channel: 'PJSIP/1001-00000001', Variable: 'IVR_CONTEXT', Value: 'ivr-main' })

      await nextTick()

      expect(activeIVRs.value.length).toBe(1)
      expect(activeIVRs.value[0].id).toBe('ivr-main')
    })

    it('should compute disabled IVRs', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, disableIVR, disabledIVRs } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main', 'ivr-support'],
      })

      startMonitoring()

      await disableIVR('ivr-support')

      expect(disabledIVRs.value.length).toBe(1)
      expect(disabledIVRs.value[0].id).toBe('ivr-support')
    })
  })

  describe('Event Callbacks', () => {
    it('should call onEvent callback', async () => {
      const onEvent = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
        onEvent,
      })

      startMonitoring()

      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
      })

      await nextTick()

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'caller_entered',
          ivrId: 'ivr-main',
        })
      )
    })

    it('should call onCallerEntered callback', async () => {
      const onCallerEntered = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
        onCallerEntered,
      })

      startMonitoring()

      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
        CallerIDNum: '5551234567',
      })

      await nextTick()

      expect(onCallerEntered).toHaveBeenCalledWith(
        'ivr-main',
        expect.objectContaining({
          callerIdNum: '5551234567',
        })
      )
    })

    it('should call onCallerExited callback', async () => {
      const onCallerExited = vi.fn()
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
        onCallerExited,
      })

      startMonitoring()

      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_CONTEXT',
        Value: 'ivr-main',
      })

      await nextTick()

      emitEvent({
        Event: 'VarSet',
        Channel: 'PJSIP/1001-00000001',
        Variable: 'IVR_EXIT',
        Value: '1001',
      })

      await nextTick()

      expect(onCallerExited).toHaveBeenCalledWith('ivr-main', 'PJSIP/1001-00000001', '1001')
    })

    it('should call onError callback', async () => {
      const onError = vi.fn()
      const clientRef = ref<AmiClient | null>(null)
      const { refresh } = useAmiIVR(clientRef, {
        onError,
      })

      await refresh()

      expect(onError).toHaveBeenCalledWith('AMI client not available')
    })
  })

  describe('Input Validation', () => {
    it('should reject invalid IVR ID', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { enableIVR, disableIVR, getIVR } = useAmiIVR(clientRef)

      expect(getIVR('<script>alert(1)</script>')).toBeNull()
      expect(await enableIVR('<script>')).toBe(false)
      expect(await disableIVR('<script>')).toBe(false)
    })

    it('should reject invalid channel in getCaller', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getCaller } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      expect(getCaller('ivr-main', '<script>')).toBeNull()
    })

    it('should sanitize IVR names', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getIVR } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const ivr = getIVR('ivr-main')
      expect(ivr?.name).not.toContain('<')
      expect(ivr?.name).not.toContain('>')
    })
  })

  describe('Client Changes', () => {
    it('should handle client changes while monitoring', async () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, isMonitoring } = useAmiIVR(clientRef)

      startMonitoring()
      expect(isMonitoring.value).toBe(true)

      // Change client
      const newClient = {
        ...mockClient,
        on: vi.fn(),
        off: vi.fn(),
      } as unknown as AmiClient

      clientRef.value = newClient

      await nextTick()

      expect(mockClient.off).toHaveBeenCalled()
      expect(newClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })
  })

  describe('Menu Stats', () => {
    it('should get menu stats', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getMenuStats, getIVR } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const ivr = getIVR('ivr-main')
      expect(ivr).toBeDefined()

      const stats = getMenuStats('ivr-main', `${ivr?.rootMenuId}`)
      expect(stats).toBeDefined()
      expect(Array.isArray(stats)).toBe(true)
    })

    it('should return null for non-existent menu', () => {
      const clientRef = ref<AmiClient | null>(mockClient)
      const { startMonitoring, getMenuStats } = useAmiIVR(clientRef, {
        ivrIds: ['ivr-main'],
      })

      startMonitoring()

      const stats = getMenuStats('ivr-main', 'non-existent-menu')
      expect(stats).toBeNull()
    })
  })
})
