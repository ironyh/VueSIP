/**
 * PluginManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PluginManager } from '../../../src/plugins/PluginManager'
import { EventBus } from '../../../src/core/EventBus'
import { PluginState } from '../../../src/types/plugin.types'
import type { Plugin, PluginContext } from '../../../src/types/plugin.types'

describe('PluginManager', () => {
  let pluginManager: PluginManager
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
    pluginManager = new PluginManager(eventBus, '1.0.0')
  })

  describe('constructor', () => {
    it('should create a plugin manager', () => {
      expect(pluginManager).toBeDefined()
      expect(pluginManager.getAll().size).toBe(0)
    })
  })

  describe('register', () => {
    it('should register a plugin', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)

      expect(pluginManager.has('test-plugin')).toBe(true)
      expect(plugin.install).toHaveBeenCalled()
    })

    it('should merge default config with provided config', async () => {
      const plugin: Plugin<{ foo: string; bar: number }> = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        defaultConfig: {
          foo: 'default',
          bar: 42,
          enabled: true,
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin, { foo: 'custom' })

      const entry = pluginManager.get('test-plugin')
      expect(entry?.config.foo).toBe('custom')
      expect(entry?.config.bar).toBe(42)
    })

    it('should not install if disabled in config', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin, { enabled: false })

      expect(pluginManager.has('test-plugin')).toBe(true)
      expect(plugin.install).not.toHaveBeenCalled()

      const entry = pluginManager.get('test-plugin')
      expect(entry?.state).toBe(PluginState.Registered)
    })

    it('should throw if plugin already registered', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)

      await expect(pluginManager.register(plugin)).rejects.toThrow(
        'Plugin already registered: test-plugin'
      )
    })

    it('should check version compatibility (minVersion)', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
          minVersion: '2.0.0',
        },
        install: vi.fn(),
      }

      await expect(pluginManager.register(plugin)).rejects.toThrow(
        'requires VueSip version >= 2.0.0'
      )
    })

    it('should check version compatibility (maxVersion)', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
          maxVersion: '0.5.0',
        },
        install: vi.fn(),
      }

      await expect(pluginManager.register(plugin)).rejects.toThrow(
        'requires VueSip version <= 0.5.0'
      )
    })

    it('should check plugin dependencies', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
          dependencies: ['dependency-plugin'],
        },
        install: vi.fn(),
      }

      await expect(pluginManager.register(plugin)).rejects.toThrow(
        'requires plugin: dependency-plugin'
      )
    })

    it('should register if dependencies are met', async () => {
      const depPlugin: Plugin = {
        metadata: {
          name: 'dependency-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
          dependencies: ['dependency-plugin'],
        },
        install: vi.fn(),
      }

      await pluginManager.register(depPlugin)
      await pluginManager.register(plugin)

      expect(pluginManager.has('test-plugin')).toBe(true)
    })

    it('should set plugin state to Installed on success', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)

      const entry = pluginManager.get('test-plugin')
      expect(entry?.state).toBe(PluginState.Installed)
      expect(entry?.installedAt).toBeDefined()
    })

    it('should set plugin state to Failed on install error', async () => {
      const error = new Error('Install failed')
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn().mockRejectedValue(error),
      }

      await expect(pluginManager.register(plugin)).rejects.toThrow('Install failed')

      const entry = pluginManager.get('test-plugin')
      expect(entry?.state).toBe(PluginState.Failed)
      expect(entry?.error).toBe(error)
    })

    it('should emit plugin:installed event on success', async () => {
      const listener = vi.fn()
      eventBus.on('plugin:installed', listener)

      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)

      expect(listener).toHaveBeenCalledWith({
        pluginName: 'test-plugin',
        metadata: plugin.metadata,
      })
    })

    it('should emit plugin:error event on failure', async () => {
      const listener = vi.fn()
      eventBus.on('plugin:error', listener)

      const error = new Error('Install failed')
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn().mockRejectedValue(error),
      }

      await expect(pluginManager.register(plugin)).rejects.toThrow()

      expect(listener).toHaveBeenCalledWith({
        pluginName: 'test-plugin',
        error,
      })
    })
  })

  describe('unregister', () => {
    it('should unregister a plugin', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
        uninstall: vi.fn(),
      }

      await pluginManager.register(plugin)
      await pluginManager.unregister('test-plugin')

      expect(pluginManager.has('test-plugin')).toBe(false)
      expect(plugin.uninstall).toHaveBeenCalled()
    })

    it('should throw if plugin not found', async () => {
      await expect(pluginManager.unregister('non-existent')).rejects.toThrow(
        'Plugin not found: non-existent'
      )
    })

    it('should work without uninstall method', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)
      await pluginManager.unregister('test-plugin')

      expect(pluginManager.has('test-plugin')).toBe(false)
    })

    it('should emit plugin:unregistered event', async () => {
      const listener = vi.fn()
      eventBus.on('plugin:unregistered', listener)

      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)
      await pluginManager.unregister('test-plugin')

      expect(listener).toHaveBeenCalledWith({ pluginName: 'test-plugin' })
    })
  })

  describe('get', () => {
    it('should get a plugin entry', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)

      const entry = pluginManager.get('test-plugin')
      expect(entry).toBeDefined()
      expect(entry?.plugin).toBe(plugin)
    })

    it('should return undefined for non-existent plugin', () => {
      const entry = pluginManager.get('non-existent')
      expect(entry).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true if plugin is registered', async () => {
      const plugin: Plugin = {
        metadata: {
          name: 'test-plugin',
          version: '1.0.0',
        },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)

      expect(pluginManager.has('test-plugin')).toBe(true)
    })

    it('should return false if plugin is not registered', () => {
      expect(pluginManager.has('non-existent')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should return all plugins', async () => {
      const plugin1: Plugin = {
        metadata: { name: 'plugin1', version: '1.0.0' },
        install: vi.fn(),
      }
      const plugin2: Plugin = {
        metadata: { name: 'plugin2', version: '1.0.0' },
        install: vi.fn(),
      }

      await pluginManager.register(plugin1)
      await pluginManager.register(plugin2)

      const all = pluginManager.getAll()
      expect(all.size).toBe(2)
      expect(all.has('plugin1')).toBe(true)
      expect(all.has('plugin2')).toBe(true)
    })

    it('should return empty map if no plugins', () => {
      const all = pluginManager.getAll()
      expect(all.size).toBe(0)
    })
  })

  describe('updateConfig', () => {
    it('should update plugin configuration', async () => {
      const plugin: Plugin<{ foo: string }> = {
        metadata: { name: 'test-plugin', version: '1.0.0' },
        defaultConfig: { foo: 'default', enabled: true },
        install: vi.fn(),
        updateConfig: vi.fn(),
      }

      await pluginManager.register(plugin)
      await pluginManager.updateConfig('test-plugin', { foo: 'updated' })

      const entry = pluginManager.get('test-plugin')
      expect(entry?.config.foo).toBe('updated')
      expect(plugin.updateConfig).toHaveBeenCalled()
    })

    it('should throw if plugin not found', async () => {
      await expect(pluginManager.updateConfig('non-existent', {})).rejects.toThrow(
        'Plugin not found: non-existent'
      )
    })

    it('should work without updateConfig method', async () => {
      const plugin: Plugin<{ foo: string }> = {
        metadata: { name: 'test-plugin', version: '1.0.0' },
        defaultConfig: { foo: 'default', enabled: true },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)
      await pluginManager.updateConfig('test-plugin', { foo: 'updated' })

      const entry = pluginManager.get('test-plugin')
      expect(entry?.config.foo).toBe('updated')
    })

    it('should emit plugin:configUpdated event', async () => {
      const listener = vi.fn()
      eventBus.on('plugin:configUpdated', listener)

      const plugin: Plugin<{ foo: string }> = {
        metadata: { name: 'test-plugin', version: '1.0.0' },
        defaultConfig: { foo: 'default', enabled: true },
        install: vi.fn(),
      }

      await pluginManager.register(plugin)
      await pluginManager.updateConfig('test-plugin', { foo: 'updated' })

      expect(listener).toHaveBeenCalledWith({
        pluginName: 'test-plugin',
        config: expect.objectContaining({ foo: 'updated' }),
      })
    })
  })

  describe('executeHook', () => {
    it('should execute hooks', async () => {
      const plugin: Plugin = {
        metadata: { name: 'test-plugin', version: '1.0.0' },
        install: async (context: PluginContext) => {
          context.hooks.register('testHook', () => 'result')
        },
      }

      await pluginManager.register(plugin)

      const results = await pluginManager.executeHook('testHook')
      expect(results).toEqual(['result'])
    })
  })

  describe('destroy', () => {
    it('should unregister all plugins', async () => {
      const plugin1: Plugin = {
        metadata: { name: 'plugin1', version: '1.0.0' },
        install: vi.fn(),
        uninstall: vi.fn(),
      }
      const plugin2: Plugin = {
        metadata: { name: 'plugin2', version: '1.0.0' },
        install: vi.fn(),
        uninstall: vi.fn(),
      }

      await pluginManager.register(plugin1)
      await pluginManager.register(plugin2)

      await pluginManager.destroy()

      expect(pluginManager.has('plugin1')).toBe(false)
      expect(pluginManager.has('plugin2')).toBe(false)
      expect(plugin1.uninstall).toHaveBeenCalled()
      expect(plugin2.uninstall).toHaveBeenCalled()
    })

    it('should continue if unregister fails', async () => {
      const plugin1: Plugin = {
        metadata: { name: 'plugin1', version: '1.0.0' },
        install: vi.fn(),
        uninstall: vi.fn().mockRejectedValue(new Error('Uninstall failed')),
      }
      const plugin2: Plugin = {
        metadata: { name: 'plugin2', version: '1.0.0' },
        install: vi.fn(),
        uninstall: vi.fn(),
      }

      await pluginManager.register(plugin1)
      await pluginManager.register(plugin2)

      await pluginManager.destroy()

      expect(pluginManager.has('plugin1')).toBe(false)
      expect(pluginManager.has('plugin2')).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return plugin statistics', async () => {
      const plugin1: Plugin = {
        metadata: { name: 'plugin1', version: '1.0.0' },
        install: vi.fn(),
      }
      const plugin2: Plugin = {
        metadata: { name: 'plugin2', version: '1.0.0' },
        install: vi.fn().mockRejectedValue(new Error('Failed')),
      }

      await pluginManager.register(plugin1)
      await expect(pluginManager.register(plugin2)).rejects.toThrow()

      const stats = pluginManager.getStats()

      expect(stats.totalPlugins).toBe(2)
      expect(stats.installedPlugins).toBe(1)
      expect(stats.failedPlugins).toBe(1)
      expect(stats.pluginsByState[PluginState.Installed]).toBe(1)
      expect(stats.pluginsByState[PluginState.Failed]).toBe(1)
    })
  })

  describe('setters', () => {
    it('should set SIP client', () => {
      const sipClient = {} as any
      expect(() => pluginManager.setSipClient(sipClient)).not.toThrow()
    })

    it('should set media manager', () => {
      const mediaManager = {} as any
      expect(() => pluginManager.setMediaManager(mediaManager)).not.toThrow()
    })

    it('should set config', () => {
      const config = {} as any
      expect(() => pluginManager.setConfig(config)).not.toThrow()
    })

    it('should set active calls', () => {
      const activeCalls = new Map()
      expect(() => pluginManager.setActiveCalls(activeCalls)).not.toThrow()
    })
  })

  describe('plugin context', () => {
    it('should provide context to plugin install', async () => {
      let receivedContext: PluginContext | null = null

      const plugin: Plugin = {
        metadata: { name: 'test-plugin', version: '1.0.0' },
        install: async (context: PluginContext) => {
          receivedContext = context
        },
      }

      await pluginManager.register(plugin)

      expect(receivedContext).not.toBeNull()
      expect(receivedContext?.eventBus).toBe(eventBus)
      expect(receivedContext?.version).toBe('1.0.0')
      expect(receivedContext?.hooks).toBeDefined()
      expect(receivedContext?.logger).toBeDefined()
    })
  })
})
