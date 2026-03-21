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

// 46elks API service
export {
  fetchNumbers,
  fetchNumberDetails,
  filterActiveNumbers,
  formatPhoneForSip,
  fetchCalls,
  fetchCallsWithPagination,
  fetchAllCalls,
  originateCall,
  type Elks46ApiCredentials,
  type Elks46Number,
  type Elks46CallDirection,
  type Elks46CallState,
  type Elks46CallLeg,
  type Elks46Call,
  type Elks46CallLegReadonly,
  type Elks46CallReadonly,
  type FetchCallsOptions,
  type Elks46OriginateOptions,
  type Elks46OriginateResponse,
} from './elks46ApiService'
