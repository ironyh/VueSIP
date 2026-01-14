<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

interface ChatMessage {
  id: string
  participantId: string
  participantName: string
  content: string
  timestamp: Date
  type: 'message' | 'system'
}

interface Props {
  roomId: string
  userName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const messages = ref<ChatMessage[]>([])

// Demo messages
const demoMessages: ChatMessage[] = [
  {
    id: '1',
    participantId: 'system',
    participantName: 'System',
    content: 'Alice Johnson joined the meeting',
    timestamp: new Date(Date.now() - 300000),
    type: 'system',
  },
  {
    id: '2',
    participantId: 'alice',
    participantName: 'Alice Johnson',
    content: 'Hi everyone! Can you hear me okay?',
    timestamp: new Date(Date.now() - 240000),
    type: 'message',
  },
  {
    id: '3',
    participantId: 'bob',
    participantName: 'Bob Smith',
    content: 'Yes, loud and clear!',
    timestamp: new Date(Date.now() - 180000),
    type: 'message',
  },
  {
    id: '4',
    participantId: 'system',
    participantName: 'System',
    content: 'Charlie Brown joined the meeting',
    timestamp: new Date(Date.now() - 120000),
    type: 'system',
  },
]

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Send a new message
 */
function sendMessage() {
  if (!messageInput.value.trim()) return

  const newMessage: ChatMessage = {
    id: Date.now().toString(),
    participantId: 'local',
    participantName: props.userName,
    content: messageInput.value.trim(),
    timestamp: new Date(),
    type: 'message',
  }

  messages.value.push(newMessage)
  messageInput.value = ''

  // Scroll to bottom
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

/**
 * Handle enter key
 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

/**
 * Handle close
 */
function handleClose() {
  emit('close')
}

// Initialize with demo messages
onMounted(() => {
  messages.value = [...demoMessages]

  // Scroll to bottom
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
})
</script>

<template>
  <div class="chat-panel">
    <!-- Header -->
    <div class="chat-header">
      <h3>Chat</h3>
      <Button icon="pi pi-times" text rounded size="small" @click="handleClose" />
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="messages-container">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="{
          'is-system': message.type === 'system',
          'is-local': message.participantId === 'local',
        }"
      >
        <template v-if="message.type === 'system'">
          <div class="system-message">
            <i class="pi pi-info-circle" />
            <span>{{ message.content }}</span>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>
        </template>
        <template v-else>
          <div class="message-header">
            <span class="sender-name">
              {{ message.participantId === 'local' ? 'You' : message.participantName }}
            </span>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-content">{{ message.content }}</div>
        </template>
      </div>
    </div>

    <!-- Input -->
    <div class="chat-input">
      <InputText
        v-model="messageInput"
        placeholder="Type a message..."
        class="message-input"
        @keydown="handleKeyDown"
      />
      <Button icon="pi pi-send" :disabled="!messageInput.trim()" @click="sendMessage" />
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border-left: 1px solid var(--surface-border);
  z-index: 10;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.chat-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
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
  flex-direction: column;
  gap: 0.25rem;
}

.message.is-local {
  align-items: flex-end;
}

.message.is-local .message-content {
  background: var(--primary-500);
  color: white;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.sender-name {
  font-weight: 600;
  color: var(--text-color);
}

.timestamp {
  color: var(--text-color-secondary);
}

.message-content {
  padding: 0.5rem 0.75rem;
  background: var(--surface-200);
  border-radius: 8px;
  max-width: 85%;
  word-wrap: break-word;
}

.system-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  padding: 0.5rem;
  background: var(--surface-100);
  border-radius: 4px;
}

.system-message i {
  font-size: 0.875rem;
}

.chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid var(--surface-border);
}

.message-input {
  flex: 1;
}
</style>
