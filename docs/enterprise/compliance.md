# Compliance

Compliance helpers for PII detection and policy checks.

## Quick Start

```ts
import { useCompliance } from '@vuesip/enterprise/compliance'

const { scanText, hasPII, lastScan } = useCompliance()

const result = scanText('Account number 1234-5678-90')
if (hasPII(result)) {
  // mask or block
}
```
