/**
 * Dialpad.vue unit tests
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Dialpad from '@/components/Dialpad.vue'

describe('Dialpad.vue', () => {
  describe('Component Rendering', () => {
    it('should render dialpad input', () => {
      const wrapper = mount(Dialpad)
      const input = wrapper.find('[data-testid="dialpad-input"]')
      expect(input.exists()).toBe(true)
      expect(input.attributes('placeholder')).toBe('Enter number')
    })

    it('should render all DTMF buttons', () => {
      const wrapper = mount(Dialpad)
      const expectedDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

      expectedDigits.forEach((digit) => {
        const button = wrapper.find(`[data-testid="dtmf-${digit}"]`)
        expect(button.exists()).toBe(true)
        expect(button.text()).toContain(digit)
      })
    })

    it('should display letter labels for number buttons', () => {
      const wrapper = mount(Dialpad)

      const button2 = wrapper.find('[data-testid="dtmf-2"]')
      expect(button2.text()).toContain('ABC')

      const button9 = wrapper.find('[data-testid="dtmf-9"]')
      expect(button9.text()).toContain('WXYZ')
    })

    it('should render call button', () => {
      const wrapper = mount(Dialpad)
      const callButton = wrapper.find('[data-testid="call-button"]')
      expect(callButton.exists()).toBe(true)
    })
  })

  describe('Digit Input', () => {
    it('should add digit to number when digit button clicked', async () => {
      const wrapper = mount(Dialpad)
      const input = wrapper.find('[data-testid="dialpad-input"]')

      const button1 = wrapper.find('[data-testid="dtmf-1"]')
      await button1.trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('1')
    })

    it('should append multiple digits in sequence', async () => {
      const wrapper = mount(Dialpad)
      const input = wrapper.find('[data-testid="dialpad-input"]')

      await wrapper.find('[data-testid="dtmf-1"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-2"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-3"]').trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('123')
    })

    it('should emit digit event when digit clicked', async () => {
      const wrapper = mount(Dialpad)

      const button5 = wrapper.find('[data-testid="dtmf-5"]')
      await button5.trigger('click')

      expect(wrapper.emitted('digit')).toBeTruthy()
      expect(wrapper.emitted('digit')?.[0]).toEqual(['5'])
    })

    it('should handle special characters', async () => {
      const wrapper = mount(Dialpad)
      const input = wrapper.find('[data-testid="dialpad-input"]')

      await wrapper.find('[data-testid="dtmf-*"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-#"]').trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('*#')
    })
  })

  describe('Backspace Functionality', () => {
    it('should remove last digit when backspace clicked', async () => {
      const wrapper = mount(Dialpad)
      const input = wrapper.find('[data-testid="dialpad-input"]')

      // Add some digits
      await wrapper.find('[data-testid="dtmf-1"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-2"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-3"]').trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('123')

      // Click backspace
      const buttons = wrapper.findAll('.dialpad-button')
      const backspaceButton = buttons[buttons.length - 1] // Last button is backspace
      await backspaceButton.trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('12')
    })

    it('should handle backspace on empty number', async () => {
      const wrapper = mount(Dialpad)
      const input = wrapper.find('[data-testid="dialpad-input"]')

      const buttons = wrapper.findAll('.dialpad-button')
      const backspaceButton = buttons[buttons.length - 1]
      await backspaceButton.trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('')
    })
  })

  describe('Call Button', () => {
    it('should be disabled when no number entered', () => {
      const wrapper = mount(Dialpad)
      const callButton = wrapper.find('[data-testid="call-button"]')

      expect(callButton.attributes('disabled')).toBeDefined()
    })

    it('should be enabled when number is entered', async () => {
      const wrapper = mount(Dialpad)

      await wrapper.find('[data-testid="dtmf-1"]').trigger('click')

      const callButton = wrapper.find('[data-testid="call-button"]')
      expect(callButton.attributes('disabled')).toBeUndefined()
    })

    it('should be disabled when isCalling is true', async () => {
      const wrapper = mount(Dialpad, {
        props: {
          isCalling: true,
        },
      })

      // Add a digit to enable call button normally
      await wrapper.find('[data-testid="dtmf-1"]').trigger('click')

      const callButton = wrapper.find('[data-testid="call-button"]')
      expect(callButton.attributes('disabled')).toBeDefined()
    })

    it('should emit call event with number when clicked', async () => {
      const wrapper = mount(Dialpad)

      await wrapper.find('[data-testid="dtmf-1"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-2"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-3"]').trigger('click')

      const callButton = wrapper.find('[data-testid="call-button"]')
      await callButton.trigger('click')

      expect(wrapper.emitted('call')).toBeTruthy()
      expect(wrapper.emitted('call')?.[0]).toEqual(['123'])
    })

    it('should not emit call event when number is empty', async () => {
      const wrapper = mount(Dialpad)

      const callButton = wrapper.find('[data-testid="call-button"]')
      await callButton.trigger('click')

      expect(wrapper.emitted('call')).toBeFalsy()
    })
  })

  describe('Props Integration', () => {
    it('should respect isCalling prop', () => {
      const wrapper = mount(Dialpad, {
        props: {
          isCalling: true,
        },
      })

      const callButton = wrapper.find('[data-testid="call-button"]')
      expect(callButton.attributes('disabled')).toBeDefined()
    })

    it('should update when isCalling prop changes', async () => {
      const wrapper = mount(Dialpad, {
        props: {
          isCalling: false,
        },
      })

      await wrapper.find('[data-testid="dtmf-1"]').trigger('click')

      let callButton = wrapper.find('[data-testid="call-button"]')
      expect(callButton.attributes('disabled')).toBeUndefined()

      await wrapper.setProps({ isCalling: true })

      callButton = wrapper.find('[data-testid="call-button"]')
      expect(callButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Exposed Methods', () => {
    it('should expose setNumberForTest method', () => {
      const wrapper = mount(Dialpad)
      expect(wrapper.vm.setNumberForTest).toBeDefined()
    })

    it('should set number value via setNumberForTest', async () => {
      const wrapper = mount(Dialpad)
      const input = wrapper.find('[data-testid="dialpad-input"]')

      wrapper.vm.setNumberForTest('555-1234')

      await wrapper.vm.$nextTick()
      expect((input.element as HTMLInputElement).value).toBe('555-1234')
    })
  })

  describe('Complete Workflow', () => {
    it('should handle full dialing workflow', async () => {
      const wrapper = mount(Dialpad)
      const input = wrapper.find('[data-testid="dialpad-input"]')

      // Dial a number
      await wrapper.find('[data-testid="dtmf-5"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-5"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-5"]').trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('555')
      expect(wrapper.emitted('digit')).toHaveLength(3)

      // Make correction with backspace
      const buttons = wrapper.findAll('.dialpad-button')
      const backspaceButton = buttons[buttons.length - 1]
      await backspaceButton.trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('55')

      // Continue dialing
      await wrapper.find('[data-testid="dtmf-5"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-1"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-2"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-3"]').trigger('click')
      await wrapper.find('[data-testid="dtmf-4"]').trigger('click')

      expect((input.element as HTMLInputElement).value).toBe('5551234')

      // Place call
      const callButton = wrapper.find('[data-testid="call-button"]')
      await callButton.trigger('click')

      expect(wrapper.emitted('call')).toBeTruthy()
      expect(wrapper.emitted('call')?.[0]).toEqual(['5551234'])
    })
  })
})
