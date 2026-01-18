# CRM

Lightweight CRM helpers to sync contacts, look up callers, log activities, and trigger screen pops.

## Quick Start

```ts
import { useCRM } from '@vuesip/enterprise/crm'

const crm = useCRM({ autoLookup: true, cacheContacts: true })

// Upsert basic contact
await crm.upsertContact({ id: 'abc', name: 'Alice', phone: '+15551234567' })

// Log a call
await crm.logActivity({ contactId: 'abc', type: 'call', notes: 'Follow-up needed' })
```

## Lookup & Cache

```ts
// Normalize and cache by phone number
const contact = await crm.lookupContact('+1 (555) 123-4567')
if (contact) {
  console.log('Known caller:', contact.name)
}

// Clear cache if needed
crm.clearCache()
```

## Screen Pop

```ts
crm.onScreenPop((contact) => {
  // Navigate your UI to contact details
  router.push({ name: 'contact', params: { id: contact.id } })
})
```

## Error Handling

All methods return promises; wrap with try/catch for adapter failures. Configure `normalizePhone` to fit regional formats.
