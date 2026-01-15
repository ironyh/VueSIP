/**
 * Shared minimal SIP adapter interface used by useClickToCall
 * Unifies mock and real SIP client shapes to only what the widget needs.
 */

import type { Ref, ComputedRef } from 'vue'
import type { MockCallState } from '@/composables/useSipMock'

export type ReadonlyRef<T> = Ref<T> | ComputedRef<T>

export interface UseSipAdapter {
  // Reactive state used by the widget
  isConnected: ReadonlyRef<boolean>
  callState: ReadonlyRef<MockCallState>
  error?: ReadonlyRef<string | null>
  /** Optional remote number/name when available (e.g., inbound) */
  remoteNumber?: ReadonlyRef<string | null>

  // Methods required by the widget
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  call: (number: string) => Promise<string | void>
  hangup: () => Promise<void>
  answer: () => Promise<void>
}
