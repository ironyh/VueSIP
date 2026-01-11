import type { ExampleDefinition } from './types'
import ConfBridgeDemo from '../demos/ConfBridgeDemo.vue'

export const confBridgeExample: ExampleDefinition = {
  id: 'confbridge',
  icon: '🎤',
  title: 'ConfBridge Manager',
  description: 'Manage Asterisk ConfBridge conferences via AMI',
  tags: ['Conference', 'AMI', 'Audio', 'ConfBridge'],
  component: ConfBridgeDemo,
  setupGuide: `<p>Manage Asterisk ConfBridge audio conferences via AMI. Lock/unlock rooms, record conferences, manage participants including mute, kick, and video source selection.</p>
<h4>Requirements</h4>
<ul>
  <li>Asterisk PBX with ConfBridge configured</li>
  <li>AMI WebSocket connection</li>
  <li>AMI user with ConfBridge permissions</li>
</ul>`,
  codeSnippets: [
    {
      title: 'Basic Setup',
      description: 'Initialize ConfBridge management',
      code: `import { useAmi, useAmiConfBridge } from 'vuesip'
import { computed } from 'vue'

// Connect to AMI
const ami = useAmi()
await ami.connect('ws://pbx:8089/ws')

// Initialize ConfBridge composable
const {
  roomList,
  userList,
  isLoading,
  listRooms,
  listUsers,
  muteUser,
  kickUser,
  lockRoom,
  startRecording,
} = useAmiConfBridge(computed(() => ami.getClient()))

// Fetch all active conferences
await listRooms()
console.log('Active conferences:', roomList.value)`,
    },
    {
      title: 'Manage Conference Rooms',
      description: 'Lock, unlock, and record conferences',
      code: `// Lock a conference (prevent new participants)
await lockRoom('1000')

// Unlock the conference
await unlockRoom('1000')

// Start recording
await startRecording('1000', '/var/spool/asterisk/monitor/conf-1000.wav')

// Stop recording
await stopRecording('1000')

// Refresh room data
await refresh()`,
    },
    {
      title: 'Manage Participants',
      description: 'Mute, unmute, kick users, and set video source',
      code: `// List participants in a conference
await listUsers('1000')

// Mute a participant
await muteUser('1000', 'PJSIP/1001-00000001')

// Unmute a participant
await unmuteUser('1000', 'PJSIP/1001-00000001')

// Kick a participant
await kickUser('1000', 'PJSIP/1001-00000001')

// Set single video source (for video conferences)
await setVideoSource('1000', 'PJSIP/1002-00000002')`,
    },
    {
      title: 'Real-Time Events',
      description: 'Handle join, leave, and talking events',
      code: `const { roomList, userList } = useAmiConfBridge(
  computed(() => ami.getClient()),
  {
    // Auto-refresh on connect
    autoRefresh: true,

    // Handle real-time events
    onUserJoin: (user) => {
      console.log('User joined:', user.callerIdName)
    },
    onUserLeave: (user) => {
      console.log('User left:', user.callerIdName)
    },
    onTalkingChange: (user, isTalking) => {
      console.log(\`\${user.callerIdName} is \${isTalking ? 'talking' : 'silent'}\`)
    },

    // Optional: filter conferences
    conferenceFilter: (room) => room.conference.startsWith('100'),

    // Optional: transform user data
    transformUser: (user) => ({
      ...user,
      displayName: user.callerIdName || user.callerIdNum,
    }),
  }
)`,
    },
  ],
}
