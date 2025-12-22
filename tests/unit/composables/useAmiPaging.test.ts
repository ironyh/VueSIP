/**
 * useAmiPaging composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiPaging } from '@/composables/useAmiPaging'
import type { AmiClient } from '@/core/AmiClient'
import type { PageGroup } from '@/types/paging.types'
import {
  createMockAmiClient,
  createAmiEvent,
  type MockAmiClient,
} from '../utils/mockFactories'

// ============================================================================
// Test Fixtures - Centralized test data and configuration
// ============================================================================

const TEST_FIXTURES = {
  extensions: {
    valid: {
      simple: '1001',
      withPrefix: 'SIP_1001',
      withDots: 'ext-100.1',
    },
    invalid: {
      empty: '',
      tooLong: 'a'.repeat(33),
      withSemicolon: 'ext;DROP TABLE',
      withScript: 'ext<script>',
    },
  },
  pageGroups: {
    sales: {
      id: 'sales',
      name: 'Sales Floor',
      extensions: ['1001', '1002', '1003'],
      mode: 'simplex' as const,
      enabled: true,
    },
    disabled: {
      id: 'disabled-group',
      name: 'Disabled',
      extensions: ['1001'],
      mode: 'simplex' as const,
      enabled: false,
    },
    support: {
      id: 'support',
      name: 'Support Team',
      extensions: ['2001', '2002'],
      mode: 'duplex' as const,
      enabled: true,
    },
  },
  channels: {
    pjsip: 'PJSIP/1001-00000001',
    local: 'Local/s@page-group-00000001',
  },
  responses: {
    success: {
      success: true,
      channel: 'PJSIP/1001-00000001',
    },
    failure: {
      success: false,
      message: 'Channel not available',
    },
    busy: {
      success: false,
      message: 'Channel busy',
    },
  },
  events: {
    newStateUp: {
      ChannelState: '6',
      ChannelStateDesc: 'Up',
      Channel: 'PJSIP/1001-00000001',
    },
    hangup: {
      Channel: 'PJSIP/1001-00000001',
      Cause: '16',
      CauseTxt: 'Normal Clearing',
    },
  },
} as const

// ============================================================================
// Factory Functions - Reduce duplication in test setup
// ============================================================================

/**
 * Factory: Create page group with sensible defaults
 *
 * @param overrides - Optional property overrides
 * @returns PageGroup object for testing
 */
function createTestPageGroup(overrides?: Partial<PageGroup>): PageGroup {
  return {
    id: 'test-group',
    name: 'Test Group',
    extensions: ['1001', '1002'],
    mode: 'simplex',
    enabled: true,
    ...overrides,
  }
}

/**
 * Factory: Create multiple page groups for testing
 *
 * @param count - Number of groups to create
 * @returns Array of PageGroup objects
 */
function createTestPageGroups(count: number = 2): PageGroup[] {
  return Array.from({ length: count }, (_, i) =>
    createTestPageGroup({
      id: `group-${i + 1}`,
      name: `Group ${i + 1}`,
      extensions: [`${1000 + i}1`, `${1000 + i}2`],
    })
  )
}

/**
 * Factory: Setup mock client with originate response
 *
 * @param client - Mock AMI client
 * @param response - Originate response to return
 */
function setupOriginateResponse(client: MockAmiClient, response = TEST_FIXTURES.responses.success) {
  client.originate = vi.fn().mockResolvedValue(response)
}

/**
 * Factory: Setup mock client for successful page flow
 *
 * @param client - Mock AMI client
 */
function setupSuccessfulPageFlow(client: MockAmiClient) {
  client.originate = vi.fn().mockResolvedValue(TEST_FIXTURES.responses.success)
  client.hangupChannel = vi.fn().mockResolvedValue(undefined)
}

describe('useAmiPaging', () => {
  let mockClient: MockAmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  /**
   * Initial State Tests
   * Validates default values when composable is first initialized
   */
  describe('initial state', () => {
    // Parameterized tests for initial state values
    describe.each([
      { property: 'status', expected: 'idle', description: 'idle status' },
      { property: 'activeSession', expected: null, description: 'no active session' },
      { property: 'isLoading', expected: false, description: 'not loading' },
      { property: 'error', expected: null, description: 'no error' },
    ])('default values', ({ property, expected, description }) => {
      it(`should have ${description} initially`, () => {
        const result = useAmiPaging(mockClient as unknown as AmiClient)
        expect(result[property].value).toBe(expected)
      })
    })

    // Parameterized tests for empty collections
    describe.each([
      { property: 'pageGroups', description: 'page groups' },
      { property: 'history', description: 'history' },
    ])('empty collections', ({ property, description }) => {
      it(`should have empty ${description} initially`, () => {
        const result = useAmiPaging(mockClient as unknown as AmiClient)
        expect(result[property].value).toHaveLength(0)
      })
    })

    it('should load initial groups from options', () => {
      const initialGroups = [TEST_FIXTURES.pageGroups.sales]
      const { pageGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: initialGroups,
      })
      expect(pageGroups.value).toHaveLength(1)
      expect(pageGroups.value[0].id).toBe('sales')
    })
  })

  /**
   * Computed Properties Tests
   * Validates reactive computed properties that derive state
   */
  describe('computed properties', () => {
    /**
     * isPaging computed property - active when status is 'paging' or 'connected'
     */
    describe.each([
      { status: 'idle', expected: false, description: 'idle status' },
      { status: 'paging', expected: true, description: 'paging status' },
      { status: 'connected', expected: true, description: 'connected status' },
    ])('isPaging', ({ status: statusValue, expected, description }) => {
      it(`should be ${expected} for ${description}`, () => {
        const { isPaging, status } = useAmiPaging(mockClient as unknown as AmiClient)
        status.value = statusValue as any
        expect(isPaging.value).toBe(expected)
      })
    })

    it('should compute isConnected correctly', () => {
      const { isConnected, status } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(isConnected.value).toBe(false)
      status.value = 'connected'
      expect(isConnected.value).toBe(true)
    })

    it('should compute enabledGroups correctly', () => {
      const testGroups = createTestPageGroups(3)
      testGroups[1].enabled = false // Disable second group

      const { enabledGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: testGroups,
      })
      expect(enabledGroups.value).toHaveLength(2)
      expect(enabledGroups.value.map((g) => g.id)).toEqual(['group-1', 'group-3'])
    })

    it('should compute groupCount correctly', () => {
      const testGroups = createTestPageGroups(2)
      const { groupCount } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: testGroups,
      })
      expect(groupCount.value).toBe(2)
    })
  })

  /**
   * pageExtension Tests
   * Tests for paging individual extensions
   */
  describe('pageExtension', () => {
    // Parameterized error condition tests
    describe.each([
      {
        setup: () => ({ client: null, status: 'idle' }),
        expectedError: 'AMI client not connected',
        description: 'null client'
      },
      {
        setup: (client: MockAmiClient) => {
          setupOriginateResponse(client)
          return { client, status: 'paging' }
        },
        expectedError: 'Already paging',
        description: 'already paging'
      },
    ])('error conditions', ({ setup, expectedError, description }) => {
      it(`should throw when ${description}`, async () => {
        const { client, status: statusValue } = setup(mockClient) as any
        const { pageExtension, status } = useAmiPaging(client as unknown as AmiClient)
        if (statusValue) status.value = statusValue
        await expect(pageExtension('1001')).rejects.toThrow(expectedError)
      })
    })

    it('should initiate a page successfully', async () => {
      setupOriginateResponse(mockClient)

      const onPageStart = vi.fn()
      const { pageExtension, status, activeSession } = useAmiPaging(
        mockClient as unknown as AmiClient,
        { onPageStart }
      )

      const session = await pageExtension('1001')

      expect(status.value).toBe('paging')
      expect(activeSession.value).not.toBeNull()
      expect(session.target).toBe('1001')
      expect(session.isGroup).toBe(false)
      expect(session.mode).toBe('simplex')
      expect(onPageStart).toHaveBeenCalledWith(expect.objectContaining({ target: '1001' }))
    })

    it('should use duplex mode when specified', async () => {
      setupOriginateResponse(mockClient)
      const { pageExtension } = useAmiPaging(mockClient as unknown as AmiClient)

      const session = await pageExtension('1001', { mode: 'duplex' })

      expect(session.mode).toBe('duplex')
    })

    it('should handle originate failure', async () => {
      setupOriginateResponse(mockClient, TEST_FIXTURES.responses.failure)

      const onError = vi.fn()
      const { pageExtension, status } = useAmiPaging(
        mockClient as unknown as AmiClient,
        { onError }
      )

      await expect(pageExtension('1001')).rejects.toThrow('Channel not available')

      expect(status.value).toBe('idle')
      expect(onError).toHaveBeenCalledWith('Channel not available', expect.any(Object))
    })

    it('should use custom options', async () => {
      setupOriginateResponse(mockClient)
      const { pageExtension } = useAmiPaging(mockClient as unknown as AmiClient)

      await pageExtension('1001', {
        callerId: 'Custom Paging',
        timeout: 60,
      })

      expect(mockClient.originate).toHaveBeenCalledWith(
        expect.objectContaining({
          callerId: expect.stringContaining('Custom Paging'),
          timeout: 60000,
        })
      )
    })

    /**
     * Extension validation tests - parameterized for comprehensive coverage
     */
    describe.each([
      { ext: TEST_FIXTURES.extensions.invalid.empty, description: 'empty extension' },
      { ext: TEST_FIXTURES.extensions.invalid.withSemicolon, description: 'semicolon injection' },
      { ext: TEST_FIXTURES.extensions.invalid.withScript, description: 'script tag injection' },
      { ext: TEST_FIXTURES.extensions.invalid.tooLong, description: 'too long extension' },
    ])('invalid extension formats', ({ ext, description }) => {
      it(`should reject ${description}`, async () => {
        const { pageExtension } = useAmiPaging(mockClient as unknown as AmiClient)
        await expect(pageExtension(ext)).rejects.toThrow('Invalid extension format')
      })
    })

    describe.each([
      { ext: TEST_FIXTURES.extensions.valid.simple, description: 'simple numeric' },
      { ext: TEST_FIXTURES.extensions.valid.withPrefix, description: 'with prefix' },
      { ext: TEST_FIXTURES.extensions.valid.withDots, description: 'with dots' },
    ])('valid extension formats', ({ ext, description }) => {
      it(`should accept ${description} extension`, async () => {
        setupSuccessfulPageFlow(mockClient)
        const { pageExtension, endPage } = useAmiPaging(mockClient as unknown as AmiClient)

        const session = await pageExtension(ext)
        expect(session.target).toBe(ext)
        await endPage()
      })
    })
  })

  /**
   * pageGroup Tests
   * Tests for paging predefined groups of extensions
   */
  describe('pageGroup', () => {
    // Parameterized group error tests
    describe.each([
      {
        groups: [],
        groupId: 'nonexistent',
        expectedError: 'Page group not found',
        description: 'group not found'
      },
      {
        groups: [TEST_FIXTURES.pageGroups.disabled],
        groupId: 'disabled-group',
        expectedError: 'Page group is disabled',
        description: 'group is disabled'
      },
    ])('error conditions', ({ groups, groupId, expectedError, description }) => {
      it(`should throw when ${description}`, async () => {
        const { pageGroup } = useAmiPaging(mockClient as unknown as AmiClient, {
          pageGroups: groups,
        })
        await expect(pageGroup(groupId)).rejects.toThrow(expectedError)
      })
    })

    it('should page a group successfully', async () => {
      const response = { ...TEST_FIXTURES.responses.success, channel: TEST_FIXTURES.channels.local }
      setupOriginateResponse(mockClient, response)

      const { pageGroup, activeSession } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [TEST_FIXTURES.pageGroups.sales],
      })

      const session = await pageGroup('sales')

      expect(session.isGroup).toBe(true)
      expect(session.target).toContain('1001')
      expect(activeSession.value).not.toBeNull()
    })
  })

  /**
   * pageExtensions Tests
   * Tests for paging multiple ad-hoc extensions
   */
  describe('pageExtensions', () => {
    it('should throw if no extensions provided', async () => {
      const { pageExtensions } = useAmiPaging(mockClient as unknown as AmiClient)
      await expect(pageExtensions([])).rejects.toThrow('No extensions provided')
    })

    it('should page multiple extensions', async () => {
      const response = { ...TEST_FIXTURES.responses.success, channel: TEST_FIXTURES.channels.local }
      setupOriginateResponse(mockClient, response)

      const { pageExtensions } = useAmiPaging(mockClient as unknown as AmiClient)

      const session = await pageExtensions(['1001', '1002', '1003'])

      expect(session.isGroup).toBe(true)
      expect(session.target).toBe('1001,1002,1003')
    })

    it('should respect maxChannels option', async () => {
      const response = { ...TEST_FIXTURES.responses.success, channel: TEST_FIXTURES.channels.local }
      setupOriginateResponse(mockClient, response)

      const { pageExtensions } = useAmiPaging(mockClient as unknown as AmiClient)

      const session = await pageExtensions(['1001', '1002', '1003', '1004', '1005'], {
        maxChannels: 3,
      })

      expect(session.target).toBe('1001,1002,1003')
    })

    it('should reject invalid extensions in the list', async () => {
      const { pageExtensions } = useAmiPaging(mockClient as unknown as AmiClient)

      await expect(
        pageExtensions(['1001', 'bad;ext', '1003'])
      ).rejects.toThrow('Invalid extension format: bad;ext')
    })
  })

  /**
   * endPage Tests
   * Tests for ending active paging sessions
   */
  describe('endPage', () => {
    it('should do nothing if no active session', async () => {
      const { endPage, activeSession } = useAmiPaging(mockClient as unknown as AmiClient)
      await endPage()
      expect(activeSession.value).toBeNull()
    })

    it('should end an active page', async () => {
      setupSuccessfulPageFlow(mockClient)

      const onPageEnd = vi.fn()
      const { pageExtension, endPage, status, activeSession, history } = useAmiPaging(
        mockClient as unknown as AmiClient,
        { onPageEnd }
      )

      await pageExtension('1001')
      expect(activeSession.value).not.toBeNull()

      await endPage()

      expect(status.value).toBe('idle')
      expect(activeSession.value).toBeNull()
      expect(history.value).toHaveLength(1)
      expect(onPageEnd).toHaveBeenCalled()
    })
  })

  /**
   * togglePage Tests
   * Tests for toggling paging state (start/stop)
   */
  describe('togglePage', () => {
    it('should start page if not paging', async () => {
      setupOriginateResponse(mockClient)

      const { togglePage, status } = useAmiPaging(mockClient as unknown as AmiClient)

      await togglePage('1001')

      expect(status.value).toBe('paging')
    })

    it('should end page if already paging', async () => {
      setupSuccessfulPageFlow(mockClient)

      const { togglePage, pageExtension, status } = useAmiPaging(
        mockClient as unknown as AmiClient
      )

      await pageExtension('1001')
      expect(status.value).toBe('paging')

      await togglePage('1002') // Different target, but will end existing page

      expect(status.value).toBe('idle')
    })

    it('should page group when isGroup is true', async () => {
      const response = { ...TEST_FIXTURES.responses.success, channel: TEST_FIXTURES.channels.local }
      setupOriginateResponse(mockClient, response)

      const { togglePage, activeSession } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [TEST_FIXTURES.pageGroups.sales],
      })

      await togglePage('sales', true)

      expect(activeSession.value?.isGroup).toBe(true)
    })
  })

  /**
   * Group Management Tests
   * Tests for CRUD operations on page groups
   */
  describe('group management', () => {
    it('should add a group', () => {
      const { addGroup, pageGroups } = useAmiPaging(mockClient as unknown as AmiClient)

      const newGroup = createTestPageGroup({ id: 'new-group', name: 'New Group' })
      addGroup(newGroup)

      expect(pageGroups.value).toHaveLength(1)
      expect(pageGroups.value[0].id).toBe('new-group')
    })

    it('should throw when adding duplicate group ID', () => {
      const existingGroup = createTestPageGroup({ id: 'existing' })
      const { addGroup } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [existingGroup],
      })

      expect(() =>
        addGroup(createTestPageGroup({ id: 'existing', name: 'Duplicate' }))
      ).toThrow('Group with ID existing already exists')
    })

    it('should update a group', () => {
      const group = createTestPageGroup({ id: 'group1', name: 'Original Name' })
      const { updateGroup, pageGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [group],
      })

      updateGroup('group1', { name: 'Updated Name', extensions: ['1001', '1002'] })

      expect(pageGroups.value[0].name).toBe('Updated Name')
      expect(pageGroups.value[0].extensions).toEqual(['1001', '1002'])
    })

    it('should throw when updating nonexistent group', () => {
      const { updateGroup } = useAmiPaging(mockClient as unknown as AmiClient)

      expect(() => updateGroup('nonexistent', { name: 'New Name' })).toThrow('Group not found')
    })

    it('should remove a group', () => {
      const groups = createTestPageGroups(2)
      const { removeGroup, pageGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: groups,
      })

      removeGroup('group-1')

      expect(pageGroups.value).toHaveLength(1)
      expect(pageGroups.value[0].id).toBe('group-2')
    })

    it('should throw when removing nonexistent group', () => {
      const { removeGroup } = useAmiPaging(mockClient as unknown as AmiClient)

      expect(() => removeGroup('nonexistent')).toThrow('Group not found')
    })

    it('should get a group by ID', () => {
      const group = createTestPageGroup({ id: 'group1', name: 'Group 1' })
      const { getGroup } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [group],
      })

      const found = getGroup('group1')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Group 1')

      const notFound = getGroup('nonexistent')
      expect(notFound).toBeUndefined()
    })

    it('should toggle group enabled state', () => {
      const group = createTestPageGroup({ id: 'group1', enabled: true })
      const { toggleGroupEnabled, pageGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [group],
      })

      expect(pageGroups.value[0].enabled).toBe(true)

      toggleGroupEnabled('group1')
      expect(pageGroups.value[0].enabled).toBe(false)

      toggleGroupEnabled('group1')
      expect(pageGroups.value[0].enabled).toBe(true)
    })
  })

  /**
   * History Tests
   * Tests for session history tracking and management
   */
  describe('history', () => {
    it('should add completed sessions to history', async () => {
      setupSuccessfulPageFlow(mockClient)

      const { pageExtension, endPage, history } = useAmiPaging(
        mockClient as unknown as AmiClient
      )

      await pageExtension('1001')
      await endPage()

      expect(history.value).toHaveLength(1)
      expect(history.value[0].target).toBe('1001')
      expect(history.value[0].endTime).toBeDefined()
    })

    it('should clear history', async () => {
      setupSuccessfulPageFlow(mockClient)

      const { pageExtension, endPage, clearHistory, history } = useAmiPaging(
        mockClient as unknown as AmiClient
      )

      await pageExtension('1001')
      await endPage()
      expect(history.value).toHaveLength(1)

      clearHistory()
      expect(history.value).toHaveLength(0)
    })

    it('should get history for specific target', async () => {
      setupSuccessfulPageFlow(mockClient)

      const { pageExtension, endPage, getHistoryForTarget, history } = useAmiPaging(
        mockClient as unknown as AmiClient
      )

      await pageExtension('1001')
      await endPage()
      await pageExtension('1002')
      await endPage()
      await pageExtension('1001')
      await endPage()

      expect(history.value).toHaveLength(3)

      const historyFor1001 = getHistoryForTarget('1001')
      expect(historyFor1001).toHaveLength(2)
    })

    it('should limit history to 100 items', async () => {
      setupSuccessfulPageFlow(mockClient)

      const { pageExtension, endPage, history } = useAmiPaging(
        mockClient as unknown as AmiClient
      )

      // Add 105 items
      for (let i = 0; i < 105; i++) {
        await pageExtension('1001')
        await endPage()
      }

      expect(history.value.length).toBeLessThanOrEqual(100)
    })
  })

  /**
   * Event Handling Tests
   * Tests for AMI event processing and state updates
   */
  describe('event handling', () => {
    it('should update status to connected on NewState Up', async () => {
      setupOriginateResponse(mockClient)

      const onPageConnect = vi.fn()
      const { pageExtension, status } = useAmiPaging(
        mockClient as unknown as AmiClient,
        { onPageConnect }
      )

      await pageExtension('1001')
      expect(status.value).toBe('paging')

      // Simulate NewState event with Up state
      mockClient._triggerEvent(
        'newState',
        createAmiEvent('NewState', TEST_FIXTURES.events.newStateUp)
      )

      await nextTick()

      expect(status.value).toBe('connected')
      expect(onPageConnect).toHaveBeenCalled()
    })

    it('should handle hangup event', async () => {
      setupOriginateResponse(mockClient)

      const onPageEnd = vi.fn()
      const { pageExtension, status, activeSession, history } = useAmiPaging(
        mockClient as unknown as AmiClient,
        { onPageEnd }
      )

      await pageExtension('1001')
      expect(activeSession.value).not.toBeNull()

      // Simulate Hangup event
      mockClient._triggerEvent(
        'hangup',
        createAmiEvent('Hangup', TEST_FIXTURES.events.hangup)
      )

      await nextTick()

      expect(status.value).toBe('idle')
      expect(activeSession.value).toBeNull()
      expect(history.value).toHaveLength(1)
      expect(onPageEnd).toHaveBeenCalled()
    })
  })

  /**
   * Callback Tests
   * Tests for lifecycle callbacks (onPageStart, onPageEnd, onError)
   */
  describe('callbacks', () => {
    /**
     * Parameterized callback tests - validates all callbacks are invoked correctly
     */
    describe.each([
      {
        callback: 'onPageStart',
        setup: (cb: any) => ({ onPageStart: cb }),
        trigger: async (composable: any) => {
          setupOriginateResponse(mockClient)
          await composable.pageExtension('1001')
        },
        expectedArgs: {
          target: '1001',
          mode: 'simplex',
          status: 'paging',
        },
        description: 'page start'
      },
      {
        callback: 'onPageEnd',
        setup: (cb: any) => ({ onPageEnd: cb }),
        trigger: async (composable: any) => {
          setupSuccessfulPageFlow(mockClient)
          await composable.pageExtension('1001')
          await composable.endPage()
        },
        expectedArgs: {
          target: '1001',
          endTime: expect.any(Date),
        },
        description: 'page end'
      },
      {
        callback: 'onError',
        setup: (cb: any) => ({ onError: cb }),
        trigger: async (composable: any) => {
          setupOriginateResponse(mockClient, TEST_FIXTURES.responses.busy)
          await expect(composable.pageExtension('1001')).rejects.toThrow()
        },
        expectedArgs: ['Channel busy', expect.any(Object)],
        description: 'error'
      },
    ])('lifecycle callbacks', ({ callback, setup, trigger, expectedArgs, description }) => {
      it(`should call ${callback} on ${description}`, async () => {
        const callbackFn = vi.fn()
        const options = setup(callbackFn)
        const composable = useAmiPaging(mockClient as unknown as AmiClient, options)

        await trigger(composable)

        if (Array.isArray(expectedArgs)) {
          expect(callbackFn).toHaveBeenCalledWith(...expectedArgs)
        } else {
          expect(callbackFn).toHaveBeenCalledWith(expect.objectContaining(expectedArgs))
        }
      })
    })
  })
})
