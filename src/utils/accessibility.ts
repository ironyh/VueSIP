/**
 * Accessibility utilities for VueSIP components
 *
 * Centralized functions to ensure consistent accessibility across all components,
 * supporting WCAG 2.1 AA standards and common accessibility patterns.
 */

/**
 * Generate a unique ID for accessibility attributes
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Common keyboard event handlers for accessibility
 */
export const keyboardEventHandlers = {
  /**
   * Handle Enter key activation
   */
  handleEnter: (callback: () => void, event: KeyboardEvent) => {
    event.preventDefault()
    callback()
  },

  /**
   * Handle Space key activation
   */
  handleSpace: (callback: () => void, event: KeyboardEvent) => {
    event.preventDefault()
    callback()
  },

  /**
   * Handle Escape key cancellation
   */
  handleEscape: (callback: () => void, event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      callback()
    }
  },

  /**
   * Handle arrow key navigation for lists
   */
  handleArrowKeys: (
    event: KeyboardEvent,
    currentIndex: number,
    itemsLength: number,
    direction: 'next' | 'previous',
    callback: (index: number) => void
  ) => {
    event.preventDefault()
    let newIndex: number

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (direction === 'next') {
          newIndex = (currentIndex + 1) % itemsLength
        } else {
          newIndex = currentIndex
        }
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        if (direction === 'previous') {
          newIndex = currentIndex <= 0 ? itemsLength - 1 : currentIndex - 1
        } else {
          newIndex = currentIndex
        }
        break
      case 'Home':
        newIndex = 0
        break
      case 'End':
        newIndex = itemsLength - 1
        break
      default:
        return
    }

    callback(newIndex)
  },
}

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Focus an element by selector
   */
  focusElement: (selector: string) => {
    const element = document.querySelector(selector)
    if (element instanceof HTMLElement) {
      element.focus()
    }
  },

  /**
   * Trap focus within a container
   */
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (!firstElement || !lastElement) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  },
}

/**
 * ARIA attribute generators
 */
export const ariaGenerators = {
  /**
   * Generate ARIA live region message
   */
  liveMessage: (message: string, politeness: 'polite' | 'assertive' = 'polite') => ({
    'aria-live': politeness,
    'aria-atomic': true,
    children: message,
  }),

  /**
   * Generate ARIA label from text
   */
  labelFromText: (text: string) => text.replace(/[^\w\s]/gi, '').trim(),

  /**
   * Generate progress bar ARIA attributes
   */
  progressBar: (value: number, max: number = 100) => ({
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuetext': `${value}% complete`,
  }),

  /**
   * Generate tab list ARIA attributes
   */
  tabList: (activeId: string, _tabIds: string[]) => ({
    role: 'tablist',
    'aria-activedescendant': activeId,
  }),

  /**
   * Generate tab ARIA attributes
   */
  tab: (id: string, label: string, isSelected: boolean, panelId: string) => ({
    id,
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': panelId,
    'aria-label': label,
    tabindex: isSelected ? 0 : -1,
  }),

  /**
   * Generate tab panel ARIA attributes
   */
  tabPanel: (id: string, tabId: string, isSelected: boolean) => ({
    id,
    role: 'tabpanel',
    'aria-labelledby': tabId,
    hidden: !isSelected,
  }),
}

/**
 * Color contrast utilities
 */
export const contrast = {
  /**
   * Check if color contrast meets WCAG standards
   * (simplified version - in production use a proper color contrast library)
   */
  meetsContrast: (textColor: string, backgroundColor: string): boolean => {
    // This is a simplified check - implement proper color contrast calculation
    // For now, assume it passes if we have different colors
    return textColor !== backgroundColor
  },

  /**
   * Get high contrast color variants
   */
  getHighContrast: (color: string): string => {
    // Simplified high contrast mapping
    const contrastMap: Record<string, string> = {
      '#3b82f6': '#000000', // blue -> black
      '#10b981': '#000000', // green -> black
      '#ef4444': '#000000', // red -> black
      '#6b7280': '#000000', // gray -> black
      '#ffffff': '#000000', // white -> black
    }
    return contrastMap[color] || '#000000'
  },
}

/**
 * Screen reader announcement utilities
 */
export const screenReader = {
  /**
   * Announce a message to screen readers
   */
  announce: (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', politeness)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.setAttribute('aria-hidden', 'false')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.style.width = '1px'
    announcement.style.height = '1px'
    announcement.style.overflow = 'hidden'

    document.body.appendChild(announcement)
    announcement.textContent = message

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  },

  /**
   * Create a hidden screen reader only element
   */
  srOnly: (text: string) => ({
    className: 'sr-only',
    children: text,
  }),
}

/**
 * Accessibility validation utilities
 */
export const validate = {
  /**
   * Check if an element is keyboard accessible
   */
  isKeyboardAccessible: (element: HTMLElement): boolean => {
    return (
      element.tabIndex !== -1 ||
      element.getAttribute('role') === 'button' ||
      element.getAttribute('role') === 'link' ||
      element instanceof HTMLButtonElement ||
      element instanceof HTMLAnchorElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    )
  },

  /**
   * Check if component has required ARIA attributes
   */
  hasRequiredAria: (element: HTMLElement, requiredAttributes: string[]): boolean => {
    return requiredAttributes.every((attr) => element.hasAttribute(attr))
  },
}

/**
 * Common accessibility class names
 */
export const accessibilityClasses = {
  srOnly: 'sr-only',
  focusVisible: 'focus-visible',
  visuallyHidden: 'visually-hidden',
  skipLink: 'skip-link',
  highContrast: 'high-contrast',
}

/**
 * Skip to content link for keyboard navigation
 */
export const skipToContent = {
  id: 'skip-to-content',
  label: 'Skip to main content',
  href: '#main-content',
}
