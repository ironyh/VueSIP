/**
 * useCallQualityHistory - Call Quality History Persistence
 *
 * Stores call quality metrics history using IndexedDB for persistence.
 * Records quality snapshots per call with aggregate statistics.
 *
 * @module composables/useCallQualityHistory
 */
import { ref, computed, type Ref, type DeepReadonly } from 'vue'
import type { CallQualityStats, QualityLevel } from './useCallQualityStats'

/**
 * Quality snapshot taken during a call
 */
export interface QualitySnapshot {
  /** Timestamp when snapshot was taken */
  timestamp: Date
  /** RTT in milliseconds */
  rtt: number | null
  /** Jitter in milliseconds */
  jitter: number | null
  /** Packet loss percentage */
  packetLossPercent: number | null
  /** Bitrate in kbps */
  bitrateKbps: number | null
  /** Computed quality level at this moment */
  qualityLevel: QualityLevel
}

/**
 * Call quality record stored in history
 */
export interface CallQualityRecord {
  /** Unique record ID */
  id: string
  /** Call start time */
  startedAt: Date
  /** Call end time */
  endedAt: Date
  /** Call duration in seconds */
  durationSeconds: number
  /** Remote party identifier (phone number or URI) */
  remoteParty: string
  /** Call direction */
  direction: 'incoming' | 'outgoing'
  /** Overall call quality grade */
  overallGrade: QualityLevel
  /** Metrics at call start */
  startMetrics: QualitySnapshot | null
  /** Metrics at call end */
  endMetrics: QualitySnapshot | null
  /** Worst metrics observed during call */
  worstMetrics: QualitySnapshot | null
  /** Average metrics over the call */
  avgMetrics: {
    rtt: number | null
    jitter: number | null
    packetLossPercent: number | null
    bitrateKbps: number | null
  }
  /** Number of quality samples taken */
  sampleCount: number
  /** Quality trend over time (for sparkline) */
  qualityTimeline: Array<{ timestamp: Date; level: QualityLevel }>
}

/**
 * Options for useCallQualityHistory
 */
export interface UseCallQualityHistoryOptions {
  /** Maximum age of records in days (default: 30) */
  maxAgeDays?: number
  /** Maximum number of records to store (default: 1000) */
  maxRecords?: number
  /** Sampling interval for timeline data (ms, default: 5000) */
  timelineSampleIntervalMs?: number
}

/**
 * Composable return type
 */
export interface UseCallQualityHistoryReturn {
  /** All call quality records, sorted by date (newest first) */
  records: DeepReadonly<Ref<CallQualityRecord[]>>
  /** Number of records in history */
  recordCount: DeepReadonly<Ref<number>>
  /** Whether history is being loaded */
  isLoading: DeepReadonly<Ref<boolean>>
  /** Current active call recording (null if no active call) */
  activeRecording: DeepReadonly<Ref<CallQualityRecord | null>>
  /** Start recording a new call */
  startCall: (remoteParty: string, direction: 'incoming' | 'outgoing') => string
  /** Record a quality snapshot for the active call */
  recordSnapshot: (stats: CallQualityStats) => void
  /** End recording and save to history */
  endCall: () => Promise<void>
  /** Delete a record by ID */
  deleteRecord: (id: string) => Promise<void>
  /** Clear all history */
  clearHistory: () => Promise<void>
  /** Get records filtered by quality grade */
  getRecordsByGrade: (grade: QualityLevel) => CallQualityRecord[]
  /** Export records as JSON */
  exportHistory: () => string
}

// IndexedDB constants
const DB_NAME = 'VueSIP_QualityHistory'
const DB_VERSION = 1
const STORE_NAME = 'callQualityRecords'

/**
 * Initialize IndexedDB database
 */
function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('startedAt', 'startedAt', { unique: false })
        store.createIndex('overallGrade', 'overallGrade', { unique: false })
        store.createIndex('remoteParty', 'remoteParty', { unique: false })
      }
    }
  })
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Quality level numeric value for comparison
 */
function qualityLevelValue(level: QualityLevel): number {
  const values: Record<QualityLevel, number> = {
    excellent: 5,
    good: 4,
    fair: 3,
    poor: 2,
    unknown: 1,
  }
  return values[level] || 1
}

/**
 * Determine overall grade from worst observed quality
 */
function calculateOverallGrade(
  worstLevel: QualityLevel | null,
  avgPacketLoss: number | null,
  avgRtt: number | null
): QualityLevel {
  if (worstLevel === 'poor') return 'poor'
  if (worstLevel === 'fair') return 'fair'

  // Use average metrics for fine-tuning
  if (avgPacketLoss !== null && avgRtt !== null) {
    if (avgPacketLoss < 1 && avgRtt < 150) return 'excellent'
    if (avgPacketLoss < 3 && avgRtt < 300) return 'good'
    if (avgPacketLoss < 5 && avgRtt < 500) return 'fair'
    return 'poor'
  }

  return worstLevel || 'unknown'
}

/**
 * Vue composable for persisting call quality history
 *
 * @param options - Configuration options
 * @returns Composable interface for history management
 *
 * @example
 * ```ts
 * const history = useCallQualityHistory()
 * const callId = history.startCall('+46123456789', 'outgoing')
 * // During call: history.recordSnapshot(stats)
 * // End call: await history.endCall()
 * ```
 */
export function useCallQualityHistory(
  options: UseCallQualityHistoryOptions = {}
): UseCallQualityHistoryReturn {
  const { maxAgeDays = 30, maxRecords = 1000, timelineSampleIntervalMs = 5000 } = options

  // Reactive state
  const records = ref<CallQualityRecord[]>([])
  const isLoading = ref(false)
  const activeRecording = ref<CallQualityRecord | null>(null)
  const dbInstance = ref<IDBDatabase | null>(null)

  // Internal tracking for active call
  let samples: QualitySnapshot[] = []
  let lastTimelineSample = 0
  let currentCallStartTime = 0

  /**
   * Initialize database and load records
   */
  async function init(): Promise<void> {
    if (dbInstance.value) return

    isLoading.value = true
    try {
      dbInstance.value = await initDatabase()
      await loadRecords()
      await cleanupOldRecords()
    } catch (error) {
      console.warn('[useCallQualityHistory] Failed to initialize:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load all records from IndexedDB
   */
  async function loadRecords(): Promise<void> {
    if (!dbInstance.value) return

    const transaction = dbInstance.value.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Deserialize dates and sort by start time (newest first)
        const rawRecords = request.result as CallQualityRecord[]
        records.value = rawRecords
          .map((r) => ({
            ...r,
            startedAt: new Date(r.startedAt),
            endedAt: new Date(r.endedAt),
            startMetrics: r.startMetrics
              ? { ...r.startMetrics, timestamp: new Date(r.startMetrics.timestamp) }
              : null,
            endMetrics: r.endMetrics
              ? { ...r.endMetrics, timestamp: new Date(r.endMetrics.timestamp) }
              : null,
            worstMetrics: r.worstMetrics
              ? { ...r.worstMetrics, timestamp: new Date(r.worstMetrics.timestamp) }
              : null,
            qualityTimeline: r.qualityTimeline.map((t) => ({
              ...t,
              timestamp: new Date(t.timestamp),
            })),
          }))
          .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save a record to IndexedDB
   */
  async function saveRecord(record: CallQualityRecord): Promise<void> {
    if (!dbInstance.value) return

    const transaction = dbInstance.value.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete records older than maxAgeDays
   */
  async function cleanupOldRecords(): Promise<void> {
    if (!dbInstance.value) return

    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
    const transaction = dbInstance.value.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('startedAt')

    const range = IDBKeyRange.upperBound(cutoffDate.toISOString())
    const request = index.openCursor(range)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Start recording a new call
   */
  function startCall(remoteParty: string, direction: 'incoming' | 'outgoing'): string {
    const id = generateId()
    currentCallStartTime = Date.now()
    samples = []
    lastTimelineSample = 0

    activeRecording.value = {
      id,
      startedAt: new Date(),
      endedAt: new Date(), // Will be updated on end
      durationSeconds: 0,
      remoteParty,
      direction,
      overallGrade: 'unknown',
      startMetrics: null,
      endMetrics: null,
      worstMetrics: null,
      avgMetrics: {
        rtt: null,
        jitter: null,
        packetLossPercent: null,
        bitrateKbps: null,
      },
      sampleCount: 0,
      qualityTimeline: [],
    }

    // Initialize database in background
    void init()

    return id
  }

  /**
   * Record a quality snapshot
   */
  function recordSnapshot(stats: CallQualityStats): void {
    if (!activeRecording.value) return

    const snapshot: QualitySnapshot = {
      timestamp: new Date(),
      rtt: stats.rtt,
      jitter: stats.jitter,
      packetLossPercent: stats.packetLossPercent,
      bitrateKbps: stats.bitrateKbps,
      qualityLevel: computeQualityLevel(stats.rtt, stats.packetLossPercent),
    }

    samples.push(snapshot)

    // Set start metrics on first sample
    if (samples.length === 1) {
      activeRecording.value.startMetrics = snapshot
    }

    // Update end metrics (always the latest)
    activeRecording.value.endMetrics = snapshot

    // Track worst metrics
    const currentWorst = activeRecording.value.worstMetrics
    if (
      !currentWorst ||
      qualityLevelValue(snapshot.qualityLevel) < qualityLevelValue(currentWorst.qualityLevel)
    ) {
      activeRecording.value.worstMetrics = snapshot
    }

    // Sample timeline data periodically
    const now = Date.now()
    if (now - lastTimelineSample >= timelineSampleIntervalMs) {
      activeRecording.value.qualityTimeline.push({
        timestamp: snapshot.timestamp,
        level: snapshot.qualityLevel,
      })
      lastTimelineSample = now
    }

    activeRecording.value.sampleCount = samples.length
  }

  /**
   * Compute quality level from RTT and packet loss
   */
  function computeQualityLevel(rtt: number | null, packetLossPercent: number | null): QualityLevel {
    if (rtt === null && packetLossPercent === null) {
      return 'unknown'
    }

    const effectiveRtt = rtt ?? 0
    const effectiveLoss = packetLossPercent ?? 0

    if (effectiveRtt < 150 && effectiveLoss < 1) return 'excellent'
    if (effectiveRtt < 300 && effectiveLoss < 3) return 'good'
    if (effectiveRtt < 500 && effectiveLoss < 5) return 'fair'
    return 'poor'
  }

  /**
   * Calculate average metrics from samples
   */
  function calculateAverages(): CallQualityRecord['avgMetrics'] {
    if (samples.length === 0) {
      return { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null }
    }

    const validSamples = samples.filter(
      (s) => s.rtt !== null || s.jitter !== null || s.packetLossPercent !== null
    )

    if (validSamples.length === 0) {
      return { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null }
    }

    const avg = (values: (number | null)[]): number | null => {
      const valid = values.filter((v): v is number => v !== null)
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
    }

    return {
      rtt: avg(validSamples.map((s) => s.rtt)),
      jitter: avg(validSamples.map((s) => s.jitter)),
      packetLossPercent: avg(validSamples.map((s) => s.packetLossPercent)),
      bitrateKbps: avg(validSamples.map((s) => s.bitrateKbps)),
    }
  }

  /**
   * End call recording and save to history
   */
  async function endCall(): Promise<void> {
    if (!activeRecording.value) return

    const recording = activeRecording.value
    recording.endedAt = new Date()
    recording.durationSeconds = Math.round((Date.now() - currentCallStartTime) / 1000)
    recording.avgMetrics = calculateAverages()
    recording.overallGrade = calculateOverallGrade(
      recording.worstMetrics?.qualityLevel || null,
      recording.avgMetrics.packetLossPercent,
      recording.avgMetrics.rtt
    )

    // Save to IndexedDB
    await saveRecord(recording)

    // Update local records list
    records.value = [recording, ...records.value].slice(0, maxRecords)

    // Clear active recording
    activeRecording.value = null
    samples = []
  }

  /**
   * Delete a record by ID
   */
  async function deleteRecord(id: string): Promise<void> {
    if (!dbInstance.value) return

    const transaction = dbInstance.value.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => {
        records.value = records.value.filter((r) => r.id !== id)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all history
   */
  async function clearHistory(): Promise<void> {
    if (!dbInstance.value) return

    const transaction = dbInstance.value.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => {
        records.value = []
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get records filtered by quality grade
   */
  function getRecordsByGrade(grade: QualityLevel): CallQualityRecord[] {
    return records.value.filter((r) => r.overallGrade === grade)
  }

  /**
   * Export history as JSON string
   */
  function exportHistory(): string {
    return JSON.stringify(records.value, null, 2)
  }

  // Initialize on first use
  void init()

  return {
    records: computed(() => records.value) as unknown as DeepReadonly<Ref<CallQualityRecord[]>>,
    recordCount: computed(() => records.value.length) as unknown as DeepReadonly<Ref<number>>,
    isLoading: computed(() => isLoading.value) as unknown as DeepReadonly<Ref<boolean>>,
    activeRecording: computed(() => activeRecording.value) as unknown as DeepReadonly<
      Ref<CallQualityRecord | null>
    >,
    startCall,
    recordSnapshot,
    endCall,
    deleteRecord,
    clearHistory,
    getRecordsByGrade,
    exportHistory,
  }
}

export default useCallQualityHistory
