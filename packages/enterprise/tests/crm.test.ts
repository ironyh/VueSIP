/**
 * @vuesip/enterprise - CRM Module Tests
 *
 * Tests for CRM adapters, useCRM composable, and related functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useCRM } from '../src/crm/useCRM'
import { SalesforceAdapter } from '../src/crm/adapters/SalesforceAdapter'
import { HubSpotAdapter } from '../src/crm/adapters/HubSpotAdapter'
import { WebhookAdapter, createWebhookAdapter } from '../src/crm/adapters/WebhookAdapter'
import type {
  CRMAdapter,
  Contact,
  CallRecord,
  Activity,
  ContactSearchResult,
} from '../src/crm/types'

// ============================================
// Mock Adapter for Testing
// ============================================

function createMockAdapter(overrides: Partial<CRMAdapter> = {}): CRMAdapter {
  let connected = false

  return {
    name: 'Mock',
    get isConnected() {
      return connected
    },

    async connect() {
      connected = true
    },
    async disconnect() {
      connected = false
    },

    async lookupByPhone(phoneNumber: string) {
      // Normalize the phone for matching (strip non-digits)
      const normalized = phoneNumber.replace(/\D/g, '')
      if (normalized.includes('5551234567') || phoneNumber.includes('555-123-4567')) {
        return {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: phoneNumber,
          company: 'Acme Corp',
        }
      }
      return null
    },

    async lookupById(contactId: string) {
      if (contactId === 'contact-1') {
        return {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-123-4567',
          company: 'Acme Corp',
        }
      }
      return null
    },

    async searchContacts(query: string): Promise<ContactSearchResult> {
      if (query.toLowerCase().includes('john')) {
        return {
          contacts: [
            {
              id: 'contact-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              phone: '+1-555-123-4567',
            },
          ],
          total: 1,
          hasMore: false,
        }
      }
      return { contacts: [], total: 0, hasMore: false }
    },

    async createContact(contact: Omit<Contact, 'id'>) {
      return { ...contact, id: 'new-contact-123' }
    },

    async updateContact(contactId: string, updates: Partial<Contact>) {
      return {
        id: contactId,
        firstName: updates.firstName ?? 'John',
        lastName: updates.lastName ?? 'Doe',
        email: updates.email ?? 'john.doe@example.com',
        phone: updates.phone ?? '+1-555-123-4567',
        ...updates,
      }
    },

    async logCall(_callData: CallRecord) {
      return 'call-record-123'
    },

    async updateCall(_callId: string, _updates: Partial<CallRecord>) {
      // No-op for mock
    },

    async getCallHistory(_contactId: string, _limit?: number) {
      return [
        {
          id: 'call-1',
          contactId: _contactId,
          direction: 'inbound' as const,
          startTime: new Date('2024-01-15T10:00:00Z'),
          duration: 180,
          status: 'completed' as const,
        },
      ]
    },

    async createActivity(activity: Omit<Activity, 'id'>) {
      return { ...activity, id: 'activity-123' }
    },

    async updateActivity(activityId: string, updates: Partial<Activity>) {
      return {
        id: activityId,
        contactId: updates.contactId ?? 'contact-1',
        type: updates.type ?? 'task',
        subject: updates.subject ?? 'Follow up',
        status: updates.status ?? 'pending',
        ...updates,
      } as Activity
    },

    async getActivities(_contactId: string, _limit?: number) {
      return [
        {
          id: 'activity-1',
          contactId: _contactId,
          type: 'task' as const,
          subject: 'Follow up call',
          status: 'pending' as const,
        },
      ]
    },

    ...overrides,
  }
}

// ============================================
// useCRM Composable Tests
// ============================================

describe('useCRM composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const crm = useCRM()

      expect(crm.adapter.value).toBeNull()
      expect(crm.isConnected.value).toBe(false)
      expect(crm.currentContact.value).toBeNull()
      expect(crm.isLoading.value).toBe(false)
      expect(crm.error.value).toBeNull()
    })

    it('should accept options', () => {
      const crm = useCRM({
        autoLookup: false,
        cacheContacts: true,
        cacheTTL: 60000,
      })

      expect(crm.contactCache.value.size).toBe(0)
    })
  })

  describe('adapter management', () => {
    it('should set adapter', () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)

      expect(crm.adapter.value).toBe(adapter)
    })

    it('should connect to adapter', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      expect(crm.isConnected.value).toBe(true)
    })

    it('should throw when connecting without adapter', async () => {
      const crm = useCRM()

      await expect(crm.connect()).rejects.toMatchObject({
        code: 'NO_ADAPTER',
      })
    })

    it('should disconnect from adapter', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()
      await crm.disconnect()

      expect(crm.isConnected.value).toBe(false)
    })

    it('should emit connection change events', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()
      const callback = vi.fn()

      crm.onConnectionChange(callback)
      crm.setAdapter(adapter)

      await crm.connect()
      expect(callback).toHaveBeenCalledWith(true)

      await crm.disconnect()
      expect(callback).toHaveBeenCalledWith(false)
    })
  })

  describe('contact operations', () => {
    it('should lookup contact by phone', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const contact = await crm.lookupContact('+1-555-123-4567')

      expect(contact).not.toBeNull()
      expect(contact?.firstName).toBe('John')
      expect(contact?.lastName).toBe('Doe')
    })

    it('should return null for unknown phone', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const contact = await crm.lookupContact('+1-999-999-9999')

      expect(contact).toBeNull()
    })

    it('should trigger screen pop on auto lookup', async () => {
      const crm = useCRM({ autoLookup: true })
      const adapter = createMockAdapter()
      const screenPopCallback = vi.fn()

      crm.setAdapter(adapter)
      crm.onScreenPop(screenPopCallback)
      await crm.connect()

      await crm.lookupContact('+1-555-123-4567')

      expect(screenPopCallback).toHaveBeenCalled()
      expect(crm.currentContact.value).not.toBeNull()
    })

    it('should cache contacts when enabled', async () => {
      const crm = useCRM({ cacheContacts: true })
      const adapter = createMockAdapter()
      const lookupSpy = vi.spyOn(adapter, 'lookupByPhone')

      crm.setAdapter(adapter)
      await crm.connect()

      // First lookup - should call adapter
      await crm.lookupContact('+1-555-123-4567')
      expect(lookupSpy).toHaveBeenCalledTimes(1)

      // Second lookup - should use cache
      await crm.lookupContact('+1-555-123-4567')
      expect(lookupSpy).toHaveBeenCalledTimes(1)
    })

    it('should search contacts', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const contacts = await crm.searchContacts('john')

      expect(contacts.length).toBe(1)
      expect(contacts[0]?.firstName).toBe('John')
    })

    it('should create contact', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const contact = await crm.createContact({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+1-555-987-6543',
      })

      expect(contact.id).toBe('new-contact-123')
      expect(contact.firstName).toBe('Jane')
    })

    it('should update contact', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const updated = await crm.updateContact('contact-1', {
        firstName: 'Johnny',
      })

      expect(updated.firstName).toBe('Johnny')
    })

    it('should clear current contact', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      await crm.lookupContact('+1-555-123-4567')
      expect(crm.currentContact.value).not.toBeNull()

      crm.clearCurrentContact()
      expect(crm.currentContact.value).toBeNull()
    })

    it('should clear cache', async () => {
      const crm = useCRM({ cacheContacts: true })
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      await crm.lookupContact('+1-555-123-4567')
      expect(crm.contactCache.value.size).toBe(1)

      crm.clearCache()
      expect(crm.contactCache.value.size).toBe(0)
    })
  })

  describe('call logging', () => {
    it('should log a call', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const callId = await crm.logCall({
        contactId: 'contact-1',
        direction: 'outbound',
        startTime: new Date(),
        duration: 120,
        status: 'completed',
      })

      expect(callId).toBe('call-record-123')
    })

    it('should get call history', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const history = await crm.getCallHistory('contact-1')

      expect(history.length).toBe(1)
      expect(history[0]?.direction).toBe('inbound')
    })
  })

  describe('activity management', () => {
    it('should create follow-up activity', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const activity = await crm.createFollowUp({
        contactId: 'contact-1',
        type: 'task',
        subject: 'Schedule demo',
        status: 'pending',
        dueDate: new Date('2024-02-01'),
      })

      expect(activity.id).toBe('activity-123')
    })

    it('should get activities', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()

      crm.setAdapter(adapter)
      await crm.connect()

      const activities = await crm.getActivities('contact-1')

      expect(activities.length).toBe(1)
      expect(activities[0]?.type).toBe('task')
    })
  })

  describe('error handling', () => {
    it('should emit errors', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter({
        async lookupByPhone() {
          throw { code: 'API_ERROR', message: 'API Error', retryable: true }
        },
      })
      const errorCallback = vi.fn()

      crm.setAdapter(adapter)
      crm.onError(errorCallback)
      await crm.connect()

      await expect(crm.lookupContact('+1-555-123-4567')).rejects.toMatchObject({
        code: 'API_ERROR',
      })

      expect(errorCallback).toHaveBeenCalled()
      expect(crm.error.value?.code).toBe('API_ERROR')
    })

    it('should set loading state during operations', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter({
        async lookupByPhone() {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return null
        },
      })

      crm.setAdapter(adapter)
      await crm.connect()

      expect(crm.isLoading.value).toBe(false)

      const lookupPromise = crm.lookupContact('+1-555-123-4567')
      await nextTick()

      expect(crm.isLoading.value).toBe(true)

      await lookupPromise

      expect(crm.isLoading.value).toBe(false)
    })
  })

  describe('event unsubscription', () => {
    it('should unsubscribe from screen pop events', async () => {
      const crm = useCRM()
      const adapter = createMockAdapter()
      const callback = vi.fn()

      crm.setAdapter(adapter)
      await crm.connect()

      const unsubscribe = crm.onScreenPop(callback)
      await crm.lookupContact('+1-555-123-4567')
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      await crm.lookupContact('+1-555-123-4567')
      expect(callback).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })
})

// ============================================
// Salesforce Adapter Tests
// ============================================

describe('SalesforceAdapter', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  it('should initialize with config', () => {
    const adapter = new SalesforceAdapter({
      instanceUrl: 'https://test.salesforce.com',
      accessToken: 'test-token',
    })

    expect(adapter.name).toBe('Salesforce')
    expect(adapter.isConnected).toBe(false)
  })

  it('should require instanceUrl for connection', async () => {
    const adapter = new SalesforceAdapter({
      accessToken: 'test-token',
    })

    await expect(adapter.connect()).rejects.toMatchObject({
      code: 'INVALID_CONFIG',
    })
  })

  it('should require accessToken or refreshToken for connection', async () => {
    const adapter = new SalesforceAdapter({
      instanceUrl: 'https://test.salesforce.com',
    })

    await expect(adapter.connect()).rejects.toMatchObject({
      code: 'INVALID_CONFIG',
    })
  })

  it('should connect successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    const adapter = new SalesforceAdapter({
      instanceUrl: 'https://test.salesforce.com',
      accessToken: 'test-token',
    })

    await adapter.connect()

    expect(adapter.isConnected).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sobjects'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('should handle connection failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ errorCode: 'INVALID_SESSION_ID', message: 'Invalid token' }),
    })

    const adapter = new SalesforceAdapter({
      instanceUrl: 'https://test.salesforce.com',
      accessToken: 'invalid-token',
    })

    await expect(adapter.connect()).rejects.toMatchObject({
      code: 'CONNECTION_FAILED',
    })

    expect(adapter.isConnected).toBe(false)
  })

  it('should disconnect', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    const adapter = new SalesforceAdapter({
      instanceUrl: 'https://test.salesforce.com',
      accessToken: 'test-token',
    })

    await adapter.connect()
    expect(adapter.isConnected).toBe(true)

    await adapter.disconnect()
    expect(adapter.isConnected).toBe(false)
  })
})

// ============================================
// HubSpot Adapter Tests
// ============================================

describe('HubSpotAdapter', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  it('should initialize with config', () => {
    const adapter = new HubSpotAdapter({
      apiKey: 'test-api-key',
    })

    expect(adapter.name).toBe('HubSpot')
    expect(adapter.isConnected).toBe(false)
  })

  it('should require apiKey for connection', async () => {
    const adapter = new HubSpotAdapter({})

    await expect(adapter.connect()).rejects.toMatchObject({
      code: 'INVALID_CONFIG',
    })
  })

  it('should connect successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    })

    const adapter = new HubSpotAdapter({
      apiKey: 'test-api-key',
    })

    await adapter.connect()

    expect(adapter.isConnected).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/crm/v3/objects/contacts'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    )
  })
})

// ============================================
// Webhook Adapter Tests
// ============================================

describe('WebhookAdapter', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  it('should initialize with config', () => {
    const adapter = new WebhookAdapter({
      baseUrl: 'https://api.example.com',
      endpoints: {},
    })

    expect(adapter.name).toBe('Webhook')
    expect(adapter.isConnected).toBe(false)
  })

  it('should require baseUrl for connection', async () => {
    const adapter = new WebhookAdapter({
      baseUrl: '',
      endpoints: {},
    })

    await expect(adapter.connect()).rejects.toMatchObject({
      code: 'INVALID_CONFIG',
    })
  })

  it('should connect without test endpoint', async () => {
    const adapter = new WebhookAdapter({
      baseUrl: 'https://api.example.com',
      endpoints: {},
    })

    await adapter.connect()

    expect(adapter.isConnected).toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should test connection when endpoint configured', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    })

    const adapter = new WebhookAdapter({
      baseUrl: 'https://api.example.com',
      apiKey: 'test-key',
      authType: 'bearer',
      endpoints: {
        testConnection: {
          method: 'GET',
          url: '/health',
        },
      },
    })

    await adapter.connect()

    expect(adapter.isConnected).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    )
  })

  it('should throw when endpoint not configured', async () => {
    const adapter = new WebhookAdapter({
      baseUrl: 'https://api.example.com',
      endpoints: {},
    })

    await adapter.connect()

    await expect(adapter.lookupByPhone('+1-555-123-4567')).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    })
  })

  it('should interpolate URL parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: '123', firstName: 'John' }),
    })

    const adapter = new WebhookAdapter({
      baseUrl: 'https://api.example.com',
      endpoints: {
        lookupByPhone: {
          method: 'GET',
          url: '/contacts/search?phone={phone}',
        },
      },
    })

    await adapter.connect()
    await adapter.lookupByPhone('+1-555-123-4567')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('phone=%2B1-555-123-4567'),
      expect.any(Object)
    )
  })

  it('should support different auth types', async () => {
    // API Key auth
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    })

    const apiKeyAdapter = new WebhookAdapter({
      baseUrl: 'https://api.example.com',
      apiKey: 'my-api-key',
      authType: 'api-key',
      apiKeyHeader: 'X-Custom-Key',
      endpoints: {
        testConnection: { method: 'GET', url: '/health' },
      },
    })

    await apiKeyAdapter.connect()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom-Key': 'my-api-key',
        }),
      })
    )
  })
})

describe('createWebhookAdapter factory', () => {
  it('should create adapter with default endpoints', () => {
    const adapter = createWebhookAdapter({
      baseUrl: 'https://api.example.com',
    })

    expect(adapter.name).toBe('Webhook')
  })

  it('should allow overriding default endpoints', () => {
    const adapter = createWebhookAdapter({
      baseUrl: 'https://api.example.com',
      endpoints: {
        lookupByPhone: {
          method: 'POST',
          url: '/custom/lookup',
        },
      },
    })

    expect(adapter.name).toBe('Webhook')
  })
})

// ============================================
// Type Tests (compile-time checks)
// ============================================

describe('Type compatibility', () => {
  it('should export all required types', async () => {
    // These are compile-time checks - if the imports work, types are correct
    const { useCRM } = await import('../src/crm/useCRM')
    const { SalesforceAdapter } = await import('../src/crm/adapters/SalesforceAdapter')
    const { HubSpotAdapter } = await import('../src/crm/adapters/HubSpotAdapter')
    const { WebhookAdapter } = await import('../src/crm/adapters/WebhookAdapter')

    expect(useCRM).toBeDefined()
    expect(SalesforceAdapter).toBeDefined()
    expect(HubSpotAdapter).toBeDefined()
    expect(WebhookAdapter).toBeDefined()
  })

  it('should have consistent adapter interfaces', () => {
    const salesforce = new SalesforceAdapter({
      instanceUrl: 'https://test.salesforce.com',
      accessToken: 'token',
    })

    const hubspot = new HubSpotAdapter({
      apiKey: 'key',
    })

    const webhook = new WebhookAdapter({
      baseUrl: 'https://api.example.com',
      endpoints: {},
    })

    // All adapters should implement CRMAdapter
    const adapters: CRMAdapter[] = [salesforce, hubspot, webhook]

    adapters.forEach((adapter) => {
      expect(adapter.name).toBeDefined()
      expect(typeof adapter.isConnected).toBe('boolean')
      expect(typeof adapter.connect).toBe('function')
      expect(typeof adapter.disconnect).toBe('function')
      expect(typeof adapter.lookupByPhone).toBe('function')
      expect(typeof adapter.lookupById).toBe('function')
      expect(typeof adapter.searchContacts).toBe('function')
      expect(typeof adapter.createContact).toBe('function')
      expect(typeof adapter.updateContact).toBe('function')
      expect(typeof adapter.logCall).toBe('function')
      expect(typeof adapter.updateCall).toBe('function')
      expect(typeof adapter.getCallHistory).toBe('function')
      expect(typeof adapter.createActivity).toBe('function')
      expect(typeof adapter.updateActivity).toBe('function')
      expect(typeof adapter.getActivities).toBe('function')
    })
  })
})
