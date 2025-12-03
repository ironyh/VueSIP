/**
 * useAmiBlacklist composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmiBlacklist } from '@/composables/useAmiBlacklist'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient,
  type MockAmiClient,
} from '../utils/mockFactories'

describe('useAmiBlacklist', () => {
  let mockClient: MockAmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()
    // Default successful response
    mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have empty blocklist initially', () => {
      const { blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)
      expect(blocklist.value).toHaveLength(0)
    })

    it('should not be loading after initialization completes', async () => {
      const { isLoading } = useAmiBlacklist(mockClient as unknown as AmiClient)
      // Wait for async initialization to complete
      await vi.runAllTimersAsync()
      expect(isLoading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiBlacklist(mockClient as unknown as AmiClient)
      expect(error.value).toBeNull()
    })

    it('should have zero active count', () => {
      const { activeCount } = useAmiBlacklist(mockClient as unknown as AmiClient)
      expect(activeCount.value).toBe(0)
    })

    it('should have empty stats initially', () => {
      const { stats } = useAmiBlacklist(mockClient as unknown as AmiClient)
      expect(stats.value.totalEntries).toBe(0)
      expect(stats.value.activeEntries).toBe(0)
    })
  })

  describe('blockNumber', () => {
    it('should block a valid phone number', async () => {
      const onNumberBlocked = vi.fn()
      const { blockNumber, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { onNumberBlocked }
      )

      const result = await blockNumber('18005551234')

      expect(result.success).toBe(true)
      expect(result.number).toBe('18005551234')
      expect(result.entry).toBeDefined()
      expect(result.entry?.status).toBe('active')
      expect(blocklist.value).toHaveLength(1)
      expect(onNumberBlocked).toHaveBeenCalledWith(expect.objectContaining({
        number: '18005551234',
        status: 'active',
      }))
    })

    it('should normalize phone number on block', async () => {
      const { blockNumber, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('1-800-555-1234')

      expect(blocklist.value[0].number).toBe('18005551234')
    })

    it('should block with custom reason and action', async () => {
      const { blockNumber, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551234', {
        reason: 'spam',
        action: 'busy',
        description: 'Known spammer',
      })

      expect(blocklist.value[0].reason).toBe('spam')
      expect(blocklist.value[0].action).toBe('busy')
      expect(blocklist.value[0].description).toBe('Known spammer')
    })

    it('should block with expiration', async () => {
      const { blockNumber, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551234', {
        expiresIn: 3600000, // 1 hour
      })

      expect(blocklist.value[0].expiresAt).toBeDefined()
      expect(blocklist.value[0].expiresAt!.getTime()).toBeGreaterThan(Date.now())
    })

    it('should reject invalid phone number', async () => {
      const onError = vi.fn()
      const { blockNumber, error } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { onError }
      )

      const result = await blockNumber('<script>alert(1)</script>')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid phone number format')
      expect(error.value).toBe('Invalid phone number format')
      expect(onError).toHaveBeenCalled()
    })

    it('should reject empty phone number', async () => {
      const { blockNumber } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const result = await blockNumber('')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid phone number format')
    })

    it('should handle AMI client not connected', async () => {
      const onError = vi.fn()
      const { blockNumber, error } = useAmiBlacklist(null, { onError })

      const result = await blockNumber('18005551234')

      expect(result.success).toBe(false)
      expect(result.message).toBe('AMI client not connected')
      expect(error.value).toBe('AMI client not connected')
      expect(onError).toHaveBeenCalled()
    })

    it('should not duplicate already blocked number', async () => {
      const { blockNumber, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551234')
      const result = await blockNumber('18005551234')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Number already blocked')
      expect(blocklist.value).toHaveLength(1)
    })

    it('should sanitize description input', async () => {
      const { blockNumber, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551234', {
        description: '<script>alert("xss")</script>Test description',
      })

      expect(blocklist.value[0].description).toBe('alert(xss)Test description')
    })

    it('should use default reason and action from options', async () => {
      const { blockNumber, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        {
          defaultReason: 'telemarketer',
          defaultAction: 'voicemail',
        }
      )

      await blockNumber('18005551234')

      expect(blocklist.value[0].reason).toBe('telemarketer')
      expect(blocklist.value[0].action).toBe('voicemail')
    })
  })

  describe('unblockNumber', () => {
    it('should unblock a blocked number', async () => {
      const onNumberUnblocked = vi.fn()
      const { blockNumber, unblockNumber, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { onNumberUnblocked }
      )

      await blockNumber('18005551234')
      expect(blocklist.value).toHaveLength(1)

      const result = await unblockNumber('18005551234')

      expect(result.success).toBe(true)
      expect(result.number).toBe('18005551234')
      expect(blocklist.value).toHaveLength(0)
      expect(onNumberUnblocked).toHaveBeenCalledWith('18005551234')
    })

    it('should handle unblocking non-existent number', async () => {
      const { unblockNumber } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const result = await unblockNumber('18005551234')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Number not in blacklist')
    })

    it('should handle AMI client not connected', async () => {
      const { unblockNumber } = useAmiBlacklist(null)

      const result = await unblockNumber('18005551234')

      expect(result.success).toBe(false)
      expect(result.message).toBe('AMI client not connected')
    })
  })

  describe('updateBlock', () => {
    it('should update block entry', async () => {
      const { blockNumber, updateBlock, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumber('18005551234', { reason: 'manual' })
      const result = await updateBlock('18005551234', {
        reason: 'spam',
        action: 'busy',
      })

      expect(result.success).toBe(true)
      expect(blocklist.value[0].reason).toBe('spam')
      expect(blocklist.value[0].action).toBe('busy')
    })

    it('should handle updating non-existent entry', async () => {
      const { updateBlock } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const result = await updateBlock('18005551234', { reason: 'spam' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Number not in blacklist')
    })
  })

  describe('enableBlock and disableBlock', () => {
    it('should disable a block', async () => {
      const { blockNumber, disableBlock, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumber('18005551234')
      const result = await disableBlock('18005551234')

      expect(result.success).toBe(true)
      expect(blocklist.value[0].status).toBe('disabled')
    })

    it('should enable a disabled block', async () => {
      const { blockNumber, disableBlock, enableBlock, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumber('18005551234')
      await disableBlock('18005551234')
      const result = await enableBlock('18005551234')

      expect(result.success).toBe(true)
      expect(blocklist.value[0].status).toBe('active')
    })
  })

  describe('isBlocked', () => {
    it('should return true for blocked number', async () => {
      const { blockNumber, isBlocked } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551234')

      expect(isBlocked('18005551234')).toBe(true)
    })

    it('should return false for non-blocked number', () => {
      const { isBlocked } = useAmiBlacklist(mockClient as unknown as AmiClient)

      expect(isBlocked('18005551234')).toBe(false)
    })

    it('should return false for disabled block', async () => {
      const { blockNumber, disableBlock, isBlocked } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumber('18005551234')
      await disableBlock('18005551234')

      expect(isBlocked('18005551234')).toBe(false)
    })

    it('should match wildcard patterns', async () => {
      const { blockNumber, isBlocked } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('1800*')

      expect(isBlocked('18005551234')).toBe(true)
      expect(isBlocked('18009999999')).toBe(true)
      expect(isBlocked('15555551234')).toBe(false)
    })
  })

  describe('getBlockEntry', () => {
    it('should return block entry for blocked number', async () => {
      const { blockNumber, getBlockEntry } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551234', { reason: 'spam' })
      const entry = getBlockEntry('18005551234')

      expect(entry).toBeDefined()
      expect(entry?.number).toBe('18005551234')
      expect(entry?.reason).toBe('spam')
    })

    it('should return undefined for non-blocked number', () => {
      const { getBlockEntry } = useAmiBlacklist(mockClient as unknown as AmiClient)

      expect(getBlockEntry('18005551234')).toBeUndefined()
    })
  })

  describe('bulk operations', () => {
    it('should block multiple numbers', async () => {
      const { blockNumbers, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const result = await blockNumbers(
        ['18005551111', '18005552222', '18005553333'],
        { reason: 'spam' }
      )

      expect(result.success).toBe(3)
      expect(result.failed).toBe(0)
      expect(blocklist.value).toHaveLength(3)
    })

    it('should track failed blocks in bulk operation', async () => {
      const { blockNumbers } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const result = await blockNumbers([
        '18005551111',
        '<invalid>',
        '18005553333',
      ])

      expect(result.success).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].number).toBe('<invalid>')
    })

    it('should unblock multiple numbers', async () => {
      const { blockNumbers, unblockNumbers, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumbers(['18005551111', '18005552222', '18005553333'])
      const result = await unblockNumbers(['18005551111', '18005552222'])

      expect(result.success).toBe(2)
      expect(blocklist.value).toHaveLength(1)
    })

    it('should clear all entries', async () => {
      const { blockNumbers, clearAll, blocklist, stats } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumbers(['18005551111', '18005552222', '18005553333'])
      expect(blocklist.value).toHaveLength(3)

      const result = await clearAll()

      expect(result).toBe(true)
      expect(blocklist.value).toHaveLength(0)
      expect(stats.value.totalEntries).toBe(0)
    })
  })

  describe('query', () => {
    it('should filter by status', async () => {
      const { blockNumber, disableBlock, query } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumber('18005551111')
      await blockNumber('18005552222')
      await disableBlock('18005552222')

      const active = query({ status: 'active' })
      const disabled = query({ status: 'disabled' })

      expect(active).toHaveLength(1)
      expect(active[0].number).toBe('18005551111')
      expect(disabled).toHaveLength(1)
      expect(disabled[0].number).toBe('18005552222')
    })

    it('should filter by reason', async () => {
      const { blockNumber, query } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551111', { reason: 'spam' })
      await blockNumber('18005552222', { reason: 'telemarketer' })

      const spam = query({ reason: 'spam' })

      expect(spam).toHaveLength(1)
      expect(spam[0].number).toBe('18005551111')
    })

    it('should search by number pattern', async () => {
      const { blockNumber, query } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551111')
      await blockNumber('19005552222')

      const results = query({ search: '1800' })

      expect(results).toHaveLength(1)
      expect(results[0].number).toBe('18005551111')
    })

    it('should sort by blockedAt', async () => {
      const { blockNumber, query, blocklist: _blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumber('18005551111')
      vi.advanceTimersByTime(1000)
      await blockNumber('18005552222')
      vi.advanceTimersByTime(1000)
      await blockNumber('18005553333')

      const desc = query({ sortBy: 'blockedAt', sortOrder: 'desc' })
      const asc = query({ sortBy: 'blockedAt', sortOrder: 'asc' })

      expect(desc[0].number).toBe('18005553333')
      expect(asc[0].number).toBe('18005551111')
    })

    it('should paginate results', async () => {
      const { blockNumbers, query } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumbers([
        '18005551111',
        '18005552222',
        '18005553333',
        '18005554444',
        '18005555555',
      ])

      const page1 = query({ offset: 0, limit: 2 })
      const page2 = query({ offset: 2, limit: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
    })
  })

  describe('search', () => {
    it('should search blocklist', async () => {
      const { blockNumber, search } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551111', { description: 'Spam caller' })
      await blockNumber('18005552222', { description: 'Telemarketer' })

      const results = search('spam')

      expect(results).toHaveLength(1)
      expect(results[0].description).toBe('Spam caller')
    })
  })

  describe('import/export', () => {
    it('should export to JSON', async () => {
      const { blockNumber, exportList } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551111', { reason: 'spam' })

      const exported = exportList('json')
      const parsed = JSON.parse(exported)

      expect(parsed).toHaveLength(1)
      expect(parsed[0].number).toBe('18005551111')
      expect(parsed[0].reason).toBe('spam')
    })

    it('should export to CSV', async () => {
      const { blockNumber, exportList } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551111', { reason: 'spam' })

      const exported = exportList('csv')
      const lines = exported.split('\n')

      expect(lines[0]).toContain('number')
      expect(lines[1]).toContain('18005551111')
      expect(lines[1]).toContain('spam')
    })

    it('should export to TXT', async () => {
      const { blockNumber, exportList } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551111')
      await blockNumber('18005552222')

      const exported = exportList('txt')
      const lines = exported.split('\n')

      expect(lines).toContain('18005551111')
      expect(lines).toContain('18005552222')
    })

    it('should import from JSON', async () => {
      const { importList, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const data = JSON.stringify([
        { number: '18005551111', reason: 'spam' },
        { number: '18005552222', reason: 'telemarketer' },
      ])

      const result = await importList(data, 'json')

      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(blocklist.value).toHaveLength(2)
    })

    it('should import from TXT', async () => {
      const { importList, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const data = '18005551111\n18005552222\n18005553333'

      const result = await importList(data, 'txt')

      expect(result.success).toBe(true)
      expect(result.imported).toBe(3)
      expect(blocklist.value).toHaveLength(3)
    })

    it('should skip duplicates on import', async () => {
      const { blockNumber, importList } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551111')

      const data = JSON.stringify([
        { number: '18005551111' },
        { number: '18005552222' },
      ])

      const result = await importList(data, 'json')

      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
    })
  })

  describe('spam detection', () => {
    it('should check caller reputation', async () => {
      const { blockNumber, checkReputation } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551234', { reason: 'spam' })

      const reputation = await checkReputation('18005551234')

      expect(reputation.isBlocked).toBe(true)
      expect(reputation.spamScore).toBeGreaterThan(0)
      expect(reputation.category).toBe('spam')
    })

    it('should return clean reputation for unknown number', async () => {
      const { checkReputation } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const reputation = await checkReputation('18005551234')

      expect(reputation.isBlocked).toBe(false)
      expect(reputation.spamScore).toBe(0)
      expect(reputation.category).toBe('legitimate')
    })

    it('should trigger spam detection callback', async () => {
      const onSpamDetected = vi.fn()
      const { blockNumber, checkReputation } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { onSpamDetected, spamThreshold: 50 }
      )

      await blockNumber('18005551234', { reason: 'spam' })
      await checkReputation('18005551234')

      expect(onSpamDetected).toHaveBeenCalled()
    })

    it('should report spam', async () => {
      const { reportSpam, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      const result = await reportSpam('18005551234', 'robocall')

      expect(result).toBe(true)
      expect(blocklist.value).toHaveLength(1)
      expect(blocklist.value[0].reason).toBe('robocall')
    })
  })

  describe('cleanExpired', () => {
    it('should mark expired entries as expired', async () => {
      const { blockNumber, cleanExpired, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { autoCleanExpired: false }
      )

      await blockNumber('18005551234', { expiresIn: 1000 }) // 1 second

      vi.advanceTimersByTime(2000) // Advance past expiration

      const cleaned = await cleanExpired()

      expect(cleaned).toBe(1)
      expect(blocklist.value[0].status).toBe('expired')
    })
  })

  describe('stats', () => {
    it('should calculate stats correctly', async () => {
      const { blockNumber, disableBlock, getStats } = useAmiBlacklist(
        mockClient as unknown as AmiClient
      )

      await blockNumber('18005551111', { reason: 'spam', action: 'hangup' })
      await blockNumber('18005552222', { reason: 'telemarketer', action: 'busy' })
      await blockNumber('18005553333', { reason: 'spam', action: 'hangup' })
      await disableBlock('18005553333')

      const stats = getStats()

      expect(stats.totalEntries).toBe(3)
      expect(stats.activeEntries).toBe(2)
      expect(stats.disabledEntries).toBe(1)
      expect(stats.byReason.spam).toBe(2)
      expect(stats.byReason.telemarketer).toBe(1)
      expect(stats.byAction.hangup).toBe(2)
      expect(stats.byAction.busy).toBe(1)
    })
  })

  describe('per-extension blacklist', () => {
    it('should use extension-specific DB family', async () => {
      const { blockNumber } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      await blockNumber('18005551234')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'DBPut',
          Family: 'blacklist/1001',
        })
      )
    })

    it('should reject invalid extension format (path traversal attempt)', async () => {
      const { blockNumber } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { extension: '../../../etc/passwd' }
      )

      await blockNumber('18005551234')

      // Should use default family without extension due to invalid format
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'DBPut',
          Family: 'blacklist',
        })
      )
    })

    it('should reject extension with special characters', async () => {
      const { blockNumber } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { extension: 'ext;rm -rf /' }
      )

      await blockNumber('18005551234')

      // Should use default family without extension
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'DBPut',
          Family: 'blacklist',
        })
      )
    })
  })

  describe('pattern matching security', () => {
    it('should escape regex metacharacters when used with wildcards', async () => {
      const { blockNumber, isBlocked } = useAmiBlacklist(mockClient as unknown as AmiClient)

      // Block using a pattern with + (regex metacharacter) and wildcard
      // The + is kept during normalization, and * is our wildcard
      await blockNumber('+1800*')

      // Should match numbers starting with +1800
      expect(isBlocked('+18005551234')).toBe(true)
      expect(isBlocked('+18009999999')).toBe(true)
      // Should NOT match without the + prefix
      expect(isBlocked('18005551234')).toBe(false)
    })

    it('should handle patterns without wildcards as exact match', async () => {
      const { blockNumber, isBlocked } = useAmiBlacklist(mockClient as unknown as AmiClient)

      // Block exact number with + prefix
      await blockNumber('+18005551234')

      // Should match exact number only
      expect(isBlocked('+18005551234')).toBe(true)
      expect(isBlocked('+1800555123')).toBe(false)
      expect(isBlocked('18005551234')).toBe(false)
    })
  })

  describe('callbacks', () => {
    it('should call onCallBlocked when blocked call detected', async () => {
      const onCallBlocked = vi.fn()
      const { blockNumber, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { onCallBlocked }
      )

      await blockNumber('18005551234')

      // Simulate incoming call event (wrapped in data property as AMI events are)
      const eventHandler = mockClient._eventHandlers['event'][0]
      eventHandler({
        data: {
          Event: 'Newchannel',
          CallerIDNum: '18005551234',
        },
      })

      expect(onCallBlocked).toHaveBeenCalledWith(
        '18005551234',
        expect.objectContaining({ number: '18005551234' })
      )
      expect(blocklist.value[0].blockedCount).toBe(1)
    })
  })
})
