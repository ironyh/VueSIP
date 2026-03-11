/**
 * useE911Recipients composable tests
 */

import { describe, it, expect } from 'vitest'
import { useE911Recipients } from '@/composables/useE911Recipients'
import type { E911NotificationRecipient } from '@/types/e911.types'

describe('useE911Recipients', () => {
  describe('initialization', () => {
    it('should initialize with empty recipients when no initial data provided', () => {
      const { recipients } = useE911Recipients()
      expect(recipients.value).toEqual([])
    })

    it('should initialize with provided recipients', () => {
      const initial: E911NotificationRecipient[] = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', phone: '+1234567890' },
      ]
      const { recipients } = useE911Recipients(initial)
      expect(recipients.value).toHaveLength(2)
      expect(recipients.value[0].name).toBe('John')
      expect(recipients.value[1].name).toBe('Jane')
    })
  })

  describe('addRecipient', () => {
    it('should add a new recipient with generated id', () => {
      const { recipients, addRecipient } = useE911Recipients()

      const newRecipient = addRecipient({
        name: 'Test User',
        email: 'test@example.com',
      })

      expect(recipients.value).toHaveLength(1)
      expect(newRecipient.id).toBeDefined()
      expect(newRecipient.name).toBe('Test User')
      expect(newRecipient.email).toBe('test@example.com')
    })

    it('should sanitize recipient data on add', () => {
      const { addRecipient } = useE911Recipients()

      const newRecipient = addRecipient({
        name: '<script>alert("xss")</script>Test',
        email: 'test@example.com',
        phone: '+1234567890',
        webhookUrl: 'https://example.com/hook',
      })

      // Name should be sanitized (script tags removed)
      expect(newRecipient.name).not.toContain('<script>')
      expect(newRecipient.email).toBe('test@example.com')
      expect(newRecipient.phone).toBe('+1234567890')
    })

    it('should return the newly created recipient', () => {
      const { addRecipient } = useE911Recipients()

      const result = addRecipient({
        name: 'New User',
        email: 'new@example.com',
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('New User')
    })
  })

  describe('updateRecipient', () => {
    it('should update an existing recipient', () => {
      const { recipients, addRecipient, updateRecipient } = useE911Recipients()

      const added = addRecipient({ name: 'Original', email: 'original@example.com' })

      const success = updateRecipient(added.id, { name: 'Updated' })

      expect(success).toBe(true)
      const updated = recipients.value.find((r) => r.id === added.id)
      expect(updated?.name).toBe('Updated')
      expect(updated?.email).toBe('original@example.com')
    })

    it('should return false for non-existent recipient', () => {
      const { updateRecipient } = useE911Recipients()

      const success = updateRecipient('non-existent-id', { name: 'Test' })

      expect(success).toBe(false)
    })

    it('should sanitize updated fields', () => {
      const { recipients, addRecipient, updateRecipient } = useE911Recipients()

      const added = addRecipient({ name: 'Original' })

      updateRecipient(added.id, { name: '<script>evil()</script>Updated' })

      const updated = recipients.value.find((r) => r.id === added.id)
      expect(updated?.name).not.toContain('<script>')
    })
  })

  describe('removeRecipient', () => {
    it('should remove an existing recipient', () => {
      const { recipients, addRecipient, removeRecipient } = useE911Recipients()

      const added = addRecipient({ name: 'To Remove' })
      expect(recipients.value).toHaveLength(1)

      const success = removeRecipient(added.id)

      expect(success).toBe(true)
      expect(recipients.value).toHaveLength(0)
    })

    it('should return false for non-existent recipient', () => {
      const { removeRecipient } = useE911Recipients()

      const success = removeRecipient('non-existent-id')

      expect(success).toBe(false)
    })
  })

  describe('setRecipients', () => {
    it('should replace all recipients', () => {
      const { recipients, addRecipient, setRecipients } = useE911Recipients()

      addRecipient({ name: 'Existing' })
      expect(recipients.value).toHaveLength(1)

      const newRecipients: E911NotificationRecipient[] = [
        { id: 'new-1', name: 'New 1', email: 'new1@example.com' },
        { id: 'new-2', name: 'New 2', phone: '+1111111111' },
      ]

      setRecipients(newRecipients)

      expect(recipients.value).toHaveLength(2)
      expect(recipients.value[0].name).toBe('New 1')
      expect(recipients.value[1].name).toBe('New 2')
    })

    it('should allow clearing all recipients', () => {
      const { recipients, addRecipient, setRecipients } = useE911Recipients()

      addRecipient({ name: 'Test' })
      expect(recipients.value).toHaveLength(1)

      setRecipients([])

      expect(recipients.value).toHaveLength(0)
    })
  })
})
