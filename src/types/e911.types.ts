/**
 * E911 Types
 *
 * Type definitions for E911 emergency call handling and location management.
 * Supports Kari's Law and RAY BAUM's Act compliance requirements.
 *
 * @module types/e911
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * E911 location type
 */
export type E911LocationType =
  | 'civic' // Street address
  | 'geo' // Geographic coordinates
  | 'combined' // Both civic and geo

/**
 * E911 call status
 */
export type E911CallStatus =
  | 'detecting' // Detecting if emergency call
  | 'alerting' // Alerting administrators
  | 'in_progress' // Emergency call active
  | 'completed' // Emergency call ended
  | 'callback_pending' // Waiting for PSAP callback
  | 'callback_active' // PSAP callback in progress

/**
 * E911 notification type
 */
export type E911NotificationType =
  | 'email' // Email notification
  | 'sms' // SMS text message
  | 'push' // Push notification
  | 'webhook' // Webhook callback
  | 'paging' // Paging system
  | 'popup' // On-screen popup

/**
 * Civic address for E911 location
 */
export interface E911CivicAddress {
  /** House/building number */
  houseNumber: string

  /** House number suffix (A, B, etc.) */
  houseNumberSuffix?: string

  /** Pre-directional (N, S, E, W) */
  preDirectional?: string

  /** Street name */
  streetName: string

  /** Street suffix (St, Ave, Blvd, etc.) */
  streetSuffix?: string

  /** Post-directional (N, S, E, W) */
  postDirectional?: string

  /** City/municipality */
  city: string

  /** State/province/region */
  state: string

  /** Postal/ZIP code */
  postalCode: string

  /** Country code (ISO 3166-1 alpha-2) */
  country: string

  /** Additional location info (suite, floor, etc.) */
  additionalInfo?: string

  /** Building name */
  buildingName?: string

  /** Floor number */
  floor?: string

  /** Room/unit number */
  room?: string
}

/**
 * Geographic coordinates for E911 location
 */
export interface E911GeoLocation {
  /** Latitude (WGS84) */
  latitude: number

  /** Longitude (WGS84) */
  longitude: number

  /** Altitude in meters (optional) */
  altitude?: number

  /** Horizontal uncertainty in meters */
  uncertainty?: number

  /** Location method (gps, wifi, manual, etc.) */
  method?: string

  /** Timestamp of location determination */
  timestamp: Date
}

/**
 * Complete E911 location information
 */
export interface E911Location {
  /** Unique location identifier */
  id: string

  /** Location name/label */
  name: string

  /** Location type */
  type: E911LocationType

  /** Civic address */
  civic?: E911CivicAddress

  /** Geographic coordinates */
  geo?: E911GeoLocation

  /** Is this the default location */
  isDefault: boolean

  /** Location is verified/validated */
  isVerified: boolean

  /** Verification date */
  verifiedAt?: Date

  /** Associated extension(s) */
  extensions: string[]

  /** Last updated timestamp */
  lastUpdated: Date

  /** Notes/comments */
  notes?: string
}

/**
 * E911 emergency call record
 */
export interface E911Call {
  /** Unique call identifier */
  id: string

  /** SIP channel identifier */
  channel: string

  /** Caller extension */
  callerExtension: string

  /** Caller ID number */
  callerIdNum: string

  /** Caller ID name */
  callerIdName: string

  /** Dialed number (911, 933 test, etc.) */
  dialedNumber: string

  /** Call status */
  status: E911CallStatus

  /** Location at time of call */
  location: E911Location | null

  /** Callback number configured */
  callbackNumber: string

  /** Call start time */
  startTime: Date

  /** Call answer time */
  answerTime?: Date

  /** Call end time */
  endTime?: Date

  /** Duration in seconds */
  duration?: number

  /** Whether notification was sent */
  notificationSent: boolean

  /** Notification timestamp */
  notificationSentAt?: Date

  /** Administrators notified */
  notifiedAdmins: string[]

  /** PSAP callback received */
  psapCallbackReceived: boolean

  /** Call recording path (if recorded) */
  recordingPath?: string

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * E911 notification recipient
 */
export interface E911NotificationRecipient {
  /** Unique recipient identifier */
  id: string

  /** Recipient name */
  name: string

  /** Email address */
  email?: string

  /** Phone number (for SMS) */
  phone?: string

  /** Webhook URL */
  webhookUrl?: string

  /** Notification types to receive */
  notificationTypes: E911NotificationType[]

  /** Is this recipient active */
  enabled: boolean

  /** Priority (lower = higher priority) */
  priority: number
}

/**
 * E911 notification event
 */
export interface E911Notification {
  /** Notification ID */
  id: string

  /** Associated call ID */
  callId: string

  /** Notification type */
  type: E911NotificationType

  /** Recipient information */
  recipient: E911NotificationRecipient

  /** Notification content */
  content: string

  /** Timestamp sent */
  sentAt: Date

  /** Delivery status */
  delivered: boolean

  /** Delivery confirmation timestamp */
  deliveredAt?: Date

  /** Error message if failed */
  error?: string
}

/**
 * E911 compliance log entry
 */
export interface E911ComplianceLog {
  /** Log entry ID */
  id: string

  /** Associated call ID */
  callId?: string

  /** Event type */
  event:
    | 'call_initiated'
    | 'call_answered'
    | 'call_ended'
    | 'notification_sent'
    | 'notification_delivered'
    | 'notification_failed'
    | 'location_updated'
    | 'location_verified'
    | 'callback_received'
    | 'config_changed'
    | 'test_call'

  /** Event description */
  description: string

  /** User/system that triggered event */
  actor: string

  /** Event timestamp */
  timestamp: Date

  /** Additional details */
  details?: Record<string, unknown>

  /** Severity level */
  severity: 'info' | 'warning' | 'critical'
}

/**
 * E911 configuration
 */
export interface E911Config {
  /** Is E911 enabled */
  enabled: boolean

  /** Emergency numbers to detect (default: ['911', '933']) */
  emergencyNumbers: string[]

  /** Test numbers (933 is standard test) */
  testNumbers: string[]

  /** Default callback number */
  defaultCallbackNumber: string

  /** Default location ID */
  defaultLocationId?: string

  /** Notification recipients */
  recipients: E911NotificationRecipient[]

  /** Enable call recording for E911 */
  recordCalls: boolean

  /** Kari's Law: Require direct dialing (no prefix) */
  directDialing: boolean

  /** Kari's Law: Enable on-site notification */
  onSiteNotification: boolean

  /** RAY BAUM's Act: Dispatchable location required */
  dispatchableLocationRequired: boolean

  /** Auto-answer PSAP callbacks */
  autoAnswerCallback: boolean

  /** Callback detection pattern */
  callbackPattern?: string

  /** Hold time before notification (seconds) */
  notificationDelay: number

  /** Compliance logging enabled */
  complianceLogging: boolean

  /** Last updated */
  lastUpdated: Date
}

/**
 * E911 statistics
 */
export interface E911Stats {
  /** Total emergency calls */
  totalCalls: number

  /** Total test calls */
  testCalls: number

  /** Calls with verified location */
  callsWithLocation: number

  /** Notifications sent */
  notificationsSent: number

  /** Notifications delivered */
  notificationsDelivered: number

  /** PSAP callbacks received */
  callbacksReceived: number

  /** Average call duration (seconds) */
  avgCallDuration: number

  /** Average notification delivery time (seconds) */
  avgNotificationTime: number

  /** Last emergency call timestamp */
  lastEmergencyCall?: Date

  /** Last test call timestamp */
  lastTestCall?: Date
}

/**
 * E911 event types
 */
export type E911EventType =
  | 'call_detected' // Emergency call detected
  | 'call_started' // Emergency call started
  | 'call_answered' // PSAP answered
  | 'call_ended' // Emergency call ended
  | 'notification_sent' // Admin notification sent
  | 'notification_delivered' // Notification confirmed delivered
  | 'notification_failed' // Notification delivery failed
  | 'callback_detected' // PSAP callback detected
  | 'callback_answered' // PSAP callback answered
  | 'location_updated' // Location information updated
  | 'config_changed' // E911 configuration changed

/**
 * E911 event
 */
export interface E911Event {
  /** Event type */
  type: E911EventType

  /** Associated call */
  call?: E911Call

  /** Notification (if applicable) */
  notification?: E911Notification

  /** Event timestamp */
  timestamp: Date

  /** Additional data */
  data?: Record<string, unknown>
}

/**
 * Options for the useSipE911 composable
 */
export interface UseSipE911Options {
  /** E911 configuration */
  config?: Partial<E911Config>

  /** Auto-start monitoring on creation */
  autoStart?: boolean

  /** Callback when emergency call detected */
  onEmergencyCall?: (call: E911Call) => void

  /** Callback when emergency call ends */
  onCallEnded?: (call: E911Call) => void

  /** Callback when notification is sent */
  onNotificationSent?: (notification: E911Notification) => void

  /** Callback when PSAP callback detected */
  onCallbackDetected?: (call: E911Call) => void

  /** Callback on E911 event */
  onEvent?: (event: E911Event) => void

  /** Callback on error */
  onError?: (error: string) => void
}

/**
 * Return type for useSipE911 composable
 */
export interface UseSipE911Return {
  // State
  /** Current E911 configuration */
  config: Ref<E911Config>

  /** All registered locations */
  locations: Ref<Map<string, E911Location>>

  /** Active emergency calls */
  activeCalls: Ref<Map<string, E911Call>>

  /** Call history */
  callHistory: Ref<E911Call[]>

  /** Compliance logs */
  complianceLogs: Ref<E911ComplianceLog[]>

  /** Whether E911 monitoring is active */
  isMonitoring: Ref<boolean>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message if any */
  error: Ref<string | null>

  // Computed
  /** List of all locations */
  locationList: ComputedRef<E911Location[]>

  /** Default location */
  defaultLocation: ComputedRef<E911Location | null>

  /** List of active emergency calls */
  activeCallList: ComputedRef<E911Call[]>

  /** Whether there's an active emergency call */
  hasActiveEmergency: ComputedRef<boolean>

  /** E911 statistics */
  stats: ComputedRef<E911Stats>

  /** Notification recipients */
  recipients: ComputedRef<E911NotificationRecipient[]>

  // Methods
  /** Start E911 monitoring */
  startMonitoring: () => void

  /** Stop E911 monitoring */
  stopMonitoring: () => void

  /** Update E911 configuration */
  updateConfig: (config: Partial<E911Config>) => void

  /** Add a location */
  addLocation: (location: Omit<E911Location, 'id' | 'lastUpdated'>) => E911Location

  /** Update a location */
  updateLocation: (locationId: string, updates: Partial<E911Location>) => boolean

  /** Remove a location */
  removeLocation: (locationId: string) => boolean

  /** Set default location */
  setDefaultLocation: (locationId: string) => boolean

  /** Get location by ID */
  getLocation: (locationId: string) => E911Location | null

  /** Get location for extension */
  getLocationForExtension: (extension: string) => E911Location | null

  /** Verify/validate a location */
  verifyLocation: (locationId: string) => Promise<boolean>

  /** Add notification recipient */
  addRecipient: (recipient: Omit<E911NotificationRecipient, 'id'>) => E911NotificationRecipient

  /** Update notification recipient */
  updateRecipient: (recipientId: string, updates: Partial<E911NotificationRecipient>) => boolean

  /** Remove notification recipient */
  removeRecipient: (recipientId: string) => boolean

  /** Send test notification to all recipients */
  sendTestNotification: () => Promise<boolean>

  /** Get call by ID */
  getCall: (callId: string) => E911Call | null

  /** Get calls for date range */
  getCallsInRange: (start: Date, end: Date) => E911Call[]

  /** Get compliance logs */
  getLogs: (limit?: number) => E911ComplianceLog[]

  /** Export compliance logs */
  exportLogs: (format: 'json' | 'csv') => string

  /** Clear old compliance logs */
  clearOldLogs: (olderThan: Date) => number

  /** Initiate test call (to 933 or configured test number) */
  initiateTestCall: (extension: string) => Promise<boolean>

  /** Format location for display */
  formatLocation: (location: E911Location) => string

  /** Check E911 compliance status */
  checkCompliance: () => {
    compliant: boolean
    issues: string[]
  }
}
