/**
 * @vuesip/enterprise - Compliance Types
 *
 * Type definitions for regulatory compliance features including
 * PCI-DSS, HIPAA, and GDPR support.
 *
 * @module compliance/types
 */

/**
 * Supported regulatory frameworks
 */
export type RegulationType = 'PCI-DSS' | 'HIPAA' | 'GDPR'

/**
 * Configuration for compliance features
 */
export interface ComplianceConfig {
  /** Active regulatory frameworks to enforce */
  regulations: RegulationType[]

  /** Whether consent is required before recording/processing */
  consentRequired?: boolean

  /** Default data retention period in days */
  retentionDays?: number

  /** Enable audit logging */
  auditEnabled?: boolean

  /** PCI-DSS specific configuration */
  pciMode?: {
    /** Automatically pause recording when card data detected */
    pauseRecordingOnCard?: boolean
    /** Mask DTMF tones during card entry */
    maskDTMF?: boolean
    /** Enable secure input mode for card entry */
    secureInputEnabled?: boolean
  }

  /** HIPAA specific configuration */
  hipaaMode?: {
    /** Encrypt all transcripts containing PHI */
    encryptTranscripts?: boolean
    /** Apply data minimization principles */
    minimizeData?: boolean
    /** Log all access to PHI */
    accessLogging?: boolean
  }

  /** GDPR specific configuration */
  gdprMode?: {
    /** Track consent with detailed records */
    consentTracking?: boolean
    /** Support right to erasure requests */
    rightToErasure?: boolean
    /** Support data portability requests */
    dataPortability?: boolean
  }
}

/**
 * Types of consent that can be recorded
 */
export type ConsentType = 'recording' | 'transcription' | 'data_processing' | 'marketing'

/**
 * Methods by which consent can be obtained
 */
export type ConsentMethod = 'verbal' | 'ivr' | 'web' | 'written'

/**
 * Record of consent given or denied
 */
export interface ConsentRecord {
  /** Unique identifier for this consent record */
  id: string

  /** Associated call ID */
  callId: string

  /** Type of consent */
  type: ConsentType

  /** Whether consent was granted */
  granted: boolean

  /** When consent was recorded */
  timestamp: Date

  /** Method by which consent was obtained */
  method: ConsentMethod

  /** When consent expires (optional) */
  expiresAt?: Date

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Result of audit log operations
 */
export type AuditResult = 'success' | 'failure' | 'denied'

/**
 * Entry in the audit log
 */
export interface AuditLogEntry {
  /** Unique identifier for this entry */
  id: string

  /** When the action occurred */
  timestamp: Date

  /** Description of the action taken */
  action: string

  /** User or system that performed the action */
  actor: string

  /** Resource type affected (e.g., 'call', 'recording', 'contact') */
  resource: string

  /** Identifier of the specific resource affected */
  resourceId?: string

  /** Additional details about the action */
  details?: Record<string, unknown>

  /** IP address of the actor (if applicable) */
  ipAddress?: string

  /** User agent string (if applicable) */
  userAgent?: string

  /** Result of the action */
  result: AuditResult
}

/**
 * Data types subject to retention policies
 */
export type RetentionDataType = 'recording' | 'transcription' | 'metadata' | 'consent' | 'audit'

/**
 * Actions to take when retention period expires
 */
export type RetentionAction = 'delete' | 'archive' | 'anonymize'

/**
 * Policy for data retention
 */
export interface DataRetentionPolicy {
  /** Type of data this policy applies to */
  dataType: RetentionDataType

  /** Number of days to retain data */
  retentionDays: number

  /** Action to take when retention period expires */
  action: RetentionAction
}

/**
 * Supported credit card types
 */
export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other'

/**
 * Result of credit card detection
 */
export interface PCICardDetection {
  /** Whether a card number was detected */
  detected: boolean

  /** Type of card detected (if any) */
  cardType?: CardType

  /** When detection occurred */
  timestamp?: Date

  /** Masked card number (first 4, last 4) for logging */
  maskedNumber?: string
}

/**
 * Filters for querying audit log entries
 */
export interface AuditLogFilters {
  /** Start date for filtering */
  startDate?: Date

  /** End date for filtering */
  endDate?: Date

  /** Filter by action type */
  action?: string

  /** Filter by actor */
  actor?: string

  /** Filter by resource type */
  resource?: string

  /** Filter by result */
  result?: AuditResult
}

/**
 * GDPR data export format
 */
export interface GDPRDataExport {
  /** User identifier */
  userId: string

  /** Export timestamp */
  exportedAt: Date

  /** Personal data */
  personalData: Record<string, unknown>

  /** Call records */
  callRecords: Record<string, unknown>[]

  /** Consent records */
  consentRecords: ConsentRecord[]

  /** Audit entries related to user */
  auditEntries: AuditLogEntry[]
}

/**
 * PHI detection patterns for HIPAA
 */
export interface PHIDetection {
  /** Whether PHI was detected */
  detected: boolean

  /** Categories of PHI detected */
  categories: PHICategory[]

  /** Timestamp of detection */
  timestamp?: Date
}

/**
 * Categories of Protected Health Information
 */
export type PHICategory =
  | 'name'
  | 'date'
  | 'phone'
  | 'email'
  | 'ssn'
  | 'medical_record'
  | 'health_plan'
  | 'account'
  | 'license'
  | 'vehicle'
  | 'device'
  | 'url'
  | 'ip'
  | 'biometric'
  | 'photo'
  | 'other'
