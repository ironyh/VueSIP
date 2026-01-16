/**
 * @vuesip/enterprise - Webhook CRM Adapter
 *
 * A generic webhook-based CRM adapter that allows integration with
 * custom CRM systems via configurable HTTP endpoints.
 *
 * This adapter is useful for:
 * - Custom/homegrown CRM systems
 * - CRM systems without official API support
 * - Middleware/API gateway integrations
 * - Testing and development
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
 * Configuration for individual webhook endpoints.
 */
export interface WebhookEndpoint {
  /** HTTP method (GET, POST, PATCH, DELETE) */
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** URL template (supports {id}, {phone}, {query} placeholders) */
  url: string
  /** Additional headers for this endpoint */
  headers?: Record<string, string>
  /** Transform function for request body */
  transformRequest?: (data: unknown) => unknown
  /** Transform function for response */
  transformResponse?: (data: unknown) => unknown
}

/**
 * Configuration for the webhook adapter endpoints.
 */
export interface WebhookEndpoints {
  // Contact endpoints
  lookupByPhone?: WebhookEndpoint
  lookupById?: WebhookEndpoint
  searchContacts?: WebhookEndpoint
  createContact?: WebhookEndpoint
  updateContact?: WebhookEndpoint

  // Call logging endpoints
  logCall?: WebhookEndpoint
  updateCall?: WebhookEndpoint
  getCallHistory?: WebhookEndpoint

  // Activity endpoints
  createActivity?: WebhookEndpoint
  updateActivity?: WebhookEndpoint
  getActivities?: WebhookEndpoint

  // Connection endpoints
  testConnection?: WebhookEndpoint
}

/**
 * Extended configuration for the webhook adapter.
 */
export interface WebhookAdapterConfig extends CRMConfig {
  /** Base URL for all endpoints (can be overridden per endpoint) */
  baseUrl: string
  /** Endpoint configurations */
  endpoints: WebhookEndpoints
  /** Default transform for all request bodies */
  defaultRequestTransform?: (data: unknown) => unknown
  /** Default transform for all responses */
  defaultResponseTransform?: (data: unknown) => unknown
  /** Authentication type */
  authType?: 'bearer' | 'basic' | 'api-key' | 'custom' | 'none'
  /** Header name for API key authentication */
  apiKeyHeader?: string
  /** Username for basic auth */
  username?: string
  /** Password for basic auth */
  password?: string
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
 * Replaces placeholders in URL templates.
 */
function interpolateUrl(template: string, params: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(value))
  }
  return result
}

/**
 * Webhook CRM Adapter implementation.
 *
 * @example
 * ```typescript
 * const adapter = new WebhookAdapter({
 *   baseUrl: 'https://api.mycrm.com',
 *   apiKey: 'your-api-key',
 *   authType: 'api-key',
 *   apiKeyHeader: 'X-API-Key',
 *   endpoints: {
 *     lookupByPhone: {
 *       method: 'GET',
 *       url: '/contacts/search?phone={phone}',
 *     },
 *     logCall: {
 *       method: 'POST',
 *       url: '/calls',
 *     },
 *   },
 * })
 *
 * await adapter.connect()
 * const contact = await adapter.lookupByPhone('+1-555-123-4567')
 * ```
 */
export class WebhookAdapter implements CRMAdapter {
  readonly name = 'Webhook'
  private _isConnected = false
  private config: WebhookAdapterConfig

  constructor(config: WebhookAdapterConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      authType: 'bearer',
      ...config,
    }
  }

  get isConnected(): boolean {
    return this._isConnected
  }

  /**
   * Builds authorization header based on auth type.
   */
  private getAuthHeader(): Record<string, string> {
    switch (this.config.authType) {
      case 'bearer':
        return this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}

      case 'basic':
        if (this.config.username && this.config.password) {
          const credentials = btoa(`${this.config.username}:${this.config.password}`)
          return { Authorization: `Basic ${credentials}` }
        }
        return {}

      case 'api-key':
        if (this.config.apiKey) {
          const headerName = this.config.apiKeyHeader ?? 'X-API-Key'
          return { [headerName]: this.config.apiKey }
        }
        return {}

      case 'custom':
        return this.config.headers ?? {}

      case 'none':
      default:
        return {}
    }
  }

  /**
   * Makes an HTTP request to a webhook endpoint.
   */
  private async request<T>(
    endpoint: WebhookEndpoint,
    urlParams: Record<string, string> = {},
    body?: unknown
  ): Promise<T> {
    if (!this._isConnected) {
      throw createCRMError('NOT_CONNECTED', 'Not connected. Call connect() first.')
    }

    // Build URL
    const urlTemplate = endpoint.url.startsWith('http')
      ? endpoint.url
      : `${this.config.baseUrl}${endpoint.url}`
    const url = interpolateUrl(urlTemplate, urlParams)

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...this.config.headers,
      ...endpoint.headers,
    }

    // Transform request body
    let requestBody: string | undefined
    if (body !== undefined) {
      const transformedBody = endpoint.transformRequest
        ? endpoint.transformRequest(body)
        : this.config.defaultRequestTransform
          ? this.config.defaultRequestTransform(body)
          : body
      requestBody = JSON.stringify(transformedBody)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 30000)

    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        body: requestBody,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw createCRMError(
          errorBody.code ?? 'API_ERROR',
          errorBody.message ?? `HTTP ${response.status}`,
          errorBody,
          response.status
        )
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T
      }

      const responseData = await response.json()

      // Transform response
      const transformedResponse = endpoint.transformResponse
        ? endpoint.transformResponse(responseData)
        : this.config.defaultResponseTransform
          ? this.config.defaultResponseTransform(responseData)
          : responseData

      return transformedResponse as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw createCRMError('TIMEOUT', 'Request timed out')
      }

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
    if (!this.config.baseUrl) {
      throw createCRMError('INVALID_CONFIG', 'baseUrl is required for webhook connection')
    }

    this._isConnected = true

    // Test connection if endpoint is configured
    if (this.config.endpoints.testConnection) {
      try {
        await this.request(this.config.endpoints.testConnection)
      } catch (error) {
        this._isConnected = false
        throw createCRMError('CONNECTION_FAILED', 'Failed to connect to webhook endpoint', error)
      }
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
    const endpoint = this.config.endpoints.lookupByPhone
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'lookupByPhone endpoint is not configured')
    }

    try {
      const result = await this.request<Contact | null>(endpoint, { phone: phoneNumber })
      return result
    } catch (error) {
      if ((error as CRMError).statusCode === 404) {
        return null
      }
      throw error
    }
  }

  async lookupById(contactId: string): Promise<Contact | null> {
    const endpoint = this.config.endpoints.lookupById
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'lookupById endpoint is not configured')
    }

    try {
      const result = await this.request<Contact | null>(endpoint, { id: contactId })
      return result
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
    const endpoint = this.config.endpoints.searchContacts
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'searchContacts endpoint is not configured')
    }

    const params: Record<string, string> = {
      query,
      limit: String(options?.limit ?? 25),
    }
    if (options?.cursor) {
      params.cursor = options.cursor
    }
    if (options?.sortBy) {
      params.sortBy = options.sortBy
    }
    if (options?.sortOrder) {
      params.sortOrder = options.sortOrder
    }

    const result = await this.request<ContactSearchResult>(endpoint, params)

    return {
      contacts: result.contacts ?? [],
      total: result.total ?? result.contacts?.length ?? 0,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore ?? false,
    }
  }

  async createContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
    const endpoint = this.config.endpoints.createContact
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'createContact endpoint is not configured')
    }

    return this.request<Contact>(endpoint, {}, contact)
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    const endpoint = this.config.endpoints.updateContact
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'updateContact endpoint is not configured')
    }

    return this.request<Contact>(endpoint, { id: contactId }, updates)
  }

  // ============================================
  // Call Logging
  // ============================================

  async logCall(callData: CallRecord): Promise<string> {
    const endpoint = this.config.endpoints.logCall
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'logCall endpoint is not configured')
    }

    const result = await this.request<{ id: string }>(endpoint, {}, callData)
    return result.id
  }

  async updateCall(callId: string, updates: Partial<CallRecord>): Promise<void> {
    const endpoint = this.config.endpoints.updateCall
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'updateCall endpoint is not configured')
    }

    await this.request(endpoint, { id: callId }, updates)
  }

  async getCallHistory(contactId: string, limit = 50): Promise<CallRecord[]> {
    const endpoint = this.config.endpoints.getCallHistory
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'getCallHistory endpoint is not configured')
    }

    const result = await this.request<CallRecord[] | { records: CallRecord[] }>(endpoint, {
      contactId,
      limit: String(limit),
    })

    // Handle both array and object response formats
    return Array.isArray(result) ? result : (result.records ?? [])
  }

  // ============================================
  // Activity Management
  // ============================================

  async createActivity(activity: Omit<Activity, 'id'>): Promise<Activity> {
    const endpoint = this.config.endpoints.createActivity
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'createActivity endpoint is not configured')
    }

    return this.request<Activity>(endpoint, {}, activity)
  }

  async updateActivity(activityId: string, updates: Partial<Activity>): Promise<Activity> {
    const endpoint = this.config.endpoints.updateActivity
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'updateActivity endpoint is not configured')
    }

    return this.request<Activity>(endpoint, { id: activityId }, updates)
  }

  async getActivities(contactId: string, limit = 50): Promise<Activity[]> {
    const endpoint = this.config.endpoints.getActivities
    if (!endpoint) {
      throw createCRMError('NOT_CONFIGURED', 'getActivities endpoint is not configured')
    }

    const result = await this.request<Activity[] | { records: Activity[] }>(endpoint, {
      contactId,
      limit: String(limit),
    })

    // Handle both array and object response formats
    return Array.isArray(result) ? result : (result.records ?? [])
  }
}

/**
 * Factory function to create a webhook adapter with common configurations.
 */
export function createWebhookAdapter(
  config: Partial<WebhookAdapterConfig> & { baseUrl: string }
): WebhookAdapter {
  const defaultEndpoints: WebhookEndpoints = {
    lookupByPhone: {
      method: 'GET',
      url: '/contacts/lookup?phone={phone}',
    },
    lookupById: {
      method: 'GET',
      url: '/contacts/{id}',
    },
    searchContacts: {
      method: 'GET',
      url: '/contacts/search?q={query}&limit={limit}',
    },
    createContact: {
      method: 'POST',
      url: '/contacts',
    },
    updateContact: {
      method: 'PATCH',
      url: '/contacts/{id}',
    },
    logCall: {
      method: 'POST',
      url: '/calls',
    },
    updateCall: {
      method: 'PATCH',
      url: '/calls/{id}',
    },
    getCallHistory: {
      method: 'GET',
      url: '/contacts/{contactId}/calls?limit={limit}',
    },
    createActivity: {
      method: 'POST',
      url: '/activities',
    },
    updateActivity: {
      method: 'PATCH',
      url: '/activities/{id}',
    },
    getActivities: {
      method: 'GET',
      url: '/contacts/{contactId}/activities?limit={limit}',
    },
    testConnection: {
      method: 'GET',
      url: '/health',
    },
  }

  return new WebhookAdapter({
    ...config,
    endpoints: {
      ...defaultEndpoints,
      ...config.endpoints,
    },
  })
}
