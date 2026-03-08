/**
 * PBX recording adapters
 *
 * Adapters implement {@link PbxRecordingProvider} for specific PBX systems,
 * so the UI can list and play recordings without depending on PBX-specific APIs.
 *
 * @module pbx-adapters
 */

export {
  createFreePbxRecordingProvider,
  type FreePbxRecordingConfig,
  type FreePbxCdrRow,
  type FreePbxFetchAllCdrsResponse,
} from './freepbx'
