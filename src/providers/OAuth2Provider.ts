/**
 * OAuth2Provider - Vue provider component for OAuth2 authentication
 *
 * Provides OAuth2 authentication and SIP credential provisioning to child components
 * using Vue's provide/inject API. Handles lifecycle management and token refresh
 * automatically.
 *
 * @example
 * ```vue
 * <template>
 *   <OAuth2Provider :config="oauth2Config" @authenticated="onAuthenticated">
 *     <template #default="{ isAuthenticated, sipCredentials, login, logout }">
 *       <div v-if="isAuthenticated">
 *         <p>Logged in as: {{ sipCredentials?.displayName }}</p>
 *         <button @click="logout">Logout</button>
 *
 *         <!-- Pass credentials to SIP provider -->
 *         <SipClientProvider :config="getSipConfig(sipCredentials)">
 *           <MyCallComponent />
 *         </SipClientProvider>
 *       </div>
 *       <div v-else>
 *         <button @click="login">Login with Google</button>
 *       </div>
 *     </template>
 *   </OAuth2Provider>
 * </template>
 *
 * <script setup>
 * import { OAuth2Provider, createGoogleOAuth2Config } from 'vuesip'
 *
 * const oauth2Config = createGoogleOAuth2Config({
 *   clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
 *   redirectUri: `${window.location.origin}/oauth/callback`,
 *   sipDomain: 'sip.example.com',
 *   wsServerUri: 'wss://sip.example.com:7443',
 * })
 *
 * function onAuthenticated({ userInfo, credentials }) {
 *   console.log('User authenticated:', userInfo.email)
 * }
 *
 * function getSipConfig(credentials) {
 *   return {
 *     uri: credentials.wsServerUri,
 *     sipUri: credentials.sipUri,
 *     password: credentials.password,
 *     displayName: credentials.displayName,
 *   }
 * }
 * </script>
 * ```
 *
 * @packageDocumentation
 */

import {
  defineComponent,
  provide,
  inject,
  onMounted,
  watch,
  readonly,
  ref,
  computed,
  h,
  type InjectionKey,
  type Ref,
  type PropType,
  type ComputedRef,
} from 'vue'
import { createOAuth2Service } from '@/services/OAuth2Service'
import type {
  OAuth2ServiceConfig,
  OAuth2AuthState,
  OAuth2Error,
  OAuth2UserInfo,
  OAuth2TokenResponse,
  ProvisionedSipCredentials,
} from '@/types/oauth.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('OAuth2Provider')

/**
 * Provider context shape - what gets injected into children
 */
export interface OAuth2ProviderContext {
  /** Current authentication state */
  authState: Ref<OAuth2AuthState>
  /** Whether user is authenticated */
  isAuthenticated: ComputedRef<boolean>
  /** Current error (null if none) */
  error: Ref<OAuth2Error | null>
  /** Current OAuth2 user info */
  userInfo: Ref<OAuth2UserInfo | null>
  /** Provisioned SIP credentials */
  sipCredentials: Ref<ProvisionedSipCredentials | null>
  /** Current OAuth2 tokens */
  tokens: Ref<OAuth2TokenResponse | null>
  /** Whether initialization is complete */
  isInitialized: Ref<boolean>
  /** Whether token refresh is in progress */
  isRefreshing: Ref<boolean>
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
}

/**
 * Injection key for OAuth2 provider context
 */
export const OAuth2ProviderKey: InjectionKey<OAuth2ProviderContext> = Symbol('oauth2-provider')

/**
 * Injection key for authentication state
 */
export const OAuth2AuthStateKey: InjectionKey<Ref<OAuth2AuthState>> = Symbol('oauth2-auth-state')

/**
 * Injection key for SIP credentials
 */
export const OAuth2CredentialsKey: InjectionKey<Ref<ProvisionedSipCredentials | null>> =
  Symbol('oauth2-credentials')

/**
 * OAuth2Provider component props
 */
export interface OAuth2ProviderProps {
  /** OAuth2 service configuration */
  config: OAuth2ServiceConfig
  /** Auto-initialize on mount (restore session) */
  autoInitialize?: boolean
  /** Auto-handle callback if on callback URL */
  autoHandleCallback?: boolean
  /** Callback path to detect */
  callbackPath?: string
  /** Redirect after successful authentication */
  postAuthRedirect?: string
}

/**
 * OAuth2Provider component
 */
export const OAuth2Provider = defineComponent({
  name: 'OAuth2Provider',

  props: {
    /**
     * OAuth2 service configuration
     */
    config: {
      type: Object as PropType<OAuth2ServiceConfig>,
      required: true,
    },

    /**
     * Auto-initialize on mount (restore session)
     * @default true
     */
    autoInitialize: {
      type: Boolean,
      default: true,
    },

    /**
     * Auto-handle callback if on callback URL
     * @default true
     */
    autoHandleCallback: {
      type: Boolean,
      default: true,
    },

    /**
     * Callback path to detect
     * @default '/oauth/callback'
     */
    callbackPath: {
      type: String,
      default: '/oauth/callback',
    },

    /**
     * Redirect after successful authentication
     */
    postAuthRedirect: {
      type: String,
      default: undefined,
    },
  },

  emits: {
    /**
     * Emitted when authentication state changes
     */
    'state-change': (_state: OAuth2AuthState, _previousState: OAuth2AuthState) => true,

    /**
     * Emitted on successful authentication
     */
    authenticated: (_data: { userInfo: OAuth2UserInfo; credentials: ProvisionedSipCredentials }) =>
      true,

    /**
     * Emitted on authentication error
     */
    error: (_error: OAuth2Error) => true,

    /**
     * Emitted when tokens are refreshed
     */
    'tokens-refreshed': (_tokens: OAuth2TokenResponse) => true,

    /**
     * Emitted on logout
     */
    logout: () => true,

    /**
     * Emitted when initialization is complete
     */
    initialized: (_isAuthenticated: boolean) => true,
  },

  setup(props, { emit, slots }) {
    // Create OAuth2 service
    const service = createOAuth2Service(props.config)

    // Additional state
    const isInitialized = ref(false)

    // Check if on callback page
    const isOnCallbackPage = computed(() => {
      if (typeof window === 'undefined') return false
      return (
        window.location.pathname === props.callbackPath ||
        window.location.pathname.endsWith(props.callbackPath)
      )
    })

    // Watch for state changes
    let previousState: OAuth2AuthState = 'idle'
    watch(
      () => service.authState.value,
      (newState) => {
        emit('state-change', newState, previousState)
        previousState = newState
      }
    )

    // Watch for errors
    watch(
      () => service.error.value,
      (error) => {
        if (error) {
          emit('error', error)
        }
      }
    )

    /**
     * Initialize the provider
     */
    async function initialize(): Promise<void> {
      try {
        // Check if we're on the callback page
        if (props.autoHandleCallback && isOnCallbackPage.value) {
          const url = window.location.href
          if (url.includes('code=') || url.includes('error=')) {
            logger.debug('Handling OAuth2 callback')
            const credentials = await service.handleCallback(url)

            // Clean up URL
            const cleanUrl = window.location.origin + (props.postAuthRedirect || '/')
            window.history.replaceState({}, document.title, cleanUrl)

            // Emit authenticated event
            if (service.userInfo.value) {
              emit('authenticated', {
                userInfo: service.userInfo.value,
                credentials,
              })
            }
          }
        } else if (props.autoInitialize) {
          // Try to restore session
          await service.initialize()

          // If restored successfully, emit authenticated
          if (
            service.isAuthenticated.value &&
            service.userInfo.value &&
            service.sipCredentials.value
          ) {
            emit('authenticated', {
              userInfo: service.userInfo.value,
              credentials: service.sipCredentials.value,
            })
          }
        }
      } catch (err) {
        logger.error('OAuth2 initialization failed', err)
      } finally {
        isInitialized.value = true
        emit('initialized', service.isAuthenticated.value)
      }
    }

    /**
     * Login wrapper that emits events
     */
    async function login(options?: { prompt?: string; loginHint?: string }): Promise<void> {
      await service.login(options)
    }

    /**
     * Logout wrapper that emits events
     */
    async function logout(): Promise<void> {
      await service.logout()
      emit('logout')
    }

    /**
     * Refresh tokens wrapper that emits events
     */
    async function refreshTokens(): Promise<OAuth2TokenResponse> {
      const tokens = await service.refreshTokens()
      emit('tokens-refreshed', tokens)
      return tokens
    }

    // Initialize on mount
    onMounted(() => {
      initialize()
    })

    // Create provider context
    const providerContext: OAuth2ProviderContext = {
      authState: readonly(service.authState) as Ref<OAuth2AuthState>,
      isAuthenticated: service.isAuthenticated,
      error: readonly(service.error) as Ref<OAuth2Error | null>,
      userInfo: readonly(service.userInfo) as Ref<OAuth2UserInfo | null>,
      sipCredentials: readonly(service.sipCredentials) as Ref<ProvisionedSipCredentials | null>,
      tokens: readonly(service.tokens) as Ref<OAuth2TokenResponse | null>,
      isInitialized: readonly(isInitialized) as Ref<boolean>,
      isRefreshing: readonly(service.isRefreshing) as Ref<boolean>,
      login,
      handleCallback: service.handleCallback,
      logout,
      refreshTokens,
      getAccessToken: service.getAccessToken,
    }

    // Provide context to children
    provide(OAuth2ProviderKey, providerContext)
    provide(OAuth2AuthStateKey, readonly(service.authState) as Ref<OAuth2AuthState>)
    provide(
      OAuth2CredentialsKey,
      readonly(service.sipCredentials) as Ref<ProvisionedSipCredentials | null>
    )

    // Render with scoped slot
    return () => {
      const slotProps = {
        authState: service.authState.value,
        isAuthenticated: service.isAuthenticated.value,
        isInitialized: isInitialized.value,
        error: service.error.value,
        userInfo: service.userInfo.value,
        sipCredentials: service.sipCredentials.value,
        login,
        logout,
        refreshTokens,
      }

      return h('div', { class: 'oauth2-provider' }, slots.default?.(slotProps))
    }
  },
})

/**
 * Composable for consuming OAuth2Provider context
 *
 * Must be used inside a component that is a child of OAuth2Provider.
 *
 * @throws {Error} If used outside of OAuth2Provider
 *
 * @example
 * ```vue
 * <script setup>
 * import { useOAuth2Provider } from 'vuesip'
 *
 * const { isAuthenticated, sipCredentials, login, logout } = useOAuth2Provider()
 *
 * watchEffect(() => {
 *   if (isAuthenticated.value) {
 *     console.log('Logged in:', sipCredentials.value?.sipUri)
 *   }
 * })
 * </script>
 * ```
 */
export function useOAuth2Provider(): OAuth2ProviderContext {
  const context = inject(OAuth2ProviderKey)

  if (!context) {
    throw new Error(
      'useOAuth2Provider() must be called inside a component that is a child of <OAuth2Provider>'
    )
  }

  return context
}

/**
 * Inject just the SIP credentials (for use in nested components)
 */
export function useOAuth2Credentials(): Ref<ProvisionedSipCredentials | null> {
  const credentials = inject(OAuth2CredentialsKey)

  if (!credentials) {
    throw new Error(
      'useOAuth2Credentials() must be called inside a component that is a child of <OAuth2Provider>'
    )
  }

  return credentials
}
