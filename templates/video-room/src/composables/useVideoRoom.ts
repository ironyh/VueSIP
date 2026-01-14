/**
 * Video Room Composable
 *
 * Provides comprehensive room management for multi-participant video conferencing.
 * Manages participants, media streams, active speaker detection, and layout.
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'

/**
 * Video room participant interface
 */
export interface VideoRoomParticipant {
  /** Unique participant ID */
  id: string
  /** Display name */
  name: string
  /** Video stream (camera) */
  videoStream: MediaStream | null
  /** Audio stream */
  audioStream: MediaStream | null
  /** Screen share stream */
  screenStream: MediaStream | null
  /** Is audio muted */
  isMuted: boolean
  /** Is video disabled */
  isVideoOff: boolean
  /** Is currently speaking */
  isSpeaking: boolean
  /** Is screen sharing */
  isScreenSharing: boolean
  /** Audio level (0-1) */
  audioLevel: number
  /** Join timestamp */
  joinedAt: Date
}

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string
  participantId: string
  participantName: string
  content: string
  timestamp: Date
  type: 'message' | 'system'
}

/**
 * Return type for useVideoRoom composable
 */
export interface UseVideoRoomReturn {
  // State
  participants: Ref<VideoRoomParticipant[]>
  localParticipant: Ref<VideoRoomParticipant | null>
  activeSpeakerId: ComputedRef<string | null>
  pinnedParticipantId: Ref<string | null>
  isVideoEnabled: Ref<boolean>
  isAudioEnabled: Ref<boolean>
  isJoined: Ref<boolean>
  roomId: Ref<string | null>

  // Methods
  joinRoom: (roomId: string, name: string) => Promise<void>
  leaveRoom: () => void
  toggleVideo: () => void
  toggleAudio: () => void
  pinParticipant: (participantId: string) => void
  unpinParticipant: () => void
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Video Room Composable
 *
 * Manages multi-participant video room state including:
 * - Local and remote participant management
 * - Media stream handling (video/audio)
 * - Active speaker detection
 * - Participant pinning
 *
 * @returns Video room state and control methods
 *
 * @example
 * ```typescript
 * const {
 *   participants,
 *   localParticipant,
 *   joinRoom,
 *   leaveRoom,
 *   toggleVideo,
 *   toggleAudio,
 * } = useVideoRoom()
 *
 * // Join a room
 * await joinRoom('meeting-123', 'John Doe')
 *
 * // Toggle camera
 * toggleVideo()
 *
 * // Leave room
 * leaveRoom()
 * ```
 */
export function useVideoRoom(): UseVideoRoomReturn {
  // ============================================================================
  // State
  // ============================================================================

  const participants = ref<VideoRoomParticipant[]>([])
  const localParticipant = ref<VideoRoomParticipant | null>(null)
  const pinnedParticipantId = ref<string | null>(null)
  const isVideoEnabled = ref(true)
  const isAudioEnabled = ref(true)
  const isJoined = ref(false)
  const roomId = ref<string | null>(null)

  // Internal state
  let localStream: MediaStream | null = null
  let audioContext: AudioContext | null = null
  let audioAnalyser: AnalyserNode | null = null
  let audioLevelInterval: ReturnType<typeof setInterval> | null = null

  // Demo participants for simulation
  const demoParticipants: Omit<VideoRoomParticipant, 'id' | 'joinedAt'>[] = [
    {
      name: 'Alice Johnson',
      videoStream: null,
      audioStream: null,
      screenStream: null,
      isMuted: false,
      isVideoOff: false,
      isSpeaking: false,
      isScreenSharing: false,
      audioLevel: 0,
    },
    {
      name: 'Bob Smith',
      videoStream: null,
      audioStream: null,
      screenStream: null,
      isMuted: true,
      isVideoOff: false,
      isSpeaking: false,
      isScreenSharing: false,
      audioLevel: 0,
    },
    {
      name: 'Charlie Brown',
      videoStream: null,
      audioStream: null,
      screenStream: null,
      isMuted: false,
      isVideoOff: true,
      isSpeaking: false,
      isScreenSharing: false,
      audioLevel: 0,
    },
  ]

  // ============================================================================
  // Computed
  // ============================================================================

  /**
   * Active speaker is the participant with the highest audio level
   */
  const activeSpeakerId = computed<string | null>(() => {
    const allParticipants = [
      ...(localParticipant.value ? [localParticipant.value] : []),
      ...participants.value,
    ]

    const speaking = allParticipants
      .filter((p) => !p.isMuted && p.audioLevel > 0.1)
      .sort((a, b) => b.audioLevel - a.audioLevel)

    return speaking[0]?.id ?? null
  })

  // ============================================================================
  // Audio Level Detection
  // ============================================================================

  /**
   * Start monitoring local audio levels
   */
  function startAudioLevelMonitoring(stream: MediaStream): void {
    try {
      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      audioAnalyser = audioContext.createAnalyser()
      audioAnalyser.fftSize = 256

      source.connect(audioAnalyser)

      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount)

      audioLevelInterval = setInterval(() => {
        if (!audioAnalyser || !localParticipant.value) return

        audioAnalyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
        const normalizedLevel = average / 255

        localParticipant.value.audioLevel = normalizedLevel
        localParticipant.value.isSpeaking = normalizedLevel > 0.1

        // Simulate random audio levels for demo participants
        participants.value.forEach((p) => {
          if (!p.isMuted) {
            p.audioLevel = Math.random() * 0.3
            p.isSpeaking = p.audioLevel > 0.1
          } else {
            p.audioLevel = 0
            p.isSpeaking = false
          }
        })
      }, 100)
    } catch (error) {
      console.error('Failed to start audio level monitoring:', error)
    }
  }

  /**
   * Stop audio level monitoring
   */
  function stopAudioLevelMonitoring(): void {
    if (audioLevelInterval) {
      clearInterval(audioLevelInterval)
      audioLevelInterval = null
    }
    if (audioContext) {
      audioContext.close().catch(console.error)
      audioContext = null
    }
    audioAnalyser = null
  }

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Join a video room
   */
  async function joinRoom(id: string, name: string): Promise<void> {
    if (isJoined.value) {
      throw new Error('Already joined a room')
    }

    try {
      // Get local media stream
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      // Create local participant
      localParticipant.value = {
        id: generateId(),
        name,
        videoStream: localStream,
        audioStream: localStream,
        screenStream: null,
        isMuted: false,
        isVideoOff: false,
        isSpeaking: false,
        isScreenSharing: false,
        audioLevel: 0,
        joinedAt: new Date(),
      }

      // Start audio level monitoring
      startAudioLevelMonitoring(localStream)

      // Add demo participants (simulating other users in the room)
      participants.value = demoParticipants.map((p) => ({
        ...p,
        id: generateId(),
        joinedAt: new Date(Date.now() - Math.random() * 600000), // Random join time within last 10 min
      }))

      roomId.value = id
      isJoined.value = true
      isVideoEnabled.value = true
      isAudioEnabled.value = true
    } catch (error) {
      console.error('Failed to join room:', error)
      throw error
    }
  }

  /**
   * Leave the current room
   */
  function leaveRoom(): void {
    // Stop audio monitoring
    stopAudioLevelMonitoring()

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      localStream = null
    }

    // Reset state
    localParticipant.value = null
    participants.value = []
    pinnedParticipantId.value = null
    roomId.value = null
    isJoined.value = false
    isVideoEnabled.value = true
    isAudioEnabled.value = true
  }

  /**
   * Toggle local video
   */
  function toggleVideo(): void {
    if (!localStream || !localParticipant.value) return

    const videoTrack = localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      isVideoEnabled.value = videoTrack.enabled
      localParticipant.value.isVideoOff = !videoTrack.enabled
    }
  }

  /**
   * Toggle local audio
   */
  function toggleAudio(): void {
    if (!localStream || !localParticipant.value) return

    const audioTrack = localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      isAudioEnabled.value = audioTrack.enabled
      localParticipant.value.isMuted = !audioTrack.enabled
    }
  }

  /**
   * Pin a participant
   */
  function pinParticipant(participantId: string): void {
    pinnedParticipantId.value = participantId
  }

  /**
   * Unpin the current participant
   */
  function unpinParticipant(): void {
    pinnedParticipantId.value = null
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    leaveRoom()
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    participants,
    localParticipant,
    activeSpeakerId,
    pinnedParticipantId,
    isVideoEnabled,
    isAudioEnabled,
    isJoined,
    roomId,

    // Methods
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    pinParticipant,
    unpinParticipant,
  }
}
