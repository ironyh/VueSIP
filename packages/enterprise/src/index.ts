/**
 * @vuesip/enterprise
 *
 * Enterprise features for VueSIP including:
 * - CRM integration (Salesforce, HubSpot, custom webhooks)
 * - Compliance and regulatory features (PCI-DSS, HIPAA, GDPR)
 * - Analytics and reporting
 *
 * @packageDocumentation
 */

// ============================================
// CRM Module
// ============================================

// Types
export type {
  CRMAdapter,
  CRMConfig,
  CRMError,
  CRMEvents,
  Contact,
  CallRecord,
  Activity,
  ContactSearchResult,
  ContactSearchOptions,
  CRMAdapterFactory,
  CRMAdapterRegistry,
} from './crm/types'

// Composable
export { useCRM, type UseCRMOptions, type UseCRMReturn } from './crm/useCRM'

// Adapters
export { SalesforceAdapter } from './crm/adapters/SalesforceAdapter'
export { HubSpotAdapter } from './crm/adapters/HubSpotAdapter'
export {
  WebhookAdapter,
  createWebhookAdapter,
  type WebhookEndpoint,
  type WebhookEndpoints,
  type WebhookAdapterConfig,
} from './crm/adapters/WebhookAdapter'

// ============================================
// Compliance Module
// ============================================

// Main composable and utilities
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
} from './compliance'

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
} from './compliance'

// ============================================
// Analytics Module
// ============================================

// Main composable
export { useCallAnalytics, type UseCallAnalyticsReturn } from './analytics'

// Types
export type {
  CallMetrics,
  AgentMetrics,
  QueueMetrics,
  SentimentMetrics,
  TimeRange,
  DataPoint,
  AnalyticsConfig,
  CallOutcome,
  AgentState,
  CallRecordData,
  CallRecord as AnalyticsCallRecord,
  AgentStateRecord,
  QueueStateRecord,
  ReportOptions,
} from './analytics'

// Renderless Components
export { VueSipCallVolume, type CallVolumeSlotProps, type TimeRangePreset } from './analytics'

export { VueSipAgentPerformance, type AgentPerformanceSlotProps } from './analytics'

export { VueSipSentimentTrends, type SentimentTrendsSlotProps } from './analytics'

export { VueSipQueueHealth, type QueueHealthSlotProps, type QueueHealthStatus } from './analytics'

// Legacy exports (deprecated)
export { useAnalytics, type AnalyticsEvent } from './analytics'
