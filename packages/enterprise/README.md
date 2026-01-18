# @vuesip/enterprise

Note: PR coverage gate enforces minimums on core units; adapters/components and index barrels are excluded from coverage scope for accuracy.

Enterprise features for VueSIP: CRM integration (Salesforce, HubSpot, Webhooks), compliance utilities (PCI/GDPR helpers), and analytics (composable + renderless components).

## Install

```bash
pnpm add @vuesip/enterprise
```

Peer dependencies:

- vue ^3.3.0
- vuesip ^1.0.0

## Usage

### CRM

```ts
import { useCRM, SalesforceAdapter } from '@vuesip/enterprise/crm'

const { connect, lookupByPhone } = useCRM({
  adapter: new SalesforceAdapter({ instanceUrl, accessToken }),
})
```

### Compliance

```ts
import { useCompliance } from '@vuesip/enterprise/compliance'
const { luhnValidate, detectCardType } = useCompliance()
```

### Analytics

```ts
import { useCallAnalytics } from '@vuesip/enterprise/analytics'
const { metrics, agentMetrics } = useCallAnalytics()
```

## Build

This package ships multi-entry builds. Exports:

- `@vuesip/enterprise` (root)
- `@vuesip/enterprise/crm`
- `@vuesip/enterprise/compliance`
- `@vuesip/enterprise/analytics`

To build locally:

```bash
pnpm --filter @vuesip/enterprise run build
```
