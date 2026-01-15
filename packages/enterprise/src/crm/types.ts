/**
 * @vuesip/enterprise - CRM Type Definitions
 *
 * Core types and interfaces for CRM integration adapters.
 * These types provide a unified abstraction layer for different CRM systems.
 */

/**
 * Represents a contact in the CRM system.
 * This is a normalized structure that maps to contacts across different CRM platforms.
 */
export interface Contact {
  /** Unique identifier from the CRM system */
  id: string
  /** Contact's first name */
  firstName?: string
  /** Contact's last name */
  lastName?: string
  /** Primary email address */
  email?: string
  /** Primary phone number (normalized format preferred) */
  phone?: string
  /** Associated company/organization name */
  company?: string
  /** Job title or role */
  title?: string
  /** Custom fields and CRM-specific data */
  metadata?: Record<string, unknown>
  /** Timestamp of when contact was created in CRM */
  createdAt?: Date
  /** Timestamp of last modification */
  updatedAt?: Date
}

/**
 * Represents a call record to be logged in the CRM.
 * Contains all relevant call metadata including recordings and AI-generated insights.
 */
export interface CallRecord {
  /** Unique identifier for the call (assigned by CRM after logging) */
  id?: string
  /** Associated contact ID in the CRM */
  contactId?: string
  /** Direction of the call */
  direction: 'inbound' | 'outbound'
  /** Call start timestamp */
  startTime: Date
  /** Call end timestamp */
  endTime?: Date
  /** Duration in seconds */
  duration?: number
  /** Final call status */
  status: 'completed' | 'missed' | 'voicemail' | 'busy' | 'failed' | 'no_answer'
  /** Phone number of the caller (inbound) or callee (outbound) */
  phoneNumber?: string
  /** Recording information if available */
  recording?: {
    /** URL to the recording file */
    url: string
    /** Recording duration in seconds */
    duration: number
    /** File format (e.g., 'mp3', 'wav') */
    format?: string
  }
  /** AI-generated transcription of the call */
  transcription?: string
  /** AI-generated summary of the call content */
  summary?: string
  /** Sentiment score (-1 to 1, where -1 is negative, 1 is positive) */
  sentiment?: number
  /** Agent notes about the call */
  notes?: string
  /** Call outcome/disposition code */
  outcome?: string
  /** Call tags for categorization */
  tags?: string[]
  /** Custom fields and additional data */
  metadata?: Record<string, unknown>
}

/**
 * Represents an activity or task in the CRM.
 * Used for creating follow-ups, scheduling callbacks, and tracking engagement.
 */
export interface Activity {
  /** Unique identifier (assigned by CRM after creation) */
  id?: string
  /** Associated contact ID */
  contactId: string
  /** Type of activity */
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'follow_up'
  /** Activity subject/title */
  subject: string
  /** Detailed description */
  description?: string
  /** Scheduled due date for tasks */
  dueDate?: Date
  /** Completion timestamp */
  completedDate?: Date
  /** Current status */
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred'
  /** Priority level */
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  /** Assigned user/agent ID */
  assignedTo?: string
  /** Related call record ID if applicable */
  relatedCallId?: string
  /** Custom fields */
  metadata?: Record<string, unknown>
}

/**
 * Configuration options for CRM adapters.
 * Different CRM systems may use different subsets of these options.
 */
export interface CRMConfig {
  /** API endpoint or instance URL (e.g., 'https://mycompany.salesforce.com') */
  instanceUrl?: string
  /** API key or access token for authentication */
  apiKey?: string
  /** OAuth client ID */
  clientId?: string
  /** OAuth client secret */
  clientSecret?: string
  /** OAuth refresh token for token renewal */
  refreshToken?: string
  /** OAuth access token (can be set directly or obtained via OAuth flow) */
  accessToken?: string
  /** Custom HTTP headers to include in requests */
  headers?: Record<string, string>
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Number of retry attempts for failed requests (default: 3) */
  retryAttempts?: number
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number
  /** Enable request/response logging for debugging */
  debug?: boolean
  /** Sandbox/test mode flag */
  sandbox?: boolean
}

/**
 * Events that can be emitted by CRM adapters.
 */
export interface CRMEvents {
  /** Emitted when connection status changes */
  connectionChange: (connected: boolean) => void
  /** Emitted when a contact is identified for an incoming call */
  contactIdentified: (contact: Contact, phoneNumber: string) => void
  /** Emitted when a call is successfully logged */
  callLogged: (callId: string, callRecord: CallRecord) => void
  /** Emitted when an error occurs */
  error: (error: CRMError) => void
}

/**
 * Standardized error structure for CRM operations.
 */
export interface CRMError {
  /** Error code (CRM-specific or standard) */
  code: string
  /** Human-readable error message */
  message: string
  /** Original error from the CRM API */
  cause?: unknown
  /** HTTP status code if applicable */
  statusCode?: number
  /** Whether the operation can be retried */
  retryable: boolean
}

/**
 * Result of a contact search operation.
 */
export interface ContactSearchResult {
  /** List of matching contacts */
  contacts: Contact[]
  /** Total number of matches (may exceed returned count) */
  total: number
  /** Pagination cursor for next page */
  nextCursor?: string
  /** Whether more results are available */
  hasMore: boolean
}

/**
 * Options for contact search operations.
 */
export interface ContactSearchOptions {
  /** Maximum number of results to return */
  limit?: number
  /** Pagination cursor from previous search */
  cursor?: string
  /** Fields to search in */
  searchFields?: ('name' | 'email' | 'phone' | 'company')[]
  /** Sort order */
  sortBy?: 'relevance' | 'name' | 'updatedAt' | 'createdAt'
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Core CRM adapter interface.
 * All CRM adapters must implement this interface to ensure consistent behavior.
 */
export interface CRMAdapter {
  /** Name of the CRM system (e.g., 'Salesforce', 'HubSpot') */
  readonly name: string
  /** Current connection status */
  readonly isConnected: boolean

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Establishes connection to the CRM system.
   * Should handle authentication and validate credentials.
   * @throws {CRMError} If connection fails
   */
  connect(): Promise<void>

  /**
   * Gracefully disconnects from the CRM system.
   * Should clean up any resources and invalidate tokens if needed.
   */
  disconnect(): Promise<void>

  /**
   * Tests the connection without full authentication.
   * Useful for validating credentials before storing them.
   * @returns true if connection test passes
   */
  testConnection?(): Promise<boolean>

  // ============================================
  // Contact Operations
  // ============================================

  /**
   * Looks up a contact by phone number.
   * Phone numbers should be normalized before lookup.
   * @param phoneNumber - Phone number to search for
   * @returns Matching contact or null if not found
   */
  lookupByPhone(phoneNumber: string): Promise<Contact | null>

  /**
   * Retrieves a contact by their CRM ID.
   * @param contactId - The CRM-assigned contact ID
   * @returns Contact or null if not found
   */
  lookupById(contactId: string): Promise<Contact | null>

  /**
   * Searches contacts by query string.
   * Searches across name, email, phone, and company fields.
   * @param query - Search query
   * @param options - Search options (pagination, sorting)
   * @returns Search results with pagination info
   */
  searchContacts(query: string, options?: ContactSearchOptions): Promise<ContactSearchResult>

  /**
   * Creates a new contact in the CRM.
   * @param contact - Contact data (without ID)
   * @returns Created contact with assigned ID
   * @throws {CRMError} If creation fails
   */
  createContact(contact: Omit<Contact, 'id'>): Promise<Contact>

  /**
   * Updates an existing contact.
   * @param contactId - ID of contact to update
   * @param updates - Partial contact data to update
   * @returns Updated contact
   * @throws {CRMError} If update fails
   */
  updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact>

  // ============================================
  // Call Logging
  // ============================================

  /**
   * Logs a call record in the CRM.
   * Creates appropriate activity/engagement records.
   * @param callData - Call record data
   * @returns ID of the created call record
   * @throws {CRMError} If logging fails
   */
  logCall(callData: CallRecord): Promise<string>

  /**
   * Updates an existing call record.
   * Useful for adding notes, recordings, or transcriptions after call ends.
   * @param callId - ID of the call record to update
   * @param updates - Partial call data to update
   * @throws {CRMError} If update fails
   */
  updateCall(callId: string, updates: Partial<CallRecord>): Promise<void>

  /**
   * Retrieves call history for a contact.
   * @param contactId - Contact ID to get history for
   * @param limit - Maximum number of records to return (default: 50)
   * @returns Array of call records, most recent first
   */
  getCallHistory(contactId: string, limit?: number): Promise<CallRecord[]>

  // ============================================
  // Activity Management
  // ============================================

  /**
   * Creates a new activity (task, follow-up, etc.).
   * @param activity - Activity data (without ID)
   * @returns Created activity with assigned ID
   * @throws {CRMError} If creation fails
   */
  createActivity(activity: Omit<Activity, 'id'>): Promise<Activity>

  /**
   * Updates an existing activity.
   * @param activityId - ID of activity to update
   * @param updates - Partial activity data to update
   * @returns Updated activity
   * @throws {CRMError} If update fails
   */
  updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity>

  /**
   * Retrieves activities for a contact.
   * @param contactId - Contact ID to get activities for
   * @param limit - Maximum number of records to return (default: 50)
   * @returns Array of activities, most recent first
   */
  getActivities(contactId: string, limit?: number): Promise<Activity[]>

  // ============================================
  // Event Handlers (Optional)
  // ============================================

  /**
   * Registers a callback for incoming call events.
   * Called when the CRM identifies an incoming call (if supported).
   * @param callback - Function to call with the phone number
   * @returns Unsubscribe function
   */
  onIncomingCall?: (callback: (phoneNumber: string) => void) => () => void

  /**
   * Registers a callback for call ended events.
   * Called when a call ends (if real-time updates are supported).
   * @param callback - Function to call with the call record
   * @returns Unsubscribe function
   */
  onCallEnded?: (callback: (callRecord: CallRecord) => void) => () => void
}

/**
 * Factory function type for creating CRM adapters.
 */
export type CRMAdapterFactory = (config: CRMConfig) => CRMAdapter

/**
 * Registry of available CRM adapters.
 */
export interface CRMAdapterRegistry {
  salesforce: CRMAdapterFactory
  hubspot: CRMAdapterFactory
  webhook: CRMAdapterFactory
  [key: string]: CRMAdapterFactory
}
