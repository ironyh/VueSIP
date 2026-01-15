/**
 * useIvrTester - IVR Testing and Navigation Composable
 *
 * Provides comprehensive IVR system testing functionality including:
 * - Visual tree building as user navigates
 * - DTMF input tracking and timeline
 * - Real-time transcription integration
 * - Session management and export
 *
 * @module composables/useIvrTester
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

/**
 * Represents a node in the IVR menu tree
 */
export interface IvrNode {
  /** Unique identifier for this node */
  id: string
  /** DTMF digit that led to this node (null for root) */
  dtmf: string | null
  /** Transcribed prompt text at this node */
  prompt: string
  /** Timestamp when this node was reached */
  timestamp: number
  /** Duration of the prompt in milliseconds */
  promptDuration?: number
  /** Child nodes (Map of DTMF digit to node) */
  children: Map<string, IvrNode>
  /** User annotations for this node */
  annotations?: string
  /** Parent node reference */
  parent: IvrNode | null
  /** Whether this node is an endpoint (no further navigation) */
  isEndpoint?: boolean
}

/**
 * Single transcript entry from voice recognition
 */
export interface TranscriptEntry {
  /** Unique ID */
  id: string
  /** Transcribed text */
  text: string
  /** Timestamp */
  timestamp: number
  /** Confidence score (0-1) */
  confidence?: number
  /** Associated IVR node ID */
  nodeId?: string
  /** Whether this is a final transcription */
  isFinal: boolean
}

/**
 * DTMF input entry for timeline
 */
export interface DtmfEntry {
  /** Unique ID */
  id: string
  /** DTMF digit pressed */
  digit: string
  /** Timestamp when pressed */
  timestamp: number
  /** Node ID where this DTMF was sent */
  fromNodeId: string
  /** Resulting node ID after navigation */
  toNodeId?: string
}

/**
 * Complete IVR test session
 */
export interface IvrSession {
  /** Unique session identifier */
  id: string
  /** Target phone number called */
  targetNumber: string
  /** Session name/label */
  name: string
  /** When the test started */
  startTime: Date
  /** When the test ended (null if ongoing) */
  endTime: Date | null
  /** Root of the IVR tree */
  tree: IvrNode
  /** All transcript entries */
  transcript: TranscriptEntry[]
  /** All DTMF inputs */
  dtmfHistory: DtmfEntry[]
  /** Session notes */
  notes?: string
}

/**
 * Export formats for session data
 */
export type ExportFormat = 'json' | 'markdown' | 'csv'

/**
 * Return type for useIvrTester composable
 */
export interface UseIvrTesterReturn {
  // ============================================================================
  // SIP Connection
  // ============================================================================

  /** Configure SIP client (pass provider config) */
  configure: (config: Record<string, unknown>) => Promise<void> | void
  /** Connect to SIP server */
  connect: () => Promise<void>
  /** Disconnect from SIP server */
  disconnect: () => Promise<void>
  /** Registered/connected state */
  isConnected: Ref<boolean>
  /** Connecting state */
  isConnecting: Ref<boolean>
  /** Call state from session */
  callState: Ref<string>
  // ============================================================================
  // Session State
  // ============================================================================

  /** Current active session */
  currentSession: Ref<IvrSession | null>
  /** List of saved sessions */
  savedSessions: Ref<IvrSession[]>
  /** Whether a test is currently active */
  isTestActive: Ref<boolean>

  // ============================================================================
  // Navigation State
  // ============================================================================

  /** Current position in the IVR tree */
  currentNode: Ref<IvrNode | null>
  /** Path from root to current node */
  currentPath: ComputedRef<IvrNode[]>
  /** Breadcrumb string representation */
  breadcrumbs: ComputedRef<string>
  /** Root node for binding in UI */
  ivrTree: ComputedRef<IvrNode | null>
  /** Current node ID for UI */
  currentNodeId: ComputedRef<string | null>

  // ============================================================================
  // Call State
  // ============================================================================

  /** Whether a call is currently active */
  isCallActive: Ref<boolean>
  /** Whether transcription is recording */
  isRecording: Ref<boolean>
  /** Alias used by UI */
  isTranscribing: Ref<boolean>
  /** Current call duration in seconds */
  callDuration: Ref<number>
  /** Call status message */
  callStatus: Ref<string>

  // ============================================================================
  // Transcript State
  // ============================================================================

  /** Current/interim transcription text */
  currentTranscript: Ref<string>
  /** All transcript entries for current session */
  transcriptEntries: ComputedRef<TranscriptEntry[]>

  // ============================================================================
  // DTMF State
  // ============================================================================

  /** DTMF history for current session */
  dtmfHistory: ComputedRef<DtmfEntry[]>
  /** Last DTMF digit sent */
  lastDtmfSent: Ref<string | null>

  // ============================================================================
  // Test Session Actions
  // ============================================================================

  /** Start a new IVR test session */
  startTest: (targetNumber: string, sessionName?: string) => Promise<void>
  /** End the current test session */
  endTest: () => void
  /** Pause recording (keeps call active) */
  pauseRecording: () => void
  /** Resume recording */
  resumeRecording: () => void

  // ============================================================================
  // DTMF Actions
  // ============================================================================

  /** Send a DTMF digit */
  sendDtmf: (digit: string) => void
  /** Send a sequence of DTMF digits */
  sendDtmfSequence: (digits: string, delay?: number) => Promise<void>

  // ============================================================================
  // Tree Navigation Actions
  // ============================================================================

  /** Navigate to a specific node in the tree */
  navigateTo: (nodeId: string) => void
  /** Navigate back to parent node */
  navigateBack: () => void
  /** Navigate to root */
  navigateToRoot: () => void
  /** Get path as array of DTMF digits */
  getPathDigits: () => string[]

  // ============================================================================
  // Annotation Actions
  // ============================================================================

  /** Add/update annotation for a node */
  annotateNode: (nodeId: string, text: string) => void
  /** Mark a node as an endpoint */
  markAsEndpoint: (nodeId: string, isEndpoint: boolean) => void
  /** Add note to current session */
  addSessionNote: (note: string) => void

  // ============================================================================
  // Transcript Actions
  // ============================================================================

  /** Add a transcript entry manually */
  addTranscriptEntry: (text: string, isFinal?: boolean) => void
  /** Clear transcript for current node */
  clearCurrentTranscript: () => void

  // ============================================================================
  // Session Management
  // ============================================================================

  /** Save current session */
  saveSession: () => void
  /** Load a saved session */
  loadSession: (sessionId: string) => void
  /** Delete a saved session */
  deleteSession: (sessionId: string) => void
  /** Export session in specified format */
  exportSession: (format: ExportFormat, sessionId?: string) => string
  /** Import session from JSON */
  importSession: (jsonData: string) => void
  /** Clear all saved sessions */
  clearAllSessions: () => void

  // ============================================================================
  // Tree Export
  // ============================================================================

  /** Export tree structure as JSON */
  exportTree: () => string
  /** Get flat list of all nodes */
  getAllNodes: () => IvrNode[]
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create a new IVR node
 */
function createNode(dtmf: string | null, parent: IvrNode | null): IvrNode {
  return {
    id: generateId(),
    dtmf,
    prompt: '',
    timestamp: Date.now(),
    children: new Map(),
    parent,
    isEndpoint: false,
  }
}

/**
 * Serialize an IVR node (handle Map and circular references)
 */
function serializeNode(node: IvrNode): object {
  return {
    id: node.id,
    dtmf: node.dtmf,
    prompt: node.prompt,
    timestamp: node.timestamp,
    promptDuration: node.promptDuration,
    annotations: node.annotations,
    isEndpoint: node.isEndpoint,
    children: Array.from(node.children.entries()).map(([key, child]) => ({
      key,
      node: serializeNode(child),
    })),
  }
}

/**
 * Deserialize an IVR node
 */
function deserializeNode(data: ReturnType<typeof serializeNode>, parent: IvrNode | null): IvrNode {
  const typedData = data as {
    id: string
    dtmf: string | null
    prompt: string
    timestamp: number
    promptDuration?: number
    annotations?: string
    isEndpoint?: boolean
    children: Array<{ key: string; node: ReturnType<typeof serializeNode> }>
  }

  const node: IvrNode = {
    id: typedData.id,
    dtmf: typedData.dtmf,
    prompt: typedData.prompt,
    timestamp: typedData.timestamp,
    promptDuration: typedData.promptDuration,
    annotations: typedData.annotations,
    isEndpoint: typedData.isEndpoint,
    children: new Map(),
    parent,
  }

  for (const child of typedData.children) {
    node.children.set(child.key, deserializeNode(child.node, node))
  }

  return node
}

/**
 * Storage key for saved sessions
 */
const STORAGE_KEY = 'vuesip-ivr-sessions'

/**
 * IVR Tester Composable
 *
 * Provides comprehensive IVR system testing and debugging capabilities.
 *
 * @returns IVR tester state and methods
 *
 * @example
 * ```typescript
 * const {
 *   currentSession,
 *   currentNode,
 *   isCallActive,
 *   startTest,
 *   sendDtmf,
 *   exportSession
 * } = useIvrTester()
 *
 * // Start a test
 * await startTest('+1234567890', 'Customer Service IVR')
 *
 * // Navigate IVR
 * sendDtmf('1')  // Press 1 for English
 * sendDtmf('2')  // Press 2 for billing
 *
 * // Export results
 * const markdown = exportSession('markdown')
 * ```
 */
export function useIvrTester(): UseIvrTesterReturn {
  // ============================================================================
  // Internal State
  // ============================================================================

  // SIP client + call session
  const sipClient = useSipClient()
  const { connect: sipConnect, disconnect: sipDisconnect, isConnected, isConnecting, updateConfig, getClient } = sipClient
  const clientRef = computed(() => getClient())
  const callSession = useCallSession(clientRef)
  const {
    makeCall,
    hangup,
    sendDTMF: sendDTMFCall,
    state: callState,
    duration: callDurationRef,
  } = callSession

  const currentSession = ref<IvrSession | null>(null)
  const savedSessions = ref<IvrSession[]>([])
  const isTestActive = ref(false)
  const currentNode = ref<IvrNode | null>(null)
  const isCallActive = ref(false)
  const isRecording = ref(false)
  const callDuration = ref(0)
  const callStatus = ref('Idle')
  const currentTranscript = ref('')
  const lastDtmfSent = ref<string | null>(null)

  // Timer for call duration
  let durationTimer: ReturnType<typeof setInterval> | null = null

  // ============================================================================
  // Computed Values
  // ============================================================================

  const currentPath = computed<IvrNode[]>(() => {
    const path: IvrNode[] = []
    let node = currentNode.value

    while (node) {
      path.unshift(node)
      node = node.parent
    }

    return path
  })

  const breadcrumbs = computed(() => {
    if (!currentSession.value) return ''
    return currentPath.value.map((node) => node.dtmf ?? 'Start').join(' > ')
  })

  // Bindings for UI expectations
  const ivrTree = computed<IvrNode | null>(() => currentSession.value?.tree ?? null)
  const currentNodeId = computed<string | null>(() => currentNode.value?.id ?? null)

  const transcriptEntries = computed(() => {
    return currentSession.value?.transcript ?? []
  })

  const dtmfHistory = computed(() => {
    return currentSession.value?.dtmfHistory ?? []
  })

  // Keep exposed call flags in sync with call session
  watch(
    () => callState.value,
    (state) => {
      // calling, ringing, active, held, idle, ended
      isCallActive.value = state === 'calling' || state === 'ringing' || state === 'active' || state === 'held'
      switch (state) {
        case 'calling':
          callStatus.value = 'Calling...'
          break
        case 'ringing':
          callStatus.value = 'Ringing...'
          break
        case 'active':
          callStatus.value = 'Connected'
          break
        case 'held':
          callStatus.value = 'On hold'
          break
        case 'idle':
        case 'ended':
        default:
          callStatus.value = isConnected.value ? 'Ready' : 'Disconnected'
      }
    },
    { immediate: true }
  )

  // Mirror duration from call session when available
  watch(
    () => callDurationRef.value,
    (d) => {
      if (typeof d === 'number') callDuration.value = d
    }
  )

  // ============================================================================
  // Session Persistence
  // ============================================================================

  /**
   * Load saved sessions from localStorage
   */
  function loadSavedSessions(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{
          id: string
          targetNumber: string
          name: string
          startTime: string
          endTime: string | null
          tree: ReturnType<typeof serializeNode>
          transcript: TranscriptEntry[]
          dtmfHistory: DtmfEntry[]
          notes?: string
        }>

        savedSessions.value = parsed.map((session) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : null,
          tree: deserializeNode(session.tree, null),
        }))
      }
    } catch (error) {
      console.error('Failed to load saved sessions:', error)
      savedSessions.value = []
    }
  }

  /**
   * Save sessions to localStorage
   */
  function persistSessions(): void {
    try {
      const serialized = savedSessions.value.map((session) => ({
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() ?? null,
        tree: serializeNode(session.tree),
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
    } catch (error) {
      console.error('Failed to save sessions:', error)
    }
  }

  // Load sessions on init
  loadSavedSessions()

  // ============================================================================
  // Test Session Actions
  // ============================================================================

  /**
   * Start a new IVR test session
   */
  async function startTest(targetNumber: string, sessionName?: string): Promise<void> {
    // End any existing test
    if (isTestActive.value) {
      endTest()
    }

    const rootNode = createNode(null, null)
    rootNode.prompt = 'Root - Call Started'

    currentSession.value = {
      id: generateId(),
      targetNumber,
      name: sessionName ?? `IVR Test ${new Date().toLocaleString()}`,
      startTime: new Date(),
      endTime: null,
      tree: rootNode,
      transcript: [],
      dtmfHistory: [],
    }

    currentNode.value = rootNode
    isTestActive.value = true
    isRecording.value = true
    callDuration.value = 0
    callStatus.value = isConnected.value ? 'Ready' : 'Disconnected'

    // Place the call via VueSIP if connected
    try {
      if (!isConnected.value) {
        throw new Error('Not connected to SIP server')
      }
      await makeCall(targetNumber)
    } catch (err) {
      console.error('Failed to start call:', err)
      // Keep session for manual mapping, but mark call inactive
      isCallActive.value = false
    }
  }

  /**
   * End the current test session
   */
  function endTest(): void {
    if (!currentSession.value) return

    currentSession.value.endTime = new Date()
    isTestActive.value = false
    isCallActive.value = false
    isRecording.value = false
    callStatus.value = 'Ended'

    // Stop duration timer
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }

    // Auto-save the session
    saveSession()

    // Hang up any active call
    try {
      hangup()
    } catch {}
  }

  /**
   * Pause recording
   */
  function pauseRecording(): void {
    isRecording.value = false
  }

  /**
   * Resume recording
   */
  function resumeRecording(): void {
    if (isCallActive.value) {
      isRecording.value = true
    }
  }

  // ============================================================================
  // DTMF Actions
  // ============================================================================

  /**
   * Send a DTMF digit and update tree
   */
  function sendDtmf(digit: string): void {
    if (!currentSession.value || !currentNode.value) return

    // Validate DTMF digit
    if (!/^[0-9*#A-D]$/i.test(digit)) {
      console.error(`Invalid DTMF digit: ${digit}`)
      return
    }

    const normalizedDigit = digit.toUpperCase()
    const fromNode = currentNode.value

    // Check if child node exists, create if not
    let childNode = fromNode.children.get(normalizedDigit)
    if (!childNode) {
      childNode = createNode(normalizedDigit, fromNode)
      fromNode.children.set(normalizedDigit, childNode)
    }

    // Record DTMF entry
    const dtmfEntry: DtmfEntry = {
      id: generateId(),
      digit: normalizedDigit,
      timestamp: Date.now(),
      fromNodeId: fromNode.id,
      toNodeId: childNode.id,
    }
    currentSession.value.dtmfHistory.push(dtmfEntry)

    // Update current node
    currentNode.value = childNode
    lastDtmfSent.value = normalizedDigit

    // Clear current transcript for new node
    currentTranscript.value = ''

    // Send actual DTMF to the active call
    try {
      sendDTMFCall(normalizedDigit)
    } catch (e) {
      // Non-fatal: allow offline mapping mode too
      console.warn('Failed to send DTMF to call:', e)
    }
  }

  /**
   * Send a sequence of DTMF digits with delay
   */
  async function sendDtmfSequence(digits: string, delay = 500): Promise<void> {
    for (const digit of digits) {
      sendDtmf(digit)
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // ============================================================================
  // Tree Navigation Actions
  // ============================================================================

  /**
   * Find a node by ID in the tree
   */
  function findNode(nodeId: string, root: IvrNode): IvrNode | null {
    if (root.id === nodeId) return root

    for (const child of root.children.values()) {
      const found = findNode(nodeId, child)
      if (found) return found
    }

    return null
  }

  /**
   * Navigate to a specific node
   */
  function navigateTo(nodeId: string): void {
    if (!currentSession.value) return

    const node = findNode(nodeId, currentSession.value.tree)
    if (node) {
      currentNode.value = node
    }
  }

  /**
   * Navigate back to parent node
   */
  function navigateBack(): void {
    if (currentNode.value?.parent) {
      currentNode.value = currentNode.value.parent
    }
  }

  /**
   * Navigate to root
   */
  function navigateToRoot(): void {
    if (currentSession.value) {
      currentNode.value = currentSession.value.tree
    }
  }

  /**
   * Get current path as DTMF digit sequence
   */
  function getPathDigits(): string[] {
    return currentPath.value.filter((node) => node.dtmf !== null).map((node) => node.dtmf as string)
  }

  // ============================================================================
  // Annotation Actions
  // ============================================================================

  /**
   * Add/update annotation for a node
   */
  function annotateNode(nodeId: string, text: string): void {
    if (!currentSession.value) return

    const node = findNode(nodeId, currentSession.value.tree)
    if (node) {
      node.annotations = text
    }
  }

  /**
   * Mark a node as an endpoint
   */
  function markAsEndpoint(nodeId: string, isEndpoint: boolean): void {
    if (!currentSession.value) return

    const node = findNode(nodeId, currentSession.value.tree)
    if (node) {
      node.isEndpoint = isEndpoint
    }
  }

  /**
   * Add note to current session
   */
  function addSessionNote(note: string): void {
    if (currentSession.value) {
      currentSession.value.notes = note
    }
  }

  // ============================================================================
  // Transcript Actions
  // ============================================================================

  /**
   * Add a transcript entry
   */
  function addTranscriptEntry(text: string, isFinal = true): void {
    if (!currentSession.value || !currentNode.value) return

    const entry: TranscriptEntry = {
      id: generateId(),
      text,
      timestamp: Date.now(),
      nodeId: currentNode.value.id,
      isFinal,
    }

    currentSession.value.transcript.push(entry)

    // Update node prompt with final transcriptions
    if (isFinal && text.trim()) {
      const existingPrompt = currentNode.value.prompt
      currentNode.value.prompt = existingPrompt ? `${existingPrompt} ${text}` : text
    }

    currentTranscript.value = isFinal ? '' : text
  }

  /**
   * Clear current transcript
   */
  function clearCurrentTranscript(): void {
    currentTranscript.value = ''
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Save current session
   */
  function saveSession(): void {
    if (!currentSession.value) return

    // Check if session already exists
    const existingIndex = savedSessions.value.findIndex((s) => s.id === currentSession.value?.id)

    if (existingIndex >= 0) {
      savedSessions.value[existingIndex] = currentSession.value
    } else {
      savedSessions.value.push(currentSession.value)
    }

    persistSessions()
  }

  /**
   * Load a saved session
   */
  function loadSession(sessionId: string): void {
    const session = savedSessions.value.find((s) => s.id === sessionId)
    if (session) {
      currentSession.value = session
      currentNode.value = session.tree
      isTestActive.value = session.endTime === null
      isCallActive.value = false
      isRecording.value = false
      callStatus.value = 'Loaded from history'
    }
  }

  /**
   * Delete a saved session
   */
  function deleteSession(sessionId: string): void {
    savedSessions.value = savedSessions.value.filter((s) => s.id !== sessionId)
    persistSessions()

    // Clear current session if it was deleted
    if (currentSession.value?.id === sessionId) {
      currentSession.value = null
      currentNode.value = null
      isTestActive.value = false
    }
  }

  /**
   * Export session in specified format
   */
  function exportSession(format: ExportFormat, sessionId?: string): string {
    const session = sessionId
      ? savedSessions.value.find((s) => s.id === sessionId)
      : currentSession.value

    if (!session) {
      throw new Error('No session to export')
    }

    switch (format) {
      case 'json':
        return JSON.stringify(
          {
            ...session,
            startTime: session.startTime.toISOString(),
            endTime: session.endTime?.toISOString() ?? null,
            tree: serializeNode(session.tree),
          },
          null,
          2
        )

      case 'markdown':
        return exportAsMarkdown(session)

      case 'csv':
        return exportAsCsv(session)

      default:
        throw new Error(`Unknown format: ${format}`)
    }
  }

  /**
   * Export session as Markdown
   */
  function exportAsMarkdown(session: IvrSession): string {
    const lines: string[] = [
      `# IVR Test: ${session.name}`,
      '',
      `**Target Number:** ${session.targetNumber}`,
      `**Start Time:** ${session.startTime.toLocaleString()}`,
      `**End Time:** ${session.endTime?.toLocaleString() ?? 'Ongoing'}`,
      '',
      '## IVR Menu Structure',
      '',
    ]

    // Build tree representation
    function printNode(node: IvrNode, indent: number): void {
      const prefix = '  '.repeat(indent)
      const dtmfLabel = node.dtmf ? `[${node.dtmf}]` : '[Start]'
      lines.push(`${prefix}- ${dtmfLabel} ${node.prompt || '(no prompt)'}`)

      if (node.annotations) {
        lines.push(`${prefix}  *Note: ${node.annotations}*`)
      }

      if (node.isEndpoint) {
        lines.push(`${prefix}  *[ENDPOINT]*`)
      }

      for (const child of node.children.values()) {
        printNode(child, indent + 1)
      }
    }

    printNode(session.tree, 0)

    lines.push('')
    lines.push('## DTMF History')
    lines.push('')
    lines.push('| Time | Digit | From | To |')
    lines.push('|------|-------|------|-----|')

    for (const entry of session.dtmfHistory) {
      const time = new Date(entry.timestamp).toLocaleTimeString()
      lines.push(
        `| ${time} | ${entry.digit} | ${entry.fromNodeId.slice(0, 8)} | ${entry.toNodeId?.slice(0, 8) ?? '-'} |`
      )
    }

    lines.push('')
    lines.push('## Transcript')
    lines.push('')

    for (const entry of session.transcript) {
      const time = new Date(entry.timestamp).toLocaleTimeString()
      lines.push(`**[${time}]** ${entry.text}`)
    }

    if (session.notes) {
      lines.push('')
      lines.push('## Notes')
      lines.push('')
      lines.push(session.notes)
    }

    return lines.join('\n')
  }

  /**
   * Export session as CSV
   */
  function exportAsCsv(session: IvrSession): string {
    const lines: string[] = ['Timestamp,Type,Value,Node ID,Notes']

    // Add DTMF entries
    for (const entry of session.dtmfHistory) {
      const time = new Date(entry.timestamp).toISOString()
      lines.push(`${time},DTMF,${entry.digit},${entry.fromNodeId},`)
    }

    // Add transcript entries
    for (const entry of session.transcript) {
      const time = new Date(entry.timestamp).toISOString()
      const escapedText = entry.text.replace(/"/g, '""')
      lines.push(`${time},Transcript,"${escapedText}",${entry.nodeId ?? ''},`)
    }

    return lines.join('\n')
  }

  /**
   * Import session from JSON
   */
  function importSession(jsonData: string): void {
    try {
      const parsed = JSON.parse(jsonData) as {
        id: string
        targetNumber: string
        name: string
        startTime: string
        endTime: string | null
        tree: ReturnType<typeof serializeNode>
        transcript: TranscriptEntry[]
        dtmfHistory: DtmfEntry[]
        notes?: string
      }

      const session: IvrSession = {
        ...parsed,
        id: generateId(), // Generate new ID to avoid conflicts
        startTime: new Date(parsed.startTime),
        endTime: parsed.endTime ? new Date(parsed.endTime) : null,
        tree: deserializeNode(parsed.tree, null),
      }

      savedSessions.value.push(session)
      persistSessions()
    } catch (error) {
      console.error('Failed to import session:', error)
      throw new Error('Invalid session data')
    }
  }

  /**
   * Clear all saved sessions
   */
  function clearAllSessions(): void {
    savedSessions.value = []
    persistSessions()
  }

  // ============================================================================
  // Tree Export
  // ============================================================================

  /**
   * Export tree structure as JSON
   */
  function exportTree(): string {
    if (!currentSession.value) {
      throw new Error('No active session')
    }

    return JSON.stringify(serializeNode(currentSession.value.tree), null, 2)
  }

  /**
   * Get flat list of all nodes
   */
  function getAllNodes(): IvrNode[] {
    if (!currentSession.value) return []

    const nodes: IvrNode[] = []

    function collectNodes(node: IvrNode): void {
      nodes.push(node)
      for (const child of node.children.values()) {
        collectNodes(child)
      }
    }

    collectNodes(currentSession.value.tree)
    return nodes
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  // Watch for component unmount is handled by Vue's onUnmounted in the component

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    // SIP Connection
    configure: (config: Record<string, unknown>) => updateConfig(config as any),
    connect: sipConnect,
    disconnect: sipDisconnect,
    isConnected,
    isConnecting,
    callState: callState as Ref<string>,

    // Session State
    currentSession,
    savedSessions,
    isTestActive,

    // Navigation State
    currentNode,
    currentPath,
    breadcrumbs,
    ivrTree,
    currentNodeId,

    // Call State
    isCallActive,
    isRecording,
    isTranscribing: isRecording,
    callDuration,
    callStatus,

    // Transcript State
    currentTranscript,
    transcriptEntries,

    // DTMF State
    dtmfHistory,
    lastDtmfSent,

    // Test Session Actions
    startTest,
    endTest,
    pauseRecording,
    resumeRecording,

    // DTMF Actions
    sendDtmf,
    sendDtmfSequence,

    // Tree Navigation Actions
    navigateTo,
    navigateBack,
    navigateToRoot,
    getPathDigits,

    // Annotation Actions
    annotateNode,
    markAsEndpoint,
    addSessionNote,

    // Transcript Actions
    addTranscriptEntry,
    clearCurrentTranscript,

    // Session Management
    saveSession,
    loadSession,
    deleteSession,
    exportSession,
    importSession,
    clearAllSessions,

    // Tree Export
    exportTree,
    getAllNodes,
  }
}
