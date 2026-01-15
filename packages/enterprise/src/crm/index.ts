/**
 * @vuesip/enterprise - CRM Integration Module
 *
 * Provides CRM integration capabilities for VueSIP including:
 * - Contact lookup and screen pop
 * - Call logging and history
 * - Activity and follow-up management
 * - Adapters for Salesforce, HubSpot, and custom webhooks
 */

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
} from './types'

// Composable
export { useCRM, type UseCRMOptions, type UseCRMReturn } from './useCRM'

// Adapters
export { SalesforceAdapter } from './adapters/SalesforceAdapter'
export { HubSpotAdapter } from './adapters/HubSpotAdapter'
export {
  WebhookAdapter,
  createWebhookAdapter,
  type WebhookEndpoint,
  type WebhookEndpoints,
  type WebhookAdapterConfig,
} from './adapters/WebhookAdapter'
