import { ref, computed, watch } from 'vue'

export interface Contact {
  id: string
  name: string
  number: string
  avatar?: string
  color?: string
  isFavorite?: boolean
  notes?: string
  callCount: number
  lastCalled?: Date
  createdAt: Date
}

export interface UseContactsReturn {
  contacts: ReturnType<typeof ref<Contact[]>>
  favorites: ReturnType<typeof ref<Contact[]>>
  recentContacts: ReturnType<typeof ref<Contact[]>>
  addContact: (contact: Omit<Contact, 'id' | 'callCount' | 'createdAt'>) => Contact
  updateContact: (id: string, updates: Partial<Omit<Contact, 'id'>>) => boolean
  deleteContact: (id: string) => boolean
  getContactByNumber: (number: string) => Contact | undefined
  incrementCallCount: (number: string) => void
  toggleFavorite: (id: string) => boolean
  searchContacts: (query: string) => Contact[]
  importContacts: (contacts: Omit<Contact, 'id' | 'callCount' | 'createdAt'>[]) => number
  exportContacts: () => string
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

function generateId(): string {
  return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function normalizePhoneNumber(number: string): string {
  return number.replace(/[^\d+]/g, '')
}

export function useContacts(): UseContactsReturn {
  // Load contacts from localStorage
  const loadContacts = (): Contact[] => {
    try {
      const stored = localStorage.getItem('vuesip_contacts')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.map((c: Contact) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          lastCalled: c.lastCalled ? new Date(c.lastCalled) : undefined,
        }))
      }
    } catch (e) {
      console.error('Failed to load contacts:', e)
    }
    return []
  }

  const contacts = ref<Contact[]>(loadContacts())

  // Persist contacts to localStorage
  watch(
    contacts,
    (newContacts) => {
      try {
        localStorage.setItem('vuesip_contacts', JSON.stringify(newContacts))
      } catch (e) {
        console.error('Failed to save contacts:', e)
      }
    },
    { deep: true }
  )

  // Computed favorites (sorted by call count, then name)
  const favorites = computed(() =>
    contacts.value
      .filter((c) => c.isFavorite)
      .sort((a, b) => {
        if (a.callCount !== b.callCount) return b.callCount - a.callCount
        return a.name.localeCompare(b.name)
      })
  )

  // Computed recent contacts (by lastCalled, max 10)
  const recentContacts = computed(() =>
    contacts.value
      .filter((c) => c.lastCalled)
      .sort((a, b) => (b.lastCalled?.getTime() || 0) - (a.lastCalled?.getTime() || 0))
      .slice(0, 10)
  )

  const addContact = (contact: Omit<Contact, 'id' | 'callCount' | 'createdAt'>): Contact => {
    // Check if contact with same number already exists
    const normalizedNumber = normalizePhoneNumber(contact.number)
    const existing = contacts.value.find((c) => normalizePhoneNumber(c.number) === normalizedNumber)

    if (existing) {
      // Update existing contact
      updateContact(existing.id, contact)
      return existing
    }

    const newContact: Contact = {
      ...contact,
      id: generateId(),
      callCount: 0,
      color: contact.color || getRandomColor(),
      createdAt: new Date(),
    }

    contacts.value.push(newContact)
    return newContact
  }

  const updateContact = (id: string, updates: Partial<Omit<Contact, 'id'>>): boolean => {
    const index = contacts.value.findIndex((c) => c.id === id)
    if (index === -1) return false

    contacts.value[index] = {
      ...contacts.value[index],
      ...updates,
    }
    return true
  }

  const deleteContact = (id: string): boolean => {
    const index = contacts.value.findIndex((c) => c.id === id)
    if (index === -1) return false

    contacts.value.splice(index, 1)
    return true
  }

  const getContactByNumber = (number: string): Contact | undefined => {
    const normalizedNumber = normalizePhoneNumber(number)
    return contacts.value.find((c) => normalizePhoneNumber(c.number) === normalizedNumber)
  }

  const incrementCallCount = (number: string): void => {
    const normalizedNumber = normalizePhoneNumber(number)
    const contact = contacts.value.find((c) => normalizePhoneNumber(c.number) === normalizedNumber)

    if (contact) {
      contact.callCount++
      contact.lastCalled = new Date()
    }
  }

  const toggleFavorite = (id: string): boolean => {
    const contact = contacts.value.find((c) => c.id === id)
    if (!contact) return false

    contact.isFavorite = !contact.isFavorite
    return true
  }

  const searchContacts = (query: string): Contact[] => {
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) return contacts.value

    return contacts.value.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.number.includes(normalizedQuery) ||
        c.notes?.toLowerCase().includes(normalizedQuery)
    )
  }

  const importContacts = (
    newContacts: Omit<Contact, 'id' | 'callCount' | 'createdAt'>[]
  ): number => {
    let added = 0
    for (const contact of newContacts) {
      const normalizedNumber = normalizePhoneNumber(contact.number)
      const existing = contacts.value.find(
        (c) => normalizePhoneNumber(c.number) === normalizedNumber
      )

      if (!existing) {
        contacts.value.push({
          ...contact,
          id: generateId(),
          callCount: 0,
          color: contact.color || getRandomColor(),
          createdAt: new Date(),
        })
        added++
      }
    }
    return added
  }

  const exportContacts = (): string => {
    return JSON.stringify(contacts.value, null, 2)
  }

  return {
    contacts,
    favorites,
    recentContacts,
    addContact,
    updateContact,
    deleteContact,
    getContactByNumber,
    incrementCallCount,
    toggleFavorite,
    searchContacts,
    importContacts,
    exportContacts,
  }
}
