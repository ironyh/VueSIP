/**
 * Test Setup
 *
 * Global setup for Vitest tests with Vue 3 composable support
 *
 * This setup file provides:
 * - Vue app instance for composable testing
 * - Mock WebRTC and media APIs
 * - Mock JsSIP library
 * - Global test utilities
 * - Logger configuration for tests
 */

import { vi, afterEach, beforeEach } from 'vitest'
import { config } from '@vue/test-utils'
import { createApp } from 'vue'
import { configureLogger } from '../src/utils/logger'

// ==========================================
// LOCALSTORAGE MOCK
// ==========================================
// Create a proper localStorage mock that works in jsdom
class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map()

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] ?? null
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

// Install localStorage mock globally
const localStorageMock = new LocalStorageMock()
const sessionStorageMock = new LocalStorageMock()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
})

// Clear storage before each test
beforeEach(() => {
  localStorageMock.clear()
  sessionStorageMock.clear()
})

// ==========================================
// VUE TEST UTILS CONFIGURATION
// ==========================================
// Configure Vue Test Utils for optimal testing
config.global.config.errorHandler = (err) => {
  // Suppress Vue warnings in tests unless they're critical
  if (err instanceof Error && !err.message.includes('Avoid app logic')) {
    console.error(err)
  }
}

// Set up global properties if needed
config.global.mocks = {
  // Add global mocks here if needed
}

// ==========================================
// VUE APP INSTANCE FOR COMPOSABLES
// ==========================================
// Create a Vue app instance to provide proper context for composables
// This eliminates "onUnmounted is called when there is no active component instance" warnings
let app: ReturnType<typeof createApp> | null = null

// Create app instance before each test
export function setupVueApp() {
  if (!app) {
    app = createApp({})
  }
  return app
}

// Clean up app instance after each test
afterEach(() => {
  if (app) {
    try {
      app.unmount()
    } catch (_e) {
      // Ignore unmount errors in tests
    }
    app = null
  }
})

// Create shared mockUA instance that can be accessed from test files
// This is exported so tests can set up event handlers and inspect config
export const mockUA: any = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  unregister: vi.fn().mockResolvedValue(undefined),
  call: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(false),
  isRegistered: vi.fn().mockReturnValue(false),
  on: vi.fn(),
  once: vi.fn(),
  off: vi.fn(),
}

// Mock JsSIP globally with Promise support for async operations
vi.mock('jssip', () => {
  const mod = {
    UA: vi.fn(function (this: any, uaConfig: any) {
      // Store config for inspection in tests
      mockUA._config = uaConfig
      return mockUA
    }),
    WebSocketInterface: vi.fn(),
    debug: {
      enable: vi.fn(),
      disable: vi.fn(),
    },
    version: '3.10.0',
    name: 'JsSIP',
  }
  return {
    ...mod,
    default: mod,
  }
})

// Mock sip.js as not available (will be used by SipJsAdapter tests)
// This simulates sip.js not being installed
vi.mock('sip.js', () => {
  throw new Error('Module not found: sip.js')
})

// Mock WebRTC APIs
if (typeof global.RTCPeerConnection === 'undefined') {
  ;(global as any).RTCPeerConnection = vi.fn().mockImplementation(() => ({
    localDescription: null,
    remoteDescription: null,
    signalingState: 'stable',
    iceConnectionState: 'new',
    connectionState: 'new',
    getSenders: vi.fn().mockReturnValue([]),
    getReceivers: vi.fn().mockReturnValue([]),
    getTransceivers: vi.fn().mockReturnValue([]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    addTransceiver: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({}),
    createAnswer: vi.fn().mockResolvedValue({}),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

if (typeof global.RTCSessionDescription === 'undefined') {
  ;(global as any).RTCSessionDescription = vi.fn().mockImplementation((init: any) => init)
}

if (typeof global.RTCIceCandidate === 'undefined') {
  ;(global as any).RTCIceCandidate = vi.fn().mockImplementation((init: any) => init)
}

// Mock MediaStream
if (typeof global.MediaStream === 'undefined') {
  ;(global as any).MediaStream = vi.fn().mockImplementation(() => ({
    id: 'mock-stream',
    active: true,
    getTracks: vi.fn().mockReturnValue([]),
    getAudioTracks: vi.fn().mockReturnValue([]),
    getVideoTracks: vi.fn().mockReturnValue([]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// Mock navigator.mediaDevices
if (!global.navigator.mediaDevices) {
  ;(global.navigator as any).mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([]),
      getAudioTracks: vi.fn().mockReturnValue([]),
      getVideoTracks: vi.fn().mockReturnValue([]),
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
    getSupportedConstraints: vi.fn().mockReturnValue({}),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

// Mock URL.createObjectURL and revokeObjectURL
if (typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
}

if (typeof global.URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = vi.fn()
}

// Mock fetch for analytics tests
if (typeof global.fetch === 'undefined') {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
  })
}

// Setup Web Crypto API for encryption tests
// Use Node.js built-in webcrypto module (Node.js 15.0.0+)
if (!global.crypto || !global.crypto.subtle) {
  try {
    // Try to import Node's webcrypto
    const cryptoModule = require('crypto')
    if (cryptoModule.webcrypto) {
      ;(global as any).crypto = cryptoModule.webcrypto
    }
  } catch (_error) {
    console.warn('Web Crypto API not available in test environment')
  }
}

// Suppress console output in tests (optional)
// You can comment these out if you want to see console output during tests
if (process.env.VITEST_SILENT !== 'false') {
  global.console.log = vi.fn()
  global.console.debug = vi.fn()
  // Keep warn and error for debugging
  // global.console.warn = vi.fn()
  // global.console.error = vi.fn()
}

// Configure VueSIP logger for tests
// Suppress logger output during tests by using a custom no-op handler
if (process.env.VITEST_SILENT !== 'false') {
  configureLogger({
    enabled: false, // Disable all logging during tests
  })
}
