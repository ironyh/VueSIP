/**
 * AMI Blacklist Composable
 *
 * Vue composable for managing call blocking/blacklist via AstDB.
 * Supports number blocking, pattern matching, and spam detection integration.
 *
 * @module composables/useAmiBlacklist
 */

import { ref, computed, onUnmounted } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  BlockReason,
  BlockAction,
  BlockStatus,
  BlockEntry,
  BlockResult,
  UnblockResult,
  CallerReputation,
  BlacklistStats,
  BlacklistQueryOptions,
  BlacklistFormat,
  ImportResult,
  UseAmiBlacklistOptions,
  UseAmiBlacklistReturn,
} from '@/types/blacklist.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiBlacklist')

// Re-export types for convenience
export type {
  BlockReason,
  BlockAction,
  BlockStatus,
  BlockEntry,
  BlockResult,
  UnblockResult,
  CallerReputation,
  BlacklistStats,
  BlacklistQueryOptions,
  BlacklistFormat,
  ImportResult,
  UseAmiBlacklistOptions,
  UseAmiBlacklistReturn,
}

/**
 * Validate phone number format
 * Allows digits, plus sign, asterisk (wildcard), and common separators
 */
function isValidPhoneNumber(number: string): boolean {
  if (!number || number.length < 1 || number.length > 32) {
    return false
  }
  // Allow digits, +, *, and common separators (for display purposes)
  return /^[\d*#+\-().\s]+$/.test(number)
}

/**
 * Validate extension format (used for per-extension blacklists)
 * Only allows alphanumeric characters and underscores
 */
function isValidExtension(extension: string): boolean {
  if (!extension || extension.length < 1 || extension.length > 32) {
    return false
  }
  // Only allow alphanumeric and underscore - prevents path traversal
  return /^[a-zA-Z0-9_]+$/.test(extension)
}

/**
 * Normalize phone number for storage
 * Removes formatting characters, keeps only digits and wildcards
 */
function normalizeNumber(number: string): string {
  // Remove formatting but keep + for international and * for wildcards
  return number.replace(/[\s\-().]/g, '')
}

/**
 * Sanitize input to prevent injection
 */
function sanitizeInput(input: string): string {
  // Strip HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>'";&|`$\\]/g, '')
  return sanitized.trim()
}

/**
 * Check if a number matches a pattern (supports wildcards)
 * Escapes regex metacharacters to prevent ReDoS attacks
 */
function matchesPattern(number: string, pattern: string): boolean {
  if (!pattern.includes('*')) {
    return number === pattern
  }
  // Escape regex metacharacters except *, then convert * to .*
  const escapedPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex metacharacters
    .replace(/\*/g, '.*') // Convert wildcard to regex
  const regex = new RegExp(`^${escapedPattern}$`)
  return regex.test(number)
}

/**
 * Serialize BlockEntry for AstDB storage
 */
function serializeEntry(entry: BlockEntry): string {
  return JSON.stringify({
    r: entry.reason,
    a: entry.action,
    d: entry.description,
    ba: entry.blockedAt.toISOString(),
    ea: entry.expiresAt?.toISOString(),
    bb: entry.blockedBy,
    s: entry.status,
    bc: entry.blockedCount,
    lb: entry.lastBlockedAt?.toISOString(),
  })
}

/**
 * Deserialize BlockEntry from AstDB storage
 */
function deserializeEntry(number: string, data: string): BlockEntry | null {
  try {
    const parsed = JSON.parse(data)
    return {
      number,
      reason: parsed.r || 'manual',
      action: parsed.a || 'hangup',
      description: parsed.d,
      blockedAt: new Date(parsed.ba),
      expiresAt: parsed.ea ? new Date(parsed.ea) : undefined,
      blockedBy: parsed.bb,
      status: parsed.s || 'active',
      blockedCount: parsed.bc || 0,
      lastBlockedAt: parsed.lb ? new Date(parsed.lb) : undefined,
    }
  } catch {
    // Simple format: just status
    return {
      number,
      reason: 'manual',
      action: 'hangup',
      blockedAt: new Date(),
      status: 'active',
      blockedCount: 0,
    }
  }
}

/**
 * Create empty statistics
 */
function createEmptyStats(): BlacklistStats {
  return {
    totalEntries: 0,
    activeEntries: 0,
    disabledEntries: 0,
    expiredEntries: 0,
    totalBlockedCalls: 0,
    blockedToday: 0,
    blockedThisWeek: 0,
    byReason: {
      spam: 0,
      harassment: 0,
      telemarketer: 0,
      robocall: 0,
      unwanted: 0,
      scam: 0,
      manual: 0,
      imported: 0,
    },
    byAction: {
      hangup: 0,
      busy: 0,
      congestion: 0,
      voicemail: 0,
      announcement: 0,
    },
  }
}

/**
 * AMI Blacklist Composable
 *
 * Provides reactive call blocking management for Vue components.
 * Stores blacklist entries in AstDB for persistence.
 *
 * @param client - AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * await ami.connect({ url: 'ws://pbx.example.com:8080' })
 *
 * const {
 *   blocklist,
 *   blockNumber,
 *   unblockNumber,
 *   isBlocked,
 * } = useAmiBlacklist(ami.getClient()!, {
 *   onCallBlocked: (number) => console.log('Blocked call from', number),
 * })
 *
 * // Block a spam caller
 * await blockNumber('18005551234', {
 *   reason: 'spam',
 *   action: 'hangup',
 *   description: 'Persistent telemarketer',
 * })
 *
 * // Check if number is blocked
 * if (isBlocked('18005551234')) {
 *   console.log('This number is blocked')
 * }
 * ```
 */
export function useAmiBlacklist(
  client: AmiClient | null,
  options: UseAmiBlacklistOptions = {}
): UseAmiBlacklistReturn {
  // ============================================================================
  // Configuration
  // ============================================================================

  // Validate extension if provided to prevent path traversal
  const validatedExtension = options.extension && isValidExtension(options.extension)
    ? options.extension
    : undefined

  if (options.extension && !validatedExtension) {
    logger.warn('Invalid extension format provided, ignoring', { extension: options.extension })
  }

  const config = {
    dbFamily: options.dbFamily ?? 'blacklist',
    extension: validatedExtension,
    defaultAction: options.defaultAction ?? 'hangup',
    defaultReason: options.defaultReason ?? 'manual',
    autoCleanExpired: options.autoCleanExpired ?? true,
    enableSpamDetection: options.enableSpamDetection ?? false,
    spamThreshold: options.spamThreshold ?? 80,
    onNumberBlocked: options.onNumberBlocked,
    onNumberUnblocked: options.onNumberUnblocked,
    onCallBlocked: options.onCallBlocked,
    onSpamDetected: options.onSpamDetected,
    onError: options.onError,
  }

  // Build DB family with optional extension prefix
  const getDbFamily = () => {
    return config.extension ? `${config.dbFamily}/${config.extension}` : config.dbFamily
  }

  // ============================================================================
  // State
  // ============================================================================

  const blocklist = ref<BlockEntry[]>([])
  const stats = ref<BlacklistStats>(createEmptyStats())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let eventUnsubscribe: (() => void) | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const activeCount = computed(() => blocklist.value.filter((e) => e.status === 'active').length)

  const isBlocked = (number: string): boolean => {
    const normalized = normalizeNumber(number)
    return blocklist.value.some(
      (entry) =>
        entry.status === 'active' &&
        (!entry.expiresAt || entry.expiresAt > new Date()) &&
        matchesPattern(normalized, entry.number)
    )
  }

  const getBlockEntry = (number: string): BlockEntry | undefined => {
    const normalized = normalizeNumber(number)
    return blocklist.value.find(
      (entry) => entry.number === normalized || matchesPattern(normalized, entry.number)
    )
  }

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Calculate statistics from blocklist
   */
  const calculateStats = (): BlacklistStats => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    const newStats = createEmptyStats()
    newStats.totalEntries = blocklist.value.length

    for (const entry of blocklist.value) {
      // Status counts
      if (entry.status === 'active') {
        if (entry.expiresAt && entry.expiresAt < now) {
          newStats.expiredEntries++
        } else {
          newStats.activeEntries++
        }
      } else if (entry.status === 'disabled') {
        newStats.disabledEntries++
      } else if (entry.status === 'expired') {
        newStats.expiredEntries++
      }

      // Reason breakdown
      newStats.byReason[entry.reason]++

      // Action breakdown
      newStats.byAction[entry.action]++

      // Blocked call counts
      newStats.totalBlockedCalls += entry.blockedCount

      if (entry.lastBlockedAt) {
        if (entry.lastBlockedAt >= todayStart) {
          newStats.blockedToday++
        }
        if (entry.lastBlockedAt >= weekStart) {
          newStats.blockedThisWeek++
        }
      }
    }

    return newStats
  }

  /**
   * Store entry in AstDB
   */
  const storeEntry = async (entry: BlockEntry): Promise<boolean> => {
    if (!client) return false

    try {
      const response = await client.sendAction({
        Action: 'DBPut',
        Family: getDbFamily(),
        Key: entry.number,
        Val: serializeEntry(entry),
      })

      return response?.data?.Response === 'Success'
    } catch (err) {
      logger.error('Failed to store blacklist entry', { error: err, number: entry.number })
      return false
    }
  }

  /**
   * Remove entry from AstDB
   */
  const removeEntry = async (number: string): Promise<boolean> => {
    if (!client) return false

    try {
      const response = await client.sendAction({
        Action: 'DBDel',
        Family: getDbFamily(),
        Key: number,
      })

      return response?.data?.Response === 'Success'
    } catch (err) {
      logger.error('Failed to remove blacklist entry', { error: err, number })
      return false
    }
  }

  // ============================================================================
  // Public Methods - Block Operations
  // ============================================================================

  const blockNumber = async (
    number: string,
    blockOptions?: {
      reason?: BlockReason
      action?: BlockAction
      description?: string
      expiresIn?: number
      blockedBy?: string
    }
  ): Promise<BlockResult> => {
    if (!client) {
      const err = 'AMI client not connected'
      error.value = err
      config.onError?.(err)
      return { success: false, number, message: err }
    }

    // Validate and normalize
    if (!isValidPhoneNumber(number)) {
      const err = 'Invalid phone number format'
      error.value = err
      config.onError?.(err)
      return { success: false, number, message: err }
    }

    const normalized = normalizeNumber(number)
    const sanitizedDesc = blockOptions?.description ? sanitizeInput(blockOptions.description) : undefined

    // Check if already blocked
    const existing = blocklist.value.find((e) => e.number === normalized)
    if (existing && existing.status === 'active') {
      return { success: false, number: normalized, message: 'Number already blocked', entry: existing }
    }

    // Create entry
    const entry: BlockEntry = {
      number: normalized,
      reason: blockOptions?.reason ?? config.defaultReason,
      action: blockOptions?.action ?? config.defaultAction,
      description: sanitizedDesc,
      blockedAt: new Date(),
      expiresAt: blockOptions?.expiresIn
        ? new Date(Date.now() + blockOptions.expiresIn)
        : undefined,
      blockedBy: blockOptions?.blockedBy,
      status: 'active',
      blockedCount: existing?.blockedCount ?? 0,
      lastBlockedAt: existing?.lastBlockedAt,
    }

    isLoading.value = true
    error.value = null

    try {
      const stored = await storeEntry(entry)
      if (!stored) {
        const err = 'Failed to store blacklist entry'
        error.value = err
        config.onError?.(err)
        return { success: false, number: normalized, message: err }
      }

      // Update local state
      if (existing) {
        const idx = blocklist.value.indexOf(existing)
        blocklist.value[idx] = entry
      } else {
        blocklist.value.push(entry)
      }

      stats.value = calculateStats()
      config.onNumberBlocked?.(entry)
      logger.debug('Number blocked', { number: normalized, reason: entry.reason })

      return { success: true, number: normalized, entry }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to block number'
      error.value = errorMsg
      config.onError?.(errorMsg)
      return { success: false, number: normalized, message: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  const unblockNumber = async (number: string): Promise<UnblockResult> => {
    if (!client) {
      const err = 'AMI client not connected'
      error.value = err
      config.onError?.(err)
      return { success: false, number, message: err }
    }

    const normalized = normalizeNumber(number)
    const existing = blocklist.value.find((e) => e.number === normalized)

    if (!existing) {
      return { success: false, number: normalized, message: 'Number not in blacklist' }
    }

    isLoading.value = true
    error.value = null

    try {
      const removed = await removeEntry(normalized)
      if (!removed) {
        const err = 'Failed to remove blacklist entry'
        error.value = err
        config.onError?.(err)
        return { success: false, number: normalized, message: err }
      }

      // Update local state
      blocklist.value = blocklist.value.filter((e) => e.number !== normalized)
      stats.value = calculateStats()
      config.onNumberUnblocked?.(normalized)
      logger.debug('Number unblocked', { number: normalized })

      return { success: true, number: normalized }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unblock number'
      error.value = errorMsg
      config.onError?.(errorMsg)
      return { success: false, number: normalized, message: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  const updateBlock = async (
    number: string,
    updates: Partial<Omit<BlockEntry, 'number'>>
  ): Promise<BlockResult> => {
    const normalized = normalizeNumber(number)
    const existing = blocklist.value.find((e) => e.number === normalized)

    if (!existing) {
      return { success: false, number: normalized, message: 'Number not in blacklist' }
    }

    const updated: BlockEntry = {
      ...existing,
      ...updates,
      description: updates.description ? sanitizeInput(updates.description) : existing.description,
    }

    isLoading.value = true
    error.value = null

    try {
      const stored = await storeEntry(updated)
      if (!stored) {
        const err = 'Failed to update blacklist entry'
        error.value = err
        config.onError?.(err)
        return { success: false, number: normalized, message: err }
      }

      // Update local state
      const idx = blocklist.value.indexOf(existing)
      blocklist.value[idx] = updated
      stats.value = calculateStats()

      return { success: true, number: normalized, entry: updated }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update block'
      error.value = errorMsg
      config.onError?.(errorMsg)
      return { success: false, number: normalized, message: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  const enableBlock = async (number: string): Promise<BlockResult> => {
    return updateBlock(number, { status: 'active' })
  }

  const disableBlock = async (number: string): Promise<BlockResult> => {
    return updateBlock(number, { status: 'disabled' })
  }

  // ============================================================================
  // Public Methods - Bulk Operations
  // ============================================================================

  const blockNumbers = async (
    numbers: string[],
    bulkOptions?: {
      reason?: BlockReason
      action?: BlockAction
      description?: string
    }
  ): Promise<{ success: number; failed: number; errors: Array<{ number: string; error: string }> }> => {
    const results = { success: 0, failed: 0, errors: [] as Array<{ number: string; error: string }> }

    for (const num of numbers) {
      const result = await blockNumber(num, bulkOptions)
      if (result.success) {
        results.success++
      } else {
        results.failed++
        results.errors.push({ number: num, error: result.message || 'Unknown error' })
      }
    }

    return results
  }

  const unblockNumbers = async (
    numbers: string[]
  ): Promise<{ success: number; failed: number }> => {
    const results = { success: 0, failed: 0 }

    for (const num of numbers) {
      const result = await unblockNumber(num)
      if (result.success) {
        results.success++
      } else {
        results.failed++
      }
    }

    return results
  }

  const clearAll = async (): Promise<boolean> => {
    if (!client) {
      const err = 'AMI client not connected'
      error.value = err
      config.onError?.(err)
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      // Delete family tree
      const response = await client.sendAction({
        Action: 'DBDelTree',
        Family: getDbFamily(),
      })

      if (response?.data?.Response === 'Success') {
        blocklist.value = []
        stats.value = createEmptyStats()
        logger.debug('Blacklist cleared')
        return true
      }

      return false
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clear blacklist'
      error.value = errorMsg
      config.onError?.(errorMsg)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // ============================================================================
  // Public Methods - Query Operations
  // ============================================================================

  const refresh = async (): Promise<void> => {
    if (!client) return

    isLoading.value = true
    error.value = null

    try {
      const response = await client.sendAction({
        Action: 'DBGetTree',
        Family: getDbFamily(),
      })

      if (response?.data?.Response === 'Success') {
        // Parse entries from response
        const entries: BlockEntry[] = []
        const data = response.data as Record<string, string>

        for (const [key, value] of Object.entries(data)) {
          // Skip non-entry fields
          if (key === 'Response' || key === 'Message' || key === 'EventList') continue

          // Handle key format: "Key-xxxxxx" or "Val-xxxxxx"
          if (key.startsWith('Key-')) {
            const idx = key.substring(4)
            const val = data[`Val-${idx}`]
            if (val) {
              const entry = deserializeEntry(value, val)
              if (entry) {
                entries.push(entry)
              }
            }
          }
        }

        blocklist.value = entries
        stats.value = calculateStats()

        // Auto-clean expired if enabled
        if (config.autoCleanExpired) {
          await cleanExpired()
        }

        logger.debug('Blacklist refreshed', { count: entries.length })
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refresh blacklist'
      error.value = errorMsg
      config.onError?.(errorMsg)
    } finally {
      isLoading.value = false
    }
  }

  const query = (queryOptions?: BlacklistQueryOptions): BlockEntry[] => {
    let results = [...blocklist.value]

    // Filter by status
    if (queryOptions?.status && queryOptions.status !== 'all') {
      results = results.filter((e) => e.status === queryOptions.status)
    }

    // Filter by reason
    if (queryOptions?.reason) {
      results = results.filter((e) => e.reason === queryOptions.reason)
    }

    // Filter by action
    if (queryOptions?.action) {
      results = results.filter((e) => e.action === queryOptions.action)
    }

    // Search
    if (queryOptions?.search) {
      const searchPattern = queryOptions.search.toLowerCase()
      results = results.filter(
        (e) =>
          e.number.toLowerCase().includes(searchPattern) ||
          e.description?.toLowerCase().includes(searchPattern)
      )
    }

    // Sort
    if (queryOptions?.sortBy) {
      results.sort((a, b) => {
        let aVal: string | number | Date
        let bVal: string | number | Date

        switch (queryOptions.sortBy) {
          case 'number':
            aVal = a.number
            bVal = b.number
            break
          case 'blockedAt':
            aVal = a.blockedAt
            bVal = b.blockedAt
            break
          case 'blockedCount':
            aVal = a.blockedCount
            bVal = b.blockedCount
            break
          case 'lastBlockedAt':
            aVal = a.lastBlockedAt || new Date(0)
            bVal = b.lastBlockedAt || new Date(0)
            break
          default:
            return 0
        }

        if (aVal < bVal) return queryOptions.sortOrder === 'desc' ? 1 : -1
        if (aVal > bVal) return queryOptions.sortOrder === 'desc' ? -1 : 1
        return 0
      })
    }

    // Pagination
    if (queryOptions?.offset !== undefined || queryOptions?.limit !== undefined) {
      const offset = queryOptions.offset || 0
      const limit = queryOptions.limit || results.length
      results = results.slice(offset, offset + limit)
    }

    return results
  }

  const search = (pattern: string): BlockEntry[] => {
    return query({ search: pattern })
  }

  // ============================================================================
  // Public Methods - Import/Export
  // ============================================================================

  const exportList = (format: BlacklistFormat = 'json'): string => {
    const entries = blocklist.value

    switch (format) {
      case 'json':
        return JSON.stringify(entries, null, 2)

      case 'csv': {
        const headers = ['number', 'reason', 'action', 'description', 'blockedAt', 'status', 'blockedCount']
        const rows = entries.map((e) => [
          e.number,
          e.reason,
          e.action,
          e.description || '',
          e.blockedAt.toISOString(),
          e.status,
          e.blockedCount.toString(),
        ])
        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      }

      case 'txt':
        return entries.map((e) => e.number).join('\n')

      default:
        return JSON.stringify(entries)
    }
  }

  const importList = async (data: string, format: BlacklistFormat = 'json'): Promise<ImportResult> => {
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    }

    try {
      let numbers: Array<{ number: string; reason?: BlockReason; action?: BlockAction; description?: string }>

      switch (format) {
        case 'json':
          numbers = JSON.parse(data)
          break

        case 'csv': {
          const lines = data.split('\n').filter((l) => l.trim())
          // Skip header
          numbers = lines.slice(1).map((line) => {
            const parts = line.split(',')
            const num = parts[0]?.trim() || ''
            const reason = parts[1]?.trim() as BlockReason | undefined
            const action = parts[2]?.trim() as BlockAction | undefined
            const description = parts[3]?.trim()
            return {
              number: num,
              reason,
              action,
              description,
            }
          })
          break
        }

        case 'txt':
          numbers = data
            .split('\n')
            .filter((l) => l.trim())
            .map((number) => ({ number: number.trim() }))
          break

        default:
          throw new Error('Unknown format')
      }

      for (const item of numbers) {
        if (!item.number) {
          result.skipped++
          continue
        }

        const blockResult = await blockNumber(item.number, {
          reason: item.reason ?? 'imported',
          action: item.action,
          description: item.description,
        })

        if (blockResult.success) {
          result.imported++
        } else if (blockResult.message?.includes('already blocked')) {
          result.skipped++
        } else {
          result.failed++
          result.errors.push({ number: item.number, error: blockResult.message || 'Unknown error' })
        }
      }

      result.success = result.failed === 0
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import blacklist'
      error.value = errorMsg
      config.onError?.(errorMsg)
      return { ...result, errors: [{ number: '', error: errorMsg }] }
    }
  }

  // ============================================================================
  // Public Methods - Spam Detection
  // ============================================================================

  const checkReputation = async (number: string): Promise<CallerReputation> => {
    // Basic implementation - could be extended with external API integration
    const normalized = normalizeNumber(number)
    const entry = getBlockEntry(normalized)

    const reputation: CallerReputation = {
      number: normalized,
      spamScore: entry ? (entry.reason === 'spam' || entry.reason === 'robocall' ? 90 : 50) : 0,
      isBlocked: isBlocked(normalized),
      category: entry?.reason === 'spam' || entry?.reason === 'robocall' || entry?.reason === 'telemarketer'
        ? entry.reason as 'spam' | 'telemarketer' | 'robocall'
        : entry
        ? 'unknown'
        : 'legitimate',
      reportCount: entry?.blockedCount ?? 0,
    }

    if (reputation.spamScore >= config.spamThreshold) {
      config.onSpamDetected?.(reputation)
    }

    return reputation
  }

  const reportSpam = async (number: string, category?: BlockReason): Promise<boolean> => {
    const result = await blockNumber(number, {
      reason: category ?? 'spam',
      action: 'hangup',
    })
    return result.success
  }

  // ============================================================================
  // Public Methods - Utility
  // ============================================================================

  const cleanExpired = async (): Promise<number> => {
    const now = new Date()
    const expired = blocklist.value.filter(
      (e) => e.status === 'active' && e.expiresAt && e.expiresAt < now
    )

    let cleaned = 0
    for (const entry of expired) {
      const result = await updateBlock(entry.number, { status: 'expired' })
      if (result.success) cleaned++
    }

    if (cleaned > 0) {
      logger.debug('Cleaned expired entries', { count: cleaned })
    }

    return cleaned
  }

  const getStats = (): BlacklistStats => {
    return calculateStats()
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  const setupEventListeners = () => {
    if (!client) return

    // Listen for Newchannel events to detect incoming calls and check blacklist
    const handler = (event: { data: Record<string, unknown> }) => {
      const eventData = event.data
      if (eventData.Event === 'Newchannel' && eventData.CallerIDNum) {
        const callerNum = eventData.CallerIDNum as string
        const entry = getBlockEntry(callerNum)

        if (entry && entry.status === 'active') {
          // Increment blocked count
          entry.blockedCount++
          entry.lastBlockedAt = new Date()
          storeEntry(entry) // Update in DB
          config.onCallBlocked?.(callerNum, entry)
          logger.debug('Blocked call detected', { number: callerNum, action: entry.action })
        }
      }
    }

    client.on('event', handler)
    eventUnsubscribe = () => client.off('event', handler)
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  // Initial load
  if (client) {
    refresh()
    setupEventListeners()
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    if (eventUnsubscribe) {
      eventUnsubscribe()
      eventUnsubscribe = null
    }
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive State
    blocklist,
    stats,
    isLoading,
    error,

    // Computed
    activeCount,
    isBlocked,
    getBlockEntry,

    // Block Operations
    blockNumber,
    unblockNumber,
    updateBlock,
    enableBlock,
    disableBlock,

    // Bulk Operations
    blockNumbers,
    unblockNumbers,
    clearAll,

    // Query Operations
    refresh,
    query,
    search,

    // Import/Export
    exportList,
    importList,

    // Spam Detection
    checkReputation,
    reportSpam,

    // Utility
    cleanExpired,
    getStats,
  }
}
