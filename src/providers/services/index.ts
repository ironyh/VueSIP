/**
 * Provider API Services
 *
 * Services for interacting with provider APIs to fetch credentials
 * and enable auto-configuration for VoIP providers.
 *
 * @module providers/services
 */

// Telnyx API service
export {
  fetchCredentials as fetchTelnyxCredentials,
  fetchConnections as fetchTelnyxConnections,
  fetchCredentialById as fetchTelnyxCredentialById,
  validateApiKey as validateTelnyxApiKey,
  formatCredentialDisplay as formatTelnyxCredentialDisplay,
  isCredentialExpired as isTelnyxCredentialExpired,
  filterActiveCredentials as filterTelnyxActiveCredentials,
  type TelnyxCredential,
  type TelnyxConnection,
  type TelnyxCredentialsResponse,
  type TelnyxConnectionsResponse,
  type TelnyxApiCredentials,
  type TelnyxApiError,
} from './telnyxApiService'
