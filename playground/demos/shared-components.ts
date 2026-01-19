/**
 * Shared PrimeVue Component Imports for Playground Demos
 *
 * Import this file in demo components to get all necessary PrimeVue components
 * without having to import individually from primevue packages.
 *
 * @example
 * ```typescript
 * import { Button, InputText, Dropdown, useToast } from './shared-components'
 * ```
 */

// Form Components
export { default as Button } from 'primevue/button'
export { default as InputText } from 'primevue/inputtext'
export { default as Password } from 'primevue/password'
export { default as Dropdown } from 'primevue/dropdown'
export { default as Checkbox } from 'primevue/checkbox'
export { default as InputSwitch } from 'primevue/inputswitch'
export { default as InputNumber } from 'primevue/inputnumber'
export { default as Textarea } from 'primevue/textarea'
export { default as RadioButton } from 'primevue/radiobutton'
export { default as Calendar } from 'primevue/calendar'
export { default as Slider } from 'primevue/slider'
// Note: Select is PrimeVue v4 only - use Dropdown instead for v3

// Data Display
export { default as DataTable } from 'primevue/datatable'
export { default as Column } from 'primevue/column'
export { default as DataView } from 'primevue/dataview'
export { default as Card } from 'primevue/card'
export { default as Panel } from 'primevue/panel'
export { default as Divider } from 'primevue/divider'
export { default as Accordion } from 'primevue/accordion'
export { default as AccordionTab } from 'primevue/accordiontab'

// Overlay Components
export { default as Dialog } from 'primevue/dialog'
export { default as Toast } from 'primevue/toast'
export { default as ConfirmDialog } from 'primevue/confirmdialog'
export { default as OverlayPanel } from 'primevue/overlaypanel'
export { default as Sidebar } from 'primevue/sidebar'

// Feedback Components
export { default as ProgressSpinner } from 'primevue/progressspinner'
export { default as ProgressBar } from 'primevue/progressbar'
export { default as Message } from 'primevue/message'
export { default as InlineMessage } from 'primevue/inlinemessage'
export { default as Badge } from 'primevue/badge'
export { default as Tag } from 'primevue/tag'
export { default as Chip } from 'primevue/chip'

// Menu Components
export { default as Menu } from 'primevue/menu'
export { default as TieredMenu } from 'primevue/tieredmenu'
export { default as ContextMenu } from 'primevue/contextmenu'

// Misc Components
export { default as Avatar } from 'primevue/avatar'
export { default as AvatarGroup } from 'primevue/avatargroup'
export { default as Tooltip } from 'primevue/tooltip'
export { default as Skeleton } from 'primevue/skeleton'

// Composables
export { useToast } from 'primevue/usetoast'
export { useConfirm } from 'primevue/useconfirm'

/**
 * Common PrimeVue Severity Types
 */
export type Severity = 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast'

/**
 * Common PrimeVue Size Types
 */
export type Size = 'small' | 'large'

/**
 * Helper function to create toast notifications
 */
export const createToast = (toast: ReturnType<typeof useToast>) => ({
  success: (message: string, detail?: string) => {
    toast.add({
      severity: 'success',
      summary: message,
      detail,
      life: 3000,
    })
  },
  error: (message: string, detail?: string) => {
    toast.add({
      severity: 'error',
      summary: message,
      detail,
      life: 5000,
    })
  },
  warn: (message: string, detail?: string) => {
    toast.add({
      severity: 'warn',
      summary: message,
      detail,
      life: 4000,
    })
  },
  info: (message: string, detail?: string) => {
    toast.add({
      severity: 'info',
      summary: message,
      detail,
      life: 3000,
    })
  },
})
