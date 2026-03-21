/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useAmiMWI } from '../useAmiMWI'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('useAmiMWI', () => {
  // Mock AMI client
  const mockAmiClient = {
    sendAction: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('initialization', () => {
    it('should initialize with correct default state when client is null', () => {
      const amiClientRef = ref<typeof mockAmiClient | null>(null)
      const { mailboxes, isLoading, error, mailboxList, mailboxesWithMessages, totalNewMessages } =
        useAmiMWI(amiClientRef)

      expect(mailboxes.value).toBeInstanceOf(Map)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(mailboxList.value).toEqual([])
      expect(mailboxesWithMessages.value).toEqual([])
      expect(totalNewMessages.value).toBe(0)
    })

    it('should initialize with correct default state when client is provided', () => {
      const amiClientRef = ref(mockAmiClient)
      const { mailboxes, isLoading, error, indicatorOnCount } = useAmiMWI(amiClientRef)

      expect(mailboxes.value).toBeInstanceOf(Map)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(indicatorOnCount.value).toBe(0)
    })

    it('should accept custom options', () => {
      const amiClientRef = ref(mockAmiClient)
      const onMWIChange = vi.fn()
      const { error } = useAmiMWI(amiClientRef, {
        defaultContext: 'custom-context',
        useEvents: false,
        onMWIChange,
      })

      expect(error.value).toBe(null)
    })
  })

  describe('getMailboxStatus', () => {
    it('should throw error when AMI client is not connected', async () => {
      const amiClientRef = ref<typeof mockAmiClient | null>(null)
      const { getMailboxStatus } = useAmiMWI(amiClientRef)

      await expect(getMailboxStatus('1001')).rejects.toThrow('AMI client not connected')
    })

    it('should return mailbox status on successful query', async () => {
      const mockResponse = {
        NewMessages: '3',
        OldMessages: '5',
        UrgentNew: '0',
        UrgentOld: '0',
      }
      mockAmiClient.sendAction.mockResolvedValue({ data: mockResponse })

      const amiClientRef = ref(mockAmiClient)
      const { getMailboxStatus, isLoading, error } = useAmiMWI(amiClientRef)

      const result = await getMailboxStatus('1001')

      expect(result.mailbox).toBe('1001@default')
      expect(result.newMessages).toBe(3)
      expect(result.oldMessages).toBe(5)
      expect(result.urgentNew).toBe(0)
      expect(result.urgentOld).toBe(0)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
    })

    it('should handle missing fields in response', async () => {
      const mockResponse = {}
      mockAmiClient.sendAction.mockResolvedValue({ data: mockResponse })

      const amiClientRef = ref(mockAmiClient)
      const { getMailboxStatus } = useAmiMWI(amiClientRef)

      const result = await getMailboxStatus('1001')

      expect(result.newMessages).toBe(0)
      expect(result.oldMessages).toBe(0)
    })

    it('should set indicatorOn when newMessages > 0', async () => {
      const mockResponse = {
        NewMessages: '3',
        OldMessages: '5',
      }
      mockAmiClient.sendAction.mockResolvedValue({ data: mockResponse })

      const amiClientRef = ref(mockAmiClient)
      const { getMailboxStatus } = useAmiMWI(amiClientRef)

      const result = await getMailboxStatus('1001')

      expect(result.indicatorOn).toBe(true)
    })

    it('should set indicatorOn to false when no new messages', async () => {
      const mockResponse = {
        NewMessages: '0',
        OldMessages: '0',
      }
      mockAmiClient.sendAction.mockResolvedValue({ data: mockResponse })

      const amiClientRef = ref(mockAmiClient)
      const { getMailboxStatus } = useAmiMWI(amiClientRef)

      const result = await getMailboxStatus('1001')

      expect(result.indicatorOn).toBe(false)
    })

    it('should set error on failure and rethrow', async () => {
      mockAmiClient.sendAction.mockRejectedValue(new Error('AMI error'))

      const amiClientRef = ref(mockAmiClient)
      const { getMailboxStatus, error } = useAmiMWI(amiClientRef)

      await expect(getMailboxStatus('1001')).rejects.toThrow('AMI error')
      expect(error.value).toBe('AMI error')
    })

    it('should update internal mailboxes map', async () => {
      const mockResponse = {
        NewMessages: '3',
        OldMessages: '5',
      }
      mockAmiClient.sendAction.mockResolvedValue({ data: mockResponse })

      const amiClientRef = ref(mockAmiClient)
      const { getMailboxStatus, mailboxes } = useAmiMWI(amiClientRef)

      await getMailboxStatus('1001')

      const stored = mailboxes.value.get('1001@default')
      expect(stored).toBeDefined()
      expect(stored?.newMessages).toBe(3)
    })
  })

  describe('updateMWI', () => {
    it('should return false when AMI client is not connected', async () => {
      const amiClientRef = ref<typeof mockAmiClient | null>(null)
      const { updateMWI } = useAmiMWI(amiClientRef)

      const result = await updateMWI('1001', 3)
      expect(result).toBe(false)
    })

    it('should send MWIUpdate action with correct params', async () => {
      mockAmiClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })

      const amiClientRef = ref(mockAmiClient)
      const { updateMWI } = useAmiMWI(amiClientRef)

      await updateMWI('1001', 3)

      expect(mockAmiClient.sendAction).toHaveBeenCalledWith({
        Action: 'MWIUpdate',
        Mailbox: '1001@default',
        NewMessages: '3',
        OldMessages: '0',
      })
    })

    it('should use custom context when provided', async () => {
      mockAmiClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })

      const amiClientRef = ref(mockAmiClient)
      const { updateMWI } = useAmiMWI(amiClientRef, { defaultContext: 'custom' })

      await updateMWI('1001@custom', 5)

      expect(mockAmiClient.sendAction).toHaveBeenCalledWith({
        Action: 'MWIUpdate',
        Mailbox: '1001@custom',
        NewMessages: '5',
        OldMessages: '0',
      })
    })

    it('should update internal state after successful update', async () => {
      mockAmiClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })

      const amiClientRef = ref(mockAmiClient)
      const { updateMWI, mailboxes } = useAmiMWI(amiClientRef)

      await updateMWI('1001', 3)

      const stored = mailboxes.value.get('1001@default')
      expect(stored?.newMessages).toBe(3)
      expect(stored?.indicatorOn).toBe(true)
    })

    it('should return true on success', async () => {
      mockAmiClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })

      const amiClientRef = ref(mockAmiClient)
      const { updateMWI } = useAmiMWI(amiClientRef)

      const result = await updateMWI('1001', 3)
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      mockAmiClient.sendAction.mockRejectedValue(new Error('AMI error'))

      const amiClientRef = ref(mockAmiClient)
      const { updateMWI, error } = useAmiMWI(amiClientRef)

      const result = await updateMWI('1001', 3)

      expect(result).toBe(false)
      expect(error.value).toBe('AMI error')
    })
  })

  describe('deleteMWI', () => {
    it('should delete mailbox from internal state', async () => {
      mockAmiClient.sendAction.mockResolvedValue({ data: { Response: 'Success' } })

      const amiClientRef = ref(mockAmiClient)
      const { deleteMWI, mailboxes } = useAmiMWI(amiClientRef)

      // First add a mailbox
      mailboxes.value.set('1001@default', {
        mailbox: '1001@default',
        newMessages: 5,
        oldMessages: 3,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: true,
      })

      await deleteMWI('1001')

      expect(mailboxes.value.has('1001@default')).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should calculate totalNewMessages correctly', () => {
      const amiClientRef = ref(mockAmiClient)
      const { mailboxes, totalNewMessages } = useAmiMWI(amiClientRef)

      mailboxes.value.set('1001@default', {
        mailbox: '1001@default',
        newMessages: 3,
        oldMessages: 5,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: true,
      })
      mailboxes.value.set('1002@default', {
        mailbox: '1002@default',
        newMessages: 2,
        oldMessages: 1,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: true,
      })

      expect(totalNewMessages.value).toBe(5) // 3 + 2
    })

    it('should calculate indicatorOnCount correctly', () => {
      const amiClientRef = ref(mockAmiClient)
      const { mailboxes, indicatorOnCount } = useAmiMWI(amiClientRef)

      mailboxes.value.set('1001@default', {
        mailbox: '1001@default',
        newMessages: 3,
        oldMessages: 5,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: true,
      })
      mailboxes.value.set('1002@default', {
        mailbox: '1002@default',
        newMessages: 0,
        oldMessages: 0,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: false,
      })

      expect(indicatorOnCount.value).toBe(1)
    })

    it('should filter mailboxesWithMessages correctly', () => {
      const amiClientRef = ref(mockAmiClient)
      const { mailboxes, mailboxesWithMessages } = useAmiMWI(amiClientRef)

      mailboxes.value.set('1001@default', {
        mailbox: '1001@default',
        newMessages: 3,
        oldMessages: 0,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: true,
      })
      mailboxes.value.set('1002@default', {
        mailbox: '1002@default',
        newMessages: 0,
        oldMessages: 0,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: false,
      })

      expect(mailboxesWithMessages.value.length).toBe(1)
      expect(mailboxesWithMessages.value[0].mailbox).toBe('1001@default')
    })
  })

  describe('getMailbox', () => {
    it('should return undefined for non-tracked mailbox', () => {
      const amiClientRef = ref(mockAmiClient)
      const { getMailbox } = useAmiMWI(amiClientRef)

      const result = getMailbox('1001')
      expect(result).toBeUndefined()
    })

    it('should return status for tracked mailbox', () => {
      const amiClientRef = ref(mockAmiClient)
      const { getMailbox, mailboxes } = useAmiMWI(amiClientRef)

      mailboxes.value.set('1001@default', {
        mailbox: '1001@default',
        newMessages: 3,
        oldMessages: 5,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: true,
      })

      const result = getMailbox('1001')
      expect(result?.newMessages).toBe(3)
    })
  })

  describe('hasMessages', () => {
    it('should return false for non-tracked mailbox', () => {
      const amiClientRef = ref(mockAmiClient)
      const { hasMessages } = useAmiMWI(amiClientRef)

      expect(hasMessages('1001')).toBe(false)
    })

    it('should return true when mailbox has new messages', () => {
      const amiClientRef = ref(mockAmiClient)
      const { hasMessages, mailboxes } = useAmiMWI(amiClientRef)

      mailboxes.value.set('1001@default', {
        mailbox: '1001@default',
        newMessages: 3,
        oldMessages: 0,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: true,
      })

      expect(hasMessages('1001')).toBe(true)
    })

    it('should return true when mailbox has old messages only', () => {
      const amiClientRef = ref(mockAmiClient)
      const { hasMessages, mailboxes } = useAmiMWI(amiClientRef)

      mailboxes.value.set('1001@default', {
        mailbox: '1001@default',
        newMessages: 0,
        oldMessages: 3,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: false,
      })

      expect(hasMessages('1001')).toBe(true)
    })
  })

  describe('trackMailbox and untrackMailbox', () => {
    it('should track mailbox and fetch status', async () => {
      const mockResponse = {
        NewMessages: '3',
        OldMessages: '5',
      }
      mockAmiClient.sendAction.mockResolvedValue({ data: mockResponse })

      const amiClientRef = ref(mockAmiClient)
      const { trackMailbox, mailboxes } = useAmiMWI(amiClientRef)

      await trackMailbox('1001')

      expect(mailboxes.value.has('1001@default')).toBe(true)
    })

    it('should untrack mailbox and remove from state', () => {
      const amiClientRef = ref(mockAmiClient)
      const { untrackMailbox, mailboxes } = useAmiMWI(amiClientRef)

      mailboxes.value.set('1001@default', {
        mailbox: '1001@default',
        newMessages: 3,
        oldMessages: 5,
        urgentNew: 0,
        urgentOld: 0,
        indicatorOn: true,
      })

      untrackMailbox('1001')

      expect(mailboxes.value.has('1001@default')).toBe(false)
    })
  })
})
