# Compliance

Compliance helpers for PCI-DSS, HIPAA, and GDPR workflows: consent tracking, audit logging, data retention, and PCI-safe call handling.

## Quick Start

```ts
import { useCompliance } from '@vuesip/enterprise/compliance'

const compliance = useCompliance({
  regulations: ['PCI-DSS', 'GDPR'],
  consentRequired: true,
  auditEnabled: true,
  retentionDays: 365,
  pciMode: {
    pauseRecordingOnCard: true,
    secureInputEnabled: true,
  },
  gdprMode: {
    consentTracking: true,
    rightToErasure: true,
    dataPortability: true,
  },
})

const { pciMode, consentManager, auditLog, dataRetention, gdpr } = compliance
```

## PCI-DSS Handling

```ts
// Detect and mask card data in free-form text
const detection = compliance.detectCreditCard('Card 4111 1111 1111 1111 exp 12/29')
if (detection.detected) {
  pciMode.activate()
  pciMode.pauseRecording()
}

const masked = compliance.maskSensitiveData('Card 4111 1111 1111 1111 exp 12/29')
```

## Consent Tracking

```ts
const consent = await consentManager.requestConsent('recording', 'verbal')
if (!consent.granted) {
  // Handle opt-out
}
```

## Audit Logging and Retention

```ts
auditLog.log('recording_started', 'call', { callId: 'call-123' })

dataRetention.addPolicy({
  dataType: 'recording',
  retentionDays: 90,
  action: 'archive',
})
```

## GDPR Utilities

```ts
const exportBundle = await gdpr.exportUserData('user-123')
await gdpr.deleteUserData('user-123')
```

## Compliance Status

```ts
const { isValid, violations } = compliance.validateCompliance()
if (!isValid) {
  console.warn('Compliance issues:', violations)
}
```

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
