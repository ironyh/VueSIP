# CRM

Lightweight CRM helpers to sync contacts and log activities.

## Quick Start

```ts
import { useCRM } from '@vuesip/enterprise/crm'

const { upsertContact, logActivity } = useCRM()

await upsertContact({ id: 'abc', name: 'Alice', phone: '+15551234567' })
await logActivity({ contactId: 'abc', type: 'call', notes: 'Follow-up needed' })
```
