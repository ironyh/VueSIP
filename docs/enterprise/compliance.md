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

## Usage Example: PCI-Safe Card Entry Flow

```ts
const compliance = useCompliance({
  regulations: ['PCI-DSS'],
  consentRequired: true,
  auditEnabled: true,
  retentionDays: 365,
  pciMode: {
    pauseRecordingOnCard: true,
    secureInputEnabled: true,
  },
})

const { pciMode, consentManager, auditLog } = compliance

const callId = 'call-123'
await consentManager.requestConsent('recording', 'verbal')
auditLog.log('consent_recorded', 'call', { callId })

const stopListening = pciMode.onCardDetected((detection) => {
  if (detection.detected) {
    pciMode.activate()
    pciMode.pauseRecording()
    auditLog.log('pci_recording_paused', 'call', {
      callId,
      maskedNumber: detection.maskedNumber,
    })
  }
})

// When done:
// stopListening()
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

## Usage Example: GDPR Export + Audit Trail

```ts
const exportBundle = await gdpr.exportUserData('user-123')
auditLog.log('gdpr_export', 'user', { userId: 'user-123' })

const redacted = gdpr.anonymizeData(exportBundle.personalData)
auditLog.log('gdpr_anonymize', 'user', { userId: 'user-123' })
```

## Compliance Status

```ts
const { isValid, violations } = compliance.validateCompliance()
if (!isValid) {
  console.warn('Compliance issues:', violations)
}
```

## E911 Compliance (Kari's Law / RAY BAUM's Act)

For emergency call compliance (dispatchable location, on-site notification, and audit logs), use the core E911 composable and utilities:

- **Composable:** [`useSipE911`](/api/composables#usesipe911) — emergency call detection, location management, admin notification, and compliance logging. See the [E911 guide](/guide/e911) for setup, monitoring, locations, and recipients.
- **Utilities:** [E911 helpers](/api/utilities#e911-helpers) in `@/utils/e911` (or `vuesip/utils`) — sanitization, validation, formatting, and default config for reuse in custom flows or tests.

Enable `config.complianceLogging` and use `complianceLogs`, `getLogs()`, and `exportLogs()` from `useSipE911` for audit trails; use `checkCompliance()` to validate config and locations.
