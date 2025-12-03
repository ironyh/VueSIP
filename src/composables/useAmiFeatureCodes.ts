/**
 * AMI Feature Codes Composable
 *
 * Vue composable for executing PBX feature codes like DND, Call Forward, etc.
 * Integrates with Asterisk/FreePBX dialplan feature codes via AMI.
 *
 * @module composables/useAmiFeatureCodes
 */

import { ref, computed, onUnmounted } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  DndStatus,
  CallForwardType,
  CallForwardStatus,
  FeatureCode,
  FeatureExecutionResult,
  ExtensionFeatureStatus,
  StandardFeatureCodes,
  UseAmiFeatureCodesOptions,
  UseAmiFeatureCodesReturn,
} from '@/types/featurecodes.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiFeatureCodes')

// Re-export types for convenience
export type {
  DndStatus,
  CallForwardType,
  CallForwardStatus,
  FeatureCode,
  FeatureExecutionResult,
  ExtensionFeatureStatus,
  StandardFeatureCodes,
  UseAmiFeatureCodesOptions,
  UseAmiFeatureCodesReturn,
}

/**
 * Default FreePBX/Asterisk feature codes
 */
const DEFAULT_FEATURE_CODES: StandardFeatureCodes = {
  // DND
  dndToggle: '*76',
  dndActivate: '*78',
  dndDeactivate: '*79',

  // Call Forward Unconditional
  cfActivate: '*72',
  cfDeactivate: '*73',

  // Call Forward Busy
  cfbActivate: '*90',
  cfbDeactivate: '*91',

  // Call Forward No Answer
  cfnaActivate: '*52',
  cfnaDeactivate: '*53',

  // Other features
  callPickup: '*8',
  directedPickup: '**',
  voicemail: '*97',
  directVoicemail: '*',
  intercom: '*80',
  callPark: '#72',
  attendedTransfer: '*2',
  blindTransfer: '##',
  recordingToggle: '*1',
}

/**
 * Validate extension format
 */
function isValidExtension(extension: string): boolean {
  if (!extension || extension.length < 1 || extension.length > 20) {
    return false
  }
  // Allow digits, asterisk, and hash
  return /^[\d*#]+$/.test(extension)
}

/**
 * Validate destination format
 */
function isValidDestination(destination: string): boolean {
  if (!destination || destination.length < 1 || destination.length > 32) {
    return false
  }
  // Allow digits, asterisk, hash, plus, and common separators
  return /^[\d*#+\-().\s]+$/.test(destination)
}

/**
 * Sanitize input to prevent injection
 */
function sanitizeInput(input: string): string {
  // First strip HTML tags completely
  let sanitized = input.replace(/<[^>]*>/g, '')
  // Then remove any remaining dangerous characters
  sanitized = sanitized.replace(/[<>'";&|`$\\]/g, '')
  return sanitized.trim()
}

/**
 * AMI Feature Codes Composable
 *
 * Provides reactive feature code management for Vue components.
 * Supports DND, Call Forward, and custom feature codes.
 *
 * @param client - AMI client instance (from useAmi().getClient())
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * await ami.connect({ url: 'ws://pbx.example.com:8080' })
 *
 * const {
 *   dndStatus,
 *   isDndEnabled,
 *   toggleDnd,
 *   enableCallForward,
 *   disableCallForward,
 * } = useAmiFeatureCodes(ami.getClient()!, {
 *   extension: '1001',
 *   onDndChanged: (enabled) => console.log('DND:', enabled),
 * })
 *
 * // Toggle DND
 * await toggleDnd()
 *
 * // Enable call forward
 * await enableCallForward('5551234567')
 * ```
 */
export function useAmiFeatureCodes(
  client: AmiClient | null,
  options: UseAmiFeatureCodesOptions = {}
): UseAmiFeatureCodesReturn {
  // ============================================================================
  // Configuration
  // ============================================================================

  const config = {
    extension: options.extension ?? '',
    featureCodes: { ...DEFAULT_FEATURE_CODES, ...options.featureCodes },
    refreshInterval: options.refreshInterval ?? 0,
    dbFamily: options.dbFamily ?? 'AMPUSER',
    onDndChanged: options.onDndChanged,
    onCallForwardChanged: options.onCallForwardChanged,
    onFeatureExecuted: options.onFeatureExecuted,
    onError: options.onError,
  }

  // ============================================================================
  // State
  // ============================================================================

  const extension = ref(config.extension)
  const dndStatus = ref<DndStatus>('unknown')
  const callForwardStatus = ref<CallForwardStatus[]>([
    { type: 'unconditional', enabled: false },
    { type: 'busy', enabled: false },
    { type: 'noanswer', enabled: false },
    { type: 'unavailable', enabled: false },
  ])
  const featureCodes = ref<FeatureCode[]>([])
  const customFeatures = ref<Record<string, boolean>>({})
  const executionHistory = ref<FeatureExecutionResult[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const isDndEnabled = computed(() => dndStatus.value === 'enabled')

  const hasActiveCallForward = computed(() =>
    callForwardStatus.value.some((cf) => cf.enabled)
  )

  const callForwardDestination = computed(() => {
    const activeCf = callForwardStatus.value.find((cf) => cf.enabled && cf.destination)
    return activeCf?.destination ?? null
  })

  const getCallForwardByType = (type: CallForwardType): CallForwardStatus | undefined => {
    return callForwardStatus.value.find((cf) => cf.type === type)
  }

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Create execution result
   */
  const createResult = (
    success: boolean,
    featureCode: string,
    message?: string,
    newStatus?: string
  ): FeatureExecutionResult => {
    const result: FeatureExecutionResult = {
      success,
      featureCode,
      message,
      newStatus,
      executedAt: new Date(),
    }

    executionHistory.value.unshift(result)
    if (executionHistory.value.length > 50) {
      executionHistory.value = executionHistory.value.slice(0, 50)
    }

    config.onFeatureExecuted?.(result)
    return result
  }

  /**
   * Execute feature code via AMI Originate
   */
  const executeCode = async (
    code: string,
    destination?: string
  ): Promise<FeatureExecutionResult> => {
    if (!client) {
      const err = 'AMI client not connected'
      error.value = err
      config.onError?.(err)
      return createResult(false, code, err)
    }

    if (!extension.value) {
      const err = 'No extension configured'
      error.value = err
      config.onError?.(err)
      return createResult(false, code, err)
    }

    // Sanitize inputs
    const sanitizedCode = sanitizeInput(code)
    const sanitizedDestination = destination ? sanitizeInput(destination) : undefined

    // Build dial string
    let dialString = sanitizedCode
    if (sanitizedDestination) {
      dialString += sanitizedDestination
    }

    isLoading.value = true
    error.value = null

    try {
      // Use Originate to execute the feature code from the extension
      const response = await client.sendAction({
        Action: 'Originate',
        Channel: `Local/${extension.value}@from-internal`,
        Context: 'from-internal',
        Exten: dialString,
        Priority: 1,
        CallerID: `Feature Code <${extension.value}>`,
        Timeout: 10000,
        Async: 'true',
        Variable: `FEATURECODE=${sanitizedCode}`,
      })

      if (response?.data?.Response === 'Success') {
        logger.debug('Feature code executed', { code: sanitizedCode, extension: extension.value })
        return createResult(true, sanitizedCode, 'Feature code executed successfully')
      } else {
        const msg = response?.data?.Message || 'Failed to execute feature code'
        error.value = msg
        config.onError?.(msg)
        return createResult(false, sanitizedCode, msg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute feature code'
      error.value = errorMsg
      config.onError?.(errorMsg)
      return createResult(false, sanitizedCode, errorMsg)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Query AstDB for feature state
   */
  const queryDbValue = async (family: string, key: string): Promise<string | null> => {
    if (!client) return null

    try {
      const response = await client.sendAction({
        Action: 'DBGet',
        Family: family,
        Key: key,
      })

      if (response?.data?.Response === 'Success') {
        return (response.data as Record<string, string>).Val ?? null
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Refresh DND status from AstDB
   */
  const refreshDndStatus = async (): Promise<void> => {
    if (!extension.value) return

    const value = await queryDbValue(config.dbFamily, `${extension.value}/donotdisturb`)
    const prevStatus = dndStatus.value

    if (value === 'YES' || value === '1' || value === 'enabled') {
      dndStatus.value = 'enabled'
    } else if (value === 'NO' || value === '0' || value === 'disabled' || value === null) {
      dndStatus.value = 'disabled'
    } else {
      dndStatus.value = 'unknown'
    }

    if (prevStatus !== dndStatus.value && prevStatus !== 'unknown') {
      config.onDndChanged?.(dndStatus.value === 'enabled')
    }
  }

  /**
   * Refresh call forward status from AstDB
   */
  const refreshCallForwardStatus = async (): Promise<void> => {
    if (!extension.value) return

    // Check unconditional CF
    const cfValue = await queryDbValue('CF', extension.value)
    const cfIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'unconditional')
    if (cfIdx !== -1) {
      const prevStatus = callForwardStatus.value[cfIdx]
      const newStatus: CallForwardStatus = {
        type: 'unconditional',
        enabled: !!cfValue,
        destination: cfValue || undefined,
      }
      callForwardStatus.value[cfIdx] = newStatus
      if (prevStatus && prevStatus.enabled !== !!cfValue) {
        config.onCallForwardChanged?.(newStatus)
      }
    }

    // Check CFB
    const cfbValue = await queryDbValue('CFB', extension.value)
    const cfbIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'busy')
    if (cfbIdx !== -1) {
      callForwardStatus.value[cfbIdx] = {
        type: 'busy',
        enabled: !!cfbValue,
        destination: cfbValue || undefined,
      }
    }

    // Check CFNA
    const cfnaValue = await queryDbValue('CFU', extension.value) // FreePBX uses CFU for unavailable/noanswer
    const cfnaIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'noanswer')
    if (cfnaIdx !== -1) {
      callForwardStatus.value[cfnaIdx] = {
        type: 'noanswer',
        enabled: !!cfnaValue,
        destination: cfnaValue || undefined,
      }
    }
  }

  // ============================================================================
  // Public Methods - DND
  // ============================================================================

  const toggleDnd = async (): Promise<FeatureExecutionResult> => {
    const result = await executeCode(config.featureCodes.dndToggle)
    if (result.success) {
      // Toggle local state immediately
      dndStatus.value = dndStatus.value === 'enabled' ? 'disabled' : 'enabled'
      result.newStatus = dndStatus.value
      config.onDndChanged?.(dndStatus.value === 'enabled')
    }
    return result
  }

  const enableDnd = async (): Promise<FeatureExecutionResult> => {
    const result = await executeCode(config.featureCodes.dndActivate)
    if (result.success) {
      dndStatus.value = 'enabled'
      result.newStatus = 'enabled'
      config.onDndChanged?.(true)
    }
    return result
  }

  const disableDnd = async (): Promise<FeatureExecutionResult> => {
    const result = await executeCode(config.featureCodes.dndDeactivate)
    if (result.success) {
      dndStatus.value = 'disabled'
      result.newStatus = 'disabled'
      config.onDndChanged?.(false)
    }
    return result
  }

  // ============================================================================
  // Public Methods - Call Forward
  // ============================================================================

  const enableCallForward = async (destination: string): Promise<FeatureExecutionResult> => {
    if (!isValidDestination(destination)) {
      const err = 'Invalid destination format'
      error.value = err
      config.onError?.(err)
      return createResult(false, config.featureCodes.cfActivate, err)
    }

    const result = await executeCode(config.featureCodes.cfActivate, destination)
    if (result.success) {
      const cfIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'unconditional')
      if (cfIdx !== -1) {
        const newStatus: CallForwardStatus = {
          type: 'unconditional',
          enabled: true,
          destination,
        }
        callForwardStatus.value[cfIdx] = newStatus
        result.newStatus = `enabled:${destination}`
        config.onCallForwardChanged?.(newStatus)
      }
    }
    return result
  }

  const disableCallForward = async (): Promise<FeatureExecutionResult> => {
    const result = await executeCode(config.featureCodes.cfDeactivate)
    if (result.success) {
      const cfIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'unconditional')
      if (cfIdx !== -1) {
        const newStatus: CallForwardStatus = {
          type: 'unconditional',
          enabled: false,
        }
        callForwardStatus.value[cfIdx] = newStatus
        result.newStatus = 'disabled'
        config.onCallForwardChanged?.(newStatus)
      }
    }
    return result
  }

  const enableCallForwardBusy = async (destination: string): Promise<FeatureExecutionResult> => {
    if (!isValidDestination(destination)) {
      const err = 'Invalid destination format'
      error.value = err
      config.onError?.(err)
      return createResult(false, config.featureCodes.cfbActivate, err)
    }

    const result = await executeCode(config.featureCodes.cfbActivate, destination)
    if (result.success) {
      const cfIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'busy')
      if (cfIdx !== -1) {
        const newStatus: CallForwardStatus = {
          type: 'busy',
          enabled: true,
          destination,
        }
        callForwardStatus.value[cfIdx] = newStatus
        result.newStatus = `enabled:${destination}`
        config.onCallForwardChanged?.(newStatus)
      }
    }
    return result
  }

  const disableCallForwardBusy = async (): Promise<FeatureExecutionResult> => {
    const result = await executeCode(config.featureCodes.cfbDeactivate)
    if (result.success) {
      const cfIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'busy')
      if (cfIdx !== -1) {
        const newStatus: CallForwardStatus = {
          type: 'busy',
          enabled: false,
        }
        callForwardStatus.value[cfIdx] = newStatus
        result.newStatus = 'disabled'
        config.onCallForwardChanged?.(newStatus)
      }
    }
    return result
  }

  const enableCallForwardNoAnswer = async (
    destination: string,
    _ringTimeout?: number
  ): Promise<FeatureExecutionResult> => {
    if (!isValidDestination(destination)) {
      const err = 'Invalid destination format'
      error.value = err
      config.onError?.(err)
      return createResult(false, config.featureCodes.cfnaActivate, err)
    }

    // Validate ring timeout if provided (5-60 seconds is typical range)
    if (_ringTimeout !== undefined && (_ringTimeout < 5 || _ringTimeout > 120)) {
      const err = 'Invalid ring timeout (must be 5-120 seconds)'
      error.value = err
      config.onError?.(err)
      return createResult(false, config.featureCodes.cfnaActivate, err)
    }

    const result = await executeCode(config.featureCodes.cfnaActivate, destination)
    if (result.success) {
      const cfIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'noanswer')
      if (cfIdx !== -1) {
        const newStatus: CallForwardStatus = {
          type: 'noanswer',
          enabled: true,
          destination,
          ringTimeout: _ringTimeout,
        }
        callForwardStatus.value[cfIdx] = newStatus
        result.newStatus = `enabled:${destination}`
        config.onCallForwardChanged?.(newStatus)
      }
    }
    return result
  }

  const disableCallForwardNoAnswer = async (): Promise<FeatureExecutionResult> => {
    const result = await executeCode(config.featureCodes.cfnaDeactivate)
    if (result.success) {
      const cfIdx = callForwardStatus.value.findIndex((cf) => cf.type === 'noanswer')
      if (cfIdx !== -1) {
        const newStatus: CallForwardStatus = {
          type: 'noanswer',
          enabled: false,
        }
        callForwardStatus.value[cfIdx] = newStatus
        result.newStatus = 'disabled'
        config.onCallForwardChanged?.(newStatus)
      }
    }
    return result
  }

  // ============================================================================
  // Public Methods - General Features
  // ============================================================================

  const executeFeatureCode = async (
    code: string,
    destination?: string
  ): Promise<FeatureExecutionResult> => {
    return executeCode(code, destination)
  }

  const executeFeature = async (
    featureName: string,
    destination?: string
  ): Promise<FeatureExecutionResult> => {
    const feature = featureCodes.value.find(
      (f) => f.id === featureName || f.name.toLowerCase() === featureName.toLowerCase()
    )

    if (!feature) {
      // Check standard codes
      const standardCode = config.featureCodes[featureName as keyof StandardFeatureCodes]
      if (standardCode) {
        return executeCode(standardCode, destination)
      }

      const err = `Unknown feature: ${featureName}`
      error.value = err
      config.onError?.(err)
      return createResult(false, featureName, err)
    }

    if (feature.requiresDestination && !destination) {
      const err = 'Destination required for this feature'
      error.value = err
      config.onError?.(err)
      return createResult(false, feature.activateCode, err)
    }

    return executeCode(feature.activateCode, destination)
  }

  const refreshStatus = async (): Promise<void> => {
    if (!client || !extension.value) return

    isLoading.value = true
    error.value = null

    try {
      await Promise.all([
        refreshDndStatus(),
        refreshCallForwardStatus(),
      ])
      logger.debug('Feature status refreshed', { extension: extension.value })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refresh status'
      error.value = errorMsg
      config.onError?.(errorMsg)
    } finally {
      isLoading.value = false
    }
  }

  const setExtension = (ext: string): void => {
    if (!isValidExtension(ext)) {
      const err = 'Invalid extension format'
      error.value = err
      config.onError?.(err)
      return
    }

    extension.value = ext
    // Reset status when extension changes
    dndStatus.value = 'unknown'
    callForwardStatus.value = [
      { type: 'unconditional', enabled: false },
      { type: 'busy', enabled: false },
      { type: 'noanswer', enabled: false },
      { type: 'unavailable', enabled: false },
    ]

    // Refresh status for new extension
    if (client) {
      refreshStatus()
    }
  }

  // ============================================================================
  // Custom Features
  // ============================================================================

  const registerFeature = (feature: FeatureCode): void => {
    const existing = featureCodes.value.findIndex((f) => f.id === feature.id)
    if (existing !== -1) {
      featureCodes.value[existing] = feature
    } else {
      featureCodes.value.push(feature)
    }
    logger.debug('Feature registered', { id: feature.id, name: feature.name })
  }

  const unregisterFeature = (featureId: string): void => {
    featureCodes.value = featureCodes.value.filter((f) => f.id !== featureId)
  }

  const getFeature = (featureId: string): FeatureCode | undefined => {
    return featureCodes.value.find((f) => f.id === featureId)
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  const clearHistory = (): void => {
    executionHistory.value = []
  }

  const getStatusSummary = (): ExtensionFeatureStatus => {
    return {
      extension: extension.value,
      dnd: dndStatus.value,
      callForward: [...callForwardStatus.value],
      customFeatures: { ...customFeatures.value },
      lastUpdated: new Date(),
    }
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  // Register default features
  featureCodes.value = [
    {
      id: 'dnd',
      name: 'Do Not Disturb',
      category: 'dnd',
      activateCode: config.featureCodes.dndActivate,
      deactivateCode: config.featureCodes.dndDeactivate,
      toggleCode: config.featureCodes.dndToggle,
      requiresDestination: false,
      description: 'Enable or disable Do Not Disturb mode',
      available: true,
    },
    {
      id: 'cf',
      name: 'Call Forward',
      category: 'callforward',
      activateCode: config.featureCodes.cfActivate,
      deactivateCode: config.featureCodes.cfDeactivate,
      requiresDestination: true,
      description: 'Forward all calls to another number',
      available: true,
    },
    {
      id: 'cfb',
      name: 'Call Forward Busy',
      category: 'callforward',
      activateCode: config.featureCodes.cfbActivate,
      deactivateCode: config.featureCodes.cfbDeactivate,
      requiresDestination: true,
      description: 'Forward calls when line is busy',
      available: true,
    },
    {
      id: 'cfna',
      name: 'Call Forward No Answer',
      category: 'callforward',
      activateCode: config.featureCodes.cfnaActivate,
      deactivateCode: config.featureCodes.cfnaDeactivate,
      requiresDestination: true,
      description: 'Forward calls when not answered',
      available: true,
    },
    {
      id: 'pickup',
      name: 'Call Pickup',
      category: 'pickup',
      activateCode: config.featureCodes.callPickup,
      requiresDestination: false,
      description: 'Pick up a ringing call in your group',
      available: true,
    },
    {
      id: 'directed_pickup',
      name: 'Directed Call Pickup',
      category: 'pickup',
      activateCode: config.featureCodes.directedPickup,
      requiresDestination: true,
      description: 'Pick up a specific extension\'s ringing call',
      available: true,
    },
    {
      id: 'voicemail',
      name: 'Voicemail Access',
      category: 'voicemail',
      activateCode: config.featureCodes.voicemail,
      requiresDestination: false,
      description: 'Access your voicemail box',
      available: true,
    },
    {
      id: 'intercom',
      name: 'Intercom',
      category: 'intercom',
      activateCode: config.featureCodes.intercom,
      requiresDestination: true,
      description: 'Page an extension with auto-answer',
      available: true,
    },
    {
      id: 'park',
      name: 'Call Park',
      category: 'parking',
      activateCode: config.featureCodes.callPark,
      requiresDestination: false,
      description: 'Park the current call',
      available: true,
    },
    {
      id: 'recording',
      name: 'Recording Toggle',
      category: 'recording',
      activateCode: config.featureCodes.recordingToggle,
      requiresDestination: false,
      description: 'Toggle call recording on/off',
      available: true,
    },
  ]

  // Auto-refresh if configured
  if (config.refreshInterval > 0 && client) {
    refreshTimer = setInterval(refreshStatus, config.refreshInterval)
  }

  // Initial status fetch
  if (client && extension.value) {
    refreshStatus()
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive State
    extension,
    dndStatus,
    callForwardStatus,
    featureCodes,
    customFeatures,
    executionHistory,
    isLoading,
    error,

    // Computed
    isDndEnabled,
    hasActiveCallForward,
    callForwardDestination,
    getCallForwardByType,

    // DND Methods
    toggleDnd,
    enableDnd,
    disableDnd,

    // Call Forward Methods
    enableCallForward,
    disableCallForward,
    enableCallForwardBusy,
    disableCallForwardBusy,
    enableCallForwardNoAnswer,
    disableCallForwardNoAnswer,

    // General Feature Methods
    executeFeatureCode,
    executeFeature,
    refreshStatus,
    setExtension,

    // Custom Features
    registerFeature,
    unregisterFeature,
    getFeature,

    // Utility Methods
    clearHistory,
    getStatusSummary,
  }
}
