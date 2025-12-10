import type { ExampleDefinition } from './types'
import UserManagementDemo from '../demos/UserManagementDemo.vue'

export const userManagementExample: ExampleDefinition = {
  id: 'user-management',
  icon: '👥',
  title: 'User Management',
  description: 'Add, edit, and manage SIP users via AMI',
  category: 'ami',
  tags: ['Users', 'AMI', 'Provisioning', 'Extensions', 'Admin'],
  component: UserManagementDemo,
  setupGuide: '<p>This demo allows you to manage SIP users on your Asterisk/FreePBX server through AMI. You can add new extensions, update user settings, enable/disable users, and monitor registration status.</p><p><strong>Requirements:</strong></p><ul><li>AMI WebSocket proxy connected to your PBX</li><li>Admin credentials with user management permissions</li><li>PJSIP or SIP channel driver configured</li></ul>',
  codeSnippets: [
    {
      title: 'AMI Connection Setup',
      description: 'Connect to AMI WebSocket for user management',
      code: `import { useAmi } from 'vuesip'

const { connect, isConnected, sendAction } = useAmi()

// Connect to AMI WebSocket proxy
await connect({
  url: 'ws://pbx.example.com:8080/ami',
  username: 'admin',
  password: 'secret'
})

// Check connection status
if (isConnected.value) {
  console.log('Connected to AMI')
}`,
    },
    {
      title: 'Create SIP User',
      description: 'Add a new SIP extension via AMI',
      code: `// Create PJSIP endpoint for new user
const createUser = async (extension: string, displayName: string, secret: string) => {
  // Create the endpoint
  await sendAction({
    action: 'Command',
    command: \`pjsip set type endpoint \${extension}\`
  })

  // Set endpoint properties
  await sendAction({
    action: 'Command',
    command: \`pjsip set endpoint \${extension} context from-internal\`
  })

  await sendAction({
    action: 'Command',
    command: \`pjsip set endpoint \${extension} callerid "\${displayName}" <\${extension}>\`
  })

  // Create auth section
  await sendAction({
    action: 'Command',
    command: \`pjsip set type auth \${extension}\`
  })

  await sendAction({
    action: 'Command',
    command: \`pjsip set auth \${extension} password \${secret}\`
  })

  // Create AOR (Address of Record)
  await sendAction({
    action: 'Command',
    command: \`pjsip set type aor \${extension}\`
  })

  await sendAction({
    action: 'Command',
    command: \`pjsip set aor \${extension} max_contacts 1\`
  })

  // Reload PJSIP
  await sendAction({
    action: 'Command',
    command: 'pjsip reload'
  })

  console.log(\`User \${extension} created successfully\`)
}`,
    },
    {
      title: 'List SIP Users',
      description: 'Get list of configured PJSIP endpoints',
      code: `// Get all PJSIP endpoints
const listUsers = async () => {
  const response = await sendAction({
    action: 'PJSIPShowEndpoints'
  })

  // Parse endpoints from response
  const endpoints = response.events
    .filter(event => event.event === 'EndpointList')
    .map(event => ({
      endpoint: event.objectname,
      deviceState: event.devicestate,
      activeChannels: event.activechannels
    }))

  return endpoints
}

// Get specific endpoint details
const getUserDetails = async (extension: string) => {
  const response = await sendAction({
    action: 'PJSIPShowEndpoint',
    endpoint: extension
  })

  return {
    extension: response.objectname,
    context: response.context,
    callerid: response.callerid,
    transport: response.transport,
    auth: response.auth,
    aors: response.aors
  }
}`,
    },
    {
      title: 'Update User Settings',
      description: 'Modify existing user configuration',
      code: `// Update user display name
const updateCallerID = async (extension: string, displayName: string) => {
  await sendAction({
    action: 'Command',
    command: \`pjsip set endpoint \${extension} callerid "\${displayName}" <\${extension}>\`
  })

  await sendAction({
    action: 'Command',
    command: 'pjsip reload'
  })
}

// Update user password
const updatePassword = async (extension: string, newPassword: string) => {
  await sendAction({
    action: 'Command',
    command: \`pjsip set auth \${extension} password \${newPassword}\`
  })

  await sendAction({
    action: 'Command',
    command: 'pjsip reload'
  })
}

// Enable/disable user
const setUserEnabled = async (extension: string, enabled: boolean) => {
  // Remove or add endpoint from config
  if (enabled) {
    await sendAction({
      action: 'Command',
      command: \`pjsip set endpoint \${extension} disallow all\`
    })
    await sendAction({
      action: 'Command',
      command: \`pjsip set endpoint \${extension} allow ulaw,alaw,opus\`
    })
  } else {
    // Disable by removing all codecs
    await sendAction({
      action: 'Command',
      command: \`pjsip set endpoint \${extension} disallow all\`
    })
  }

  await sendAction({
    action: 'Command',
    command: 'pjsip reload'
  })
}`,
    },
    {
      title: 'Delete User',
      description: 'Remove a SIP user from the system',
      code: `const deleteUser = async (extension: string) => {
  // Remove endpoint, auth, and aor sections
  await sendAction({
    action: 'Command',
    command: \`pjsip delete endpoint \${extension}\`
  })

  await sendAction({
    action: 'Command',
    command: \`pjsip delete auth \${extension}\`
  })

  await sendAction({
    action: 'Command',
    command: \`pjsip delete aor \${extension}\`
  })

  // Also remove voicemail if exists
  await sendAction({
    action: 'Command',
    command: \`voicemail delete \${extension}@default\`
  })

  // Reload PJSIP
  await sendAction({
    action: 'Command',
    command: 'pjsip reload'
  })

  console.log(\`User \${extension} deleted\`)
}`,
    },
    {
      title: 'Check Registration Status',
      description: 'Monitor user registration state',
      code: `// Get registration status for a user
const getRegistrationStatus = async (extension: string) => {
  const response = await sendAction({
    action: 'PJSIPShowRegistrationsOutbound',
    endpoint: extension
  })

  // Or check contacts on the AOR
  const aorResponse = await sendAction({
    action: 'PJSIPShowEndpoint',
    endpoint: extension
  })

  const hasContact = aorResponse.contacts && aorResponse.contacts.length > 0

  return {
    extension,
    registered: hasContact,
    contact: hasContact ? aorResponse.contacts[0] : null,
    userAgent: aorResponse.useragent || 'Unknown'
  }
}

// Listen for registration events
const subscribeToRegistrations = (callback: (event: any) => void) => {
  onAmiEvent('ContactStatus', (event) => {
    callback({
      extension: event.endpoint,
      status: event.contactstatus, // 'Created', 'Removed', 'Updated'
      contact: event.uri
    })
  })
}`,
    },
    {
      title: 'Configure Voicemail',
      description: 'Set up voicemail for a user',
      code: `// Enable voicemail for user
const setupVoicemail = async (
  extension: string,
  email: string,
  pin: string = '1234'
) => {
  // Add voicemail box
  await sendAction({
    action: 'Command',
    command: \`voicemail add \${extension}@default \${pin} "\${email}"\`
  })

  // Set voicemail options
  await sendAction({
    action: 'Command',
    command: \`voicemail set \${extension}@default attach yes\`
  })

  await sendAction({
    action: 'Command',
    command: \`voicemail set \${extension}@default delete yes\`
  })

  await sendAction({
    action: 'Command',
    command: 'voicemail reload'
  })
}

// Check voicemail count
const getVoicemailCount = async (extension: string) => {
  const response = await sendAction({
    action: 'MailboxCount',
    mailbox: \`\${extension}@default\`
  })

  return {
    newMessages: parseInt(response.newmessages || '0'),
    oldMessages: parseInt(response.oldmessages || '0')
  }
}`,
    },
    {
      title: 'Vue Component Example',
      description: 'Complete user management component',
      code: `<template>
  <div class="user-management">
    <!-- Add User Form -->
    <form @submit.prevent="createUser">
      <input v-model="newUser.extension" placeholder="Extension (e.g. 1001)" />
      <input v-model="newUser.displayName" placeholder="Display Name" />
      <input v-model="newUser.password" type="password" placeholder="SIP Password" />
      <input v-model="newUser.email" type="email" placeholder="Email (optional)" />

      <label>
        <input type="checkbox" v-model="newUser.voicemailEnabled" />
        Enable Voicemail
      </label>

      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Creating...' : 'Create User' }}
      </button>
    </form>

    <!-- Users List -->
    <div v-for="user in users" :key="user.extension" class="user-card">
      <div class="user-info">
        <span class="name">{{ user.displayName }}</span>
        <span class="ext">ext. {{ user.extension }}</span>
        <span :class="['status', user.registered ? 'online' : 'offline']">
          {{ user.registered ? 'Online' : 'Offline' }}
        </span>
      </div>
      <div class="user-actions">
        <button @click="editUser(user)">Edit</button>
        <button @click="deleteUser(user.extension)">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAmi } from 'vuesip'

const { sendAction, onAmiEvent } = useAmi()
const users = ref([])
const isLoading = ref(false)
const newUser = ref({
  extension: '',
  displayName: '',
  password: '',
  email: '',
  voicemailEnabled: true
})

onMounted(async () => {
  users.value = await listUsers()

  // Subscribe to registration changes
  onAmiEvent('ContactStatus', updateUserStatus)
})

const createUser = async () => {
  isLoading.value = true
  try {
    await createSipUser(newUser.value)
    users.value = await listUsers()
    newUser.value = { extension: '', displayName: '', password: '', email: '', voicemailEnabled: true }
  } finally {
    isLoading.value = false
  }
}
</script>`,
    },
  ],
}
