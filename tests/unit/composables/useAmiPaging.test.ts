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

  describe('initial state', () => {
    it('should have idle status initially', () => {
      const { status } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(status.value).toBe('idle')
    })

    it('should have no active session initially', () => {
      const { activeSession } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(activeSession.value).toBeNull()
    })

    it('should have empty page groups initially', () => {
      const { pageGroups } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(pageGroups.value).toHaveLength(0)
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(isLoading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(error.value).toBeNull()
    })

    it('should have empty history initially', () => {
      const { history } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(history.value).toHaveLength(0)
    })

    it('should load initial groups from options', () => {
      const initialGroups: PageGroup[] = [
        {
          id: 'sales',
          name: 'Sales Floor',
          extensions: ['1001', '1002'],
          mode: 'simplex',
          enabled: true,
        },
      ]
      const { pageGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: initialGroups,
      })
      expect(pageGroups.value).toHaveLength(1)
      expect(pageGroups.value[0].id).toBe('sales')
    })
  })

  describe('computed properties', () => {
    it('should compute isPaging correctly', () => {
      const { isPaging, status } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(isPaging.value).toBe(false)
      status.value = 'paging'
      expect(isPaging.value).toBe(true)
      status.value = 'connected'
      expect(isPaging.value).toBe(true)
      status.value = 'idle'
      expect(isPaging.value).toBe(false)
    })

    it('should compute isConnected correctly', () => {
      const { isConnected, status } = useAmiPaging(mockClient as unknown as AmiClient)
      expect(isConnected.value).toBe(false)
      status.value = 'connected'
      expect(isConnected.value).toBe(true)
    })

    it('should compute enabledGroups correctly', () => {
      const { pageGroups: _pageGroups, enabledGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'g1', name: 'Group 1', extensions: ['1001'], mode: 'simplex', enabled: true },
          { id: 'g2', name: 'Group 2', extensions: ['1002'], mode: 'simplex', enabled: false },
          { id: 'g3', name: 'Group 3', extensions: ['1003'], mode: 'duplex', enabled: true },
        ],
      })
      expect(enabledGroups.value).toHaveLength(2)
      expect(enabledGroups.value.map((g) => g.id)).toEqual(['g1', 'g3'])
    })

    it('should compute groupCount correctly', () => {
      const { groupCount } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'g1', name: 'Group 1', extensions: ['1001'], mode: 'simplex', enabled: true },
          { id: 'g2', name: 'Group 2', extensions: ['1002'], mode: 'simplex', enabled: false },
        ],
      })
      expect(groupCount.value).toBe(2)
    })
  })

  describe('pageExtension', () => {
    it('should throw if client is null', async () => {
      const { pageExtension } = useAmiPaging(null)
      await expect(pageExtension('1001')).rejects.toThrow('AMI client not connected')
    })

    it('should throw if already paging', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

      const { pageExtension, status } = useAmiPaging(mockClient as unknown as AmiClient)
      status.value = 'paging'

      await expect(pageExtension('1001')).rejects.toThrow('Already paging')
    })

    it('should initiate a page successfully', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

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
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

      const { pageExtension } = useAmiPaging(mockClient as unknown as AmiClient)

      const session = await pageExtension('1001', { mode: 'duplex' })

      expect(session.mode).toBe('duplex')
    })

    it('should handle originate failure', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: false,
        message: 'Channel not available',
      })

      const onError = vi.fn()
      const { pageExtension, status } = useAmiPaging(
        mockClient as unknown as AmiClient,
        { onError }
      )

      await expect(pageExtension('1001')).rejects.toThrow('Channel not available')

      expect(status.value).toBe('idle')
      // Error callback should have been called with the error message
      expect(onError).toHaveBeenCalledWith('Channel not available', expect.any(Object))
    })

    it('should use custom options', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

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

    it('should reject invalid extension format', async () => {
      const { pageExtension } = useAmiPaging(mockClient as unknown as AmiClient)

      // Test various invalid formats
      await expect(pageExtension('')).rejects.toThrow('Invalid extension format')
      await expect(pageExtension('ext;DROP TABLE')).rejects.toThrow('Invalid extension format')
      await expect(pageExtension('ext<script>')).rejects.toThrow('Invalid extension format')
      await expect(pageExtension('a'.repeat(33))).rejects.toThrow('Invalid extension format')
    })

    it('should accept valid extension formats', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

      const { pageExtension } = useAmiPaging(mockClient as unknown as AmiClient)

      // Test valid formats - these should not throw
      await expect(pageExtension('1001')).resolves.toBeDefined()

      // Reset for next test
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

      const { pageExtension: pageExt2, endPage } = useAmiPaging(mockClient as unknown as AmiClient)
      const session = await pageExt2('SIP_1001')
      expect(session.target).toBe('SIP_1001')
      await endPage()

      const { pageExtension: pageExt3 } = useAmiPaging(mockClient as unknown as AmiClient)
      const session2 = await pageExt3('ext-100.1')
      expect(session2.target).toBe('ext-100.1')
    })
  })

  describe('pageGroup', () => {
    it('should throw if group not found', async () => {
      const { pageGroup } = useAmiPaging(mockClient as unknown as AmiClient)
      await expect(pageGroup('nonexistent')).rejects.toThrow('Page group not found')
    })

    it('should throw if group is disabled', async () => {
      const { pageGroup } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'disabled-group', name: 'Disabled', extensions: ['1001'], mode: 'simplex', enabled: false },
        ],
      })
      await expect(pageGroup('disabled-group')).rejects.toThrow('Page group is disabled')
    })

    it('should page a group successfully', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/s@page-group-00000001',
      })

      const { pageGroup, activeSession } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          {
            id: 'sales',
            name: 'Sales Floor',
            extensions: ['1001', '1002', '1003'],
            mode: 'simplex',
            enabled: true,
          },
        ],
      })

      const session = await pageGroup('sales')

      expect(session.isGroup).toBe(true)
      expect(session.target).toContain('1001')
      expect(activeSession.value).not.toBeNull()
    })
  })

  describe('pageExtensions', () => {
    it('should throw if no extensions provided', async () => {
      const { pageExtensions } = useAmiPaging(mockClient as unknown as AmiClient)
      await expect(pageExtensions([])).rejects.toThrow('No extensions provided')
    })

    it('should page multiple extensions', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/s@page-group-00000001',
      })

      const { pageExtensions } = useAmiPaging(mockClient as unknown as AmiClient)

      const session = await pageExtensions(['1001', '1002', '1003'])

      expect(session.isGroup).toBe(true)
      expect(session.target).toBe('1001,1002,1003')
    })

    it('should respect maxChannels option', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/s@page-group-00000001',
      })

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

  describe('endPage', () => {
    it('should do nothing if no active session', async () => {
      const { endPage, activeSession } = useAmiPaging(mockClient as unknown as AmiClient)
      await endPage()
      expect(activeSession.value).toBeNull()
    })

    it('should end an active page', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

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

  describe('togglePage', () => {
    it('should start page if not paging', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

      const { togglePage, status } = useAmiPaging(mockClient as unknown as AmiClient)

      await togglePage('1001')

      expect(status.value).toBe('paging')
    })

    it('should end page if already paging', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

      const { togglePage, pageExtension, status } = useAmiPaging(
        mockClient as unknown as AmiClient
      )

      await pageExtension('1001')
      expect(status.value).toBe('paging')

      await togglePage('1002') // Different target, but will end existing page

      expect(status.value).toBe('idle')
    })

    it('should page group when isGroup is true', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'Local/s@page-group-00000001',
      })

      const { togglePage, activeSession } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'sales', name: 'Sales', extensions: ['1001', '1002'], mode: 'simplex', enabled: true },
        ],
      })

      await togglePage('sales', true)

      expect(activeSession.value?.isGroup).toBe(true)
    })
  })

  describe('group management', () => {
    it('should add a group', () => {
      const { addGroup, pageGroups } = useAmiPaging(mockClient as unknown as AmiClient)

      addGroup({
        id: 'new-group',
        name: 'New Group',
        extensions: ['1001', '1002'],
        mode: 'simplex',
        enabled: true,
      })

      expect(pageGroups.value).toHaveLength(1)
      expect(pageGroups.value[0].id).toBe('new-group')
    })

    it('should throw when adding duplicate group ID', () => {
      const { addGroup } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'existing', name: 'Existing', extensions: ['1001'], mode: 'simplex', enabled: true },
        ],
      })

      expect(() =>
        addGroup({
          id: 'existing',
          name: 'Duplicate',
          extensions: ['1002'],
          mode: 'simplex',
          enabled: true,
        })
      ).toThrow('Group with ID existing already exists')
    })

    it('should update a group', () => {
      const { updateGroup, pageGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'group1', name: 'Original Name', extensions: ['1001'], mode: 'simplex', enabled: true },
        ],
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
      const { removeGroup, pageGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'group1', name: 'Group 1', extensions: ['1001'], mode: 'simplex', enabled: true },
          { id: 'group2', name: 'Group 2', extensions: ['1002'], mode: 'simplex', enabled: true },
        ],
      })

      removeGroup('group1')

      expect(pageGroups.value).toHaveLength(1)
      expect(pageGroups.value[0].id).toBe('group2')
    })

    it('should throw when removing nonexistent group', () => {
      const { removeGroup } = useAmiPaging(mockClient as unknown as AmiClient)

      expect(() => removeGroup('nonexistent')).toThrow('Group not found')
    })

    it('should get a group by ID', () => {
      const { getGroup } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'group1', name: 'Group 1', extensions: ['1001'], mode: 'simplex', enabled: true },
        ],
      })

      const group = getGroup('group1')
      expect(group).toBeDefined()
      expect(group?.name).toBe('Group 1')

      const notFound = getGroup('nonexistent')
      expect(notFound).toBeUndefined()
    })

    it('should toggle group enabled state', () => {
      const { toggleGroupEnabled, pageGroups } = useAmiPaging(mockClient as unknown as AmiClient, {
        pageGroups: [
          { id: 'group1', name: 'Group 1', extensions: ['1001'], mode: 'simplex', enabled: true },
        ],
      })

      expect(pageGroups.value[0].enabled).toBe(true)

      toggleGroupEnabled('group1')
      expect(pageGroups.value[0].enabled).toBe(false)

      toggleGroupEnabled('group1')
      expect(pageGroups.value[0].enabled).toBe(true)
    })
  })

  describe('history', () => {
    it('should add completed sessions to history', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

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
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

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
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

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
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

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

  describe('event handling', () => {
    it('should update status to connected on NewState Up', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

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
        createAmiEvent('NewState', {
          ChannelState: '6', // Up
          ChannelStateDesc: 'Up',
          Channel: 'PJSIP/1001-00000001',
        })
      )

      await nextTick()

      expect(status.value).toBe('connected')
      expect(onPageConnect).toHaveBeenCalled()
    })

    it('should handle hangup event', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

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
        createAmiEvent('Hangup', {
          Channel: 'PJSIP/1001-00000001',
          Cause: '16',
          CauseTxt: 'Normal Clearing',
        })
      )

      await nextTick()

      expect(status.value).toBe('idle')
      expect(activeSession.value).toBeNull()
      expect(history.value).toHaveLength(1)
      expect(onPageEnd).toHaveBeenCalled()
    })
  })

  describe('callbacks', () => {
    it('should call onPageStart callback', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })

      const onPageStart = vi.fn()
      const { pageExtension } = useAmiPaging(mockClient as unknown as AmiClient, { onPageStart })

      await pageExtension('1001')

      expect(onPageStart).toHaveBeenCalledWith(
        expect.objectContaining({
          target: '1001',
          mode: 'simplex',
          status: 'paging',
        })
      )
    })

    it('should call onPageEnd callback', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: true,
        channel: 'PJSIP/1001-00000001',
      })
      mockClient.hangupChannel = vi.fn().mockResolvedValue(undefined)

      const onPageEnd = vi.fn()
      const { pageExtension, endPage } = useAmiPaging(
        mockClient as unknown as AmiClient,
        { onPageEnd }
      )

      await pageExtension('1001')
      await endPage()

      expect(onPageEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          target: '1001',
          endTime: expect.any(Date),
        })
      )
    })

    it('should call onError callback on failure', async () => {
      mockClient.originate = vi.fn().mockResolvedValue({
        success: false,
        message: 'Channel busy',
      })

      const onError = vi.fn()
      const { pageExtension } = useAmiPaging(mockClient as unknown as AmiClient, { onError })

      await expect(pageExtension('1001')).rejects.toThrow()

      expect(onError).toHaveBeenCalledWith('Channel busy', expect.any(Object))
    })
  })
})
