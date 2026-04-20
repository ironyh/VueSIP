import { inject, provide, type InjectionKey } from 'vue'
import type { UseCallSessionReturn } from '../../../src/composables/useCallSession'

const dtmfSessionKey: InjectionKey<UseCallSessionReturn> = Symbol('dtmf-session')

export const provideDtmfSession = (session: UseCallSessionReturn): void => {
  provide(dtmfSessionKey, session)
}

export const useDtmfSession = (): UseCallSessionReturn => {
  const session = inject(dtmfSessionKey, null)

  if (!session) {
    throw new Error('DTMF session not provided')
  }

  return session
}
