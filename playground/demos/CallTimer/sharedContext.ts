import { inject, provide, type InjectionKey } from 'vue'
import type { UseCallSessionReturn } from '../../../src/composables/useCallSession'
import { useSimulation } from '../../composables/useSimulation'

interface CallTimerDemoContext {
  callSession: UseCallSessionReturn
  simulation: ReturnType<typeof useSimulation>
}

const callTimerDemoContextKey: InjectionKey<CallTimerDemoContext> = Symbol('call-timer-demo-context')

export const provideCallTimerDemoContext = (context: CallTimerDemoContext): void => {
  provide(callTimerDemoContextKey, context)
}

export const useCallTimerDemoContext = (): CallTimerDemoContext => {
  const context = inject(callTimerDemoContextKey, null)

  if (!context) {
    throw new Error('CallTimer demo context not provided')
  }

  return context
}
