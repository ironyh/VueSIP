import { inject, provide, type InjectionKey } from 'vue'
import type { UseCallSessionReturn } from '../../../src/composables/useCallSession'

const basicCallSessionKey: InjectionKey<UseCallSessionReturn> = Symbol('basic-call-session')

export const provideBasicCallSession = (session: UseCallSessionReturn): void => {
  provide(basicCallSessionKey, session)
}

export const useBasicCallSession = (): UseCallSessionReturn => {
  const session = inject(basicCallSessionKey, null)

  if (!session) {
    throw new Error('BasicCall session not provided')
  }

  return session
}
