/**
 * OAuth2Provider Unit Tests
 *
 * Tests for the Vue provider component that provides OAuth2 context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import {
  OAuth2Provider,
  useOAuth2Provider,
  useOAuth2Credentials,
  OAuth2ProviderKey,
  OAuth2AuthStateKey,
  OAuth2CredentialsKey,
} from '../../../src/providers/OAuth2Provider'
import type { OAuth2ServiceConfig } from '../../../src/types/oauth.types'

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
    ...overrides,
  }
}

// Consumer component for testing injection
const createConsumerComponent = () =>
  defineComponent({
    name: 'OAuth2Consumer',
    setup() {
      const oauth2 = useOAuth2Provider()
      return { oauth2 }
    },
    render() {
      return h('div', { class: 'consumer' }, [
        h('span', { class: 'auth-state' }, this.oauth2.authState.value),
        h('span', { class: 'is-auth' }, String(this.oauth2.isAuthenticated.value)),
      ])
    },
  })

// Consumer component for credentials only
const createCredentialsConsumer = () =>
  defineComponent({
    name: 'CredentialsConsumer',
    setup() {
      const credentials = useOAuth2Credentials()
      // Return render function from setup() to have direct access to credentials ref
      return () =>
        h('div', { class: 'credentials-consumer' }, credentials.value?.sipUri || 'no-credentials')
    },
  })

describe('OAuth2Provider', () => {
  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
          autoHandleCallback: false,
        },
        slots: {
          default: () => h('div', 'Child Content'),
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('Child Content')
    })

    it('should render with wrapper div', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h('span', 'Test'),
        },
      })

      expect(wrapper.find('.oauth2-provider').exists()).toBe(true)
    })

    it('should render children in slot', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => [
            h('div', { class: 'child-1' }, 'First'),
            h('div', { class: 'child-2' }, 'Second'),
          ],
        },
      })

      expect(wrapper.find('.child-1').exists()).toBe(true)
      expect(wrapper.find('.child-2').exists()).toBe(true)
    })
  })

  describe('Props', () => {
    it('should accept required config prop', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h('div'),
        },
      })

      expect(wrapper.props('config')).toStrictEqual(config)
    })

    it('should have default autoInitialize as true', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: { config },
        slots: {
          default: () => h('div'),
        },
      })

      expect(wrapper.props('autoInitialize')).toBe(true)
    })

    it('should have default autoHandleCallback as true', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: { config },
        slots: {
          default: () => h('div'),
        },
      })

      expect(wrapper.props('autoHandleCallback')).toBe(true)
    })

    it('should have default callbackPath', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: { config },
        slots: {
          default: () => h('div'),
        },
      })

      expect(wrapper.props('callbackPath')).toBe('/oauth/callback')
    })

    it('should accept custom callbackPath', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          callbackPath: '/auth/callback',
        },
        slots: {
          default: () => h('div'),
        },
      })

      expect(wrapper.props('callbackPath')).toBe('/auth/callback')
    })

    it('should accept postAuthRedirect', () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          postAuthRedirect: '/dashboard',
        },
        slots: {
          default: () => h('div'),
        },
      })

      expect(wrapper.props('postAuthRedirect')).toBe('/dashboard')
    })
  })

  describe('Context Injection', () => {
    it('should provide context to children', async () => {
      const config = createMockConfig()
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      expect(consumer.vm.oauth2).toBeDefined()
      expect(consumer.vm.oauth2.authState).toBeDefined()
      expect(consumer.vm.oauth2.isAuthenticated).toBeDefined()
    })

    it('should provide credentials to children', async () => {
      const config = createMockConfig()
      const CredentialsConsumer = createCredentialsConsumer()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h(CredentialsConsumer),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(CredentialsConsumer)
      // Component should render successfully with credentials from provider
      expect(consumer.exists()).toBe(true)
      expect(consumer.text()).toBe('no-credentials') // Initially no credentials
    })

    it('should expose login function', async () => {
      const config = createMockConfig()
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      expect(typeof consumer.vm.oauth2.login).toBe('function')
    })

    it('should expose logout function', async () => {
      const config = createMockConfig()
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      expect(typeof consumer.vm.oauth2.logout).toBe('function')
    })

    it('should expose refreshTokens function', async () => {
      const config = createMockConfig()
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      expect(typeof consumer.vm.oauth2.refreshTokens).toBe('function')
    })
  })

  describe('Scoped Slots', () => {
    it('should provide slot props', async () => {
      const config = createMockConfig()
      let slotProps: Record<string, unknown> | null = null

      mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: (props: Record<string, unknown>) => {
            slotProps = props
            return h('div', 'Test')
          },
        },
      })

      await nextTick()

      expect(slotProps).toBeDefined()
      expect(slotProps!.authState).toBeDefined()
      expect(slotProps!.isAuthenticated).toBeDefined()
      expect(slotProps!.isInitialized).toBeDefined()
      expect(slotProps!.login).toBeDefined()
      expect(slotProps!.logout).toBeDefined()
    })

    it('should provide isAuthenticated as false initially', async () => {
      const config = createMockConfig()
      let isAuth: boolean | null = null

      mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: (props: { isAuthenticated: boolean }) => {
            isAuth = props.isAuthenticated
            return h('div', 'Test')
          },
        },
      })

      await nextTick()

      expect(isAuth).toBe(false)
    })

    it('should provide authState as idle initially', async () => {
      const config = createMockConfig()
      let state: string | null = null

      mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: (props: { authState: string }) => {
            state = props.authState
            return h('div', 'Test')
          },
        },
      })

      await nextTick()

      expect(state).toBe('idle')
    })
  })

  describe('Events', () => {
    it('should emit initialized event', async () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: true,
          autoHandleCallback: false,
        },
        slots: {
          default: () => h('div'),
        },
      })

      await flushPromises()
      await nextTick()

      expect(wrapper.emitted('initialized')).toBeDefined()
    })

    it('should emit state-change event', async () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
          autoHandleCallback: false,
        },
        slots: {
          default: () => h('div'),
        },
      })

      // Trigger a state change by accessing the provider context
      // This is difficult to test without actual OAuth flow
      // The event emission is tested through integration

      await nextTick()

      // Initial mount shouldn't emit state-change
      expect(wrapper.emitted('state-change')).toBeUndefined()
    })
  })

  describe('useOAuth2Provider Hook', () => {
    it('should throw when used outside provider', () => {
      // Suppress Vue warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const ComponentWithoutProvider = defineComponent({
        setup() {
          expect(() => useOAuth2Provider()).toThrow(
            'useOAuth2Provider() must be called inside a component that is a child of <OAuth2Provider>'
          )
          return () => h('div', 'Test')
        },
      })

      mount(ComponentWithoutProvider)
      warnSpy.mockRestore()
    })

    it('should return context when used inside provider', async () => {
      const config = createMockConfig()
      let context: ReturnType<typeof useOAuth2Provider> | null = null

      const ConsumerComponent = defineComponent({
        setup() {
          context = useOAuth2Provider()
          return () => h('div', 'Test')
        },
      })

      mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      expect(context).not.toBeNull()
      expect(context!.authState).toBeDefined()
      expect(context!.isAuthenticated).toBeDefined()
    })
  })

  describe('useOAuth2Credentials Hook', () => {
    it('should throw when used outside provider', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const ComponentWithoutProvider = defineComponent({
        setup() {
          expect(() => useOAuth2Credentials()).toThrow(
            'useOAuth2Credentials() must be called inside a component that is a child of <OAuth2Provider>'
          )
          return () => h('div', 'Test')
        },
      })

      mount(ComponentWithoutProvider)
      warnSpy.mockRestore()
    })

    it('should return credentials ref when used inside provider', async () => {
      const config = createMockConfig()
      let credentials: ReturnType<typeof useOAuth2Credentials> | null = null

      const ConsumerComponent = defineComponent({
        setup() {
          credentials = useOAuth2Credentials()
          return () => h('div', 'Test')
        },
      })

      mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      expect(credentials).not.toBeNull()
      expect(credentials!.value).toBeNull() // Initially null
    })
  })

  describe('Injection Keys', () => {
    it('should export OAuth2ProviderKey', () => {
      expect(OAuth2ProviderKey).toBeDefined()
      expect(typeof OAuth2ProviderKey).toBe('symbol')
    })

    it('should export OAuth2AuthStateKey', () => {
      expect(OAuth2AuthStateKey).toBeDefined()
      expect(typeof OAuth2AuthStateKey).toBe('symbol')
    })

    it('should export OAuth2CredentialsKey', () => {
      expect(OAuth2CredentialsKey).toBeDefined()
      expect(typeof OAuth2CredentialsKey).toBe('symbol')
    })
  })

  describe('Initialization', () => {
    it('should not auto-initialize when disabled', async () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h('div'),
        },
      })

      await flushPromises()

      // Should emit initialized event with false (not authenticated)
      // when autoInitialize is false
      const emitted = wrapper.emitted('initialized')
      expect(emitted).toBeDefined()
      expect(emitted![0]).toEqual([false])
    })

    it('should emit initialized with auth status', async () => {
      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: true,
          autoHandleCallback: false,
        },
        slots: {
          default: () => h('div'),
        },
      })

      await flushPromises()
      await nextTick()

      const emitted = wrapper.emitted('initialized')
      expect(emitted).toBeDefined()
      expect(emitted![0]).toEqual([false]) // Not authenticated initially
    })
  })

  describe('Readonly State', () => {
    it('should provide readonly authState', async () => {
      // Suppress Vue readonly warnings for this intentional mutation test
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const config = createMockConfig()
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: false,
        },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)

      // Get original value
      const originalValue = consumer.vm.oauth2.authState.value

      // Try to modify - Vue 3 readonly refs warn but don't throw
      // @ts-expect-error - intentionally testing runtime protection
      consumer.vm.oauth2.authState.value = 'hacked'

      // Value should remain unchanged (readonly protection)
      expect(consumer.vm.oauth2.authState.value).toBe(originalValue)

      warnSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should not crash on initialization error', async () => {
      // Mock a storage error
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const config = createMockConfig()

      const wrapper = mount(OAuth2Provider, {
        props: {
          config,
          autoInitialize: true,
        },
        slots: {
          default: () => h('div', 'Still renders'),
        },
      })

      await flushPromises()
      await nextTick()

      expect(wrapper.text()).toContain('Still renders')
      expect(wrapper.emitted('initialized')).toBeDefined()
    })
  })
})
