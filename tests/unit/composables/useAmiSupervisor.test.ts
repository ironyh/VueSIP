/**
 * Tests for useAmiSupervisor composable
 *
 * Provides supervisor functionality for call monitoring and intervention:
 * - Silent monitoring (listen to calls without being heard)
 * - Whisper mode (speak to agent without customer hearing)
 * - Barge mode (join conversation with both parties)
 * - Mode switching during active supervision
 * - Multi-session management
 *
 * @see src/composables/useAmiSupervisor.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmiSupervisor } from '@/composables/useAmiSupervisor'
import type { AmiClient } from '@/core/AmiClient'
import { createMockAmiClient } from '../../utils/test-helpers'
import type { SupervisionMode } from '@/composables/useAmiSupervisor'

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  channels: {
    supervisor: 'SIP/supervisor',
    supervisorGenerated: 'SIP/supervisor-00000001',
    agent: 'SIP/agent-00000001',
    agent1: 'SIP/agent1',
    agent2: 'SIP/agent2',
    agentBase: 'SIP/agent',
    pjsipAgent: 'PJSIP/2000-0000000a',
    simpleAgent: 'SIP/1000',
  },
  modes: {
    monitor: 'monitor' as SupervisionMode,
    whisper: 'whisper' as SupervisionMode,
    barge: 'barge' as SupervisionMode,
  },
  chanspyOptions: {
    monitor: 'q',
    whisper: 'wq',
    barge: 'Bq',
    customMonitor: 'qE',
  },
  errors: {
    noClient: 'AMI client not connected',
    channelUnavailable: 'Channel unavailable',
    sessionNotFound: 'Session not found',
  },
  timeouts: {
    default: 30000,
    custom: 60000,
  },
} as const

/**
 * Factory function: Create mock AMI client with supervisor-specific methods
 */
function createSupervisorMockClient(overrides?: any): AmiClient {
  return createMockAmiClient({
    originate: vi.fn().mockResolvedValue({
      success: true,
      channel: TEST_FIXTURES.channels.supervisorGenerated,
    }),
    hangupChannel: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })
}

/**
 * Factory function: Create supervisor session options
 */
function createSessionOptions(overrides?: any) {
  return {
    onSessionStart: vi.fn(),
    onSessionEnd: vi.fn(),
    chanspyOptions: {
      monitor: TEST_FIXTURES.chanspyOptions.monitor,
      whisper: TEST_FIXTURES.chanspyOptions.whisper,
      barge: TEST_FIXTURES.chanspyOptions.barge,
    },
    dialTimeout: TEST_FIXTURES.timeouts.default,
    ...overrides,
  }
}

describe('useAmiSupervisor', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createSupervisorMockClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Initialization Tests
   * Verify composable starts with correct initial state
   */
  describe('Initialization', () => {
    describe.each([
      {
        description: 'valid client',
        client: () => createSupervisorMockClient(),
        expectedSessions: 0,
        expectedLoading: false,
        expectedError: null,
      },
      {
        description: 'null client',
        client: null,
        expectedSessions: 0,
        expectedLoading: false,
        expectedError: null,
      },
    ])('with $description', ({ client, expectedSessions, expectedLoading, expectedError }) => {
      it(`should initialize with ${expectedSessions} sessions, loading=${expectedLoading}`, () => {
        const actualClient = typeof client === 'function' ? client() : client
        const { sessions, activeSessionCount, loading, error } = useAmiSupervisor(actualClient)

        expect(sessions.value.size).toBe(expectedSessions)
        expect(activeSessionCount.value).toBe(expectedSessions)
        expect(loading.value).toBe(expectedLoading)
        expect(error.value).toBe(expectedError)
      })
    })
  })

  /**
   * Supervision Modes Tests
   * Verify different supervision modes work correctly
   *
   * Modes:
   * - Monitor: Silent observation (agent and customer unaware)
   * - Whisper: Speak to agent only (customer cannot hear supervisor)
   * - Barge: Join full conversation (all parties can hear each other)
   */
  describe('Supervision Modes', () => {
    /**
     * Successful supervision mode tests
     * Verify each mode starts correctly with proper ChanSpy options
     */
    describe.each([
      {
        mode: TEST_FIXTURES.modes.monitor,
        methodName: 'monitor',
        expectedOptions: TEST_FIXTURES.chanspyOptions.monitor,
        description: 'silent monitoring (agent and customer unaware)',
      },
      {
        mode: TEST_FIXTURES.modes.whisper,
        methodName: 'whisper',
        expectedOptions: TEST_FIXTURES.chanspyOptions.whisper,
        description: 'whisper mode (speak to agent only)',
      },
      {
        mode: TEST_FIXTURES.modes.barge,
        methodName: 'barge',
        expectedOptions: TEST_FIXTURES.chanspyOptions.barge,
        description: 'barge mode (join full conversation)',
      },
    ])('$methodName mode - $description', ({ mode, methodName, expectedOptions }) => {
      it(`should start ${mode} session successfully`, async () => {
        const options = createSessionOptions()
        const supervisor = useAmiSupervisor(mockClient, options)
        const method = supervisor[methodName as 'monitor' | 'whisper' | 'barge']

        const session = await method(
          TEST_FIXTURES.channels.supervisor,
          TEST_FIXTURES.channels.agent
        )

        expect(session.mode).toBe(mode)
        expect(session.targetChannel).toBe(TEST_FIXTURES.channels.agent)
        expect(session.supervisorChannel).toBe(TEST_FIXTURES.channels.supervisorGenerated)
        expect(supervisor.sessions.value.size).toBe(1)
        expect(mockClient.originate).toHaveBeenCalledWith(
          expect.objectContaining({
            channel: TEST_FIXTURES.channels.supervisor,
            application: 'ChanSpy',
            data: `${TEST_FIXTURES.channels.agentBase},${expectedOptions}`,
          })
        )
        expect(options.onSessionStart).toHaveBeenCalledWith(session)
      })

      it(`should throw error when client is null for ${mode}`, async () => {
        const supervisor = useAmiSupervisor(null)
        const method = supervisor[methodName as 'monitor' | 'whisper' | 'barge']

        await expect(
          method(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent)
        ).rejects.toThrow(TEST_FIXTURES.errors.noClient)
      })
    })

    /**
     * Error handling tests for supervision modes
     * Verify proper error handling when originate fails
     */
    it('should handle originate failure gracefully', async () => {
      const errorClient = createSupervisorMockClient({
        originate: vi.fn().mockResolvedValue({
          success: false,
          message: TEST_FIXTURES.errors.channelUnavailable,
        }),
      })

      const { monitor, error } = useAmiSupervisor(errorClient)

      await expect(
        monitor(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent)
      ).rejects.toThrow(TEST_FIXTURES.errors.channelUnavailable)
      expect(error.value).toBe(TEST_FIXTURES.errors.channelUnavailable)
    })
  })

  /**
   * Session Management Tests
   * Verify session lifecycle operations (end, endAll, status tracking)
   */
  describe('Session Management', () => {
    describe('endSession', () => {
      it('should end supervision session and trigger callback', async () => {
        const options = createSessionOptions()
        const { monitor, endSession, sessions } = useAmiSupervisor(mockClient, options)

        const session = await monitor(
          TEST_FIXTURES.channels.supervisor,
          TEST_FIXTURES.channels.agent
        )

        await endSession(session.id)

        expect(sessions.value.size).toBe(0)
        expect(mockClient.hangupChannel).toHaveBeenCalledWith(session.supervisorChannel)
        expect(options.onSessionEnd).toHaveBeenCalledWith(session)
      })

      it('should handle non-existent session gracefully', async () => {
        const { endSession, sessions } = useAmiSupervisor(mockClient)

        await endSession('non-existent-id')

        expect(sessions.value.size).toBe(0)
        expect(mockClient.hangupChannel).not.toHaveBeenCalled()
      })

      it('should throw when client is null', async () => {
        const { endSession } = useAmiSupervisor(null)

        await expect(endSession('test-session')).rejects.toThrow(TEST_FIXTURES.errors.noClient)
      })

      it('should remove session from state even if hangup fails', async () => {
        const failClient = createSupervisorMockClient({
          hangupChannel: vi.fn().mockRejectedValue(new Error('Channel not found')),
        })

        const { monitor, endSession, sessions } = useAmiSupervisor(failClient)
        const session = await monitor(
          TEST_FIXTURES.channels.supervisor,
          TEST_FIXTURES.channels.agent
        )

        await expect(endSession(session.id)).rejects.toThrow()

        // Session should still be removed from state
        expect(sessions.value.size).toBe(0)
      })
    })

    describe('endAllSessions', () => {
      it('should end all active sessions', async () => {
        const { monitor, whisper, endAllSessions, sessions } = useAmiSupervisor(mockClient)

        await monitor(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent1)
        await whisper(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent2)

        expect(sessions.value.size).toBe(2)

        await endAllSessions()

        expect(sessions.value.size).toBe(0)
        expect(mockClient.hangupChannel).toHaveBeenCalledTimes(2)
      })

      it('should continue ending remaining sessions even if some fail', async () => {
        const partialFailClient = createSupervisorMockClient({
          hangupChannel: vi
            .fn()
            .mockRejectedValueOnce(new Error('Channel not found'))
            .mockResolvedValueOnce(undefined),
        })

        const { monitor, whisper, endAllSessions, sessions } = useAmiSupervisor(partialFailClient)

        await monitor(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent1)
        await whisper(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent2)

        await endAllSessions()

        // Both sessions should be removed despite first hangup failing
        expect(sessions.value.size).toBe(0)
      })
    })
  })

  /**
   * Session Query Tests
   * Verify ability to check supervision status and retrieve sessions
   */
  describe('Session Queries', () => {
    describe('isSupervising', () => {
      it('should return true when supervising a channel', async () => {
        const { monitor, isSupervising } = useAmiSupervisor(mockClient)

        await monitor(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent)

        expect(isSupervising(TEST_FIXTURES.channels.agent)).toBe(true)
        // Should also match by channel base (without unique ID)
        expect(isSupervising('SIP/agent-00000002')).toBe(true)
      })

      it('should return false when not supervising the channel', async () => {
        const { monitor, isSupervising } = useAmiSupervisor(mockClient)

        await monitor(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent1)

        expect(isSupervising(TEST_FIXTURES.channels.agent2)).toBe(false)
      })

      it('should return false when no sessions exist', () => {
        const { isSupervising } = useAmiSupervisor(mockClient)

        expect(isSupervising(TEST_FIXTURES.channels.agent)).toBe(false)
      })
    })

    describe('getSessionForChannel', () => {
      it('should return session for supervised channel', async () => {
        const { monitor, getSessionForChannel } = useAmiSupervisor(mockClient)

        const session = await monitor(
          TEST_FIXTURES.channels.supervisor,
          TEST_FIXTURES.channels.agent
        )

        const found = getSessionForChannel(TEST_FIXTURES.channels.agent)

        expect(found).toBeDefined()
        expect(found?.id).toBe(session.id)
      })

      it('should return undefined when channel not supervised', async () => {
        const { monitor, getSessionForChannel } = useAmiSupervisor(mockClient)

        await monitor(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent1)

        expect(getSessionForChannel(TEST_FIXTURES.channels.agent2)).toBeUndefined()
      })

      it('should match by channel base (without unique ID)', async () => {
        const { monitor, getSessionForChannel } = useAmiSupervisor(mockClient)

        const session = await monitor(
          TEST_FIXTURES.channels.supervisor,
          TEST_FIXTURES.channels.agent
        )

        // Should find session even with different unique ID
        const found = getSessionForChannel('SIP/agent-00000999')

        expect(found?.id).toBe(session.id)
      })
    })
  })

  /**
   * Mode Switching Tests
   * Verify dynamic mode changes during active supervision
   */
  describe('Mode Switching', () => {
    it('should switch from one mode to another', async () => {
      const { monitor, switchMode, sessions } = useAmiSupervisor(mockClient)

      const session = await monitor(
        TEST_FIXTURES.channels.supervisor,
        TEST_FIXTURES.channels.agent
      )

      const newSession = await switchMode(session.id, TEST_FIXTURES.modes.barge)

      expect(newSession.mode).toBe(TEST_FIXTURES.modes.barge)
      expect(sessions.value.size).toBe(1)
      // Should have hung up old session and originated new one
      expect(mockClient.hangupChannel).toHaveBeenCalled()
      expect(mockClient.originate).toHaveBeenCalledTimes(2)
    })

    it('should return same session when mode unchanged', async () => {
      const { monitor, switchMode, sessions } = useAmiSupervisor(mockClient)

      const session = await monitor(
        TEST_FIXTURES.channels.supervisor,
        TEST_FIXTURES.channels.agent
      )

      const sameSession = await switchMode(session.id, TEST_FIXTURES.modes.monitor)

      expect(sameSession.id).toBe(session.id)
      expect(sessions.value.size).toBe(1)
      // Should not have hung up or originated new session
      expect(mockClient.hangupChannel).not.toHaveBeenCalled()
    })

    it('should throw error for non-existent session', async () => {
      const { switchMode } = useAmiSupervisor(mockClient)

      await expect(
        switchMode('non-existent', TEST_FIXTURES.modes.barge)
      ).rejects.toThrow(TEST_FIXTURES.errors.sessionNotFound)
    })
  })

  /**
   * Configuration Tests
   * Verify custom options are applied correctly
   */
  describe('Configuration', () => {
    it('should use custom ChanSpy options', async () => {
      const { monitor } = useAmiSupervisor(mockClient, {
        chanspyOptions: {
          monitor: TEST_FIXTURES.chanspyOptions.customMonitor,
        },
      })

      await monitor(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent)

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: `${TEST_FIXTURES.channels.agentBase},${TEST_FIXTURES.chanspyOptions.customMonitor}`,
        })
      )
    })

    it('should use custom dial timeout', async () => {
      const { monitor } = useAmiSupervisor(mockClient, {
        dialTimeout: TEST_FIXTURES.timeouts.custom,
      })

      await monitor(TEST_FIXTURES.channels.supervisor, TEST_FIXTURES.channels.agent)

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: TEST_FIXTURES.timeouts.custom,
        })
      )
    })
  })

  /**
   * State Management Tests
   * Verify reactive state updates correctly
   */
  describe('State Management', () => {
    it('should update activeSessionCount when sessions change', async () => {
      const { monitor, endSession, activeSessionCount } = useAmiSupervisor(mockClient)

      expect(activeSessionCount.value).toBe(0)

      const session1 = await monitor(
        TEST_FIXTURES.channels.supervisor,
        TEST_FIXTURES.channels.agent1
      )
      expect(activeSessionCount.value).toBe(1)

      const session2 = await monitor(
        TEST_FIXTURES.channels.supervisor,
        TEST_FIXTURES.channels.agent2
      )
      expect(activeSessionCount.value).toBe(2)

      await endSession(session1.id)
      expect(activeSessionCount.value).toBe(1)

      await endSession(session2.id)
      expect(activeSessionCount.value).toBe(0)
    })
  })

  /**
   * Channel Name Extraction Tests
   * Verify proper extraction of channel base from full channel names
   *
   * Channel format: TECH/name-uniqueid
   * - SIP/1000-00000001 → SIP/1000
   * - PJSIP/2000-0000000a → PJSIP/2000
   * - SIP/1000 → SIP/1000 (no unique ID)
   */
  describe('Channel Name Extraction', () => {
    describe.each([
      {
        description: 'SIP channel with unique ID',
        channel: 'SIP/1000-00000001',
        expectedBase: 'SIP/1000',
      },
      {
        description: 'PJSIP channel with unique ID',
        channel: TEST_FIXTURES.channels.pjsipAgent,
        expectedBase: 'PJSIP/2000',
      },
      {
        description: 'channel without unique ID',
        channel: TEST_FIXTURES.channels.simpleAgent,
        expectedBase: TEST_FIXTURES.channels.simpleAgent,
      },
    ])('$description', ({ channel, expectedBase }) => {
      it(`should extract base "${expectedBase}" from "${channel}"`, async () => {
        const { monitor } = useAmiSupervisor(mockClient)

        await monitor(TEST_FIXTURES.channels.supervisor, channel)

        expect(mockClient.originate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: `${expectedBase},${TEST_FIXTURES.chanspyOptions.monitor}`,
          })
        )
      })
    })
  })
})
