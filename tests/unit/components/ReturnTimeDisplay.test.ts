/**
 * ReturnTimeDisplay.vue unit tests
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReturnTimeDisplay from '@/components/ReturnTimeDisplay.vue'
import type { ReturnTimeSpec } from '@/types/freepbx-presence.types'

describe('ReturnTimeDisplay.vue', () => {
  describe('Component States', () => {
    it('should show empty state when no return time', () => {
      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime: null,
        },
      })

      const emptyState = wrapper.find('.return-time-empty')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No return time set')
    })

    it('should show return time display when return time exists', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      const display = wrapper.find('.return-time-display')
      expect(display.exists()).toBe(true)
      expect(wrapper.find('.return-time-empty').exists()).toBe(false)
    })
  })

  describe('Compact Mode', () => {
    it('should render compact view when compact prop is true', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          compact: true,
        },
      })

      expect(wrapper.find('.compact').exists()).toBe(true)
      expect(wrapper.find('.return-time-compact').exists()).toBe(true)
    })

    it('should show countdown in compact mode when showCountdown is true', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          compact: true,
          showCountdown: true,
        },
      })

      const countdown = wrapper.find('.countdown')
      expect(countdown.exists()).toBe(true)
      expect(countdown.text()).toBe('15m')
    })

    it('should show time in compact mode when showCountdown is false', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          compact: true,
          showCountdown: false,
        },
      })

      const time = wrapper.find('.time')
      expect(time.exists()).toBe(true)
      expect(time.text()).toBe('2:30 PM')
    })
  })

  describe('Full View', () => {
    it('should display full view with all information', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          displayName: 'Dr. Smith',
          extension: '1234',
          awayReason: 'Lunch break',
        },
      })

      expect(wrapper.find('.return-time-header').exists()).toBe(true)
      expect(wrapper.find('.return-time-body').exists()).toBe(true)
      expect(wrapper.text()).toContain('Dr. Smith')
      expect(wrapper.text()).toContain('Lunch break')
      expect(wrapper.text()).toContain('2:30 PM')
    })

    it('should show extension when no display name', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          extension: '5678',
        },
      })

      expect(wrapper.text()).toContain('Ext. 5678')
    })

    it('should display away reason', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          awayReason: 'Patient rounds',
        },
      })

      const reason = wrapper.find('.reason')
      expect(reason.exists()).toBe(true)
      expect(reason.text()).toBe('Patient rounds')
    })
  })

  describe('Overdue State', () => {
    it('should apply overdue class when return time is overdue', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '1:30 PM',
        formattedRemaining: '30m',
        remainingMs: -1800000,
        isOverdue: true,
        durationMinutes: 60,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      expect(wrapper.find('.status-overdue').exists()).toBe(true)
    })

    it('should show "Overdue by" text when overdue', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '1:30 PM',
        formattedRemaining: '30m',
        remainingMs: -1800000,
        isOverdue: true,
        durationMinutes: 60,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      expect(wrapper.text()).toContain('Overdue by 30m')
    })

    it('should apply strikethrough to time when overdue', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '1:30 PM',
        formattedRemaining: '30m',
        remainingMs: -1800000,
        isOverdue: true,
        durationMinutes: 60,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      const time = wrapper.find('.time.overdue')
      expect(time.exists()).toBe(true)
    })
  })

  describe('Status Classes', () => {
    it('should apply status-away class for normal return time', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '30m',
        remainingMs: 1800000,
        isOverdue: false,
        durationMinutes: 60,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      expect(wrapper.find('.status-away').exists()).toBe(true)
    })

    it('should apply status-soon class when less than 5 minutes remaining', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '3m',
        remainingMs: 180000, // 3 minutes
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      expect(wrapper.find('.status-soon').exists()).toBe(true)
    })
  })

  describe('Progress Bar', () => {
    it('should show progress bar when showProgress is true and not overdue', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          showProgress: true,
        },
      })

      expect(wrapper.find('.progress-bar').exists()).toBe(true)
    })

    it('should hide progress bar when showProgress is false', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          showProgress: false,
        },
      })

      expect(wrapper.find('.progress-bar').exists()).toBe(false)
    })

    it('should hide progress bar when overdue', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '1:30 PM',
        formattedRemaining: '30m',
        remainingMs: -1800000,
        isOverdue: true,
        durationMinutes: 60,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          showProgress: true,
        },
      })

      expect(wrapper.find('.progress-bar').exists()).toBe(false)
    })
  })

  describe('Away Icons', () => {
    it('should show lunch icon for lunch-related reasons', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          awayReason: 'Lunch break',
        },
      })

      const icon = wrapper.find('[data-icon="lunch"]')
      expect(icon.exists()).toBe(true)
    })

    it('should show coffee icon for break-related reasons', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          awayReason: 'Coffee break',
        },
      })

      const icon = wrapper.find('[data-icon="coffee"]')
      expect(icon.exists()).toBe(true)
    })

    it('should show meeting icon for meeting-related reasons', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          awayReason: 'Team meeting',
        },
      })

      const icon = wrapper.find('[data-icon="meeting"]')
      expect(icon.exists()).toBe(true)
    })

    it('should show patient icon for patient-related reasons', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          awayReason: 'Patient care',
        },
      })

      const icon = wrapper.find('[data-icon="patient"]')
      expect(icon.exists()).toBe(true)
    })

    it('should show default away icon for unrecognized reasons', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          awayReason: 'Some other reason',
        },
      })

      const icon = wrapper.find('[data-icon="away"]')
      expect(icon.exists()).toBe(true)
    })
  })

  describe('Events', () => {
    it('should emit click event when display clicked', async () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      const display = wrapper.find('.return-time-display')
      await display.trigger('click')

      expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('should emit clear event when clear button clicked', async () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      const clearButton = wrapper.find('.clear-btn')
      await clearButton.trigger('click')

      expect(wrapper.emitted('clear')).toBeTruthy()
    })

    it('should stop propagation when clear button clicked', async () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      const clearButton = wrapper.find('.clear-btn')
      await clearButton.trigger('click')

      // Clear event should be emitted but click event should not
      expect(wrapper.emitted('clear')).toBeTruthy()
      expect(wrapper.emitted('click')).toBeFalsy()
    })
  })

  describe('Countdown Display', () => {
    it('should show countdown when showCountdown is true', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          showCountdown: true,
        },
      })

      const countdown = wrapper.find('.countdown-info')
      expect(countdown.exists()).toBe(true)
      expect(countdown.text()).toContain('15m remaining')
    })

    it('should hide countdown when showCountdown is false', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          showCountdown: false,
        },
      })

      expect(wrapper.find('.countdown-info').exists()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null awayReason gracefully', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '15m',
        remainingMs: 900000,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
          awayReason: '',
        },
      })

      // Should render without errors
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-icon="away"]').exists()).toBe(true)
    })

    it('should handle empty compact mode correctly', () => {
      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime: null,
          compact: true,
        },
      })

      const emptyState = wrapper.find('.return-time-empty.compact')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toBe('')
    })

    it('should handle zero remaining time', () => {
      const returnTime: ReturnTimeSpec = {
        expectedReturn: new Date(),
        formattedTime: '2:30 PM',
        formattedRemaining: '0m',
        remainingMs: 0,
        isOverdue: false,
        durationMinutes: 30,
      }

      const wrapper = mount(ReturnTimeDisplay, {
        props: {
          returnTime,
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('0m remaining')
    })
  })
})
