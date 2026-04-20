import { inject, provide, type InjectionKey } from 'vue'
import type { UseCallSessionReturn } from '../../../src/composables/useCallSession'
import type { UseCallControlsReturn } from '../../../src/composables/useCallControls'
import { useSimulation } from '../../composables/useSimulation'

interface CallTransferDemoContext {
  callSession: UseCallSessionReturn
  controls: UseCallControlsReturn
  simulation: ReturnType<typeof useSimulation>
}

const callTransferDemoContextKey: InjectionKey<CallTransferDemoContext> = Symbol(
  'call-transfer-demo-context'
)

export const provideCallTransferDemoContext = (context: CallTransferDemoContext): void => {
  provide(callTransferDemoContextKey, context)
}

export const useCallTransferDemoContext = (): CallTransferDemoContext => {
  const context = inject(callTransferDemoContextKey, null)

  if (!context) {
    throw new Error('CallTransfer demo context not provided')
  }

  return context
}
