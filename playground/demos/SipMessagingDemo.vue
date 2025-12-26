<template>
  <div class="sip-messaging-demo">
    <h2>SIP Instant Messaging</h2>
    <p class="description">Send and receive instant messages over SIP using the MESSAGE method.</p>

    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveCallState"
      :duration="simulation.duration.value"
      :remote-uri="simulation.remoteUri.value"
      :remote-display-name="simulation.remoteDisplayName.value"
      :is-on-hold="simulation.isOnHold.value"
      :is-muted="simulation.isMuted.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- Connection Status -->
    <div class="status-section">
      <div :class="['status-badge', connectionState]">
        {{ connectionState.toUpperCase() }}
      </div>
      <div class="unread-badge" v-if="unreadCount > 0">{{ unreadCount }} unread</div>
      <div v-if="!isConnected" class="connection-hint">
        Configure SIP credentials in <strong>Settings</strong> or <strong>Basic Call</strong> demo
      </div>
    </div>

    <!-- Messaging Interface -->
    <div v-if="isConnected" class="messaging-container">
      <div class="messaging-layout">
        <!-- Conversations Sidebar -->
        <aside class="conversations-sidebar">
          <div class="sidebar-header">
            <h3>Conversations</h3>
            <Button
              label="+"
              class="new-chat-btn"
              @click="showNewConversation = true"
              aria-label="Start new conversation"
            />
          </div>

          <div class="conversations-list">
            <div
              v-for="conv in conversations"
              :key="conv.id"
              :class="['conversation-item', { active: currentConversationId === conv.id }]"
              @click="selectConversation(conv.id)"
            >
              <div class="conversation-avatar">
                {{ getInitials(conv.name) }}
              </div>
              <div class="conversation-info">
                <div class="conversation-header">
                  <div class="conversation-name">{{ conv.name }}</div>
                  <div class="conversation-time">{{ conv.lastMessageTime }}</div>
                </div>
                <div class="conversation-preview">
                  <span v-if="conv.unreadCount > 0" class="unread-indicator">
                    {{ conv.unreadCount }}
                  </span>
                  <span class="preview-text">{{ conv.lastMessage }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-contacts">
            <h4>Quick Start</h4>
            <Button
              label="Simulate Incoming"
              class="quick-btn"
              @click="simulateIncomingMessage"
              aria-label="Simulate incoming message for testing"
            />
          </div>
        </aside>

        <!-- Chat Area -->
        <main class="chat-area">
          <div v-if="currentConversation" class="chat-container">
            <!-- Chat Header -->
            <div class="chat-header">
              <div class="chat-info">
                <div class="chat-avatar">
                  {{ getInitials(currentConversation.name) }}
                </div>
                <div class="chat-details">
                  <div class="chat-name">{{ currentConversation.name }}</div>
                  <div class="chat-uri">{{ currentConversation.uri }}</div>
                </div>
              </div>
              <div class="chat-actions">
                <Button
                  label="Clear"
                  class="icon-btn"
                  severity="secondary"
                  @click="clearConversation"
                  title="Clear conversation"
                />
              </div>
            </div>

            <!-- Messages -->
            <div class="messages-container" ref="messagesContainer">
              <div
                v-for="message in currentConversation.messages"
                :key="message.id"
                :class="['message', message.direction]"
              >
                <div class="message-bubble">
                  <div class="message-content">{{ message.content }}</div>
                  <div class="message-meta">
                    <span class="message-time">{{ message.timestamp }}</span>
                    <span v-if="message.direction === 'outbound'" class="message-status">
                      {{ getMessageStatusIcon(message.status) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Typing Indicator -->
              <div v-if="currentConversation.isTyping" class="typing-indicator">
                <div class="typing-bubble">
                  <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Message Input -->
            <div class="message-input-container">
              <Textarea
                v-model="messageText"
                @keydown.enter.exact.prevent="sendMessage"
                @input="handleTyping"
                placeholder="Type a message..."
                :autoResize="true"
                rows="1"
                ref="messageInput"
              />
              <Button
                label="Send"
                class="send-btn"
                :disabled="!messageText.trim()"
                @click="sendMessage"
                aria-label="Send message"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <div class="empty-icon">No conversation selected</div>
            <p>Select a conversation from the sidebar or start a new one</p>
          </div>
        </main>
      </div>
    </div>

    <!-- New Conversation Modal -->
    <div v-if="showNewConversation" class="modal-overlay" @click="showNewConversation = false">
      <div class="modal-content" @click.stop>
        <h3>New Conversation</h3>
        <div class="form-group">
          <label>Recipient SIP URI</label>
          <InputText
            v-model="newConversationUri"
            type="text"
            placeholder="sip:user@example.com"
            @keyup.enter="startNewConversation"
          />
        </div>
        <div class="modal-actions">
          <Button
            label="Start Chat"
            :disabled="!newConversationUri.trim()"
            @click="startNewConversation"
          />
          <Button
            label="Cancel"
            class="cancel-btn"
            severity="secondary"
            @click="showNewConversation = false"
          />
        </div>
      </div>
    </div>

    <!-- Messaging Settings -->
    <div v-if="isConnected" class="settings-section">
      <h3>Messaging Settings</h3>
      <div class="settings-grid">
        <label>
          <Checkbox v-model="sendTypingIndicator" :binary="true" />
          Send typing indicator
        </label>
        <label>
          <Checkbox v-model="sendDeliveryReceipt" :binary="true" />
          Send delivery receipts
        </label>
        <label>
          <Checkbox v-model="playNotificationSound" :binary="true" />
          Play notification sound
        </label>
        <label>
          <Checkbox v-model="showNotifications" :binary="true" />
          Show desktop notifications
        </label>
      </div>
    </div>

    <!-- Message Statistics -->
    <div
      v-if="isConnected && messageStats.totalSent + messageStats.totalReceived > 0"
      class="stats-section"
    >
      <h3>Message Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ messageStats.totalSent }}</div>
          <div class="stat-label">Messages Sent</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ messageStats.totalReceived }}</div>
          <div class="stat-label">Messages Received</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ conversations.length }}</div>
          <div class="stat-label">Conversations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ messageStats.failedMessages }}</div>
          <div class="stat-label">Failed</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch as _watch, nextTick, onMounted } from 'vue'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, InputText, Textarea, Checkbox } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Configuration
const sipServerUri = ref('sip:example.com')
const username = ref('')
const password = ref('')

// SIP Client - use shared playground instance
const {
  connectionState: realConnectionState,
  isConnected: realIsConnected,
  isConnecting: _isConnecting,
  connect,
  disconnect,
  getClient: _getClient,
} = playgroundSipClient

// Effective values - use simulation or real data based on mode
const connectionState = computed(() =>
  isSimulationMode.value
    ? simulation.isConnected.value
      ? 'connected'
      : 'disconnected'
    : realConnectionState.value
)
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)
const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : 'idle'
)

// Message State
interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  timestamp: string
  status: 'sending' | 'sent' | 'delivered' | 'failed'
}

interface Conversation {
  id: string
  name: string
  uri: string
  messages: Message[]
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isTyping: boolean
}

const conversations = ref<Conversation[]>([])
const currentConversationId = ref<string | null>(null)
const messageText = ref('')
const showNewConversation = ref(false)
const newConversationUri = ref('')

// Settings
const sendTypingIndicator = ref(true)
const sendDeliveryReceipt = ref(true)
const playNotificationSound = ref(true)
const showNotifications = ref(true)

// Stats
const messageStats = ref({
  totalSent: 0,
  totalReceived: 0,
  failedMessages: 0,
})

// Refs
const messagesContainer = ref<HTMLDivElement | null>(null)
const messageInput = ref<HTMLTextAreaElement | null>(null)

// Typing state
let typingTimer: number | null = null

// Computed
const currentConversation = computed(() => {
  return conversations.value.find((c) => c.id === currentConversationId.value)
})

const unreadCount = computed(() => {
  return conversations.value.reduce((sum, conv) => sum + conv.unreadCount, 0)
})

// Connection Toggle
const _toggleConnection = async () => {
  if (isConnected.value) {
    await disconnect()
  } else {
    await connect({
      uri: sipServerUri.value,
      username: username.value,
      password: password.value,
    })
  }
}

// Select Conversation
const selectConversation = (convId: string) => {
  currentConversationId.value = convId

  // Mark as read
  const conv = conversations.value.find((c) => c.id === convId)
  if (conv) {
    conv.unreadCount = 0
  }

  // Focus input
  nextTick(() => {
    messageInput.value?.focus()
    scrollToBottom()
  })
}

// Start New Conversation
const startNewConversation = () => {
  if (!newConversationUri.value.trim()) return

  const uri = newConversationUri.value.trim()

  // Check if conversation already exists
  const existing = conversations.value.find((c) => c.uri === uri)
  if (existing) {
    currentConversationId.value = existing.id
    showNewConversation.value = false
    newConversationUri.value = ''
    return
  }

  // Create new conversation
  const convId = `conv-${Date.now()}`
  const name = uri.split('@')[0].replace('sip:', '')

  const newConv: Conversation = {
    id: convId,
    name,
    uri,
    messages: [],
    lastMessage: 'No messages yet',
    lastMessageTime: '',
    unreadCount: 0,
    isTyping: false,
  }

  conversations.value.unshift(newConv)
  currentConversationId.value = convId
  showNewConversation.value = false
  newConversationUri.value = ''

  nextTick(() => {
    messageInput.value?.focus()
  })
}

// Send Message
const sendMessage = async () => {
  if (!messageText.value.trim() || !currentConversation.value) return

  const message: Message = {
    id: `msg-${Date.now()}`,
    content: messageText.value.trim(),
    direction: 'outbound',
    timestamp: new Date().toLocaleTimeString(),
    status: 'sending',
  }

  currentConversation.value.messages.push(message)
  currentConversation.value.lastMessage = message.content
  currentConversation.value.lastMessageTime = message.timestamp

  messageStats.value.totalSent++

  messageText.value = ''

  scrollToBottom()

  // Simulate message sending
  setTimeout(() => {
    message.status = 'sent'

    if (sendDeliveryReceipt.value) {
      setTimeout(() => {
        message.status = 'delivered'
      }, 1000)
    }
  }, 500)

  console.log('Sent MESSAGE to:', currentConversation.value.uri, message.content)
}

// Handle Typing
const handleTyping = () => {
  if (!sendTypingIndicator.value || !currentConversation.value) return

  // Clear existing timer
  if (typingTimer) {
    clearTimeout(typingTimer)
  }

  // Send typing notification
  console.log('Sending typing indicator to:', currentConversation.value.uri)

  // Stop typing after 2 seconds of inactivity
  typingTimer = window.setTimeout(() => {
    console.log('Stopped typing')
  }, 2000)
}

// Receive Message
const receiveMessage = (fromUri: string, content: string) => {
  // Find or create conversation
  let conv = conversations.value.find((c) => c.uri === fromUri)

  if (!conv) {
    const convId = `conv-${Date.now()}`
    const name = fromUri.split('@')[0].replace('sip:', '')

    conv = {
      id: convId,
      name,
      uri: fromUri,
      messages: [],
      lastMessage: '',
      lastMessageTime: '',
      unreadCount: 0,
      isTyping: false,
    }

    conversations.value.unshift(conv)
  }

  const message: Message = {
    id: `msg-${Date.now()}`,
    content,
    direction: 'inbound',
    timestamp: new Date().toLocaleTimeString(),
    status: 'delivered',
  }

  conv.messages.push(message)
  conv.lastMessage = content
  conv.lastMessageTime = message.timestamp

  // Increment unread if not current conversation
  if (currentConversationId.value !== conv.id) {
    conv.unreadCount++
  }

  messageStats.value.totalReceived++

  // Play notification
  if (playNotificationSound.value) {
    console.log('Playing notification sound')
  }

  // Show desktop notification
  if (showNotifications.value && currentConversationId.value !== conv.id) {
    showDesktopNotification(conv.name, content)
  }

  // Scroll to bottom if current conversation
  if (currentConversationId.value === conv.id) {
    nextTick(() => scrollToBottom())
  }
}

// Clear Conversation
const clearConversation = () => {
  if (!currentConversation.value) return

  if (confirm(`Clear all messages in this conversation?`)) {
    currentConversation.value.messages = []
    currentConversation.value.lastMessage = 'No messages yet'
    currentConversation.value.lastMessageTime = ''
  }
}

// Simulate Incoming Message
const simulateIncomingMessage = () => {
  const messages = [
    'Hey, how are you?',
    'Got a minute to talk?',
    'Check out this link!',
    'Thanks for your help earlier',
    'Are you available for a call?',
  ]

  const randomMessage = messages[Math.floor(Math.random() * messages.length)]
  const fromUri = `sip:user${Math.floor(Math.random() * 100)}@example.com`

  receiveMessage(fromUri, randomMessage)

  // Simulate typing indicator
  const conv = conversations.value.find((c) => c.uri === fromUri)
  if (conv && Math.random() > 0.5) {
    conv.isTyping = true
    setTimeout(() => {
      conv.isTyping = false

      // Send another message
      setTimeout(() => {
        const followUp = "Let me know when you're free!"
        receiveMessage(fromUri, followUp)
      }, 1500)
    }, 2000)
  }
}

// Desktop Notification
const showDesktopNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
    })
  }
}

// Request notification permission
const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Helpers
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getMessageStatusIcon = (status: string): string => {
  switch (status) {
    case 'sending':
      return '○'
    case 'sent':
      return '✓'
    case 'delivered':
      return '✓✓'
    case 'failed':
      return '✗'
    default:
      return ''
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Lifecycle
onMounted(() => {
  requestNotificationPermission()
})
</script>

<style scoped>
.sip-messaging-demo {
  max-width: 1400px;
  margin: 0 auto;
}

.description {
  color: var(--vuesip-text-secondary);
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: var(--vuesip-border-radius);
  font-weight: 600;
  font-size: 0.875rem;
}

.status-badge.connected {
  background-color: var(--vuesip-success);
  color: var(--surface-0);
}

.status-badge.disconnected {
  background-color: var(--vuesip-text-tertiary);
  color: var(--surface-0);
}

.status-badge.connecting {
  background-color: var(--vuesip-warning);
  color: var(--surface-0);
}

.unread-badge {
  background: var(--vuesip-danger);
  color: var(--surface-0);
  padding: 0.375rem 0.75rem;
  border-radius: var(--vuesip-border-radius-lg);
  font-size: 0.875rem;
  font-weight: 600;
}

.config-section,
.settings-section,
.stats-section {
  background: var(--vuesip-bg-secondary);
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  color: var(--vuesip-text-tertiary);
  letter-spacing: 0.05em;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

/* Generic button and input styles removed - using PrimeVue components */

.messaging-container {
  background: var(--vuesip-bg-secondary);
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.messaging-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  height: 600px;
}

@media (max-width: 768px) {
  .messaging-layout {
    grid-template-columns: 1fr;
  }

  .conversations-sidebar {
    display: none;
  }
}

/* Sidebar */
.conversations-sidebar {
  border-right: 1px solid var(--vuesip-border);
  display: flex;
  flex-direction: column;
  background: var(--vuesip-bg-primary);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--vuesip-border);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1rem;
}

.new-chat-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  font-size: 1.25rem;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--vuesip-bg-secondary);
}

.conversation-item:hover {
  background: var(--vuesip-bg-secondary);
}

.conversation-item.active {
  background: var(--surface-ground);
  border-left: 3px solid var(--vuesip-info);
}

.conversation-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vuesip-primary) 0%, var(--purple-500) 100%);
  color: var(--surface-0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.conversation-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--vuesip-text-primary);
}

.conversation-time {
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
}

.conversation-preview {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
}

.unread-indicator {
  background: var(--vuesip-info);
  color: var(--surface-0);
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.preview-text {
  color: var(--vuesip-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-contacts {
  padding: 1rem;
  border-top: 1px solid var(--vuesip-border);
}

.quick-btn {
  width: 100%;
  font-size: 0.75rem;
}

/* Chat Area */
.chat-area {
  background: var(--vuesip-bg-primary);
  display: flex;
  flex-direction: column;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--vuesip-border);
}

.chat-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vuesip-primary) 0%, var(--purple-500) 100%);
  color: var(--surface-0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}

.chat-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.chat-uri {
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 1rem;
  background: transparent;
  color: var(--vuesip-text-tertiary);
}

.icon-btn:hover {
  background: var(--vuesip-bg-secondary);
  color: var(--vuesip-text-primary);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message {
  display: flex;
}

.message.outbound {
  justify-content: flex-end;
}

.message.inbound {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: var(--vuesip-border-radius-lg);
  word-wrap: break-word;
}

.message.outbound .message-bubble {
  background: var(--vuesip-info);
  color: var(--surface-0);
  border-bottom-right-radius: 4px;
}

.message.inbound .message-bubble {
  background: var(--vuesip-bg-secondary);
  color: var(--vuesip-text-primary);
  border-bottom-left-radius: 4px;
}

.message-content {
  margin-bottom: 0.25rem;
  line-height: 1.5;
}

.message-meta {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
}

.message.inbound .message-meta {
  justify-content: flex-start;
}

.typing-indicator {
  display: flex;
}

.typing-bubble {
  background: var(--vuesip-bg-secondary);
  padding: 0.75rem 1rem;
  border-radius: var(--vuesip-border-radius-lg);
  border-bottom-left-radius: 4px;
}

.typing-dots {
  display: flex;
  gap: 0.25rem;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vuesip-text-tertiary);
  animation: typing 1.4s ease-in-out infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

.message-input-container {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid var(--vuesip-border);
}

/* Textarea styling handled by PrimeVue Textarea component */
.message-input-container :deep(.p-inputtextarea) {
  flex: 1;
  max-height: 120px;
}

.send-btn {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  font-size: 1.25rem;
  background: var(--vuesip-info);
}

.send-btn:hover:not(:disabled) {
  background: var(--vuesip-info-dark);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vuesip-text-tertiary);
}

.empty-icon {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--vuesip-text-tertiary);
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--vuesip-bg-primary);
  border-radius: var(--vuesip-border-radius-lg);
  padding: 2rem;
  min-width: 400px;
  max-width: 90vw;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.cancel-btn {
  background: var(--vuesip-text-tertiary);
}

.cancel-btn:hover {
  background: var(--vuesip-text-primary);
}

/* Settings */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

.settings-grid label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

/* Checkbox styling handled by PrimeVue Checkbox component */

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--vuesip-bg-primary);
  padding: 1.5rem;
  border-radius: var(--vuesip-border-radius-lg);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--vuesip-info);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--vuesip-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    min-width: auto;
    width: 90vw;
  }
}
</style>
