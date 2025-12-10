/**
 * OAuth2 type definitions for VueSip
 *
 * Provides comprehensive type definitions for OAuth2 authentication,
 * user auto-provisioning, and SIP credential mapping.
 *
 * @packageDocumentation
 */

/**
 * Supported OAuth2 providers
 */
export type OAuth2ProviderType =
  | 'google'
  | 'microsoft'
  | 'github'
  | 'okta'
  | 'auth0'
  | 'keycloak'
  | 'custom'

/**
 * OAuth2 grant types supported
 */
export type OAuth2GrantType =
  | 'authorization_code'
  | 'authorization_code_pkce'
  | 'implicit'
  | 'client_credentials'

/**
 * OAuth2 token response from provider
 */
export interface OAuth2TokenResponse {
  /** Access token for API calls */
  access_token: string
  /** Token type (usually 'Bearer') */
  token_type: string
  /** Token expiration time in seconds */
  expires_in: number
  /** Refresh token for obtaining new access tokens */
  refresh_token?: string
  /** Granted scopes */
  scope?: string
  /** ID token (OpenID Connect) */
  id_token?: string
}

/**
 * OAuth2 user info from provider
 */
export interface OAuth2UserInfo {
  /** Unique user identifier from provider */
  sub: string
  /** User's email address */
  email?: string
  /** Whether email is verified */
  email_verified?: boolean
  /** User's display name */
  name?: string
  /** User's given (first) name */
  given_name?: string
  /** User's family (last) name */
  family_name?: string
  /** User's preferred username */
  preferred_username?: string
  /** URL to user's profile picture */
  picture?: string
  /** User's locale */
  locale?: string
  /** Token expiration timestamp */
  exp?: number
  /** Token issued at timestamp */
  iat?: number
  /** Token issuer */
  iss?: string
  /** Token audience */
  aud?: string | string[]
  /** Additional custom claims */
  [key: string]: unknown
}

/**
 * PKCE (Proof Key for Code Exchange) parameters
 */
export interface PKCEParams {
  /** Code verifier (random string) */
  codeVerifier: string
  /** Code challenge (derived from verifier) */
  codeChallenge: string
  /** Challenge method (always S256 for security) */
  codeChallengeMethod: 'S256'
}

/**
 * OAuth2 provider configuration
 */
export interface OAuth2ProviderConfig {
  /** Provider type identifier */
  type: OAuth2ProviderType
  /** OAuth2 client ID */
  clientId: string
  /** OAuth2 client secret (for confidential clients - NOT for SPAs) */
  clientSecret?: string
  /** Authorization endpoint URL */
  authorizationEndpoint: string
  /** Token endpoint URL */
  tokenEndpoint: string
  /** User info endpoint URL */
  userInfoEndpoint?: string
  /** Token revocation endpoint URL */
  revocationEndpoint?: string
  /** JWKS (JSON Web Key Set) endpoint URL */
  jwksEndpoint?: string
  /** Issuer URL for token validation */
  issuer?: string
  /** Redirect URI after authentication */
  redirectUri: string
  /** Requested OAuth2 scopes */
  scopes: string[]
  /** OAuth2 grant type to use */
  grantType: OAuth2GrantType
  /** Use PKCE for authorization code flow (recommended for SPAs) */
  usePKCE?: boolean
  /** Additional authorization parameters */
  additionalParams?: Record<string, string>
  /** Response type (code, token, id_token) */
  responseType?: string
  /** Response mode (query, fragment, form_post) */
  responseMode?: 'query' | 'fragment' | 'form_post'
}

/**
 * Pre-configured OAuth2 provider templates
 */
export const OAuth2ProviderTemplates: Record<OAuth2ProviderType, Partial<OAuth2ProviderConfig>> = {
  google: {
    type: 'google',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    jwksEndpoint: 'https://www.googleapis.com/oauth2/v3/certs',
    issuer: 'https://accounts.google.com',
    scopes: ['openid', 'email', 'profile'],
    grantType: 'authorization_code_pkce',
    usePKCE: true,
    responseType: 'code',
  },
  microsoft: {
    type: 'microsoft',
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo',
    jwksEndpoint: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    issuer: 'https://login.microsoftonline.com/{tenant}/v2.0',
    scopes: ['openid', 'email', 'profile', 'User.Read'],
    grantType: 'authorization_code_pkce',
    usePKCE: true,
    responseType: 'code',
  },
  github: {
    type: 'github',
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    userInfoEndpoint: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
    grantType: 'authorization_code',
    usePKCE: false, // GitHub doesn't support PKCE yet
    responseType: 'code',
  },
  okta: {
    type: 'okta',
    // Okta requires domain-specific endpoints
    scopes: ['openid', 'email', 'profile'],
    grantType: 'authorization_code_pkce',
    usePKCE: true,
    responseType: 'code',
  },
  auth0: {
    type: 'auth0',
    // Auth0 requires domain-specific endpoints
    scopes: ['openid', 'email', 'profile'],
    grantType: 'authorization_code_pkce',
    usePKCE: true,
    responseType: 'code',
  },
  keycloak: {
    type: 'keycloak',
    // Keycloak requires realm-specific endpoints
    scopes: ['openid', 'email', 'profile'],
    grantType: 'authorization_code_pkce',
    usePKCE: true,
    responseType: 'code',
  },
  custom: {
    type: 'custom',
    scopes: ['openid'],
    grantType: 'authorization_code_pkce',
    usePKCE: true,
    responseType: 'code',
  },
}

/**
 * SIP credential mapping from OAuth2 user info
 */
export interface SipCredentialMapping {
  /** Field to use for SIP username (from OAuth2 user info) */
  usernameField: keyof OAuth2UserInfo | string
  /** Field to use for SIP display name */
  displayNameField?: keyof OAuth2UserInfo | string
  /** SIP domain to use */
  sipDomain: string
  /** SIP realm for authentication */
  sipRealm?: string
  /** WebSocket server URI */
  wsServerUri: string
  /** Strategy for generating SIP password */
  passwordStrategy: SipPasswordStrategy
  /** Custom username transformer */
  usernameTransformer?: (userInfo: OAuth2UserInfo) => string
  /** Custom display name transformer */
  displayNameTransformer?: (userInfo: OAuth2UserInfo) => string
}

/**
 * Strategy for generating SIP passwords from OAuth2 tokens
 */
export type SipPasswordStrategy =
  | { type: 'access_token' }
  | { type: 'id_token' }
  | { type: 'hash'; algorithm: 'sha256' | 'sha512'; salt?: string }
  | { type: 'api_generated'; endpoint: string; method?: 'GET' | 'POST' }
  | { type: 'static'; password: string }
  | {
      type: 'custom'
      generator: (tokens: OAuth2TokenResponse, userInfo: OAuth2UserInfo) => string | Promise<string>
    }

/**
 * Auto-provisioned SIP user credentials
 */
export interface ProvisionedSipCredentials {
  /** SIP URI (e.g., sip:user@domain.com) */
  sipUri: string
  /** SIP username */
  username: string
  /** SIP password or token */
  password: string
  /** Display name for calls */
  displayName: string
  /** WebSocket server URI */
  wsServerUri: string
  /** SIP realm */
  realm?: string
  /** Authorization username if different */
  authorizationUsername?: string
  /** When credentials expire (based on token expiry) */
  expiresAt?: Date
  /** Original OAuth2 user info */
  oauthUserInfo: OAuth2UserInfo
  /** OAuth2 tokens for refresh */
  tokens: OAuth2TokenResponse
}

/**
 * OAuth2 authentication state
 */
export type OAuth2AuthState =
  | 'idle'
  | 'redirecting'
  | 'exchanging_code'
  | 'fetching_user_info'
  | 'provisioning'
  | 'authenticated'
  | 'error'
  | 'token_refresh'

/**
 * OAuth2 error types
 */
export interface OAuth2Error {
  /** Error code from provider */
  error: string
  /** Human-readable error description */
  error_description?: string
  /** URI with more error information */
  error_uri?: string
  /** OAuth2 state parameter */
  state?: string
}

/**
 * OAuth2 service configuration
 */
export interface OAuth2ServiceConfig {
  /** OAuth2 provider configuration */
  provider: OAuth2ProviderConfig
  /** SIP credential mapping configuration */
  credentialMapping: SipCredentialMapping
  /** Auto-refresh tokens before expiry */
  autoRefresh?: boolean
  /** Refresh tokens this many seconds before expiry */
  refreshThreshold?: number
  /** Storage key prefix for persisting tokens */
  storageKeyPrefix?: string
  /** Storage type to use */
  storageType?: 'localStorage' | 'sessionStorage' | 'memory'
  /** Enable debug logging */
  debug?: boolean
  /** Callback URL path (for handling redirects) */
  callbackPath?: string
  /** Post-login redirect URL */
  postLoginRedirect?: string
  /** Post-logout redirect URL */
  postLogoutRedirect?: string
}

/**
 * OAuth2 service return type (for composable)
 */
export interface UseOAuth2Return {
  /** Current authentication state */
  authState: import('vue').Ref<OAuth2AuthState>
  /** Whether user is authenticated */
  isAuthenticated: import('vue').ComputedRef<boolean>
  /** Current error (null if none) */
  error: import('vue').Ref<OAuth2Error | null>
  /** Current OAuth2 user info */
  userInfo: import('vue').Ref<OAuth2UserInfo | null>
  /** Provisioned SIP credentials */
  sipCredentials: import('vue').Ref<ProvisionedSipCredentials | null>
  /** Current OAuth2 tokens */
  tokens: import('vue').Ref<OAuth2TokenResponse | null>
  /** Token expiration timestamp */
  tokenExpiresAt: import('vue').Ref<Date | null>
  /** Whether token refresh is in progress */
  isRefreshing: import('vue').Ref<boolean>

  // Methods
  /** Initiate OAuth2 login flow */
  login: (options?: { prompt?: string; loginHint?: string }) => Promise<void>
  /** Handle OAuth2 callback (after redirect) */
  handleCallback: (url?: string) => Promise<ProvisionedSipCredentials>
  /** Logout and revoke tokens */
  logout: () => Promise<void>
  /** Manually refresh tokens */
  refreshTokens: () => Promise<OAuth2TokenResponse>
  /** Get current access token (auto-refresh if needed) */
  getAccessToken: () => Promise<string>
  /** Check if tokens are expired */
  isTokenExpired: () => boolean
  /** Clear stored auth data */
  clearAuth: () => void
}

/**
 * OAuth2 provider service interface
 */
export interface OAuth2ProviderService {
  /** Provider type */
  readonly type: OAuth2ProviderType
  /** Provider configuration */
  readonly config: OAuth2ProviderConfig

  /** Generate authorization URL */
  getAuthorizationUrl(state: string, pkce?: PKCEParams): string
  /** Exchange authorization code for tokens */
  exchangeCode(code: string, pkce?: PKCEParams): Promise<OAuth2TokenResponse>
  /** Refresh access token */
  refreshToken(refreshToken: string): Promise<OAuth2TokenResponse>
  /** Fetch user info from provider */
  fetchUserInfo(accessToken: string): Promise<OAuth2UserInfo>
  /** Revoke token */
  revokeToken(token: string, tokenType?: 'access_token' | 'refresh_token'): Promise<void>
  /** Validate ID token (if applicable) */
  validateIdToken?(idToken: string): Promise<OAuth2UserInfo>
}

/**
 * User provisioning service interface
 */
export interface UserProvisioningService {
  /** Provision SIP credentials from OAuth2 user info */
  provisionUser(
    userInfo: OAuth2UserInfo,
    tokens: OAuth2TokenResponse,
    mapping: SipCredentialMapping
  ): Promise<ProvisionedSipCredentials>

  /** Update provisioned credentials (e.g., on token refresh) */
  updateCredentials(
    existing: ProvisionedSipCredentials,
    newTokens: OAuth2TokenResponse
  ): Promise<ProvisionedSipCredentials>

  /** Deprovision/cleanup user credentials */
  deprovisionUser(credentials: ProvisionedSipCredentials): Promise<void>
}

/**
 * Token storage interface
 */
export interface OAuth2TokenStorage {
  /** Store tokens */
  store(key: string, data: OAuth2StoredData): Promise<void>
  /** Retrieve tokens */
  retrieve(key: string): Promise<OAuth2StoredData | null>
  /** Remove tokens */
  remove(key: string): Promise<void>
  /** Clear all OAuth2 data */
  clear(): Promise<void>
}

/**
 * Data structure for stored OAuth2 data
 */
export interface OAuth2StoredData {
  /** OAuth2 tokens */
  tokens: OAuth2TokenResponse
  /** User info */
  userInfo: OAuth2UserInfo
  /** Provisioned SIP credentials */
  sipCredentials: ProvisionedSipCredentials
  /** When data was stored */
  storedAt: string
  /** When tokens expire */
  expiresAt: string
  /** PKCE verifier (for pending auth flows) */
  pkceVerifier?: string
  /** OAuth2 state (for CSRF protection) */
  state?: string
}

/**
 * Events emitted by OAuth2 service
 */
export interface OAuth2Events {
  /** Emitted when authentication state changes */
  'oauth:state_changed': { state: OAuth2AuthState; previousState: OAuth2AuthState }
  /** Emitted on successful authentication */
  'oauth:authenticated': { userInfo: OAuth2UserInfo; credentials: ProvisionedSipCredentials }
  /** Emitted on authentication error */
  'oauth:error': { error: OAuth2Error }
  /** Emitted when tokens are refreshed */
  'oauth:tokens_refreshed': { tokens: OAuth2TokenResponse }
  /** Emitted on logout */
  'oauth:logout': void
  /** Emitted when SIP credentials are provisioned */
  'oauth:credentials_provisioned': { credentials: ProvisionedSipCredentials }
}
