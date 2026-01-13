/**
 * @vuesip/enterprise - Compliance Composable
 *
 * Vue composable for regulatory compliance including PCI-DSS, HIPAA, and GDPR.
 *
 * @module compliance/useCompliance
 */

import { ref, computed, watch, shallowRef, type Ref, type ComputedRef } from 'vue'
import type {
  RegulationType,
  ComplianceConfig,
  ConsentRecord,
  ConsentType,
  ConsentMethod,
  AuditLogEntry,
  AuditLogFilters,
  AuditResult,
  DataRetentionPolicy,
  RetentionDataType,
  PCICardDetection,
  CardType,
  GDPRDataExport,
} from './types'

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * PCI Mode interface for credit card handling
 */
export interface PCIMode {
  /** Whether PCI mode is currently active */
  isActive: Ref<boolean>
  /** Whether recording is paused for card entry */
  isPaused: Ref<boolean>
  /** Latest card detection result */
  cardDetected: Ref<PCICardDetection>
  /** Activate PCI compliance mode */
  activate: () => void
  /** Deactivate PCI compliance mode */
  deactivate: () => void
  /** Pause recording for card entry */
  pauseRecording: () => void
  /** Resume recording after card entry */
  resumeRecording: () => void
  /** Show secure input overlay */
  showSecureInput: () => void
  /** Hide secure input overlay */
  hideSecureInput: () => void
  /** Register callback for card detection events */
  onCardDetected: (callback: (detection: PCICardDetection) => void) => () => void
}

/**
 * Consent Manager interface
 */
export interface ConsentManager {
  /** All consent records */
  consents: Ref<ConsentRecord[]>
  /** Check if consent is granted for a type */
  hasConsent: (type: ConsentType) => boolean
  /** Request consent from user */
  requestConsent: (type: ConsentType, method: ConsentMethod) => Promise<ConsentRecord>
  /** Revoke previously granted consent */
  revokeConsent: (consentId: string) => void
  /** Get all consents for a specific call */
  getConsentsForCall: (callId: string) => ConsentRecord[]
}

/**
 * Audit Log interface
 */
export interface AuditLog {
  /** All audit entries */
  entries: Ref<AuditLogEntry[]>
  /** Log an action */
  log: (action: string, resource: string, details?: Record<string, unknown>) => void
  /** Get entries with optional filters */
  getEntries: (filters?: AuditLogFilters) => AuditLogEntry[]
  /** Export log in specified format */
  exportLog: (format: 'json' | 'csv') => string
}

/**
 * Data Retention interface
 */
export interface DataRetention {
  /** Current retention policies */
  policies: Ref<DataRetentionPolicy[]>
  /** Add a retention policy */
  addPolicy: (policy: DataRetentionPolicy) => void
  /** Remove a retention policy */
  removePolicy: (dataType: RetentionDataType) => void
  /** Check retention status of data */
  checkRetention: (dataType: string, createdAt: Date) => { expired: boolean; daysRemaining: number }
}

/**
 * GDPR interface
 */
export interface GDPR {
  /** Export all user data */
  exportUserData: (userId: string) => Promise<GDPRDataExport>
  /** Delete all user data */
  deleteUserData: (userId: string) => Promise<void>
  /** Anonymize data */
  anonymizeData: (data: Record<string, unknown>) => Record<string, unknown>
}

/**
 * Return type for useCompliance composable
 */
export interface UseComplianceReturn {
  // State
  activeRegulations: Ref<RegulationType[]>
  isCompliant: ComputedRef<boolean>
  complianceStatus: Ref<Map<RegulationType, boolean>>

  // PCI Mode
  pciMode: PCIMode

  // Consent Management
  consentManager: ConsentManager

  // Audit Logging
  auditLog: AuditLog

  // Data Retention
  dataRetention: DataRetention

  // GDPR
  gdpr: GDPR

  // Utilities
  detectCreditCard: (text: string) => PCICardDetection
  maskSensitiveData: (text: string, patterns?: RegExp[]) => string
  validateCompliance: () => { isValid: boolean; violations: string[] }
}

/**
 * Luhn algorithm for credit card validation
 */
export function luhnValidate(cardNumber: string): boolean {
  // Remove spaces and dashes
  const digits = cardNumber.replace(/[\s-]/g, '')

  // Must be all digits
  if (!/^\d+$/.test(digits)) {
    return false
  }

  // Must be 13-19 digits
  if (digits.length < 13 || digits.length > 19) {
    return false
  }

  let sum = 0
  let isEven = false

  // Loop through values starting from the rightmost side
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Detect card type from number prefix
 */
export function detectCardType(cardNumber: string): CardType | undefined {
  const digits = cardNumber.replace(/[\s-]/g, '')

  // Visa: starts with 4
  if (/^4/.test(digits)) {
    return 'visa'
  }

  // Mastercard: starts with 51-55 or 2221-2720
  if (/^5[1-5]/.test(digits) || /^2(2[2-9][1-9]|2[3-9]\d|[3-6]\d{2}|7[0-1]\d|720)/.test(digits)) {
    return 'mastercard'
  }

  // Amex: starts with 34 or 37
  if (/^3[47]/.test(digits)) {
    return 'amex'
  }

  // Discover: starts with 6011, 644-649, or 65
  if (/^6011/.test(digits) || /^64[4-9]/.test(digits) || /^65/.test(digits)) {
    return 'discover'
  }

  return 'other'
}

/**
 * Create masked card number for logging (show first 4 and last 4)
 */
function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/[\s-]/g, '')
  if (digits.length < 8) {
    return '*'.repeat(digits.length)
  }
  const first4 = digits.slice(0, 4)
  const last4 = digits.slice(-4)
  const maskLength = digits.length - 8
  return `${first4}${'*'.repeat(maskLength)}${last4}`
}

/**
 * Credit card number pattern for detection
 */
const CARD_PATTERNS = [
  // Standard 16-digit cards (Visa, Mastercard, Discover)
  /\b(?:4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g, // Visa
  /\b(?:5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g, // Mastercard
  /\b(?:6(?:011|5\d{2}|4[4-9]\d)[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g, // Discover
  // 15-digit Amex
  /\b(?:3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5})\b/g, // Amex
  // Generic card pattern (13-19 consecutive digits)
  /\b\d{13,19}\b/g,
]

/**
 * Default sensitive data patterns
 */
const DEFAULT_SENSITIVE_PATTERNS = [
  // Credit card numbers (various formats)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  /\b\d{4}[\s-]?\d{6}[\s-]?\d{5}\b/g, // Amex format
  // SSN
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  // Phone numbers (basic)
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // Email
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Dates (various formats)
  /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
]

/**
 * Vue composable for regulatory compliance
 *
 * @param config - Compliance configuration
 * @returns Compliance management interface
 *
 * @example
 * ```ts
 * const compliance = useCompliance({
 *   regulations: ['PCI-DSS', 'GDPR'],
 *   consentRequired: true,
 *   auditEnabled: true,
 *   pciMode: {
 *     pauseRecordingOnCard: true,
 *     maskDTMF: true,
 *   },
 * })
 *
 * // Check for credit cards in transcription
 * const detection = compliance.detectCreditCard(text)
 * if (detection.detected) {
 *   compliance.pciMode.pauseRecording()
 * }
 * ```
 */
export function useCompliance(config: ComplianceConfig): UseComplianceReturn {
  // ============================================
  // State
  // ============================================

  const activeRegulations = ref<RegulationType[]>([...config.regulations])
  const complianceStatus = ref<Map<RegulationType, boolean>>(new Map())

  // Initialize compliance status for each regulation
  for (const reg of config.regulations) {
    complianceStatus.value.set(reg, true)
  }

  // ============================================
  // PCI Mode State
  // ============================================

  const pciIsActive = ref(config.regulations.includes('PCI-DSS'))
  const pciIsPaused = ref(false)
  const pciCardDetected = ref<PCICardDetection>({ detected: false })
  const pciSecureInputVisible = ref(false)
  const cardDetectionCallbacks = shallowRef<Array<(detection: PCICardDetection) => void>>([])

  // ============================================
  // Consent State
  // ============================================

  const consents = ref<ConsentRecord[]>([])
  const currentCallId = ref<string>('')

  // ============================================
  // Audit Log State
  // ============================================

  const auditEntries = ref<AuditLogEntry[]>([])
  const currentActor = ref<string>('system')
  const currentIpAddress = ref<string | undefined>(undefined)
  const currentUserAgent = ref<string | undefined>(undefined)

  // ============================================
  // Data Retention State
  // ============================================

  const retentionPolicies = ref<DataRetentionPolicy[]>([])

  // Initialize default retention policies if configured
  if (config.retentionDays) {
    const defaultPolicies: DataRetentionPolicy[] = [
      { dataType: 'recording', retentionDays: config.retentionDays, action: 'delete' },
      { dataType: 'transcription', retentionDays: config.retentionDays, action: 'delete' },
      { dataType: 'metadata', retentionDays: config.retentionDays * 2, action: 'archive' },
      { dataType: 'consent', retentionDays: config.retentionDays * 3, action: 'archive' },
      { dataType: 'audit', retentionDays: config.retentionDays * 5, action: 'archive' },
    ]
    retentionPolicies.value = defaultPolicies
  }

  // ============================================
  // User Data Storage (for GDPR)
  // ============================================

  const userData = ref<Map<string, Record<string, unknown>>>(new Map())

  // ============================================
  // Credit Card Detection
  // ============================================

  function detectCreditCard(text: string): PCICardDetection {
    for (const pattern of CARD_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0
      const matches = text.match(pattern)

      if (matches) {
        for (const match of matches) {
          const cleanNumber = match.replace(/[\s-]/g, '')

          // Validate with Luhn algorithm
          if (luhnValidate(cleanNumber)) {
            const detection: PCICardDetection = {
              detected: true,
              cardType: detectCardType(cleanNumber),
              timestamp: new Date(),
              maskedNumber: maskCardNumber(cleanNumber),
            }

            // Update state
            pciCardDetected.value = detection

            // Notify callbacks
            for (const callback of cardDetectionCallbacks.value) {
              callback(detection)
            }

            // Auto-pause if configured
            if (config.pciMode?.pauseRecordingOnCard && pciIsActive.value) {
              pciIsPaused.value = true
            }

            // Log audit entry
            if (config.auditEnabled) {
              logAuditEntry('card_detected', 'pci', {
                cardType: detection.cardType,
                maskedNumber: detection.maskedNumber,
                autoPaused: config.pciMode?.pauseRecordingOnCard,
              })
            }

            return detection
          }
        }
      }
    }

    return { detected: false }
  }

  // ============================================
  // Sensitive Data Masking
  // ============================================

  function maskSensitiveData(text: string, patterns?: RegExp[]): string {
    const patternsToUse = patterns || DEFAULT_SENSITIVE_PATTERNS
    let maskedText = text

    for (const pattern of patternsToUse) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0
      maskedText = maskedText.replace(pattern, (match) => '*'.repeat(match.length))
    }

    return maskedText
  }

  // ============================================
  // PCI Mode Functions
  // ============================================

  const pciMode: PCIMode = {
    isActive: pciIsActive,
    isPaused: pciIsPaused,
    cardDetected: pciCardDetected,

    activate() {
      pciIsActive.value = true
      if (config.auditEnabled) {
        logAuditEntry('pci_mode_activated', 'compliance')
      }
    },

    deactivate() {
      pciIsActive.value = false
      pciIsPaused.value = false
      pciSecureInputVisible.value = false
      if (config.auditEnabled) {
        logAuditEntry('pci_mode_deactivated', 'compliance')
      }
    },

    pauseRecording() {
      if (pciIsActive.value) {
        pciIsPaused.value = true
        if (config.auditEnabled) {
          logAuditEntry('recording_paused_pci', 'recording')
        }
      }
    },

    resumeRecording() {
      if (pciIsActive.value) {
        pciIsPaused.value = false
        pciCardDetected.value = { detected: false }
        if (config.auditEnabled) {
          logAuditEntry('recording_resumed_pci', 'recording')
        }
      }
    },

    showSecureInput() {
      if (pciIsActive.value && config.pciMode?.secureInputEnabled) {
        pciSecureInputVisible.value = true
        pciIsPaused.value = true
        if (config.auditEnabled) {
          logAuditEntry('secure_input_shown', 'pci')
        }
      }
    },

    hideSecureInput() {
      pciSecureInputVisible.value = false
      if (config.auditEnabled) {
        logAuditEntry('secure_input_hidden', 'pci')
      }
    },

    onCardDetected(callback: (detection: PCICardDetection) => void): () => void {
      cardDetectionCallbacks.value = [...cardDetectionCallbacks.value, callback]
      return () => {
        cardDetectionCallbacks.value = cardDetectionCallbacks.value.filter((cb) => cb !== callback)
      }
    },
  }

  // ============================================
  // Consent Manager Functions
  // ============================================

  const consentManager: ConsentManager = {
    consents,

    hasConsent(type: ConsentType): boolean {
      const now = new Date()
      return consents.value.some(
        (c) =>
          c.type === type &&
          c.granted &&
          (!c.expiresAt || c.expiresAt > now) &&
          (currentCallId.value === '' || c.callId === currentCallId.value)
      )
    },

    async requestConsent(type: ConsentType, method: ConsentMethod): Promise<ConsentRecord> {
      const record: ConsentRecord = {
        id: generateId(),
        callId: currentCallId.value || generateId(),
        type,
        granted: false, // Default to false, actual value should come from user interaction
        timestamp: new Date(),
        method,
      }

      // In a real implementation, this would wait for user interaction
      // For now, we create the record and it should be updated via UI
      consents.value = [...consents.value, record]

      if (config.auditEnabled) {
        logAuditEntry('consent_requested', 'consent', {
          consentId: record.id,
          type,
          method,
        })
      }

      return record
    },

    revokeConsent(consentId: string): void {
      const index = consents.value.findIndex((c) => c.id === consentId)
      if (index !== -1) {
        const consent = consents.value[index]
        consents.value = consents.value.map((c) =>
          c.id === consentId ? { ...c, granted: false } : c
        )

        if (config.auditEnabled) {
          logAuditEntry('consent_revoked', 'consent', {
            consentId,
            type: consent.type,
          })
        }
      }
    },

    getConsentsForCall(callId: string): ConsentRecord[] {
      return consents.value.filter((c) => c.callId === callId)
    },
  }

  // ============================================
  // Audit Log Functions
  // ============================================

  function logAuditEntry(
    action: string,
    resource: string,
    details?: Record<string, unknown>,
    result: AuditResult = 'success'
  ): void {
    const entry: AuditLogEntry = {
      id: generateId(),
      timestamp: new Date(),
      action,
      actor: currentActor.value,
      resource,
      details,
      ipAddress: currentIpAddress.value,
      userAgent: currentUserAgent.value,
      result,
    }

    auditEntries.value = [...auditEntries.value, entry]
  }

  const auditLog: AuditLog = {
    entries: auditEntries,

    log(action: string, resource: string, details?: Record<string, unknown>): void {
      logAuditEntry(action, resource, details)
    },

    getEntries(filters?: AuditLogFilters): AuditLogEntry[] {
      let entries = [...auditEntries.value]

      if (filters?.startDate) {
<<<<<<< HEAD
        const startDate = filters.startDate
        entries = entries.filter((e) => e.timestamp >= startDate)
      }

      if (filters?.endDate) {
        const endDate = filters.endDate
        entries = entries.filter((e) => e.timestamp <= endDate)
=======
        entries = entries.filter((e) => e.timestamp >= filters.startDate!)
      }

      if (filters?.endDate) {
        entries = entries.filter((e) => e.timestamp <= filters.endDate!)
>>>>>>> 18c2136 (feat(enterprise): add enterprise package with analytics, compliance, and CRM)
      }

      if (filters?.action) {
        entries = entries.filter((e) => e.action === filters.action)
      }

      if (filters?.actor) {
        entries = entries.filter((e) => e.actor === filters.actor)
      }

      if (filters?.resource) {
        entries = entries.filter((e) => e.resource === filters.resource)
      }

      if (filters?.result) {
        entries = entries.filter((e) => e.result === filters.result)
      }

      return entries
    },

    exportLog(format: 'json' | 'csv'): string {
      const entries = auditEntries.value

      if (format === 'json') {
        return JSON.stringify(entries, null, 2)
      }

      // CSV format
      const headers = [
        'id',
        'timestamp',
        'action',
        'actor',
        'resource',
        'resourceId',
        'result',
        'ipAddress',
        'details',
      ]
      const rows = entries.map((entry) => [
        entry.id,
        entry.timestamp.toISOString(),
        entry.action,
        entry.actor,
        entry.resource,
        entry.resourceId || '',
        entry.result,
        entry.ipAddress || '',
        entry.details ? JSON.stringify(entry.details) : '',
      ])

      return [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n')
    },
  }

  // ============================================
  // Data Retention Functions
  // ============================================

  const dataRetention: DataRetention = {
    policies: retentionPolicies,

    addPolicy(policy: DataRetentionPolicy): void {
      // Remove existing policy for same data type
      retentionPolicies.value = retentionPolicies.value.filter(
        (p) => p.dataType !== policy.dataType
      )
      retentionPolicies.value = [...retentionPolicies.value, policy]

      if (config.auditEnabled) {
        logAuditEntry('retention_policy_added', 'policy', {
          dataType: policy.dataType,
          retentionDays: policy.retentionDays,
          action: policy.action,
        })
      }
    },

    removePolicy(dataType: RetentionDataType): void {
      retentionPolicies.value = retentionPolicies.value.filter((p) => p.dataType !== dataType)

      if (config.auditEnabled) {
        logAuditEntry('retention_policy_removed', 'policy', { dataType })
      }
    },

    checkRetention(dataType: string, createdAt: Date): { expired: boolean; daysRemaining: number } {
      const policy = retentionPolicies.value.find((p) => p.dataType === dataType)

      if (!policy) {
        return { expired: false, daysRemaining: -1 } // No policy means infinite retention
      }

      const now = new Date()
      const ageMs = now.getTime() - createdAt.getTime()
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
      const daysRemaining = policy.retentionDays - ageDays

      return {
        expired: daysRemaining <= 0,
        daysRemaining: Math.max(0, daysRemaining),
      }
    },
  }

  // ============================================
  // GDPR Functions
  // ============================================

  const gdpr: GDPR = {
    async exportUserData(userId: string): Promise<GDPRDataExport> {
      if (config.auditEnabled) {
        logAuditEntry('gdpr_export_requested', 'user', { userId })
      }

      // Collect all data related to user
      const personalData = userData.value.get(userId) || {}

      // Filter consent records for this user (assuming userId is in metadata)
      const userConsents = consents.value.filter((c) => c.metadata?.userId === userId)

      // Filter audit entries for this user
      const userAuditEntries = auditEntries.value.filter(
        (e) =>
          e.actor === userId ||
          (e.details && (e.details as Record<string, unknown>).userId === userId)
      )

      const exportData: GDPRDataExport = {
        userId,
        exportedAt: new Date(),
        personalData,
        callRecords: [], // Would be populated from call storage
        consentRecords: userConsents,
        auditEntries: userAuditEntries,
      }

      if (config.auditEnabled) {
        logAuditEntry('gdpr_export_completed', 'user', {
          userId,
          dataSize: JSON.stringify(exportData).length,
        })
      }

      return exportData
    },

    async deleteUserData(userId: string): Promise<void> {
      if (config.auditEnabled) {
        logAuditEntry('gdpr_deletion_requested', 'user', { userId })
      }

      // Delete personal data
      userData.value.delete(userId)

      // Anonymize consent records instead of deleting (for audit trail)
      consents.value = consents.value.map((c) => {
        if (c.metadata?.userId === userId) {
          return {
            ...c,
            metadata: { ...c.metadata, userId: 'DELETED', deleted: true },
          }
        }
        return c
      })

      // Mark audit entries as anonymized (don't delete for compliance)
      auditEntries.value = auditEntries.value.map((e) => {
        if (e.actor === userId) {
          return { ...e, actor: 'ANONYMIZED' }
        }
        if (e.details && (e.details as Record<string, unknown>).userId === userId) {
          return {
            ...e,
            details: { ...e.details, userId: 'ANONYMIZED' },
          }
        }
        return e
      })

      if (config.auditEnabled) {
        logAuditEntry('gdpr_deletion_completed', 'user', { userId })
      }
    },

    anonymizeData(data: Record<string, unknown>): Record<string, unknown> {
      const sensitiveFields = ['name', 'email', 'phone', 'address', 'ssn', 'dob', 'ip', 'userId']

      const anonymized: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(data)) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          // Anonymize sensitive fields
          if (typeof value === 'string') {
            anonymized[key] = '[ANONYMIZED]'
          } else {
            anonymized[key] = null
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively anonymize nested objects
          anonymized[key] = gdpr.anonymizeData(value as Record<string, unknown>)
        } else {
          anonymized[key] = value
        }
      }

      return anonymized
    },
  }

  // ============================================
  // Compliance Validation
  // ============================================

  function validateCompliance(): { isValid: boolean; violations: string[] } {
    const violations: string[] = []

    // PCI-DSS checks
    if (activeRegulations.value.includes('PCI-DSS')) {
      if (!config.pciMode?.pauseRecordingOnCard) {
        violations.push('PCI-DSS: Auto-pause recording on card detection is disabled')
      }
      if (!config.auditEnabled) {
        violations.push('PCI-DSS: Audit logging is required but disabled')
      }
    }

    // HIPAA checks
    if (activeRegulations.value.includes('HIPAA')) {
      if (!config.hipaaMode?.accessLogging && !config.auditEnabled) {
        violations.push('HIPAA: Access logging is required but disabled')
      }
      if (!config.hipaaMode?.encryptTranscripts) {
        violations.push('HIPAA: Transcript encryption is recommended but disabled')
      }
    }

    // GDPR checks
    if (activeRegulations.value.includes('GDPR')) {
      if (!config.gdprMode?.consentTracking && !config.consentRequired) {
        violations.push('GDPR: Consent tracking is required but disabled')
      }
      if (!config.gdprMode?.rightToErasure) {
        violations.push('GDPR: Right to erasure must be supported')
      }
    }

    // Data retention checks
    if (config.retentionDays && retentionPolicies.value.length === 0) {
      violations.push('Data retention configured but no policies defined')
    }

    const isValid = violations.length === 0

    // Update compliance status
    for (const reg of activeRegulations.value) {
      const regViolations = violations.filter((v) => v.startsWith(reg))
      complianceStatus.value.set(reg, regViolations.length === 0)
    }

    return { isValid, violations }
  }

  // ============================================
  // Computed Properties
  // ============================================

  const isCompliant = computed(() => {
    return Array.from(complianceStatus.value.values()).every((status) => status)
  })

  // ============================================
  // Watchers
  // ============================================

  // Auto-validate compliance when regulations change
  watch(
    activeRegulations,
    () => {
      validateCompliance()
    },
    { deep: true }
  )

  // Initial validation
  validateCompliance()

  // ============================================
  // Return
  // ============================================

  return {
    // State
    activeRegulations,
    isCompliant,
    complianceStatus,

    // PCI Mode
    pciMode,

    // Consent Management
    consentManager,

    // Audit Logging
    auditLog,

    // Data Retention
    dataRetention,

    // GDPR
    gdpr,

    // Utilities
    detectCreditCard,
    maskSensitiveData,
    validateCompliance,
  }
}
