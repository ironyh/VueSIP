/**
 * VueSip main entry point tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createApp } from 'vue'
import {
  createVueSip,
  version,
  metadata,
  EventBus,
  SipClient,
  CallSession,
  MediaManager,
  TransportManager,
  AmiClient,
} from '@/index'

describe('VueSip Entry Point', () => {
  describe('version and metadata', () => {
    it('should export version', () => {
      expect(version).toBe('1.0.5')
    })

    it('should export metadata', () => {
      expect(metadata).toEqual({
        name: 'VueSip',
        version: '1.0.5',
        description: 'A headless Vue.js component library for SIP/VoIP applications',
        author: 'VueSip Team',
        license: 'MIT',
        repository: 'https://github.com/ironyh/VueSIP',
        homepage: 'https://vuesip.com',
        bugs: 'https://github.com/ironyh/VueSIP/issues',
      })
    })
  })

  describe('core classes exports', () => {
    it('should export EventBus', () => {
      expect(EventBus).toBeDefined()
      const eventBus = new EventBus()
      expect(eventBus).toBeInstanceOf(EventBus)
    })

    it('should export SipClient', () => {
      expect(SipClient).toBeDefined()
    })

    it('should export CallSession', () => {
      expect(CallSession).toBeDefined()
    })

    it('should export MediaManager', () => {
      expect(MediaManager).toBeDefined()
    })

    it('should export TransportManager', () => {
      expect(TransportManager).toBeDefined()
    })

    it('should export AmiClient', () => {
      expect(AmiClient).toBeDefined()
    })
  })

  describe('createVueSip plugin', () => {
    let app: ReturnType<typeof createApp>

    beforeEach(() => {
      app = createApp({})
    })

    it('should create plugin with default options', () => {
      const plugin = createVueSip()
      expect(plugin).toHaveProperty('install')
      expect(typeof plugin.install).toBe('function')
    })

    it('should install plugin with default options', () => {
      const plugin = createVueSip()
      plugin.install(app)

      expect(app.config.globalProperties.$vuesip).toBeDefined()
      expect(app.config.globalProperties.$vuesip.version).toBe('1.0.5')
    })

    it('should install plugin with debug enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const plugin = createVueSip({ debug: true })
      plugin.install(app)

      expect(app.config.globalProperties.$vuesip.options.debug).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should install plugin with custom log level', () => {
      const plugin = createVueSip({ logLevel: 'info' })
      plugin.install(app)

      expect(app.config.globalProperties.$vuesip.options.logLevel).toBe('info')
    })

    it('should install plugin with sipConfig', () => {
      const sipConfig = {
        uri: 'wss://test.com',
        sipUri: 'sip:test@test.com',
        password: 'testpass',
      }

      const plugin = createVueSip({ sipConfig })
      plugin.install(app)

      expect(app.config.globalProperties.$vuesip.options.sipConfig).toEqual(sipConfig)
    })

    it('should install plugin with mediaConfig', () => {
      const mediaConfig = {
        audioEnabled: true,
        videoEnabled: false,
      }

      const plugin = createVueSip({ mediaConfig })
      plugin.install(app)

      expect(app.config.globalProperties.$vuesip.options.mediaConfig).toEqual(mediaConfig)
    })

    it('should install plugin with userPreferences', () => {
      const userPreferences = {
        autoAnswer: true,
        recordCalls: false,
      }

      const plugin = createVueSip({ userPreferences })
      plugin.install(app)

      expect(app.config.globalProperties.$vuesip.options.userPreferences).toEqual(userPreferences)
    })

    it('should install plugin with custom logger', () => {
      const customLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const plugin = createVueSip({ logger: customLogger as any })
      plugin.install(app)

      expect(app.config.globalProperties.$vuesip.logger).toBe(customLogger)
    })

    it('should install plugin with all options', () => {
      const options = {
        debug: true,
        logLevel: 'debug' as const,
        sipConfig: {
          uri: 'wss://test.com',
          sipUri: 'sip:test@test.com',
          password: 'testpass',
        },
        mediaConfig: {
          audioEnabled: true,
          videoEnabled: true,
        },
        userPreferences: {
          autoAnswer: false,
          recordCalls: true,
        },
      }

      const plugin = createVueSip(options)
      plugin.install(app)

      expect(app.config.globalProperties.$vuesip.options).toMatchObject(options)
      expect(app.config.globalProperties.$vuesip.version).toBe('1.0.5')
    })
  })
})
