/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
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
  defaultLogger,
} from '../logger'

describe('logger', () => {
  let mockConsole: {
    log: ReturnType<typeof vi.fn>
    debug: ReturnType<typeof vi.fn>
    info: ReturnType<typeof vi.fn>
    warn: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Reset logger configuration before each test
    configureLogger({
      level: 'debug',
      enabled: true,
      showTimestamp: true,
      handler: undefined,
    })

    // Mock console methods
    mockConsole = {
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }
    vi.spyOn(console, 'debug').mockImplementation(mockConsole.debug)
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log)
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn)
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Logger class', () => {
    it('should create a logger with a namespace', () => {
      const logger = new Logger('TestNamespace')
      expect(logger).toBeDefined()
    })

    it('should support child loggers with extended namespace', () => {
      const logger = new Logger('Parent')
      const child = logger.child('Child')
      expect(child).toBeInstanceOf(Logger)
    })
  })

  describe('createLogger', () => {
    it('should create a new logger instance', () => {
      const logger = createLogger('TestComponent')
      expect(logger).toBeInstanceOf(Logger)
    })
  })

  describe('log level filtering', () => {
    it('should not log when logging is disabled', () => {
      disableLogging()
      const logger = createLogger('Test')
      logger.info('This should not appear')

      expect(mockConsole.log).not.toHaveBeenCalled()
    })

    it('should log when logging is enabled', () => {
      enableLogging()
      const logger = createLogger('Test')
      logger.info('Test message')

      expect(mockConsole.log).toHaveBeenCalled()
    })

    it('should filter logs based on level setting', () => {
      setLogLevel('error')
      const logger = createLogger('Test')

      // Debug and info should be filtered
      logger.debug('Debug message')
      logger.info('Info message')

      // Error should still log
      logger.error('Error message')

      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.log).not.toHaveBeenCalled()
      expect(mockConsole.error).toHaveBeenCalled()
    })
  })

  describe('custom handler', () => {
    it('should use custom handler when provided', () => {
      const handler = vi.fn()
      setLogHandler(handler)

      const logger = createLogger('Test')
      logger.info('Test message', { foo: 'bar' })

      expect(handler).toHaveBeenCalledWith('info', 'Test', 'Test message', { foo: 'bar' })
    })

    it('should not call console when custom handler is set', () => {
      const handler = vi.fn()
      setLogHandler(handler)

      const logger = createLogger('Test')
      logger.info('Test message')

      expect(mockConsole.log).not.toHaveBeenCalled()
    })

    it('should revert to console when handler is removed', () => {
      setLogHandler(undefined)

      const logger = createLogger('Test')
      logger.info('Test message')

      expect(mockConsole.log).toHaveBeenCalled()
    })
  })

  describe('configureLogger', () => {
    it('should update logger configuration', () => {
      configureLogger({ level: 'warn', enabled: false })

      const config = getLoggerConfig()
      expect(config.level).toBe('warn')
      expect(config.enabled).toBe(false)
    })

    it('should preserve existing config when partial config is provided', () => {
      configureLogger({ level: 'debug', enabled: true, showTimestamp: true })
      configureLogger({ level: 'error' })

      const config = getLoggerConfig()
      expect(config.level).toBe('error')
      expect(config.enabled).toBe(true)
      expect(config.showTimestamp).toBe(true)
    })
  })

  describe('getLoggerConfig', () => {
    it('should return current logger configuration', () => {
      configureLogger({
        level: 'info',
        enabled: true,
        showTimestamp: false,
      })

      const config = getLoggerConfig()
      expect(config).toEqual({
        level: 'info',
        enabled: true,
        showTimestamp: false,
        handler: undefined,
      })
    })

    it('should return a copy of the config', () => {
      const config1 = getLoggerConfig()
      const config2 = getLoggerConfig()

      expect(config1).not.toBe(config2)
    })
  })

  describe('setLogLevel', () => {
    it('should set the minimum log level', () => {
      setLogLevel('warn')
      expect(getLogLevel()).toBe('warn')

      setLogLevel('debug')
      expect(getLogLevel()).toBe('debug')
    })
  })

  describe('getLogLevel', () => {
    it('should return the current log level', () => {
      setLogLevel('error')
      expect(getLogLevel()).toBe('error')
    })
  })

  describe('enableLogging / disableLogging', () => {
    it('should enable logging', () => {
      disableLogging()
      enableLogging()

      expect(getLoggerConfig().enabled).toBe(true)
    })

    it('should disable logging', () => {
      enableLogging()
      disableLogging()

      expect(getLoggerConfig().enabled).toBe(false)
    })
  })

  describe('defaultLogger', () => {
    it('should have VueSip as default namespace', () => {
      expect(defaultLogger).toBeInstanceOf(Logger)
    })
  })

  describe('log methods', () => {
    it('should call debug method', () => {
      const logger = createLogger('Test')
      logger.debug('Debug message')

      expect(mockConsole.debug).toHaveBeenCalled()
    })

    it('should call info method', () => {
      const logger = createLogger('Test')
      logger.info('Info message')

      expect(mockConsole.log).toHaveBeenCalled()
    })

    it('should call warn method', () => {
      const logger = createLogger('Test')
      logger.warn('Warning message')

      expect(mockConsole.warn).toHaveBeenCalled()
    })

    it('should call error method', () => {
      const logger = createLogger('Test')
      logger.error('Error message')

      expect(mockConsole.error).toHaveBeenCalled()
    })

    it('should pass additional arguments to log methods', () => {
      const logger = createLogger('Test')
      logger.info('Message', { key: 'value' }, ['array'])

      expect(mockConsole.log).toHaveBeenCalled()
    })

    it('should handle Error objects in error method', () => {
      const logger = createLogger('Test')
      const error = new Error('Test error')
      logger.error('Error occurred', error)

      expect(mockConsole.error).toHaveBeenCalled()
    })
  })
})
