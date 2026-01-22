/**
 * Transcript persistence composable for PWA softphone
 * Stores transcripts in IndexedDB linked to call history by call ID
 */
import { ref } from 'vue'
import type { TranscriptEntry } from 'vuesip'

const DB_NAME = 'vuesip-transcripts'
const DB_VERSION = 1
const STORE_NAME = 'transcripts'

interface StoredTranscript {
  callId: string
  entries: TranscriptEntry[]
  createdAt: number
  updatedAt: number
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
        store.createIndex('createdAt', 'createdAt')
        store.createIndex('updatedAt', 'updatedAt')
      }
    }
  })
}

export function useTranscriptPersistence() {
  const persistenceEnabled = ref(false)

  // Load persistence setting from localStorage
  function loadPersistenceSetting() {
    const saved = localStorage.getItem('vuesip-transcript-persistence')
    persistenceEnabled.value = saved === 'true'
  }

  // Save persistence setting
  function setPersistenceEnabled(enabled: boolean) {
    persistenceEnabled.value = enabled
    localStorage.setItem('vuesip-transcript-persistence', String(enabled))
  }

  // Save transcript for a call
  async function saveTranscript(callId: string, entries: TranscriptEntry[]): Promise<void> {
    if (!persistenceEnabled.value) {
      return // Persistence disabled, don't save
    }

    try {
      const database = await openDatabase()
      const now = Date.now()

      const stored: StoredTranscript = {
        callId,
        entries,
        createdAt: now,
        updatedAt: now,
      }

      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)

        // Check if transcript already exists
        const getRequest = store.get(callId)
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            // Update existing
            stored.createdAt = getRequest.result.createdAt
          }
          const putRequest = store.put(stored)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        }
        getRequest.onerror = () => reject(getRequest.error)
      })
    } catch (error) {
      console.error('Failed to save transcript:', error)
    }
  }

  // Get transcript for a call
  async function getTranscript(callId: string): Promise<TranscriptEntry[] | null> {
    try {
      const database = await openDatabase()
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(callId)

        request.onsuccess = () => {
          resolve(request.result?.entries || null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get transcript:', error)
      return null
    }
  }

  // Delete transcript for a call
  async function deleteTranscript(callId: string): Promise<void> {
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
      console.error('Failed to delete transcript:', error)
    }
  }

  // Export transcript in different formats
  function exportTranscript(entries: TranscriptEntry[], format: 'txt' | 'json' | 'srt'): string {
    switch (format) {
      case 'txt':
        return entries
          .map((e) => {
            const name = e.participantName || (e.speaker === 'local' ? 'You' : 'Caller')
            return `${name}: ${e.text}`
          })
          .join('\n\n')

      case 'json':
        return JSON.stringify(entries, null, 2)

      case 'srt':
        return entries
          .map((e, idx) => {
            const start = formatTimestamp(e.timestamp)
            const end = formatTimestamp(
              e.timestamp + (e.words?.[e.words.length - 1]?.endTime || 3000)
            )
            return `${idx + 1}\n${start} --> ${end}\n${e.text}\n`
          })
          .join('\n')

      default:
        return ''
    }
  }

  function formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const milliseconds = ms % 1000
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
  }

  // Initialize
  loadPersistenceSetting()

  return {
    persistenceEnabled,
    setPersistenceEnabled,
    saveTranscript,
    getTranscript,
    deleteTranscript,
    exportTranscript,
  }
}
