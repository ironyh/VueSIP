/**
 * E911 utilities
 *
 * Sanitization, validation, formatting and factory helpers for E911 emergency
 * call handling. Used by useSipE911; can be reused for tests or custom E911 flows.
 *
 * @module utils/e911
 */

import type { E911Config, E911Location, E911Stats } from '@/types/e911.types'

/**
 * Sanitize string input to prevent XSS.
 * Strips dangerous characters, trims and limits to 255 characters.
 *
 * @param input - Raw string input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/[<>'";&|`$\\]/g, '')
    .trim()
    .slice(0, 255)
}

/**
 * Sanitize email address.
 * Trims, limits to 254 characters and removes dangerous characters.
 *
 * @param email - Raw email string
 * @returns Sanitized email or undefined
 */
export function sanitizeEmail(email: string | undefined): string | undefined {
  if (!email || typeof email !== 'string') return undefined
  const trimmed = email.trim().slice(0, 254)
  return trimmed.replace(/[<>'";&|`$\\]/g, '')
}

/**
 * Sanitize phone number.
 * Keeps only digits, +, -, (, ), and spaces; max 20 characters.
 *
 * @param phone - Raw phone string
 * @returns Sanitized phone or undefined
 */
export function sanitizePhone(phone: string | undefined): string | undefined {
  if (!phone || typeof phone !== 'string') return undefined
  return phone
    .replace(/[^0-9+\-() ]/g, '')
    .trim()
    .slice(0, 20)
}

/**
 * Sanitize URL.
 * Only allows http/https, max 2048 characters, strips dangerous characters.
 *
 * @param url - Raw URL string
 * @returns Sanitized URL or undefined
 */
export function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined
  const trimmed = url.trim().slice(0, 2048)
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return undefined
  }
  return trimmed.replace(/[<>'";&|`$\\]/g, '')
}

/**
 * Validate extension format (alphanumeric, _*#-, 1–32 chars).
 *
 * @param ext - Extension string
 * @returns True if valid
 */
export function isValidExtension(ext: string): boolean {
  if (!ext || typeof ext !== 'string') return false
  return /^[a-zA-Z0-9_*#-]{1,32}$/.test(ext)
}

/**
 * Generate a unique ID for E911 entities (calls, locations, logs).
 *
 * @returns Unique string ID
 */
export function generateE911Id(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create default E911 configuration.
 *
 * @returns Default E911Config
 */
export function createDefaultE911Config(): E911Config {
  return {
    enabled: true,
    emergencyNumbers: ['911'],
    testNumbers: ['933'],
    defaultCallbackNumber: '',
    recipients: [],
    recordCalls: true,
    directDialing: true,
    onSiteNotification: true,
    dispatchableLocationRequired: true,
    autoAnswerCallback: false,
    notificationDelay: 0,
    complianceLogging: true,
    lastUpdated: new Date(),
  }
}

/**
 * Create empty E911 statistics object.
 *
 * @returns Empty E911Stats
 */
export function createEmptyE911Stats(): E911Stats {
  return {
    totalCalls: 0,
    testCalls: 0,
    callsWithLocation: 0,
    notificationsSent: 0,
    notificationsDelivered: 0,
    callbacksReceived: 0,
    avgCallDuration: 0,
    avgNotificationTime: 0,
  }
}

/**
 * Format E911 location for display (civic address and/or geo coordinates).
 *
 * @param location - E911 location
 * @returns Human-readable string
 */
export function formatE911Location(location: E911Location): string {
  const parts: string[] = []

  if (location.civic) {
    const addr = location.civic
    let street = ''

    if (addr.houseNumber) street += addr.houseNumber
    if (addr.houseNumberSuffix) street += addr.houseNumberSuffix
    if (addr.preDirectional) street += ` ${addr.preDirectional}`
    if (addr.streetName) street += ` ${addr.streetName}`
    if (addr.streetSuffix) street += ` ${addr.streetSuffix}`
    if (addr.postDirectional) street += ` ${addr.postDirectional}`

    if (street) parts.push(street.trim())
    if (addr.additionalInfo) parts.push(addr.additionalInfo)
    if (addr.buildingName) parts.push(addr.buildingName)
    if (addr.floor) parts.push(`Floor ${addr.floor}`)
    if (addr.room) parts.push(`Room ${addr.room}`)
    if (addr.city) parts.push(addr.city)
    if (addr.state) parts.push(addr.state)
    if (addr.postalCode) parts.push(addr.postalCode)
    if (addr.country) parts.push(addr.country)
  }

  if (location.geo) {
    parts.push(`GPS: ${location.geo.latitude.toFixed(6)}, ${location.geo.longitude.toFixed(6)}`)
  }

  return parts.join('\n') || location.name
}
