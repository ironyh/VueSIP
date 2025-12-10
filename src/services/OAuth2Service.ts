/**
 * OAuth2Service - Unified OAuth2 Authentication Service
 *
 * Provides OAuth2 authentication with automatic SIP user provisioning.
 * Supports multiple OAuth2 providers (Google, Microsoft, GitHub, etc.)
 * with PKCE for enhanced security in SPAs.
 *
 * @module services/OAuth2Service
 */

import { ref, computed, watch } from 'vue'
import type {
  OAuth2ServiceConfig,
  OAuth2ProviderConfig,
  OAuth2TokenResponse,
  OAuth2UserInfo,
  OAuth2AuthState,
  OAuth2Error,
  PKCEParams,
  ProvisionedSipCredentials,
  SipCredentialMapping,
  OAuth2StoredData,
  UseOAuth2Return,
} from '@/types/oauth.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('OAuth2Service')

// ============================================================================
// PKCE Utilities
// ============================================================================

/**
 * Generate a cryptographically random string for PKCE
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join('')
}

/**
 * Generate SHA-256 hash and encode as base64url
 */
async function sha256Base64Url(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generate PKCE parameters (code verifier and challenge)
 */
export async function generatePKCE(): Promise<PKCEParams> {
  const codeVerifier = generateRandomString(128)
  const codeChallenge = await sha256Base64Url(codeVerifier)
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  }
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return generateRandomString(32)
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Get storage adapter based on configuration
 */
function getStorage(
  type: 'localStorage' | 'sessionStorage' | 'memory'
): Storage | Map<string, string> {
  if (type === 'memory') {
    return new Map<string, string>()
  }
  return type === 'sessionStorage' ? sessionStorage : localStorage
}

/**
 * OAuth2 token storage manager
 */
class TokenStorageManager {
  private storage: Storage | Map<string, string>
  private prefix: string

  constructor(type: 'localStorage' | 'sessionStorage' | 'memory', prefix: string) {
    this.storage = getStorage(type)
    this.prefix = prefix
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async store(key: string, data: OAuth2StoredData): Promise<void> {
    const fullKey = this.getKey(key)
    const serialized = JSON.stringify(data)
    if (this.storage instanceof Map) {
      this.storage.set(fullKey, serialized)
    } else {
      this.storage.setItem(fullKey, serialized)
    }
  }

  async retrieve(key: string): Promise<OAuth2StoredData | null> {
    const fullKey = this.getKey(key)
    let data: string | null
    if (this.storage instanceof Map) {
      data = this.storage.get(fullKey) || null
    } else {
      data = this.storage.getItem(fullKey)
    }
    if (!data) return null
    try {
      return JSON.parse(data) as OAuth2StoredData
    } catch {
      return null
    }
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.getKey(key)
    if (this.storage instanceof Map) {
      this.storage.delete(fullKey)
    } else {
      this.storage.removeItem(fullKey)
    }
  }

  async clear(): Promise<void> {
    if (this.storage instanceof Map) {
      for (const key of this.storage.keys()) {
        if (key.startsWith(this.prefix)) {
          this.storage.delete(key)
        }
      }
    } else {
      const storage = this.storage as Storage
      const keysToRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => storage.removeItem(key))
    }
  }

  async storePKCE(state: string, pkce: PKCEParams): Promise<void> {
    await this.store(`pkce_${state}`, {
      tokens: {} as OAuth2TokenResponse,
      userInfo: {} as OAuth2UserInfo,
      sipCredentials: {} as ProvisionedSipCredentials,
      storedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
      pkceVerifier: pkce.codeVerifier,
      state,
    })
  }

  async retrievePKCE(state: string): Promise<string | null> {
    const data = await this.retrieve(`pkce_${state}`)
    if (!data?.pkceVerifier) return null
    // Check if expired
    if (new Date(data.expiresAt) < new Date()) {
      await this.remove(`pkce_${state}`)
      return null
    }
    return data.pkceVerifier
  }

  async removePKCE(state: string): Promise<void> {
    await this.remove(`pkce_${state}`)
  }
}

// ============================================================================
// User Provisioning
// ============================================================================

/**
 * Generate SIP password based on strategy
 */
async function generateSipPassword(
  strategy: SipCredentialMapping['passwordStrategy'],
  tokens: OAuth2TokenResponse,
  userInfo: OAuth2UserInfo
): Promise<string> {
  switch (strategy.type) {
    case 'access_token':
      return tokens.access_token

    case 'id_token':
      if (!tokens.id_token) {
        throw new Error('ID token not available for password generation')
      }
      return tokens.id_token

    case 'hash': {
      const input = `${userInfo.sub}:${tokens.access_token}${strategy.salt || ''}`
      const encoder = new TextEncoder()
      const data = encoder.encode(input)
      const algorithm = strategy.algorithm === 'sha512' ? 'SHA-512' : 'SHA-256'
      const hash = await crypto.subtle.digest(algorithm, data)
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }

    case 'api_generated': {
      const response = await fetch(strategy.endpoint, {
        method: strategy.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({ userInfo }),
      })
      if (!response.ok) {
        throw new Error(`Failed to generate password from API: ${response.statusText}`)
      }
      const result = await response.json()
      return result.password
    }

    case 'static':
      return strategy.password

    case 'custom':
      return await strategy.generator(tokens, userInfo)

    default:
      throw new Error(`Unknown password strategy: ${(strategy as { type: string }).type}`)
  }
}

/**
 * Provision SIP credentials from OAuth2 user info
 */
async function provisionSipCredentials(
  userInfo: OAuth2UserInfo,
  tokens: OAuth2TokenResponse,
  mapping: SipCredentialMapping
): Promise<ProvisionedSipCredentials> {
  // Extract username
  let username: string
  if (mapping.usernameTransformer) {
    username = mapping.usernameTransformer(userInfo)
  } else {
    const fieldValue = userInfo[mapping.usernameField as keyof OAuth2UserInfo]
    if (!fieldValue) {
      throw new Error(`Username field '${mapping.usernameField}' not found in user info`)
    }
    username = String(fieldValue)
    // Sanitize username for SIP (remove special characters, lowercase)
    username = username
      .replace(/@.*$/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase()
  }

  // Extract display name
  let displayName: string
  if (mapping.displayNameTransformer) {
    displayName = mapping.displayNameTransformer(userInfo)
  } else if (mapping.displayNameField) {
    displayName = String(userInfo[mapping.displayNameField as keyof OAuth2UserInfo] || username)
  } else {
    displayName = userInfo.name || userInfo.preferred_username || username
  }

  // Generate password
  const password = await generateSipPassword(mapping.passwordStrategy, tokens, userInfo)

  // Calculate expiration
  const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined

  const sipUri = `sip:${username}@${mapping.sipDomain}`

  return {
    sipUri,
    username,
    password,
    displayName,
    wsServerUri: mapping.wsServerUri,
    realm: mapping.sipRealm || mapping.sipDomain,
    authorizationUsername: username,
    expiresAt,
    oauthUserInfo: userInfo,
    tokens,
  }
}

// ============================================================================
// OAuth2 Service Implementation
// ============================================================================

export interface OAuth2ServiceReturn extends UseOAuth2Return {
  /** Service configuration */
  config: OAuth2ServiceConfig
  /** Storage manager */
  storage: TokenStorageManager
  /** Initialize service (restore from storage) */
  initialize: () => Promise<void>
}

/**
 * Create OAuth2 Service instance
 *
 * @example
 * ```typescript
 * const oauth2 = createOAuth2Service({
 *   provider: {
 *     type: 'google',
 *     clientId: 'your-client-id',
 *     redirectUri: 'https://your-app.com/oauth/callback',
 *     ...OAuth2ProviderTemplates.google,
 *   },
 *   credentialMapping: {
 *     usernameField: 'email',
 *     displayNameField: 'name',
 *     sipDomain: 'sip.example.com',
 *     wsServerUri: 'wss://sip.example.com:7443',
 *     passwordStrategy: { type: 'access_token' },
 *   },
 * })
 *
 * // Login
 * await oauth2.login()
 *
 * // Handle callback (in callback page)
 * const credentials = await oauth2.handleCallback()
 *
 * // Use credentials with SIP client
 * console.log(credentials.sipUri, credentials.password)
 * ```
 */
export function createOAuth2Service(config: OAuth2ServiceConfig): OAuth2ServiceReturn {
  const {
    provider,
    credentialMapping,
    autoRefresh = true,
    refreshThreshold = 300, // 5 minutes
    storageKeyPrefix = 'vuesip_oauth2_',
    storageType = 'localStorage',
    debug = false,
  } = config

  // ============================================================================
  // State
  // ============================================================================

  const authState = ref<OAuth2AuthState>('idle')
  const error = ref<OAuth2Error | null>(null)
  const userInfo = ref<OAuth2UserInfo | null>(null)
  const sipCredentials = ref<ProvisionedSipCredentials | null>(null)
  const tokens = ref<OAuth2TokenResponse | null>(null)
  const tokenExpiresAt = ref<Date | null>(null)
  const isRefreshing = ref(false)

  // Computed
  const isAuthenticated = computed(() => authState.value === 'authenticated')

  // Storage
  const storage = new TokenStorageManager(storageType, storageKeyPrefix)

  // Refresh timer
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  // ============================================================================
  // Helper Functions
  // ============================================================================

  function setState(newState: OAuth2AuthState): void {
    const previousState = authState.value
    authState.value = newState
    if (debug) {
      logger.debug(`OAuth2 state: ${previousState} → ${newState}`)
    }
  }

  function setError(err: OAuth2Error): void {
    error.value = err
    setState('error')
    logger.error('OAuth2 error', err)
  }

  function clearError(): void {
    error.value = null
  }

  function scheduleRefresh(): void {
    if (!autoRefresh || !tokens.value?.refresh_token || !tokenExpiresAt.value) {
      return
    }

    // Clear existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    // Calculate when to refresh
    const now = Date.now()
    const expiresAt = tokenExpiresAt.value.getTime()
    const refreshAt = expiresAt - refreshThreshold * 1000

    if (refreshAt <= now) {
      // Token already needs refresh
      refreshTokens().catch((err) => {
        logger.error('Auto-refresh failed', err)
      })
    } else {
      // Schedule refresh
      const delay = refreshAt - now
      refreshTimer = setTimeout(() => {
        refreshTokens().catch((err) => {
          logger.error('Scheduled refresh failed', err)
        })
      }, delay)

      if (debug) {
        logger.debug(`Token refresh scheduled in ${Math.round(delay / 1000)}s`)
      }
    }
  }

  async function persistAuth(): Promise<void> {
    if (!tokens.value || !userInfo.value || !sipCredentials.value) {
      return
    }

    await storage.store('auth', {
      tokens: tokens.value,
      userInfo: userInfo.value,
      sipCredentials: sipCredentials.value,
      storedAt: new Date().toISOString(),
      expiresAt: tokenExpiresAt.value?.toISOString() || '',
    })
  }

  // ============================================================================
  // OAuth2 Flow Methods
  // ============================================================================

  /**
   * Build authorization URL with all parameters
   */
  function buildAuthorizationUrl(state: string, pkce?: PKCEParams): string {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: provider.responseType || 'code',
      scope: provider.scopes.join(' '),
      state,
    })

    if (pkce) {
      params.set('code_challenge', pkce.codeChallenge)
      params.set('code_challenge_method', pkce.codeChallengeMethod)
    }

    if (provider.responseMode) {
      params.set('response_mode', provider.responseMode)
    }

    if (provider.additionalParams) {
      Object.entries(provider.additionalParams).forEach(([key, value]) => {
        params.set(key, value)
      })
    }

    return `${provider.authorizationEndpoint}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async function exchangeCode(code: string, codeVerifier?: string): Promise<OAuth2TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      code,
    })

    if (codeVerifier) {
      body.set('code_verifier', codeVerifier)
    }

    if (provider.clientSecret) {
      body.set('client_secret', provider.clientSecret)
    }

    const response = await fetch(provider.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw {
        error: errorData.error || 'token_exchange_failed',
        error_description: errorData.error_description || `HTTP ${response.status}`,
      } as OAuth2Error
    }

    return await response.json()
  }

  /**
   * Fetch user info from provider
   */
  async function fetchUserInfo(accessToken: string): Promise<OAuth2UserInfo> {
    if (!provider.userInfoEndpoint) {
      // Try to decode ID token if available
      if (tokens.value?.id_token) {
        const parts = tokens.value.id_token.split('.')
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
          return payload as OAuth2UserInfo
        }
      }
      throw new Error('No user info endpoint configured and no ID token available')
    }

    const response = await fetch(provider.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw {
        error: 'userinfo_failed',
        error_description: `Failed to fetch user info: HTTP ${response.status}`,
      } as OAuth2Error
    }

    return await response.json()
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Initialize service - restore from storage if available
   */
  async function initialize(): Promise<void> {
    try {
      const stored = await storage.retrieve('auth')
      if (!stored) {
        logger.debug('No stored auth data found')
        return
      }

      // Check if tokens are expired
      const expiresAt = new Date(stored.expiresAt)
      if (expiresAt < new Date()) {
        logger.debug('Stored tokens expired')
        // Try to refresh if we have a refresh token
        if (stored.tokens.refresh_token) {
          tokens.value = stored.tokens
          await refreshTokens()
        } else {
          await storage.remove('auth')
        }
        return
      }

      // Restore state
      tokens.value = stored.tokens
      userInfo.value = stored.userInfo
      sipCredentials.value = stored.sipCredentials
      tokenExpiresAt.value = expiresAt
      setState('authenticated')

      // Schedule refresh
      scheduleRefresh()

      logger.info('Restored OAuth2 session', { sub: userInfo.value?.sub })
    } catch (err) {
      logger.error('Failed to initialize OAuth2 service', err)
    }
  }

  /**
   * Initiate OAuth2 login flow
   */
  async function login(options?: { prompt?: string; loginHint?: string }): Promise<void> {
    clearError()

    try {
      setState('redirecting')

      // Generate state for CSRF protection
      const state = generateState()

      // Generate PKCE if enabled
      let pkce: PKCEParams | undefined
      if (provider.usePKCE) {
        pkce = await generatePKCE()
        await storage.storePKCE(state, pkce)
      }

      // Build authorization URL
      let authUrl = buildAuthorizationUrl(state, pkce)

      // Add optional parameters
      if (options?.prompt) {
        authUrl += `&prompt=${encodeURIComponent(options.prompt)}`
      }
      if (options?.loginHint) {
        authUrl += `&login_hint=${encodeURIComponent(options.loginHint)}`
      }

      // Redirect to authorization endpoint
      window.location.href = authUrl
    } catch (err) {
      setError({
        error: 'login_failed',
        error_description: err instanceof Error ? err.message : 'Login failed',
      })
      throw err
    }
  }

  /**
   * Handle OAuth2 callback after redirect
   */
  async function handleCallback(url?: string): Promise<ProvisionedSipCredentials> {
    clearError()

    try {
      const callbackUrl = new URL(url || window.location.href)
      const params = new URLSearchParams(callbackUrl.search)
      const hashParams = new URLSearchParams(callbackUrl.hash.substring(1))

      // Check for errors
      const errorParam = params.get('error') || hashParams.get('error')
      if (errorParam) {
        throw {
          error: errorParam,
          error_description: params.get('error_description') || hashParams.get('error_description'),
          state: params.get('state') || hashParams.get('state'),
        } as OAuth2Error
      }

      // Get authorization code
      const code = params.get('code') || hashParams.get('code')
      const state = params.get('state') || hashParams.get('state')

      if (!code) {
        throw {
          error: 'missing_code',
          error_description: 'Authorization code not found',
        } as OAuth2Error
      }

      // Retrieve PKCE verifier if used
      let codeVerifier: string | undefined
      if (provider.usePKCE && state) {
        codeVerifier = (await storage.retrievePKCE(state)) || undefined
        if (!codeVerifier) {
          throw {
            error: 'invalid_state',
            error_description: 'PKCE verifier not found or expired',
          } as OAuth2Error
        }
        await storage.removePKCE(state)
      }

      // Exchange code for tokens
      setState('exchanging_code')
      const tokenResponse = await exchangeCode(code, codeVerifier)
      tokens.value = tokenResponse

      // Calculate expiration
      tokenExpiresAt.value = tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null

      // Fetch user info
      setState('fetching_user_info')
      const user = await fetchUserInfo(tokenResponse.access_token)
      userInfo.value = user

      // Provision SIP credentials
      setState('provisioning')
      const credentials = await provisionSipCredentials(user, tokenResponse, credentialMapping)
      sipCredentials.value = credentials

      // Persist auth data
      await persistAuth()

      // Set authenticated state
      setState('authenticated')

      // Schedule token refresh
      scheduleRefresh()

      logger.info('OAuth2 authentication successful', { sub: user.sub, sipUri: credentials.sipUri })

      return credentials
    } catch (err) {
      const oauthError = err as OAuth2Error
      if (oauthError.error) {
        setError(oauthError)
      } else {
        setError({
          error: 'callback_failed',
          error_description: err instanceof Error ? err.message : 'Callback handling failed',
        })
      }
      throw err
    }
  }

  /**
   * Refresh OAuth2 tokens
   */
  async function refreshTokens(): Promise<OAuth2TokenResponse> {
    if (!tokens.value?.refresh_token) {
      throw {
        error: 'no_refresh_token',
        error_description: 'No refresh token available',
      } as OAuth2Error
    }

    if (isRefreshing.value) {
      // Wait for existing refresh to complete
      return new Promise((resolve, reject) => {
        const unwatch = watch(isRefreshing, (refreshing) => {
          if (!refreshing) {
            unwatch()
            if (tokens.value) {
              resolve(tokens.value)
            } else {
              reject({ error: 'refresh_failed' })
            }
          }
        })
      })
    }

    isRefreshing.value = true
    const previousState = authState.value
    setState('token_refresh')

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: provider.clientId,
        refresh_token: tokens.value.refresh_token,
      })

      if (provider.clientSecret) {
        body.set('client_secret', provider.clientSecret)
      }

      const response = await fetch(provider.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw {
          error: errorData.error || 'refresh_failed',
          error_description: errorData.error_description || `HTTP ${response.status}`,
        } as OAuth2Error
      }

      const newTokens = await response.json()

      // Preserve refresh token if not returned in response
      if (!newTokens.refresh_token && tokens.value.refresh_token) {
        newTokens.refresh_token = tokens.value.refresh_token
      }

      tokens.value = newTokens
      tokenExpiresAt.value = newTokens.expires_in
        ? new Date(Date.now() + newTokens.expires_in * 1000)
        : null

      // Update SIP credentials with new tokens
      if (userInfo.value && sipCredentials.value) {
        sipCredentials.value = await provisionSipCredentials(
          userInfo.value,
          newTokens,
          credentialMapping
        )
      }

      // Persist updated auth
      await persistAuth()

      // Restore previous state
      setState(previousState === 'token_refresh' ? 'authenticated' : previousState)

      // Schedule next refresh
      scheduleRefresh()

      logger.info('Tokens refreshed successfully')

      return newTokens
    } catch (err) {
      setError(err as OAuth2Error)
      // Clear auth on refresh failure
      await clearAuth()
      throw err
    } finally {
      isRefreshing.value = false
    }
  }

  /**
   * Logout and revoke tokens
   */
  async function logout(): Promise<void> {
    // Clear refresh timer
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }

    // Revoke token if endpoint available
    if (provider.revocationEndpoint && tokens.value?.access_token) {
      try {
        await fetch(provider.revocationEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: tokens.value.access_token,
            client_id: provider.clientId,
          }).toString(),
        })
      } catch (err) {
        logger.warn('Token revocation failed', err)
      }
    }

    await clearAuth()
    logger.info('OAuth2 logout complete')
  }

  /**
   * Get current access token (auto-refresh if needed)
   */
  async function getAccessToken(): Promise<string> {
    if (!tokens.value?.access_token) {
      throw { error: 'not_authenticated', error_description: 'Not authenticated' } as OAuth2Error
    }

    // Check if token needs refresh
    if (isTokenExpired() && tokens.value.refresh_token) {
      await refreshTokens()
    }

    return tokens.value.access_token
  }

  /**
   * Check if current token is expired
   */
  function isTokenExpired(): boolean {
    if (!tokenExpiresAt.value) return false
    return tokenExpiresAt.value.getTime() - refreshThreshold * 1000 < Date.now()
  }

  /**
   * Clear all stored auth data
   */
  async function clearAuth(): Promise<void> {
    tokens.value = null
    userInfo.value = null
    sipCredentials.value = null
    tokenExpiresAt.value = null
    error.value = null
    setState('idle')
    await storage.clear()
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    authState,
    isAuthenticated,
    error,
    userInfo,
    sipCredentials,
    tokens,
    tokenExpiresAt,
    isRefreshing,

    // Config
    config,
    storage,

    // Methods
    initialize,
    login,
    handleCallback,
    logout,
    refreshTokens,
    getAccessToken,
    isTokenExpired,
    clearAuth,
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let _oauth2ServiceInstance: OAuth2ServiceReturn | null = null

/**
 * Get or create the singleton OAuth2Service instance
 */
export function getOAuth2Service(config?: OAuth2ServiceConfig): OAuth2ServiceReturn {
  if (!_oauth2ServiceInstance) {
    if (!config) {
      throw new Error('OAuth2Service not initialized. Provide config on first call.')
    }
    _oauth2ServiceInstance = createOAuth2Service(config)
  }
  return _oauth2ServiceInstance
}

/**
 * Reset the singleton OAuth2Service instance
 */
export function resetOAuth2Service(): void {
  if (_oauth2ServiceInstance) {
    _oauth2ServiceInstance.clearAuth()
    _oauth2ServiceInstance = null
  }
}

export type { OAuth2ServiceConfig, OAuth2ProviderConfig }
