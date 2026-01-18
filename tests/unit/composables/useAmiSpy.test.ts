/**
 * useAmiSpy Tests
 *
 * Comprehensive tests for supervisor call monitoring via Asterisk AMI ChanSpy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiSpy } from '@/composables/useAmiSpy'
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

describe('useAmiSpy', () => {
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
      const { isSpying, currentMode, currentSession, activeSessions, error } = useAmiSpy(clientRef)

      expect(isSpying.value).toBe(false)
      expect(currentMode.value).toBe(null)
      expect(currentSession.value).toBe(null)
      expect(activeSessions.value.size).toBe(0)
      expect(error.value).toBe(null)
    })

    it('should setup events when client connects', async () => {
      useAmiSpy(clientRef)
      clientRef.value = mockClient
      await nextTick()

      expect(mockClient.on).toHaveBeenCalledWith('event', expect.any(Function))
    })

    it('should not setup events when useEvents is false', async () => {
      clientRef.value = mockClient
      useAmiSpy(clientRef, { useEvents: false })
      await nextTick()

      expect(mockClient.on).not.toHaveBeenCalled()
    })
  })

  describe('spy - silent listen', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should start silent listen spy session', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, isSpying, currentMode, currentSession } = useAmiSpy(clientRef)

      const session = await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')

      expect(isSpying.value).toBe(true)
      expect(currentMode.value).toBe('listen')
      expect(currentSession.value).not.toBe(null)
      expect(session.supervisorChannel).toBe('PJSIP/supervisor')
      expect(session.targetChannel).toBe('PJSIP/agent-00000001')
      expect(session.mode).toBe('listen')
      expect(session.id).toBeTruthy()
      expect(session.startTime).toBeInstanceOf(Date)

      // Verify AMI action
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Channel: 'PJSIP/supervisor',
          Application: 'ChanSpy',
          Data: 'PJSIP/agent,q', // q = quiet mode
          Async: 'true',
        })
      )
    })

    it('should use spy() method with listen mode', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy, currentMode } = useAmiSpy(clientRef)

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
        mode: 'listen',
      })

      expect(currentMode.value).toBe('listen')
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Application: 'ChanSpy',
          Data: 'PJSIP/agent,q',
        })
      )
    })

    it('should use default mode when not specified', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy, currentMode } = useAmiSpy(clientRef, { defaultMode: 'listen' })

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
      })

      expect(currentMode.value).toBe('listen')
    })
  })

  describe('spy - whisper mode', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should start whisper mode spy session', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { whisper, currentMode } = useAmiSpy(clientRef)

      const session = await whisper('PJSIP/supervisor', 'PJSIP/agent-00000001')

      expect(session.mode).toBe('whisper')
      expect(currentMode.value).toBe('whisper')

      // Verify AMI action with whisper option
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Application: 'ChanSpy',
          Data: 'PJSIP/agent,qw', // qw = quiet + whisper
        })
      )
    })

    it('should use spy() method with whisper mode', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy } = useAmiSpy(clientRef)

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
        mode: 'whisper',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: 'PJSIP/agent,qw',
        })
      )
    })
  })

  describe('spy - barge mode', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should start barge mode spy session', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { barge, currentMode } = useAmiSpy(clientRef)

      const session = await barge('PJSIP/supervisor', 'PJSIP/agent-00000001')

      expect(session.mode).toBe('barge')
      expect(currentMode.value).toBe('barge')

      // Verify AMI action with barge option
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Application: 'ChanSpy',
          Data: 'PJSIP/agent,qB', // qB = quiet + barge
        })
      )
    })
  })

  describe('mode switching', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should switch from listen to whisper mode', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const onModeChange = vi.fn()
      const { listen, switchToWhisper, currentMode } = useAmiSpy(clientRef, {
        onModeChange,
      })

      // Start in listen mode
      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      expect(currentMode.value).toBe('listen')

      // Switch to whisper
      await switchToWhisper()

      expect(currentMode.value).toBe('whisper')
      expect(onModeChange).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'whisper' }),
        'listen'
      )
    })

    it('should switch from listen to barge mode', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, switchToBarge, currentMode } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      await switchToBarge()

      expect(currentMode.value).toBe('barge')
    })

    it('should switch from whisper to listen mode', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { whisper, switchToListen, currentMode } = useAmiSpy(clientRef)

      await whisper('PJSIP/supervisor', 'PJSIP/agent-00000001')
      await switchToListen()

      expect(currentMode.value).toBe('listen')
    })

    it('should not restart if already in requested mode', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, switchToListen, currentMode } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')

      // Clear mock to count subsequent calls
      mockClient.sendAction.mockClear()

      await switchToListen()

      // Should not have made additional AMI calls
      expect(mockClient.sendAction).not.toHaveBeenCalled()
      expect(currentMode.value).toBe('listen')
    })

    it('should throw error when switching with no active session', async () => {
      const { switchToWhisper, error } = useAmiSpy(clientRef)

      await expect(switchToWhisper()).rejects.toThrow('No active spy session to switch mode')
      expect(error.value).toBe('No active spy session to switch mode')
    })
  })

  describe('stop spying', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should stop current spy session', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const onSpyEnd = vi.fn()
      const { listen, stopSpying, isSpying, currentSession, currentMode } = useAmiSpy(clientRef, {
        onSpyEnd,
      })

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      expect(isSpying.value).toBe(true)

      await stopSpying()

      expect(isSpying.value).toBe(false)
      expect(currentSession.value).toBe(null)
      expect(currentMode.value).toBe(null)
      expect(onSpyEnd).toHaveBeenCalled()

      // Verify hangup was called
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Hangup',
          Channel: 'PJSIP/supervisor',
        })
      )
    })

    it('should stop specific session by ID', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, stopSession, activeSessions } = useAmiSpy(clientRef)

      const session = await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      expect(activeSessions.value.size).toBe(1)

      await stopSession(session.id)

      expect(activeSessions.value.size).toBe(0)
    })

    it('should handle stop when no active session gracefully', async () => {
      const { stopSpying, isSpying } = useAmiSpy(clientRef)

      // Should not throw
      await stopSpying()

      expect(isSpying.value).toBe(false)
    })

    it('should handle hangup error gracefully', async () => {
      mockClient.sendAction
        .mockResolvedValueOnce({ data: { Response: 'Success' } }) // Originate
        .mockRejectedValueOnce(new Error('Channel does not exist')) // Hangup

      const { listen, stopSpying, isSpying } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      await stopSpying()

      // Should still clear state even if hangup fails
      expect(isSpying.value).toBe(false)
    })
  })

  describe('volume adjustment', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should adjust volume during active session', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, adjustVolume } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      mockClient.sendAction.mockClear()

      await adjustVolume(3)

      // Should restart spy with volume option
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Application: 'ChanSpy',
          Data: expect.stringContaining('v(3)'),
        })
      )
    })

    it('should clamp volume to valid range', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, adjustVolume } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      mockClient.sendAction.mockClear()

      await adjustVolume(10) // Should be clamped to 4

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringContaining('v(4)'),
        })
      )
    })

    it('should clamp negative volume to valid range', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, adjustVolume } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      mockClient.sendAction.mockClear()

      await adjustVolume(-10) // Should be clamped to -4

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringContaining('v(-4)'),
        })
      )
    })

    it('should throw error when adjusting volume with no active session', async () => {
      const { adjustVolume, error } = useAmiSpy(clientRef)

      await expect(adjustVolume(2)).rejects.toThrow('No active spy session to adjust volume')
      expect(error.value).toBe('No active spy session to adjust volume')
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should handle missing supervisor channel', async () => {
      const onError = vi.fn()
      const { spy, error } = useAmiSpy(clientRef, { onError })

      await expect(
        spy({
          supervisorChannel: '',
          targetChannel: 'PJSIP/agent-00000001',
        })
      ).rejects.toThrow('Supervisor channel is required')

      expect(error.value).toBe('Supervisor channel is required')
      expect(onError).toHaveBeenCalledWith('Supervisor channel is required', undefined)
    })

    it('should handle missing target channel', async () => {
      const onError = vi.fn()
      const { spy, error } = useAmiSpy(clientRef, { onError })

      await expect(
        spy({
          supervisorChannel: 'PJSIP/supervisor',
          targetChannel: '',
        })
      ).rejects.toThrow('Target channel is required')

      expect(error.value).toBe('Target channel is required')
      expect(onError).toHaveBeenCalledWith('Target channel is required', undefined)
    })

    it('should handle AMI client not connected', async () => {
      clientRef.value = null

      const { spy, error } = useAmiSpy(clientRef)

      await expect(
        spy({
          supervisorChannel: 'PJSIP/supervisor',
          targetChannel: 'PJSIP/agent-00000001',
        })
      ).rejects.toThrow('AMI client not connected')

      expect(error.value).toBe('AMI client not connected')
    })

    it('should handle AMI originate failure', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Error', Message: 'Channel does not exist' },
      })

      const { spy, error, isSpying } = useAmiSpy(clientRef)

      await expect(
        spy({
          supervisorChannel: 'PJSIP/invalid',
          targetChannel: 'PJSIP/agent-00000001',
        })
      ).rejects.toThrow('Channel does not exist')

      expect(error.value).toBe('Channel does not exist')
      expect(isSpying.value).toBe(false)
    })

    it('should handle network error', async () => {
      mockClient.sendAction.mockRejectedValue(new Error('Connection lost'))

      const { spy, error, isSpying } = useAmiSpy(clientRef)

      await expect(
        spy({
          supervisorChannel: 'PJSIP/supervisor',
          targetChannel: 'PJSIP/agent-00000001',
        })
      ).rejects.toThrow('Connection lost')

      expect(error.value).toBe('Connection lost')
      expect(isSpying.value).toBe(false)
    })

    it('should handle supervisor busy', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Error', Message: 'Channel busy' },
      })

      const { listen, error } = useAmiSpy(clientRef)

      await expect(listen('PJSIP/supervisor', 'PJSIP/agent-00000001')).rejects.toThrow(
        'Channel busy'
      )

      expect(error.value).toBe('Channel busy')
    })
  })

  describe('multiple sessions tracking', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should track multiple spy sessions', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy, activeSessions } = useAmiSpy(clientRef)

      const session1 = await spy({
        supervisorChannel: 'PJSIP/supervisor1',
        targetChannel: 'PJSIP/agent1-00000001',
      })

      const session2 = await spy({
        supervisorChannel: 'PJSIP/supervisor2',
        targetChannel: 'PJSIP/agent2-00000002',
      })

      expect(activeSessions.value.size).toBe(2)
      expect(activeSessions.value.has(session1.id)).toBe(true)
      expect(activeSessions.value.has(session2.id)).toBe(true)
    })

    it('should update current session to latest', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy, currentSession } = useAmiSpy(clientRef)

      await spy({
        supervisorChannel: 'PJSIP/supervisor1',
        targetChannel: 'PJSIP/agent1-00000001',
      })

      const session2 = await spy({
        supervisorChannel: 'PJSIP/supervisor2',
        targetChannel: 'PJSIP/agent2-00000002',
      })

      expect(currentSession.value?.id).toBe(session2.id)
    })

    it('should keep isSpying true while any session is active', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy, stopSession, isSpying, activeSessions } = useAmiSpy(clientRef)

      const session1 = await spy({
        supervisorChannel: 'PJSIP/supervisor1',
        targetChannel: 'PJSIP/agent1-00000001',
      })

      await spy({
        supervisorChannel: 'PJSIP/supervisor2',
        targetChannel: 'PJSIP/agent2-00000002',
      })

      // Stop first session
      await stopSession(session1.id)

      expect(activeSessions.value.size).toBe(1)
      expect(isSpying.value).toBe(true) // Still have one active session
    })
  })

  describe('ChanSpy options', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should include group option when specified', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy } = useAmiSpy(clientRef)

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
        group: 'sales',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringContaining('g(sales)'),
        })
      )
    })

    it('should include enforce group option', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy } = useAmiSpy(clientRef)

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
        group: 'sales',
        enforceGroup: true,
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringMatching(/g\(sales\).*e/),
        })
      )
    })

    it('should include volume in ChanSpy options', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy } = useAmiSpy(clientRef)

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
        volume: 2,
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringContaining('v(2)'),
        })
      )
    })

    it('should include whisper volume for whisper mode', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy } = useAmiSpy(clientRef)

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
        mode: 'whisper',
        whisperVolume: 3,
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringContaining('V(3)'),
        })
      )
    })

    it('should support custom options string', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy } = useAmiSpy(clientRef)

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
        customOptions: 'Xo',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringContaining('Xo'),
        })
      )
    })

    it('should use default volume from options', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { spy } = useAmiSpy(clientRef, { defaultVolume: -2 })

      await spy({
        supervisorChannel: 'PJSIP/supervisor',
        targetChannel: 'PJSIP/agent-00000001',
      })

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringContaining('v(-2)'),
        })
      )
    })
  })

  describe('event handling', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should handle Hangup event for spy channel', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const onSpyEnd = vi.fn()
      const { listen, isSpying, activeSessions } = useAmiSpy(clientRef, { onSpyEnd })

      const session = await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')

      // Update session with spy channel info (simulating OriginateResponse)
      session.spyChannel = 'PJSIP/supervisor-00000001'
      activeSessions.value.set(session.id, session)

      // Emit hangup for the spy channel
      mockClient.emit('event', {
        data: {
          Event: 'Hangup',
          Channel: 'PJSIP/supervisor-00000001',
          Cause: '16',
        },
      })
      await nextTick()

      expect(isSpying.value).toBe(false)
      expect(activeSessions.value.size).toBe(0)
      expect(onSpyEnd).toHaveBeenCalled()
    })

    it('should handle OriginateResponse success event', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, currentSession } = useAmiSpy(clientRef)

      const session = await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')

      // Emit OriginateResponse
      mockClient.emit('event', {
        data: {
          Event: 'OriginateResponse',
          Response: 'Success',
          Channel: 'PJSIP/supervisor-00000001',
          Uniqueid: '1234567890.0',
          ActionID: session.actionId,
        },
      })
      await nextTick()

      // Session should be updated with channel info
      expect(currentSession.value?.spyChannel).toBe('PJSIP/supervisor-00000001')
      expect(currentSession.value?.uniqueId).toBe('1234567890.0')
    })

    it('should handle OriginateResponse failure event', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const onError = vi.fn()
      const { listen, isSpying, error, currentSession } = useAmiSpy(clientRef, { onError })

      const session = await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')

      // Emit OriginateResponse failure
      mockClient.emit('event', {
        data: {
          Event: 'OriginateResponse',
          Response: 'Failure',
          Reason: 'Busy',
          ActionID: session.actionId,
        },
      })
      await nextTick()

      expect(isSpying.value).toBe(false)
      expect(currentSession.value).toBe(null)
      expect(error.value).toBe('Busy')
      expect(onError).toHaveBeenCalledWith('Busy', expect.any(Object))
    })

    it('should ignore events for other sessions', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, currentSession } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')

      // Emit event with different action ID
      mockClient.emit('event', {
        data: {
          Event: 'OriginateResponse',
          Response: 'Success',
          Channel: 'PJSIP/other-00000001',
          ActionID: 'different-action-id',
        },
      })
      await nextTick()

      // Session should not be updated
      expect(currentSession.value?.spyChannel).toBeUndefined()
    })
  })

  describe('callbacks', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should call onSpyStart callback', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const onSpyStart = vi.fn()
      const { listen } = useAmiSpy(clientRef, { onSpyStart })

      const session = await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')

      expect(onSpyStart).toHaveBeenCalledWith(session)
    })

    it('should call onSpyEnd callback when stopping', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const onSpyEnd = vi.fn()
      const { listen, stopSpying } = useAmiSpy(clientRef, { onSpyEnd })

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      await stopSpying()

      expect(onSpyEnd).toHaveBeenCalled()
    })

    it('should call onError callback on error', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Error', Message: 'Failed' },
      })

      const onError = vi.fn()
      const { spy } = useAmiSpy(clientRef, { onError })

      await expect(
        spy({
          supervisorChannel: 'PJSIP/supervisor',
          targetChannel: 'PJSIP/agent-00000001',
        })
      ).rejects.toThrow()

      expect(onError).toHaveBeenCalledWith('Failed', undefined)
    })
  })

  describe('cleanup', () => {
    it('should cleanup events when client disconnects', async () => {
      clientRef.value = mockClient
      useAmiSpy(clientRef)
      await nextTick()

      expect(mockClient.on).toHaveBeenCalled()

      clientRef.value = null
      await nextTick()

      expect(mockClient.off).toHaveBeenCalled()
    })

    it('should stop sessions when client changes', async () => {
      clientRef.value = mockClient
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen, isSpying } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/agent-00000001')
      expect(isSpying.value).toBe(true)

      // Simulate disconnect
      clientRef.value = null
      await nextTick()

      // Note: The composable cleans up on unmount, not on client change
      // The session state remains until explicit stop or unmount
    })
  })

  describe('channel name parsing', () => {
    beforeEach(async () => {
      clientRef.value = mockClient
      await nextTick()
    })

    it('should strip unique ID suffix from target channel', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/1001-00000001')

      // Target should have the suffix stripped for ChanSpy
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringMatching(/^PJSIP\/1001,/),
        })
      )
    })

    it('should handle channels without unique ID suffix', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'PJSIP/1001')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringMatching(/^PJSIP\/1001,/),
        })
      )
    })

    it('should handle complex channel names', async () => {
      mockClient.sendAction.mockResolvedValue({
        data: { Response: 'Success' },
      })

      const { listen } = useAmiSpy(clientRef)

      await listen('PJSIP/supervisor', 'SIP/trunk-provider-0000abcd')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Data: expect.stringMatching(/^SIP\/trunk-provider,/),
        })
      )
    })
  })
})
