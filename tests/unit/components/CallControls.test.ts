/**
 * CallControls.vue unit tests
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CallControls from '@/components/CallControls.vue'
import type { CallSession } from '@/types'

describe('CallControls.vue', () => {
  describe('Incoming Call State', () => {
    it('should display incoming call notification', () => {
      const incomingCall: Partial<CallSession> = {
        id: 'test-incoming-call',
        remoteUri: 'sip:caller@example.com',
        remoteDisplayName: 'Test Caller',
        direction: 'incoming',
        state: 'ringing',
        timing: {
          startTime: new Date(),
          answerTime: null,
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: incomingCall as CallSession,
          currentCall: null,
          isCalling: false,
        },
      })

      const notification = wrapper.find('[data-testid="incoming-call-notification"]')
      expect(notification.exists()).toBe(true)
      expect(notification.text()).toContain('Test Caller')
    })

    it('should show remote URI when display name is not available', () => {
      const incomingCall: Partial<CallSession> = {
        id: 'test-call',
        remoteUri: 'sip:1234@example.com',
        remoteDisplayName: null,
        direction: 'incoming',
        state: 'ringing',
        timing: {
          startTime: new Date(),
          answerTime: null,
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: incomingCall as CallSession,
          currentCall: null,
          isCalling: false,
        },
      })

      expect(wrapper.text()).toContain('sip:1234@example.com')
    })

    it('should emit answer event when answer button clicked', async () => {
      const incomingCall: Partial<CallSession> = {
        id: 'test-call',
        remoteUri: 'sip:caller@example.com',
        direction: 'incoming',
        state: 'ringing',
        timing: {
          startTime: new Date(),
          answerTime: null,
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: incomingCall as CallSession,
          currentCall: null,
          isCalling: false,
        },
      })

      const answerButton = wrapper.find('[data-testid="answer-button"]')
      await answerButton.trigger('click')

      expect(wrapper.emitted('answer')).toBeTruthy()
    })

    it('should emit reject event when reject button clicked', async () => {
      const incomingCall: Partial<CallSession> = {
        id: 'test-call',
        remoteUri: 'sip:caller@example.com',
        direction: 'incoming',
        state: 'ringing',
        timing: {
          startTime: new Date(),
          answerTime: null,
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: incomingCall as CallSession,
          currentCall: null,
          isCalling: false,
        },
      })

      const rejectButton = wrapper.find('[data-testid="reject-button"]')
      await rejectButton.trigger('click')

      expect(wrapper.emitted('reject')).toBeTruthy()
    })
  })

  describe('Active Call State', () => {
    it('should display active call controls', () => {
      const currentCall: Partial<CallSession> = {
        id: 'test-active-call',
        remoteUri: 'sip:contact@example.com',
        remoteDisplayName: 'Active Contact',
        direction: 'outgoing',
        state: 'confirmed',
        timing: {
          startTime: new Date(),
          answerTime: new Date(),
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: null,
          currentCall: currentCall as CallSession,
          isCalling: false,
        },
      })

      const activeCall = wrapper.find('[data-testid="active-call"]')
      expect(activeCall.exists()).toBe(true)
      expect(activeCall.text()).toContain('Active Contact')
    })

    it('should format call duration correctly', () => {
      const answerTime = new Date()
      answerTime.setSeconds(answerTime.getSeconds() - 125) // 2 minutes 5 seconds ago

      const currentCall: Partial<CallSession> = {
        id: 'test-call',
        remoteUri: 'sip:contact@example.com',
        direction: 'outgoing',
        state: 'confirmed',
        timing: {
          startTime: new Date(),
          answerTime,
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: null,
          currentCall: currentCall as CallSession,
          isCalling: false,
        },
      })

      const status = wrapper.find('[data-testid="call-status"]')
      // Should show MM:SS format (approximately 02:05)
      expect(status.text()).toMatch(/\d{2}:\d{2}/)
    })

    it('should show 00:00 when call not answered yet', () => {
      const currentCall: Partial<CallSession> = {
        id: 'test-call',
        remoteUri: 'sip:contact@example.com',
        direction: 'outgoing',
        state: 'ringing',
        timing: {
          startTime: new Date(),
          answerTime: null,
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: null,
          currentCall: currentCall as CallSession,
          isCalling: false,
        },
      })

      const status = wrapper.find('[data-testid="call-status"]')
      expect(status.text()).toBe('00:00')
    })

    it('should emit mute event when mute button clicked', async () => {
      const currentCall: Partial<CallSession> = {
        id: 'test-call',
        remoteUri: 'sip:contact@example.com',
        direction: 'outgoing',
        state: 'confirmed',
        timing: {
          startTime: new Date(),
          answerTime: new Date(),
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: null,
          currentCall: currentCall as CallSession,
          isCalling: false,
        },
      })

      const muteButton = wrapper.find('[data-testid="mute-audio-button"]')
      await muteButton.trigger('click')

      expect(wrapper.emitted('mute')).toBeTruthy()
    })

    it('should emit end event when hangup button clicked', async () => {
      const currentCall: Partial<CallSession> = {
        id: 'test-call',
        remoteUri: 'sip:contact@example.com',
        direction: 'outgoing',
        state: 'confirmed',
        timing: {
          startTime: new Date(),
          answerTime: new Date(),
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: null,
          currentCall: currentCall as CallSession,
          isCalling: false,
        },
      })

      const hangupButton = wrapper.find('[data-testid="hangup-button"]')
      await hangupButton.trigger('click')

      expect(wrapper.emitted('end')).toBeTruthy()
    })
  })

  describe('Calling State', () => {
    it('should display calling state when isCalling is true', () => {
      const wrapper = mount(CallControls, {
        props: {
          incomingCall: null,
          currentCall: null,
          isCalling: true,
        },
      })

      expect(wrapper.text()).toContain('Calling...')
      expect(wrapper.find('.spinner').exists()).toBe(true)
    })

    it('should not show calling state when isCalling is false', () => {
      const wrapper = mount(CallControls, {
        props: {
          incomingCall: null,
          currentCall: null,
          isCalling: false,
        },
      })

      expect(wrapper.text()).not.toContain('Calling...')
      expect(wrapper.find('.spinner').exists()).toBe(false)
    })
  })

  describe('Idle State', () => {
    it('should show empty state when no calls', () => {
      const wrapper = mount(CallControls, {
        props: {
          incomingCall: null,
          currentCall: null,
          isCalling: false,
        },
      })

      // Should not show any call-related UI
      expect(wrapper.find('[data-testid="incoming-call-notification"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="active-call"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Calling...')
    })
  })

  describe('Priority Rendering', () => {
    it('should prioritize incoming call over active call', () => {
      const incomingCall: Partial<CallSession> = {
        id: 'incoming',
        remoteUri: 'sip:incoming@example.com',
        direction: 'incoming',
        state: 'ringing',
        timing: {
          startTime: new Date(),
          answerTime: null,
          endTime: null,
        },
      }

      const currentCall: Partial<CallSession> = {
        id: 'current',
        remoteUri: 'sip:current@example.com',
        direction: 'outgoing',
        state: 'confirmed',
        timing: {
          startTime: new Date(),
          answerTime: new Date(),
          endTime: null,
        },
      }

      const wrapper = mount(CallControls, {
        props: {
          incomingCall: incomingCall as CallSession,
          currentCall: currentCall as CallSession,
          isCalling: false,
        },
      })

      // Should show incoming call UI, not active call UI
      expect(wrapper.find('[data-testid="incoming-call-notification"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="active-call"]').exists()).toBe(false)
    })
  })
})
