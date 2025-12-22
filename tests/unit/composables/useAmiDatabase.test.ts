/**
 * useAmiDatabase composable unit tests
 *
 * Tests database-backed contact management functionality:
 * - Contact CRUD operations (save, get, delete)
 * - Search and filtering (by name, number, email, group)
 * - Import/export functionality
 * - Group management
 * - Field validation
 * - Known ID tracking and refresh
 *
 * @see src/composables/useAmiDatabase.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiDatabase } from '@/composables/useAmiDatabase'
import { createMockAmiClient } from '../../utils/test-helpers'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiContact } from '@/types/ami.types'

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  contacts: {
    john: { name: 'John Doe', number: '+1234567890', email: 'john@example.com' },
    jane: { name: 'Jane Smith', number: '+0987654321', email: 'jane@other.com' },
    bob: { name: 'Bob Johnson', number: '+1111111111', email: 'bob@example.com' },
  },
  groups: {
    default: ['Default'],
    custom: ['Sales', 'Support', 'VIP'],
    mixed: ['Sales', 'Support'],
  },
  fields: {
    required: [
      { key: 'name', label: 'Name', type: 'text' as const, required: true },
      { key: 'number', label: 'Phone', type: 'tel' as const, required: true },
    ],
    custom: [
      { key: 'name', label: 'Full Name', type: 'text' as const, required: true },
      { key: 'ext', label: 'Extension', type: 'text' as const },
    ],
  },
  errors: {
    nullClient: 'AMI client not connected',
    requiredField: 'Required field missing: Name',
  },
} as const

/**
 * Factory function: Create mock AMI client with database operations
 */
const createMockClient = (): AmiClient => {
  return createMockAmiClient({
    dbGet: vi.fn().mockResolvedValue(null),
    dbPut: vi.fn().mockResolvedValue(undefined),
    dbDel: vi.fn().mockResolvedValue(undefined),
    dbDelTree: vi.fn().mockResolvedValue(undefined),
  })
}

/**
 * Factory function: Create mock contact with sensible defaults
 */
function createMockContact(id: string, overrides?: Partial<AmiContact>): AmiContact {
  return {
    id,
    name: 'Test Contact',
    number: '+1234567890',
    email: 'test@example.com',
    group: 'Default',
    ...overrides,
  }
}

describe('useAmiDatabase', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Initial State Tests
   * Verify composable starts with correct initial state
   */
  describe('Initial State', () => {
    describe.each([
      {
        description: 'default groups',
        options: undefined,
        expectedGroups: TEST_FIXTURES.groups.default,
        expectedContactCount: 0,
        expectedLoading: false,
        expectedError: null,
      },
      {
        description: 'custom groups',
        options: { groups: TEST_FIXTURES.groups.custom },
        expectedGroups: TEST_FIXTURES.groups.custom,
        expectedContactCount: 0,
        expectedLoading: false,
        expectedError: null,
      },
    ])('with $description', ({ options, expectedGroups, expectedContactCount, expectedLoading, expectedError }) => {
      it(`should have ${expectedGroups.length} group(s), ${expectedContactCount} contacts, loading=${expectedLoading}`, () => {
        const { groups, contacts, contactList, contactCount, loading, error } = useAmiDatabase(mockClient, options)

        expect(contacts.value.size).toBe(expectedContactCount)
        expect(contactList.value).toEqual([])
        expect(contactCount.value).toBe(expectedContactCount)
        expect(loading.value).toBe(expectedLoading)
        expect(error.value).toBe(expectedError)
        expectedGroups.forEach(group => {
          expect(groups.value).toContain(group)
        })
      })
    })

    it('should handle null client gracefully', () => {
      const { contacts, error } = useAmiDatabase(null)

      expect(contacts.value.size).toBe(0)
      expect(error.value).toBeNull()
    })
  })

  /**
   * Save Contact Tests
   * Verify contact creation, updates, group management, and validation
   *
   * Save operations should:
   * - Generate unique IDs for new contacts
   * - Update existing contacts when ID provided
   * - Add new groups automatically
   * - Validate required fields
   * - Persist to database via dbPut
   */
  describe('saveContact', () => {
    it('should save a new contact', async () => {
      const onContactSaved = vi.fn()
      const { saveContact, contacts, contactList } = useAmiDatabase(mockClient, { onContactSaved })

      const contact = await saveContact(TEST_FIXTURES.contacts.john)

      expect(contact.id).toBeDefined()
      expect(contact.name).toBe('John Doe')
      expect(contact.number).toBe('+1234567890')
      expect(mockClient.dbPut).toHaveBeenCalled()
      expect(contacts.value.has(contact.id)).toBe(true)
      expect(contactList.value.length).toBe(1)
      expect(onContactSaved).toHaveBeenCalledWith(contact)
    })

    it('should update existing contact', async () => {
      const { saveContact, contacts } = useAmiDatabase(mockClient)

      // Create contact
      const contact = await saveContact(TEST_FIXTURES.contacts.john)

      // Update contact
      const updatedContact = await saveContact({
        id: contact.id,
        name: 'John Updated',
        number: '+0987654321',
      })

      expect(updatedContact.id).toBe(contact.id)
      expect(updatedContact.name).toBe('John Updated')
      expect(contacts.value.size).toBe(1)
    })

    it('should add new group when contact has new group', async () => {
      const { saveContact, groups } = useAmiDatabase(mockClient)

      await saveContact({
        name: 'John Doe',
        number: '+1234567890',
        group: 'VIP',
      })

      expect(groups.value).toContain('VIP')
    })

    it('should validate required fields', async () => {
      const { saveContact } = useAmiDatabase(mockClient, {
        fields: TEST_FIXTURES.fields.required,
      })

      await expect(saveContact({
        name: '',
        number: '+1234567890',
      })).rejects.toThrow(TEST_FIXTURES.errors.requiredField)
    })

    it('should throw when client is null', async () => {
      const { saveContact } = useAmiDatabase(null)

      await expect(saveContact(TEST_FIXTURES.contacts.john)).rejects.toThrow(TEST_FIXTURES.errors.nullClient)
    })
  })

  /**
   * Get Contact Tests
   * Verify contact retrieval from cache and database
   *
   * getContact should:
   * - Return cached contacts without database call
   * - Fetch from database when not cached
   * - Return null for non-existent contacts
   */
  describe('getContact', () => {
    it('should get contact from cache', async () => {
      const { saveContact, getContact } = useAmiDatabase(mockClient)

      const saved = await saveContact(TEST_FIXTURES.contacts.john)

      const contact = await getContact(saved.id)

      expect(contact?.name).toBe('John Doe')
      // Should not call dbGet since it's cached
      expect(mockClient.dbGet).not.toHaveBeenCalled()
    })

    it('should get contact from database', async () => {
      const contactData = createMockContact('test-123')
      ;(mockClient.dbGet as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(contactData))

      const { getContact } = useAmiDatabase(mockClient)

      const contact = await getContact('test-123')

      expect(contact?.name).toBe('Test Contact')
      expect(mockClient.dbGet).toHaveBeenCalledWith('contacts', 'test-123')
    })

    it('should return null for non-existent contact', async () => {
      ;(mockClient.dbGet as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { getContact } = useAmiDatabase(mockClient)

      const contact = await getContact('unknown')

      expect(contact).toBeNull()
    })

    it('should throw when client is null', async () => {
      const { getContact } = useAmiDatabase(null)

      await expect(getContact('test-123')).rejects.toThrow(TEST_FIXTURES.errors.nullClient)
    })
  })

  /**
   * Delete Contact Tests
   * Verify contact deletion from cache and database
   */
  describe('deleteContact', () => {
    it('should delete contact', async () => {
      const onContactDeleted = vi.fn()
      const { saveContact, deleteContact, contacts } = useAmiDatabase(mockClient, { onContactDeleted })

      const contact = await saveContact(TEST_FIXTURES.contacts.john)

      await deleteContact(contact.id)

      expect(contacts.value.has(contact.id)).toBe(false)
      expect(mockClient.dbDel).toHaveBeenCalledWith('contacts', contact.id)
      expect(onContactDeleted).toHaveBeenCalledWith(contact)
    })

    it('should throw when client is null', async () => {
      const { deleteContact } = useAmiDatabase(null)

      await expect(deleteContact('test-123')).rejects.toThrow(TEST_FIXTURES.errors.nullClient)
    })
  })

  /**
   * Search Functionality Tests
   * Verify search by name, number, email, and empty query handling
   */
  describe('Search', () => {
    describe.each([
      {
        description: 'search by name',
        contacts: [
          TEST_FIXTURES.contacts.john,
          TEST_FIXTURES.contacts.jane,
          TEST_FIXTURES.contacts.bob,
        ],
        query: 'john',
        expectedCount: 2, // John Doe and Bob Johnson
        expectedMatch: (result: AmiContact) => result.name.toLowerCase().includes('john'),
      },
      {
        description: 'search by number',
        contacts: [
          TEST_FIXTURES.contacts.john,
          TEST_FIXTURES.contacts.jane,
        ],
        query: '1234',
        expectedCount: 1,
        expectedMatch: (result: AmiContact) => result.name === 'John Doe',
      },
      {
        description: 'search by email',
        contacts: [
          TEST_FIXTURES.contacts.john,
          TEST_FIXTURES.contacts.jane,
        ],
        query: 'example.com',
        expectedCount: 1,
        expectedMatch: (result: AmiContact) => result.email === 'john@example.com',
      },
    ])('$description', ({ contacts, query, expectedCount, expectedMatch }) => {
      it(`should find ${expectedCount} contact(s) matching "${query}"`, async () => {
        const { saveContact, search } = useAmiDatabase(mockClient)

        for (const contact of contacts) {
          await saveContact(contact)
        }

        const results = search(query)

        expect(results.length).toBe(expectedCount)
        results.forEach(result => {
          expect(expectedMatch(result)).toBe(true)
        })
      })
    })

    it('should return all contacts when query is empty', async () => {
      const { saveContact, search, contactList } = useAmiDatabase(mockClient)

      await saveContact(TEST_FIXTURES.contacts.john)
      await saveContact(TEST_FIXTURES.contacts.jane)

      const results = search('')

      expect(results).toEqual(contactList.value)
    })
  })

  /**
   * Group Filtering Tests
   * Verify contact retrieval by group
   */
  describe('getByGroup', () => {
    it('should get contacts by group', async () => {
      const { saveContact, getByGroup } = useAmiDatabase(mockClient)

      await saveContact({ name: 'John', number: '+1111', group: 'Sales' })
      await saveContact({ name: 'Jane', number: '+2222', group: 'Support' })
      await saveContact({ name: 'Bob', number: '+3333', group: 'Sales' })

      const salesContacts = getByGroup('Sales')

      expect(salesContacts.length).toBe(2)
      expect(salesContacts.every(c => c.group === 'Sales')).toBe(true)
    })
  })

  /**
   * Group Management Tests
   * Verify group creation and duplicate prevention
   */
  describe('Groups Management', () => {
    it('should get groups', () => {
      const { getGroups } = useAmiDatabase(mockClient, {
        groups: TEST_FIXTURES.groups.mixed,
      })

      const groups = getGroups()

      expect(groups).toContain('Sales')
      expect(groups).toContain('Support')
    })

    it('should add group', () => {
      const { addGroup, getGroups, groups } = useAmiDatabase(mockClient)

      addGroup('VIP')

      expect(groups.value).toContain('VIP')
      expect(getGroups()).toContain('VIP')
    })

    it('should not add duplicate group', () => {
      const { addGroup, groups } = useAmiDatabase(mockClient, {
        groups: ['Sales'],
      })

      addGroup('Sales')

      expect(groups.value.filter(g => g === 'Sales').length).toBe(1)
    })
  })

  /**
   * Group Aggregation Tests
   * Verify computed property for grouping contacts
   */
  describe('contactsByGroup computed', () => {
    it('should group contacts correctly', async () => {
      const { saveContact, contactsByGroup } = useAmiDatabase(mockClient, {
        groups: TEST_FIXTURES.groups.mixed,
      })

      await saveContact({ name: 'John', number: '+1111', group: 'Sales' })
      await saveContact({ name: 'Jane', number: '+2222', group: 'Support' })
      await saveContact({ name: 'Bob', number: '+3333', group: 'Sales' })

      await nextTick()

      expect(contactsByGroup.value.get('Sales')?.count).toBe(2)
      expect(contactsByGroup.value.get('Support')?.count).toBe(1)
    })
  })

  /**
   * Raw Database Operations Tests
   * Verify direct database operations and null client handling
   */
  describe('Raw DB Operations', () => {
    describe.each([
      {
        operation: 'dbGet',
        args: ['test-family', 'test-key'],
        setupMock: (client: AmiClient) => {
          (client.dbGet as ReturnType<typeof vi.fn>).mockResolvedValue('test-value')
        },
        expectedResult: 'test-value',
      },
      {
        operation: 'dbPut',
        args: ['test-family', 'test-key', 'test-value'],
        setupMock: () => {},
        expectedResult: undefined,
      },
      {
        operation: 'dbDel',
        args: ['test-family', 'test-key'],
        setupMock: () => {},
        expectedResult: undefined,
      },
      {
        operation: 'dbDelTree',
        args: ['test-family', 'test-key'],
        setupMock: () => {},
        expectedResult: undefined,
      },
    ])('$operation', ({ operation, args, setupMock, expectedResult }) => {
      it(`should perform ${operation} with correct arguments`, async () => {
        setupMock(mockClient)
        const db = useAmiDatabase(mockClient)

        const result = await (db as any)[operation](...args)

        expect(result).toBe(expectedResult)
        expect((mockClient as any)[operation]).toHaveBeenCalledWith(...args)
      })
    })

    it('should throw for all raw operations when client is null', async () => {
      const { dbGet, dbPut, dbDel, dbDelTree } = useAmiDatabase(null)

      await expect(dbGet('f', 'k')).rejects.toThrow(TEST_FIXTURES.errors.nullClient)
      await expect(dbPut('f', 'k', 'v')).rejects.toThrow(TEST_FIXTURES.errors.nullClient)
      await expect(dbDel('f', 'k')).rejects.toThrow(TEST_FIXTURES.errors.nullClient)
      await expect(dbDelTree('f', 'k')).rejects.toThrow(TEST_FIXTURES.errors.nullClient)
    })
  })

  /**
   * Import/Export Tests
   * Verify bulk contact import and export functionality
   *
   * Import should:
   * - Accept array of contact data
   * - Validate each contact against field requirements
   * - Skip invalid contacts gracefully
   * - Return array of successfully imported contacts
   *
   * Export should:
   * - Return all contacts as plain objects
   */
  describe('Import/Export', () => {
    it('should import contacts', async () => {
      const { importContacts, contactList } = useAmiDatabase(mockClient)

      const contactsToImport = [
        { name: 'John Doe', number: '+1111' },
        { name: 'Jane Smith', number: '+2222' },
        { name: 'Bob Johnson', number: '+3333' },
      ]

      const imported = await importContacts(contactsToImport)

      expect(imported.length).toBe(3)
      expect(contactList.value.length).toBe(3)
    })

    it('should handle import errors gracefully', async () => {
      const { importContacts, contactList } = useAmiDatabase(mockClient, {
        fields: TEST_FIXTURES.fields.required,
      })

      const contactsToImport = [
        { name: 'John Doe', number: '+1111' },
        { name: '', number: '+2222' }, // Invalid - missing name
        { name: 'Bob Johnson', number: '+3333' },
      ]

      const imported = await importContacts(contactsToImport)

      expect(imported.length).toBe(2) // Only valid contacts
      expect(contactList.value.length).toBe(2)
    })

    it('should export contacts', async () => {
      const { saveContact, exportContacts } = useAmiDatabase(mockClient)

      await saveContact({ name: 'John Doe', number: '+1111' })
      await saveContact({ name: 'Jane Smith', number: '+2222' })

      const exported = exportContacts()

      expect(exported.length).toBe(2)
    })

    it('should throw import when client is null', async () => {
      const { importContacts } = useAmiDatabase(null)

      await expect(importContacts([{ name: 'Test', number: '+1234' }])).rejects.toThrow(TEST_FIXTURES.errors.nullClient)
    })
  })

  /**
   * Known IDs Management Tests
   * Verify ID tracking for refresh operations
   */
  describe('Known IDs Management', () => {
    it('should register known ID', () => {
      const { registerKnownId, getKnownIds } = useAmiDatabase(mockClient)

      registerKnownId('test-123')
      registerKnownId('test-456')

      const ids = getKnownIds()

      expect(ids).toContain('test-123')
      expect(ids).toContain('test-456')
    })

    it('should not duplicate known IDs', () => {
      const { registerKnownId, getKnownIds } = useAmiDatabase(mockClient)

      registerKnownId('test-123')
      registerKnownId('test-123')

      const ids = getKnownIds()

      expect(ids.filter(id => id === 'test-123').length).toBe(1)
    })
  })

  /**
   * Refresh Tests
   * Verify database synchronization and loading states
   */
  describe('Refresh', () => {
    it('should refresh contacts from known IDs', async () => {
      const contact = createMockContact('test-123')
      ;(mockClient.dbGet as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(contact))

      const { registerKnownId, refresh, contacts, loading } = useAmiDatabase(mockClient)

      registerKnownId('test-123')

      expect(loading.value).toBe(false)

      const refreshPromise = refresh()
      expect(loading.value).toBe(true)

      await refreshPromise

      expect(loading.value).toBe(false)
      expect(contacts.value.has('test-123')).toBe(true)
    })

    it('should set error when client is null', async () => {
      const { refresh, error } = useAmiDatabase(null)

      await refresh()

      expect(error.value).toBe(TEST_FIXTURES.errors.nullClient)
    })

    it('should remove contacts that no longer exist', async () => {
      const { registerKnownId, refresh, getKnownIds } = useAmiDatabase(mockClient)

      registerKnownId('test-123')
      ;(mockClient.dbGet as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      await refresh()

      expect(getKnownIds()).not.toContain('test-123')
    })
  })

  /**
   * Field Definitions Tests
   * Verify custom field configuration
   */
  describe('Field Definitions', () => {
    it('should return default field definitions', () => {
      const { getFieldDefinitions } = useAmiDatabase(mockClient)

      const fields = getFieldDefinitions()

      expect(fields.length).toBeGreaterThan(0)
      expect(fields.find(f => f.key === 'name')).toBeDefined()
    })

    it('should return custom field definitions', () => {
      const { getFieldDefinitions } = useAmiDatabase(mockClient, { fields: TEST_FIXTURES.fields.custom })

      const fields = getFieldDefinitions()

      expect(fields.length).toBe(2)
      expect(fields[0].label).toBe('Full Name')
    })
  })
})
