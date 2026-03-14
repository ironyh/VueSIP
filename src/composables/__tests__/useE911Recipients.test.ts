import { describe, it, expect, beforeEach } from 'vitest'
import { useE911Recipients } from '../useE911Recipients'
import type { E911NotificationRecipient } from '@/types/e911.types'

describe('useE911Recipients', () => {
  let subject: ReturnType<typeof useE911Recipients>

  const validRecipient: Omit<E911NotificationRecipient, 'id'> = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+15551234567',
    webhookUrl: 'https://example.com/webhook',
  }

  beforeEach(() => {
    subject = useE911Recipients()
  })

  describe('addRecipient', () => {
    it('should add a recipient with generated id', () => {
      const recipient = subject.addRecipient(validRecipient)

      expect(recipient.id).toBeDefined()
      // ID format: timestamp-randomstring
      expect(recipient.id).toMatch(/^\d+-[a-z0-9]+$/)
      expect(recipient.name).toBe('John Doe')
      expect(recipient.email).toBe('john@example.com')
      expect(recipient.phone).toBe('+15551234567')
      expect(recipient.webhookUrl).toBe('https://example.com/webhook')
    })

    it('should sanitize malicious input', () => {
      const recipient = subject.addRecipient({
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        phone: '+15551234567',
        webhookUrl: 'javascript:alert(1)',
      })

      expect(recipient.name).not.toContain('<script>')
      // javascript: URLs are rejected (return undefined)
      expect(recipient.webhookUrl).toBeUndefined()
    })

    it('should add recipient to the list', () => {
      expect(subject.recipients.value).toHaveLength(0)

      subject.addRecipient(validRecipient)

      expect(subject.recipients.value).toHaveLength(1)
    })

    it('should allow multiple recipients', () => {
      subject.addRecipient(validRecipient)
      subject.addRecipient({ ...validRecipient, email: 'jane@example.com', name: 'Jane Doe' })

      expect(subject.recipients.value).toHaveLength(2)
    })
  })

  describe('updateRecipient', () => {
    it('should update existing recipient', () => {
      const added = subject.addRecipient(validRecipient)

      const success = subject.updateRecipient(added.id, { name: 'Jane Doe' })

      expect(success).toBe(true)
      expect(subject.recipients.value[0].name).toBe('Jane Doe')
    })

    it('should return false for non-existent recipient', () => {
      const success = subject.updateRecipient('non-existent-id', { name: 'Test' })

      expect(success).toBe(false)
    })

    it('should sanitize updated fields', () => {
      const added = subject.addRecipient(validRecipient)

      subject.updateRecipient(added.id, {
        name: '<img src=x onerror=alert(1)>',
        webhookUrl: 'javascript:void(0)',
      })

      expect(subject.recipients.value[0].name).not.toContain('<img')
      // javascript: URLs are rejected
      expect(subject.recipients.value[0].webhookUrl).toBeUndefined()
    })
  })

  describe('removeRecipient', () => {
    it('should remove existing recipient', () => {
      const added = subject.addRecipient(validRecipient)
      expect(subject.recipients.value).toHaveLength(1)

      const success = subject.removeRecipient(added.id)

      expect(success).toBe(true)
      expect(subject.recipients.value).toHaveLength(0)
    })

    it('should return false for non-existent recipient', () => {
      const success = subject.removeRecipient('non-existent-id')

      expect(success).toBe(false)
    })
  })

  describe('setRecipients', () => {
    it('should replace all recipients', () => {
      subject.addRecipient(validRecipient)
      subject.addRecipient({ ...validRecipient, email: 'jane@example.com' })

      const newRecipients: E911NotificationRecipient[] = [
        { id: 'e911-new-1', name: 'New 1', email: 'new1@test.com', phone: '+15550000001' },
        { id: 'e911-new-2', name: 'New 2', email: 'new2@test.com', phone: '+15550000002' },
      ]

      subject.setRecipients(newRecipients)

      expect(subject.recipients.value).toHaveLength(2)
      expect(subject.recipients.value[0].name).toBe('New 1')
      expect(subject.recipients.value[1].name).toBe('New 2')
    })

    it('should handle empty array', () => {
      subject.addRecipient(validRecipient)

      subject.setRecipients([])

      expect(subject.recipients.value).toHaveLength(0)
    })
  })

  describe('with initial recipients', () => {
    it('should initialize with provided recipients', () => {
      const initial: E911NotificationRecipient[] = [
        { id: 'e911-init-1', name: 'Initial 1', email: 'init1@test.com', phone: '+15550000001' },
      ]

      const subjectWithInitial = useE911Recipients(initial)

      expect(subjectWithInitial.recipients.value).toHaveLength(1)
      expect(subjectWithInitial.recipients.value[0].name).toBe('Initial 1')
    })
  })
})
