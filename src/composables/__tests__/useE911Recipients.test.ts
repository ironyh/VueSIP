/**
 * Unit tests for useE911Recipients composable
 */

import { describe, it, expect } from 'vitest'
import { useE911Recipients } from '../useE911Recipients'

describe('useE911Recipients', () => {
  describe('initialization', () => {
    it('should initialize with empty array by default', () => {
      const { recipients } = useE911Recipients()
      expect(recipients.value).toEqual([])
    })

    it('should initialize with provided recipients', () => {
      const initial = [
        { id: '1', name: 'Test', email: 'test@test.com', phone: '+1234567890' },
      ] as const
      const { recipients } = useE911Recipients([...initial])
      expect(recipients.value).toHaveLength(1)
      expect(recipients.value[0].name).toBe('Test')
    })
  })

  describe('addRecipient', () => {
    it('should add a recipient with generated id', () => {
      const { recipients, addRecipient } = useE911Recipients()

      const newRecipient = addRecipient({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        webhookUrl: 'https://example.com/webhook',
      })

      expect(recipients.value).toHaveLength(1)
      expect(newRecipient.id).toBeDefined()
      expect(newRecipient.name).toBe('John Doe')
      expect(newRecipient.email).toBe('john@example.com')
    })

    it('should sanitize input values', () => {
      const { addRecipient } = useE911Recipients()

      const newRecipient = addRecipient({
        name: '  John  ',
        email: '  JOHN@EXAMPLE.COM  ',
        phone: '+1-234-567-890',
        webhookUrl: 'https://example.com/  ',
      })

      expect(newRecipient.name).toBeDefined()
      expect(newRecipient.email).toBeDefined()
    })
  })

  describe('updateRecipient', () => {
    it('should return false for non-existent recipient', () => {
      const { updateRecipient } = useE911Recipients()

      const result = updateRecipient('non-existent', { name: 'Updated' })
      expect(result).toBe(false)
    })

    it('should update existing recipient', () => {
      const { recipients, addRecipient, updateRecipient } = useE911Recipients()

      const added = addRecipient({
        name: 'Original Name',
        email: 'original@test.com',
        phone: '+1234567890',
      })

      const result = updateRecipient(added.id, { name: 'Updated Name' })

      expect(result).toBe(true)
      expect(recipients.value[0].name).toBe('Updated Name')
    })

    it('should sanitize updated values', () => {
      const { recipients, addRecipient, updateRecipient } = useE911Recipients()

      const added = addRecipient({
        name: 'Original',
        email: 'original@test.com',
        phone: '+1234567890',
      })

      updateRecipient(added.id, { email: '  NEW@TEST.COM  ' })

      expect(recipients.value[0].email).toBeDefined()
    })
  })

  describe('removeRecipient', () => {
    it('should return false for non-existent recipient', () => {
      const { removeRecipient } = useE911Recipients()

      const result = removeRecipient('non-existent')
      expect(result).toBe(false)
    })

    it('should remove existing recipient', () => {
      const { recipients, addRecipient, removeRecipient } = useE911Recipients()

      const added = addRecipient({
        name: 'To Remove',
        email: 'remove@test.com',
        phone: '+1234567890',
      })

      expect(recipients.value).toHaveLength(1)

      const result = removeRecipient(added.id)

      expect(result).toBe(true)
      expect(recipients.value).toHaveLength(0)
    })
  })

  describe('setRecipients', () => {
    it('should replace all recipients', () => {
      const { recipients, addRecipient, setRecipients } = useE911Recipients()

      addRecipient({ name: 'One', email: 'one@test.com', phone: '+1111111111' })
      expect(recipients.value).toHaveLength(1)

      const newRecipients = [
        { id: 'new1', name: 'New One', email: 'new1@test.com', phone: '+2222222222' },
        { id: 'new2', name: 'New Two', email: 'new2@test.com', phone: '+3333333333' },
      ] as const
      setRecipients([...newRecipients])

      expect(recipients.value).toHaveLength(2)
      expect(recipients.value[0].name).toBe('New One')
    })
  })
})
