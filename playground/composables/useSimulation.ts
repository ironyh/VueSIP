/**
 * Simulation composable for demo pages
 * Provides mock call states, events, and data for testing UI without a real SIP connection
 */
import { ref, computed, watch, onUnmounted } from 'vue'

export type SimulatedCallState = 'idle' | 'ringing' | 'connecting' | 'active' | 'on-hold' | 'ended'

export interface SimulationScenario {
  id: string
  name: string
  description: string
  icon: string
}

export interface SimulatedCall {
  state: SimulatedCallState
  duration: number
  remoteUri: string
  remoteDisplayName: string
  direction: 'inbound' | 'outbound'
  isOnHold: boolean
  isMuted: boolean
  startTime: Date | null
}

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  { id: 'incoming', name: 'Incoming Call', description: 'Simulate receiving a call', icon: '📥' },
  { id: 'outgoing', name: 'Outgoing Call', description: 'Simulate making a call', icon: '📤' },
  { id: 'active', name: 'Active Call', description: 'Jump to active call state', icon: '📞' },
  { id: 'hold', name: 'Call on Hold', description: 'Simulate a held call', icon: '⏸️' },
  { id: 'transfer', name: 'Call Transfer', description: 'Simulate transfer scenario', icon: '↔️' },
  { id: 'conference', name: 'Conference Call', description: 'Multi-party call simulation', icon: '👥' },
]

export function useSimulation() {
  // Simulation state
  const isSimulationMode = ref(false)
  const activeScenario = ref<string | null>(null)

  // Simulated call data
  const simulatedCall = ref<SimulatedCall>({
    state: 'idle',
    duration: 0,
    remoteUri: 'sip:demo@example.com',
    remoteDisplayName: 'Demo User',
    direction: 'outbound',
    isOnHold: false,
    isMuted: false,
    startTime: null,
  })

  // Timer interval reference
  let durationInterval: ReturnType<typeof setInterval> | null = null

  // Computed properties matching real SIP client interface
  const state = computed(() => simulatedCall.value.state)
  const duration = computed(() => simulatedCall.value.duration)
  const remoteUri = computed(() => simulatedCall.value.remoteUri)
  const remoteDisplayName = computed(() => simulatedCall.value.remoteDisplayName)
  const isOnHold = computed(() => simulatedCall.value.isOnHold)
  const isMuted = computed(() => simulatedCall.value.isMuted)
  const isConnected = computed(() => isSimulationMode.value)
  const isRegistered = computed(() => isSimulationMode.value)

  // Start duration timer
  const startDurationTimer = () => {
    if (durationInterval) clearInterval(durationInterval)
    simulatedCall.value.startTime = new Date()
    durationInterval = setInterval(() => {
      simulatedCall.value.duration++
    }, 1000)
  }

  // Stop duration timer
  const stopDurationTimer = () => {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
  }

  // Enable simulation mode
  const enableSimulation = () => {
    isSimulationMode.value = true
  }

  // Disable simulation mode
  const disableSimulation = () => {
    isSimulationMode.value = false
    stopDurationTimer()
    resetCall()
  }

  // Toggle simulation mode
  const toggleSimulation = () => {
    if (isSimulationMode.value) {
      disableSimulation()
    } else {
      enableSimulation()
    }
  }

  // Reset call to idle
  const resetCall = () => {
    stopDurationTimer()
    simulatedCall.value = {
      state: 'idle',
      duration: 0,
      remoteUri: 'sip:demo@example.com',
      remoteDisplayName: 'Demo User',
      direction: 'outbound',
      isOnHold: false,
      isMuted: false,
      startTime: null,
    }
    activeScenario.value = null
  }

  // Run a specific scenario
  const runScenario = async (scenarioId: string) => {
    activeScenario.value = scenarioId
    resetCall()

    switch (scenarioId) {
      case 'incoming':
        await simulateIncomingCall()
        break
      case 'outgoing':
        await simulateOutgoingCall()
        break
      case 'active':
        simulateActiveCall()
        break
      case 'hold':
        simulateHoldCall()
        break
      case 'transfer':
        await simulateTransfer()
        break
      case 'conference':
        simulateConference()
        break
    }
  }

  // Simulate incoming call
  const simulateIncomingCall = async () => {
    simulatedCall.value.direction = 'inbound'
    simulatedCall.value.remoteDisplayName = 'John Smith'
    simulatedCall.value.remoteUri = 'sip:john@company.com'
    simulatedCall.value.state = 'ringing'
  }

  // Simulate outgoing call
  const simulateOutgoingCall = async () => {
    simulatedCall.value.direction = 'outbound'
    simulatedCall.value.state = 'connecting'

    // Auto-progress to active after 2 seconds
    setTimeout(() => {
      if (simulatedCall.value.state === 'connecting') {
        simulatedCall.value.state = 'active'
        startDurationTimer()
      }
    }, 2000)
  }

  // Jump directly to active call
  const simulateActiveCall = () => {
    simulatedCall.value.state = 'active'
    simulatedCall.value.duration = Math.floor(Math.random() * 300) + 30 // Random 30-330 seconds
    startDurationTimer()
  }

  // Simulate call on hold
  const simulateHoldCall = () => {
    simulatedCall.value.state = 'on-hold'
    simulatedCall.value.isOnHold = true
    simulatedCall.value.duration = Math.floor(Math.random() * 180) + 60
    startDurationTimer()
  }

  // Simulate transfer scenario
  const simulateTransfer = async () => {
    simulatedCall.value.state = 'active'
    simulatedCall.value.duration = 45
    startDurationTimer()
  }

  // Simulate conference
  const simulateConference = () => {
    simulatedCall.value.state = 'active'
    simulatedCall.value.remoteDisplayName = 'Conference (3 participants)'
    simulatedCall.value.duration = 120
    startDurationTimer()
  }

  // Call control actions
  const answer = () => {
    if (simulatedCall.value.state === 'ringing') {
      simulatedCall.value.state = 'active'
      startDurationTimer()
    }
  }

  const hangup = () => {
    simulatedCall.value.state = 'ended'
    stopDurationTimer()

    // Reset to idle after 2 seconds
    setTimeout(() => {
      if (simulatedCall.value.state === 'ended') {
        resetCall()
      }
    }, 2000)
  }

  const hold = () => {
    if (simulatedCall.value.state === 'active') {
      simulatedCall.value.state = 'on-hold'
      simulatedCall.value.isOnHold = true
    }
  }

  const unhold = () => {
    if (simulatedCall.value.state === 'on-hold') {
      simulatedCall.value.state = 'active'
      simulatedCall.value.isOnHold = false
    }
  }

  const toggleHold = () => {
    if (simulatedCall.value.isOnHold) {
      unhold()
    } else {
      hold()
    }
  }

  const mute = () => {
    simulatedCall.value.isMuted = true
  }

  const unmute = () => {
    simulatedCall.value.isMuted = false
  }

  const toggleMute = () => {
    simulatedCall.value.isMuted = !simulatedCall.value.isMuted
  }

  const makeCall = (uri: string) => {
    simulatedCall.value.remoteUri = uri
    simulatedCall.value.remoteDisplayName = uri.replace('sip:', '').split('@')[0]
    simulatedCall.value.direction = 'outbound'
    simulateOutgoingCall()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopDurationTimer()
  })

  return {
    // State
    isSimulationMode,
    activeScenario,
    simulatedCall,

    // Computed (matching real SIP client interface)
    state,
    duration,
    remoteUri,
    remoteDisplayName,
    isOnHold,
    isMuted,
    isConnected,
    isRegistered,

    // Mode controls
    enableSimulation,
    disableSimulation,
    toggleSimulation,

    // Scenario controls
    runScenario,
    resetCall,

    // Call controls
    answer,
    hangup,
    hold,
    unhold,
    toggleHold,
    mute,
    unmute,
    toggleMute,
    makeCall,

    // Scenarios list
    scenarios: SIMULATION_SCENARIOS,
  }
}
