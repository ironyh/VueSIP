<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import VideoGrid from './components/VideoGrid.vue'
import ControlBar from './components/ControlBar.vue'
import ChatPanel from './components/ChatPanel.vue'
import ParticipantList from './components/ParticipantList.vue'
import ScreenShareView from './components/ScreenShareView.vue'
import { useVideoRoom } from './composables/useVideoRoom'
import { useScreenShare } from './composables/useScreenShare'

// Room state
const roomId = ref('')
const userName = ref('')
const isJoined = ref(false)
const showJoinDialog = ref(true)
const showChat = ref(false)
const showParticipants = ref(false)

// Use composables
const videoRoom = useVideoRoom()
const screenShare = useScreenShare()

// Computed
const activeScreenShare = computed(() => {
  if (screenShare.isSharing.value) {
    return {
      participantId: videoRoom.localParticipant.value?.id ?? 'local',
      participantName: videoRoom.localParticipant.value?.name ?? 'You',
      stream: screenShare.stream.value,
    }
  }
  // Check if any remote participant is sharing
  const sharingParticipant = videoRoom.participants.value.find((p) => p.isScreenSharing)
  if (sharingParticipant) {
    return {
      participantId: sharingParticipant.id,
      participantName: sharingParticipant.name,
      stream: sharingParticipant.screenStream ?? null,
    }
  }
  return null
})

const canJoin = computed(() => roomId.value.trim() !== '' && userName.value.trim() !== '')

// Methods
async function handleJoinRoom() {
  if (!canJoin.value) return

  try {
    await videoRoom.joinRoom(roomId.value.trim(), userName.value.trim())
    isJoined.value = true
    showJoinDialog.value = false
  } catch (error) {
    console.error('Failed to join room:', error)
  }
}

function handleLeaveRoom() {
  videoRoom.leaveRoom()
  screenShare.stopSharing()
  isJoined.value = false
  showJoinDialog.value = true
  showChat.value = false
  showParticipants.value = false
}

function handleToggleVideo() {
  videoRoom.toggleVideo()
}

function handleToggleMute() {
  videoRoom.toggleAudio()
}

async function handleToggleScreenShare() {
  if (screenShare.isSharing.value) {
    screenShare.stopSharing()
  } else {
    try {
      await screenShare.startSharing()
    } catch (error) {
      console.error('Failed to start screen sharing:', error)
    }
  }
}

function handleToggleChat() {
  showChat.value = !showChat.value
}

function handleToggleParticipants() {
  showParticipants.value = !showParticipants.value
}

function handlePinParticipant(participantId: string) {
  videoRoom.pinParticipant(participantId)
}

function handleUnpinParticipant() {
  videoRoom.unpinParticipant()
}

function handleStopScreenShare() {
  screenShare.stopSharing()
}

// Watch for screen share ending
watch(
  () => screenShare.isSharing.value,
  (isSharing) => {
    if (!isSharing && videoRoom.localParticipant.value) {
      // Update local participant screen sharing status
    }
  }
)
</script>

<template>
  <div class="video-room-app">
    <!-- Join Dialog -->
    <Dialog
      v-model:visible="showJoinDialog"
      header="Join Video Room"
      :modal="true"
      :closable="false"
      :draggable="false"
      :style="{ width: '400px' }"
      class="join-dialog"
    >
      <div class="join-form">
        <div class="form-field">
          <label for="room-id">Room ID</label>
          <InputText
            id="room-id"
            v-model="roomId"
            placeholder="Enter room ID"
            class="w-full"
            @keyup.enter="handleJoinRoom"
          />
        </div>
        <div class="form-field">
          <label for="user-name">Your Name</label>
          <InputText
            id="user-name"
            v-model="userName"
            placeholder="Enter your name"
            class="w-full"
            @keyup.enter="handleJoinRoom"
          />
        </div>
      </div>
      <template #footer>
        <Button
          label="Join Room"
          icon="pi pi-sign-in"
          :disabled="!canJoin"
          @click="handleJoinRoom"
        />
      </template>
    </Dialog>

    <!-- Main Room Interface -->
    <div v-if="isJoined" class="room-container">
      <!-- Header -->
      <header class="room-header">
        <div class="room-info">
          <h1>{{ roomId }}</h1>
          <span class="participant-count">
            <i class="pi pi-users" />
            {{ videoRoom.participants.value.length + 1 }} participants
          </span>
        </div>
        <div class="header-actions">
          <Button
            v-tooltip.bottom="'Participants'"
            :icon="showParticipants ? 'pi pi-users' : 'pi pi-users'"
            :class="{ active: showParticipants }"
            text
            rounded
            @click="handleToggleParticipants"
          />
          <Button
            v-tooltip.bottom="'Chat'"
            :icon="showChat ? 'pi pi-comments' : 'pi pi-comment'"
            :class="{ active: showChat }"
            text
            rounded
            @click="handleToggleChat"
          />
        </div>
      </header>

      <!-- Main Content -->
      <div class="room-content">
        <!-- Screen Share View (when active) -->
        <ScreenShareView
          v-if="activeScreenShare"
          :participant-id="activeScreenShare.participantId"
          :participant-name="activeScreenShare.participantName"
          :stream="activeScreenShare.stream"
          :is-local="
            activeScreenShare.participantId === videoRoom.localParticipant.value?.id ||
            activeScreenShare.participantId === 'local'
          "
          @stop-sharing="handleStopScreenShare"
        />

        <!-- Video Grid -->
        <VideoGrid
          :participants="videoRoom.participants.value"
          :local-participant="videoRoom.localParticipant.value"
          :active-speaker-id="videoRoom.activeSpeakerId.value"
          :pinned-participant-id="videoRoom.pinnedParticipantId.value"
          :is-screen-sharing="!!activeScreenShare"
          @pin="handlePinParticipant"
          @unpin="handleUnpinParticipant"
        />

        <!-- Sidebars -->
        <Transition name="slide">
          <ParticipantList
            v-if="showParticipants"
            :participants="videoRoom.participants.value"
            :local-participant="videoRoom.localParticipant.value"
            :active-speaker-id="videoRoom.activeSpeakerId.value"
            @close="showParticipants = false"
          />
        </Transition>

        <Transition name="slide">
          <ChatPanel
            v-if="showChat"
            :room-id="roomId"
            :user-name="userName"
            @close="showChat = false"
          />
        </Transition>
      </div>

      <!-- Control Bar -->
      <ControlBar
        :is-video-enabled="videoRoom.isVideoEnabled.value"
        :is-audio-enabled="videoRoom.isAudioEnabled.value"
        :is-screen-sharing="screenShare.isSharing.value"
        @toggle-video="handleToggleVideo"
        @toggle-audio="handleToggleMute"
        @toggle-screen-share="handleToggleScreenShare"
        @leave="handleLeaveRoom"
      />
    </div>
  </div>
</template>

<style scoped>
.video-room-app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
  color: var(--text-color);
  overflow: hidden;
}

.join-dialog :deep(.p-dialog-content) {
  padding: 1.5rem;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.w-full {
  width: 100%;
}

.room-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}

.room-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.room-info h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.participant-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.header-actions .active {
  background: var(--primary-color);
  color: var(--primary-color-text);
}

.room-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

/* Slide transition for sidebars */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
