/**
 * useAmiDatabase composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiDatabase } from '@/composables/useAmiDatabase'
import type { AmiClient } from '@/core/AmiClient'
import type { AmiContact } from '@/types/ami.types'

// Create mock AMI client
const createMockClient = (): AmiClient => {
  return {
    dbGet: vi.fn().mockResolvedValue(null),
    dbPut: vi.fn().mockResolvedValue(undefined),
    dbDel: vi.fn().mockResolvedValue(undefined),
    dbDelTree: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as AmiClient
}

// Helper to create mock contact
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

  describe('initial state', () => {
    it('should have empty contacts initially', () => {
      const { contacts, contactList, contactCount } = useAmiDatabase(mockClient)

      expect(contacts.value.size).toBe(0)
      expect(contactList.value).toEqual([])
      expect(contactCount.value).toBe(0)
    })

    it('should have default groups', () => {
      const { groups } = useAmiDatabase(mockClient)

      expect(groups.value).toContain('Default')
    })

    it('should have custom groups when provided', () => {
      const { groups } = useAmiDatabase(mockClient, {
        groups: ['Sales', 'Support', 'VIP'],
      })

      expect(groups.value).toContain('Sales')
      expect(groups.value).toContain('Support')
      expect(groups.value).toContain('VIP')
    })

    it('should have loading as false initially', () => {
      const { loading } = useAmiDatabase(mockClient)

      expect(loading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiDatabase(mockClient)

      expect(error.value).toBeNull()
    })

    it('should handle null client gracefully', () => {
      const { contacts, error } = useAmiDatabase(null)

      expect(contacts.value.size).toBe(0)
      expect(error.value).toBeNull()
    })
  })

  describe('saveContact', () => {
    it('should save a new contact', async () => {
      const onContactSaved = vi.fn()
      const { saveContact, contacts, contactList } = useAmiDatabase(mockClient, { onContactSaved })

      const contact = await saveContact({
        name: 'John Doe',
        number: '+1234567890',
      })

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
      const contact = await saveContact({
        name: 'John Doe',
        number: '+1234567890',
      })

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
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'number', label: 'Phone', type: 'tel', required: true },
        ],
      })

      await expect(saveContact({
        name: '',
        number: '+1234567890',
      })).rejects.toThrow('Required field missing: Name')
    })

    it('should throw when client is null', async () => {
      const { saveContact } = useAmiDatabase(null)

      await expect(saveContact({
        name: 'John Doe',
        number: '+1234567890',
      })).rejects.toThrow('AMI client not connected')
    })
  })

  describe('getContact', () => {
    it('should get contact from cache', async () => {
      const { saveContact, getContact } = useAmiDatabase(mockClient)

      const saved = await saveContact({
        name: 'John Doe',
        number: '+1234567890',
      })

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

      await expect(getContact('test-123')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('deleteContact', () => {
    it('should delete contact', async () => {
      const onContactDeleted = vi.fn()
      const { saveContact, deleteContact, contacts } = useAmiDatabase(mockClient, { onContactDeleted })

      const contact = await saveContact({
        name: 'John Doe',
        number: '+1234567890',
      })

      await deleteContact(contact.id)

      expect(contacts.value.has(contact.id)).toBe(false)
      expect(mockClient.dbDel).toHaveBeenCalledWith('contacts', contact.id)
      expect(onContactDeleted).toHaveBeenCalledWith(contact)
    })

    it('should throw when client is null', async () => {
      const { deleteContact } = useAmiDatabase(null)

      await expect(deleteContact('test-123')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('search', () => {
    it('should search by name', async () => {
      const { saveContact, search } = useAmiDatabase(mockClient)

      await saveContact({ name: 'John Doe', number: '+1111' })
      await saveContact({ name: 'Jane Smith', number: '+2222' })
      await saveContact({ name: 'Bob Johnson', number: '+3333' })

      const results = search('john')

      expect(results.length).toBe(2) // John Doe and Bob Johnson
    })

    it('should search by number', async () => {
      const { saveContact, search } = useAmiDatabase(mockClient)

      await saveContact({ name: 'John Doe', number: '+1234567890' })
      await saveContact({ name: 'Jane Smith', number: '+0987654321' })

      const results = search('1234')

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('John Doe')
    })

    it('should search by email', async () => {
      const { saveContact, search } = useAmiDatabase(mockClient)

      await saveContact({ name: 'John Doe', number: '+1111', email: 'john@example.com' })
      await saveContact({ name: 'Jane Smith', number: '+2222', email: 'jane@other.com' })

      const results = search('example.com')

      expect(results.length).toBe(1)
      expect(results[0].email).toBe('john@example.com')
    })

    it('should return all contacts when query is empty', async () => {
      const { saveContact, search, contactList } = useAmiDatabase(mockClient)

      await saveContact({ name: 'John Doe', number: '+1111' })
      await saveContact({ name: 'Jane Smith', number: '+2222' })

      const results = search('')

      expect(results).toEqual(contactList.value)
    })
  })

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

  describe('groups management', () => {
    it('should get groups', () => {
      const { getGroups } = useAmiDatabase(mockClient, {
        groups: ['Sales', 'Support'],
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

  describe('contactsByGroup computed', () => {
    it('should group contacts correctly', async () => {
      const { saveContact, contactsByGroup } = useAmiDatabase(mockClient, {
        groups: ['Sales', 'Support'],
      })

      await saveContact({ name: 'John', number: '+1111', group: 'Sales' })
      await saveContact({ name: 'Jane', number: '+2222', group: 'Support' })
      await saveContact({ name: 'Bob', number: '+3333', group: 'Sales' })

      await nextTick()

      expect(contactsByGroup.value.get('Sales')?.count).toBe(2)
      expect(contactsByGroup.value.get('Support')?.count).toBe(1)
    })
  })

  describe('raw DB operations', () => {
    it('should perform dbGet', async () => {
      ;(mockClient.dbGet as ReturnType<typeof vi.fn>).mockResolvedValue('test-value')

      const { dbGet } = useAmiDatabase(mockClient)

      const result = await dbGet('test-family', 'test-key')

      expect(result).toBe('test-value')
      expect(mockClient.dbGet).toHaveBeenCalledWith('test-family', 'test-key')
    })

    it('should perform dbPut', async () => {
      const { dbPut } = useAmiDatabase(mockClient)

      await dbPut('test-family', 'test-key', 'test-value')

      expect(mockClient.dbPut).toHaveBeenCalledWith('test-family', 'test-key', 'test-value')
    })

    it('should perform dbDel', async () => {
      const { dbDel } = useAmiDatabase(mockClient)

      await dbDel('test-family', 'test-key')

      expect(mockClient.dbDel).toHaveBeenCalledWith('test-family', 'test-key')
    })

    it('should perform dbDelTree', async () => {
      const { dbDelTree } = useAmiDatabase(mockClient)

      await dbDelTree('test-family', 'test-key')

      expect(mockClient.dbDelTree).toHaveBeenCalledWith('test-family', 'test-key')
    })

    it('should throw for raw operations when client is null', async () => {
      const { dbGet, dbPut, dbDel, dbDelTree } = useAmiDatabase(null)

      await expect(dbGet('f', 'k')).rejects.toThrow('AMI client not connected')
      await expect(dbPut('f', 'k', 'v')).rejects.toThrow('AMI client not connected')
      await expect(dbDel('f', 'k')).rejects.toThrow('AMI client not connected')
      await expect(dbDelTree('f', 'k')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('import/export', () => {
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
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'number', label: 'Phone', type: 'tel', required: true },
        ],
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

      await expect(importContacts([{ name: 'Test', number: '+1234' }])).rejects.toThrow('AMI client not connected')
    })
  })

  describe('known IDs management', () => {
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

  describe('refresh', () => {
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

      expect(error.value).toBe('AMI client not connected')
    })

    it('should remove contacts that no longer exist', async () => {
      const { registerKnownId, refresh, getKnownIds } = useAmiDatabase(mockClient)

      registerKnownId('test-123')
      ;(mockClient.dbGet as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      await refresh()

      expect(getKnownIds()).not.toContain('test-123')
    })
  })

  describe('getFieldDefinitions', () => {
    it('should return default field definitions', () => {
      const { getFieldDefinitions } = useAmiDatabase(mockClient)

      const fields = getFieldDefinitions()

      expect(fields.length).toBeGreaterThan(0)
      expect(fields.find(f => f.key === 'name')).toBeDefined()
    })

    it('should return custom field definitions', () => {
      const customFields = [
        { key: 'name', label: 'Full Name', type: 'text' as const, required: true },
        { key: 'ext', label: 'Extension', type: 'text' as const },
      ]

      const { getFieldDefinitions } = useAmiDatabase(mockClient, { fields: customFields })

      const fields = getFieldDefinitions()

      expect(fields.length).toBe(2)
      expect(fields[0].label).toBe('Full Name')
    })
  })
})
