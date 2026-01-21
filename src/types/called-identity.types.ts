/**
 * Called identity extraction types
 *
 * Used for multi-DID / multi-line inbound routing and UI labeling.
 *
 * @packageDocumentation
 */

import type { CalledIdentitySource } from './config.types'

export interface CalledIdentityCandidate {
  source: CalledIdentitySource
  /** Present for `source: 'x-header'`. */
  headerName?: string
  raw: string
  normalized?: string
}

export interface CalledIdentityResolved {
  source: CalledIdentitySource
  headerName?: string
  raw: string
  normalized?: string
}

export interface CalledIdentityExtraction {
  candidates: CalledIdentityCandidate[]
  dialed?: CalledIdentityResolved
  target?: CalledIdentityResolved
}
