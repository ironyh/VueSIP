/**
 * @vuesip/enterprise - HubSpot CRM Adapter
 *
 * Implements the CRMAdapter interface for HubSpot CRM integration.
 * Uses HubSpot's CRM API v3 for all operations.
 *
 * Note: This is a structural implementation. Production use requires:
 * - HubSpot Private App access token or OAuth flow
 * - Appropriate scopes for contacts, engagements, and timeline events
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
 * HubSpot Contact properties structure
 */
interface HubSpotContact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    company?: string
    jobtitle?: string
    createdate?: string
    lastmodifieddate?: string
    [key: string]: string | undefined
  }
}

/**
 * HubSpot Engagement (Call) structure
 */
interface HubSpotEngagement {
  id?: string
  engagement: {
    type: 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE'
    timestamp?: number
    active?: boolean
    ownerId?: number
  }
  associations: {
    contactIds?: number[]
    companyIds?: number[]
    dealIds?: number[]
  }
  metadata: {
    body?: string
    toNumber?: string
    fromNumber?: string
    durationMilliseconds?: number
    status?: string
    disposition?: string
    recordingUrl?: string
    externalId?: string
    [key: string]: string | number | undefined
  }
}

/**
 * HubSpot Task structure
 */
interface HubSpotTask {
  id?: string
  properties: {
    hs_task_subject: string
    hs_task_body?: string
    hs_task_status: string
    hs_task_priority?: string
    hs_timestamp?: string
    hs_task_type?: string
    [key: string]: string | undefined
  }
}

/**
 * HubSpot API response for search
 */
interface HubSpotSearchResponse {
  total: number
  results: HubSpotContact[]
  paging?: {
    next?: {
      after: string
    }
  }
}

/**
 * Normalizes phone numbers for consistent comparison.
 */
function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
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
 * HubSpot CRM Adapter implementation.
 *
 * @example
 * ```typescript
 * const adapter = new HubSpotAdapter({
 *   apiKey: 'your-private-app-token',
 * })
 *
 * await adapter.connect()
 * const contact = await adapter.lookupByPhone('+1-555-123-4567')
 * ```
 */
export class HubSpotAdapter implements CRMAdapter {
  readonly name = 'HubSpot'
  private _isConnected = false
  private config: CRMConfig
  private baseUrl = 'https://api.hubapi.com'

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
   * Makes an authenticated API request to HubSpot.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this._isConnected) {
      throw createCRMError('NOT_CONNECTED', 'Not connected to HubSpot. Call connect() first.')
    }

    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
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
          errorBody.category || 'API_ERROR',
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

  // ============================================
  // Connection Management
  // ============================================

  async connect(): Promise<void> {
    if (!this.config.apiKey) {
      throw createCRMError(
        'INVALID_CONFIG',
        'apiKey (Private App token) is required for HubSpot connection'
      )
    }

    // Test the connection by fetching account info
    try {
      this._isConnected = true
      await this.request('/crm/v3/objects/contacts?limit=1')
      // Connection successful
    } catch (error) {
      this._isConnected = false
      throw createCRMError('CONNECTION_FAILED', 'Failed to connect to HubSpot', error)
    }
  }

  async disconnect(): Promise<void> {
    this._isConnected = false
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

  // ============================================
  // Contact Operations
  // ============================================

  async lookupByPhone(phoneNumber: string): Promise<Contact | null> {
    const normalized = normalizePhoneNumber(phoneNumber)

    // HubSpot search API
    const searchBody = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'phone',
              operator: 'CONTAINS_TOKEN',
              value: normalized,
            },
          ],
        },
        {
          filters: [
            {
              propertyName: 'mobilephone',
              operator: 'CONTAINS_TOKEN',
              value: normalized,
            },
          ],
        },
      ],
      properties: [
        'firstname',
        'lastname',
        'email',
        'phone',
        'mobilephone',
        'company',
        'jobtitle',
        'createdate',
        'lastmodifieddate',
      ],
      limit: 1,
    }

    const result = await this.request<HubSpotSearchResponse>('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify(searchBody),
    })

    if (result.results.length === 0) {
      return null
    }

    return this.mapHubSpotContact(result.results[0] as HubSpotContact)
  }

  async lookupById(contactId: string): Promise<Contact | null> {
    try {
      const properties =
        'firstname,lastname,email,phone,mobilephone,company,jobtitle,createdate,lastmodifieddate'
      const hsContact = await this.request<HubSpotContact>(
        `/crm/v3/objects/contacts/${contactId}?properties=${properties}`
      )
      return this.mapHubSpotContact(hsContact)
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

    // Build search filters based on search fields
    const searchFields = options?.searchFields ?? ['name', 'email', 'phone', 'company']
    const filterGroups: Array<{
      filters: Array<{ propertyName: string; operator: string; value: string }>
    }> = []

    if (searchFields.includes('name')) {
      filterGroups.push({
        filters: [{ propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: query }],
      })
      filterGroups.push({
        filters: [{ propertyName: 'lastname', operator: 'CONTAINS_TOKEN', value: query }],
      })
    }
    if (searchFields.includes('email')) {
      filterGroups.push({
        filters: [{ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: query }],
      })
    }
    if (searchFields.includes('phone')) {
      filterGroups.push({
        filters: [{ propertyName: 'phone', operator: 'CONTAINS_TOKEN', value: query }],
      })
    }
    if (searchFields.includes('company')) {
      filterGroups.push({
        filters: [{ propertyName: 'company', operator: 'CONTAINS_TOKEN', value: query }],
      })
    }

    // Build sort
    const sorts: Array<{ propertyName: string; direction: string }> = []
    if (options?.sortBy) {
      const sortField = {
        relevance: 'lastmodifieddate',
        name: 'firstname',
        updatedAt: 'lastmodifieddate',
        createdAt: 'createdate',
      }[options.sortBy]
      sorts.push({
        propertyName: sortField,
        direction: options.sortOrder?.toUpperCase() ?? 'DESCENDING',
      })
    }

    const searchBody = {
      filterGroups,
      properties: [
        'firstname',
        'lastname',
        'email',
        'phone',
        'mobilephone',
        'company',
        'jobtitle',
        'createdate',
        'lastmodifieddate',
      ],
      limit,
      after: options?.cursor,
      sorts: sorts.length > 0 ? sorts : undefined,
    }

    const result = await this.request<HubSpotSearchResponse>('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify(searchBody),
    })

    return {
      contacts: result.results.map((r) => this.mapHubSpotContact(r as HubSpotContact)),
      total: result.total,
      nextCursor: result.paging?.next?.after,
      hasMore: !!result.paging?.next?.after,
    }
  }

  async createContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
    const hsProperties: HubSpotContact['properties'] = {
      firstname: contact.firstName,
      lastname: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      jobtitle: contact.title,
    }

    const result = await this.request<HubSpotContact>('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify({ properties: hsProperties }),
    })

    return this.mapHubSpotContact(result)
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    const hsProperties: Partial<HubSpotContact['properties']> = {}

    if (updates.firstName !== undefined) hsProperties.firstname = updates.firstName
    if (updates.lastName !== undefined) hsProperties.lastname = updates.lastName
    if (updates.email !== undefined) hsProperties.email = updates.email
    if (updates.phone !== undefined) hsProperties.phone = updates.phone
    if (updates.company !== undefined) hsProperties.company = updates.company
    if (updates.title !== undefined) hsProperties.jobtitle = updates.title

    const result = await this.request<HubSpotContact>(`/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: hsProperties }),
    })

    return this.mapHubSpotContact(result)
  }

  // ============================================
  // Call Logging
  // ============================================

  async logCall(callData: CallRecord): Promise<string> {
    const engagement: HubSpotEngagement = {
      engagement: {
        type: 'CALL',
        timestamp: callData.startTime.getTime(),
        active: false,
      },
      associations: {
        contactIds: callData.contactId ? [parseInt(callData.contactId, 10)] : [],
      },
      metadata: {
        body: this.buildCallBody(callData),
        toNumber: callData.direction === 'outbound' ? callData.phoneNumber : undefined,
        fromNumber: callData.direction === 'inbound' ? callData.phoneNumber : undefined,
        durationMilliseconds: callData.duration ? callData.duration * 1000 : undefined,
        status: 'COMPLETED',
        disposition: callData.outcome ?? this.mapStatusToDisposition(callData.status),
        recordingUrl: callData.recording?.url,
      },
    }

    const result = await this.request<{ engagement: { id: number } }>(
      '/engagements/v1/engagements',
      {
        method: 'POST',
        body: JSON.stringify(engagement),
      }
    )

    return result.engagement.id.toString()
  }

  async updateCall(callId: string, updates: Partial<CallRecord>): Promise<void> {
    const metadataUpdates: Partial<HubSpotEngagement['metadata']> = {}

    if (updates.notes !== undefined) {
      metadataUpdates.body = updates.notes
    }
    if (updates.duration !== undefined) {
      metadataUpdates.durationMilliseconds = updates.duration * 1000
    }
    if (updates.outcome !== undefined) {
      metadataUpdates.disposition = updates.outcome
    }
    if (updates.recording?.url !== undefined) {
      metadataUpdates.recordingUrl = updates.recording.url
    }

    await this.request(`/engagements/v1/engagements/${callId}`, {
      method: 'PATCH',
      body: JSON.stringify({ metadata: metadataUpdates }),
    })
  }

  async getCallHistory(contactId: string, limit = 50): Promise<CallRecord[]> {
    // Get engagements associated with the contact
    const result = await this.request<{
      results: Array<{
        engagement: { id: number; type: string; timestamp: number }
        metadata: HubSpotEngagement['metadata']
      }>
    }>(`/engagements/v1/engagements/associated/CONTACT/${contactId}/paged?limit=${limit}`)

    return result.results
      .filter((e) => e.engagement.type === 'CALL')
      .map((e) => ({
        id: e.engagement.id.toString(),
        contactId,
        direction: e.metadata.fromNumber ? ('inbound' as const) : ('outbound' as const),
        startTime: new Date(e.engagement.timestamp),
        duration: e.metadata.durationMilliseconds
          ? Math.round(e.metadata.durationMilliseconds / 1000)
          : undefined,
        status: this.mapDispositionToStatus(e.metadata.disposition?.toString() ?? ''),
        phoneNumber: e.metadata.fromNumber ?? e.metadata.toNumber,
        outcome: e.metadata.disposition?.toString(),
        notes: e.metadata.body,
        recording: e.metadata.recordingUrl
          ? { url: e.metadata.recordingUrl, duration: 0 }
          : undefined,
      }))
  }

  // ============================================
  // Activity Management
  // ============================================

  async createActivity(activity: Omit<Activity, 'id'>): Promise<Activity> {
    const hsTask: HubSpotTask = {
      properties: {
        hs_task_subject: activity.subject,
        hs_task_body: activity.description,
        hs_task_status: this.mapActivityStatus(activity.status),
        hs_task_priority: this.mapActivityPriority(activity.priority),
        hs_timestamp: activity.dueDate?.toISOString(),
        hs_task_type: this.mapActivityType(activity.type),
      },
    }

    const result = await this.request<{ id: string; properties: HubSpotTask['properties'] }>(
      '/crm/v3/objects/tasks',
      {
        method: 'POST',
        body: JSON.stringify(hsTask),
      }
    )

    // Associate with contact
    if (activity.contactId) {
      await this.request(
        `/crm/v3/objects/tasks/${result.id}/associations/contacts/${activity.contactId}/task_to_contact`,
        {
          method: 'PUT',
        }
      )
    }

    return {
      ...activity,
      id: result.id,
    }
  }

  async updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity> {
    const hsProperties: Partial<HubSpotTask['properties']> = {}

    if (updates.subject !== undefined) hsProperties.hs_task_subject = updates.subject
    if (updates.description !== undefined) hsProperties.hs_task_body = updates.description
    if (updates.status !== undefined)
      hsProperties.hs_task_status = this.mapActivityStatus(updates.status)
    if (updates.priority !== undefined)
      hsProperties.hs_task_priority = this.mapActivityPriority(updates.priority)
    if (updates.dueDate !== undefined) hsProperties.hs_timestamp = updates.dueDate.toISOString()

    const result = await this.request<{ id: string; properties: HubSpotTask['properties'] }>(
      `/crm/v3/objects/tasks/${activityId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ properties: hsProperties }),
      }
    )

    return {
      id: result.id,
      contactId: updates.contactId ?? '',
      type: this.reverseMapActivityType(result.properties.hs_task_type ?? ''),
      subject: result.properties.hs_task_subject,
      description: result.properties.hs_task_body,
      status: this.reverseMapActivityStatus(result.properties.hs_task_status),
      priority: this.reverseMapActivityPriority(result.properties.hs_task_priority),
      dueDate: result.properties.hs_timestamp
        ? new Date(result.properties.hs_timestamp)
        : undefined,
    }
  }

  async getActivities(contactId: string, limit = 50): Promise<Activity[]> {
    // Get tasks associated with the contact
    const result = await this.request<{
      results: Array<{ id: string; properties: HubSpotTask['properties'] }>
    }>(`/crm/v3/objects/contacts/${contactId}/associations/tasks?limit=${limit}`)

    // Fetch full task details
    const activities: Activity[] = []
    for (const assoc of result.results) {
      try {
        const task = await this.request<{ id: string; properties: HubSpotTask['properties'] }>(
          `/crm/v3/objects/tasks/${assoc.id}?properties=hs_task_subject,hs_task_body,hs_task_status,hs_task_priority,hs_timestamp,hs_task_type`
        )
        activities.push({
          id: task.id,
          contactId,
          type: this.reverseMapActivityType(task.properties.hs_task_type ?? ''),
          subject: task.properties.hs_task_subject,
          description: task.properties.hs_task_body,
          status: this.reverseMapActivityStatus(task.properties.hs_task_status),
          priority: this.reverseMapActivityPriority(task.properties.hs_task_priority),
          dueDate: task.properties.hs_timestamp
            ? new Date(task.properties.hs_timestamp)
            : undefined,
        })
      } catch {
        // Skip tasks that fail to fetch
      }
    }

    return activities
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Maps a HubSpot Contact to the normalized Contact type.
   */
  private mapHubSpotContact(hs: HubSpotContact): Contact {
    return {
      id: hs.id,
      firstName: hs.properties.firstname,
      lastName: hs.properties.lastname,
      email: hs.properties.email,
      phone: hs.properties.phone,
      company: hs.properties.company,
      title: hs.properties.jobtitle,
      createdAt: hs.properties.createdate ? new Date(hs.properties.createdate) : undefined,
      updatedAt: hs.properties.lastmodifieddate
        ? new Date(hs.properties.lastmodifieddate)
        : undefined,
      metadata: {
        hubspotId: hs.id,
        mobilePhone: hs.properties.mobilephone,
      },
    }
  }

  /**
   * Builds the body text for call logging.
   */
  private buildCallBody(callData: CallRecord): string {
    const parts: string[] = []

    if (callData.notes) {
      parts.push(callData.notes)
    }

    if (callData.summary) {
      parts.push(`Summary: ${callData.summary}`)
    }

    if (callData.transcription) {
      parts.push(`Transcription: ${callData.transcription}`)
    }

    if (callData.sentiment !== undefined) {
      const sentimentLabel =
        callData.sentiment > 0.3 ? 'Positive' : callData.sentiment < -0.3 ? 'Negative' : 'Neutral'
      parts.push(`Sentiment: ${sentimentLabel} (${callData.sentiment.toFixed(2)})`)
    }

    return parts.join('\n\n')
  }

  /**
   * Maps call status to HubSpot disposition.
   */
  private mapStatusToDisposition(status: CallRecord['status']): string {
    const mapping: Record<CallRecord['status'], string> = {
      completed: 'f240bbac-87c9-4f6e-bf70-924b57d47db7', // Connected (HubSpot default GUID)
      missed: 'a4c4c377-d246-4b32-a13b-75a56a4cd0ff', // No answer
      voicemail: 'b2cf5968-551e-4856-9783-52b3da59a7d0', // Left voicemail
      busy: '9d9162e7-6cf3-4944-bf63-4dff82258764', // Busy
      failed: '73a0d17f-1163-4015-bdd5-ec830791da20', // Wrong number
      no_answer: 'a4c4c377-d246-4b32-a13b-75a56a4cd0ff', // No answer
    }
    return mapping[status]
  }

  /**
   * Maps HubSpot disposition to call status.
   */
  private mapDispositionToStatus(disposition: string): CallRecord['status'] {
    const normalizedDisposition = disposition.toLowerCase()
    if (normalizedDisposition.includes('connect')) return 'completed'
    if (normalizedDisposition.includes('voicemail')) return 'voicemail'
    if (normalizedDisposition.includes('busy')) return 'busy'
    if (normalizedDisposition.includes('wrong') || normalizedDisposition.includes('fail'))
      return 'failed'
    if (normalizedDisposition.includes('no answer')) return 'no_answer'
    return 'completed'
  }

  /**
   * Maps activity status to HubSpot task status.
   */
  private mapActivityStatus(status: Activity['status']): string {
    const mapping: Record<Activity['status'], string> = {
      pending: 'NOT_STARTED',
      in_progress: 'IN_PROGRESS',
      completed: 'COMPLETED',
      cancelled: 'DEFERRED',
      deferred: 'DEFERRED',
    }
    return mapping[status]
  }

  /**
   * Reverse maps HubSpot status to activity status.
   */
  private reverseMapActivityStatus(hsStatus: string): Activity['status'] {
    const mapping: Record<string, Activity['status']> = {
      NOT_STARTED: 'pending',
      IN_PROGRESS: 'in_progress',
      WAITING: 'pending',
      COMPLETED: 'completed',
      DEFERRED: 'deferred',
    }
    return mapping[hsStatus] ?? 'pending'
  }

  /**
   * Maps activity priority to HubSpot priority.
   */
  private mapActivityPriority(priority?: Activity['priority']): string {
    if (!priority) return 'MEDIUM'
    const mapping: Record<NonNullable<Activity['priority']>, string> = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      urgent: 'HIGH',
    }
    return mapping[priority]
  }

  /**
   * Reverse maps HubSpot priority to activity priority.
   */
  private reverseMapActivityPriority(hsPriority?: string): Activity['priority'] {
    if (!hsPriority) return 'medium'
    const mapping: Record<string, Activity['priority']> = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
    }
    return mapping[hsPriority] ?? 'medium'
  }

  /**
   * Maps activity type to HubSpot task type.
   */
  private mapActivityType(type: Activity['type']): string {
    const mapping: Record<Activity['type'], string> = {
      call: 'CALL',
      email: 'EMAIL',
      meeting: 'MEETING',
      task: 'TODO',
      note: 'TODO',
      follow_up: 'TODO',
    }
    return mapping[type]
  }

  /**
   * Reverse maps HubSpot task type to activity type.
   */
  private reverseMapActivityType(hsType: string): Activity['type'] {
    const mapping: Record<string, Activity['type']> = {
      CALL: 'call',
      EMAIL: 'email',
      MEETING: 'meeting',
      TODO: 'task',
    }
    return mapping[hsType] ?? 'task'
  }
}
