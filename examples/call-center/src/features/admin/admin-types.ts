/**
 * Domain model for the call-center admin surface.
 *
 * Domain: healthcare/elderly-care. Each patient has a designated responsible
 * person PER professional role (sjuksköterska, sjukgymnast, undersköterska,
 * läkare, kurator, chef…). The core flow: when a call/case arrives for a given
 * role, the responsible person for that role can claim responsibility with a
 * single button press, and the assignment logic must be immediately legible to
 * the administrator.
 *
 * @module features/admin/admin-types
 */

/** Persisted schema version — bump when the shape changes to invalidate stale localStorage. */
export const ADMIN_DIRECTORY_VERSION = 2

/**
 * A professional role. A fixed default set ships with the app; admins can
 * extend it with custom roles (isDefault: false).
 */
export interface Role {
  id: string
  label: string
  /** True for the shipped default roles; false for admin-added roles. */
  isDefault: boolean
  /** Future: inbound queue/number routing calls for this role. */
  inboundQueue?: string
}

/**
 * A team of people (e.g. a ward or shift team).
 */
export interface Team {
  id: string
  name: string
  /** Person ids that belong to this team. */
  memberNurseIds: string[]
}

/**
 * A person. `roleIds` lists the professional roles this person can hold
 * (a person may hold several roles, e.g. both undersköterska and sjukgymnast).
 */
export interface Nurse {
  id: string
  name: string
  teamId: string
  /** SIP extension used to reach this person (for callbacks/routing). */
  extension: string
  /** Role ids this person is eligible to hold responsibility for. */
  roleIds: string[]
}

/**
 * The responsibility assignment for one patient.
 *
 * `responsibilities` maps roleId → personId: the single person accountable for
 * that role for this patient. A missing entry means no one is assigned for
 * that role. `assignedAt` tracks per-role last-change timestamps.
 */
export interface PatientAssignment {
  patientId: string
  patientName: string
  teamId: string
  /** Queue name used when the responsible person cannot be reached. */
  fallbackQueue: string
  /** roleId → personId (the responsible person for that role). */
  responsibilities: Record<string, string>
  /** roleId → ISO timestamp of the last assignment change for that role. */
  assignedAt: Record<string, string>
}

/**
 * The full admin state, persisted to localStorage in demo mode.
 * (Connected mode could source teams/nurses from PBX directory; left for later.)
 */
export interface AdminDirectory {
  version: number
  roles: Role[]
  teams: Team[]
  nurses: Nurse[]
  assignments: PatientAssignment[]
}
