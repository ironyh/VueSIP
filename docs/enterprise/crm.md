# CRM

Lightweight CRM helpers to sync contacts, look up callers, log activities, and trigger screen pops.

## Quick Start

```ts
import { useCRM, SalesforceAdapter } from '@vuesip/enterprise/crm'

const crm = useCRM({ autoLookup: true, cacheContacts: true })

// Configure an adapter
const adapter = new SalesforceAdapter({
  instanceUrl: 'https://example.salesforce.com',
  accessToken: 'your-access-token',
})
crm.setAdapter(adapter)
await crm.connect()

// Lookup by phone
const contact = await crm.lookupContact('+1 (555) 123-4567')

// Log a call
await crm.logCall({
  contactId: contact?.id,
  direction: 'inbound',
  startTime: new Date(),
  duration: 180,
  status: 'completed',
  phoneNumber: '+15551234567',
  notes: 'Follow-up needed',
})
```

## Lookup & Cache

```ts
// Normalize and cache by phone number
const contact = await crm.lookupContact('+1 (555) 123-4567')
if (contact) {
  console.log('Known caller:', contact.firstName, contact.lastName)
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

## Activities and Follow-ups

```ts
await crm.createFollowUp({
  contactId: contact?.id ?? 'unknown',
  type: 'task',
  subject: 'Schedule demo',
  status: 'pending',
  dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
})
```

## Error Handling

All methods return promises; wrap with try/catch for adapter failures. Configure `normalizePhone` to fit regional formats.
