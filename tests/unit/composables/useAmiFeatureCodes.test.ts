/**
 * useAmiFeatureCodes composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAmiFeatureCodes } from '@/composables/useAmiFeatureCodes'
import type { AmiClient } from '@/core/AmiClient'
import {
  createMockAmiClient,
  type MockAmiClient,
} from '../utils/mockFactories'

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

  describe('initial state', () => {
    it('should have unknown DND status initially', () => {
      const { dndStatus } = useAmiFeatureCodes(mockClient as unknown as AmiClient)
      expect(dndStatus.value).toBe('unknown')
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAmiFeatureCodes(mockClient as unknown as AmiClient)
      expect(isLoading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiFeatureCodes(mockClient as unknown as AmiClient)
      expect(error.value).toBeNull()
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
        extension: '1001',
      })
      expect(extension.value).toBe('1001')
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

  describe('DND operations', () => {
    it('should toggle DND', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const onDndChanged = vi.fn()
      const { toggleDnd, dndStatus, executionHistory } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onDndChanged }
      )

      // Initial state is unknown, toggling should set to enabled
      const result = await toggleDnd()

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe('*76')
      expect(dndStatus.value).toBe('enabled')
      expect(executionHistory.value).toHaveLength(1)
      expect(onDndChanged).toHaveBeenCalledWith(true)
    })

    it('should enable DND', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const onDndChanged = vi.fn()
      const { enableDnd, dndStatus } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onDndChanged }
      )

      const result = await enableDnd()

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe('*78')
      expect(dndStatus.value).toBe('enabled')
      expect(onDndChanged).toHaveBeenCalledWith(true)
    })

    it('should disable DND', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const onDndChanged = vi.fn()
      const { disableDnd, dndStatus } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onDndChanged }
      )

      dndStatus.value = 'enabled'
      const result = await disableDnd()

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe('*79')
      expect(dndStatus.value).toBe('disabled')
      expect(onDndChanged).toHaveBeenCalledWith(false)
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

    it('should enable call forward busy', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { enableCallForwardBusy, getCallForwardByType } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      const result = await enableCallForwardBusy('5559876543')

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe('*90')

      const cfStatus = getCallForwardByType('busy')
      expect(cfStatus?.enabled).toBe(true)
      expect(cfStatus?.destination).toBe('5559876543')
    })

    it('should enable call forward no answer', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { enableCallForwardNoAnswer, getCallForwardByType } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      const result = await enableCallForwardNoAnswer('5555555555', 20)

      expect(result.success).toBe(true)
      expect(result.featureCode).toBe('*52')

      const cfStatus = getCallForwardByType('noanswer')
      expect(cfStatus?.enabled).toBe(true)
      expect(cfStatus?.destination).toBe('5555555555')
      expect(cfStatus?.ringTimeout).toBe(20)
    })

    it('should reject invalid ring timeout', async () => {
      const onError = vi.fn()
      const { enableCallForwardNoAnswer, error: _error } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onError }
      )

      // Too short
      const result1 = await enableCallForwardNoAnswer('5555555555', 3)
      expect(result1.success).toBe(false)
      expect(result1.message).toContain('Invalid ring timeout')
      expect(onError).toHaveBeenCalled()

      onError.mockClear()

      // Too long
      const result2 = await enableCallForwardNoAnswer('5555555555', 150)
      expect(result2.success).toBe(false)
      expect(result2.message).toContain('Invalid ring timeout')
      expect(onError).toHaveBeenCalled()
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

  describe('setExtension', () => {
    it('should set extension and reset status', () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({ data: { Response: 'Success' } })

      const { extension, dndStatus, setExtension } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001' }
      )

      dndStatus.value = 'enabled'
      setExtension('1002')

      expect(extension.value).toBe('1002')
      expect(dndStatus.value).toBe('unknown')
    })

    it('should reject invalid extension', () => {
      const onError = vi.fn()
      const { extension, setExtension, error } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onError }
      )

      setExtension('invalid<>')

      expect(extension.value).toBe('1001') // unchanged
      expect(error.value).toBe('Invalid extension format')
      expect(onError).toHaveBeenCalled()
    })
  })

  describe('custom features', () => {
    it('should register custom feature', () => {
      const { registerFeature, featureCodes, getFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient
      )

      registerFeature({
        id: 'custom_speed_dial',
        name: 'Speed Dial Boss',
        category: 'custom',
        activateCode: '*01',
        requiresDestination: false,
        description: 'Quick dial to boss',
        available: true,
      })

      const feature = getFeature('custom_speed_dial')
      expect(feature).toBeDefined()
      expect(feature?.name).toBe('Speed Dial Boss')
      expect(featureCodes.value.find(f => f.id === 'custom_speed_dial')).toBeDefined()
    })

    it('should update existing feature on re-register', () => {
      const { registerFeature, getFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient
      )

      registerFeature({
        id: 'custom_feature',
        name: 'Original Name',
        category: 'custom',
        activateCode: '*01',
        requiresDestination: false,
        available: true,
      })

      registerFeature({
        id: 'custom_feature',
        name: 'Updated Name',
        category: 'custom',
        activateCode: '*01',
        requiresDestination: false,
        available: true,
      })

      const feature = getFeature('custom_feature')
      expect(feature?.name).toBe('Updated Name')
    })

    it('should unregister feature', () => {
      const { registerFeature, unregisterFeature, getFeature } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient
      )

      registerFeature({
        id: 'temp_feature',
        name: 'Temp Feature',
        category: 'custom',
        activateCode: '*99',
        requiresDestination: false,
        available: true,
      })

      expect(getFeature('temp_feature')).toBeDefined()

      unregisterFeature('temp_feature')

      expect(getFeature('temp_feature')).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should handle AMI client not connected', async () => {
      const onError = vi.fn()
      const { toggleDnd, error } = useAmiFeatureCodes(null, {
        extension: '1001',
        onError,
      })

      const result = await toggleDnd()

      expect(result.success).toBe(false)
      expect(result.message).toBe('AMI client not connected')
      expect(error.value).toBe('AMI client not connected')
      expect(onError).toHaveBeenCalled()
    })

    it('should handle no extension configured', async () => {
      const onError = vi.fn()
      const { toggleDnd, error } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { onError }
      )

      const result = await toggleDnd()

      expect(result.success).toBe(false)
      expect(result.message).toBe('No extension configured')
      expect(error.value).toBe('No extension configured')
    })

    it('should handle AMI action failure', async () => {
      mockClient.sendAction = vi.fn().mockResolvedValue({
        data: {
          Response: 'Error',
          Message: 'Channel unavailable',
        },
      })

      const onError = vi.fn()
      const { toggleDnd, error } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onError }
      )

      const result = await toggleDnd()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Channel unavailable')
      expect(error.value).toBe('Channel unavailable')
      expect(onError).toHaveBeenCalled()
    })

    it('should handle network error', async () => {
      mockClient.sendAction = vi.fn().mockRejectedValue(new Error('Network error'))

      const onError = vi.fn()
      const { toggleDnd } = useAmiFeatureCodes(
        mockClient as unknown as AmiClient,
        { extension: '1001', onError }
      )

      const result = await toggleDnd()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Network error')
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
