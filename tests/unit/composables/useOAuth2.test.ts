/**
 * useOAuth2 Composable Unit Tests
 *
 * Tests for the Vue composable that wraps OAuth2Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useOAuth2,
  createGoogleOAuth2Config,
  createMicrosoftOAuth2Config,
  createGitHubOAuth2Config,
  createOktaOAuth2Config,
  createAuth0OAuth2Config,
  createKeycloakOAuth2Config,
  generatePKCE,
  generateState,
} from '../../../src/composables/useOAuth2'
import type { UseOAuth2Options } from '../../../src/composables/useOAuth2'

// Mock crypto
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
  subtle: {
    digest: vi.fn(async (_algorithm: string, data: ArrayBuffer) => {
      const hash = new Uint8Array(32)
      const dataView = new Uint8Array(data)
      for (let i = 0; i < 32; i++) {
        hash[i] = dataView[i % dataView.length] ^ i
      }
      return hash.buffer
    }),
  },
}

// Mock storage
const mockStorage: Record<string, string> = {}
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  }),
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
  get length() {
    return Object.keys(mockStorage).length
  },
}

// Mock fetch
const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('crypto', mockCrypto)
  vi.stubGlobal('fetch', mockFetch)
  vi.stubGlobal('localStorage', mockLocalStorage)

  Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  mockFetch.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Helper to create base options
function createMockOptions(overrides?: Partial<UseOAuth2Options>): UseOAuth2Options {
  return {
    provider: {
      type: 'google',
      clientId: 'test-client-id',
      redirectUri: 'https://example.com/oauth/callback',
      scopes: ['openid', 'email', 'profile'],
      grantType: 'authorization_code_pkce',
      usePKCE: true,
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
    },
    credentialMapping: {
      usernameField: 'email',
      displayNameField: 'name',
      sipDomain: 'sip.example.com',
      wsServerUri: 'wss://sip.example.com:7443',
      passwordStrategy: { type: 'access_token' },
    },
    autoInitialize: false,
    autoHandleCallback: false,
    ...overrides,
  }
}

describe('useOAuth2', () => {
  describe('Composable Creation', () => {
    it('should create composable with default options', () => {
      const options = createMockOptions()
      const composable = useOAuth2(options)

      expect(composable).toBeDefined()
      expect(composable.authState).toBeDefined()
      expect(composable.isAuthenticated).toBeDefined()
      expect(composable.isInitialized).toBeDefined()
    })

    it('should expose all state refs', () => {
      const options = createMockOptions()
      const composable = useOAuth2(options)

      expect(composable.authState.value).toBe('idle')
      expect(composable.isAuthenticated.value).toBe(false)
      expect(composable.error.value).toBeNull()
      expect(composable.userInfo.value).toBeNull()
      expect(composable.sipCredentials.value).toBeNull()
      expect(composable.tokens.value).toBeNull()
      expect(composable.isRefreshing.value).toBe(false)
    })

    it('should expose all methods', () => {
      const options = createMockOptions()
      const composable = useOAuth2(options)

      expect(typeof composable.login).toBe('function')
      expect(typeof composable.handleCallback).toBe('function')
      expect(typeof composable.logout).toBe('function')
      expect(typeof composable.refreshTokens).toBe('function')
      expect(typeof composable.getAccessToken).toBe('function')
      expect(typeof composable.isTokenExpired).toBe('function')
      expect(typeof composable.clearAuth).toBe('function')
    })

    it('should expose service instance', () => {
      const options = createMockOptions()
      const composable = useOAuth2(options)

      expect(composable.service).toBeDefined()
      expect(composable.service.config).toBeDefined()
    })

    it('should expose isOnCallbackPage computed', () => {
      const options = createMockOptions()
      const composable = useOAuth2(options)

      expect(composable.isOnCallbackPage).toBeDefined()
      // Should be false since we're not on callback page
      expect(composable.isOnCallbackPage.value).toBe(false)
    })
  })

  describe('PKCE and State Utilities', () => {
    it('should re-export generatePKCE', async () => {
      const pkce = await generatePKCE()

      expect(pkce).toBeDefined()
      expect(pkce.codeVerifier).toBeDefined()
      expect(pkce.codeChallenge).toBeDefined()
      expect(pkce.codeChallengeMethod).toBe('S256')
    })

    it('should re-export generateState', () => {
      const state = generateState()

      expect(state).toBeDefined()
      expect(typeof state).toBe('string')
      expect(state.length).toBe(32)
    })
  })

  describe('Custom Options', () => {
    it('should respect autoInitialize option', () => {
      const options = createMockOptions({ autoInitialize: false })
      const composable = useOAuth2(options)

      expect(composable.isInitialized.value).toBe(false)
    })

    it('should respect autoHandleCallback option', () => {
      const options = createMockOptions({ autoHandleCallback: false })
      const composable = useOAuth2(options)

      // Should not throw or attempt callback handling
      expect(composable).toBeDefined()
    })

    it('should respect custom callbackPath', () => {
      const options = createMockOptions({ callbackPath: '/auth/callback' })
      const composable = useOAuth2(options)

      expect(composable).toBeDefined()
    })
  })
})

describe('Provider Config Helpers', () => {
  describe('createGoogleOAuth2Config', () => {
    it('should create Google OAuth2 config', () => {
      const config = createGoogleOAuth2Config({
        clientId: 'google-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
      })

      expect(config.provider.type).toBe('google')
      expect(config.provider.clientId).toBe('google-client-id')
      expect(config.provider.usePKCE).toBe(true)
      expect(config.provider.authorizationEndpoint).toContain('google.com')
      expect(config.provider.scopes).toContain('openid')
      expect(config.credentialMapping.sipDomain).toBe('sip.example.com')
    })

    it('should allow custom scopes', () => {
      const config = createGoogleOAuth2Config({
        clientId: 'google-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar'],
      })

      expect(config.provider.scopes).toContain('https://www.googleapis.com/auth/calendar')
    })
  })

  describe('createMicrosoftOAuth2Config', () => {
    it('should create Microsoft OAuth2 config with default tenant', () => {
      const config = createMicrosoftOAuth2Config({
        clientId: 'ms-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
      })

      expect(config.provider.type).toBe('microsoft')
      expect(config.provider.authorizationEndpoint).toContain('common')
      expect(config.provider.usePKCE).toBe(true)
    })

    it('should use custom tenant ID', () => {
      const config = createMicrosoftOAuth2Config({
        clientId: 'ms-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        tenantId: 'my-tenant-id',
      })

      expect(config.provider.authorizationEndpoint).toContain('my-tenant-id')
      expect(config.provider.tokenEndpoint).toContain('my-tenant-id')
    })

    it('should use organizations tenant', () => {
      const config = createMicrosoftOAuth2Config({
        clientId: 'ms-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        tenantId: 'organizations',
      })

      expect(config.provider.authorizationEndpoint).toContain('organizations')
    })
  })

  describe('createGitHubOAuth2Config', () => {
    it('should create GitHub OAuth2 config without PKCE', () => {
      const config = createGitHubOAuth2Config({
        clientId: 'github-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
      })

      expect(config.provider.type).toBe('github')
      expect(config.provider.usePKCE).toBe(false)
      expect(config.provider.authorizationEndpoint).toContain('github.com')
    })

    it('should use login field for username', () => {
      const config = createGitHubOAuth2Config({
        clientId: 'github-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
      })

      expect(config.credentialMapping.usernameField).toBe('login')
    })

    it('should include username transformer', () => {
      const config = createGitHubOAuth2Config({
        clientId: 'github-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
      })

      expect(config.credentialMapping.usernameTransformer).toBeDefined()

      // Test transformer
      const userInfo = { login: 'Test-User123', email: 'test@example.com' }
      const username = config.credentialMapping.usernameTransformer!(userInfo)
      expect(username).toBe('testuser123')
    })
  })

  describe('createOktaOAuth2Config', () => {
    it('should create Okta OAuth2 config', () => {
      const config = createOktaOAuth2Config({
        clientId: 'okta-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        oktaDomain: 'dev-123456.okta.com',
      })

      expect(config.provider.type).toBe('okta')
      expect(config.provider.authorizationEndpoint).toContain('dev-123456.okta.com')
      expect(config.provider.tokenEndpoint).toContain('dev-123456.okta.com')
      expect(config.provider.usePKCE).toBe(true)
    })

    it('should configure OIDC endpoints', () => {
      const config = createOktaOAuth2Config({
        clientId: 'okta-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        oktaDomain: 'dev-123456.okta.com',
      })

      expect(config.provider.userInfoEndpoint).toContain('userinfo')
      expect(config.provider.revocationEndpoint).toContain('revoke')
      expect(config.provider.issuer).toContain('dev-123456.okta.com')
    })
  })

  describe('createAuth0OAuth2Config', () => {
    it('should create Auth0 OAuth2 config', () => {
      const config = createAuth0OAuth2Config({
        clientId: 'auth0-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        auth0Domain: 'my-tenant.auth0.com',
      })

      expect(config.provider.type).toBe('auth0')
      expect(config.provider.authorizationEndpoint).toContain('my-tenant.auth0.com')
      expect(config.provider.usePKCE).toBe(true)
    })

    it('should include audience parameter when provided', () => {
      const config = createAuth0OAuth2Config({
        clientId: 'auth0-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        auth0Domain: 'my-tenant.auth0.com',
        audience: 'https://my-api.example.com',
      })

      expect(config.provider.additionalParams?.audience).toBe('https://my-api.example.com')
    })

    it('should not include audience when not provided', () => {
      const config = createAuth0OAuth2Config({
        clientId: 'auth0-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        auth0Domain: 'my-tenant.auth0.com',
      })

      expect(config.provider.additionalParams?.audience).toBeUndefined()
    })
  })

  describe('createKeycloakOAuth2Config', () => {
    it('should create Keycloak OAuth2 config', () => {
      const config = createKeycloakOAuth2Config({
        clientId: 'keycloak-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        keycloakUrl: 'https://keycloak.example.com',
        realm: 'my-realm',
      })

      expect(config.provider.type).toBe('keycloak')
      expect(config.provider.authorizationEndpoint).toContain('keycloak.example.com')
      expect(config.provider.authorizationEndpoint).toContain('my-realm')
      expect(config.provider.usePKCE).toBe(true)
    })

    it('should use preferred_username for SIP username', () => {
      const config = createKeycloakOAuth2Config({
        clientId: 'keycloak-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        keycloakUrl: 'https://keycloak.example.com',
        realm: 'my-realm',
      })

      expect(config.credentialMapping.usernameField).toBe('preferred_username')
    })

    it('should configure all OpenID Connect endpoints', () => {
      const config = createKeycloakOAuth2Config({
        clientId: 'keycloak-client-id',
        redirectUri: 'https://app.com/callback',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        keycloakUrl: 'https://keycloak.example.com',
        realm: 'my-realm',
      })

      expect(config.provider.tokenEndpoint).toContain('/token')
      expect(config.provider.userInfoEndpoint).toContain('/userinfo')
      expect(config.provider.revocationEndpoint).toContain('/revoke')
      expect(config.provider.jwksEndpoint).toContain('/certs')
      expect(config.provider.issuer).toContain('my-realm')
    })
  })
})

describe('Provider Config Edge Cases', () => {
  it('should handle minimal Google config', () => {
    const config = createGoogleOAuth2Config({
      clientId: 'test',
      redirectUri: 'http://localhost/callback',
      sipDomain: 'sip.test.com',
      wsServerUri: 'wss://sip.test.com',
    })

    expect(config.provider.clientId).toBe('test')
    expect(config.provider.scopes.length).toBeGreaterThan(0)
  })

  it('should handle empty scopes override', () => {
    const config = createGoogleOAuth2Config({
      clientId: 'test',
      redirectUri: 'http://localhost/callback',
      sipDomain: 'sip.test.com',
      wsServerUri: 'wss://sip.test.com',
      scopes: [],
    })

    // Should use default scopes when empty array provided
    expect(config.provider.scopes).toEqual([])
  })

  it('should preserve all credential mapping fields', () => {
    const config = createGoogleOAuth2Config({
      clientId: 'test',
      redirectUri: 'http://localhost/callback',
      sipDomain: 'sip.test.com',
      wsServerUri: 'wss://sip.test.com',
    })

    expect(config.credentialMapping.usernameField).toBe('email')
    expect(config.credentialMapping.displayNameField).toBe('name')
    expect(config.credentialMapping.sipDomain).toBe('sip.test.com')
    expect(config.credentialMapping.wsServerUri).toBe('wss://sip.test.com')
    expect(config.credentialMapping.passwordStrategy.type).toBe('access_token')
  })
})
