import type { ExampleDefinition } from './types'
import SpeedDialDemo from '../demos/SpeedDialDemo.vue'

export const speedDialExample: ExampleDefinition = {
  id: 'speed-dial',
  icon: '⭐',
  title: 'Speed Dial',
  description: 'Quick-dial saved contacts',
  category: 'utility',
  tags: ['UI', 'Contacts', 'Practical'],
  component: SpeedDialDemo,
  setupGuide: '<p>Save frequently called contacts for one-click dialing. Contacts are stored in localStorage and persist across sessions.</p>',
  codeSnippets: [
    {
      title: 'Speed Dial Management',
      description: 'Save and dial favorite contacts',
      code: `import { ref } from 'vue'

interface Contact {
  name: string
  number: string
}

const speedDial = ref<Contact[]>([])

// Load from localStorage
const loadSpeedDial = () => {
  const saved = localStorage.getItem('speed-dial')
  if (saved) speedDial.value = JSON.parse(saved)
}

// Add contact
const addContact = (contact: Contact) => {
  speedDial.value.push(contact)
  localStorage.setItem('speed-dial', JSON.stringify(speedDial.value))
}

// Quick dial
const quickDial = async (contact: Contact) => {
  await makeCall(contact.number)
}`,
    },
    {
      title: 'Enhanced Contact Model',
      description: 'Rich contact information structure',
      code: `interface SpeedDialContact {
  id: string                   // Unique identifier
  name: string                 // Display name
  sipUri: string              // SIP URI
  phoneNumber?: string        // Alternative phone number
  email?: string              // Email address
  avatar?: string             // Avatar URL or base64
  company?: string            // Company name
  department?: string         // Department
  notes?: string              // Personal notes
  isFavorite: boolean         // Pinned to top
  color?: string              // UI accent color
  shortcut?: number           // Numeric shortcut (1-9)
  lastCalled?: Date           // Last call timestamp
  callCount: number           // Total calls made
  tags?: string[]             // Custom tags
  presenceStatus?: 'available' | 'busy' | 'away' | 'offline'
}

// Generate unique ID
const generateId = (): string => {
  return \`contact-\${Date.now()}-\${Math.random().toString(36).slice(2)}\`
}

// Create new contact
const createContact = (data: Partial<SpeedDialContact>): SpeedDialContact => ({
  id: generateId(),
  name: data.name || 'Unknown',
  sipUri: data.sipUri || '',
  isFavorite: false,
  callCount: 0,
  ...data,
})`,
    },
    {
      title: 'Numbered Speed Dial (1-9)',
      description: 'Assign contacts to number keys',
      code: `const speedDialSlots = ref<Map<number, SpeedDialContact>>(new Map())

// Assign contact to slot
const assignToSlot = (slot: number, contact: SpeedDialContact) => {
  if (slot < 1 || slot > 9) {
    throw new Error('Speed dial slots must be 1-9')
  }

  // Remove from previous slot if assigned elsewhere
  speedDialSlots.value.forEach((c, s) => {
    if (c.id === contact.id) {
      speedDialSlots.value.delete(s)
    }
  })

  speedDialSlots.value.set(slot, contact)
  contact.shortcut = slot
  saveSpeedDial()
}

// Remove from slot
const removeFromSlot = (slot: number) => {
  const contact = speedDialSlots.value.get(slot)
  if (contact) {
    contact.shortcut = undefined
    speedDialSlots.value.delete(slot)
    saveSpeedDial()
  }
}

// Dial by slot number
const dialBySlot = async (slot: number) => {
  const contact = speedDialSlots.value.get(slot)
  if (contact) {
    await quickDial(contact)
  }
}

// Handle keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  // Only when not in input field
  if (event.target instanceof HTMLInputElement) return

  const key = parseInt(event.key)
  if (key >= 1 && key <= 9) {
    dialBySlot(key)
  }
}`,
    },
    {
      title: 'Contact Groups',
      description: 'Organize contacts into groups',
      code: `interface ContactGroup {
  id: string
  name: string
  icon?: string
  color?: string
  contacts: string[] // Contact IDs
  order: number
}

const groups = ref<ContactGroup[]>([
  { id: 'favorites', name: 'Favorites', icon: '⭐', contacts: [], order: 0 },
  { id: 'recent', name: 'Recent', icon: '🕐', contacts: [], order: 1 },
  { id: 'work', name: 'Work', icon: '💼', contacts: [], order: 2 },
  { id: 'personal', name: 'Personal', icon: '🏠', contacts: [], order: 3 },
])

// Add contact to group
const addToGroup = (contactId: string, groupId: string) => {
  const group = groups.value.find(g => g.id === groupId)
  if (group && !group.contacts.includes(contactId)) {
    group.contacts.push(contactId)
    saveGroups()
  }
}

// Remove contact from group
const removeFromGroup = (contactId: string, groupId: string) => {
  const group = groups.value.find(g => g.id === groupId)
  if (group) {
    group.contacts = group.contacts.filter(id => id !== contactId)
    saveGroups()
  }
}

// Get contacts in group
const getGroupContacts = (groupId: string): SpeedDialContact[] => {
  const group = groups.value.find(g => g.id === groupId)
  if (!group) return []

  return group.contacts
    .map(id => contacts.value.find(c => c.id === id))
    .filter((c): c is SpeedDialContact => c !== undefined)
}

// Create new group
const createGroup = (name: string, icon?: string): ContactGroup => {
  const newGroup: ContactGroup = {
    id: \`group-\${Date.now()}\`,
    name,
    icon,
    contacts: [],
    order: groups.value.length,
  }
  groups.value.push(newGroup)
  saveGroups()
  return newGroup
}`,
    },
    {
      title: 'Search and Filter',
      description: 'Find contacts quickly',
      code: `const searchQuery = ref('')
const selectedGroup = ref<string | null>(null)
const sortBy = ref<'name' | 'recent' | 'frequent'>('name')

const filteredContacts = computed(() => {
  let result = [...contacts.value]

  // Filter by group
  if (selectedGroup.value) {
    const group = groups.value.find(g => g.id === selectedGroup.value)
    if (group) {
      result = result.filter(c => group.contacts.includes(c.id))
    }
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.sipUri.toLowerCase().includes(query) ||
      c.phoneNumber?.includes(query) ||
      c.company?.toLowerCase().includes(query) ||
      c.tags?.some(t => t.toLowerCase().includes(query))
    )
  }

  // Sort
  switch (sortBy.value) {
    case 'name':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'recent':
      result.sort((a, b) => {
        const aTime = a.lastCalled?.getTime() || 0
        const bTime = b.lastCalled?.getTime() || 0
        return bTime - aTime
      })
      break
    case 'frequent':
      result.sort((a, b) => b.callCount - a.callCount)
      break
  }

  // Favorites always first
  result.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1
    if (!a.isFavorite && b.isFavorite) return 1
    return 0
  })

  return result
})`,
    },
    {
      title: 'Speed Dial Grid UI',
      description: 'Visual speed dial interface',
      code: `<template>
  <div class="speed-dial">
    <!-- Search bar -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search contacts..."
      />
      <select v-model="selectedGroup">
        <option :value="null">All Contacts</option>
        <option v-for="group in groups" :key="group.id" :value="group.id">
          {{ group.icon }} {{ group.name }}
        </option>
      </select>
    </div>

    <!-- Numbered speed dial slots (1-9) -->
    <div class="speed-dial-slots">
      <button
        v-for="slot in 9"
        :key="slot"
        class="slot"
        :class="{ assigned: speedDialSlots.has(slot) }"
        @click="dialBySlot(slot)"
        @contextmenu.prevent="editSlot(slot)"
      >
        <span class="slot-number">{{ slot }}</span>
        <template v-if="speedDialSlots.has(slot)">
          <img
            v-if="speedDialSlots.get(slot)?.avatar"
            :src="speedDialSlots.get(slot)?.avatar"
            class="avatar"
          />
          <span class="name">{{ speedDialSlots.get(slot)?.name }}</span>
        </template>
        <span v-else class="empty">+</span>
      </button>
    </div>

    <!-- Contact grid -->
    <div class="contact-grid">
      <div
        v-for="contact in filteredContacts"
        :key="contact.id"
        class="contact-card"
        :style="{ borderColor: contact.color }"
        @click="quickDial(contact)"
        draggable="true"
        @dragstart="onDragStart($event, contact)"
      >
        <div class="avatar-wrapper">
          <img v-if="contact.avatar" :src="contact.avatar" class="avatar" />
          <span v-else class="avatar-placeholder">
            {{ contact.name.slice(0, 2).toUpperCase() }}
          </span>
          <span
            class="presence-dot"
            :class="contact.presenceStatus"
          ></span>
        </div>

        <div class="info">
          <span class="name">
            {{ contact.name }}
            <span v-if="contact.isFavorite">⭐</span>
          </span>
          <span class="company" v-if="contact.company">{{ contact.company }}</span>
        </div>

        <span v-if="contact.shortcut" class="shortcut-badge">
          {{ contact.shortcut }}
        </span>
      </div>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Import/Export Contacts',
      description: 'Backup and restore contacts',
      code: `// Export contacts
const exportContacts = () => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    contacts: contacts.value,
    groups: groups.value,
    slots: Array.from(speedDialSlots.value.entries()),
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = \`speed-dial-backup-\${Date.now()}.json\`
  a.click()

  URL.revokeObjectURL(url)
}

// Import contacts
const importContacts = async (file: File) => {
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (data.version !== 1) {
      throw new Error('Unsupported backup version')
    }

    // Merge or replace?
    const replace = await confirm('Replace existing contacts?')

    if (replace) {
      contacts.value = data.contacts
      groups.value = data.groups
      speedDialSlots.value = new Map(data.slots)
    } else {
      // Merge - add new contacts
      const existingIds = new Set(contacts.value.map(c => c.id))
      const newContacts = data.contacts.filter(
        (c: SpeedDialContact) => !existingIds.has(c.id)
      )
      contacts.value.push(...newContacts)
    }

    saveAll()
    showNotification(\`Imported \${data.contacts.length} contacts\`)
  } catch (error) {
    showNotification('Failed to import contacts', 'error')
  }
}

// Import from vCard
const importFromVCard = async (vcardText: string) => {
  const lines = vcardText.split('\\n')
  const contact: Partial<SpeedDialContact> = {}

  for (const line of lines) {
    if (line.startsWith('FN:')) {
      contact.name = line.slice(3).trim()
    } else if (line.startsWith('TEL')) {
      contact.phoneNumber = line.split(':')[1]?.trim()
    } else if (line.startsWith('EMAIL')) {
      contact.email = line.split(':')[1]?.trim()
    } else if (line.startsWith('ORG:')) {
      contact.company = line.slice(4).trim()
    }
  }

  if (contact.name && (contact.phoneNumber || contact.sipUri)) {
    addContact(createContact(contact))
  }
}`,
    },
    {
      title: 'Presence Integration',
      description: 'Show contact availability status',
      code: `import { usePresence } from 'vuesip'

const { subscribe, watchedUsers, unsubscribe } = usePresence(sipClientRef)

// Subscribe to presence for all contacts
const initPresenceWatching = async () => {
  for (const contact of contacts.value) {
    if (contact.sipUri) {
      try {
        await subscribe(contact.sipUri)
      } catch (e) {
        console.warn(\`Failed to subscribe to \${contact.sipUri}\`)
      }
    }
  }
}

// Update contact presence status
watch(watchedUsers, (users) => {
  users.forEach((status, uri) => {
    const contact = contacts.value.find(c => c.sipUri === uri)
    if (contact) {
      contact.presenceStatus = status.state as SpeedDialContact['presenceStatus']
    }
  })
}, { deep: true })

// Cleanup on unmount
onUnmounted(() => {
  contacts.value.forEach(contact => {
    if (contact.sipUri) {
      unsubscribe(contact.sipUri)
    }
  })
})

// Sort by availability
const sortByAvailability = () => {
  const priority = { available: 0, busy: 1, away: 2, offline: 3, undefined: 4 }
  contacts.value.sort((a, b) => {
    return (priority[a.presenceStatus || 'undefined'] || 4) -
           (priority[b.presenceStatus || 'undefined'] || 4)
  })
}`,
    },
  ],
}
