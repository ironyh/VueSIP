/**
 * Call recording composable for PWA softphone
 * Wraps useLocalRecording and links recordings to call history by call ID
 */
import { ref } from 'vue'
import { useLocalRecording } from 'vuesip'
import type { LocalRecordingData } from 'vuesip'

const DB_NAME = 'vuesip-call-recordings'
const DB_VERSION = 1
const STORE_NAME = 'recordings'

interface RecordingMetadata {
  callId: string
  startTime: number
  endTime?: number
  duration: number
  blobData: ArrayBuffer
  mimeType: string
  size: number
}

let db: IDBDatabase | null = null

async function openDatabase(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'callId' })
        store.createIndex('startTime', 'startTime')
      }
    }
  })
}

export function useCallRecording() {
  const persistenceEnabled = ref(false)
  const currentCallId = ref<string | null>(null)
  const recordingAudioContext = ref<AudioContext | null>(null)

  // Local recording composable
  const recording = useLocalRecording({
    mimeType: 'audio/webm',
    filenamePrefix: 'vuesip-call',
  })

  // Load persistence setting
  function loadPersistenceSetting() {
    const saved = localStorage.getItem('vuesip-recording-persistence')
    persistenceEnabled.value = saved === 'true'
  }

  function setPersistenceEnabled(enabled: boolean) {
    persistenceEnabled.value = enabled
    localStorage.setItem('vuesip-recording-persistence', String(enabled))
  }

  /**
   * Mix local and remote streams for full recording
   */
  function createMixedStream(
    localStream: MediaStream | null,
    remoteStream: MediaStream | null
  ): MediaStream | null {
    if (!localStream && !remoteStream) return null

    // Create audio context if it doesn't exist
    if (!recordingAudioContext.value || recordingAudioContext.value.state === 'closed') {
      recordingAudioContext.value = new AudioContext()
    }

    const ctx = recordingAudioContext.value
    const destination = ctx.createMediaStreamDestination()

    let hasTracks = false

    if (localStream && localStream.getAudioTracks().length > 0) {
      const source = ctx.createMediaStreamSource(localStream)
      source.connect(destination)
      hasTracks = true
    }

    if (remoteStream && remoteStream.getAudioTracks().length > 0) {
      const source = ctx.createMediaStreamSource(remoteStream)
      source.connect(destination)
      hasTracks = true
    }

    return hasTracks ? destination.stream : null
  }

  // Start recording for a call
  async function startRecording(callId: string, stream: MediaStream): Promise<void> {
    currentCallId.value = callId
    await recording.start(stream, {
      startedAt: new Date().toISOString(),
    })
  }

  // Stop recording and save if persistence enabled
  async function stopRecording(): Promise<LocalRecordingData | null> {
    if (!currentCallId.value) return null

    const recordingData = await recording.stop()

    // Clean up AudioContext if it was used for mixing
    if (recordingAudioContext.value) {
      try {
        await recordingAudioContext.value.close()
      } catch (err) {
        console.warn('Failed to close recording AudioContext:', err)
      }
      recordingAudioContext.value = null
    }

    if (!recordingData) return null

    if (persistenceEnabled.value && recordingData) {
      await saveRecording(currentCallId.value, recordingData)
    }

    currentCallId.value = null
    return recordingData
  }

  // Save recording to IndexedDB
  async function saveRecording(callId: string, data: LocalRecordingData): Promise<void> {
    try {
      const database = await openDatabase()
      const now = Date.now()

      const buffer = await data.blob.arrayBuffer()
      const metadata: RecordingMetadata = {
        callId,
        startTime: now,
        endTime: now,
        duration: data.duration / 1000, // Convert ms to seconds
        blobData: buffer,
        mimeType: data.mimeType,
        size: data.blob.size,
      }

      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.put(metadata)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to save recording:', error)
    }
  }

  // Get recording for a call
  async function getRecording(callId: string): Promise<Blob | null> {
    try {
      const database = await openDatabase()
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(callId)

        request.onsuccess = () => {
          resolve(request.result?.blob || null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get recording:', error)
      return null
    }
  }

  // Get recording URL for playback
  async function getRecordingUrl(callId: string): Promise<string | null> {
    const blob = await getRecording(callId)
    if (!blob) return null
    return URL.createObjectURL(blob)
  }

  // Delete recording
  async function deleteRecording(callId: string): Promise<void> {
    try {
      const database = await openDatabase()
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.delete(callId)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to delete recording:', error)
    }
  }

  // Initialize
  loadPersistenceSetting()

  return {
    ...recording,
    persistenceEnabled,
    setPersistenceEnabled,
    createMixedStream,
    startRecording,
    stopRecording,
    getRecording,
    getRecordingUrl,
    deleteRecording,
  }
}
