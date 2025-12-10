import type { ExampleDefinition } from './types'
import SipMessagingDemo from '../demos/SipMessagingDemo.vue'

export const sipMessagingExample: ExampleDefinition = {
  id: 'sip-messaging',
  icon: '📨',
  title: 'SIP Instant Messaging',
  description: 'Send and receive instant messages',
  category: 'sip',
  tags: ['Messaging', 'Chat', 'Advanced'],
  component: SipMessagingDemo,
  setupGuide: '<p>Send and receive instant messages over SIP using the MESSAGE method (RFC 3428). Perfect for text-based communication alongside voice calls.</p>',
  codeSnippets: [
    {
      title: 'Sending Messages',
      description: 'Send SIP MESSAGE requests',
      code: `import { useSipClient } from 'vuesip'

const { sipClient } = useSipClient()

const sendMessage = async (
  toUri: string,
  message: string
) => {
  try {
    // Create MESSAGE request
    const request = sipClient.value.createMessage(
      toUri,
      message,
      'text/plain'
    )

    // Send message
    await request.send()

    console.log('Message sent:', message)
    return true
  } catch (error) {
    console.error('Failed to send message:', error)
    return false
  }
}

// Usage
await sendMessage(
  'sip:friend@example.com',
  'Hello! How are you?'
)`,
    },
    {
      title: 'Receiving Messages',
      description: 'Handle incoming MESSAGE requests',
      code: `import { watch } from 'vue'

// Listen for incoming messages
sipClient.value.on('message', (request) => {
  const from = request.from.uri.toString()
  const body = request.body

  console.log('Message from:', from)
  console.log('Content:', body)

  // Send 200 OK response
  request.accept()

  // Process message
  handleIncomingMessage(from, body)
})

const handleIncomingMessage = (
  fromUri: string,
  content: string
) => {
  // Find or create conversation
  let conversation = conversations.value
    .find(c => c.uri === fromUri)

  if (!conversation) {
    conversation = createConversation(fromUri)
  }

  // Add message
  conversation.messages.push({
    id: Date.now().toString(),
    content,
    direction: 'inbound',
    timestamp: new Date()
  })

  // Show notification
  showNotification(conversation.name, content)
}`,
    },
    {
      title: 'Typing Indicators',
      description: 'Send typing notifications',
      code: `const sendTypingIndicator = async (
  toUri: string,
  isTyping: boolean
) => {
  const contentType = 'application/im-iscomposing+xml'

  const body = \`<?xml version="1.0" encoding="UTF-8"?>
<isComposing>
  <state>\${isTyping ? 'active' : 'idle'}</state>
  <contenttype>text/plain</contenttype>
</isComposing>\`

  await sipClient.value.createMessage(
    toUri,
    body,
    contentType
  ).send()
}

// Send when user types
let typingTimer: number | null = null

const handleTyping = (toUri: string) => {
  // Clear existing timer
  if (typingTimer) clearTimeout(typingTimer)

  // Send "typing" indicator
  sendTypingIndicator(toUri, true)

  // Auto-stop after 2 seconds
  typingTimer = setTimeout(() => {
    sendTypingIndicator(toUri, false)
  }, 2000)
}`,
    },
    {
      title: 'Message Delivery Status',
      description: 'Track message delivery',
      code: `interface Message {
  id: string
  content: string
  status: 'sending' | 'sent' | 'delivered' | 'failed'
}

const sendMessageWithStatus = async (
  toUri: string,
  content: string
): Promise<Message> => {
  const message: Message = {
    id: Date.now().toString(),
    content,
    status: 'sending'
  }

  try {
    const request = sipClient.value.createMessage(
      toUri,
      content,
      'text/plain'
    )

    // Send message
    await request.send()

    message.status = 'sent'

    // Wait for response
    request.on('response', (response) => {
      if (response.statusCode === 200) {
        message.status = 'delivered'
      } else {
        message.status = 'failed'
      }
    })

  } catch (error) {
    message.status = 'failed'
  }

  return message
}`,
    },
    {
      title: 'Conversation Model',
      description: 'Data structure for chat conversations',
      code: `interface SIPMessage {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  content: string
  contentType: 'text/plain' | 'text/html' | 'application/json'
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: Date
  metadata?: {
    typing?: boolean
    read?: boolean
    error?: string
  }
}

interface Conversation {
  id: string
  remoteUri: string
  displayName: string
  messages: SIPMessage[]
  unreadCount: number
  lastActivity: Date
  isTyping: boolean
  isArchived: boolean
}

const conversations = ref<Map<string, Conversation>>(new Map())

const getOrCreateConversation = (remoteUri: string, displayName?: string): Conversation => {
  if (!conversations.value.has(remoteUri)) {
    conversations.value.set(remoteUri, {
      id: remoteUri,
      remoteUri,
      displayName: displayName || remoteUri.replace('sip:', '').split('@')[0],
      messages: [],
      unreadCount: 0,
      lastActivity: new Date(),
      isTyping: false,
      isArchived: false
    })
  }
  return conversations.value.get(remoteUri)!
}

const addMessageToConversation = (
  remoteUri: string,
  message: SIPMessage
) => {
  const conversation = getOrCreateConversation(remoteUri)
  conversation.messages.push(message)
  conversation.lastActivity = new Date()

  if (message.direction === 'inbound') {
    conversation.unreadCount++
  }
}`,
    },
    {
      title: 'Rich Content Messages',
      description: 'Send HTML and structured content',
      code: `// Send HTML formatted message
const sendHtmlMessage = async (toUri: string, htmlContent: string) => {
  await sipClient.value.createMessage(
    toUri,
    htmlContent,
    'text/html'
  ).send()
}

// Send structured data (JSON)
const sendJsonMessage = async (
  toUri: string,
  data: object
) => {
  await sipClient.value.createMessage(
    toUri,
    JSON.stringify(data),
    'application/json'
  ).send()
}

// Send file reference
interface FileReference {
  name: string
  size: number
  type: string
  url: string
}

const sendFileReference = async (
  toUri: string,
  file: FileReference
) => {
  const content = \`<?xml version="1.0" encoding="UTF-8"?>
<file-sharing xmlns="urn:xmpp:sfs:0">
  <file>
    <media-type>\${file.type}</media-type>
    <name>\${file.name}</name>
    <size>\${file.size}</size>
  </file>
  <sources>
    <url-data xmlns="urn:xmpp:urldata" target="\${file.url}"/>
  </sources>
</file-sharing>\`

  await sipClient.value.createMessage(
    toUri,
    content,
    'application/vnd.oasis.file-sharing+xml'
  ).send()
}

// Handle incoming rich content
const handleRichMessage = (
  content: string,
  contentType: string
) => {
  switch (contentType) {
    case 'text/html':
      return { type: 'html', content: sanitizeHtml(content) }
    case 'application/json':
      return { type: 'json', content: JSON.parse(content) }
    default:
      return { type: 'text', content }
  }
}`,
    },
    {
      title: 'Message Storage',
      description: 'Persist messages with IndexedDB',
      code: `const DB_NAME = 'sip-messages'
const DB_VERSION = 1

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' })
        store.createIndex('conversationId', 'conversationId')
        store.createIndex('timestamp', 'timestamp')
      }

      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const saveMessage = async (message: SIPMessage) => {
  const db = await openDatabase()
  const tx = db.transaction('messages', 'readwrite')
  tx.objectStore('messages').put(message)
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

const loadConversationHistory = async (
  conversationId: string,
  limit = 50
): Promise<SIPMessage[]> => {
  const db = await openDatabase()
  const tx = db.transaction('messages', 'readonly')
  const index = tx.objectStore('messages').index('conversationId')

  return new Promise((resolve, reject) => {
    const request = index.getAll(conversationId)
    request.onsuccess = () => {
      const messages = request.result
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)
        .reverse()
      resolve(messages)
    }
    request.onerror = () => reject(request.error)
  })
}

const searchMessages = async (query: string): Promise<SIPMessage[]> => {
  const db = await openDatabase()
  const tx = db.transaction('messages', 'readonly')
  const store = tx.objectStore('messages')

  return new Promise((resolve, reject) => {
    const results: SIPMessage[] = []
    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        if (cursor.value.content.toLowerCase().includes(query.toLowerCase())) {
          results.push(cursor.value)
        }
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    request.onerror = () => reject(request.error)
  })
}`,
    },
    {
      title: 'Message Notifications',
      description: 'Show desktop notifications for new messages',
      code: `const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

const showMessageNotification = (
  from: string,
  content: string,
  conversationId: string
) => {
  if (Notification.permission !== 'granted') return
  if (document.hasFocus()) return // Don't notify if app is focused

  const notification = new Notification(\`Message from \${from}\`, {
    body: content.length > 100 ? content.substring(0, 100) + '...' : content,
    icon: '/icons/message.png',
    tag: conversationId, // Replace previous notification from same conversation
    requireInteraction: false,
    silent: false
  })

  notification.onclick = () => {
    window.focus()
    navigateToConversation(conversationId)
    notification.close()
  }

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000)
}

// Badge counter for unread messages
const updateBadge = (count: number) => {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count)
    } else {
      (navigator as any).clearAppBadge()
    }
  }
}

// Update title with unread count
const updateTitleWithUnread = (count: number) => {
  const baseTitle = 'SIP Messaging'
  document.title = count > 0 ? \`(\${count}) \${baseTitle}\` : baseTitle
}`,
    },
    {
      title: 'Chat UI Component',
      description: 'Complete messaging interface',
      code: `<template>
  <div class="messaging-app">
    <!-- Conversation List -->
    <aside class="conversations-sidebar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          placeholder="Search conversations..."
        />
      </div>

      <div class="conversation-list">
        <div
          v-for="conv in sortedConversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: activeConversation?.id === conv.id }"
          @click="selectConversation(conv)"
        >
          <div class="avatar">{{ getInitials(conv.displayName) }}</div>
          <div class="conversation-info">
            <div class="name">{{ conv.displayName }}</div>
            <div class="last-message">{{ getLastMessage(conv) }}</div>
          </div>
          <div class="conversation-meta">
            <span class="time">{{ formatTime(conv.lastActivity) }}</span>
            <span v-if="conv.unreadCount" class="badge">
              {{ conv.unreadCount }}
            </span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Chat Area -->
    <main class="chat-area" v-if="activeConversation">
      <!-- Header -->
      <header class="chat-header">
        <div class="contact-info">
          <h2>{{ activeConversation.displayName }}</h2>
          <span v-if="activeConversation.isTyping" class="typing">
            typing...
          </span>
        </div>
        <div class="actions">
          <button @click="startCall" title="Call">📞</button>
          <button @click="startVideoCall" title="Video">📹</button>
        </div>
      </header>

      <!-- Messages -->
      <div class="messages-container" ref="messagesContainer">
        <div
          v-for="msg in activeConversation.messages"
          :key="msg.id"
          class="message"
          :class="msg.direction"
        >
          <div class="message-content">{{ msg.content }}</div>
          <div class="message-meta">
            <span class="time">{{ formatTime(msg.timestamp) }}</span>
            <span class="status" v-if="msg.direction === 'outbound'">
              {{ getStatusIcon(msg.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <footer class="message-input">
        <textarea
          v-model="newMessage"
          @keydown.enter.exact.prevent="sendMessage"
          @input="handleTyping"
          placeholder="Type a message..."
          rows="1"
        />
        <button @click="sendMessage" :disabled="!newMessage.trim()">
          Send
        </button>
      </footer>
    </main>
  </div>
</template>

<script setup>
const getStatusIcon = (status: string) => {
  const icons = {
    sending: '⏳',
    sent: '✓',
    delivered: '✓✓',
    read: '👁️',
    failed: '❌'
  }
  return icons[status] || ''
}
</script>`,
    },
    {
      title: 'Read Receipts',
      description: 'Send and handle message read notifications',
      code: `// IMDN (Instant Message Disposition Notification) support
const sendReadReceipt = async (
  toUri: string,
  messageId: string
) => {
  const content = \`<?xml version="1.0" encoding="UTF-8"?>
<imdn xmlns="urn:ietf:params:xml:ns:imdn">
  <message-id>\${messageId}</message-id>
  <datetime>\${new Date().toISOString()}</datetime>
  <display-notification>
    <status><displayed/></status>
  </display-notification>
</imdn>\`

  await sipClient.value.createMessage(
    toUri,
    content,
    'message/imdn+xml'
  ).send()
}

// Handle incoming read receipts
const handleIMDN = (content: string) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/xml')

  const messageId = doc.querySelector('message-id')?.textContent
  const status = doc.querySelector('status')?.firstElementChild?.tagName

  if (messageId) {
    updateMessageStatus(messageId, status === 'displayed' ? 'read' : 'delivered')
  }
}

// Request read receipts when sending
const sendWithReceiptRequest = async (
  toUri: string,
  content: string
) => {
  const messageId = \`msg-\${Date.now()}\`

  const headers = {
    'Disposition-Notification': 'positive-delivery, display'
  }

  await sipClient.value.createMessage(
    toUri,
    content,
    'text/plain',
    { extraHeaders: headers }
  ).send()

  return messageId
}

// Mark messages as read when conversation is viewed
const markConversationAsRead = async (conversation: Conversation) => {
  const unreadMessages = conversation.messages.filter(
    m => m.direction === 'inbound' && m.status !== 'read'
  )

  for (const msg of unreadMessages) {
    await sendReadReceipt(conversation.remoteUri, msg.id)
    msg.status = 'read'
  }

  conversation.unreadCount = 0
}`,
    },
  ],
}
