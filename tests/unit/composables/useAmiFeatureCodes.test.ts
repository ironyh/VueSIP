/**
 * Tests for useAmiFeatureCodes composable
 *
 * Feature code execution system for Asterisk Manager Interface:
 * - Do Not Disturb (DND) management with toggle/enable/disable
 * - Call forwarding (unconditional, busy, no answer, unavailable)
 * - Custom feature code registration and execution
 * - Execution history tracking with validation
 * - Destination validation and sanitization
 * - Error handling with callback support
 *
 * @see src/composables/useAmiFeatureCodes.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmiFeatureCodes } from '@/composables/useAmiFeatureCodes'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient,
  type MockAmiClient,
} from '../utils/mockFactories'

/**
 * Test fixtures for consistent test data across all test suites
 */
const TEST_FIXTURES = {
  extensions: {
    default: '1001',
    alternate: '1002',
    invalid: 'invalid<>',
  },
  destinations: {
    valid: '5551234567',
    alternate: '5559876543',
    another: '5555555555',
    invalid: '',
  },
  featureCodes: {
    dnd: {
      toggle: '*76',
      enable: '*78',
      disable: '*79',
      customToggle: '*70',
    },
    callForward: {
      unconditionalEnable: '*72',
      unconditionalDisable: '*73',
      busyEnable: '*90',
      noAnswerEnable: '*52',
    },
    voicemail: '*97',
    intercom: '*80',
  },
  ringTimeouts: {
    tooShort: 3,
    valid: 20,
    tooLong: 150,
    min: 5,
    max: 120,
  },
  errors: {
    notConnected: 'AMI client not connected',
    noExtension: 'No extension configured',
    invalidDestination: 'Invalid destination format',
    invalidExtension: 'Invalid extension format',
    channelUnavailable: 'Channel unavailable',
    networkError: 'Network error',
    destinationRequired: 'Destination required for this feature',
    unknownFeature: 'Unknown feature',
  },
  responses: {
    success: { data: { Response: 'Success' } },
    error: (message: string) => ({ data: { Response: 'Error', Message: message } }),
  },
} as const

/**
 * Factory function: Create mock AMI options with sensible defaults
 */
function createMockAmiOptions(overrides?: any) {
  return {
    extension: TEST_FIXTURES.extensions.default,
    onDndChanged: vi.fn(),
    onCallForwardChanged: vi.fn(),
    onFeatureExecuted: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  }
}

/**
 * Factory function: Create mock feature code definition
 */
function createMockFeatureCode(overrides?: any) {
  return {
    id: 'custom_feature',
    name: 'Custom Feature',
    category: 'custom' as const,
    activateCode: '*99',
    requiresDestination: false,
    available: true,
    ...overrides,
  }
}

describe('useAmiFeatureCodes', () => {
  let mockClient: MockAmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  /**
   * Initial State Tests
   * Verify composable initializes with correct default values
   */
  describe('Initial State', () => {
    describe.each([
      {
        description: 'DND status',
        property: 'dndStatus',
        expectedValue: 'unknown',
      },
      {
        description: 'loading state',
        property: 'isLoading',
        expectedValue: false,
      },
      {
        description: 'error state',
        property: 'error',
        expectedValue: null,
      },
    ])('$description', ({ property, expectedValue }) => {
      it(`should initialize ${property} to ${expectedValue}`, () => {
        const composable = useAmiFeatureCodes(mockClient as unknown as AmiClient)
        expect(composable[property].value).toBe(expectedValue)
      })
    })

    it('should have empty execution history', () => {
      const { executionHistory } = useAmiFeatureCodes(mockClient as unknown as AmiClient)
      expect(executionHistory.value).toHaveLength(0)
    })

    it('should have default feature codes registered', () => {
      const { featureCodes } = useAmiFeatureCodes(mockClient as unknown as AmiClient)
      expect(featureCodes.value.length).toBeGreaterThan(0)
      expect(featureCodes.value.find(f => f.id === 'dnd')).toBeDefined()
      expect(featureCodes.value.find(f => f.id === 'cf')).toBeDefined()
    })

    it('should have call forward status initialized', () => {
      const { callForwardStatus } = useAmiFeatureCodes(mockClient as unknown as AmiClient)
      expect(callForwardStatus.value).toHaveLength(4)
      expect(callForwardStatus.value.every(cf => !cf.enabled)).toBe(true)
    })

    it('should use extension from options', () => {
      const { extension } = useAmiFeatureCodes(mockClient as unknown as AmiClient, {
        extension: TEST_FIXTURES.extensions.default,
      })
      expect(extension.value).toBe(TEST_FIXTURES.extensions.default)
    })
  })

  describe('computed properties', () => {
    it('should compute isDndEnabled correctly', () => {
      const { isDndEnabled, dndStatus } = useAmiFeatureCodes(mockClient as unknown as AmiClient)

      expect(isDndEnabled.value).toBe(false)

      dndStatus.value = 'enabled'
      expect(isDndEnabled.value).toBe(true)

      dndStatus.value = 'disabled'
      expect(isDndEnabled.value).toBe(false)
    })

    it('should compute hasActiveCallForward correctly', () => {
      const { hasActiveCallForward, callForwardStatus } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient
      )

      expect(hasActiveCallForward.value).toBe(false)

      callForwardStatus.value[0] = { type: 'unconditional', enabled: true, destination: '5551234567' }
      expect(hasActiveCallForward.value).toBe(true)
    })

    it('should compute callForwardDestination correctly', () => {
      const { callForwardDestination, callForwardStatus } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient
      )

      expect(callForwardDestination.value).toBeNull()

      callForwardStatus.value[0] = { type: 'unconditional', enabled: true, destination: '5551234567' }
      expect(callForwardDestination.value).toBe('5551234567')
    })
  })

  /**
   * DND Operations Tests
   * Verify Do Not Disturb enable/disable/toggle functionality
   *
   * DND flow:
   * 1. Execute feature code via AMI Originate action
   * 2. Update dndStatus based on operation
   * 3. Track execution in history
   * 4. Trigger onDndChanged callback
   */
  describe('DND Operations', () => {
    describe.each([
      {
        description: 'toggle DND',
        operation: 'toggleDnd',
        featureCode: TEST_FIXTURES.featureCodes.dnd.toggle,
        initialStatus: 'unknown' as const,
        expectedStatus: 'enabled' as const,
        callbackValue: true,
      },
      {
        description: 'enable DND',
        operation: 'enableDnd',
        featureCode: TEST_FIXTURES.featureCodes.dnd.enable,
        initialStatus: 'unknown' as const,
        expectedStatus: 'enabled' as const,
        callbackValue: true,
      },
      {
        description: 'disable DND',
        operation: 'disableDnd',
        featureCode: TEST_FIXTURES.featureCodes.dnd.disable,
        initialStatus: 'enabled' as const,
        expectedStatus: 'disabled' as const,
        callbackValue: false,
      },
    ])('$description', ({ operation, featureCode, initialStatus, expectedStatus, callbackValue }) => {
      it(`should ${operation} and update state`, async () => {
        mockClient.sendAction = vi.fn().mockResolvedValue(TEST_FIXTURES.responses.success)

        const options = createMockAmiOptions()
        const composable = useAmiFeatureCodes(mockClient as unknown as AmiClient, options)

        // Set initial status if needed
        if (initialStatus !== 'unknown') {
          composable.dndStatus.value = initialStatus
        }

        const result = await composable[operation]()

        expect(result.success).toBe(true)
        expect(result.featureCode).toBe(featureCode)
        expect(composable.dndStatus.value).toBe(expectedStatus)
        expect(options.onDndChanged).toHaveBeenCalledWith(callbackValue)

        // Verify execution history for toggle only
        if (operation === 'toggleDnd') {
          expect(composable.executionHistory.value).toHaveLength(1)
        }
      })
    })
  })

  describe('Call Forward operations', () => {
    it('should enable call forward with destination', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const onCallForwardChanged = vi.fn()
      const { enableCallForward, callForwardStatus: _callForwardStatus, getCallForwardByType } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onCallForwardChanged }
      )

      const result = await enableCallForward('5551234567')

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe('*72')

      const cfStatus = getCallForwardByType('unconditional')
      expect(cfStatus?.enabled).toBe(true)
      expect(cfStatus?.destination).toBe('5551234567')
      expect(onCallForwardChanged).toHaveBeenCalled()
    })

    it('should disable call forward', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { enableCallForward, disableCallForward, getCallForwardByType } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      await enableCallForward('5551234567')
      const result = await disableCallForward()

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe('*73')

      const cfStatus = getCallForwardByType('unconditional')
      expect(cfStatus?.enabled).toBe(false)
    })

    it('should reject invalid destination', async () => {
      const onError = vi.fn()
      const { enableCallForward, error } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onError }
      )

      const result = await enableCallForward('')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid destination format')
      expect(error.value).toBe('Invalid destination format')
      expect(onError).toHaveBeenCalled()
    })

    /**
     * Call Forward Type Tests
     * Verify different call forward types (busy, no answer)
     */
    describe.each([
      {
        type: 'busy',
        operation: 'enableCallForwardBusy',
        destination: TEST_FIXTURES.destinations.alternate,
        featureCode: TEST_FIXTURES.featureCodes.callForward.busyEnable,
      },
    ])('$type forwarding', ({ type, operation, destination, featureCode }) => {
      it(`should enable call forward ${type}`, async () => {
        mockClient.sendAction = vi.fn().mockResolvedValue(TEST_FIXTURES.responses.success)

        const composable = useAmiFeatureCodes(
          mockClient as unknown as AmiClient,
          { extension: TEST_FIXTURES.extensions.default }
        )

        const result = await composable[operation](destination)

        expect(result.success).toBe(true)
        expect(result.featureCode).toBe(featureCode)

        const cfStatus = composable.getCallForwardByType(type)
        expect(cfStatus?.enabled).toBe(true)
        expect(cfStatus?.destination).toBe(destination)
      })
    })

    it('should enable call forward no answer with timeout', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(TEST_FIXTURES.responses.success)

      const { enableCallForwardNoAnswer, getCallForwardByType } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: TEST_FIXTURES.extensions.default }
      )

      const result = await enableCallForwardNoAnswer(
        TEST_FIXTURES.destinations.another,
        TEST_FIXTURES.ringTimeouts.valid
      )

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe(TEST_FIXTURES.featureCodes.callForward.noAnswerEnable)

      const cfStatus = getCallForwardByType('noanswer')
      expect(cfStatus?.enabled).toBe(true)
      expect(cfStatus?.destination).toBe(TEST_FIXTURES.destinations.another)
      expect(cfStatus?.ringTimeout).toBe(TEST_FIXTURES.ringTimeouts.valid)
    })

    /**
     * Ring Timeout Validation Tests
     * Verify ring timeout bounds checking for no-answer forwarding
     */
    describe.each([
      {
        description: 'too short',
        timeout: TEST_FIXTURES.ringTimeouts.tooShort,
      },
      {
        description: 'too long',
        timeout: TEST_FIXTURES.ringTimeouts.tooLong,
      },
    ])('ring timeout $description', ({ timeout }) => {
      it(`should reject timeout of ${timeout} seconds`, async () => {
        const onError = vi.fn()
        const { enableCallForwardNoAnswer } = useAmiFeatureCodes(
          mockClient as unknown as AmiClient,
          { extension: TEST_FIXTURES.extensions.default, onError }
        )

        const result = await enableCallForwardNoAnswer(TEST_FIXTURES.destinations.another, timeout)

        expect(result.success).toBe(false)
        expect(result.message).toContain('Invalid ring timeout')
        expect(onError).toHaveBeenCalled()
      })
    })
  })

  describe('executeFeatureCode', () => {
    it('should execute feature code without destination', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { executeFeatureCode, executionHistory } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      const result = await executeFeatureCode('*97')

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe('*97')
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Action: 'Originate',
          Exten: '*97',
        })
      )
      expect(executionHistory.value).toHaveLength(1)
    })

    it('should execute feature code with destination', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { executeFeatureCode } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      const result = await executeFeatureCode('**', '1002')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Exten: '**1002',
        })
      )
    })

    it('should sanitize feature code input', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { executeFeatureCode } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      await executeFeatureCode('*97<script>alert(1)</script>')

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Exten: '*97alert(1)',
        })
      )
    })
  })

  describe('executeFeature', () => {
    it('should execute feature by name', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { executeFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      const result = await executeFeature('voicemail')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Exten: '*97',
        })
      )
    })

    it('should execute feature with destination when required', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { executeFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      const result = await executeFeature('intercom', '1002')

      expect(result.success).toBe(true)
      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Exten: '*801002',
        })
      )
    })

    it('should fail for unknown feature', async () => {
      const onError = vi.fn()
      const { executeFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onError }
      )

      const result = await executeFeature('unknown_feature')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Unknown feature')
      expect(onError).toHaveBeenCalled()
    })

    it('should fail when destination required but not provided', async () => {
      const onError = vi.fn()
      const { registerFeature, executeFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onError }
      )

      registerFeature({
        id: 'test_feature',
        name: 'Test Feature',
        category: 'custom',
        activateCode: '*99',
        requiresDestination: true,
        available: true,
      })

      const result = await executeFeature('test_feature')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Destination required for this feature')
    })
  })

  /**
   * Extension Management Tests
   * Verify extension setting and validation
   */
  describe('Extension Management', () => {
    it('should set extension and reset status', () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(TEST_FIXTURES.responses.success)

      const { extension, dndStatus, setExtension } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: TEST_FIXTURES.extensions.default }
      )

      dndStatus.value = 'enabled'
      setExtension(TEST_FIXTURES.extensions.alternate)

      expect(extension.value).toBe(TEST_FIXTURES.extensions.alternate)
      expect(dndStatus.value).toBe('unknown')
    })

    it('should reject invalid extension', () => {
      const onError = vi.fn()
      const { extension, setExtension, error } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: TEST_FIXTURES.extensions.default, onError }
      )

      setExtension(TEST_FIXTURES.extensions.invalid)

      expect(extension.value).toBe(TEST_FIXTURES.extensions.default) // unchanged
      expect(error.value).toBe(TEST_FIXTURES.errors.invalidExtension)
      expect(onError).toHaveBeenCalled()
    })
  })

  /**
   * Custom Feature Code Tests
   * Verify custom feature registration and management
   *
   * Custom feature flow:
   * 1. Register with unique ID and activation code
   * 2. Store in featureCodes array
   * 3. Allow updates via re-registration
   * 4. Support unregistration for cleanup
   */
  describe('Custom Features', () => {
    it('should register custom feature', () => {
      const { registerFeature, featureCodes, getFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient
      )

      const customFeature = createMockFeatureCode({
        id: 'custom_speed_dial',
        name: 'Speed Dial Boss',
        activateCode: '*01',
        description: 'Quick dial to boss',
      })

      registerFeature(customFeature)

      const feature = getFeature('custom_speed_dial')
      expect(feature).toBeDefined()
      expect(feature?.name).toBe('Speed Dial Boss')
      expect(featureCodes.value.find(f => f.id === 'custom_speed_dial')).toBeDefined()
    })

    it('should update existing feature on re-register', () => {
      const { registerFeature, getFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient
      )

      registerFeature(createMockFeatureCode({ name: 'Original Name' }))
      registerFeature(createMockFeatureCode({ name: 'Updated Name' }))

      const feature = getFeature('custom_feature')
      expect(feature?.name).toBe('Updated Name')
    })

    it('should unregister feature', () => {
      const { registerFeature, unregisterFeature, getFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient
      )

      const tempFeature = createMockFeatureCode({
        id: 'temp_feature',
        name: 'Temp Feature',
      })

      registerFeature(tempFeature)
      expect(getFeature('temp_feature')).toBeDefined()

      unregisterFeature('temp_feature')
      expect(getFeature('temp_feature')).toBeUndefined()
    })
  })

  /**
   * Error Handling Tests
   * Verify error handling for various failure scenarios
   *
   * Error types:
   * - Client not connected
   * - Missing extension
   * - AMI action failures
   * - Network errors
   */
  describe('Error Handling', () => {
    describe.each([
      {
        description: 'AMI client not connected',
        client: null,
        options: { extension: TEST_FIXTURES.extensions.default },
        expectedMessage: TEST_FIXTURES.errors.notConnected,
      },
      {
        description: 'no extension configured',
        client: () => createMockAmiClient(),
        options: {},
        expectedMessage: TEST_FIXTURES.errors.noExtension,
      },
    ])('$description', ({ description, client, options, expectedMessage }) => {
      it(`should fail with "${expectedMessage}"`, async () => {
        const actualClient = typeof client === 'function' ? client() : client
        const onError = vi.fn()
        const { toggleDnd, error } = useAmiFeatureCodes(
          actualClient as unknown as AmiClient,
          { ...options, onError }
        )

        const result = await toggleDnd()

        expect(result.success).toBe(false)
        expect(result.message).toBe(expectedMessage)
        expect(error.value).toBe(expectedMessage)
        if (description !== 'no extension configured') {
          expect(onError).toHaveBeenCalled()
        }
      })
    })

    it('should handle AMI action failure', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue(
        TEST_FIXTURES.responses.error(TEST_FIXTURES.errors.channelUnavailable)
      )

      const onError = vi.fn()
      const { toggleDnd, error } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: TEST_FIXTURES.extensions.default, onError }
      )

      const result = await toggleDnd()

      expect(result.success).toBe(false)
      expect(result.message).toBe(TEST_FIXTURES.errors.channelUnavailable)
      expect(error.value).toBe(TEST_FIXTURES.errors.channelUnavailable)
      expect(onError).toHaveBeenCalled()
    })

    it('should handle network error', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error(TEST_FIXTURES.errors.networkError))

      const onError = vi.fn()
      const { toggleDnd } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: TEST_FIXTURES.extensions.default, onError }
      )

      const result = await toggleDnd()

      expect(result.success).toBe(false)
      expect(result.message).toBe(TEST_FIXTURES.errors.networkError)
      expect(onError).toHaveBeenCalled()
    })
  })

  describe('execution history', () => {
    it('should track execution history', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { executeFeatureCode, executionHistory } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      await executeFeatureCode('*97')
      await executeFeatureCode('*76')
      await executeFeatureCode('*8')

      expect(executionHistory.value).toHaveLength(3)
      expect(executionHistory.value[0].featureCode).toBe('*8') // Most recent first
      expect(executionHistory.value[1].featureCode).toBe('*76')
      expect(executionHistory.value[2].featureCode).toBe('*97')
    })

    it('should limit history to 50 entries', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { executeFeatureCode, executionHistory } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      for (let i = 0; i < 60; i++) {
        await executeFeatureCode('*97')
      }

      expect(executionHistory.value).toHaveLength(50)
    })

    it('should clear history', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { executeFeatureCode, executionHistory, clearHistory } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      await executeFeatureCode('*97')
      await executeFeatureCode('*76')
      expect(executionHistory.value).toHaveLength(2)

      clearHistory()
      expect(executionHistory.value).toHaveLength(0)
    })
  })

  describe('getStatusSummary', () => {
    it('should return complete status summary', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { enableDnd, enableCallForward, getStatusSummary } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      await enableDnd()
      await enableCallForward('5551234567')

      const summary = getStatusSummary()

      expect(summary.extension).toBe('1001')
      expect(summary.dnd).toBe('enabled')
      expect(summary.callForward).toHaveLength(4)
      expect(summary.callForward.find(cf => cf.type === 'unconditional')?.enabled).toBe(true)
      expect(summary.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('callbacks', () => {
    it('should call onFeatureExecuted for all executions', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const onFeatureExecuted = vi.fn()
      const { executeFeatureCode } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onFeatureExecuted }
      )

      await executeFeatureCode('*97')

      expect(onFeatureExecuted).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          featureCode: '*97',
        })
      )
    })
  })

  describe('custom feature codes', () => {
    it('should use custom feature codes from options', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { toggleDnd } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        {
          extension: '1001',
          featureCodes: {
            dndToggle: '*70', // Custom code
          },
        }
      )

      await toggleDnd()

      expect(mockClient.sendAction).toHaveBeenCalledWith(
        expect.objectContaining({
          Exten: '*70',
        })
      )
    })
  })
})
