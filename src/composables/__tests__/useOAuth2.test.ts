/**
 * Tests for useOAuth2 composable
 * @module composables/__tests__/useOAuth2.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOAuth2 } from '../useOAuth2'
import type { Pinia } from 'pinia'

// Mock logger
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock OAuth2Service
vi.mock('../../services/OAuth2Service', () => ({
  createOAuth2Service: vi.fn(() => ({
    initialize: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    handleCallback: vi.fn(),
    getStoredToken: vi.fn(),
    getUserInfo: vi.fn(),
    refreshToken: vi.fn(),
    isAuthenticated: false,
    token: null,
    userInfo: null,
  })),
  generatePKCE: vi.fn(() => ({
    codeVerifier: 'test-code-verifier',
    codeChallenge: 'test-code-challenge',
  })),
  generateState: vi.fn(() => 'test-state'),
}))

describe('useOAuth2', () => {
  let piniaInstance: Pinia

  const mockOptions = {
    provider: {
      type: 'google' as const,
      clientId: 'test-client-id',
      redirectUri: 'https://example.com/oauth/callback',
      scopes: ['openid', 'email', 'profile'],
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
    },
    credentialMapping: {
      usernameField: 'email',
      displayNameField: 'name',
      sipDomain: 'sip.example.com',
      wsServerUri: 'wss://sip.example.com:7443',
    },
    autoInitialize: false,
    autoHandleCallback: false,
  }

  beforeEach(() => {
    piniaInstance = createPinia()
    setActivePinia(piniaInstance)

    // Mock window.location
    vi.stubGlobal('location', {
      href: 'https://example.com/',
      pathname: '/',
      search: '',
      origin: 'https://example.com',
    })

    // Mock window.history
    vi.stubGlobal('history', {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    })

    // Mock crypto for PKCE
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        generateRandom: vi.fn().mockResolvedValue(new Uint8Array(32)),
      },
      getRandomValues: vi.fn((arr) => arr),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should create useOAuth2 composable with default options', () => {
      const result = useOAuth2(mockOptions)

      expect(result).toBeDefined()
      expect(result.isAuthenticated).toBeDefined()
      expect(result.userInfo).toBeDefined()
      expect(result.sipCredentials).toBeDefined()
      expect(result.login).toBeDefined()
      expect(result.logout).toBeDefined()
      expect(result.service).toBeDefined()
    })

    it('should set isInitialized to false initially', () => {
      const result = useOAuth2(mockOptions)

      expect(result.isInitialized.value).toBe(false)
    })

    it('should detect callback page correctly', () => {
      vi.stubGlobal('location', {
        href: 'https://example.com/oauth/callback?code=test',
        pathname: '/oauth/callback',
        search: '?code=test',
        origin: 'https://example.com',
      })

      const result = useOAuth2({
        ...mockOptions,
        callbackPath: '/oauth/callback',
      })

      expect(result.isOnCallbackPage.value).toBe(true)
    })

    it('should detect non-callback page correctly', () => {
      const result = useOAuth2(mockOptions)

      expect(result.isOnCallbackPage.value).toBe(false)
    })
  })

  describe('login flow', () => {
    it('should have login function', () => {
      const result = useOAuth2(mockOptions)

      expect(typeof result.login).toBe('function')
    })

    it('should have logout function', () => {
      const result = useOAuth2(mockOptions)

      expect(typeof result.logout).toBe('function')
    })
  })

  describe('credential mapping', () => {
    it('should provide sipCredentials computed property', () => {
      const result = useOAuth2(mockOptions)

      expect(result.sipCredentials).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should provide error state', () => {
      const result = useOAuth2(mockOptions)

      expect(result.error).toBeDefined()
    })
  })

  describe('loading state', () => {
    it('should provide isLoading state', () => {
      const result = useOAuth2(mockOptions)

      expect(result.isLoading).toBeDefined()
    })
  })
})
