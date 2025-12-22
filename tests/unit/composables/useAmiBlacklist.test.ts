/**
 * Tests for useAmiBlacklist composable
 *
 * AMI blacklist management composable providing:
 * - Phone number blocking with pattern matching (wildcards)
 * - Block entry lifecycle (block, unblock, enable, disable)
 * - Bulk operations (blockNumbers, unblockNumbers, clearAll)
 * - Query and search capabilities with filtering
 * - Import/export (JSON, CSV, TXT formats)
 * - Spam detection and reputation checking
 * - Per-extension blacklist isolation
 * - Automatic expiration cleanup
 *
 * @see src/composables/useAmiBlacklist.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmiBlacklist } from '@/composables/useAmiBlacklist'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient,
  type MockAmiClient,
} from '../utils/mockFactories'

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  phoneNumbers: {
    valid: ['18005551234', '18005552222', '18005553333'],
    withFormatting: '1-800-555-1234',
    normalized: '18005551234',
    withPlus: '+18005551234',
    wildcard: '1800*',
    invalid: ['<script>alert(1)</script>', ''],
  },
  blockOptions: {
    spam: { reason: 'spam', action: 'hangup', description: 'Spam caller' },
    telemarketer: { reason: 'telemarketer', action: 'busy', description: 'Telemarketer' },
    withExpiration: { expiresIn: 3600000 }, // 1 hour
  },
  extensions: {
    valid: '1001',
    pathTraversal: '../../../etc/passwd',
    specialChars: 'ext;rm -rf /',
  },
  timeouts: {
    short: 1000,
    medium: 2000,
  },
} as const


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

  /**
   * Initialization Tests
   * Verify composable starts with correct initial state
   */
  describe('Initialization', () => {
    describe.each([
      {
        description: 'empty blocklist',
        property: 'blocklist',
        expectedValue: (result: any) => result.length === 0,
      },
      {
        description: 'no error',
        property: 'error',
        expectedValue: (result: any) => result === null,
      },
      {
        description: 'zero active count',
        property: 'activeCount',
        expectedValue: (result: any) => result === 0,
      },
    ])('initial state: $description', ({ property, expectedValue }) => {
      it(`should have ${property} with expected initial value`, () => {
        const result = useAmiBlacklist(mockClient as unknown as AmiClient)
        expect(expectedValue(result[property as keyof typeof result].value)).toBe(true)
      })
    })

    it('should not be loading after initialization completes', async () => {
      const { isLoading } = useAmiBlacklist(mockClient as unknown as AmiClient)
      await vi.runAllTimersAsync()
      expect(isLoading.value).toBe(false)
    })

    it('should have empty stats initially', () => {
      const { stats } = useAmiBlacklist(mockClient as unknown as AmiClient)
      expect(stats.value.totalEntries).toBe(0)
      expect(stats.value.activeEntries).toBe(0)
    })
  })

  /**
   * Block Number Tests
   * Verify number blocking functionality with validation and normalization
   */
  describe('blockNumber', () => {
    it('should block a valid phone number', async () => {
      const onNumberBlocked = vi.fn()
      const { blockNumber, blocklist } = useAmiBlacklist(
        mockClient as unknown as AmiClient,
        { onNumberBlocked }
      )

      const result = await blockNumber(TEST_FIXTURES.phoneNumbers.valid[0])

      expect(result.success).toBe(true)
      expect(result.number).toBe(TEST_FIXTURES.phoneNumbers.valid[0])
      expect(result.entry).toBeDefined()
      expect(result.entry?.status).toBe('active')
      expect(blocklist.value).toHaveLength(1)
      expect(onNumberBlocked).toHaveBeenCalledWith(expect.objectContaining({
        number: TEST_FIXTURES.phoneNumbers.valid[0],
        status: 'active',
      }))
    })

    it('should normalize phone number on block', async () => {
      const { blockNumber, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber(TEST_FIXTURES.phoneNumbers.withFormatting)

      expect(blocklist.value[0].number).toBe(TEST_FIXTURES.phoneNumbers.normalized)
    })

    /**
     * Block options tests
     * Verify various blocking configurations work correctly
     */
    describe.each([
      {
        description: 'custom reason and action',
        options: TEST_FIXTURES.blockOptions.spam,
        expectedReason: 'spam',
        expectedAction: 'hangup',
        expectedDescription: 'Spam caller',
      },
      {
        description: 'telemarketer blocking',
        options: TEST_FIXTURES.blockOptions.telemarketer,
        expectedReason: 'telemarketer',
        expectedAction: 'busy',
        expectedDescription: 'Telemarketer',
      },
    ])('with $description', ({ options, expectedReason, expectedAction, expectedDescription }) => {
      it('should block with specified options', async () => {
        const { blockNumber, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

        await blockNumber(TEST_FIXTURES.phoneNumbers.valid[0], options)

        expect(blocklist.value[0].reason).toBe(expectedReason)
        expect(blocklist.value[0].action).toBe(expectedAction)
        expect(blocklist.value[0].description).toBe(expectedDescription)
      })
    })

    it('should block with expiration', async () => {
      const { blockNumber, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber(TEST_FIXTURES.phoneNumbers.valid[0], TEST_FIXTURES.blockOptions.withExpiration)

      expect(blocklist.value[0].expiresAt).toBeDefined()
      expect(blocklist.value[0].expiresAt!.getTime()).toBeGreaterThan(Date.now())
    })

    /**
     * Validation tests
     * Verify input validation and error handling
     */
    describe.each([
      {
        description: 'invalid phone number',
        number: TEST_FIXTURES.phoneNumbers.invalid[0],
        expectedMessage: 'Invalid phone number format',
        shouldCallError: true,
      },
      {
        description: 'empty phone number',
        number: TEST_FIXTURES.phoneNumbers.invalid[1],
        expectedMessage: 'Invalid phone number format',
        shouldCallError: false,
      },
    ])('validation: $description', ({ number, expectedMessage, shouldCallError }) => {
      it(`should reject ${number ? 'invalid' : 'empty'} number`, async () => {
        const onError = vi.fn()
        const { blockNumber, error } = useAmiBlacklist(
          mockClient as unknown as AmiClient,
          shouldCallError ? { onError } : {}
        )

        const result = await blockNumber(number)

        expect(result.success).toBe(false)
        expect(result.message).toBe(expectedMessage)
        expect(error.value).toBe(expectedMessage)
        if (shouldCallError) {
          expect(onError).toHaveBeenCalled()
        }
      })
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

  /**
   * Unblock Number Tests
   * Verify number unblocking functionality and error handling
   */
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

  /**
   * Update Block Tests
   * Verify block entry modification functionality
   */
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

  /**
   * Block State Management Tests
   * Verify enable/disable block state transitions
   */
  describe('Enable and Disable Block', () => {
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

  /**
   * Is Blocked Tests
   * Verify number blocking status checks including pattern matching
   */
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

  /**
   * Get Block Entry Tests
   * Verify retrieval of block entry details
   */
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

  /**
   * Bulk Operations Tests
   * Verify batch blocking/unblocking and clearAll functionality
   */
  describe('Bulk Operations', () => {
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

  /**
   * Query Tests
   * Verify filtering, searching, sorting, and pagination capabilities
   */
  describe('Query', () => {
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

  /**
   * Search Tests
   * Verify text search across number and description fields
   */
  describe('Search', () => {
    it('should search blocklist', async () => {
      const { blockNumber, search } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber('18005551111', { description: 'Spam caller' })
      await blockNumber('18005552222', { description: 'Telemarketer' })

      const results = search('spam')

      expect(results).toHaveLength(1)
      expect(results[0].description).toBe('Spam caller')
    })
  })

  /**
   * Import/Export Tests
   * Verify data import/export functionality across multiple formats
   *
   * Supported formats:
   * - JSON: Full structured data with all properties
   * - CSV: Tabular format with headers
   * - TXT: Simple newline-separated numbers
   */
  describe('Import/Export', () => {
    /**
     * Export format tests
     * Verify correct formatting for each export type
     */
    describe.each([
      {
        format: 'json' as const,
        description: 'JSON format',
        verify: (exported: string) => {
          const parsed = JSON.parse(exported)
          expect(parsed).toHaveLength(1)
          expect(parsed[0].number).toBe(TEST_FIXTURES.phoneNumbers.valid[0])
          expect(parsed[0].reason).toBe('spam')
        },
      },
      {
        format: 'csv' as const,
        description: 'CSV format',
        verify: (exported: string) => {
          const lines = exported.split('\n')
          expect(lines[0]).toContain('number')
          expect(lines[1]).toContain(TEST_FIXTURES.phoneNumbers.valid[0])
          expect(lines[1]).toContain('spam')
        },
      },
      {
        format: 'txt' as const,
        description: 'TXT format',
        verify: (exported: string) => {
          const lines = exported.split('\n')
          expect(lines).toContain(TEST_FIXTURES.phoneNumbers.valid[0])
        },
      },
    ])('export: $description', ({ format, verify }) => {
      it(`should export to ${format.toUpperCase()}`, async () => {
        const { blockNumber, exportList } = useAmiBlacklist(mockClient as unknown as AmiClient)

        await blockNumber(TEST_FIXTURES.phoneNumbers.valid[0], TEST_FIXTURES.blockOptions.spam)

        const exported = exportList(format)
        verify(exported)
      })
    })

    /**
     * Import format tests
     * Verify correct parsing and deduplication for each import type
     */
    describe.each([
      {
        format: 'json' as const,
        description: 'JSON format',
        data: JSON.stringify([
          { number: TEST_FIXTURES.phoneNumbers.valid[0], reason: 'spam' },
          { number: TEST_FIXTURES.phoneNumbers.valid[1], reason: 'telemarketer' },
        ]),
        expectedCount: 2,
      },
      {
        format: 'txt' as const,
        description: 'TXT format',
        data: `${TEST_FIXTURES.phoneNumbers.valid[0]}\n${TEST_FIXTURES.phoneNumbers.valid[1]}\n${TEST_FIXTURES.phoneNumbers.valid[2]}`,
        expectedCount: 3,
      },
    ])('import: $description', ({ format, data, expectedCount }) => {
      it(`should import from ${format.toUpperCase()}`, async () => {
        const { importList, blocklist } = useAmiBlacklist(mockClient as unknown as AmiClient)

        const result = await importList(data, format)

        expect(result.success).toBe(true)
        expect(result.imported).toBe(expectedCount)
        expect(blocklist.value).toHaveLength(expectedCount)
      })
    })

    it('should skip duplicates on import', async () => {
      const { blockNumber, importList } = useAmiBlacklist(mockClient as unknown as AmiClient)

      await blockNumber(TEST_FIXTURES.phoneNumbers.valid[0])

      const data = JSON.stringify([
        { number: TEST_FIXTURES.phoneNumbers.valid[0] },
        { number: TEST_FIXTURES.phoneNumbers.valid[1] },
      ])

      const result = await importList(data, 'json')

      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
    })
  })

  /**
   * Spam Detection Tests
   * Verify reputation checking and spam reporting functionality
   */
  describe('Spam Detection', () => {
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

  /**
   * Clean Expired Tests
   * Verify automatic expiration cleanup functionality
   */
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

  /**
   * Statistics Tests
   * Verify aggregated stats calculation across all entries
   */
  describe('Statistics', () => {
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

  /**
   * Per-Extension Blacklist Tests
   * Verify extension isolation and security validation
   *
   * Extensions allow users to maintain separate blacklists per extension.
   * Security validation prevents path traversal and command injection attacks.
   */
  describe('Per-Extension Blacklist', () => {
    describe.each([
      {
        description: 'valid extension',
        extension: TEST_FIXTURES.extensions.valid,
        expectedFamily: 'blacklist/1001',
        isValid: true,
      },
      {
        description: 'path traversal attempt',
        extension: TEST_FIXTURES.extensions.pathTraversal,
        expectedFamily: 'blacklist',
        isValid: false,
      },
      {
        description: 'special characters',
        extension: TEST_FIXTURES.extensions.specialChars,
        expectedFamily: 'blacklist',
        isValid: false,
      },
    ])('extension: $description', ({ extension, expectedFamily, isValid }) => {
      it(`should ${isValid ? 'use extension-specific' : 'reject and use default'} DB family`, async () => {
        const { blockNumber } = useAmiBlacklist(
          mockClient as unknown as AmiClient,
          { extension }
        )

        await blockNumber(TEST_FIXTURES.phoneNumbers.valid[0])

        expect(mockClient.sendAction).toHaveBeenCalledWith(
          expect.objectContaining({
            Action: 'DBPut',
            Family: expectedFamily,
          })
        )
      })
    })
  })

  /**
   * Pattern Matching Security Tests
   * Verify secure handling of regex metacharacters in wildcard patterns
   *
   * Security considerations:
   * - Regex metacharacters must be escaped to prevent ReDoS attacks
   * - Wildcards (*) should work as simple pattern matching, not regex
   * - Invalid patterns should fail safely without execution
   */
  describe('Pattern Matching Security', () => {
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

  /**
   * Callback Tests
   * Verify event callbacks are triggered correctly
   */
  describe('Callbacks', () => {
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
