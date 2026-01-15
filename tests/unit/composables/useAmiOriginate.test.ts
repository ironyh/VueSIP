/**
 * useAmiOriginate Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiOriginate } from '@/composables/useAmiOriginate'
import type { AmiClient } from '@/core/AmiClient'

// Mock AMI client
function createMockClient() {
  const handlers = new Map<string, Set<Function>>()

  return {
    send: vi.fn(),
    sendAction: vi.fn().mockResolvedValue({ data: { Response: 'Success' } }),
    on: vi.fn((event: string, handler: Function) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      handlers.get(event)?.delete(handler)
    }),
    emit: (event: string, data: unknown) => {
      handlers.get(event)?.forEach((h) => h(data))
    },
  } as unknown as AmiClient & { emit: (event: string, data: unknown) => void }
}

describe('useAmiOriginate', () => {
  let mockClient: ReturnType<typeof createMockClient>
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    vi.useFakeTimers()
    mockClient = createMockClient()
    clientRef = ref<AmiClient | null>(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { isOriginating, lastResult, progress, error } = useAmiOriginate(clientRef)

      expect(isOriginating.value).toBe(false)
      expect(lastResult.value).toBe(null)
      expect(progress.value).toBe(null)
      expect(error.value).toBe(null)
    })

    it('should setup events when client connects', async () => {
      useAmiOriginate(clientRef)
      clientRef.value = mockClient
      await nextTick()

      expect(mockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })

    it('should not setup events when useEvents is false', async () => {
      clientRef.value = mockClient
      useAmiOriginate(clientRef, { useEvents: false })
      await nextTick()

      expect(mockClient.on).not.toHaveBeenCalled()
    })
  })

  describe('originate', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should originate a basic call', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success', Message: 'Originate successfully queued' },
      })

      const { originate, isOriginating, lastResult } = useAmiOriginate(clientRef)

      const resultPromise = originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      expect(isOriginating.value).toBe(true)

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.actionId).toBeTruthy()
      expect(lastResult.value).toStrictEqual(result)

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Exten: '200',
          Context: 'from-internal',
          Priority: '1',
          Async: 'true',
        })
      )
    })

    it('should originate with all options', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { originate } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '5551234567',
        context: 'from-external',
        priority: 1,
        timeout: 45,
        callerId: '"Sales Dept" <1001>',
        account: 'sales',
        variables: { CAMPAIGN: 'winter2024', AGENT_ID: '101' },
        codecs: ['ulaw', 'alaw'],
        earlyMedia: true,
        async: true,
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Exten: '5551234567',
          Context: 'from-external',
          Priority: '1',
          Timeout: '45000',
          CallerID: '"Sales Dept" <1001>',
          Account: 'sales',
          Variable: 'CAMPAIGN=winter2024,AGENT_ID=101',
          Codecs: 'ulaw,alaw',
          EarlyMedia: 'true',
          Async: 'true',
        })
      )
    })

    it('should originate to application', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { originate } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '',
        context: '',
        application: 'Playback',
        data: 'hello-world',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Application: 'Playback',
          Data: 'hello-world',
        })
      )
    })

    it('should handle originate failure', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Error', Message: 'Channel does not exist' },
      })

      const { originate, error, isOriginating } = useAmiOriginate(clientRef)

      const result = await originate({
        channel: 'PJSIP/invalid',
        exten: '200',
        context: 'from-internal',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Channel does not exist')
      expect(error.value).toBe('Channel does not exist')
      expect(isOriginating.value).toBe(false)
    })

    it('should handle network error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Connection lost'))

      const { originate, error, isOriginating } = useAmiOriginate(clientRef)

      const result = await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection lost')
      expect(error.value).toBe('Connection lost')
      expect(isOriginating.value).toBe(false)
    })

    it('should validate required fields - missing channel', async () => {
      const { originate } = useAmiOriginate(clientRef)

      const result = await originate({
        channel: '',
        exten: '200',
        context: 'from-internal',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Channel is required')
      expect(mockClient.sendAction).not.toHaveBeenCalled()
    })

    it('should validate required fields - missing exten and application', async () => {
      const { originate } = useAmiOriginate(clientRef)

      const result = await originate({
        channel: 'PJSIP/1001',
        exten: '',
        context: '',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Either application or exten+context is required')
      expect(mockClient.sendAction).not.toHaveBeenCalled()
    })

    it('should handle non-Error exception', async () => {
      mockClient.sendAction.mockRejectedValue('Unknown error string')

      const { originate, error } = useAmiOriginate(clientRef)

      const result = await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Originate failed')
      expect(error.value).toBe('Originate failed')
    })

    it('should return error when client not connected', async () => {
      clientRef.value = null

      const { originate, error } = useAmiOriginate(clientRef)

      const result = await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('AMI client not connected')
      expect(error.value).toBe('AMI client not connected')
    })
  })

  describe('originateToExtension', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should originate to extension with default context', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { originateToExtension } = useAmiOriginate(clientRef)

      const result = await originateToExtension('PJSIP/1001', '200')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Exten: '200',
          Context: 'from-internal', // default context
        })
      )
    })

    it('should originate to extension with custom context', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { originateToExtension } = useAmiOriginate(clientRef)

      await originateToExtension('PJSIP/1001', '200', 'custom-context')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Context: 'custom-context',
        })
      )
    })

    it('should use custom default context from options', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { originateToExtension } = useAmiOriginate(clientRef, {
        defaultContext: 'outbound-calls',
      })

      await originateToExtension('PJSIP/1001', '5551234567')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Context: 'outbound-calls',
        })
      )
    })
  })

  describe('originateToApplication', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should originate to application', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { originateToApplication } = useAmiOriginate(clientRef)

      const result = await originateToApplication('PJSIP/1001', 'Echo')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Application: 'Echo',
        })
      )
    })

    it('should originate to application with data', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { originateToApplication } = useAmiOriginate(clientRef)

      await originateToApplication('PJSIP/1001', 'Playback', 'hello-world&goodbye')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Application: 'Playback',
          Data: 'hello-world&goodbye',
        })
      )
    })
  })

  describe('clickToCall', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should perform click-to-call', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { clickToCall } = useAmiOriginate(clientRef)

      const result = await clickToCall('PJSIP/1001', '5551234567')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/1001',
          Exten: '5551234567',
          Context: 'from-internal',
        })
      )
    })

    it('should perform click-to-call with caller ID', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { clickToCall } = useAmiOriginate(clientRef)

      await clickToCall('PJSIP/1001', '5551234567', '"John Doe" <1001>')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          CallerID: '"John Doe" <1001>',
        })
      )
    })
  })

  describe('progress tracking via events', () => {
    beforeEach(async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })
      clientRef.value = mockClient
      await nextTick()
    })

    it('should track OriginateResponse success event', async () => {
      const onProgressChange = vi.fn()
      const { originate, progress, lastResult } = useAmiOriginate(clientRef, {
        onProgressChange,
      })

      // Start originate
      const resultPromise = originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      await resultPromise
      const actionId = lastResult.value?.actionId

      // Simulate OriginateResponse event
      mockClient.emit('event', {
        data: {
          Event: 'OriginateResponse',
          Response: 'Success',
          Channel: 'PJSIP/1001-00000001',
          Uniqueid: '1234567890.0',
          ActionID: actionId,
        },
      })
      await nextTick()

      expect(progress.value?.state).toBe('ringing')
      expect(progress.value?.channel).toBe('PJSIP/1001-00000001')
      expect(progress.value?.uniqueId).toBe('1234567890.0')
      expect(onProgressChange).toHaveBeenCalled()
    })

    it('should track OriginateResponse failure event', async () => {
      const { originate, progress, isOriginating, lastResult } = useAmiOriginate(clientRef)

      const resultPromise = originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      await resultPromise
      const actionId = lastResult.value?.actionId

      mockClient.emit('event', {
        data: {
          Event: 'OriginateResponse',
          Response: 'Failure',
          Reason: 'Busy',
          ActionID: actionId,
        },
      })
      await nextTick()

      expect(progress.value?.state).toBe('failed')
      expect(progress.value?.response).toBe('Busy')
      expect(isOriginating.value).toBe(false)
    })

    it('should track DialBegin event', async () => {
      const { originate, progress } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      mockClient.emit('event', {
        data: {
          Event: 'DialBegin',
          Channel: 'PJSIP/1001-00000001',
          DestChannel: 'PJSIP/200-00000002',
          Uniqueid: '1234567890.0',
        },
      })
      await nextTick()

      expect(progress.value?.state).toBe('ringing')
    })

    it('should track DialEnd ANSWER event', async () => {
      const { originate, progress } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      mockClient.emit('event', {
        data: {
          Event: 'DialEnd',
          Channel: 'PJSIP/1001-00000001',
          DestChannel: 'PJSIP/200-00000002',
          DialStatus: 'ANSWER',
          Uniqueid: '1234567890.0',
        },
      })
      await nextTick()

      expect(progress.value?.state).toBe('answered')
    })

    it('should track DialEnd BUSY event', async () => {
      const { originate, progress, isOriginating } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      mockClient.emit('event', {
        data: {
          Event: 'DialEnd',
          Channel: 'PJSIP/1001-00000001',
          DialStatus: 'BUSY',
        },
      })
      await nextTick()

      expect(progress.value?.state).toBe('busy')
      expect(isOriginating.value).toBe(false)
    })

    it('should track DialEnd NOANSWER event', async () => {
      const { originate, progress, isOriginating } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      mockClient.emit('event', {
        data: {
          Event: 'DialEnd',
          Channel: 'PJSIP/1001-00000001',
          DialStatus: 'NOANSWER',
        },
      })
      await nextTick()

      expect(progress.value?.state).toBe('failed')
      expect(isOriginating.value).toBe(false)
    })

    it('should track Hangup event', async () => {
      const { originate, progress, isOriginating } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      // Simulate answered call first
      mockClient.emit('event', {
        data: {
          Event: 'DialEnd',
          Channel: 'PJSIP/1001-00000001',
          DialStatus: 'ANSWER',
        },
      })
      await nextTick()

      // Then hangup
      mockClient.emit('event', {
        data: {
          Event: 'Hangup',
          Channel: 'PJSIP/1001-00000001',
          Cause: '16',
        },
      })
      await nextTick()

      expect(progress.value?.state).toBe('completed')
      expect(isOriginating.value).toBe(false)
    })

    it('should ignore events for other action IDs', async () => {
      const { originate, progress } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      const currentState = progress.value?.state

      // Emit event with different action ID
      mockClient.emit('event', {
        data: {
          Event: 'OriginateResponse',
          Response: 'Success',
          ActionID: 'different-action-id',
        },
      })
      await nextTick()

      // State should not change
      expect(progress.value?.state).toBe(currentState)
    })

    it('should handle unknown DialStatus gracefully', async () => {
      const { originate, progress, isOriginating } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      const currentState = progress.value?.state

      mockClient.emit('event', {
        data: {
          Event: 'DialEnd',
          Channel: 'PJSIP/1001-00000001',
          DialStatus: 'UNKNOWN_STATUS',
        },
      })
      await nextTick()

      // State should not change for unknown status
      expect(progress.value?.state).toBe(currentState)
      expect(isOriginating.value).toBe(true)
    })
  })

  describe('cancel', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should cancel an in-progress origination', async () => {
      // Use a deferred promise so we can cancel before it resolves
      let resolveOriginate: (value: unknown) => void
      const originatePromise = new Promise((resolve) => {
        resolveOriginate = resolve
      })
      mockClient.sendAction.mockImplementation((action) => {
        if (action.Action === 'Originate') {
          return originatePromise
        }
        // Hangup should resolve immediately
        return Promise.resolve({ data: { Response: 'Success' } })
      })

      const { originate, cancel, isOriginating, progress } = useAmiOriginate(clientRef)

      // Start originate (don't await - it won't resolve until we say so)
      const originateResult = originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      await nextTick()
      expect(isOriginating.value).toBe(true)
      expect(progress.value?.state).toBe('initiating')

      // Cancel while still in progress
      cancel()
      await nextTick()

      expect(progress.value?.state).toBe('cancelled')
      expect(isOriginating.value).toBe(false)

      // Should attempt to hang up the channel
      expect(mockClient.sendAction).toHaveBeenCalledWith({
        Action: 'Hangup',
        Channel: 'PJSIP/1001',
      })

      // Resolve the original promise to clean up
      resolveOriginate!({ data: { Response: 'Success' } })
      await originateResult
    })

    it('should do nothing if not originating', async () => {
      const { cancel, isOriginating, progress } = useAmiOriginate(clientRef)

      cancel()
      await nextTick()

      expect(isOriginating.value).toBe(false)
      expect(progress.value).toBe(null)
    })
  })

  describe('utilities', () => {
    it('should format channel correctly', () => {
      const { formatChannel } = useAmiOriginate(clientRef)

      expect(formatChannel('pjsip', '1001')).toBe('PJSIP/1001')
      expect(formatChannel('PJSIP', '/1001/')).toBe('PJSIP/1001')
      expect(formatChannel('sip', 'ext-100')).toBe('SIP/ext-100')
      expect(formatChannel('iax2', 'trunk/number')).toBe('IAX2/trunk/number')
    })

    it('should build caller ID with name and number', () => {
      const { buildCallerId } = useAmiOriginate(clientRef)

      expect(buildCallerId('John Doe', '1001')).toBe('"John Doe" <1001>')
      expect(buildCallerId(undefined, '1001')).toBe('1001')
      expect(buildCallerId('John Doe', undefined)).toBe('John Doe')
      expect(buildCallerId(undefined, undefined)).toBe('')
    })

    it('should use custom caller ID formatter', () => {
      const { buildCallerId } = useAmiOriginate(clientRef, {
        formatCallerId: (name, num) => `Custom: ${name || 'Unknown'} - ${num || 'N/A'}`,
      })

      expect(buildCallerId('John', '1001')).toBe('Custom: John - 1001')
      expect(buildCallerId(undefined, undefined)).toBe('Custom: Unknown - N/A')
    })

    it('should reset state', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })
      clientRef.value = mockClient

      const { originate, reset, isOriginating, progress, error, lastResult } =
        useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      expect(lastResult.value).not.toBe(null)

      reset()

      expect(isOriginating.value).toBe(false)
      expect(progress.value).toBe(null)
      expect(error.value).toBe(null)
      // Note: lastResult is not cleared by reset, intentionally
    })
  })

  describe('callbacks', () => {
    beforeEach(async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })
      clientRef.value = mockClient
      await nextTick()
    })

    it('should call onOriginateStart callback', async () => {
      const onOriginateStart = vi.fn()
      const { originate } = useAmiOriginate(clientRef, { onOriginateStart })

      const options = {
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      }

      await originate(options)

      expect(onOriginateStart).toHaveBeenCalledWith(options)
    })

    it('should call onOriginateComplete callback', async () => {
      const onOriginateComplete = vi.fn()
      const { originate } = useAmiOriginate(clientRef, { onOriginateComplete })

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      expect(onOriginateComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          actionId: expect.any(String),
        })
      )
    })

    it('should call onProgressChange callback', async () => {
      const onProgressChange = vi.fn()
      const { originate } = useAmiOriginate(clientRef, { onProgressChange })

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      expect(onProgressChange).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'initiating',
          timestamp: expect.any(Date),
        })
      )
    })
  })

  describe('caller ID building', () => {
    beforeEach(async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })
      clientRef.value = mockClient
      await nextTick()
    })

    it('should use callerIdName and callerIdNum when callerId not provided', async () => {
      const { originate } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
        callerIdName: 'Sales',
        callerIdNum: '1001',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          CallerID: '"Sales" <1001>',
        })
      )
    })

    it('should prefer callerId over callerIdName/callerIdNum', async () => {
      const { originate } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
        callerId: 'Custom <9999>',
        callerIdName: 'Sales',
        callerIdNum: '1001',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          CallerID: 'Custom <9999>',
        })
      )
    })

    it('should not include CallerID when none provided', async () => {
      const { originate } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
      })

      const call = mockClient.sendAction.mock.calls[0][0]
      expect(call.CallerID).toBeUndefined()
    })
  })

  describe('sync originate', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should mark as not originating immediately for sync calls', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { originate, isOriginating } = useAmiOriginate(clientRef)

      await originate({
        channel: 'PJSIP/1001',
        exten: '200',
        context: 'from-internal',
        async: false,
      })

      expect(isOriginating.value).toBe(false)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Async: 'false',
        })
      )
    })
  })

  describe('cleanup', () => {
    it('should cleanup events when client disconnects', async () => {
      clientRef.value = mockClient
      useAmiOriginate(clientRef) // Just initialize to trigger event handlers
      await nextTick()

      expect(mockClient.on).toHaveBeenCalled()

      // Disconnect
      clientRef.value = null
      await nextTick()

      expect(mockClient.off).toHaveBeenCalled()
    })
  })
})
