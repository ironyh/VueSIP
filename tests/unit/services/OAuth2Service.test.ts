/**
 * OAuth2Service Unit Tests
 *
 * Comprehensive tests for OAuth2 authentication service including:
 * - PKCE generation
 * - Token storage management
 * - OAuth2 flow handling
 * - SIP credential provisioning
 * - Token refresh logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createOAuth2Service,
  generatePKCE,
  generateState,
  getOAuth2Service,
  resetOAuth2Service,
} from '../../../src/services/OAuth2Service'
import type {
  OAuth2ServiceConfig,
  OAuth2TokenResponse,
  OAuth2UserInfo,
} from '../../../src/types/oauth.types'

// Mock crypto APIs
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
  subtle: {
    digest: vi.fn(async (_algorithm: string, data: ArrayBuffer) => {
      // Return a mock hash (32 bytes for SHA-256)
      const hash = new Uint8Array(32)
      const dataView = new Uint8Array(data)
      for (let i = 0; i < 32; i++) {
        hash[i] = dataView[i % dataView.length] ^ i
      }
      return hash.buffer
    }),
  },
}

// Mock fetch
const mockFetch = vi.fn()

// Mock localStorage
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

// Setup global mocks
beforeEach(() => {
  vi.stubGlobal('crypto', mockCrypto)
  vi.stubGlobal('fetch', mockFetch)
  vi.stubGlobal('localStorage', mockLocalStorage)

  // Clear storage
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key])

  // Reset mocks
  mockFetch.mockReset()
  mockCrypto.getRandomValues.mockClear()
  mockCrypto.subtle.digest.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetOAuth2Service()
})

// Helper to create mock config
function createMockConfig(overrides?: Partial<OAuth2ServiceConfig>): OAuth2ServiceConfig {
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
    storageType: 'localStorage',
    storageKeyPrefix: 'test_oauth2_',
    ...overrides,
  }
}

// Helper to create mock token response
function createMockTokenResponse(overrides?: Partial<OAuth2TokenResponse>): OAuth2TokenResponse {
  return {
    access_token: 'mock-access-token-12345',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh-token-67890',
    id_token:
      'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIn0.signature',
    scope: 'openid email profile',
    ...overrides,
  }
}

// Helper to create mock user info
function createMockUserInfo(overrides?: Partial<OAuth2UserInfo>): OAuth2UserInfo {
  return {
    sub: '123456',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://example.com/avatar.jpg',
    ...overrides,
  }
}

describe('OAuth2Service', () => {
  describe('PKCE Generation', () => {
    it('should generate valid PKCE parameters', async () => {
      const pkce = await generatePKCE()

      expect(pkce).toBeDefined()
      expect(pkce.codeVerifier).toBeDefined()
      expect(pkce.codeChallenge).toBeDefined()
      expect(pkce.codeChallengeMethod).toBe('S256')
    })

    it('should generate code verifier of correct length', async () => {
      const pkce = await generatePKCE()

      // Code verifier should be 128 characters
      expect(pkce.codeVerifier.length).toBe(128)
    })

    it('should generate different PKCE params each time', async () => {
      const pkce1 = await generatePKCE()
      const pkce2 = await generatePKCE()

      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier)
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge)
    })

    it('should use only allowed characters in code verifier', async () => {
      const pkce = await generatePKCE()
      const allowedChars = /^[A-Za-z0-9\-._~]+$/

      expect(pkce.codeVerifier).toMatch(allowedChars)
    })
  })

  describe('State Generation', () => {
    it('should generate state string', () => {
      const state = generateState()

      expect(state).toBeDefined()
      expect(typeof state).toBe('string')
      expect(state.length).toBe(32)
    })

    it('should generate different states each time', () => {
      const state1 = generateState()
      const state2 = generateState()

      expect(state1).not.toBe(state2)
    })
  })

  describe('Service Creation', () => {
    it('should create service with valid config', () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      expect(service).toBeDefined()
      expect(service.authState.value).toBe('idle')
      expect(service.isAuthenticated.value).toBe(false)
    })

    it('should expose reactive state refs', () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      expect(service.authState).toBeDefined()
      expect(service.isAuthenticated).toBeDefined()
      expect(service.error).toBeDefined()
      expect(service.userInfo).toBeDefined()
      expect(service.sipCredentials).toBeDefined()
      expect(service.tokens).toBeDefined()
      expect(service.tokenExpiresAt).toBeDefined()
      expect(service.isRefreshing).toBeDefined()
    })

    it('should expose service methods', () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      expect(typeof service.initialize).toBe('function')
      expect(typeof service.login).toBe('function')
      expect(typeof service.handleCallback).toBe('function')
      expect(typeof service.logout).toBe('function')
      expect(typeof service.refreshTokens).toBe('function')
      expect(typeof service.getAccessToken).toBe('function')
      expect(typeof service.isTokenExpired).toBe('function')
      expect(typeof service.clearAuth).toBe('function')
    })

    it('should store config', () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      expect(service.config).toBe(config)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance on subsequent calls', () => {
      const config = createMockConfig()
      const service1 = getOAuth2Service(config)
      const service2 = getOAuth2Service()

      expect(service1).toBe(service2)
    })

    it('should throw error if called without config before initialization', () => {
      resetOAuth2Service()

      expect(() => getOAuth2Service()).toThrow(
        'OAuth2Service not initialized. Provide config on first call.'
      )
    })

    it('should reset singleton properly', () => {
      const config = createMockConfig()
      const service1 = getOAuth2Service(config)
      resetOAuth2Service()

      expect(() => getOAuth2Service()).toThrow()

      const config2 = createMockConfig({ storageKeyPrefix: 'new_' })
      const service2 = getOAuth2Service(config2)

      expect(service2).not.toBe(service1)
    })
  })

  describe('Initialize', () => {
    it('should restore session from storage', async () => {
      const config = createMockConfig()
      const storedData = {
        tokens: createMockTokenResponse(),
        userInfo: createMockUserInfo(),
        sipCredentials: {
          sipUri: 'sip:test@sip.example.com',
          username: 'test',
          password: 'mock-access-token-12345',
          displayName: 'Test User',
          wsServerUri: 'wss://sip.example.com:7443',
          realm: 'sip.example.com',
          authorizationUsername: 'test',
          oauthUserInfo: createMockUserInfo(),
          tokens: createMockTokenResponse(),
        },
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      }

      mockStorage['test_oauth2_auth'] = JSON.stringify(storedData)

      const service = createOAuth2Service(config)
      await service.initialize()

      expect(service.authState.value).toBe('authenticated')
      expect(service.isAuthenticated.value).toBe(true)
      expect(service.userInfo.value?.email).toBe('test@example.com')
    })

    it('should handle no stored session', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      await service.initialize()

      expect(service.authState.value).toBe('idle')
      expect(service.isAuthenticated.value).toBe(false)
    })

    it('should handle expired stored session', async () => {
      const config = createMockConfig()
      const storedData = {
        tokens: createMockTokenResponse({ refresh_token: undefined }),
        userInfo: createMockUserInfo(),
        sipCredentials: {},
        storedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 3600 * 1000).toISOString(), // Expired
      }

      mockStorage['test_oauth2_auth'] = JSON.stringify(storedData)

      const service = createOAuth2Service(config)
      await service.initialize()

      // Should have cleared the expired session
      expect(mockStorage['test_oauth2_auth']).toBeUndefined()
    })
  })

  describe('Login Flow', () => {
    let originalLocation: Location

    beforeEach(() => {
      originalLocation = window.location
      // @ts-expect-error - mocking window.location
      delete window.location
      window.location = { href: '', origin: 'https://example.com' } as Location
    })

    afterEach(() => {
      window.location = originalLocation
    })

    it('should redirect to authorization endpoint', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      await service.login()

      expect(window.location.href).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(window.location.href).toContain('client_id=test-client-id')
      expect(window.location.href).toContain('redirect_uri=')
      expect(window.location.href).toContain('response_type=code')
      expect(window.location.href).toContain('scope=openid+email+profile')
    })

    it('should include PKCE parameters when enabled', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      await service.login()

      expect(window.location.href).toContain('code_challenge=')
      expect(window.location.href).toContain('code_challenge_method=S256')
    })

    it('should not include PKCE parameters when disabled', async () => {
      const config = createMockConfig({
        provider: {
          ...createMockConfig().provider,
          usePKCE: false,
        },
      })
      const service = createOAuth2Service(config)

      await service.login()

      expect(window.location.href).not.toContain('code_challenge=')
    })

    it('should include state parameter', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      await service.login()

      expect(window.location.href).toContain('state=')
    })

    it('should include prompt parameter when provided', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      await service.login({ prompt: 'consent' })

      expect(window.location.href).toContain('prompt=consent')
    })

    it('should include login_hint parameter when provided', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      await service.login({ loginHint: 'test@example.com' })

      expect(window.location.href).toContain('login_hint=test%40example.com')
    })

    it('should set state to redirecting', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      // Capture state before redirect completes
      let capturedState: string | undefined
      const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href')
      Object.defineProperty(window.location, 'href', {
        set() {
          capturedState = service.authState.value
        },
        configurable: true,
      })

      await service.login()

      expect(capturedState).toBe('redirecting')

      if (originalHref) {
        Object.defineProperty(window.location, 'href', originalHref)
      }
    })
  })

  describe('Callback Handling', () => {
    it('should exchange code for tokens', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      // Store PKCE verifier
      const state = 'test-state-123'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      // Mock token endpoint response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      // Mock userinfo endpoint response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code-123&state=${state}`
      const credentials = await service.handleCallback(callbackUrl)

      expect(credentials).toBeDefined()
      expect(credentials.sipUri).toBe('sip:test@sip.example.com')
      expect(credentials.username).toBe('test')
      expect(credentials.displayName).toBe('Test User')
    })

    it('should handle callback error', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      const callbackUrl =
        'https://example.com/oauth/callback?error=access_denied&error_description=User%20denied%20access'

      await expect(service.handleCallback(callbackUrl)).rejects.toMatchObject({
        error: 'access_denied',
        error_description: 'User denied access',
      })

      expect(service.authState.value).toBe('error')
    })

    it('should handle missing authorization code', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      const callbackUrl = 'https://example.com/oauth/callback?state=test-state'

      await expect(service.handleCallback(callbackUrl)).rejects.toMatchObject({
        error: 'missing_code',
      })
    })

    it('should handle invalid PKCE state', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      const callbackUrl = 'https://example.com/oauth/callback?code=auth-code&state=invalid-state'

      await expect(service.handleCallback(callbackUrl)).rejects.toMatchObject({
        error: 'invalid_state',
      })
    })

    it('should handle token exchange failure', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      const state = 'test-state-456'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Authorization code expired',
        }),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=expired-code&state=${state}`

      await expect(service.handleCallback(callbackUrl)).rejects.toMatchObject({
        error: 'invalid_grant',
      })
    })
  })

  describe('SIP Credential Provisioning', () => {
    it('should provision credentials with access_token strategy', async () => {
      const config = createMockConfig({
        credentialMapping: {
          usernameField: 'email',
          displayNameField: 'name',
          sipDomain: 'sip.example.com',
          wsServerUri: 'wss://sip.example.com:7443',
          passwordStrategy: { type: 'access_token' },
        },
      })
      const service = createOAuth2Service(config)

      const state = 'test-state-789'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      const credentials = await service.handleCallback(callbackUrl)

      expect(credentials.password).toBe('mock-access-token-12345')
    })

    it('should provision credentials with id_token strategy', async () => {
      const config = createMockConfig({
        credentialMapping: {
          usernameField: 'email',
          displayNameField: 'name',
          sipDomain: 'sip.example.com',
          wsServerUri: 'wss://sip.example.com:7443',
          passwordStrategy: { type: 'id_token' },
        },
      })
      const service = createOAuth2Service(config)

      const state = 'test-state-idtoken'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      const mockTokens = createMockTokenResponse({
        id_token: 'mock-id-token-xyz',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      const credentials = await service.handleCallback(callbackUrl)

      expect(credentials.password).toBe('mock-id-token-xyz')
    })

    it('should use custom username transformer', async () => {
      const config = createMockConfig({
        credentialMapping: {
          usernameField: 'email',
          displayNameField: 'name',
          sipDomain: 'sip.example.com',
          wsServerUri: 'wss://sip.example.com:7443',
          passwordStrategy: { type: 'access_token' },
          usernameTransformer: (userInfo) => `custom_${userInfo.sub}`,
        },
      })
      const service = createOAuth2Service(config)

      const state = 'test-state-transform'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo({ sub: '12345' }),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      const credentials = await service.handleCallback(callbackUrl)

      expect(credentials.username).toBe('custom_12345')
    })

    it('should sanitize username for SIP', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      const state = 'test-state-sanitize'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo({ email: 'Test.User+tag@Example.COM' }),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      const credentials = await service.handleCallback(callbackUrl)

      // Should be sanitized: lowercase, special chars removed
      expect(credentials.username).toBe('test.usertag')
    })
  })

  describe('Token Refresh', () => {
    it('should refresh tokens', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      // Set initial tokens
      const state = 'test-state-refresh'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      // Initial authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      await service.handleCallback(callbackUrl)

      // Mock refresh token response
      const newTokens = createMockTokenResponse({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newTokens,
      })

      const refreshedTokens = await service.refreshTokens()

      expect(refreshedTokens.access_token).toBe('new-access-token')
      expect(service.tokens.value?.access_token).toBe('new-access-token')
    })

    it('should throw error when no refresh token available', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      await expect(service.refreshTokens()).rejects.toMatchObject({
        error: 'no_refresh_token',
      })
    })

    it('should handle refresh token failure', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      // Set up authenticated state with refresh token
      const state = 'test-state-refresh-fail'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      await service.handleCallback(callbackUrl)

      // Mock refresh failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Refresh token expired',
        }),
      })

      await expect(service.refreshTokens()).rejects.toMatchObject({
        error: 'invalid_grant',
      })

      // Should clear auth on refresh failure
      expect(service.isAuthenticated.value).toBe(false)
    })
  })

  describe('Logout', () => {
    it('should clear auth state on logout', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      // Set up authenticated state
      const state = 'test-state-logout'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      await service.handleCallback(callbackUrl)

      expect(service.isAuthenticated.value).toBe(true)

      await service.logout()

      expect(service.isAuthenticated.value).toBe(false)
      expect(service.authState.value).toBe('idle')
      expect(service.tokens.value).toBeNull()
      expect(service.userInfo.value).toBeNull()
      expect(service.sipCredentials.value).toBeNull()
    })

    it('should call revocation endpoint if configured', async () => {
      const config = createMockConfig({
        provider: {
          ...createMockConfig().provider,
          revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
        },
      })
      const service = createOAuth2Service(config)

      // Set up authenticated state
      const state = 'test-state-revoke'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      await service.handleCallback(callbackUrl)

      // Mock revocation response
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.logout()

      // Check that revocation endpoint was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  describe('Token Expiration Check', () => {
    it('should correctly identify non-expired token', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      // Set up authenticated state with future expiration
      const state = 'test-state-expire'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse({ expires_in: 3600 }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      await service.handleCallback(callbackUrl)

      expect(service.isTokenExpired()).toBe(false)
    })
  })

  describe('Get Access Token', () => {
    it('should return access token when authenticated', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      // Set up authenticated state
      const state = 'test-state-access'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      await service.handleCallback(callbackUrl)

      const token = await service.getAccessToken()
      expect(token).toBe('mock-access-token-12345')
    })

    it('should throw when not authenticated', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      await expect(service.getAccessToken()).rejects.toMatchObject({
        error: 'not_authenticated',
      })
    })
  })

  describe('Clear Auth', () => {
    it('should clear all auth state', async () => {
      const config = createMockConfig()
      const service = createOAuth2Service(config)

      // Set up authenticated state
      const state = 'test-state-clear'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      await service.handleCallback(callbackUrl)

      await service.clearAuth()

      expect(service.tokens.value).toBeNull()
      expect(service.userInfo.value).toBeNull()
      expect(service.sipCredentials.value).toBeNull()
      expect(service.tokenExpiresAt.value).toBeNull()
      expect(service.error.value).toBeNull()
      expect(service.authState.value).toBe('idle')
    })
  })

  describe('Storage Types', () => {
    it('should work with memory storage', () => {
      const config = createMockConfig({ storageType: 'memory' })
      const service = createOAuth2Service(config)

      expect(service).toBeDefined()
      expect(service.storage).toBeDefined()
    })

    it('should work with sessionStorage', () => {
      const mockSessionStorage = { ...mockLocalStorage }
      vi.stubGlobal('sessionStorage', mockSessionStorage)

      const config = createMockConfig({ storageType: 'sessionStorage' })
      const service = createOAuth2Service(config)

      expect(service).toBeDefined()
    })
  })

  describe('Debug Mode', () => {
    it('should not throw in debug mode', () => {
      const config = createMockConfig({ debug: true })
      const service = createOAuth2Service(config)

      expect(service).toBeDefined()
    })
  })

  describe('Custom Password Strategies', () => {
    it('should support hash password strategy', async () => {
      const config = createMockConfig({
        credentialMapping: {
          usernameField: 'email',
          displayNameField: 'name',
          sipDomain: 'sip.example.com',
          wsServerUri: 'wss://sip.example.com:7443',
          passwordStrategy: {
            type: 'hash',
            algorithm: 'sha256',
            salt: 'test-salt',
          },
        },
      })
      const service = createOAuth2Service(config)

      const state = 'test-state-hash'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      const credentials = await service.handleCallback(callbackUrl)

      // Password should be a hex hash
      expect(credentials.password).toMatch(/^[0-9a-f]+$/)
    })

    it('should support static password strategy', async () => {
      const config = createMockConfig({
        credentialMapping: {
          usernameField: 'email',
          displayNameField: 'name',
          sipDomain: 'sip.example.com',
          wsServerUri: 'wss://sip.example.com:7443',
          passwordStrategy: {
            type: 'static',
            password: 'static-password-123',
          },
        },
      })
      const service = createOAuth2Service(config)

      const state = 'test-state-static'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      const credentials = await service.handleCallback(callbackUrl)

      expect(credentials.password).toBe('static-password-123')
    })

    it('should support custom password strategy', async () => {
      const customGenerator = vi.fn().mockResolvedValue('custom-generated-password')

      const config = createMockConfig({
        credentialMapping: {
          usernameField: 'email',
          displayNameField: 'name',
          sipDomain: 'sip.example.com',
          wsServerUri: 'wss://sip.example.com:7443',
          passwordStrategy: {
            type: 'custom',
            generator: customGenerator,
          },
        },
      })
      const service = createOAuth2Service(config)

      const state = 'test-state-custom'
      mockStorage[`test_oauth2_pkce_${state}`] = JSON.stringify({
        tokens: {},
        userInfo: {},
        sipCredentials: {},
        storedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        pkceVerifier: 'test-verifier',
        state,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTokenResponse(),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockUserInfo(),
      })

      const callbackUrl = `https://example.com/oauth/callback?code=auth-code&state=${state}`
      const credentials = await service.handleCallback(callbackUrl)

      expect(customGenerator).toHaveBeenCalled()
      expect(credentials.password).toBe('custom-generated-password')
    })
  })
})
