/**
 * MultiLineManager Unit Tests
 *
 * Comprehensive test suite for multi-line management functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach as _afterEach } from 'vitest'
import { MultiLineManager } from '../../../src/core/MultiLineManager'
import type {
  LineConfig,
  LineState,
  MultiLineConfig as _MultiLineConfig,
} from '../../../src/types/multiline.types'
import type { CallSession } from '../../../src/types/session.types'

describe('MultiLineManager', () => {
  let manager: MultiLineManager

  beforeEach(() => {
    manager = new MultiLineManager()
  })

  afterEach(async () => {
    await manager.destroy()
  })

  describe('Initialization', () => {
    it('should create manager with default config', () => {
      const config = manager.getConfig()
      expect(config.maxLines).toBe(5)
      expect(config.routingStrategy).toBe('priority')
      expect(config.persistLines).toBe(true)
      expect(config.autoReconnect).toBe(true)
    })

    it('should create manager with custom config', () => {
      const customManager = new MultiLineManager({
        maxLines: 10,
        routingStrategy: 'round_robin',
        persistLines: false,
      })
      const config = customManager.getConfig()
      expect(config.maxLines).toBe(10)
      expect(config.routingStrategy).toBe('round_robin')
      expect(config.persistLines).toBe(false)
    })

    it('should initialize with empty lines', () => {
      expect(manager.getAllLines()).toHaveLength(0)
    })

    it('should have no active line initially', () => {
      expect(manager.getActiveLine()).toBeNull()
    })
  })

  describe('Line Management - Add Line', () => {
    const validConfig: LineConfig = {
      uri: 'sip:user@example.com',
      password: 'secret',
      displayName: 'Test Line',
      priority: 1,
    }

    it('should add a new line', async () => {
      const lineId = await manager.addLine(validConfig)
      expect(lineId).toBeDefined()
      expect(lineId).toMatch(/^line-\d+-\d+$/)

      const line = manager.getLine(lineId)
      expect(line).toBeDefined()
      expect(line!.uri).toBe(validConfig.uri)
      expect(line!.displayName).toBe(validConfig.displayName)
      expect(line!.priority).toBe(1)
    })

    it('should set first line as active', async () => {
      const lineId = await manager.addLine(validConfig)
      expect(manager.getActiveLine()?.id).toBe(lineId)
    })

    it('should auto-register line when configured', async () => {
      const config: LineConfig = {
        ...validConfig,
        autoRegister: true,
      }
      const lineId = await manager.addLine(config)
      const line = manager.getLine(lineId)

      // Wait for registration
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(line!.registrationState).toBe('registered')
    })

    it('should not auto-register when not configured', async () => {
      const config: LineConfig = {
        ...validConfig,
        autoRegister: false,
      }
      const lineId = await manager.addLine(config)
      const line = manager.getLine(lineId)
      expect(line!.registrationState).toBe('unregistered')
    })

    it('should emit line:added event', async () => {
      const handler = vi.fn()
      manager.on('line:added', handler)

      const lineId = await manager.addLine(validConfig)

      expect(handler).toHaveBeenCalledWith({
        lineId,
        line: expect.objectContaining({ id: lineId }),
      })
    })

    it('should reject when URI is missing', async () => {
      const invalidConfig = {
        password: 'secret',
        displayName: 'Test',
      } as LineConfig

      await expect(manager.addLine(invalidConfig)).rejects.toThrow(
        'Line URI and password are required'
      )
    })

    it('should reject when password is missing', async () => {
      const invalidConfig = {
        uri: 'sip:user@example.com',
        displayName: 'Test',
      } as LineConfig

      await expect(manager.addLine(invalidConfig)).rejects.toThrow(
        'Line URI and password are required'
      )
    })

    it('should reject duplicate URI', async () => {
      await manager.addLine(validConfig)
      await expect(manager.addLine(validConfig)).rejects.toThrow(
        'Line with URI sip:user@example.com already exists'
      )
    })

    it('should reject when max lines reached', async () => {
      const customManager = new MultiLineManager({ maxLines: 2 })

      await customManager.addLine(validConfig)
      await customManager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
      })

      await expect(
        customManager.addLine({
          uri: 'sip:user3@example.com',
          password: 'secret',
          displayName: 'Line 3',
        })
      ).rejects.toThrow('Maximum number of lines (2) reached')
    })

    it('should assign default priority when not specified', async () => {
      const config: LineConfig = {
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test',
      }
      const lineId = await manager.addLine(config)
      const line = manager.getLine(lineId)
      expect(line!.priority).toBe(100)
    })

    it('should handle multiple lines', async () => {
      const line1 = await manager.addLine(validConfig)
      const line2 = await manager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
      })

      expect(manager.getAllLines()).toHaveLength(2)
      expect(manager.getLine(line1)).toBeDefined()
      expect(manager.getLine(line2)).toBeDefined()
    })
  })

  describe('Line Management - Remove Line', () => {
    let lineId: string

    beforeEach(async () => {
      lineId = await manager.addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
      })
    })

    it('should remove a line', async () => {
      await manager.removeLine(lineId)
      expect(manager.getLine(lineId)).toBeUndefined()
      expect(manager.getAllLines()).toHaveLength(0)
    })

    it('should emit line:removed event', async () => {
      const handler = vi.fn()
      manager.on('line:removed', handler)

      await manager.removeLine(lineId)

      expect(handler).toHaveBeenCalledWith({ lineId })
    })

    it('should reject removing non-existent line', async () => {
      await expect(manager.removeLine('invalid-line')).rejects.toThrow(
        'Line invalid-line not found'
      )
    })

    it('should reject removing line with active calls', async () => {
      const mockCall = { id: 'call-1' } as CallSession
      manager.associateCall('call-1', lineId, mockCall)

      await expect(manager.removeLine(lineId)).rejects.toThrow(
        `Cannot remove line ${lineId} with 1 active call(s)`
      )
    })

    it('should unregister line before removal', async () => {
      await manager.registerLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 150))

      await manager.removeLine(lineId)
      expect(manager.getLine(lineId)).toBeUndefined()
    })

    it('should switch active line when removing active line', async () => {
      const line2 = await manager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
      })

      await manager.setActiveLine(lineId)
      expect(manager.getActiveLine()?.id).toBe(lineId)

      await manager.removeLine(lineId)
      expect(manager.getActiveLine()?.id).toBe(line2)
    })

    it('should set active line to null when removing last line', async () => {
      await manager.removeLine(lineId)
      expect(manager.getActiveLine()).toBeNull()
    })
  })

  describe('Line Registration', () => {
    let lineId: string

    beforeEach(async () => {
      lineId = await manager.addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
        autoRegister: false,
      })
    })

    it('should register a line', async () => {
      await manager.registerLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 150))

      const line = manager.getLine(lineId)
      expect(line!.registrationState).toBe('registered')
      expect(line!.registeredAt).toBeDefined()
    })

    it('should emit registration events', async () => {
      const handler = vi.fn()
      manager.on('line:registration', handler)

      manager.registerLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          lineId,
          state: 'registering',
        })
      )
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          lineId,
          state: 'registered',
        })
      )
    })

    it('should handle registration failure', async () => {
      const invalidLineId = await manager.addLine({
        uri: 'sip:invalid@example.com',
        password: 'secret',
        displayName: 'Invalid Line',
        autoRegister: false,
      })

      await expect(manager.registerLine(invalidLineId)).rejects.toThrow('Invalid credentials')

      const line = manager.getLine(invalidLineId)
      expect(line!.registrationState).toBe('error')
      expect(line!.lastError).toBe('Invalid credentials')
    })

    it('should not re-register already registered line', async () => {
      await manager.registerLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 150))

      const handler = vi.fn()
      manager.on('line:registration', handler)

      await manager.registerLine(lineId)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should reject registering non-existent line', async () => {
      await expect(manager.registerLine('invalid-line')).rejects.toThrow(
        'Line invalid-line not found'
      )
    })

    it('should update registration timestamp', async () => {
      await manager.registerLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 150))

      const line = manager.getLine(lineId)
      expect(line!.registeredAt).toBeGreaterThan(Date.now() - 1000)
    })

    it('should clear error on successful registration', async () => {
      const line = manager.getLine(lineId)!
      line.lastError = 'Previous error'

      await manager.registerLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(line.lastError).toBeUndefined()
    })
  })

  describe('Line Unregistration', () => {
    let lineId: string

    beforeEach(async () => {
      lineId = await manager.addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
        autoRegister: true,
      })
      await new Promise((resolve) => setTimeout(resolve, 150))
    })

    it('should unregister a line', async () => {
      await manager.unregisterLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 100))

      const line = manager.getLine(lineId)
      expect(line!.registrationState).toBe('unregistered')
    })

    it('should emit unregistration event', async () => {
      const handler = vi.fn()
      manager.on('line:registration', handler)

      await manager.unregisterLine(lineId)

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          lineId,
          state: 'unregistered',
        })
      )
    })

    it('should not unregister already unregistered line', async () => {
      await manager.unregisterLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 100))

      const handler = vi.fn()
      manager.on('line:registration', handler)

      await manager.unregisterLine(lineId)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should reject unregistering non-existent line', async () => {
      await expect(manager.unregisterLine('invalid-line')).rejects.toThrow(
        'Line invalid-line not found'
      )
    })

    it('should clear registration timestamp', async () => {
      const line = manager.getLine(lineId)
      expect(line!.registeredAt).toBeDefined()

      await manager.unregisterLine(lineId)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(line!.registeredAt).toBeUndefined()
    })
  })

  describe('Active Line Management', () => {
    let line1: string
    let line2: string

    beforeEach(async () => {
      line1 = await manager.addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1',
      })
      line2 = await manager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
      })
    })

    it('should set active line', async () => {
      await manager.setActiveLine(line2)
      expect(manager.getActiveLine()?.id).toBe(line2)
    })

    it('should emit line:switched event', async () => {
      const handler = vi.fn()
      manager.on('line:switched', handler)

      await manager.setActiveLine(line2)

      expect(handler).toHaveBeenCalledWith({
        previousLineId: line1,
        newLineId: line2,
        timestamp: expect.any(Number),
      })
    })

    it('should not switch to already active line', async () => {
      const handler = vi.fn()
      manager.on('line:switched', handler)

      await manager.setActiveLine(line1)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should reject setting non-existent line as active', async () => {
      await expect(manager.setActiveLine('invalid-line')).rejects.toThrow(
        'Line invalid-line not found'
      )
    })

    it('should track previous line ID', async () => {
      await manager.setActiveLine(line2)

      const handler = vi.fn()
      manager.on('line:switched', handler)

      const line3 = await manager.addLine({
        uri: 'sip:user3@example.com',
        password: 'secret',
        displayName: 'Line 3',
      })
      await manager.setActiveLine(line3)

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          previousLineId: line2,
          newLineId: line3,
        })
      )
    })
  })

  describe('Call Association', () => {
    let lineId: string
    let mockCall: CallSession

    beforeEach(async () => {
      lineId = await manager.addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test Line',
      })
      mockCall = {
        id: 'call-1',
        direction: 'outgoing',
        state: 'initial',
        remoteIdentity: { uri: 'sip:remote@example.com' },
      } as CallSession
    })

    it('should associate call with line', () => {
      manager.associateCall('call-1', lineId, mockCall)

      const line = manager.getLine(lineId)
      expect(line!.calls).toHaveLength(1)
      expect(line!.calls[0].id).toBe('call-1')
    })

    it('should get line for call', () => {
      manager.associateCall('call-1', lineId, mockCall)

      const line = manager.getLineForCall('call-1')
      expect(line?.id).toBe(lineId)
    })

    it('should emit call:associated event', () => {
      const handler = vi.fn()
      manager.on('call:associated', handler)

      manager.associateCall('call-1', lineId, mockCall)

      expect(handler).toHaveBeenCalledWith({
        callId: 'call-1',
        lineId,
        call: mockCall,
      })
    })

    it('should disassociate call from line', () => {
      manager.associateCall('call-1', lineId, mockCall)
      manager.disassociateCall('call-1')

      const line = manager.getLine(lineId)
      expect(line!.calls).toHaveLength(0)
    })

    it('should emit call:disassociated event', () => {
      manager.associateCall('call-1', lineId, mockCall)

      const handler = vi.fn()
      manager.on('call:disassociated', handler)

      manager.disassociateCall('call-1')

      expect(handler).toHaveBeenCalledWith({
        callId: 'call-1',
        lineId,
      })
    })

    it('should handle multiple calls on same line', () => {
      const call2 = { id: 'call-2' } as CallSession

      manager.associateCall('call-1', lineId, mockCall)
      manager.associateCall('call-2', lineId, call2)

      const line = manager.getLine(lineId)
      expect(line!.calls).toHaveLength(2)
    })

    it('should reject associating call with non-existent line', () => {
      expect(() => {
        manager.associateCall('call-1', 'invalid-line', mockCall)
      }).toThrow('Line invalid-line not found')
    })

    it('should handle disassociating non-existent call gracefully', () => {
      expect(() => {
        manager.disassociateCall('non-existent-call')
      }).not.toThrow()
    })
  })

  describe('Line Transfer', () => {
    let line1: string
    let line2: string
    let mockCall: CallSession

    beforeEach(async () => {
      line1 = await manager.addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1',
        autoRegister: true,
      })
      line2 = await manager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
        autoRegister: true,
      })
      await new Promise((resolve) => setTimeout(resolve, 150))

      mockCall = {
        id: 'call-1',
        direction: 'outgoing',
        state: 'confirmed',
      } as CallSession

      manager.associateCall('call-1', line1, mockCall)
    })

    it('should transfer call between lines', async () => {
      await manager.transferCallBetweenLines({
        fromLineId: line1,
        toLineId: line2,
        callId: 'call-1',
      })

      const fromLine = manager.getLine(line1)
      const toLine = manager.getLine(line2)

      expect(fromLine!.calls).toHaveLength(0)
      expect(toLine!.calls).toHaveLength(1)
      expect(toLine!.calls[0].id).toBe('call-1')
    })

    it('should emit call:transferred event', async () => {
      const handler = vi.fn()
      manager.on('call:transferred', handler)

      await manager.transferCallBetweenLines({
        fromLineId: line1,
        toLineId: line2,
        callId: 'call-1',
        attended: true,
      })

      expect(handler).toHaveBeenCalledWith({
        callId: 'call-1',
        fromLineId: line1,
        toLineId: line2,
        attended: true,
      })
    })

    it('should reject transfer from non-existent line', async () => {
      await expect(
        manager.transferCallBetweenLines({
          fromLineId: 'invalid-line',
          toLineId: line2,
          callId: 'call-1',
        })
      ).rejects.toThrow('Source line invalid-line not found')
    })

    it('should reject transfer to non-existent line', async () => {
      await expect(
        manager.transferCallBetweenLines({
          fromLineId: line1,
          toLineId: 'invalid-line',
          callId: 'call-1',
        })
      ).rejects.toThrow('Target line invalid-line not found')
    })

    it('should reject transfer to unregistered line', async () => {
      await manager.unregisterLine(line2)

      await expect(
        manager.transferCallBetweenLines({
          fromLineId: line1,
          toLineId: line2,
          callId: 'call-1',
        })
      ).rejects.toThrow(`Target line ${line2} is not registered`)
    })

    it('should reject transfer of non-existent call', async () => {
      await expect(
        manager.transferCallBetweenLines({
          fromLineId: line1,
          toLineId: line2,
          callId: 'non-existent-call',
        })
      ).rejects.toThrow('Call non-existent-call not found on line')
    })
  })

  describe('Line Statistics', () => {
    beforeEach(async () => {
      await manager.addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1',
        autoRegister: true,
      })
      await manager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
        autoRegister: false,
      })
      await new Promise((resolve) => setTimeout(resolve, 150))
    })

    it('should return correct statistics', () => {
      const stats = manager.getStats()

      expect(stats.totalLines).toBe(2)
      expect(stats.registeredLines).toBe(1)
      expect(stats.totalCalls).toBe(0)
      expect(stats.activeLineId).toBeDefined()
    })

    it('should track calls per line', () => {
      const lines = manager.getAllLines()
      const call1 = { id: 'call-1' } as CallSession
      const call2 = { id: 'call-2' } as CallSession

      manager.associateCall('call-1', lines[0].id, call1)
      manager.associateCall('call-2', lines[0].id, call2)

      const stats = manager.getStats()
      expect(stats.totalCalls).toBe(2)
      expect(stats.callsPerLine[lines[0].id]).toBe(2)
      expect(stats.callsPerLine[lines[1].id]).toBe(0)
    })

    it('should update statistics after line removal', async () => {
      const lines = manager.getAllLines()
      await manager.removeLine(lines[0].id)

      const stats = manager.getStats()
      expect(stats.totalLines).toBe(1)
    })
  })

  describe('Line Routing', () => {
    beforeEach(async () => {
      await manager.addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1',
        priority: 1,
        autoRegister: true,
      })
      await manager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
        priority: 2,
        autoRegister: true,
      })
      await manager.addLine({
        uri: 'sip:user3@example.com',
        password: 'secret',
        displayName: 'Line 3',
        priority: 3,
        autoRegister: true,
      })
      await new Promise((resolve) => setTimeout(resolve, 150))
    })

    it('should select line by priority', () => {
      manager.updateConfig({ routingStrategy: 'priority' })
      const line = manager.selectLineForIncomingCall()

      expect(line?.priority).toBe(1)
    })

    it('should select line by least active', () => {
      manager.updateConfig({ routingStrategy: 'least_active' })

      const lines = manager.getAllLines()
      const call1 = { id: 'call-1' } as CallSession
      manager.associateCall('call-1', lines[0].id, call1)

      const selectedLine = manager.selectLineForIncomingCall()
      expect(selectedLine?.calls).toHaveLength(0)
    })

    it('should return null when no registered lines', async () => {
      const lines = manager.getAllLines()
      for (const line of lines) {
        await manager.unregisterLine(line.id)
      }

      const selectedLine = manager.selectLineForIncomingCall()
      expect(selectedLine).toBeNull()
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      manager.updateConfig({ maxLines: 10 })
      const config = manager.getConfig()
      expect(config.maxLines).toBe(10)
    })

    it('should emit config:updated event', () => {
      const handler = vi.fn()
      manager.on('config:updated', handler)

      manager.updateConfig({ routingStrategy: 'round_robin' })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          routingStrategy: 'round_robin',
        })
      )
    })

    it('should preserve existing config values', () => {
      manager.updateConfig({ maxLines: 10 })
      const config = manager.getConfig()

      expect(config.routingStrategy).toBe('priority')
      expect(config.maxLines).toBe(10)
    })
  })

  describe('Cleanup and Destruction', () => {
    it('should destroy manager and cleanup resources', async () => {
      await manager.addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test',
        autoRegister: true,
      })
      await new Promise((resolve) => setTimeout(resolve, 150))

      await manager.destroy()

      expect(manager.getAllLines()).toHaveLength(0)
      expect(manager.getActiveLine()).toBeNull()
    })

    it('should unregister all lines on destroy', async () => {
      const line1 = await manager.addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1',
        autoRegister: true,
      })
      await manager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
        autoRegister: true,
      })
      await new Promise((resolve) => setTimeout(resolve, 150))

      await manager.destroy()

      expect(manager.getLine(line1)).toBeUndefined()
    })

    it('should remove all event listeners on destroy', async () => {
      const handler = vi.fn()
      manager.on('line:added', handler)

      await manager.destroy()

      await manager.addLine({
        uri: 'sip:user@example.com',
        password: 'secret',
        displayName: 'Test',
      })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Line Query Methods', () => {
    beforeEach(async () => {
      await manager.addLine({
        uri: 'sip:user1@example.com',
        password: 'secret',
        displayName: 'Line 1',
        autoRegister: true,
      })
      await manager.addLine({
        uri: 'sip:user2@example.com',
        password: 'secret',
        displayName: 'Line 2',
        autoRegister: false,
      })
      await new Promise((resolve) => setTimeout(resolve, 150))
    })

    it('should get lines by state', () => {
      const registered = manager.getLinesByState('registered' as LineState)
      const unregistered = manager.getLinesByState('unregistered' as LineState)

      expect(registered).toHaveLength(1)
      expect(unregistered).toHaveLength(1)
    })

    it('should return empty array for state with no lines', () => {
      const error = manager.getLinesByState('error' as LineState)
      expect(error).toHaveLength(0)
    })
  })
})
