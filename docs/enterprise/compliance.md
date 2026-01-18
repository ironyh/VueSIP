# Compliance

Compliance helpers for PII detection, masking, and policy checks.

## Quick Start

```ts
import { useCompliance } from '@vuesip/enterprise/compliance'

const c = useCompliance()

// Scan incoming transcript or message
const res = c.scanText('Account number 1234-5678-90; email alice@example.com')
if (c.hasPII(res)) {
  // Mask content before storing/logging
  const masked = c.mask(res)
  console.log(masked.text)
}
```

## Batch Scanning

```ts
const lines = ['Card 4111 1111 1111 1111 exp 12/29', 'Contact alice@example.com to reset']
const results = lines.map((t) => c.scanText(t))
const anyPii = results.some((r) => c.hasPII(r))
```

## Policies

You can configure which detectors and actions to apply (e.g., block vs mask):

```ts
const c = useCompliance({
  detectors: ['email', 'card', 'account'],
  action: 'mask', // or 'block'
  maskChar: '•',
})
```

## Audit

For auditable flows, capture minimal metadata only (type, offsets), never raw PII:

```ts
const res = c.scanText('ssn 999-12-3456')
if (c.hasPII(res)) {
  auditLogger.log({ types: res.types, count: res.matches.length })
}
```
