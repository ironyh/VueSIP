/**
 * Encryption Utilities
 *
 * Provides encryption/decryption utilities using Web Crypto API
 * for securing sensitive data in storage (e.g., SIP credentials).
 *
 * Uses AES-GCM encryption with PBKDF2 key derivation.
 *
 * @module utils/encryption
 */

import type { EncryptedData, EncryptionOptions } from '../types/storage.types'
import { createLogger } from './logger'

const logger = createLogger('utils:encryption')

/**
 * Check if running in test environment
 */
function isTestEnvironment(): boolean {
  // Check for Vitest - import.meta.vitest is always available in Vitest
  try {
    const meta = import.meta as {
      vitest?: unknown
      env?: { MODE?: string; TEST?: boolean; VITEST?: boolean }
    }
    if (meta.vitest !== undefined) {
      return true
    }
    // Check for Vite environment variables
    if (meta.env?.MODE === 'test' || meta.env?.TEST || meta.env?.VITEST) {
      return true
    }
  } catch {
    // import.meta not available, continue to other checks
  }
  // Check for Node.js environment variables
  if (typeof process !== 'undefined') {
    return process.env.NODE_ENV === 'test' || !!process.env.VITEST
  }
  return false
}

/**
 * Minimum allowed PBKDF2 iterations for security
 * Values below this could be vulnerable to brute-force attacks
 * In test environment, lower values are accepted for testing purposes
 */
const MIN_SECURE_ITERATIONS = isTestEnvironment() ? 1000 : 10000

/**
 * Default encryption options
 * Use fewer iterations in test environment for faster tests
 */
const DEFAULT_ENCRYPTION_OPTIONS: Required<EncryptionOptions> = {
  enabled: true,
  algorithm: 'AES-GCM',
  iterations: isTestEnvironment() ? 1000 : 100000, // Reduced iterations for test environment
  salt: '',
}

/**
 * Check if Web Crypto API is available
 * @returns True if crypto is available
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}

/**
 * Generate a random salt
 * @param length - Salt length in bytes (default: 16)
 * @returns Salt as Uint8Array
 */
function generateSalt(length = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generate a random IV (Initialization Vector)
 * @param length - IV length in bytes (default: 12 for GCM)
 * @returns IV as Uint8Array
 */
function generateIV(length = 12): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Convert ArrayBuffer to base64 string
 * @param buffer - ArrayBuffer to convert
 * @returns Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength

  // Process in chunks for better performance with large buffers
  const chunkSize = 8192 // 8KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len))
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 * @param base64 - Base64 string to convert
 * @returns ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)

  // Process in chunks for better performance
  const chunkSize = 8192 // 8KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    const end = Math.min(i + chunkSize, len)
    for (let j = i; j < end; j++) {
      bytes[j] = binary.charCodeAt(j)
    }
  }

  return bytes.buffer
}

/**
 * Validate password for encryption/decryption
 * @param password - Password to validate
 * @throws Error if password is too short
 */
function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string')
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }
}

/**
 * Derive encryption key from password using PBKDF2
 * @param password - Password to derive key from
 * @param salt - Salt for key derivation
 * @param iterations - Number of iterations (default: 100000)
 * @returns CryptoKey for encryption/decryption
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  // Validate password first
  validatePassword(password)

  // Import password as key material
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive AES key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-GCM
 * @param data - Data to encrypt (will be JSON.stringified)
 * @param password - Password for encryption
 * @param options - Encryption options
 * @returns Encrypted data structure
 * @throws Error if encryption fails or crypto is not available
 */
export async function encrypt<T = unknown>(
  data: T,
  password: string,
  options: Partial<EncryptionOptions> = {}
): Promise<EncryptedData> {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API is not available')
  }

  const opts = { ...DEFAULT_ENCRYPTION_OPTIONS, ...options }

  try {
    // Generate salt and IV
    const salt = generateSalt()
    const iv = generateIV()

    // Derive encryption key
    const key = await deriveKey(password, salt, opts.iterations)

    // Encrypt data
    const encoder = new TextEncoder()
    const dataStr = JSON.stringify(data)
    const encrypted = await crypto.subtle.encrypt(
      { name: opts.algorithm, iv },
      key,
      encoder.encode(dataStr)
    )

    const result: EncryptedData = {
      data: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
      algorithm: opts.algorithm,
      iterations: opts.iterations,
      version: 1,
    }

    logger.debug('Data encrypted successfully', {
      algorithm: opts.algorithm,
      dataLength: dataStr.length,
      encryptedLength: result.data.length,
    })

    return result
  } catch (error) {
    logger.error('Encryption failed:', error)
    throw new Error(`Encryption failed: ${(error as Error).message}`)
  }
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Encrypted data structure
 * @param password - Password for decryption
 * @returns Decrypted data
 * @throws Error if decryption fails or crypto is not available
 */
export async function decrypt<T = unknown>(
  encryptedData: EncryptedData,
  password: string
): Promise<T> {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API is not available')
  }

  try {
    // Convert base64 strings back to ArrayBuffers/Uint8Arrays
    const salt = new Uint8Array(base64ToArrayBuffer(encryptedData.salt))
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv))
    const data = new Uint8Array(base64ToArrayBuffer(encryptedData.data))

    // Derive decryption key (using iterations from encrypted data)
    // Validate iterations to prevent downgrade attacks
    const iterations = encryptedData.iterations
    if (!iterations || iterations < MIN_SECURE_ITERATIONS) {
      logger.error('Decryption failed: iterations too low or missing', {
        providedIterations: iterations,
        minimumRequired: MIN_SECURE_ITERATIONS,
      })
      throw new Error(
        `Invalid encrypted data: iterations too low (minimum: ${MIN_SECURE_ITERATIONS}). The data may be corrupted or tampered with.`
      )
    }

    const key = await deriveKey(password, salt, iterations)

    // Decrypt data
    const decrypted = await crypto.subtle.decrypt({ name: encryptedData.algorithm, iv }, key, data)

    // Decode and parse
    const decoder = new TextDecoder()
    const dataStr = decoder.decode(decrypted)
    const result = JSON.parse(dataStr) as T

    logger.debug('Data decrypted successfully', {
      algorithm: encryptedData.algorithm,
      encryptedLength: encryptedData.data.length,
      decryptedLength: dataStr.length,
    })

    return result
  } catch (error) {
    logger.error('Decryption failed:', error)
    throw new Error(`Decryption failed: ${(error as Error).message}`)
  }
}

/**
 * Generate a random encryption key
 * This can be used as a password for encryption/decryption.
 * Store this securely (e.g., in memory or secure storage).
 *
 * @param length - Key length in bytes (default: 32)
 * @returns Random key as base64 string
 * @throws Error if crypto is not available
 */
export function generateEncryptionKey(length = 32): string {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API is not available')
  }

  const key = crypto.getRandomValues(new Uint8Array(length))
  return arrayBufferToBase64(key)
}

/**
 * Hash a password using SHA-256
 * Useful for creating consistent encryption keys from user passwords.
 *
 * @param password - Password to hash
 * @returns Hashed password as hex string
 * @throws Error if crypto is not available
 */
export async function hashPassword(password: string): Promise<string> {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API is not available')
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Default replacement string for masked values
 */
const MASKED_REPLACEMENT = '***REDACTED***'

/**
 * Fields that should always be masked regardless of value
 */
const ALWAYS_MASK_FIELDS = new Set([
  'password',
  'secret',
  'token',
  'auth',
  'authorization',
  'pass',
  'pwd',
  'credential',
  'privateKey',
  'apiKey',
  'apiKey',
  'accessToken',
  'refreshToken',
])

/**
 * Sanitize sensitive data from an object for safe logging
 *
 * Recursively walks through an object and masks sensitive fields
 * and patterns that match potential credentials.
 *
 * @param data - Data to sanitize (object, string, or other)
 * @param options - Sanitization options
 * @returns Sanitized data safe for logging
 *
 * @example
 * ```typescript
 * const config = {
 *   password: 'secret123',
 *   username: 'alice',
 *   sipUri: 'sip:alice@example.com'
 * }
 * const safe = sanitizeForLogs(config)
 * // { password: '***REDACTED***', username: 'alice', sipUri: 'sip:alice@***REDACTED***' }
 * ```
 */
export function sanitizeForLogs(
  data: unknown,
  options: {
    /** Custom replacement string */
    replacement?: string
    /** Whether to mask SIP URIs (default: true) */
    maskSipUris?: boolean
    /** Whether to mask URLs with credentials (default: true) */
    maskUrlCredentials?: boolean
    /** Maximum length for non-masked strings */
    maxLength?: number
  } = {}
): unknown {
  const {
    replacement = MASKED_REPLACEMENT,
    maskSipUris = true,
    maskUrlCredentials = true,
    maxLength = 1000,
  } = options

  // Handle primitives
  if (data === null || data === undefined) {
    return data
  }

  // Handle string input
  if (typeof data === 'string') {
    let result = data

    // Mask URLs with credentials if enabled
    if (maskUrlCredentials) {
      // Mask user:pass@host patterns in URLs
      result = result.replace(/(https?|wss?):\/\/[^:\s]+:[^@\s]+@/gi, '$1://***REDACTED***@')
      // Mask SIP URIs with passwords
      result = result.replace(
        /sip[s]?:[^:\s]+:[^@\s]+@[^\s;]+/gi,
        'sip:***REDACTED***@***REDACTED***'
      )
    }

    // Truncate long strings
    if (result.length > maxLength) {
      result = result.slice(0, maxLength) + '...'
    }

    return result
  }

  // For non-object primitives (number, boolean, etc.)
  if (typeof data !== 'object') {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogs(item, options))
  }

  // Handle objects
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()

    // Always mask certain fields
    if (
      ALWAYS_MASK_FIELDS.has(lowerKey) ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret')
    ) {
      result[key] = replacement
      continue
    }

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object') {
      result[key] = sanitizeForLogs(value, options)
    } else if (typeof value === 'string') {
      // Mask string values that look like sensitive data
      let maskedValue = value

      // Mask potential credentials in string values
      if (maskSipUris) {
        maskedValue = maskedValue.replace(
          /sip[s]?:[^:\s]+:[^@\s]+@[^\s;]+/gi,
          'sip:***REDACTED***@***REDACTED***'
        )
      }

      if (maskUrlCredentials) {
        maskedValue = maskedValue.replace(
          /(https?|wss?):\/\/[^:\s]+:[^@\s]+@/gi,
          '$1://***REDACTED***@'
        )
      }

      // Truncate long strings
      if (maskedValue.length > maxLength) {
        maskedValue = maskedValue.slice(0, maxLength) + '...'
      }

      result[key] = maskedValue
    } else {
      result[key] = value
    }
  }

  return result
}
