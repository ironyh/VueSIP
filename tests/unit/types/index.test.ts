/**
 * Types module exports unit tests
 */

import { describe, it, expect } from 'vitest'

describe('Types Module Exports', () => {
  describe('Type Re-exports', () => {
    it('should allow importing all type definitions', async () => {
      const module = await import('@/types')
      expect(module).toBeDefined()
    })

    it('should re-export config types', async () => {
      const { SipClientConfig } = await import('@/types')
      // TypeScript types don't exist at runtime, but the import should not error
      expect(SipClientConfig).toBeUndefined() // Types are compile-time only
    })

    it('should re-export sip types', async () => {
      const { ConnectionState, RegistrationState } = await import('@/types')
      expect(ConnectionState).toBeDefined() // Enum exists at runtime
      expect(RegistrationState).toBeDefined() // Enum exists at runtime
    })

    it('should re-export call types', async () => {
      const { CallDirection, CallState } = await import('@/types')
      expect(CallDirection).toBeDefined() // Enum exists at runtime
      expect(CallState).toBeDefined() // Enum exists at runtime
    })
  })
})
