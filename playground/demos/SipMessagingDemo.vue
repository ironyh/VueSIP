<template>
  <div class="sip-messaging-demo">
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

    <Message severity="info" :closable="false" class="mb-4">
      <p class="m-0 line-height-3">
        Send and receive instant messages over SIP using the MESSAGE method. Messages are
        displayed in a familiar chat interface with conversation history.
      </p>
    </Message>

    <!-- Connection Status Bar -->
    <div class="flex align-items-center gap-3 mb-4">
      <Tag :severity="getConnectionSeverity(connectionState)" class="text-sm">
        {{ connectionState.toUpperCase() }}
      </Tag>
      <Tag v-if="unreadCount > 0" severity="danger" class="text-sm">
        {{ unreadCount }} unread
      </Tag>
      <Message v-if="!isConnected" severity="warn" :closable="false" class="flex-1 m-0">
        <span class="text-sm">Configure SIP credentials in <strong>Settings</strong> or <strong>Basic Call</strong> demo</span>
      </Message>
    </div>

    <!-- Messaging Interface -->
    <Panel v-if="isConnected" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-comments"></i>
          <span class="font-semibold">Messages</span>
        </div>
      </template>
      <div class="messaging-layout">
        <!-- Conversations Sidebar -->
        <aside class="conversations-sidebar surface-50 border-right-1 surface-border">
          <div class="flex justify-content-between align-items-center p-3 border-bottom-1 surface-border">
            <span class="font-semibold">Conversations</span>
            <Button
              icon="pi pi-plus"
              severity="primary"
              rounded
              size="small"
              @click="showNewConversation = true"
              v-tooltip.left="'New conversation'"
            />
          </div>

          <div class="conversations-list">
            <div
              v-for="conv in conversations"
              :key="conv.id"
              class="flex gap-3 p-3 cursor-pointer border-bottom-1 surface-border"
              :class="{ 'surface-100 border-left-3 border-primary': currentConversationId === conv.id }"
              @click="selectConversation(conv.id)"
            >
              <Avatar
                :label="getInitials(conv.name)"
                shape="circle"
                class="bg-primary text-white flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="flex justify-content-between align-items-center mb-1">
                  <span class="font-semibold text-sm text-overflow-ellipsis overflow-hidden white-space-nowrap">{{ conv.name }}</span>
                  <span class="text-xs text-500">{{ conv.lastMessageTime }}</span>
                </div>
                <div class="flex align-items-center gap-2">
                  <Tag v-if="conv.unreadCount > 0" severity="info" class="text-xs" rounded>
                    {{ conv.unreadCount }}
                  </Tag>
                  <span class="text-sm text-500 text-overflow-ellipsis overflow-hidden white-space-nowrap">{{ conv.lastMessage }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="p-3 border-top-1 surface-border">
            <div class="text-xs text-500 font-semibold uppercase mb-2">Quick Start</div>
            <Button
              label="Simulate Incoming"
              icon="pi pi-envelope"
              severity="secondary"
              size="small"
              class="w-full"
              @click="simulateIncomingMessage"
            />
          </div>
        </aside>

        <!-- Chat Area -->
        <main class="chat-area surface-0">
          <div v-if="currentConversation" class="flex flex-column h-full">
            <!-- Chat Header -->
            <div class="flex justify-content-between align-items-center p-3 border-bottom-1 surface-border">
              <div class="flex gap-3 align-items-center">
                <Avatar
                  :label="getInitials(currentConversation.name)"
                  shape="circle"
                  class="bg-primary text-white"
                />
                <div>
                  <div class="font-semibold">{{ currentConversation.name }}</div>
                  <div class="text-xs text-500">{{ currentConversation.uri }}</div>
                </div>
              </div>
              <Button
                label="Clear"
                icon="pi pi-trash"
                severity="danger"
                text
                size="small"
                @click="clearConversation"
                v-tooltip.left="'Clear conversation'"
              />
            </div>

            <!-- Messages -->
            <div class="messages-container flex-1 overflow-auto p-3" ref="messagesContainer">
              <div
                v-for="message in currentConversation.messages"
                :key="message.id"
                class="flex mb-3"
                :class="{ 'justify-content-end': message.direction === 'outbound' }"
              >
                <div
                  class="message-bubble max-w-25rem p-3 border-round-lg"
                  :class="message.direction === 'outbound' ? 'bg-primary text-white' : 'surface-100'"
                >
                  <div class="line-height-3 mb-1">{{ message.content }}</div>
                  <div class="flex justify-content-end gap-2 text-xs opacity-70">
                    <span>{{ message.timestamp }}</span>
                    <span v-if="message.direction === 'outbound'">
                      {{ getMessageStatusIcon(message.status) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Typing Indicator -->
              <div v-if="currentConversation.isTyping" class="flex">
                <div class="typing-bubble surface-100 p-3 border-round-lg">
                  <div class="typing-dots flex gap-1">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Message Input -->
            <div class="flex gap-3 p-3 border-top-1 surface-border">
              <Textarea
                v-model="messageText"
                @keydown.enter.exact.prevent="sendMessage"
                @input="handleTyping"
                placeholder="Type a message..."
                :autoResize="true"
                rows="1"
                class="flex-1"
                ref="messageInput"
              />
              <Button
                icon="pi pi-send"
                severity="primary"
                rounded
                :disabled="!messageText.trim()"
                @click="sendMessage"
                v-tooltip.left="'Send message'"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-column align-items-center justify-content-center h-full py-6 text-500">
            <i class="pi pi-comments text-5xl mb-3 opacity-50"></i>
            <h4 class="m-0 mb-2 text-700">No Conversation Selected</h4>
            <p class="m-0 text-sm">Select a conversation from the sidebar or start a new one</p>
          </div>
        </main>
      </div>
    </Panel>

    <!-- New Conversation Dialog -->
    <Dialog
      v-model:visible="showNewConversation"
      header="New Conversation"
      modal
      :style="{ width: '400px' }"
    >
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="recipient-uri" class="font-medium text-sm">Recipient SIP URI</label>
          <InputText
            id="recipient-uri"
            v-model="newConversationUri"
            placeholder="sip:user@example.com"
            class="w-full"
            @keyup.enter="startNewConversation"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            @click="showNewConversation = false"
          />
          <Button
            label="Start Chat"
            icon="pi pi-comments"
            :disabled="!newConversationUri.trim()"
            @click="startNewConversation"
          />
        </div>
      </template>
    </Dialog>

    <!-- Messaging Settings -->
    <Panel v-if="isConnected" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-cog"></i>
          <span class="font-semibold">Messaging Settings</span>
        </div>
      </template>
      <div class="grid">
        <div class="col-12 md:col-6 lg:col-3">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="sendTypingIndicator" :binary="true" inputId="typing-indicator" />
            <label for="typing-indicator" class="text-sm cursor-pointer">Send typing indicator</label>
          </div>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="sendDeliveryReceipt" :binary="true" inputId="delivery-receipt" />
            <label for="delivery-receipt" class="text-sm cursor-pointer">Send delivery receipts</label>
          </div>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="playNotificationSound" :binary="true" inputId="notification-sound" />
            <label for="notification-sound" class="text-sm cursor-pointer">Play notification sound</label>
          </div>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="showNotifications" :binary="true" inputId="desktop-notifications" />
            <label for="desktop-notifications" class="text-sm cursor-pointer">Show desktop notifications</label>
          </div>
        </div>
      </div>
    </Panel>

    <!-- Message Statistics -->
    <Panel
      v-if="isConnected && messageStats.totalSent + messageStats.totalReceived > 0"
      class="mb-4"
    >
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-chart-bar"></i>
          <span class="font-semibold">Message Statistics</span>
        </div>
      </template>
      <div class="grid">
        <div class="col-6 md:col-3">
          <div class="surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold text-primary mb-2">{{ messageStats.totalSent }}</div>
            <div class="text-sm text-500">Messages Sent</div>
          </div>
        </div>
        <div class="col-6 md:col-3">
          <div class="surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold text-primary mb-2">{{ messageStats.totalReceived }}</div>
            <div class="text-sm text-500">Messages Received</div>
          </div>
        </div>
        <div class="col-6 md:col-3">
          <div class="surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold text-primary mb-2">{{ conversations.length }}</div>
            <div class="text-sm text-500">Conversations</div>
          </div>
        </div>
        <div class="col-6 md:col-3">
          <div class="surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold mb-2" :class="messageStats.failedMessages > 0 ? 'text-red-500' : 'text-primary'">
              {{ messageStats.failedMessages }}
            </div>
            <div class="text-sm text-500">Failed</div>
          </div>
        </div>
      </div>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch as _watch, nextTick, onMounted } from 'vue'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// PrimeVue components
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'

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
  updateConfig,
  getClient: _getClient,
} = playgroundSipClient

// ... (existing code)


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
    updateConfig({
      uri: sipServerUri.value,
      username: username.value,
      password: password.value,
    })
    await connect()
  }
}

// Subscribe to incoming messages
let cleanupIncomingMessage: (() => void) | null = null

const setupMessageListener = () => {
  // Clean up existing listener
  if (cleanupIncomingMessage) {
    cleanupIncomingMessage()
    cleanupIncomingMessage = null
  }

  const client = playgroundSipClient.getClient()
  if (client) {
    console.log('Setting up SIP message listener')
    const handler = (from: string, content: string, contentType?: string) => {
      console.log('Received SIP message:', { from, content, contentType })
      // Only handle text/plain for now, or assume text if not specified
      if (!contentType || contentType.startsWith('text/')) {
        receiveMessage(from, content)
      }
    }
    
    // Register handler
    client.onIncomingMessage(handler)
    
    // Create cleanup function using offIncomingMessage
    cleanupIncomingMessage = () => {
      console.log('Removing SIP message listener')
      client.offIncomingMessage(handler)
    }
  }
}

// Watch connection state to setup listeners
_watch(isConnected, (connected) => {
  if (connected) {
    // Small delay to ensure client is fully ready
    setTimeout(() => {
      setupMessageListener()
    }, 100)
  } else {
    if (cleanupIncomingMessage) {
      cleanupIncomingMessage()
      cleanupIncomingMessage = null
    }
  }
}, { immediate: true })

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

  const content = messageText.value.trim()
  const target = currentConversation.value.uri

  const message: Message = {
    id: `msg-${Date.now()}`,
    content,
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

  try {
    const client = playgroundSipClient.getClient()
    if (!client) {
      throw new Error('SIP Client not connected')
    }

    if (isSimulationMode.value) {
      // Simulate message sending
      setTimeout(() => {
        message.status = 'sent'
        if (sendDeliveryReceipt.value) {
          setTimeout(() => {
            message.status = 'delivered'
          }, 1000)
        }
      }, 500)
    } else {
      // Real SIP Message
      await client.sendMessage(target, content, {
        contentType: 'text/plain'
      })
      message.status = 'sent'
      console.log('Sent SIP MESSAGE to:', target)
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    message.status = 'failed'
    // Optional: show error notification
  }
}

// Handle Typing
const handleTyping = () => {
  if (!sendTypingIndicator.value || !currentConversation.value) return

  // Clear existing timer
  if (typingTimer) {
    clearTimeout(typingTimer)
  }

  // Send typing notification
  // Note: Real SIP typing indicators (RFC 3994) not yet implemented in SipClient
  // console.log('Sending typing indicator to:', currentConversation.value.uri)

  // Stop typing after 2 seconds of inactivity
  typingTimer = window.setTimeout(() => {
    // console.log('Stopped typing')
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
  
  // Note: Simulation typing logic removed for simplicity as it's separate from real SIP logic
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
const getConnectionSeverity = (state: string): 'success' | 'warn' | 'danger' | 'secondary' => {
  switch (state) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warn'
    case 'disconnected':
      return 'secondary'
    default:
      return 'secondary'
  }
}

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
  
  // Initial check if already connected
  if (isConnected.value) {
    setupMessageListener()
  }
})
</script>

<style scoped>
.sip-messaging-demo {
  max-width: 1200px;
  margin: 0 auto;
}

/* Messaging Layout */
.messaging-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 500px;
}

/* Conversations Sidebar */
.conversations-sidebar {
  display: flex;
  flex-direction: column;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
}

/* Chat Area */
.chat-area {
  display: flex;
  flex-direction: column;
}

/* Message bubble styling */
.message-bubble {
  word-wrap: break-word;
}

.max-w-25rem {
  max-width: 25rem;
}

/* Typing Animation */
.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-color-secondary);
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

/* Responsive */
@media (max-width: 768px) {
  .messaging-layout {
    grid-template-columns: 1fr;
  }

  .conversations-sidebar {
    display: none;
  }
}
</style>
