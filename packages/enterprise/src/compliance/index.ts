/**
 * @vuesip/enterprise - Compliance Module
 *
 * Provides compliance and regulatory features for VueSIP including:
 * - PCI-DSS: Credit card detection, recording pause, secure input
 * - HIPAA: PHI protection, access logging, data minimization
 * - GDPR: Consent management, right to erasure, data portability
 * - Audit logging and data retention policies
 *
 * @module compliance
 */

// Main composable
export {
  useCompliance,
  luhnValidate,
  detectCardType,
  type UseComplianceReturn,
  type PCIMode,
  type ConsentManager,
  type AuditLog,
  type DataRetention,
  type GDPR,
} from './useCompliance'

// Types
export type {
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
  RetentionAction,
  PCICardDetection,
  CardType,
  GDPRDataExport,
  PHIDetection,
  PHICategory,
} from './types'
