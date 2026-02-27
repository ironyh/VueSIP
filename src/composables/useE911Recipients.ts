/**
 * Internal E911 notification recipient state and CRUD composable.
 * Used by useSipE911; not part of the public API.
 *
 * @internal
 */

import { ref, type Ref } from 'vue'
import type { E911NotificationRecipient } from '@/types/e911.types'
import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  generateE911Id,
} from '@/utils/e911'

export interface UseE911RecipientsReturn {
  recipients: Ref<E911NotificationRecipient[]>
  addRecipient: (recipientData: Omit<E911NotificationRecipient, 'id'>) => E911NotificationRecipient
  updateRecipient: (recipientId: string, updates: Partial<E911NotificationRecipient>) => boolean
  removeRecipient: (recipientId: string) => boolean
  /** Sync recipients from outside (e.g. config load); used by useSipE911 */
  setRecipients: (recs: E911NotificationRecipient[]) => void
}

/**
 * Recipient state and CRUD. No logging; caller (useSipE911) is responsible for compliance logs.
 */
export function useE911Recipients(
  initial: E911NotificationRecipient[] = []
): UseE911RecipientsReturn {
  const recipients = ref<E911NotificationRecipient[]>([...initial])

  function addRecipient(
    recipientData: Omit<E911NotificationRecipient, 'id'>
  ): E911NotificationRecipient {
    const recipient: E911NotificationRecipient = {
      ...recipientData,
      id: generateE911Id(),
      name: sanitizeInput(recipientData.name),
      email: sanitizeEmail(recipientData.email),
      phone: sanitizePhone(recipientData.phone),
      webhookUrl: sanitizeUrl(recipientData.webhookUrl),
    }
    recipients.value.push(recipient)
    return recipient
  }

  function updateRecipient(
    recipientId: string,
    updates: Partial<E911NotificationRecipient>
  ): boolean {
    const index = recipients.value.findIndex((r) => r.id === recipientId)
    if (index === -1) return false

    const existing = recipients.value[index]
    if (!existing) return false

    const sanitized: Partial<E911NotificationRecipient> = { ...updates }
    if (updates.name !== undefined) sanitized.name = sanitizeInput(updates.name)
    if (updates.email !== undefined) sanitized.email = sanitizeEmail(updates.email)
    if (updates.phone !== undefined) sanitized.phone = sanitizePhone(updates.phone)
    if (updates.webhookUrl !== undefined) sanitized.webhookUrl = sanitizeUrl(updates.webhookUrl)

    recipients.value[index] = { ...existing, ...sanitized } as E911NotificationRecipient
    return true
  }

  function removeRecipient(recipientId: string): boolean {
    const index = recipients.value.findIndex((r) => r.id === recipientId)
    if (index === -1) return false
    recipients.value.splice(index, 1)
    return true
  }

  function setRecipients(recs: E911NotificationRecipient[]): void {
    recipients.value = [...recs]
  }

  return {
    recipients,
    addRecipient,
    updateRecipient,
    removeRecipient,
    setRecipients,
  }
}
