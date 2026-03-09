/**
 * Logger Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  Logger,
  createLogger,
  configureLogger,
  getLoggerConfig,
  enableLogging,
  disableLogging,
  setLogLevel,
  getLogLevel,
  setLogHandler,
} from '@/utils/logger'

describe('Logger', () => {
  beforeEach(() => {
    // Reset to default config before each test
    configureLogger({
      level: 'info',
      enabled: true,
      showTimestamp: true,
      handler: undefined,
    })
  })

  afterEach(() => {
    setLogHandler(undefined)
  })

  describe('createLogger', () => {
    it('creates a logger instance with given namespace', () => {
      const logger = createLogger('TestNamespace')
      expect(logger).toBeInstanceOf(Logger)
    })
  })

  describe('log levels', () => {
    it('logs debug messages when level is debug', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      setLogLevel('debug')
      const logger = createLogger('Test')
      logger.debug('debug message')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('logs info messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('Test')
      logger.info('info message')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('logs warn messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const logger = createLogger('Test')
      logger.warn('warn message')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('logs error messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Test')
      logger.error('error message')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('configuration', () => {
    it('respects enabled flag when disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      disableLogging()
      const logger = createLogger('Test')
      logger.info('should not log')
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('respects enabled flag when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      enableLogging()
      const logger = createLogger('Test')
      logger.info('should log')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('filters logs below minimum level', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      setLogLevel('error')
      const logger = createLogger('Test')
      logger.info('should not log')
      logger.error('should log')
      expect(consoleSpy).toHaveBeenCalledTimes(1)
      consoleSpy.mockRestore()
    })

    it('returns current config', () => {
      const config = getLoggerConfig()
      expect(config).toHaveProperty('level')
      expect(config).toHaveProperty('enabled')
      expect(config).toHaveProperty('showTimestamp')
    })

    it('returns current log level', () => {
      setLogLevel('warn')
      expect(getLogLevel()).toBe('warn')
    })
  })

  describe('custom handler', () => {
    it('calls custom handler instead of console', () => {
      const handlerMock = vi.fn()
      setLogHandler(handlerMock)
      const logger = createLogger('Test')
      logger.info('test message', { foo: 'bar' })

      expect(handlerMock).toHaveBeenCalledWith('info', 'Test', 'test message', { foo: 'bar' })
    })

    it('does not call console when handler is set', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const handlerMock = vi.fn()
      setLogHandler(handlerMock)
      const logger = createLogger('Test')
      logger.info('test message')

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('can remove custom handler', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const handlerMock = vi.fn()
      setLogHandler(handlerMock)
      setLogHandler(undefined)

      const logger = createLogger('Test')
      logger.info('test message')

      expect(handlerMock).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('child logger', () => {
    it('creates child logger with extended namespace', () => {
      const parentLogger = createLogger('Parent')
      const childLogger = parentLogger.child('Child')

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      childLogger.info('child message')

      // Check that namespace includes parent:child
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('argument passing', () => {
    it('passes multiple arguments correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('Test')
      logger.info('message', 'arg1', 'arg2', { obj: true })

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('passes Error objects correctly', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Test')
      const error = new Error('test error')
      logger.error('error occurred', error)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
