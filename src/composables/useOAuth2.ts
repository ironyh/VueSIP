/**
 * useOAuth2 - Vue Composable for OAuth2 Authentication
 *
 * Provides reactive OAuth2 authentication with automatic SIP user provisioning.
 * Integrates seamlessly with VueSIP's provider pattern.
 *
 * @module composables/useOAuth2
 *
 * @example
 * ```vue
 * <script setup>
 * import { useOAuth2 } from 'vuesip'
 *
 * const {
 *   isAuthenticated,
 *   userInfo,
 *   sipCredentials,
 *   login,
 *   logout,
 * } = useOAuth2({
 *   provider: {
 *     type: 'google',
 *     clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
 *     redirectUri: `${window.location.origin}/oauth/callback`,
 *     scopes: ['openid', 'email', 'profile'],
 *     grantType: 'authorization_code_pkce',
 *     usePKCE: true,
 *     authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
 *     tokenEndpoint: 'https://oauth2.googleapis.com/token',
 *     userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
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
 * // Login with OAuth2
 * async function handleLogin() {
 *   await login()
 * }
 *
 * // Use SIP credentials
 * watchEffect(() => {
 *   if (sipCredentials.value) {
 *     console.log('SIP URI:', sipCredentials.value.sipUri)
 *   }
 * })
 * </script>
 * ```
 */

import { ref, computed, onMounted, type Ref, type ComputedRef } from 'vue'
import {
  createOAuth2Service,
  generatePKCE,
  generateState,
  type OAuth2ServiceReturn,
} from '@/services/OAuth2Service'
import type {
  OAuth2ServiceConfig,
  UseOAuth2Return,
  OAuth2ProviderConfig,
} from '@/types/oauth.types'
import { OAuth2ProviderTemplates } from '@/types/oauth.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useOAuth2')

/**
 * Options for useOAuth2 composable
 */
export interface UseOAuth2Options extends OAuth2ServiceConfig {
  /** Auto-initialize on mount (restore session) */
  autoInitialize?: boolean
  /** Auto-handle callback if on callback URL */
  autoHandleCallback?: boolean
  /** Callback path to detect */
  callbackPath?: string
}

/**
 * Extended return type with additional composable features
 */
export interface UseOAuth2ComposableReturn extends UseOAuth2Return {
  /** Service instance (for advanced usage) */
  service: OAuth2ServiceReturn
  /** Whether initialization is complete */
  isInitialized: Ref<boolean>
  /** Whether currently on callback page */
  isOnCallbackPage: ComputedRef<boolean>
}

/**
 * Vue composable for OAuth2 authentication
 */
export function useOAuth2(options: UseOAuth2Options): UseOAuth2ComposableReturn {
  const {
    autoInitialize = true,
    autoHandleCallback = true,
    callbackPath = '/oauth/callback',
    ...serviceConfig
  } = options

  // Create service instance
  const service = createOAuth2Service(serviceConfig)

  // Additional state
  const isInitialized = ref(false)

  // Check if on callback page
  const isOnCallbackPage = computed(() => {
    if (typeof window === 'undefined') return false
    return (
      window.location.pathname === callbackPath || window.location.pathname.endsWith(callbackPath)
    )
  })

  // Initialize on mount
  onMounted(async () => {
    try {
      // Check if we're on the callback page
      if (autoHandleCallback && isOnCallbackPage.value) {
        const url = window.location.href
        if (url.includes('code=') || url.includes('error=')) {
          logger.debug('Handling OAuth2 callback')
          await service.handleCallback(url)
          // Clean up URL
          const cleanUrl = window.location.origin + window.location.pathname
          window.history.replaceState({}, document.title, cleanUrl)
        }
      } else if (autoInitialize) {
        // Try to restore session
        await service.initialize()
      }
    } catch (err) {
      logger.error('OAuth2 initialization failed', err)
    } finally {
      isInitialized.value = true
    }
  })

  return {
    // Service state (reactive refs from service)
    authState: service.authState,
    isAuthenticated: service.isAuthenticated,
    error: service.error,
    userInfo: service.userInfo,
    sipCredentials: service.sipCredentials,
    tokens: service.tokens,
    tokenExpiresAt: service.tokenExpiresAt,
    isRefreshing: service.isRefreshing,

    // Service methods
    login: service.login,
    handleCallback: service.handleCallback,
    logout: service.logout,
    refreshTokens: service.refreshTokens,
    getAccessToken: service.getAccessToken,
    isTokenExpired: service.isTokenExpired,
    clearAuth: service.clearAuth,

    // Additional composable features
    service,
    isInitialized,
    isOnCallbackPage,
  }
}

/**
 * Create OAuth2 configuration for Google
 */
export function createGoogleOAuth2Config(params: {
  clientId: string
  redirectUri: string
  sipDomain: string
  wsServerUri: string
  scopes?: string[]
}): OAuth2ServiceConfig {
  return {
    provider: {
      ...OAuth2ProviderTemplates.google,
      type: 'google',
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scopes: params.scopes || ['openid', 'email', 'profile'],
      grantType: 'authorization_code_pkce',
      usePKCE: true,
      authorizationEndpoint:
        OAuth2ProviderTemplates.google.authorizationEndpoint ??
        'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint:
        OAuth2ProviderTemplates.google.tokenEndpoint ?? 'https://oauth2.googleapis.com/token',
    } as OAuth2ProviderConfig,
    credentialMapping: {
      usernameField: 'email',
      displayNameField: 'name',
      sipDomain: params.sipDomain,
      wsServerUri: params.wsServerUri,
      passwordStrategy: { type: 'access_token' },
    },
  }
}

/**
 * Create OAuth2 configuration for Microsoft/Azure AD
 */
export function createMicrosoftOAuth2Config(params: {
  clientId: string
  redirectUri: string
  sipDomain: string
  wsServerUri: string
  tenantId?: string // 'common', 'organizations', 'consumers', or specific tenant ID
  scopes?: string[]
}): OAuth2ServiceConfig {
  const tenant = params.tenantId || 'common'
  return {
    provider: {
      ...OAuth2ProviderTemplates.microsoft,
      type: 'microsoft',
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scopes: params.scopes || ['openid', 'email', 'profile', 'User.Read'],
      grantType: 'authorization_code_pkce',
      usePKCE: true,
      authorizationEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      userInfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo',
    } as OAuth2ProviderConfig,
    credentialMapping: {
      usernameField: 'email',
      displayNameField: 'name',
      sipDomain: params.sipDomain,
      wsServerUri: params.wsServerUri,
      passwordStrategy: { type: 'access_token' },
    },
  }
}

/**
 * Create OAuth2 configuration for GitHub
 */
export function createGitHubOAuth2Config(params: {
  clientId: string
  redirectUri: string
  sipDomain: string
  wsServerUri: string
  scopes?: string[]
}): OAuth2ServiceConfig {
  return {
    provider: {
      ...OAuth2ProviderTemplates.github,
      type: 'github',
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scopes: params.scopes || ['read:user', 'user:email'],
      grantType: 'authorization_code',
      usePKCE: false, // GitHub doesn't support PKCE
      authorizationEndpoint:
        OAuth2ProviderTemplates.github.authorizationEndpoint ??
        'https://github.com/login/oauth/authorize',
      tokenEndpoint:
        OAuth2ProviderTemplates.github.tokenEndpoint ??
        'https://github.com/login/oauth/access_token',
    } as OAuth2ProviderConfig,
    credentialMapping: {
      usernameField: 'login', // GitHub uses 'login' for username
      displayNameField: 'name',
      sipDomain: params.sipDomain,
      wsServerUri: params.wsServerUri,
      passwordStrategy: { type: 'access_token' },
      // Transform GitHub login to SIP username
      usernameTransformer: (userInfo) => {
        const login = (userInfo.login as string) || userInfo.email?.split('@')[0] || 'user'
        return login.toLowerCase().replace(/[^a-z0-9]/g, '')
      },
    },
  }
}

/**
 * Create OAuth2 configuration for Okta
 */
export function createOktaOAuth2Config(params: {
  clientId: string
  redirectUri: string
  sipDomain: string
  wsServerUri: string
  oktaDomain: string // e.g., 'dev-123456.okta.com'
  scopes?: string[]
}): OAuth2ServiceConfig {
  return {
    provider: {
      ...OAuth2ProviderTemplates.okta,
      type: 'okta',
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scopes: params.scopes || ['openid', 'email', 'profile'],
      grantType: 'authorization_code_pkce',
      usePKCE: true,
      authorizationEndpoint: `https://${params.oktaDomain}/oauth2/default/v1/authorize`,
      tokenEndpoint: `https://${params.oktaDomain}/oauth2/default/v1/token`,
      userInfoEndpoint: `https://${params.oktaDomain}/oauth2/default/v1/userinfo`,
      revocationEndpoint: `https://${params.oktaDomain}/oauth2/default/v1/revoke`,
      issuer: `https://${params.oktaDomain}/oauth2/default`,
    } as OAuth2ProviderConfig,
    credentialMapping: {
      usernameField: 'email',
      displayNameField: 'name',
      sipDomain: params.sipDomain,
      wsServerUri: params.wsServerUri,
      passwordStrategy: { type: 'access_token' },
    },
  }
}

/**
 * Create OAuth2 configuration for Auth0
 */
export function createAuth0OAuth2Config(params: {
  clientId: string
  redirectUri: string
  sipDomain: string
  wsServerUri: string
  auth0Domain: string // e.g., 'your-tenant.auth0.com'
  audience?: string
  scopes?: string[]
}): OAuth2ServiceConfig {
  const additionalParams: Record<string, string> = {}
  if (params.audience) {
    additionalParams.audience = params.audience
  }

  return {
    provider: {
      ...OAuth2ProviderTemplates.auth0,
      type: 'auth0',
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scopes: params.scopes || ['openid', 'email', 'profile'],
      grantType: 'authorization_code_pkce',
      usePKCE: true,
      authorizationEndpoint: `https://${params.auth0Domain}/authorize`,
      tokenEndpoint: `https://${params.auth0Domain}/oauth/token`,
      userInfoEndpoint: `https://${params.auth0Domain}/userinfo`,
      revocationEndpoint: `https://${params.auth0Domain}/oauth/revoke`,
      issuer: `https://${params.auth0Domain}/`,
      additionalParams,
    } as OAuth2ProviderConfig,
    credentialMapping: {
      usernameField: 'email',
      displayNameField: 'name',
      sipDomain: params.sipDomain,
      wsServerUri: params.wsServerUri,
      passwordStrategy: { type: 'access_token' },
    },
  }
}

/**
 * Create OAuth2 configuration for Keycloak
 */
export function createKeycloakOAuth2Config(params: {
  clientId: string
  redirectUri: string
  sipDomain: string
  wsServerUri: string
  keycloakUrl: string // e.g., 'https://keycloak.example.com'
  realm: string
  scopes?: string[]
}): OAuth2ServiceConfig {
  const baseUrl = `${params.keycloakUrl}/realms/${params.realm}/protocol/openid-connect`

  return {
    provider: {
      ...OAuth2ProviderTemplates.keycloak,
      type: 'keycloak',
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scopes: params.scopes || ['openid', 'email', 'profile'],
      grantType: 'authorization_code_pkce',
      usePKCE: true,
      authorizationEndpoint: `${baseUrl}/auth`,
      tokenEndpoint: `${baseUrl}/token`,
      userInfoEndpoint: `${baseUrl}/userinfo`,
      revocationEndpoint: `${baseUrl}/revoke`,
      jwksEndpoint: `${baseUrl}/certs`,
      issuer: `${params.keycloakUrl}/realms/${params.realm}`,
    } as OAuth2ProviderConfig,
    credentialMapping: {
      usernameField: 'preferred_username',
      displayNameField: 'name',
      sipDomain: params.sipDomain,
      wsServerUri: params.wsServerUri,
      passwordStrategy: { type: 'access_token' },
    },
  }
}

// Re-export utilities
export { generatePKCE, generateState }
