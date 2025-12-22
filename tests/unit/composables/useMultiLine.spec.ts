/**
 * useMultiLine Composable Unit Tests
 *
 * Comprehensive test suite for Vue multi-line composable
 */

import { describe, it, expect, beforeEach, vi as _vi } from 'vitest'
import { nextTick } from 'vue'
import { useMultiLine } from '../../../src/composables/useMultiLine'
import type { LineConfig, LineState as _LineState } from '../../../src/types/multiline.types'
import type { CallSession } from '../../../src/types/session.types'

describe('useMultiLine', () => {
  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const { lines, activeLine, isRegistering, stats, manager } = useMultiLine()

      expect(lines.value).toHaveLength(0)
      expect(activeLine.value).toBeNull()
      expect(isRegistering.value).toBe(false)
      expect(stats.value.totalLines).toBe(0)
      expect(manager).toBeDefined()
    })

    it('should initialize with custom config', () => {
      const { manager } = useMultiLine({
        maxLines: 10,
        routingStrategy: 'round_robin'
      })

      const config = manager.getConfig()
      expect(config.maxLines).toBe(10)
      expect(config.routingStrategy).toBe('round_robin')
    })

    it('should have reactive state', () => {
      const { lines, activeLine, isRegistering, stats } = useMultiLine()

      expect(lines).toHaveProperty('value')
      expect(activeLine).toHaveProperty('value')
      expect(isRegistering).toHaveProperty('value')
      expect(stats).toHaveProperty('value')
    })
  })

  describe('Line Management - Add Line', () => {
    const validConfig: LineConfig = {
      uri: 'sip:user@example.com',
      password: 'secret',
      displayName: 'Test Line',
      priority: 1
    }

    it('should add a new line', async () => {
      const { addLine, lines } = useMultiLine()

      const lineId = await addLine(validConfig)

      expect(lineId).toBeDefined()
      expect(lines.value).toHaveLength(1)
      expect(lines.value[0].uri).toBe(validConfig.uri)
    })

    it('should update reactive state after adding line', async () => {
      const { addLine, lines, stats } = useMultiLine()

      await addLine(validConfig)
      await nextTick()

      expect(lines.value).toHaveLength(1)
      expect(stats.value.totalLines).toBe(1)
    })

    it('should set first line as active', async () => {
      const { addLine, activeLine } = useMultiLine()

      const lineId = await addLine(validConfig)
      await nextTick()

      expect(activeLine.value?.id).toBe(lineId)
    })

    it('should handle multiple lines', async () => {
      const { addLine, lines } = useMultiLine()

      await addLine(validConfig)
      await addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2'
      })
      await nextTick()

      expect(lines.value).toHaveLength(2)
    })

    it('should reject invalid line config', async () => {
      const { addLine } = useMultiLine()

      await expect(
        addLine({ password: 'secret', displayName: 'Test' } as LineConfig)
      ).rejects.toThrow('Line URI and password are required')
    })

    it('should reject when max lines reached', async () => {
      const { addLine } = useMultiLine({ maxLines: 2 })

      await addLine(validConfig)
      await addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2'
      })

      await expect(
        addLine({
          uri: 'sip:user3@example.com',
          password: 'secret',
          displayName: 'Line 3'
        })
      ).rejects.toThrow('Maximum number of lines')
    })

    it('should update stats after adding line', async () => {
      const { addLine, stats } = useMultiLine()

      await addLine(validConfig)
      await nextTick()

      expect(stats.value.totalLines).toBe(1)
      expect(stats.value.callsPerLine).toBeDefined()
    })
  })

  describe('Line Management - Remove Line', () => {
    let lineId: string

    beforeEach(async () => {
      const { addLine } = useMultiLine()
      lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line'
      })
    })

    it('should remove a line', async () => {
      const { removeLine, lines } = useMultiLine()

      await removeLine(lineId)
      await nextTick()

      expect(lines.value).toHaveLength(0)
    })

    it('should update reactive state after removing line', async () => {
      const { removeLine, lines, stats } = useMultiLine()

      await removeLine(lineId)
      await nextTick()

      expect(lines.value).toHaveLength(0)
      expect(stats.value.totalLines).toBe(0)
    })

    it('should reject removing non-existent line', async () => {
      const { removeLine } = useMultiLine()

      await expect(removeLine('invalid-line')).rejects.toThrow('Line invalid-line not found')
    })

    it('should reject removing line with active calls', async () => {
      const { removeLine, associateCall } = useMultiLine()

      const mockCall = { id: 'call-1' } as CallSession
      associateCall('call-1', lineId, mockCall)

      await expect(removeLine(lineId)).rejects.toThrow('Cannot remove line')
    })
  })

  describe('Line Registration', () => {
    let lineId: string

    beforeEach(async () => {
      const { addLine } = useMultiLine()
      lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
        autoRegister: false
      })
    })

    it('should register a line', async () => {
      const { registerLine, getLineStatus } = useMultiLine()

      await registerLine(lineId)
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(getLineStatus(lineId)).toBe('registered')
    })

    it('should update isRegistering state', async () => {
      const { registerLine, isRegistering } = useMultiLine()

      const promise = registerLine(lineId)
      await nextTick()

      expect(isRegistering.value).toBe(true)

      await promise
      await new Promise(resolve => setTimeout(resolve, 150))
      await nextTick()

      expect(isRegistering.value).toBe(false)
    })

    it('should update stats after registration', async () => {
      const { registerLine, stats } = useMultiLine()

      await registerLine(lineId)
      await new Promise(resolve => setTimeout(resolve, 150))
      await nextTick()

      expect(stats.value.registeredLines).toBe(1)
    })

    it('should handle registration failure', async () => {
      const { addLine, registerLine, getLineStatus } = useMultiLine()

      const invalidLineId = await addLine({
        uri: 'sip:invalid@example.com',
        password: 'secret',
        displayName: 'Invalid Line',
        autoRegister: false
      })

      await expect(registerLine(invalidLineId)).rejects.toThrow('Invalid credentials')

      expect(getLineStatus(invalidLineId)).toBe('error')
    })

    it('should reject registering non-existent line', async () => {
      const { registerLine } = useMultiLine()

      await expect(registerLine('invalid-line')).rejects.toThrow('Line invalid-line not found')
    })
  })

  describe('Line Unregistration', () => {
    let lineId: string

    beforeEach(async () => {
      const { addLine } = useMultiLine()
      lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
        autoRegister: true
      })
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    it('should unregister a line', async () => {
      const { unregisterLine, getLineStatus } = useMultiLine()

      await unregisterLine(lineId)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(getLineStatus(lineId)).toBe('unregistered')
    })

    it('should update reactive state after unregistration', async () => {
      const { unregisterLine, stats } = useMultiLine()

      await unregisterLine(lineId)
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      expect(stats.value.registeredLines).toBe(0)
    })

    it('should reject unregistering non-existent line', async () => {
      const { unregisterLine } = useMultiLine()

      await expect(unregisterLine('invalid-line')).rejects.toThrow('Line invalid-line not found')
    })
  })

  describe('Active Line Switching', () => {
    let line1: string
    let line2: string

    beforeEach(async () => {
      const { addLine } = useMultiLine()
      line1 = await addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1'
      })
      line2 = await addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2'
      })
    })

    it('should switch active line', async () => {
      const { switchLine, activeLine } = useMultiLine()

      await switchLine(line2)
      await nextTick()

      expect(activeLine.value?.id).toBe(line2)
    })

    it('should update reactive state after switching', async () => {
      const { switchLine, activeLine, stats } = useMultiLine()

      await switchLine(line2)
      await nextTick()

      expect(activeLine.value?.id).toBe(line2)
      expect(stats.value.activeLineId).toBe(line2)
    })

    it('should reject switching to non-existent line', async () => {
      const { switchLine } = useMultiLine()

      await expect(switchLine('invalid-line')).rejects.toThrow('Line invalid-line not found')
    })

    it('should handle switching to already active line', async () => {
      const { switchLine, activeLine } = useMultiLine()

      await switchLine(line1)
      await nextTick()

      expect(activeLine.value?.id).toBe(line1)
    })
  })

  describe('Call Management', () => {
    let lineId: string

    beforeEach(async () => {
      const { addLine } = useMultiLine()
      lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line'
      })
    })

    it('should associate call with line', () => {
      const { associateCall, getLineCalls } = useMultiLine()

      const mockCall = { id: 'call-1' } as CallSession
      associateCall('call-1', lineId, mockCall)

      const calls = getLineCalls(lineId)
      expect(calls).toHaveLength(1)
      expect(calls[0].id).toBe('call-1')
    })

    it('should get line for call', () => {
      const { associateCall, getLineForCall } = useMultiLine()

      const mockCall = { id: 'call-1' } as CallSession
      associateCall('call-1', lineId, mockCall)

      const line = getLineForCall('call-1')
      expect(line?.id).toBe(lineId)
    })

    it('should disassociate call from line', () => {
      const { associateCall, disassociateCall, getLineCalls } = useMultiLine()

      const mockCall = { id: 'call-1' } as CallSession
      associateCall('call-1', lineId, mockCall)
      disassociateCall('call-1')

      const calls = getLineCalls(lineId)
      expect(calls).toHaveLength(0)
    })

    it('should update reactive state after call association', async () => {
      const { associateCall, stats } = useMultiLine()

      const mockCall = { id: 'call-1' } as CallSession
      associateCall('call-1', lineId, mockCall)
      await nextTick()

      expect(stats.value.totalCalls).toBe(1)
      expect(stats.value.callsPerLine[lineId]).toBe(1)
    })

    it('should update reactive state after call disassociation', async () => {
      const { associateCall, disassociateCall, stats } = useMultiLine()

      const mockCall = { id: 'call-1' } as CallSession
      associateCall('call-1', lineId, mockCall)
      await nextTick()

      disassociateCall('call-1')
      await nextTick()

      expect(stats.value.totalCalls).toBe(0)
    })

    it('should handle multiple calls on same line', () => {
      const { associateCall, getLineCalls } = useMultiLine()

      const call1 = { id: 'call-1' } as CallSession
      const call2 = { id: 'call-2' } as CallSession

      associateCall('call-1', lineId, call1)
      associateCall('call-2', lineId, call2)

      const calls = getLineCalls(lineId)
      expect(calls).toHaveLength(2)
    })

    it('should return empty array for line with no calls', () => {
      const { getLineCalls } = useMultiLine()

      const calls = getLineCalls(lineId)
      expect(calls).toHaveLength(0)
    })

    it('should return undefined for non-existent call', () => {
      const { getLineForCall } = useMultiLine()

      const line = getLineForCall('non-existent-call')
      expect(line).toBeUndefined()
    })
  })

  describe('Line Status', () => {
    let lineId: string

    beforeEach(async () => {
      const { addLine } = useMultiLine()
      lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
        autoRegister: false
      })
    })

    it('should get line status', () => {
      const { getLineStatus } = useMultiLine()

      const status = getLineStatus(lineId)
      expect(status).toBe('unregistered')
    })

    it('should check if line is registered', async () => {
      const { registerLine, isLineRegistered } = useMultiLine()

      expect(isLineRegistered(lineId)).toBe(false)

      await registerLine(lineId)
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(isLineRegistered(lineId)).toBe(true)
    })

    it('should get registered lines', async () => {
      const { addLine, registerLine, getRegisteredLines } = useMultiLine()

      await addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
        autoRegister: false
      })

      await registerLine(lineId)
      await new Promise(resolve => setTimeout(resolve, 150))

      const registered = getRegisteredLines()
      expect(registered).toHaveLength(1)
      expect(registered[0].id).toBe(lineId)
    })

    it('should return undefined for non-existent line status', () => {
      const { getLineStatus } = useMultiLine()

      const status = getLineStatus('invalid-line')
      expect(status).toBeUndefined()
    })

    it('should return false for non-existent line registration check', () => {
      const { isLineRegistered } = useMultiLine()

      expect(isLineRegistered('invalid-line')).toBe(false)
    })

    it('should return empty array when no lines registered', () => {
      const { getRegisteredLines } = useMultiLine()

      const registered = getRegisteredLines()
      expect(registered).toHaveLength(0)
    })
  })

  describe('Line Retrieval', () => {
    let lineId: string

    beforeEach(async () => {
      const { addLine } = useMultiLine()
      lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line'
      })
    })

    it('should get line by ID', () => {
      const { getLine } = useMultiLine()

      const line = getLine(lineId)
      expect(line).toBeDefined()
      expect(line!.id).toBe(lineId)
      expect(line!.uri).toBe('sip:user@example.com')
    })

    it('should return undefined for non-existent line', () => {
      const { getLine } = useMultiLine()

      const line = getLine('invalid-line')
      expect(line).toBeUndefined()
    })

    it('should get line with complete data', () => {
      const { getLine } = useMultiLine()

      const line = getLine(lineId)
      expect(line).toMatchObject({
        id: lineId,
        uri: 'sip:user@example.com',
        displayName: 'Test Line',
        registrationState: expect.any(String),
        calls: expect.any(Array),
        config: expect.any(Object),
        priority: expect.any(Number)
      })
    })
  })

  describe('Reactive State Management', () => {
    it('should update lines array reactively', async () => {
      const { addLine, lines } = useMultiLine()

      expect(lines.value).toHaveLength(0)

      await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line'
      })
      await nextTick()

      expect(lines.value).toHaveLength(1)
    })

    it('should update active line reactively', async () => {
      const { addLine, switchLine, activeLine } = useMultiLine()

      const line1 = await addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1'
      })
      const line2 = await addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2'
      })
      await nextTick()

      expect(activeLine.value?.id).toBe(line1)

      await switchLine(line2)
      await nextTick()

      expect(activeLine.value?.id).toBe(line2)
    })

    it('should update stats reactively', async () => {
      const { addLine, registerLine, stats } = useMultiLine()

      expect(stats.value.totalLines).toBe(0)
      expect(stats.value.registeredLines).toBe(0)

      const lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
        autoRegister: false
      })
      await nextTick()

      expect(stats.value.totalLines).toBe(1)
      expect(stats.value.registeredLines).toBe(0)

      await registerLine(lineId)
      await new Promise(resolve => setTimeout(resolve, 150))
      await nextTick()

      expect(stats.value.registeredLines).toBe(1)
    })

    it('should maintain reactivity across multiple operations', async () => {
      const { addLine, removeLine, lines, stats } = useMultiLine()

      const line1 = await addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1'
      })
      await addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2'
      })
      await nextTick()

      expect(lines.value).toHaveLength(2)
      expect(stats.value.totalLines).toBe(2)

      await removeLine(line1)
      await nextTick()

      expect(lines.value).toHaveLength(1)
      expect(stats.value.totalLines).toBe(1)
    })
  })

  describe('Manager Access', () => {
    it('should expose manager instance', () => {
      const { manager } = useMultiLine()

      expect(manager).toBeDefined()
      expect(manager.addLine).toBeDefined()
      expect(manager.removeLine).toBeDefined()
      expect(manager.getConfig).toBeDefined()
    })

    it('should allow direct manager manipulation', async () => {
      const { manager, lines } = useMultiLine()

      await manager.addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line'
      })
      await nextTick()

      expect(lines.value).toHaveLength(1)
    })

    it('should sync state when using manager directly', async () => {
      const { manager, lines, stats } = useMultiLine()

      await manager.addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line'
      })
      await nextTick()

      expect(lines.value).toHaveLength(1)
      expect(stats.value.totalLines).toBe(1)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid line additions', async () => {
      const { addLine, lines } = useMultiLine()

      const promises = [
        addLine({
          uri: 'sip:user1@example.com',
          password: 'secret',
          displayName: 'Line 1'
        }),
        addLine({
          uri: 'sip:user2@example.com',
          password: 'secret',
          displayName: 'Line 2'
        }),
        addLine({
          uri: 'sip:user3@example.com',
          password: 'secret',
          displayName: 'Line 3'
        })
      ]

      await Promise.all(promises)
      await nextTick()

      expect(lines.value).toHaveLength(3)
    })

    it('should handle call operations during line removal', async () => {
      const { addLine, removeLine, associateCall, disassociateCall } = useMultiLine()

      const lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line'
      })

      const mockCall = { id: 'call-1' } as CallSession
      associateCall('call-1', lineId, mockCall)

      // Should fail to remove line with active call
      await expect(removeLine(lineId)).rejects.toThrow()

      // Should succeed after disassociating call
      disassociateCall('call-1')
      await expect(removeLine(lineId)).resolves.not.toThrow()
    })

    it('should handle state updates during async operations', async () => {
      const { addLine, registerLine, getLineStatus, isRegistering } = useMultiLine()

      const lineId = await addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
        autoRegister: false
      })

      const promise = registerLine(lineId)
      await nextTick()

      expect(isRegistering.value).toBe(true)
      expect(getLineStatus(lineId)).toBe('registering')

      await promise
      await new Promise(resolve => setTimeout(resolve, 150))
      await nextTick()

      expect(isRegistering.value).toBe(false)
      expect(getLineStatus(lineId)).toBe('registered')
    })
  })
})
