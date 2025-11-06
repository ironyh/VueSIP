/**
 * HookManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HookManager } from '../../../src/plugins/HookManager'
import { HookPriority } from '../../../src/types/plugin.types'
import type { PluginContext } from '../../../src/types/plugin.types'

describe('HookManager', () => {
  let hookManager: HookManager
  let mockContext: PluginContext

  beforeEach(() => {
    hookManager = new HookManager()

    // Create mock context
    mockContext = {
      eventBus: {} as any,
      sipClient: null,
      mediaManager: null,
      config: null,
      activeCalls: new Map(),
      hooks: {
        register: vi.fn(),
        unregister: vi.fn(),
        execute: vi.fn(),
      },
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      version: '1.0.0',
    }

    hookManager.setContext(mockContext)
  })

  describe('register', () => {
    it('should register a hook handler', () => {
      const handler = vi.fn()
      const id = hookManager.register('testHook', handler)

      expect(id).toBeDefined()
      expect(id).toContain('hook-')
      expect(hookManager.has('testHook')).toBe(true)
      expect(hookManager.count('testHook')).toBe(1)
    })

    it('should register multiple handlers for same hook', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      hookManager.register('testHook', handler1)
      hookManager.register('testHook', handler2)

      expect(hookManager.count('testHook')).toBe(2)
    })

    it('should sort handlers by priority', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      hookManager.register('testHook', handler1, { priority: HookPriority.Low })
      hookManager.register('testHook', handler2, { priority: HookPriority.High })
      hookManager.register('testHook', handler3, { priority: HookPriority.Highest })

      const hooks = hookManager.get('testHook')
      expect(hooks[0].handler).toBe(handler3) // Highest
      expect(hooks[1].handler).toBe(handler2) // High
      expect(hooks[2].handler).toBe(handler1) // Low
    })

    it('should support custom priority values', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      hookManager.register('testHook', handler1, { priority: 100 })
      hookManager.register('testHook', handler2, { priority: 200 })

      const hooks = hookManager.get('testHook')
      expect(hooks[0].handler).toBe(handler2) // 200
      expect(hooks[1].handler).toBe(handler1) // 100
    })

    it('should store plugin name with hook', () => {
      const handler = vi.fn()
      hookManager.register('testHook', handler, {}, 'my-plugin')

      const hooks = hookManager.get('testHook')
      expect(hooks[0].pluginName).toBe('my-plugin')
    })
  })

  describe('unregister', () => {
    it('should unregister a hook by ID', () => {
      const handler = vi.fn()
      const id = hookManager.register('testHook', handler)

      expect(hookManager.has('testHook')).toBe(true)

      const result = hookManager.unregister(id)

      expect(result).toBe(true)
      expect(hookManager.has('testHook')).toBe(false)
    })

    it('should return false for non-existent hook ID', () => {
      const result = hookManager.unregister('non-existent')
      expect(result).toBe(false)
    })

    it('should remove only specified hook', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const id1 = hookManager.register('testHook', handler1)
      hookManager.register('testHook', handler2)

      hookManager.unregister(id1)

      expect(hookManager.count('testHook')).toBe(1)
    })
  })

  describe('unregisterByPlugin', () => {
    it('should unregister all hooks for a plugin', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      hookManager.register('hook1', handler1, {}, 'plugin1')
      hookManager.register('hook2', handler2, {}, 'plugin1')
      hookManager.register('hook3', handler3, {}, 'plugin2')

      const count = hookManager.unregisterByPlugin('plugin1')

      expect(count).toBe(2)
      expect(hookManager.has('hook1')).toBe(false)
      expect(hookManager.has('hook2')).toBe(false)
      expect(hookManager.has('hook3')).toBe(true)
    })

    it('should return 0 if no hooks found for plugin', () => {
      const count = hookManager.unregisterByPlugin('non-existent')
      expect(count).toBe(0)
    })
  })

  describe('execute', () => {
    it('should execute hook handlers', async () => {
      const handler = vi.fn().mockResolvedValue('result')
      hookManager.register('testHook', handler)

      const results = await hookManager.execute('testHook', { foo: 'bar' })

      expect(handler).toHaveBeenCalledWith(mockContext, { foo: 'bar' })
      expect(results).toEqual(['result'])
    })

    it('should execute multiple handlers in priority order', async () => {
      const order: number[] = []
      const handler1 = vi.fn().mockImplementation(() => order.push(1))
      const handler2 = vi.fn().mockImplementation(() => order.push(2))
      const handler3 = vi.fn().mockImplementation(() => order.push(3))

      hookManager.register('testHook', handler1, { priority: HookPriority.Low })
      hookManager.register('testHook', handler2, { priority: HookPriority.High })
      hookManager.register('testHook', handler3, { priority: HookPriority.Highest })

      await hookManager.execute('testHook')

      expect(order).toEqual([3, 2, 1])
    })

    it('should return empty array if no handlers registered', async () => {
      const results = await hookManager.execute('nonExistentHook')
      expect(results).toEqual([])
    })

    it('should stop propagation if handler returns false', async () => {
      const handler1 = vi.fn().mockResolvedValue(false)
      const handler2 = vi.fn().mockResolvedValue('result')

      hookManager.register('testHook', handler1, { priority: HookPriority.High })
      hookManager.register('testHook', handler2, { priority: HookPriority.Low })

      const results = await hookManager.execute('testHook')

      expect(handler1).toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
      expect(results).toEqual([false])
    })

    it('should remove once handlers after execution', async () => {
      const handler = vi.fn().mockResolvedValue('result')
      hookManager.register('testHook', handler, { once: true })

      expect(hookManager.count('testHook')).toBe(1)

      await hookManager.execute('testHook')

      expect(hookManager.count('testHook')).toBe(0)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should execute only once handlers once', async () => {
      const handler = vi.fn().mockResolvedValue('result')
      hookManager.register('testHook', handler, { once: true })

      await hookManager.execute('testHook')
      await hookManager.execute('testHook')

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should respect condition function', async () => {
      const handler = vi.fn().mockResolvedValue('result')
      const condition = vi.fn().mockReturnValue(false)

      hookManager.register('testHook', handler, { condition })

      const results = await hookManager.execute('testHook', { foo: 'bar' })

      expect(condition).toHaveBeenCalledWith(mockContext, { foo: 'bar' })
      expect(handler).not.toHaveBeenCalled()
      expect(results).toEqual([])
    })

    it('should execute handler if condition returns true', async () => {
      const handler = vi.fn().mockResolvedValue('result')
      const condition = vi.fn().mockReturnValue(true)

      hookManager.register('testHook', handler, { condition })

      const results = await hookManager.execute('testHook')

      expect(handler).toHaveBeenCalled()
      expect(results).toEqual(['result'])
    })

    it('should continue executing if handler throws error', async () => {
      const handler1 = vi.fn().mockRejectedValue(new Error('Handler error'))
      const handler2 = vi.fn().mockResolvedValue('result2')

      hookManager.register('testHook', handler1, { priority: HookPriority.High })
      hookManager.register('testHook', handler2, { priority: HookPriority.Low })

      const results = await hookManager.execute('testHook')

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
      expect(results).toEqual(['result2'])
    })

    it('should handle async handlers', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('async result'), 10)
          })
      )

      hookManager.register('testHook', handler)

      const results = await hookManager.execute('testHook')

      expect(results).toEqual(['async result'])
    })
  })

  describe('get', () => {
    it('should return hooks for a name', () => {
      const handler = vi.fn()
      hookManager.register('testHook', handler)

      const hooks = hookManager.get('testHook')

      expect(hooks).toHaveLength(1)
      expect(hooks[0].handler).toBe(handler)
    })

    it('should return empty array for non-existent hook', () => {
      const hooks = hookManager.get('nonExistent')
      expect(hooks).toEqual([])
    })
  })

  describe('has', () => {
    it('should return true if hook has handlers', () => {
      hookManager.register('testHook', vi.fn())
      expect(hookManager.has('testHook')).toBe(true)
    })

    it('should return false if hook has no handlers', () => {
      expect(hookManager.has('nonExistent')).toBe(false)
    })
  })

  describe('count', () => {
    it('should return number of handlers for hook', () => {
      hookManager.register('testHook', vi.fn())
      hookManager.register('testHook', vi.fn())
      hookManager.register('testHook', vi.fn())

      expect(hookManager.count('testHook')).toBe(3)
    })

    it('should return 0 for non-existent hook', () => {
      expect(hookManager.count('nonExistent')).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear all hooks', () => {
      hookManager.register('hook1', vi.fn())
      hookManager.register('hook2', vi.fn())
      hookManager.register('hook3', vi.fn())

      hookManager.clear()

      expect(hookManager.has('hook1')).toBe(false)
      expect(hookManager.has('hook2')).toBe(false)
      expect(hookManager.has('hook3')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should return all hooks', () => {
      hookManager.register('hook1', vi.fn())
      hookManager.register('hook2', vi.fn())

      const all = hookManager.getAll()

      expect(all.size).toBe(2)
      expect(all.has('hook1')).toBe(true)
      expect(all.has('hook2')).toBe(true)
    })

    it('should return empty map if no hooks', () => {
      const all = hookManager.getAll()
      expect(all.size).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return hook statistics', () => {
      hookManager.register('hook1', vi.fn(), {}, 'plugin1')
      hookManager.register('hook1', vi.fn(), {}, 'plugin1')
      hookManager.register('hook2', vi.fn(), {}, 'plugin2')

      const stats = hookManager.getStats()

      expect(stats.totalHooks).toBe(2)
      expect(stats.hookNames).toContain('hook1')
      expect(stats.hookNames).toContain('hook2')
      expect(stats.totalHandlers).toBe(3)
      expect(stats.handlersByPlugin['plugin1']).toBe(2)
      expect(stats.handlersByPlugin['plugin2']).toBe(1)
    })

    it('should return zero stats if no hooks', () => {
      const stats = hookManager.getStats()

      expect(stats.totalHooks).toBe(0)
      expect(stats.hookNames).toEqual([])
      expect(stats.totalHandlers).toBe(0)
      expect(stats.handlersByPlugin).toEqual({})
    })
  })
})
