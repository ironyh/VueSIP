# Enterprise Module

VueSIP Enterprise provides optional, higher-level modules for analytics, compliance, and CRM workflows.

- Package: `@vuesip/enterprise`
- Status: Optional add-on (separate install)

## Install

```bash
pnpm add @vuesip/enterprise
```

## Modules

- Analytics: KPIs, time series, dashboards, components
- Compliance: PII detection, policy enforcement helpers
- CRM: Contact sync and activity capture

Pick only what you need by importing sub-entries.

```ts
// Analytics
import { useCallAnalytics } from '@vuesip/enterprise/analytics'

// Compliance
import { useCompliance } from '@vuesip/enterprise/compliance'

// CRM
import { useCRM } from '@vuesip/enterprise/crm'
```

## Usage Examples

See the module guides for end-to-end examples:

- [Analytics](./analytics.md)
- [Compliance](./compliance.md)
- [CRM](./crm.md)

## When to use

- Call centers that need real-time dashboards and KPIs
- Regulated industries (healthcare/finance) that require policy checks
- Integrations with existing CRM systems for agent tooling
