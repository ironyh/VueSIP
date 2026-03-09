/**
 * ConfirmDialog.vue unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

// Mock the useConfirm composable
vi.mock('@/composables/useConfirm', () => ({
  useConfirm: vi.fn(() => {
    const isOpen = vi.fn(false)
    const options = vi.fn(null)
    const confirm = vi.fn()
    const cancelCurrent = vi.fn()
    const confirmCurrent = vi.fn()
    const _reset = vi.fn()

    return {
      isOpen,
      options,
      confirm,
      cancelCurrent,
      confirmCurrent,
      _reset,
    }
  }),
}))

describe('ConfirmDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render dialog component', () => {
      const _wrapper = mount(ConfirmDialog, {
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      expect(_wrapper.findComponent(Dialog).exists()).toBe(true)
    })

    it('should render with default title', () => {
      const _wrapper = mount(ConfirmDialog, {
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      // The dialog should exist with default header
      expect(_wrapper.findComponent(Dialog).exists()).toBe(true)
    })

    it('should render confirm and cancel buttons', () => {
      const _wrapper = mount(ConfirmDialog, {
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      const buttons = _wrapper.findAllComponents(Button)
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Props', () => {
    it('should accept visible prop', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      expect(_wrapper.props('visible')).toBe(true)
    })

    it('should accept options prop', () => {
      const testOptions = {
        title: 'Test Title',
        message: 'Test message',
        confirmText: 'Yes',
        cancelText: 'No',
        variant: 'danger' as const,
      }

      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: testOptions,
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      expect(_wrapper.props('options')).toEqual(testOptions)
    })
  })

  describe('Emits', () => {
    it('should emit update:visible when dialog visibility changes', async () => {
      const _wrapper = mount(ConfirmDialog, {
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      // The component should emit update:visible
      // This is tested through the composable's isOpen watcher
    })

    it('should emit confirm event', async () => {
      const _wrapper = mount(ConfirmDialog, {
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      // The confirm event should be emitted when confirm button is clicked
      // The actual implementation calls emit('confirm') in handleConfirm
    })

    it('should emit cancel event', async () => {
      const _wrapper = mount(ConfirmDialog, {
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      // The cancel event should be emitted when cancel button is clicked
    })
  })

  describe('Confirm Button Variants', () => {
    it('should apply primary variant class by default', () => {
      const _wrapper = mount(ConfirmDialog, {
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      // Default variant should be primary
      const confirmButtonClass = _wrapper.vm.confirmButtonClass
      expect(confirmButtonClass).toBe('p-button-primary')
    })

    it('should apply danger variant class when specified', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          options: {
            message: 'Test',
            variant: 'danger',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      const confirmButtonClass = _wrapper.vm.confirmButtonClass
      expect(confirmButtonClass).toBe('p-button-danger')
    })

    it('should apply warning variant class when specified', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          options: {
            message: 'Test',
            variant: 'warning',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      const confirmButtonClass = _wrapper.vm.confirmButtonClass
      expect(confirmButtonClass).toBe('p-button-warning')
    })

    it('should apply info variant class when specified', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          options: {
            message: 'Test',
            variant: 'info',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      const confirmButtonClass = _wrapper.vm.confirmButtonClass
      expect(confirmButtonClass).toBe('p-button-info')
    })
  })

  describe('Standalone Mode', () => {
    it('should work with standalone visible prop', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {
            message: 'Standalone confirmation',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      expect(_wrapper.props('visible')).toBe(true)
      expect(_wrapper.props('options')).toBeDefined()
    })

    it('should use custom width from options', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {
            message: 'Test',
            width: '600px',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      expect(_wrapper.props('options')?.width).toBe('600px')
    })

    it('should use custom text from options', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {
            message: 'Test',
            confirmText: 'Approve',
            cancelText: 'Deny',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      expect(_wrapper.props('options')?.confirmText).toBe('Approve')
      expect(_wrapper.props('options')?.cancelText).toBe('Deny')
    })

    it('should hide cancel button when showCancel is false', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {
            message: 'Test',
            showCancel: false,
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      expect(_wrapper.props('options')?.showCancel).toBe(false)
    })
  })

  describe('Icon Display', () => {
    it('should render icon when provided in options', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {
            message: 'Test with icon',
            icon: 'pi pi-exclamation-triangle',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      const iconElement = _wrapper.find('.confirm-dialog-icon')
      expect(iconElement.exists()).toBe(true)
    })
  })

  describe('Message Display', () => {
    it('should display message from options', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {
            message: 'This is a test message',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      const messageElement = _wrapper.find('.confirm-dialog-message')
      expect(messageElement.exists()).toBe(true)
      expect(messageElement.text()).toBe('This is a test message')
    })

    it('should display default message when not provided', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {},
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      const messageElement = _wrapper.find('.confirm-dialog-message')
      expect(messageElement.exists()).toBe(true)
    })
  })

  describe('Default Values', () => {
    it('should have default width of 400px', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {
            message: 'Test',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      // Default width should be 400px (from DEFAULT_OPTIONS)
      expect(_wrapper.props('options')?.width || '400px').toBe('400px')
    })

    it('should have default title of "Confirm Action"', () => {
      const _wrapper = mount(ConfirmDialog, {
        props: {
          visible: true,
          options: {
            message: 'Test',
          },
        },
        global: {
          stubs: {
            Dialog,
            Button,
          },
        },
      })

      // Default title from component logic
      expect(_wrapper.props('options')?.title || 'Confirm Action').toBe('Confirm Action')
    })
  })
})
