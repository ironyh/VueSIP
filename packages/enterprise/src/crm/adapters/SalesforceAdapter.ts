/**
 * @vuesip/enterprise - Salesforce CRM Adapter
 *
 * Implements the CRMAdapter interface for Salesforce CRM integration.
 * Uses Salesforce REST API for all operations.
 *
 * Note: This is a structural implementation. Production use requires:
 * - OAuth 2.0 flow for authentication
 * - Proper error handling and rate limiting
 * - Salesforce Connected App configuration
 */

import type {
  CRMAdapter,
  CRMConfig,
  CRMError,
  Contact,
  CallRecord,
  Activity,
  ContactSearchResult,
  ContactSearchOptions,
} from '../types'

/**
 * Salesforce-specific contact fields mapping
 */
interface SalesforceContact {
  Id: string
  FirstName?: string
  LastName?: string
  Email?: string
  Phone?: string
  MobilePhone?: string
  HomePhone?: string
  Account?: {
    Name: string
  }
  AccountId?: string
  Title?: string
  CreatedDate?: string
  LastModifiedDate?: string
  [key: string]: unknown
}

/**
 * Salesforce Task object structure (used for call logging)
 */
interface SalesforceTask {
  Id?: string
  WhoId?: string
  Subject: string
  Description?: string
  Status: string
  Priority: string
  ActivityDate?: string
  TaskSubtype?: string
  CallType?: string
  CallDurationInSeconds?: number
  CallDisposition?: string
  CallObject?: string
  [key: string]: unknown
}

/**
 * Normalizes phone numbers for consistent comparison.
 * Strips all non-digit characters and leading country codes.
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  // Remove leading 1 for US numbers if present and length > 10
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  return digits
}

/**
 * Creates a CRMError from various error sources.
 */
function createCRMError(
  code: string,
  message: string,
  cause?: unknown,
  statusCode?: number
): CRMError {
  const retryableCodes = [429, 500, 502, 503, 504]
  return {
    code,
    message,
    cause,
    statusCode,
    retryable: statusCode ? retryableCodes.includes(statusCode) : false,
  }
}

/**
 * Salesforce CRM Adapter implementation.
 *
 * @example
 * ```typescript
 * const adapter = new SalesforceAdapter({
 *   instanceUrl: 'https://mycompany.salesforce.com',
 *   accessToken: 'your-oauth-token',
 * })
 *
 * await adapter.connect()
 * const contact = await adapter.lookupByPhone('+1-555-123-4567')
 * ```
 */
export class SalesforceAdapter implements CRMAdapter {
  readonly name = 'Salesforce'
  private _isConnected = false
  private config: CRMConfig
  private apiVersion = 'v59.0'

  constructor(config: CRMConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    }
  }

  get isConnected(): boolean {
    return this._isConnected
  }

  /**
   * Makes an authenticated API request to Salesforce.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this._isConnected) {
      throw createCRMError('NOT_CONNECTED', 'Not connected to Salesforce. Call connect() first.')
    }

    const url = `${this.config.instanceUrl}/services/data/${this.apiVersion}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
      ...this.config.headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 30000)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw createCRMError(
          errorBody.errorCode || 'API_ERROR',
          errorBody.message || `HTTP ${response.status}`,
          errorBody,
          response.status
        )
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw createCRMError('TIMEOUT', 'Request timed out')
      }

      // Re-throw CRMErrors as-is
      if ((error as CRMError).code) {
        throw error
      }

      throw createCRMError('NETWORK_ERROR', 'Network request failed', error)
    }
  }

  /**
   * Executes a SOQL query against Salesforce.
   */
  private async query<T>(soql: string): Promise<{ records: T[]; totalSize: number }> {
    const encodedQuery = encodeURIComponent(soql)
    return this.request<{ records: T[]; totalSize: number }>(`/query?q=${encodedQuery}`)
  }

  // ============================================
  // Connection Management
  // ============================================

  async connect(): Promise<void> {
    if (!this.config.instanceUrl) {
      throw createCRMError('INVALID_CONFIG', 'instanceUrl is required for Salesforce connection')
    }

    if (!this.config.accessToken && !this.config.refreshToken) {
      throw createCRMError(
        'INVALID_CONFIG',
        'accessToken or refreshToken is required for Salesforce connection'
      )
    }

    // If we have a refresh token but no access token, refresh it
    if (this.config.refreshToken && !this.config.accessToken) {
      await this.refreshAccessToken()
    }

    // Test the connection by fetching user info
    try {
      // Temporarily set connected to make the request
      this._isConnected = true
      await this.request('/sobjects')
      // Connection successful
    } catch (error) {
      this._isConnected = false
      throw createCRMError('CONNECTION_FAILED', 'Failed to connect to Salesforce', error)
    }
  }

  async disconnect(): Promise<void> {
    this._isConnected = false
    // Optionally revoke the token here if needed
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect()
      await this.disconnect()
      return true
    } catch {
      return false
    }
  }

  /**
   * Refreshes the OAuth access token using the refresh token.
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
      throw createCRMError(
        'INVALID_CONFIG',
        'clientId, clientSecret, and refreshToken are required for token refresh'
      )
    }

    const tokenUrl = `${this.config.instanceUrl}/services/oauth2/token`

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw createCRMError(
        'TOKEN_REFRESH_FAILED',
        'Failed to refresh access token',
        error,
        response.status
      )
    }

    const data = await response.json()
    this.config.accessToken = data.access_token
  }

  // ============================================
  // Contact Operations
  // ============================================

  async lookupByPhone(phoneNumber: string): Promise<Contact | null> {
    const normalized = normalizePhoneNumber(phoneNumber)

    // Search across multiple phone fields
    const soql = `
      SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, HomePhone,
             Account.Name, AccountId, Title, CreatedDate, LastModifiedDate
      FROM Contact
      WHERE Phone LIKE '%${normalized}%'
         OR MobilePhone LIKE '%${normalized}%'
         OR HomePhone LIKE '%${normalized}%'
      LIMIT 1
    `

    const result = await this.query<SalesforceContact>(soql)

    if (result.records.length === 0) {
      return null
    }

    return this.mapSalesforceContact(result.records[0] as SalesforceContact)
  }

  async lookupById(contactId: string): Promise<Contact | null> {
    try {
      const sfContact = await this.request<SalesforceContact>(`/sobjects/Contact/${contactId}`)
      return this.mapSalesforceContact(sfContact)
    } catch (error) {
      if ((error as CRMError).statusCode === 404) {
        return null
      }
      throw error
    }
  }

  async searchContacts(
    query: string,
    options?: ContactSearchOptions
  ): Promise<ContactSearchResult> {
    const limit = options?.limit ?? 25
    const searchFields = options?.searchFields ?? ['name', 'email', 'phone', 'company']

    // Build WHERE clauses based on search fields
    const conditions: string[] = []
    if (searchFields.includes('name')) {
      conditions.push(`Name LIKE '%${query}%'`)
    }
    if (searchFields.includes('email')) {
      conditions.push(`Email LIKE '%${query}%'`)
    }
    if (searchFields.includes('phone')) {
      conditions.push(`Phone LIKE '%${query}%'`)
      conditions.push(`MobilePhone LIKE '%${query}%'`)
    }
    if (searchFields.includes('company')) {
      conditions.push(`Account.Name LIKE '%${query}%'`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : ''

    // Build ORDER BY clause
    let orderBy = 'LastModifiedDate DESC'
    if (options?.sortBy) {
      const sortField = {
        relevance: 'LastModifiedDate',
        name: 'Name',
        updatedAt: 'LastModifiedDate',
        createdAt: 'CreatedDate',
      }[options.sortBy]
      const sortDir = options?.sortOrder?.toUpperCase() ?? 'DESC'
      orderBy = `${sortField} ${sortDir}`
    }

    const soql = `
      SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, HomePhone,
             Account.Name, AccountId, Title, CreatedDate, LastModifiedDate
      FROM Contact
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `

    const result = await this.query<SalesforceContact>(soql)

    return {
      contacts: result.records.map((r) => this.mapSalesforceContact(r as SalesforceContact)),
      total: result.totalSize,
      hasMore: result.totalSize > limit,
    }
  }

  async createContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
    const sfContact: Partial<SalesforceContact> = {
      FirstName: contact.firstName,
      LastName: contact.lastName ?? 'Unknown',
      Email: contact.email,
      Phone: contact.phone,
      Title: contact.title,
    }

    const result = await this.request<{ id: string }>('/sobjects/Contact', {
      method: 'POST',
      body: JSON.stringify(sfContact),
    })

    return {
      ...contact,
      id: result.id,
    }
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    const sfUpdates: Partial<SalesforceContact> = {}

    if (updates.firstName !== undefined) sfUpdates.FirstName = updates.firstName
    if (updates.lastName !== undefined) sfUpdates.LastName = updates.lastName
    if (updates.email !== undefined) sfUpdates.Email = updates.email
    if (updates.phone !== undefined) sfUpdates.Phone = updates.phone
    if (updates.title !== undefined) sfUpdates.Title = updates.title

    await this.request(`/sobjects/Contact/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(sfUpdates),
    })

    // Fetch and return the updated contact
    const updated = await this.lookupById(contactId)
    if (!updated) {
      throw createCRMError('NOT_FOUND', 'Contact not found after update')
    }
    return updated
  }

  // ============================================
  // Call Logging
  // ============================================

  async logCall(callData: CallRecord): Promise<string> {
    const task: SalesforceTask = {
      WhoId: callData.contactId,
      Subject: `${callData.direction === 'inbound' ? 'Inbound' : 'Outbound'} Call${callData.phoneNumber ? ` - ${callData.phoneNumber}` : ''}`,
      Description: this.buildCallDescription(callData),
      Status: 'Completed',
      Priority: 'Normal',
      TaskSubtype: 'Call',
      CallType: callData.direction === 'inbound' ? 'Inbound' : 'Outbound',
      CallDurationInSeconds: callData.duration,
      CallDisposition: callData.outcome ?? this.mapStatusToDisposition(callData.status),
      ActivityDate: callData.startTime.toISOString().split('T')[0],
    }

    const result = await this.request<{ id: string }>('/sobjects/Task', {
      method: 'POST',
      body: JSON.stringify(task),
    })

    return result.id
  }

  async updateCall(callId: string, updates: Partial<CallRecord>): Promise<void> {
    const taskUpdates: Partial<SalesforceTask> = {}

    if (updates.notes !== undefined) {
      taskUpdates.Description = updates.notes
    }
    if (updates.duration !== undefined) {
      taskUpdates.CallDurationInSeconds = updates.duration
    }
    if (updates.outcome !== undefined) {
      taskUpdates.CallDisposition = updates.outcome
    }

    await this.request(`/sobjects/Task/${callId}`, {
      method: 'PATCH',
      body: JSON.stringify(taskUpdates),
    })
  }

  async getCallHistory(contactId: string, limit = 50): Promise<CallRecord[]> {
    const soql = `
      SELECT Id, Subject, Description, CreatedDate, Status,
             CallType, CallDurationInSeconds, CallDisposition
      FROM Task
      WHERE WhoId = '${contactId}'
        AND TaskSubtype = 'Call'
      ORDER BY CreatedDate DESC
      LIMIT ${limit}
    `

    const result = await this.query<SalesforceTask & { CreatedDate: string }>(soql)

    return result.records.map((task) => ({
      id: task.Id,
      contactId,
      direction: task.CallType === 'Inbound' ? ('inbound' as const) : ('outbound' as const),
      startTime: new Date(task.CreatedDate),
      duration: task.CallDurationInSeconds,
      status: this.mapDispositionToStatus(task.CallDisposition ?? ''),
      outcome: task.CallDisposition,
      notes: task.Description,
    }))
  }

  // ============================================
  // Activity Management
  // ============================================

  async createActivity(activity: Omit<Activity, 'id'>): Promise<Activity> {
    const task: SalesforceTask = {
      WhoId: activity.contactId,
      Subject: activity.subject,
      Description: activity.description,
      Status: this.mapActivityStatus(activity.status),
      Priority: this.mapActivityPriority(activity.priority),
      ActivityDate: activity.dueDate?.toISOString().split('T')[0],
      TaskSubtype: activity.type === 'call' ? 'Call' : 'Task',
    }

    const result = await this.request<{ id: string }>('/sobjects/Task', {
      method: 'POST',
      body: JSON.stringify(task),
    })

    return {
      ...activity,
      id: result.id,
    }
  }

  async updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity> {
    const taskUpdates: Partial<SalesforceTask> = {}

    if (updates.subject !== undefined) taskUpdates.Subject = updates.subject
    if (updates.description !== undefined) taskUpdates.Description = updates.description
    if (updates.status !== undefined) taskUpdates.Status = this.mapActivityStatus(updates.status)
    if (updates.priority !== undefined)
      taskUpdates.Priority = this.mapActivityPriority(updates.priority)
    if (updates.dueDate !== undefined) {
      taskUpdates.ActivityDate = updates.dueDate.toISOString().split('T')[0]
    }

    await this.request(`/sobjects/Task/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(taskUpdates),
    })

    // Fetch and return updated activity
    const task = await this.request<SalesforceTask & { WhoId: string; CreatedDate: string }>(
      `/sobjects/Task/${activityId}`
    )

    return {
      id: activityId,
      contactId: task.WhoId,
      type: task.TaskSubtype === 'Call' ? 'call' : 'task',
      subject: task.Subject,
      description: task.Description,
      status: this.reverseMapActivityStatus(task.Status),
      priority: this.reverseMapActivityPriority(task.Priority),
      dueDate: task.ActivityDate ? new Date(task.ActivityDate) : undefined,
    }
  }

  async getActivities(contactId: string, limit = 50): Promise<Activity[]> {
    const soql = `
      SELECT Id, Subject, Description, Status, Priority,
             ActivityDate, TaskSubtype, CreatedDate
      FROM Task
      WHERE WhoId = '${contactId}'
      ORDER BY CreatedDate DESC
      LIMIT ${limit}
    `

    const result = await this.query<
      SalesforceTask & { CreatedDate: string; ActivityDate?: string }
    >(soql)

    return result.records.map((task) => ({
      id: task.Id,
      contactId,
      type: task.TaskSubtype === 'Call' ? ('call' as const) : ('task' as const),
      subject: task.Subject,
      description: task.Description,
      status: this.reverseMapActivityStatus(task.Status),
      priority: this.reverseMapActivityPriority(task.Priority),
      dueDate: task.ActivityDate ? new Date(task.ActivityDate) : undefined,
    }))
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Maps a Salesforce Contact to the normalized Contact type.
   */
  private mapSalesforceContact(sf: SalesforceContact): Contact {
    return {
      id: sf.Id,
      firstName: sf.FirstName,
      lastName: sf.LastName,
      email: sf.Email,
      phone: sf.Phone ?? sf.MobilePhone ?? sf.HomePhone,
      company: sf.Account?.Name,
      title: sf.Title,
      createdAt: sf.CreatedDate ? new Date(sf.CreatedDate) : undefined,
      updatedAt: sf.LastModifiedDate ? new Date(sf.LastModifiedDate) : undefined,
      metadata: {
        salesforceId: sf.Id,
        accountId: sf.AccountId,
        mobilePhone: sf.MobilePhone,
        homePhone: sf.HomePhone,
      },
    }
  }

  /**
   * Builds a description string for call logging.
   */
  private buildCallDescription(callData: CallRecord): string {
    const parts: string[] = []

    if (callData.notes) {
      parts.push(`Notes: ${callData.notes}`)
    }

    if (callData.summary) {
      parts.push(`Summary: ${callData.summary}`)
    }

    if (callData.transcription) {
      parts.push(`Transcription: ${callData.transcription}`)
    }

    if (callData.recording?.url) {
      parts.push(`Recording: ${callData.recording.url}`)
    }

    if (callData.sentiment !== undefined) {
      const sentimentLabel =
        callData.sentiment > 0.3 ? 'Positive' : callData.sentiment < -0.3 ? 'Negative' : 'Neutral'
      parts.push(`Sentiment: ${sentimentLabel} (${callData.sentiment.toFixed(2)})`)
    }

    return parts.join('\n\n')
  }

  /**
   * Maps call status to Salesforce disposition.
   */
  private mapStatusToDisposition(status: CallRecord['status']): string {
    const mapping: Record<CallRecord['status'], string> = {
      completed: 'Completed',
      missed: 'Not Answered',
      voicemail: 'Left Voicemail',
      busy: 'Busy',
      failed: 'Failed',
      no_answer: 'Not Answered',
    }
    return mapping[status]
  }

  /**
   * Maps Salesforce disposition to call status.
   */
  private mapDispositionToStatus(disposition: string): CallRecord['status'] {
    const normalizedDisposition = disposition.toLowerCase()
    if (normalizedDisposition.includes('complete')) return 'completed'
    if (normalizedDisposition.includes('voicemail')) return 'voicemail'
    if (normalizedDisposition.includes('busy')) return 'busy'
    if (normalizedDisposition.includes('fail')) return 'failed'
    if (
      normalizedDisposition.includes('not answered') ||
      normalizedDisposition.includes('no answer')
    ) {
      return 'no_answer'
    }
    return 'completed'
  }

  /**
   * Maps activity status to Salesforce task status.
   */
  private mapActivityStatus(status: Activity['status']): string {
    const mapping: Record<Activity['status'], string> = {
      pending: 'Not Started',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Deferred',
      deferred: 'Deferred',
    }
    return mapping[status]
  }

  /**
   * Reverse maps Salesforce status to activity status.
   */
  private reverseMapActivityStatus(sfStatus: string): Activity['status'] {
    const normalizedStatus = sfStatus.toLowerCase()
    if (normalizedStatus.includes('not started')) return 'pending'
    if (normalizedStatus.includes('in progress')) return 'in_progress'
    if (normalizedStatus.includes('complete')) return 'completed'
    if (normalizedStatus.includes('defer') || normalizedStatus.includes('cancel'))
      return 'cancelled'
    return 'pending'
  }

  /**
   * Maps activity priority to Salesforce priority.
   */
  private mapActivityPriority(priority?: Activity['priority']): string {
    if (!priority) return 'Normal'
    const mapping: Record<NonNullable<Activity['priority']>, string> = {
      low: 'Low',
      medium: 'Normal',
      high: 'High',
      urgent: 'High',
    }
    return mapping[priority]
  }

  /**
   * Reverse maps Salesforce priority to activity priority.
   */
  private reverseMapActivityPriority(sfPriority: string): Activity['priority'] {
    const normalizedPriority = sfPriority.toLowerCase()
    if (normalizedPriority === 'low') return 'low'
    if (normalizedPriority === 'high') return 'high'
    return 'medium'
  }
}
