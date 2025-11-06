/**
 * Configuration Provider Unit Tests
 */

/* eslint-disable vue/one-component-per-file */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { ConfigProvider, useConfigProvider } from '../../../src/providers/ConfigProvider'
import { configStore } from '../../../src/stores/configStore'
import type {
  SipClientConfig,
  MediaConfiguration,
  UserPreferences,
} from '../../../src/types/config.types'

describe('ConfigProvider', () => {
  // Helper to create mock SIP configuration
  const createMockSipConfig = (overrides?: Partial<SipClientConfig>): SipClientConfig => ({
    uri: 'wss://sip.example.com:7443',
    sipUri: 'sip:alice@example.com',
    password: 'secret123',
    displayName: 'Alice',
    ...overrides,
  })

  // Helper to create mock media configuration
  const createMockMediaConfig = (overrides?: Partial<MediaConfiguration>): MediaConfiguration => ({
    audio: true,
    video: false,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    ...overrides,
  })

  // Helper to create mock user preferences
  const createMockUserPreferences = (overrides?: Partial<UserPreferences>): UserPreferences => ({
    enableAudio: true,
    enableVideo: false,
    autoAnswer: false,
    ...overrides,
  })

  // Helper component that uses the provider
  const createConsumerComponent = () =>
    defineComponent({
      name: 'ConfigConsumer',
      setup() {
        const config = useConfigProvider()
        return { config }
      },
      render() {
        return h('div', 'Consumer')
      },
    })

  beforeEach(() => {
    configStore.reset()
  })

  describe('Provider Initialization', () => {
    it('should render without crashing', () => {
      const wrapper = mount(ConfigProvider, {
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toBe('Child')
    })

    it('should initialize with SIP config prop', async () => {
      const sipConfig = createMockSipConfig()

      mount(ConfigProvider, {
        props: { sipConfig },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.hasSipConfig).toBe(true)
      expect(configStore.sipConfig?.sipUri).toBe('sip:alice@example.com')
    })

    it('should initialize with media config prop', async () => {
      const mediaConfig = createMockMediaConfig({ video: true })

      mount(ConfigProvider, {
        props: { mediaConfig },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.mediaConfig.video).toBe(true)
    })

    it('should initialize with user preferences prop', async () => {
      const userPreferences = createMockUserPreferences({ autoAnswer: true })

      mount(ConfigProvider, {
        props: { userPreferences },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.userPreferences.autoAnswer).toBe(true)
    })

    it('should initialize with all configs', async () => {
      const sipConfig = createMockSipConfig()
      const mediaConfig = createMockMediaConfig()
      const userPreferences = createMockUserPreferences()

      mount(ConfigProvider, {
        props: {
          sipConfig,
          mediaConfig,
          userPreferences,
        },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.hasSipConfig).toBe(true)
      expect(configStore.mediaConfig.audio).toBe(true)
      expect(configStore.userPreferences.enableAudio).toBe(true)
    })

    it('should validate config on mount by default', async () => {
      const invalidSipConfig = createMockSipConfig({ uri: 'invalid-uri' })

      mount(ConfigProvider, {
        props: { sipConfig: invalidSipConfig },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.lastValidation?.valid).toBe(false)
      expect(configStore.lastValidation?.errors).toBeTruthy()
    })

    it('should skip validation when validateOnMount is false', async () => {
      const invalidSipConfig = createMockSipConfig({ uri: 'invalid-uri' })

      mount(ConfigProvider, {
        props: {
          sipConfig: invalidSipConfig,
          validateOnMount: false,
        },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      // Should be set even though invalid (validation skipped)
      expect(configStore.hasSipConfig).toBe(true)
    })
  })

  describe('Auto-merge Configuration', () => {
    it('should replace config when autoMerge is false', async () => {
      // Set initial config
      configStore.setSipConfig(
        createMockSipConfig({
          displayName: 'Initial',
          realm: 'initial-realm',
        })
      )

      // Mount provider with new config (no realm)
      const sipConfig = createMockSipConfig({ displayName: 'Updated' })

      mount(ConfigProvider, {
        props: {
          sipConfig,
          autoMerge: false,
        },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.sipConfig?.displayName).toBe('Updated')
      expect(configStore.sipConfig?.realm).toBeUndefined()
    })

    it('should merge config when autoMerge is true', async () => {
      // Set initial config
      configStore.setSipConfig(
        createMockSipConfig({
          displayName: 'Initial',
          realm: 'initial-realm',
        })
      )

      // Mount provider with partial config
      const sipConfig = { displayName: 'Updated' } as Partial<SipClientConfig>

      mount(ConfigProvider, {
        props: {
          sipConfig: sipConfig as SipClientConfig,
          autoMerge: true,
        },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.sipConfig?.displayName).toBe('Updated')
      expect(configStore.sipConfig?.realm).toBe('initial-realm')
    })

    it('should merge media config when autoMerge is true', async () => {
      // Set initial media config
      configStore.setMediaConfig({
        audio: true,
        video: false,
        echoCancellation: true,
        audioCodec: 'opus',
      })

      // Mount provider with partial config
      const mediaConfig = { video: true } as Partial<MediaConfiguration>

      mount(ConfigProvider, {
        props: {
          mediaConfig: mediaConfig as MediaConfiguration,
          autoMerge: true,
        },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.mediaConfig.video).toBe(true)
      expect(configStore.mediaConfig.audioCodec).toBe('opus') // Preserved
    })

    it('should merge user preferences when autoMerge is true', async () => {
      // Set initial preferences
      configStore.setUserPreferences({
        enableAudio: true,
        enableVideo: false,
        autoAnswer: false,
        audioInputDeviceId: 'device-1',
      })

      // Mount provider with partial preferences
      const userPreferences = { autoAnswer: true } as Partial<UserPreferences>

      mount(ConfigProvider, {
        props: {
          userPreferences: userPreferences as UserPreferences,
          autoMerge: true,
        },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.userPreferences.autoAnswer).toBe(true)
      expect(configStore.userPreferences.audioInputDeviceId).toBe('device-1') // Preserved
    })
  })

  describe('Config Injection', () => {
    it('should provide config context to children', async () => {
      const ConsumerComponent = createConsumerComponent()
      const sipConfig = createMockSipConfig()

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      expect(consumer.vm.config).toBeDefined()
      expect(consumer.vm.config.hasSipConfig).toBe(true)
      expect(consumer.vm.config.sipConfig?.sipUri).toBe('sip:alice@example.com')
    })

    it('should expose reactive state', async () => {
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(ConfigProvider, {
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      expect(context.hasSipConfig).toBe(false)

      // Update via context
      const sipConfig = createMockSipConfig()
      context.setSipConfig(sipConfig)

      await nextTick()

      expect(context.hasSipConfig).toBe(true)
    })

    it('should expose all config properties', async () => {
      const ConsumerComponent = createConsumerComponent()
      const sipConfig = createMockSipConfig()
      const mediaConfig = createMockMediaConfig()
      const userPreferences = createMockUserPreferences()

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig, mediaConfig, userPreferences },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      expect(context.sipConfig).toBeDefined()
      expect(context.mediaConfig).toBeDefined()
      expect(context.userPreferences).toBeDefined()
      expect(context.hasSipConfig).toBe(true)
      expect(context.isConfigValid).toBe(true)
    })
  })

  describe('Provider Context Methods', () => {
    it('should allow setting SIP config via context', async () => {
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(ConfigProvider, {
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      const sipConfig = createMockSipConfig()
      const result = context.setSipConfig(sipConfig)

      expect(result.valid).toBe(true)
      expect(context.hasSipConfig).toBe(true)
      expect(context.sipConfig?.sipUri).toBe('sip:alice@example.com')
    })

    it('should allow updating SIP config via context', async () => {
      const ConsumerComponent = createConsumerComponent()
      const sipConfig = createMockSipConfig()

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      const result = context.updateSipConfig({ displayName: 'Bob' })

      expect(result.valid).toBe(true)
      expect(context.sipConfig?.displayName).toBe('Bob')
      expect(context.sipConfig?.sipUri).toBe('sip:alice@example.com') // Unchanged
    })

    it('should allow setting media config via context', async () => {
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(ConfigProvider, {
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      const mediaConfig = createMockMediaConfig({ video: true })
      const result = context.setMediaConfig(mediaConfig)

      expect(result.valid).toBe(true)
      expect(context.mediaConfig.video).toBe(true)
    })

    it('should allow updating media config via context', async () => {
      const ConsumerComponent = createConsumerComponent()
      const mediaConfig = createMockMediaConfig()

      const wrapper = mount(ConfigProvider, {
        props: { mediaConfig },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      const result = context.updateMediaConfig({ video: true })

      expect(result.valid).toBe(true)
      expect(context.mediaConfig.video).toBe(true)
    })

    it('should allow setting user preferences via context', async () => {
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(ConfigProvider, {
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      const userPreferences = createMockUserPreferences({ autoAnswer: true })
      context.setUserPreferences(userPreferences)

      await nextTick()

      expect(context.userPreferences.autoAnswer).toBe(true)
    })

    it('should allow updating user preferences via context', async () => {
      const ConsumerComponent = createConsumerComponent()
      const userPreferences = createMockUserPreferences()

      const wrapper = mount(ConfigProvider, {
        props: { userPreferences },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      context.updateUserPreferences({ autoAnswer: true })

      await nextTick()

      expect(context.userPreferences.autoAnswer).toBe(true)
    })

    it('should allow validating all configs via context', async () => {
      const ConsumerComponent = createConsumerComponent()
      const sipConfig = createMockSipConfig()

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      const result = context.validateAll()

      expect(result.valid).toBe(true)
    })

    it('should allow resetting config via context', async () => {
      const ConsumerComponent = createConsumerComponent()
      const sipConfig = createMockSipConfig()

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      expect(context.hasSipConfig).toBe(true)

      context.reset()

      await nextTick()

      expect(context.hasSipConfig).toBe(false)
    })
  })

  describe('Prop Changes', () => {
    it('should update config when sipConfig prop changes', async () => {
      const initialSipConfig = createMockSipConfig({ displayName: 'Initial' })

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig: initialSipConfig },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.sipConfig?.displayName).toBe('Initial')

      // Update prop
      const updatedSipConfig = createMockSipConfig({ displayName: 'Updated' })
      await wrapper.setProps({ sipConfig: updatedSipConfig })
      await nextTick()

      expect(configStore.sipConfig?.displayName).toBe('Updated')
    })

    it('should update config when mediaConfig prop changes', async () => {
      const initialMediaConfig = createMockMediaConfig({ video: false })

      const wrapper = mount(ConfigProvider, {
        props: { mediaConfig: initialMediaConfig },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.mediaConfig.video).toBe(false)

      // Update prop
      const updatedMediaConfig = createMockMediaConfig({ video: true })
      await wrapper.setProps({ mediaConfig: updatedMediaConfig })
      await nextTick()

      expect(configStore.mediaConfig.video).toBe(true)
    })

    it('should update config when userPreferences prop changes', async () => {
      const initialPreferences = createMockUserPreferences({ autoAnswer: false })

      const wrapper = mount(ConfigProvider, {
        props: { userPreferences: initialPreferences },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(configStore.userPreferences.autoAnswer).toBe(false)

      // Update prop
      const updatedPreferences = createMockUserPreferences({ autoAnswer: true })
      await wrapper.setProps({ userPreferences: updatedPreferences })
      await nextTick()

      expect(configStore.userPreferences.autoAnswer).toBe(true)
    })

    it('should handle deep prop changes', async () => {
      const sipConfig = createMockSipConfig()

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      // Modify nested property
      const modifiedConfig = { ...sipConfig, wsOptions: { connectionTimeout: 5000 } }
      await wrapper.setProps({ sipConfig: modifiedConfig })
      await nextTick()

      expect(configStore.sipConfig?.wsOptions?.connectionTimeout).toBe(5000)
    })
  })

  describe('useConfigProvider Hook', () => {
    it('should return config context when used within provider', async () => {
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(ConfigProvider, {
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      expect(consumer.vm.config).toBeDefined()
      expect(typeof consumer.vm.config.setSipConfig).toBe('function')
    })

    it('should throw error when used outside provider', () => {
      const ComponentWithoutProvider = defineComponent({
        setup() {
          expect(() => useConfigProvider()).toThrow(
            'useConfigProvider must be used within a ConfigProvider component'
          )
          return () => h('div', 'Test')
        },
      })

      mount(ComponentWithoutProvider)
    })
  })

  describe('Validation', () => {
    it('should expose validation result', async () => {
      const ConsumerComponent = createConsumerComponent()
      const invalidSipConfig = createMockSipConfig({ uri: 'invalid-uri' })

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig: invalidSipConfig },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      expect(context.lastValidation).toBeDefined()
      expect(context.lastValidation?.valid).toBe(false)
      expect(context.isConfigValid).toBe(false)
    })

    it('should update validation when config changes', async () => {
      const ConsumerComponent = createConsumerComponent()

      const wrapper = mount(ConfigProvider, {
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      // Set valid config
      const validSipConfig = createMockSipConfig()
      context.setSipConfig(validSipConfig)

      await nextTick()

      expect(context.isConfigValid).toBe(true)

      // Set invalid config
      const invalidSipConfig = createMockSipConfig({ uri: 'invalid' })
      context.setSipConfig(invalidSipConfig)

      await nextTick()

      expect(context.isConfigValid).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined props gracefully', async () => {
      const wrapper = mount(ConfigProvider, {
        props: {
          sipConfig: undefined,
          mediaConfig: undefined,
          userPreferences: undefined,
        },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      expect(wrapper.exists()).toBe(true)
      expect(configStore.hasSipConfig).toBe(false)
    })

    it('should handle rapid prop changes', async () => {
      const wrapper = mount(ConfigProvider, {
        props: { sipConfig: createMockSipConfig({ displayName: 'Name1' }) },
        slots: {
          default: () => h('div', 'Child'),
        },
      })

      await nextTick()

      // Rapid changes
      await wrapper.setProps({ sipConfig: createMockSipConfig({ displayName: 'Name2' }) })
      await wrapper.setProps({ sipConfig: createMockSipConfig({ displayName: 'Name3' }) })
      await wrapper.setProps({ sipConfig: createMockSipConfig({ displayName: 'Name4' }) })
      await nextTick()

      expect(configStore.sipConfig?.displayName).toBe('Name4')
    })

    it('should maintain reactivity after reset', async () => {
      const ConsumerComponent = createConsumerComponent()
      const sipConfig = createMockSipConfig()

      const wrapper = mount(ConfigProvider, {
        props: { sipConfig },
        slots: {
          default: () => h(ConsumerComponent),
        },
      })

      await nextTick()

      const consumer = wrapper.findComponent(ConsumerComponent)
      const context = consumer.vm.config

      expect(context.hasSipConfig).toBe(true)

      // Reset
      context.reset()
      await nextTick()

      expect(context.hasSipConfig).toBe(false)

      // Set new config
      context.setSipConfig(createMockSipConfig())
      await nextTick()

      expect(context.hasSipConfig).toBe(true)
    })
  })
})
