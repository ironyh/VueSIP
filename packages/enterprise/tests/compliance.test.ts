/**
 * @vuesip/enterprise - Compliance Module Tests
 *
 * Tests for PCI-DSS, HIPAA, GDPR compliance features,
 * credit card detection, consent management, audit logging,
 * and data retention policies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useCompliance,
  luhnValidate,
  detectCardType,
  type UseComplianceReturn,
} from '../src/compliance'
import type {
  ComplianceConfig,
  ConsentType,
  ConsentMethod,
  DataRetentionPolicy,
} from '../src/compliance'

// ============================================
// Test Fixtures
// ============================================

// Valid test card numbers (from payment processor test suites)
const VALID_CARDS = {
  visa: '4111111111111111',
  visaSpaced: '4111 1111 1111 1111',
  visaDashed: '4111-1111-1111-1111',
  mastercard: '5500000000000004',
  amex: '378282246310005',
  amexSpaced: '3782 822463 10005',
  discover: '6011111111111117',
}

// Invalid card numbers (fail Luhn check)
const INVALID_CARDS = {
  invalidLuhn: '4111111111111112',
  tooShort: '411111111111',
  tooLong: '41111111111111111111',
  nonNumeric: '4111-XXXX-1111-1111',
}

// Text samples for testing
const TEXT_WITH_CARD = `
  Please charge my Visa card: 4111 1111 1111 1111
  The expiration date is 12/25.
`

const TEXT_WITHOUT_CARD = `
  Here is my reference number: 1234567890
  Please call me at 555-123-4567.
`

const TEXT_WITH_MULTIPLE_SENSITIVE = `
  Name: John Doe
  SSN: 123-45-6789
  Email: john.doe@example.com
  Card: 4111111111111111
  Phone: (555) 123-4567
`

// ============================================
// Helper Functions
// ============================================

function createDefaultConfig(overrides: Partial<ComplianceConfig> = {}): ComplianceConfig {
  return {
    regulations: ['PCI-DSS', 'GDPR'],
    consentRequired: true,
    retentionDays: 90,
    auditEnabled: true,
    pciMode: {
      pauseRecordingOnCard: true,
      maskDTMF: true,
      secureInputEnabled: true,
    },
    gdprMode: {
      consentTracking: true,
      rightToErasure: true,
      dataPortability: true,
    },
    ...overrides,
  }
}

// ============================================
// Luhn Algorithm Tests
// ============================================

describe('Luhn Algorithm Validation', () => {
  describe('luhnValidate', () => {
    it('should validate correct Visa card number', () => {
      expect(luhnValidate(VALID_CARDS.visa)).toBe(true)
    })

    it('should validate correct Mastercard number', () => {
      expect(luhnValidate(VALID_CARDS.mastercard)).toBe(true)
    })

    it('should validate correct Amex number', () => {
      expect(luhnValidate(VALID_CARDS.amex)).toBe(true)
    })

    it('should validate correct Discover number', () => {
      expect(luhnValidate(VALID_CARDS.discover)).toBe(true)
    })

    it('should handle spaces in card number', () => {
      expect(luhnValidate(VALID_CARDS.visaSpaced)).toBe(true)
    })

    it('should handle dashes in card number', () => {
      expect(luhnValidate(VALID_CARDS.visaDashed)).toBe(true)
    })

    it('should reject invalid Luhn checksum', () => {
      expect(luhnValidate(INVALID_CARDS.invalidLuhn)).toBe(false)
    })

    it('should reject card number that is too short', () => {
      expect(luhnValidate(INVALID_CARDS.tooShort)).toBe(false)
    })

    it('should reject card number that is too long', () => {
      expect(luhnValidate(INVALID_CARDS.tooLong)).toBe(false)
    })

    it('should reject non-numeric characters', () => {
      expect(luhnValidate(INVALID_CARDS.nonNumeric)).toBe(false)
    })

    it('should reject empty string', () => {
      expect(luhnValidate('')).toBe(false)
    })
  })
})

// ============================================
// Card Type Detection Tests
// ============================================

describe('Card Type Detection', () => {
  describe('detectCardType', () => {
    it('should detect Visa cards (starts with 4)', () => {
      expect(detectCardType(VALID_CARDS.visa)).toBe('visa')
      expect(detectCardType('4000000000000000')).toBe('visa')
    })

    it('should detect Mastercard (starts with 51-55)', () => {
      expect(detectCardType(VALID_CARDS.mastercard)).toBe('mastercard')
      expect(detectCardType('5100000000000000')).toBe('mastercard')
      expect(detectCardType('5500000000000000')).toBe('mastercard')
    })

    it('should detect Mastercard (starts with 2221-2720)', () => {
      expect(detectCardType('2221000000000000')).toBe('mastercard')
      expect(detectCardType('2720000000000000')).toBe('mastercard')
    })

    it('should detect Amex (starts with 34 or 37)', () => {
      expect(detectCardType(VALID_CARDS.amex)).toBe('amex')
      expect(detectCardType('340000000000000')).toBe('amex')
      expect(detectCardType('370000000000000')).toBe('amex')
    })

    it('should detect Discover cards', () => {
      expect(detectCardType(VALID_CARDS.discover)).toBe('discover')
      expect(detectCardType('6011000000000000')).toBe('discover')
      expect(detectCardType('6440000000000000')).toBe('discover')
      expect(detectCardType('6500000000000000')).toBe('discover')
    })

    it('should return other for unrecognized prefixes', () => {
      expect(detectCardType('9999999999999999')).toBe('other')
      expect(detectCardType('1234567890123456')).toBe('other')
    })

    it('should handle formatted numbers', () => {
      expect(detectCardType(VALID_CARDS.visaSpaced)).toBe('visa')
      expect(detectCardType(VALID_CARDS.amexSpaced)).toBe('amex')
    })
  })
})

// ============================================
// useCompliance Composable Tests
// ============================================

describe('useCompliance', () => {
  let compliance: UseComplianceReturn

  beforeEach(() => {
    compliance = useCompliance(createDefaultConfig())
  })

  describe('Initialization', () => {
    it('should initialize with configured regulations', () => {
      expect(compliance.activeRegulations.value).toContain('PCI-DSS')
      expect(compliance.activeRegulations.value).toContain('GDPR')
    })

    it('should initialize compliance status for each regulation', () => {
      expect(compliance.complianceStatus.value.has('PCI-DSS')).toBe(true)
      expect(compliance.complianceStatus.value.has('GDPR')).toBe(true)
    })

    it('should compute overall compliance status', () => {
      expect(compliance.isCompliant.value).toBeDefined()
    })
  })

  describe('Credit Card Detection', () => {
    it('should detect valid credit card in text', () => {
      const result = compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(result.detected).toBe(true)
      expect(result.cardType).toBe('visa')
    })

    it('should not detect when no card is present', () => {
      const result = compliance.detectCreditCard(TEXT_WITHOUT_CARD)
      expect(result.detected).toBe(false)
    })

    it('should provide masked card number', () => {
      const result = compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(result.maskedNumber).toMatch(/^4111\*+1111$/)
    })

    it('should set timestamp on detection', () => {
      const before = new Date()
      const result = compliance.detectCreditCard(TEXT_WITH_CARD)
      const after = new Date()

      expect(result.timestamp).toBeDefined()
<<<<<<< HEAD
      if (!result.timestamp) throw new Error('Expected timestamp to be defined')
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
=======
      expect(result.timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(result.timestamp!.getTime()).toBeLessThanOrEqual(after.getTime())
>>>>>>> 18c2136 (feat(enterprise): add enterprise package with analytics, compliance, and CRM)
    })

    it('should detect Amex 15-digit cards', () => {
      const amexText = 'Card number: 378282246310005'
      const result = compliance.detectCreditCard(amexText)
      expect(result.detected).toBe(true)
      expect(result.cardType).toBe('amex')
    })

    it('should not detect invalid card numbers', () => {
      const invalidText = 'Number: 4111111111111112' // Invalid Luhn
      const result = compliance.detectCreditCard(invalidText)
      expect(result.detected).toBe(false)
    })
  })

  describe('Sensitive Data Masking', () => {
    it('should mask credit card numbers', () => {
      const masked = compliance.maskSensitiveData(TEXT_WITH_MULTIPLE_SENSITIVE)
      expect(masked).not.toContain('4111111111111111')
      expect(masked).toContain('*'.repeat(16))
    })

    it('should mask SSN patterns', () => {
      const masked = compliance.maskSensitiveData(TEXT_WITH_MULTIPLE_SENSITIVE)
      expect(masked).not.toContain('123-45-6789')
    })

    it('should mask email addresses', () => {
      const masked = compliance.maskSensitiveData(TEXT_WITH_MULTIPLE_SENSITIVE)
      expect(masked).not.toContain('john.doe@example.com')
    })

    it('should accept custom patterns', () => {
      const text = 'Secret code: ABC-123-XYZ'
      const customPattern = /[A-Z]{3}-\d{3}-[A-Z]{3}/g
      const masked = compliance.maskSensitiveData(text, [customPattern])
      expect(masked).not.toContain('ABC-123-XYZ')
      expect(masked).toContain('***********')
    })

    it('should return original text if no matches', () => {
      const text = 'Hello, this is a safe message.'
      const masked = compliance.maskSensitiveData(text)
      expect(masked).toBe(text)
    })
  })
})

// ============================================
// PCI Mode Tests
// ============================================

describe('PCI Mode', () => {
  let compliance: UseComplianceReturn

  beforeEach(() => {
    compliance = useCompliance(createDefaultConfig())
  })

  describe('Activation', () => {
    it('should be active by default when PCI-DSS is configured', () => {
      expect(compliance.pciMode.isActive.value).toBe(true)
    })

    it('should not be active when PCI-DSS is not configured', () => {
      const nonPciCompliance = useCompliance(
        createDefaultConfig({
          regulations: ['GDPR'],
        })
      )
      expect(nonPciCompliance.pciMode.isActive.value).toBe(false)
    })

    it('should allow manual activation', () => {
      const nonPciCompliance = useCompliance(
        createDefaultConfig({
          regulations: ['GDPR'],
        })
      )
      nonPciCompliance.pciMode.activate()
      expect(nonPciCompliance.pciMode.isActive.value).toBe(true)
    })

    it('should allow deactivation', () => {
      compliance.pciMode.deactivate()
      expect(compliance.pciMode.isActive.value).toBe(false)
    })
  })

  describe('Recording Control', () => {
    it('should start with recording not paused', () => {
      expect(compliance.pciMode.isPaused.value).toBe(false)
    })

    it('should pause recording on demand', () => {
      compliance.pciMode.pauseRecording()
      expect(compliance.pciMode.isPaused.value).toBe(true)
    })

    it('should resume recording on demand', () => {
      compliance.pciMode.pauseRecording()
      compliance.pciMode.resumeRecording()
      expect(compliance.pciMode.isPaused.value).toBe(false)
    })

    it('should auto-pause when card detected if configured', () => {
      compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(compliance.pciMode.isPaused.value).toBe(true)
    })

    it('should not auto-pause if PCI mode is inactive', () => {
      compliance.pciMode.deactivate()
      compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(compliance.pciMode.isPaused.value).toBe(false)
    })

    it('should clear card detection on resume', () => {
      compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(compliance.pciMode.cardDetected.value.detected).toBe(true)
      compliance.pciMode.resumeRecording()
      expect(compliance.pciMode.cardDetected.value.detected).toBe(false)
    })
  })

  describe('Card Detection Callbacks', () => {
    it('should call registered callbacks on detection', () => {
      const callback = vi.fn()
      compliance.pciMode.onCardDetected(callback)
      compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          detected: true,
          cardType: 'visa',
        })
      )
    })

    it('should support multiple callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      compliance.pciMode.onCardDetected(callback1)
      compliance.pciMode.onCardDetected(callback2)
      compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = compliance.pciMode.onCardDetected(callback)
      unsubscribe()
      compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(callback).not.toHaveBeenCalled()
    })

    it('should not call callbacks for non-detections', () => {
      const callback = vi.fn()
      compliance.pciMode.onCardDetected(callback)
      compliance.detectCreditCard(TEXT_WITHOUT_CARD)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Secure Input', () => {
    it('should show secure input when enabled', () => {
      compliance.pciMode.showSecureInput()
      // Note: We don't expose secureInputVisible directly, but recording should pause
      expect(compliance.pciMode.isPaused.value).toBe(true)
    })
  })
})

// ============================================
// Consent Manager Tests
// ============================================

describe('Consent Manager', () => {
  let compliance: UseComplianceReturn

  beforeEach(() => {
    compliance = useCompliance(createDefaultConfig())
  })

  describe('Consent Tracking', () => {
    it('should start with no consents', () => {
      expect(compliance.consentManager.consents.value).toHaveLength(0)
    })

    it('should not have consent by default', () => {
      expect(compliance.consentManager.hasConsent('recording')).toBe(false)
    })
  })

  describe('Request Consent', () => {
    it('should create consent record on request', async () => {
      const consent = await compliance.consentManager.requestConsent('recording', 'verbal')
      expect(consent).toBeDefined()
      expect(consent.id).toBeDefined()
      expect(consent.type).toBe('recording')
      expect(consent.method).toBe('verbal')
    })

    it('should add consent to list', async () => {
      await compliance.consentManager.requestConsent('recording', 'verbal')
      expect(compliance.consentManager.consents.value).toHaveLength(1)
    })

    it('should set timestamp on consent', async () => {
      const before = new Date()
      const consent = await compliance.consentManager.requestConsent('recording', 'verbal')
      const after = new Date()

      expect(consent.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(consent.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should support different consent types', async () => {
      const types: ConsentType[] = ['recording', 'transcription', 'data_processing', 'marketing']
      for (const type of types) {
        const consent = await compliance.consentManager.requestConsent(type, 'web')
        expect(consent.type).toBe(type)
      }
    })

    it('should support different consent methods', async () => {
      const methods: ConsentMethod[] = ['verbal', 'ivr', 'web', 'written']
      for (const method of methods) {
        const consent = await compliance.consentManager.requestConsent('recording', method)
        expect(consent.method).toBe(method)
      }
    })
  })

  describe('Revoke Consent', () => {
    it('should revoke existing consent', async () => {
      const consent = await compliance.consentManager.requestConsent('recording', 'verbal')
      // Manually grant consent for testing
      const grantedConsent = compliance.consentManager.consents.value.find(
        (c) => c.id === consent.id
      )
      if (grantedConsent) {
        grantedConsent.granted = true
      }

      compliance.consentManager.revokeConsent(consent.id)

      const revokedConsent = compliance.consentManager.consents.value.find(
        (c) => c.id === consent.id
      )
      expect(revokedConsent?.granted).toBe(false)
    })

    it('should handle revoking non-existent consent gracefully', () => {
      expect(() => {
        compliance.consentManager.revokeConsent('non-existent-id')
      }).not.toThrow()
    })
  })

  describe('Get Consents for Call', () => {
    it('should filter consents by call ID', async () => {
      // Create consents with different call IDs
      const consent1 = await compliance.consentManager.requestConsent('recording', 'verbal')
      const callId1 = consent1.callId

      // The composable generates a new callId for each consent when no current call
      // Request another consent (we don't use the result, just verifying call separation)
      await compliance.consentManager.requestConsent('transcription', 'verbal')

      const call1Consents = compliance.consentManager.getConsentsForCall(callId1)
      expect(call1Consents).toHaveLength(1)
      expect(call1Consents[0].type).toBe('recording')
    })

    it('should return empty array for unknown call ID', () => {
      const consents = compliance.consentManager.getConsentsForCall('unknown-call')
      expect(consents).toHaveLength(0)
    })
  })
})

// ============================================
// Audit Log Tests
// ============================================

describe('Audit Log', () => {
  let compliance: UseComplianceReturn

  beforeEach(() => {
    compliance = useCompliance(createDefaultConfig())
  })

  describe('Logging', () => {
    it('should log audit entries', () => {
      compliance.auditLog.log('test_action', 'test_resource')
      expect(compliance.auditLog.entries.value.length).toBeGreaterThan(0)
    })

    it('should include details in log entry', () => {
      compliance.auditLog.log('test_action', 'test_resource', { key: 'value' })
      const entry = compliance.auditLog.entries.value.find((e) => e.action === 'test_action')
      expect(entry?.details).toEqual({ key: 'value' })
    })

    it('should auto-log on card detection when audit enabled', () => {
      const initialCount = compliance.auditLog.entries.value.length
      compliance.detectCreditCard(TEXT_WITH_CARD)
      expect(compliance.auditLog.entries.value.length).toBeGreaterThan(initialCount)
    })

    it('should not auto-log when audit disabled', () => {
      const noAuditCompliance = useCompliance(createDefaultConfig({ auditEnabled: false }))
      const initialCount = noAuditCompliance.auditLog.entries.value.length
      noAuditCompliance.detectCreditCard(TEXT_WITH_CARD)
      expect(noAuditCompliance.auditLog.entries.value.length).toBe(initialCount)
    })

    it('should generate unique IDs for entries', () => {
      compliance.auditLog.log('action1', 'resource')
      compliance.auditLog.log('action2', 'resource')
      const ids = compliance.auditLog.entries.value.map((e) => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('Filtering', () => {
    beforeEach(() => {
      // Add some entries
      compliance.auditLog.log('action_a', 'resource_1', { num: 1 })
      compliance.auditLog.log('action_b', 'resource_1', { num: 2 })
      compliance.auditLog.log('action_a', 'resource_2', { num: 3 })
    })

    it('should filter by action', () => {
      const entries = compliance.auditLog.getEntries({ action: 'action_a' })
      expect(entries.every((e) => e.action === 'action_a')).toBe(true)
    })

    it('should filter by resource', () => {
      const entries = compliance.auditLog.getEntries({ resource: 'resource_1' })
      expect(entries.every((e) => e.resource === 'resource_1')).toBe(true)
    })

    it('should filter by date range', () => {
      const now = new Date()
      const earlier = new Date(now.getTime() - 1000)

      const entries = compliance.auditLog.getEntries({
        startDate: earlier,
        endDate: now,
      })
      expect(entries.length).toBeGreaterThan(0)
    })

    it('should return all entries with no filters', () => {
      const allEntries = compliance.auditLog.getEntries()
      expect(allEntries.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Export', () => {
    beforeEach(() => {
      compliance.auditLog.log('test_action', 'test_resource', { key: 'value' })
    })

    it('should export as JSON', () => {
      const json = compliance.auditLog.exportLog('json')
      expect(() => JSON.parse(json)).not.toThrow()
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it('should export as CSV', () => {
      const csv = compliance.auditLog.exportLog('csv')
      const lines = csv.split('\n')
      expect(lines.length).toBeGreaterThan(1) // Header + at least one data row
      expect(lines[0]).toContain('id')
      expect(lines[0]).toContain('timestamp')
      expect(lines[0]).toContain('action')
    })

    it('should handle special characters in CSV', () => {
      compliance.auditLog.log('action', 'resource', { message: 'Hello, "World"' })
      const csv = compliance.auditLog.exportLog('csv')
      expect(csv).toContain('""') // Escaped quotes
    })
  })
})

// ============================================
// Data Retention Tests
// ============================================

describe('Data Retention', () => {
  let compliance: UseComplianceReturn

  beforeEach(() => {
    compliance = useCompliance(createDefaultConfig({ retentionDays: 90 }))
  })

  describe('Default Policies', () => {
    it('should create default policies based on retention days', () => {
      expect(compliance.dataRetention.policies.value.length).toBeGreaterThan(0)
    })

    it('should have recording policy', () => {
      const recordingPolicy = compliance.dataRetention.policies.value.find(
        (p) => p.dataType === 'recording'
      )
      expect(recordingPolicy).toBeDefined()
      expect(recordingPolicy?.retentionDays).toBe(90)
    })

    it('should have longer retention for audit logs', () => {
      const auditPolicy = compliance.dataRetention.policies.value.find(
        (p) => p.dataType === 'audit'
      )
      expect(auditPolicy).toBeDefined()
      expect(auditPolicy?.retentionDays).toBeGreaterThan(90)
    })
  })

  describe('Policy Management', () => {
    it('should add new policy', () => {
      const newPolicy: DataRetentionPolicy = {
        dataType: 'recording',
        retentionDays: 30,
        action: 'archive',
      }
      compliance.dataRetention.addPolicy(newPolicy)

      const policy = compliance.dataRetention.policies.value.find((p) => p.dataType === 'recording')
      expect(policy?.retentionDays).toBe(30)
      expect(policy?.action).toBe('archive')
    })

    it('should replace existing policy for same data type', () => {
      compliance.dataRetention.addPolicy({
        dataType: 'recording',
        retentionDays: 60,
        action: 'delete',
      })

      const policies = compliance.dataRetention.policies.value.filter(
        (p) => p.dataType === 'recording'
      )
      expect(policies).toHaveLength(1)
    })

    it('should remove policy', () => {
      compliance.dataRetention.removePolicy('recording')
      const policy = compliance.dataRetention.policies.value.find((p) => p.dataType === 'recording')
      expect(policy).toBeUndefined()
    })
  })

  describe('Retention Checking', () => {
    it('should check if data is expired', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 100) // 100 days ago

      const result = compliance.dataRetention.checkRetention('recording', oldDate)
      expect(result.expired).toBe(true)
      expect(result.daysRemaining).toBe(0)
    })

    it('should check days remaining', () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 10) // 10 days ago

      const result = compliance.dataRetention.checkRetention('recording', recentDate)
      expect(result.expired).toBe(false)
      expect(result.daysRemaining).toBe(80) // 90 - 10
    })

    it('should return -1 days remaining for no policy', () => {
      compliance.dataRetention.removePolicy('recording')
      const result = compliance.dataRetention.checkRetention('recording', new Date())
      expect(result.daysRemaining).toBe(-1)
      expect(result.expired).toBe(false)
    })
  })
})

// ============================================
// GDPR Tests
// ============================================

describe('GDPR', () => {
  let compliance: UseComplianceReturn

  beforeEach(() => {
    compliance = useCompliance(
      createDefaultConfig({
        regulations: ['GDPR'],
        gdprMode: {
          consentTracking: true,
          rightToErasure: true,
          dataPortability: true,
        },
      })
    )
  })

  describe('Data Export', () => {
    it('should export user data', async () => {
      const exportData = await compliance.gdpr.exportUserData('user-123')
      expect(exportData).toBeDefined()
      expect(exportData.userId).toBe('user-123')
      expect(exportData.exportedAt).toBeInstanceOf(Date)
    })

    it('should include consent records in export', async () => {
      const exportData = await compliance.gdpr.exportUserData('user-123')
      expect(exportData.consentRecords).toBeDefined()
      expect(Array.isArray(exportData.consentRecords)).toBe(true)
    })

    it('should include audit entries in export', async () => {
      const exportData = await compliance.gdpr.exportUserData('user-123')
      expect(exportData.auditEntries).toBeDefined()
      expect(Array.isArray(exportData.auditEntries)).toBe(true)
    })
  })

  describe('Data Deletion', () => {
    it('should delete user data', async () => {
      await expect(compliance.gdpr.deleteUserData('user-123')).resolves.not.toThrow()
    })

    it('should log deletion action when audit enabled', async () => {
      const complianceWithAudit = useCompliance(
        createDefaultConfig({
          regulations: ['GDPR'],
          auditEnabled: true,
        })
      )

      const initialCount = complianceWithAudit.auditLog.entries.value.length
      await complianceWithAudit.gdpr.deleteUserData('user-123')
      expect(complianceWithAudit.auditLog.entries.value.length).toBeGreaterThan(initialCount)
    })
  })

  describe('Data Anonymization', () => {
    it('should anonymize sensitive fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-123-4567',
        orderId: '12345',
      }

      const anonymized = compliance.gdpr.anonymizeData(data)
      expect(anonymized.name).toBe('[ANONYMIZED]')
      expect(anonymized.email).toBe('[ANONYMIZED]')
      expect(anonymized.phone).toBe('[ANONYMIZED]')
      expect(anonymized.orderId).toBe('12345') // Non-sensitive field preserved
    })

    it('should recursively anonymize nested objects', () => {
      const data = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        metadata: {
          created: '2024-01-01',
        },
      }

      const anonymized = compliance.gdpr.anonymizeData(data)
      expect((anonymized.user as Record<string, unknown>).name).toBe('[ANONYMIZED]')
      expect((anonymized.user as Record<string, unknown>).email).toBe('[ANONYMIZED]')
      expect((anonymized.metadata as Record<string, unknown>).created).toBe('2024-01-01')
    })

    it('should handle null values', () => {
      const data = {
        name: null,
        userId: null,
      }

      const anonymized = compliance.gdpr.anonymizeData(data)
      expect(anonymized.name).toBe(null) // null preserved
      expect(anonymized.userId).toBe(null) // sensitive but already null
    })

    it('should preserve arrays', () => {
      const data = {
        tags: ['a', 'b', 'c'],
        name: 'John',
      }

      const anonymized = compliance.gdpr.anonymizeData(data)
      expect(anonymized.tags).toEqual(['a', 'b', 'c'])
      expect(anonymized.name).toBe('[ANONYMIZED]')
    })
  })
})

// ============================================
// Compliance Validation Tests
// ============================================

describe('Compliance Validation', () => {
  describe('PCI-DSS Validation', () => {
    it('should pass with proper PCI configuration', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['PCI-DSS'],
          auditEnabled: true,
          pciMode: {
            pauseRecordingOnCard: true,
          },
        })
      )

      const result = compliance.validateCompliance()
      const pciViolations = result.violations.filter((v) => v.startsWith('PCI-DSS'))
      expect(pciViolations).toHaveLength(0)
    })

    it('should fail without auto-pause on card', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['PCI-DSS'],
          auditEnabled: true,
          pciMode: {
            pauseRecordingOnCard: false,
          },
        })
      )

      const result = compliance.validateCompliance()
      expect(result.violations.some((v) => v.includes('Auto-pause'))).toBe(true)
    })

    it('should fail without audit logging', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['PCI-DSS'],
          auditEnabled: false,
          pciMode: {
            pauseRecordingOnCard: true,
          },
        })
      )

      const result = compliance.validateCompliance()
      expect(result.violations.some((v) => v.toLowerCase().includes('audit'))).toBe(true)
    })
  })

  describe('HIPAA Validation', () => {
    it('should warn about encryption when disabled', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['HIPAA'],
          hipaaMode: {
            encryptTranscripts: false,
            accessLogging: true,
          },
        })
      )

      const result = compliance.validateCompliance()
      expect(result.violations.some((v) => v.includes('encryption'))).toBe(true)
    })

    it('should require access logging', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['HIPAA'],
          auditEnabled: false,
          hipaaMode: {
            accessLogging: false,
          },
        })
      )

      const result = compliance.validateCompliance()
      expect(result.violations.some((v) => v.includes('logging'))).toBe(true)
    })
  })

  describe('GDPR Validation', () => {
    it('should require consent tracking', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['GDPR'],
          consentRequired: false,
          gdprMode: {
            consentTracking: false,
            rightToErasure: true,
          },
        })
      )

      const result = compliance.validateCompliance()
      expect(result.violations.some((v) => v.includes('Consent'))).toBe(true)
    })

    it('should require right to erasure', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['GDPR'],
          gdprMode: {
            consentTracking: true,
            rightToErasure: false,
          },
        })
      )

      const result = compliance.validateCompliance()
      expect(result.violations.some((v) => v.includes('erasure'))).toBe(true)
    })
  })

  describe('Overall Compliance Status', () => {
    it('should be compliant when all checks pass', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['PCI-DSS', 'GDPR'],
          auditEnabled: true,
          consentRequired: true,
          pciMode: {
            pauseRecordingOnCard: true,
          },
          gdprMode: {
            consentTracking: true,
            rightToErasure: true,
          },
        })
      )

      expect(compliance.isCompliant.value).toBe(true)
    })

    it('should update compliance status per regulation', () => {
      const compliance = useCompliance(
        createDefaultConfig({
          regulations: ['PCI-DSS', 'GDPR'],
          auditEnabled: true,
          pciMode: {
            pauseRecordingOnCard: true,
          },
          gdprMode: {
            consentTracking: true,
            rightToErasure: false, // GDPR violation
          },
        })
      )

      expect(compliance.complianceStatus.value.get('PCI-DSS')).toBe(true)
      expect(compliance.complianceStatus.value.get('GDPR')).toBe(false)
    })
  })
})

// ============================================
// Integration Tests
// ============================================

describe('Integration', () => {
  it('should work with all regulations enabled', () => {
    const compliance = useCompliance({
      regulations: ['PCI-DSS', 'HIPAA', 'GDPR'],
      consentRequired: true,
      retentionDays: 365,
      auditEnabled: true,
      pciMode: {
        pauseRecordingOnCard: true,
        maskDTMF: true,
        secureInputEnabled: true,
      },
      hipaaMode: {
        encryptTranscripts: true,
        minimizeData: true,
        accessLogging: true,
      },
      gdprMode: {
        consentTracking: true,
        rightToErasure: true,
        dataPortability: true,
      },
    })

    // Should initialize successfully
    expect(compliance.activeRegulations.value).toHaveLength(3)
    expect(compliance.pciMode.isActive.value).toBe(true)

    // Should detect cards
    const detection = compliance.detectCreditCard(TEXT_WITH_CARD)
    expect(detection.detected).toBe(true)

    // Should auto-pause recording
    expect(compliance.pciMode.isPaused.value).toBe(true)

    // Should log the action
    expect(compliance.auditLog.entries.value.length).toBeGreaterThan(0)

    // Should be compliant
    expect(compliance.isCompliant.value).toBe(true)
  })

  it('should handle real-world call flow', async () => {
    const compliance = useCompliance(createDefaultConfig())

    // 1. Start call - request recording consent
    const consent = await compliance.consentManager.requestConsent('recording', 'ivr')
    expect(consent).toBeDefined()

    // 2. Grant consent (in real app this would be from user interaction)
    const consentRecord = compliance.consentManager.consents.value.find((c) => c.id === consent.id)
    if (consentRecord) {
      consentRecord.granted = true
    }

    // 3. During call - detect card number
    const transcription = 'Customer says: my card number is 4111 1111 1111 1111'
    const detection = compliance.detectCreditCard(transcription)
    expect(detection.detected).toBe(true)

    // 4. Recording should be paused
    expect(compliance.pciMode.isPaused.value).toBe(true)

    // 5. After card entry - resume recording
    compliance.pciMode.resumeRecording()
    expect(compliance.pciMode.isPaused.value).toBe(false)

    // 6. End call - check audit log
    const auditEntries = compliance.auditLog.getEntries({ action: 'card_detected' })
    expect(auditEntries.length).toBeGreaterThan(0)
  })
})
