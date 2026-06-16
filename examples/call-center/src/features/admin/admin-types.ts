/**
 * Domain model for the call-center admin surface.
 *
 * Domain: healthcare/elderly-care. Each patient has a designated
 * "omvårdnadsansvarig sjuksköterska" (OAS — primary nurse) who belongs to a
 * team. The core flow: when a call/case arrives, the responsible OAS can
 * claim responsibility with a single button press, and the assignment logic
 * must be immediately legible to the administrator.
 *
 * @module features/admin/admin-types
 */

/**
 * A team of nurses (e.g. a ward or shift team).
 */
export interface Team {
  id: string
  name: string
  /** Nurse ids that belong to this team. */
  memberNurseIds: string[]
}

/**
 * A nurse. `isOas` flags whether this nurse is eligible to hold primary
 * (omvårdnadsansvarig) responsibility for patients.
 */
export interface Nurse {
  id: string
  name: string
  teamId: string
  /** SIP extension used to reach this nurse (for callbacks/routing). */
  extension: string
  /** Eligible to be a primary (OAS) nurse. */
  isOas: boolean
}

/**
 * The responsibility assignment for one patient.
 *
 * The `primaryNurseId` is the OAS — the single nurse accountable for this
 * patient. `fallbackQueue` is the queue used when the OAS is unreachable.
 */
export interface PatientAssignment {
  patientId: string
  patientName: string
  /** The designated OAS (omvårdnadsansvarig sjuksköterska). */
  primaryNurseId: string | null
  teamId: string
  /** Queue name used when the OAS cannot be reached. */
  fallbackQueue: string
  /** ISO timestamp of the last assignment change (for "recently reassigned" UI). */
  lastAssignedAt: string | null
}

/**
 * The full admin state, persisted to localStorage in demo mode.
 * (Connected mode could source teams/nurses from PBX directory; left for later.)
 */
export interface AdminDirectory {
  teams: Team[]
  nurses: Nurse[]
  assignments: PatientAssignment[]
}
