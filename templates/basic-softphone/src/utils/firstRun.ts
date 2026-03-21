/**
 * First-run detection utility
 *
 * Tracks whether the user has completed the initial setup experience.
 * Uses localStorage for persistence.
 */

const FIRST_RUN_KEY = 'vuesip_first_run_completed'
const FIRST_RUN_VERSION = '1' // Bump when onboarding changes significantly

export interface FirstRunState {
  completed: boolean
  version: string
  completedAt: string | null
}

/**
 * Check if this is the first run
 */
export function isFirstRun(): boolean {
  try {
    const data = localStorage.getItem(FIRST_RUN_KEY)
    if (!data) return true

    const state: FirstRunState = JSON.parse(data)
    // Consider it first run if version changed
    return state.version !== FIRST_RUN_VERSION
  } catch {
    return true
  }
}

/**
 * Get the current first-run state
 */
export function getFirstRunState(): FirstRunState {
  try {
    const data = localStorage.getItem(FIRST_RUN_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    // Ignore parse errors
  }

  return {
    completed: false,
    version: FIRST_RUN_VERSION,
    completedAt: null,
  }
}

/**
 * Mark first run as completed
 */
export function markFirstRunCompleted(): void {
  const state: FirstRunState = {
    completed: true,
    version: FIRST_RUN_VERSION,
    completedAt: new Date().toISOString(),
  }

  try {
    localStorage.setItem(FIRST_RUN_KEY, JSON.stringify(state))
  } catch {
    // Storage might be full or disabled
  }
}

/**
 * Reset first run state (useful for testing)
 */
export function resetFirstRun(): void {
  try {
    localStorage.removeItem(FIRST_RUN_KEY)
  } catch {
    // Ignore errors
  }
}

/**
 * Check if user has seen a specific onboarding step
 */
export function hasCompletedStep(stepId: string): boolean {
  try {
    const key = `vuesip_onboarding_${stepId}`
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

/**
 * Mark an onboarding step as completed
 */
export function markStepCompleted(stepId: string): void {
  try {
    const key = `vuesip_onboarding_${stepId}`
    localStorage.setItem(key, 'true')
  } catch {
    // Ignore errors
  }
}
