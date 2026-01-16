/**
 * useAmiSupervisor composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmiSupervisor } from '@/composables/useAmiSupervisor'
import type { AmiClient } from '@/core/AmiClient'
import { withSetup } from '../../utils/test-helpers'

// Create mock AMI client
const createMockClient = (): AmiClient => {
  return {
    originate: vi.fn().mockResolvedValue({ success: true, channel: 'SIP/supervisor-00000001' }),
    hangupChannel: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as AmiClient
}

describe('useAmiSupervisor', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty sessions initially', () => {
      const { sessions, activeSessionCount } = useAmiSupervisor(mockClient)

      expect(sessions.value.size).toBe(0)
      expect(activeSessionCount.value).toBe(0)
    })

    it('should have loading as false initially', () => {
      const { loading } = useAmiSupervisor(mockClient)

      expect(loading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiSupervisor(mockClient)

      expect(error.value).toBeNull()
    })

    it('should handle null client gracefully', () => {
      const { sessions, error } = useAmiSupervisor(null)

      expect(sessions.value.size).toBe(0)
      expect(error.value).toBeNull()
    })
  })

  describe('monitor', () => {
    it('should start silent monitoring', async () => {
      const onSessionStart = vi.fn()
      const { monitor, sessions, loading } = useAmiSupervisor(mockClient, { onSessionStart })

      expect(loading.value).toBe(false)

      const session = await monitor('SIP/supervisor', 'SIP/agent-00000001')

      expect(session.mode).toBe('monitor')
      expect(session.targetChannel).toBe('SIP/agent-00000001')
      expect(session.supervisorChannel).toBe('SIP/supervisor-00000001')
      expect(sessions.value.size).toBe(1)
      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'SIP/supervisor',
          application: 'ChanSpy',
          data: 'SIP/agent,q',
        })
      )
      expect(onSessionStart).toHaveBeenCalled()
    })

    it('should throw when client is null', async () => {
      const { monitor } = useAmiSupervisor(null)

      await expect(monitor('SIP/supervisor', 'SIP/agent')).rejects.toThrow(
        'AMI client not connected'
      )
    })

    it('should handle originate failure', async () => {
      ;(mockClient.originate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        message: 'Channel unavailable',
      })

      const { monitor, error } = useAmiSupervisor(mockClient)

      await expect(monitor('SIP/supervisor', 'SIP/agent')).rejects.toThrow('Channel unavailable')
      expect(error.value).toBe('Channel unavailable')
    })
  })

  describe('whisper', () => {
    it('should start whisper mode', async () => {
      const { whisper, sessions } = useAmiSupervisor(mockClient)

      const session = await whisper('SIP/supervisor', 'SIP/agent-00000001')

      expect(session.mode).toBe('whisper')
      expect(sessions.value.size).toBe(1)
      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          application: 'ChanSpy',
          data: 'SIP/agent,wq',
        })
      )
    })

    it('should throw when client is null', async () => {
      const { whisper } = useAmiSupervisor(null)

      await expect(whisper('SIP/supervisor', 'SIP/agent')).rejects.toThrow(
        'AMI client not connected'
      )
    })
  })

  describe('barge', () => {
    it('should start barge mode', async () => {
      const { barge, sessions } = useAmiSupervisor(mockClient)

      const session = await barge('SIP/supervisor', 'SIP/agent-00000001')

      expect(session.mode).toBe('barge')
      expect(sessions.value.size).toBe(1)
      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          application: 'ChanSpy',
          data: 'SIP/agent,Bq',
        })
      )
    })

    it('should throw when client is null', async () => {
      const { barge } = useAmiSupervisor(null)

      await expect(barge('SIP/supervisor', 'SIP/agent')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('endSession', () => {
    it('should end supervision session', async () => {
      const onSessionEnd = vi.fn()
      const { monitor, endSession, sessions } = useAmiSupervisor(mockClient, { onSessionEnd })

      const session = await monitor('SIP/supervisor', 'SIP/agent')

      await endSession(session.id)

      expect(sessions.value.size).toBe(0)
      expect(mockClient.hangupChannel).toHaveBeenCalledWith(session.supervisorChannel)
      expect(onSessionEnd).toHaveBeenCalledWith(session)
    })

    it('should handle non-existent session gracefully', async () => {
      const { endSession, sessions } = useAmiSupervisor(mockClient)

      await endSession('non-existent')

      expect(sessions.value.size).toBe(0)
      expect(mockClient.hangupChannel).not.toHaveBeenCalled()
    })

    it('should throw when client is null', async () => {
      const { endSession } = useAmiSupervisor(null)

      await expect(endSession('test-session')).rejects.toThrow('AMI client not connected')
    })

    it('should remove session from state even if hangup fails', async () => {
      ;(mockClient.hangupChannel as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Channel not found')
      )

      const { monitor, endSession, sessions } = useAmiSupervisor(mockClient)

      const session = await monitor('SIP/supervisor', 'SIP/agent')

      await expect(endSession(session.id)).rejects.toThrow()

      // Session should still be removed
      expect(sessions.value.size).toBe(0)
    })
  })

  describe('endAllSessions', () => {
    it('should end all sessions', async () => {
      const { monitor, whisper, endAllSessions, sessions } = useAmiSupervisor(mockClient)

      await monitor('SIP/supervisor', 'SIP/agent1')
      await whisper('SIP/supervisor', 'SIP/agent2')

      expect(sessions.value.size).toBe(2)

      await endAllSessions()

      expect(sessions.value.size).toBe(0)
      expect(mockClient.hangupChannel).toHaveBeenCalledTimes(2)
    })

    it('should continue ending sessions even if some fail', async () => {
      const { monitor, whisper, endAllSessions, sessions } = useAmiSupervisor(mockClient)

      await monitor('SIP/supervisor', 'SIP/agent1')
      await whisper('SIP/supervisor', 'SIP/agent2')

      // First hangup fails
      ;(mockClient.hangupChannel as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Channel not found'))
        .mockResolvedValueOnce(undefined)

      await endAllSessions()

      // Both sessions should be removed
      expect(sessions.value.size).toBe(0)
    })
  })

  describe('isSupervising', () => {
    it('should return true when supervising a channel', async () => {
      const { monitor, isSupervising } = useAmiSupervisor(mockClient)

      await monitor('SIP/supervisor', 'SIP/agent-00000001')

      expect(isSupervising('SIP/agent-00000001')).toBe(true)
      // Should also match channel base
      expect(isSupervising('SIP/agent-00000002')).toBe(true)
    })

    it('should return false when not supervising', async () => {
      const { monitor, isSupervising } = useAmiSupervisor(mockClient)

      await monitor('SIP/supervisor', 'SIP/agent1')

      expect(isSupervising('SIP/agent2')).toBe(false)
    })

    it('should return false when no sessions', () => {
      const { isSupervising } = useAmiSupervisor(mockClient)

      expect(isSupervising('SIP/agent')).toBe(false)
    })
  })

  describe('getSessionForChannel', () => {
    it('should return session for supervised channel', async () => {
      const { monitor, getSessionForChannel } = useAmiSupervisor(mockClient)

      const session = await monitor('SIP/supervisor', 'SIP/agent-00000001')

      const found = getSessionForChannel('SIP/agent-00000001')

      expect(found).toBeDefined()
      expect(found?.id).toBe(session.id)
    })

    it('should return undefined when channel not supervised', async () => {
      const { monitor, getSessionForChannel } = useAmiSupervisor(mockClient)

      await monitor('SIP/supervisor', 'SIP/agent1')

      expect(getSessionForChannel('SIP/agent2')).toBeUndefined()
    })

    it('should match by channel base', async () => {
      const { monitor, getSessionForChannel } = useAmiSupervisor(mockClient)

      const session = await monitor('SIP/supervisor', 'SIP/agent-00000001')

      // Should find session even with different unique ID
      const found = getSessionForChannel('SIP/agent-00000999')

      expect(found?.id).toBe(session.id)
    })
  })

  describe('switchMode', () => {
    it('should switch supervision mode', async () => {
      const { monitor, switchMode, sessions } = useAmiSupervisor(mockClient)

      const session = await monitor('SIP/supervisor', 'SIP/agent')

      // Switch to barge
      const newSession = await switchMode(session.id, 'barge')

      expect(newSession.mode).toBe('barge')
      expect(sessions.value.size).toBe(1)
      // Should have called hangup for old session and originate for new
      expect(mockClient.hangupChannel).toHaveBeenCalled()
      expect(mockClient.originate).toHaveBeenCalledTimes(2)
    })

    it('should return same session if mode unchanged', async () => {
      const { monitor, switchMode, sessions } = useAmiSupervisor(mockClient)

      const session = await monitor('SIP/supervisor', 'SIP/agent')

      const sameSession = await switchMode(session.id, 'monitor')

      expect(sameSession.id).toBe(session.id)
      expect(sessions.value.size).toBe(1)
      // Should not have called hangup
      expect(mockClient.hangupChannel).not.toHaveBeenCalled()
    })

    it('should throw for non-existent session', async () => {
      const { switchMode } = useAmiSupervisor(mockClient)

      await expect(switchMode('non-existent', 'barge')).rejects.toThrow('Session not found')
    })
  })

  describe('custom options', () => {
    it('should use custom chanspy options', async () => {
      const { monitor } = useAmiSupervisor(mockClient, {
        chanspyOptions: {
          monitor: 'qE', // Add E option for enable DTMF
        },
      })

      await monitor('SIP/supervisor', 'SIP/agent')

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'SIP/agent,qE',
        })
      )
    })

    it('should use custom dial timeout', async () => {
      const { monitor } = useAmiSupervisor(mockClient, {
        dialTimeout: 60000,
      })

      await monitor('SIP/supervisor', 'SIP/agent')

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        })
      )
    })
  })

  describe('activeSessionCount', () => {
    it('should update when sessions change', async () => {
      const { monitor, endSession, activeSessionCount } = useAmiSupervisor(mockClient)

      expect(activeSessionCount.value).toBe(0)

      const session1 = await monitor('SIP/supervisor', 'SIP/agent1')
      expect(activeSessionCount.value).toBe(1)

      const session2 = await monitor('SIP/supervisor', 'SIP/agent2')
      expect(activeSessionCount.value).toBe(2)

      await endSession(session1.id)
      expect(activeSessionCount.value).toBe(1)

      await endSession(session2.id)
      expect(activeSessionCount.value).toBe(0)
    })
  })

  describe('channel name extraction', () => {
    it('should extract channel base from SIP channels', async () => {
      const { monitor } = useAmiSupervisor(mockClient)

      await monitor('SIP/supervisor', 'SIP/1000-00000001')

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'SIP/1000,q',
        })
      )
    })

    it('should extract channel base from PJSIP channels', async () => {
      const { monitor } = useAmiSupervisor(mockClient)

      await monitor('PJSIP/supervisor', 'PJSIP/2000-0000000a')

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'PJSIP/2000,q',
        })
      )
    })

    it('should handle channels without unique IDs', async () => {
      const { monitor } = useAmiSupervisor(mockClient)

      await monitor('SIP/supervisor', 'SIP/1000')

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'SIP/1000,q',
        })
      )
    })
  })

  describe('Cleanup on Unmount', () => {
    it('should end all sessions when component unmounts', async () => {
      const localMockClient = createMockClient()

      const { result, unmount } = withSetup(() => useAmiSupervisor(localMockClient))

      // Start a monitoring session
      await result.monitor('SIP/supervisor', 'SIP/1000')
      expect(result.sessions.value.size).toBe(1)

      // Unmount should trigger cleanup
      unmount()

      // Give async cleanup time to complete
      await new Promise((r) => setTimeout(r, 10))

      // hangupChannel should have been called for cleanup
      expect(localMockClient.hangupChannel).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      const localMockClient = {
        ...createMockClient(),
        hangupChannel: vi.fn().mockRejectedValue(new Error('Hangup failed')),
      } as unknown as AmiClient

      const { result, unmount } = withSetup(() => useAmiSupervisor(localMockClient))

      // Start a session
      await result.monitor('SIP/supervisor', 'SIP/1000')

      // Unmount should handle the error gracefully (not throw)
      expect(() => unmount()).not.toThrow()
    })
  })
})
