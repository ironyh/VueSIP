import type { ExampleDefinition } from './types'
import ContactsDemo from '../demos/ContactsDemo.vue'

export const contactsExample: ExampleDefinition = {
  id: 'contacts',
  icon: '📇',
  title: 'Contact Management',
  description: 'Manage and search contacts with presence integration',
  category: 'utility',
  tags: ['Contacts', 'Directory', 'Search'],
  component: ContactsDemo,
  setupGuide: '<p>Manage contacts with search, favorites, and presence status. Integrates with corporate directories and CRM systems.</p>',
  codeSnippets: [
    {
      title: 'Load Contacts',
      description: 'Initialize contacts manager',
      code: `import { useContacts } from 'vuesip'

const contacts = useContacts({
  sources: ['local', 'ldap', 'crm'],
  onContactUpdate: (contact) => {
    console.log('Contact updated:', contact.name)
  },
})

// Search contacts
const results = await contacts.search('John')`,
    },
    {
      title: 'Contact Actions',
      description: 'Manage favorites and call contacts',
      code: `// Add to favorites
await contacts.addFavorite(contactId)

// Call contact
await contacts.call(contact.primaryNumber)

// Send message
await contacts.message(contact.extension, 'Hello!')

// Get presence status
const presence = contacts.getPresence(contact.extension)`,
    },
  ],
}
