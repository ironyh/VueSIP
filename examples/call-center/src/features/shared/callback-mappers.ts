/**
 * Shape-adapter from the library's `CallbackRequest` (AstDB-backed, rich status)
 * to the workspace's `CallbackTaskView` (the UI-facing callback shape). This is
 * the callback analogue of `mapQueueEntryToQueuedCall` in connected-gateway.ts.
 *
 * @module features/shared/callback-mappers
 */

import type { CallbackRequest } from '../../../../../src/types/callback.types'
import type { CallbackTaskView, DemoContactProfile } from './mvp-types'

/** Map a library CallbackRequest to the workspace's CallbackTaskView. */
export function mapCallbackRequestToView(req: CallbackRequest): CallbackTaskView {
  return {
    id: req.id,
    assignee: req.handledBy ?? req.targetAgent ?? '—',
    queue: req.targetQueue ?? 'callback',
    targetUri: `sip:${req.callerNumber}@callback`,
    contactName: req.callerName || req.callerNumber,
    status: mapCallbackStatus(req.status),
    reason: req.reason ?? 'Callback requested',
    dueAt: req.scheduledAt ?? req.requestedAt,
    profile: buildProfile(req),
  }
}

/**
 * Map the library's 6-state CallbackStatus to the workspace's 5-state view
 * status. `scheduled`/`in_progress` collapse into the workspace's
 * 'open'/'in-progress'; 'cancelled' is treated as 'failed' for display.
 */
export function mapCallbackStatus(status: CallbackRequest['status']): CallbackTaskView['status'] {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'in_progress':
      return 'in-progress'
    case 'cancelled':
      return 'failed'
    case 'rescheduled': // not a library state, but included for symmetry
      return 'rescheduled'
    case 'scheduled':
    case 'pending':
    default:
      return 'open'
  }
}

function buildProfile(req: CallbackRequest): DemoContactProfile | undefined {
  if (!req.notes && !req.metadata) return undefined
  return {
    accountTier: req.metadata?.tier,
    accountHealth: undefined,
    serviceLevel: req.metadata?.serviceLevel,
    openCaseTitle: undefined,
    callbackReason: req.reason ?? undefined,
    lastInteractionAt: req.requestedAt ? new Date(req.requestedAt).toLocaleString() : undefined,
  }
}
