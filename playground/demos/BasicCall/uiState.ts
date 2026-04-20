export type DemoCallState = string | null | undefined

export const isIncomingCallState = (state: DemoCallState): boolean =>
  state === 'ringing' || state === 'incoming'

export const isActiveCallState = (state: DemoCallState): boolean =>
  state === 'active' || state === 'held' || state === 'on-hold' || state === 'remote_held'

export const isDialingCallState = (state: DemoCallState): boolean =>
  state === 'calling' ||
  state === 'connecting' ||
  state === 'answering' ||
  state === 'early_media' ||
  state === 'terminating'

export const canHangupFromState = (state: DemoCallState): boolean =>
  isDialingCallState(state) || isActiveCallState(state)

export const formatBasicCallState = (state: DemoCallState): string => {
  switch (state) {
    case 'calling':
    case 'connecting':
      return 'Connecting'
    case 'answering':
      return 'Answering'
    case 'early_media':
      return 'Ringing'
    case 'active':
      return 'In call'
    case 'held':
    case 'on-hold':
      return 'On hold'
    case 'remote_held':
      return 'Remote hold'
    case 'terminating':
      return 'Ending'
    case 'terminated':
    case 'ended':
      return 'Ended'
    case 'failed':
      return 'Failed'
    default:
      return state || 'Unknown'
  }
}
