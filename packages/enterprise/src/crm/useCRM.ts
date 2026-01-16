/**
 * @vuesip/enterprise - useCRM Composable
 *
 * Vue composable for CRM integration providing reactive state management,
 * contact lookup, call logging, and screen pop functionality.
 */

import { ref, computed, shallowRef, type Ref, type ComputedRef } from 'vue'
import type { CRMAdapter, Contact, CallRecord, Activity, CRMError } from './types'

/**
 * Options for the useCRM composable.
 */
export interface UseCRMOptions {
  /** Automatically look up contacts on incoming calls */
  autoLookup?: boolean
  /** Cache contact lookups for faster repeat access */
  cacheContacts?: boolean
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number
  /** Maximum cache size (default: 100 contacts) */
  maxCacheSize?: number
  /** Phone number normalization function */
  normalizePhone?: (phone: string) => string
}

/**
 * Return type for the useCRM composable.
 */
export interface UseCRMReturn {
  // ============================================
  // State
  // ============================================

  /** Current CRM adapter instance */
  adapter: Ref<CRMAdapter | null>
  /** Whether connected to the CRM */
  isConnected: ComputedRef<boolean>
  /** Currently active contact (e.g., for screen pop) */
  currentContact: Ref<Contact | null>
  /** Loading state for async operations */
  isLoading: Ref<boolean>
  /** Last error that occurred */
  error: Ref<CRMError | null>

  // ============================================
  // Contact Cache
  // ============================================

  /** Map of cached contacts by phone number */
  contactCache: Ref<Map<string, CacheEntry>>

  // ============================================
  // Connection Methods
  // ============================================

  /** Set the CRM adapter to use */
  setAdapter: (adapter: CRMAdapter) => void
  /** Connect to the CRM system */
  connect: () => Promise<void>
  /** Disconnect from the CRM system */
  disconnect: () => Promise<void>

  // ============================================
  // Contact Methods
  // ============================================

  /** Look up a contact by phone number */
  lookupContact: (phoneNumber: string) => Promise<Contact | null>
  /** Look up a contact by ID */
  lookupContactById: (contactId: string) => Promise<Contact | null>
  /** Search contacts by query */
  searchContacts: (query: string) => Promise<Contact[]>
  /** Create a new contact */
  createContact: (contact: Omit<Contact, 'id'>) => Promise<Contact>
  /** Update an existing contact */
  updateContact: (contactId: string, updates: Partial<Contact>) => Promise<Contact>
  /** Clear the current contact */
  clearCurrentContact: () => void
  /** Clear the contact cache */
  clearCache: () => void

  // ============================================
  // Call Logging Methods
  // ============================================

  /** Log a call to the CRM */
  logCall: (callData: CallRecord) => Promise<string>
  /** Update an existing call record */
  updateCall: (callId: string, updates: Partial<CallRecord>) => Promise<void>
  /** Get call history for a contact */
  getCallHistory: (contactId: string, limit?: number) => Promise<CallRecord[]>

  // ============================================
  // Activity Methods
  // ============================================

  /** Create a follow-up activity */
  createFollowUp: (activity: Omit<Activity, 'id'>) => Promise<Activity>
  /** Update an activity */
  updateActivity: (activityId: string, updates: Partial<Activity>) => Promise<Activity>
  /** Get activities for a contact */
  getActivities: (contactId: string, limit?: number) => Promise<Activity[]>

  // ============================================
  // Event Handlers
  // ============================================

  /** Register a callback for screen pop events */
  onScreenPop: (callback: (contact: Contact) => void) => () => void
  /** Register a callback for connection state changes */
  onConnectionChange: (callback: (connected: boolean) => void) => () => void
  /** Register a callback for errors */
  onError: (callback: (error: CRMError) => void) => () => void
}

/**
 * Cache entry structure with TTL support.
 */
interface CacheEntry {
  contact: Contact
  timestamp: number
}

/**
 * Default phone number normalization function.
 */
function defaultNormalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  // Remove leading 1 for US numbers if present and length > 10
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  return digits
}

/**
 * Vue composable for CRM integration.
 *
 * @example
 * ```typescript
 * import { useCRM } from '@vuesip/enterprise'
 * import { SalesforceAdapter } from '@vuesip/enterprise'
 *
 * const crm = useCRM({ autoLookup: true, cacheContacts: true })
 *
 * // Set up the adapter
 * const adapter = new SalesforceAdapter({
 *   instanceUrl: 'https://mycompany.salesforce.com',
 *   accessToken: 'token',
 * })
 * crm.setAdapter(adapter)
 *
 * // Connect and look up contacts
 * await crm.connect()
 * const contact = await crm.lookupContact('+1-555-123-4567')
 *
 * // Log a call
 * const callId = await crm.logCall({
 *   contactId: contact.id,
 *   direction: 'inbound',
 *   startTime: new Date(),
 *   duration: 180,
 *   status: 'completed',
 * })
 *
 * // Screen pop on incoming calls
 * crm.onScreenPop((contact) => {
 *   console.log('Incoming call from:', contact.firstName, contact.lastName)
 * })
 * ```
 */
export function useCRM(options: UseCRMOptions = {}): UseCRMReturn {
  const {
    autoLookup = true,
    cacheContacts = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    maxCacheSize = 100,
    normalizePhone = defaultNormalizePhone,
  } = options

  // ============================================
  // State
  // ============================================

  const adapter = shallowRef<CRMAdapter | null>(null)
  const currentContact = ref<Contact | null>(null)
  const isLoading = ref(false)
  const error = ref<CRMError | null>(null)
  const contactCache = ref<Map<string, CacheEntry>>(new Map())

  // Event callback storage
  const screenPopCallbacks = new Set<(contact: Contact) => void>()
  const connectionCallbacks = new Set<(connected: boolean) => void>()
  const errorCallbacks = new Set<(error: CRMError) => void>()

  // ============================================
  // Computed
  // ============================================

  const isConnected = computed(() => adapter.value?.isConnected ?? false)

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Emits an error to all registered callbacks.
   */
  function emitError(err: CRMError): void {
    error.value = err
    errorCallbacks.forEach((cb) => cb(err))
  }

  /**
   * Wraps an async operation with loading state and error handling.
   */
  async function withLoading<T>(operation: () => Promise<T>): Promise<T> {
    isLoading.value = true
    error.value = null
    try {
      return await operation()
    } catch (err) {
      const crmError = err as CRMError
      if (crmError.code) {
        emitError(crmError)
      } else {
        emitError({
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'An unknown error occurred',
          cause: err,
          retryable: false,
        })
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Gets a contact from cache if still valid.
   */
  function getFromCache(phoneNumber: string): Contact | null {
    if (!cacheContacts) return null

    const normalized = normalizePhone(phoneNumber)
    const entry = contactCache.value.get(normalized)

    if (!entry) return null

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > cacheTTL) {
      contactCache.value.delete(normalized)
      return null
    }

    return entry.contact
  }

  /**
   * Adds a contact to the cache.
   */
  function addToCache(phoneNumber: string, contact: Contact): void {
    if (!cacheContacts) return

    const normalized = normalizePhone(phoneNumber)

    // Enforce cache size limit (LRU eviction)
    if (contactCache.value.size >= maxCacheSize) {
      const oldestKey = contactCache.value.keys().next().value
      if (oldestKey !== undefined) {
        contactCache.value.delete(oldestKey)
      }
    }

    contactCache.value.set(normalized, {
      contact,
      timestamp: Date.now(),
    })
  }

  /**
   * Triggers a screen pop event.
   */
  function triggerScreenPop(contact: Contact): void {
    currentContact.value = contact
    screenPopCallbacks.forEach((cb) => cb(contact))
  }

  // ============================================
  // Connection Methods
  // ============================================

  function setAdapter(newAdapter: CRMAdapter): void {
    adapter.value = newAdapter
  }

  async function connect(): Promise<void> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured. Call setAdapter() first.',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    await withLoading(async () => {
      await currentAdapter.connect()
      connectionCallbacks.forEach((cb) => cb(true))
    })
  }

  async function disconnect(): Promise<void> {
    if (!adapter.value) return

    await adapter.value.disconnect()
    connectionCallbacks.forEach((cb) => cb(false))
  }

  // ============================================
  // Contact Methods
  // ============================================

  async function lookupContact(phoneNumber: string): Promise<Contact | null> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    // Check cache first
    const cached = getFromCache(phoneNumber)
    if (cached) {
      if (autoLookup) {
        triggerScreenPop(cached)
      }
      return cached
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      const contact = await currentAdapter.lookupByPhone(phoneNumber)

      if (contact) {
        addToCache(phoneNumber, contact)
        if (autoLookup) {
          triggerScreenPop(contact)
        }
      }

      return contact
    })
  }

  async function lookupContactById(contactId: string): Promise<Contact | null> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      return currentAdapter.lookupById(contactId)
    })
  }

  async function searchContacts(query: string): Promise<Contact[]> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      const result = await currentAdapter.searchContacts(query)
      return result.contacts
    })
  }

  async function createContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      const created = await currentAdapter.createContact(contact)

      // Add to cache if phone number is present
      if (created.phone) {
        addToCache(created.phone, created)
      }

      return created
    })
  }

  async function updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      const updated = await currentAdapter.updateContact(contactId, updates)

      // Update cache if phone number is present
      if (updated.phone) {
        addToCache(updated.phone, updated)
      }

      // Update current contact if it's the same one
      if (currentContact.value?.id === contactId) {
        currentContact.value = updated
      }

      return updated
    })
  }

  function clearCurrentContact(): void {
    currentContact.value = null
  }

  function clearCache(): void {
    contactCache.value.clear()
  }

  // ============================================
  // Call Logging Methods
  // ============================================

  async function logCall(callData: CallRecord): Promise<string> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      return currentAdapter.logCall(callData)
    })
  }

  async function updateCall(callId: string, updates: Partial<CallRecord>): Promise<void> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    await withLoading(async () => {
      await currentAdapter.updateCall(callId, updates)
    })
  }

  async function getCallHistory(contactId: string, limit?: number): Promise<CallRecord[]> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      return currentAdapter.getCallHistory(contactId, limit)
    })
  }

  // ============================================
  // Activity Methods
  // ============================================

  async function createFollowUp(activity: Omit<Activity, 'id'>): Promise<Activity> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      return currentAdapter.createActivity(activity)
    })
  }

  async function updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      return currentAdapter.updateActivity(activityId, updates)
    })
  }

  async function getActivities(contactId: string, limit?: number): Promise<Activity[]> {
    if (!adapter.value) {
      throw {
        code: 'NO_ADAPTER',
        message: 'No CRM adapter configured',
        retryable: false,
      } as CRMError
    }

    const currentAdapter = adapter.value
    return withLoading(async () => {
      return currentAdapter.getActivities(contactId, limit)
    })
  }

  // ============================================
  // Event Handlers
  // ============================================

  function onScreenPop(callback: (contact: Contact) => void): () => void {
    screenPopCallbacks.add(callback)
    return () => screenPopCallbacks.delete(callback)
  }

  function onConnectionChange(callback: (connected: boolean) => void): () => void {
    connectionCallbacks.add(callback)
    return () => connectionCallbacks.delete(callback)
  }

  function onError(callback: (error: CRMError) => void): () => void {
    errorCallbacks.add(callback)
    return () => errorCallbacks.delete(callback)
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    adapter,
    isConnected,
    currentContact,
    isLoading,
    error,

    // Cache
    contactCache,

    // Connection
    setAdapter,
    connect,
    disconnect,

    // Contacts
    lookupContact,
    lookupContactById,
    searchContacts,
    createContact,
    updateContact,
    clearCurrentContact,
    clearCache,

    // Call Logging
    logCall,
    updateCall,
    getCallHistory,

    // Activities
    createFollowUp,
    updateActivity,
    getActivities,

    // Events
    onScreenPop,
    onConnectionChange,
    onError,
  }
}
