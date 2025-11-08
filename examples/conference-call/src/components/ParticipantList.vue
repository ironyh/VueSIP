<template>
  <div class="card participant-list" role="region" aria-labelledby="participants-heading">
    <h3 id="participants-heading">
      Participants
      <span class="participant-count" aria-live="polite">
        ({{ participants.length }})
      </span>
    </h3>

    <div v-if="participants.length === 0" class="empty-state" role="status">
      <p>No participants yet. Add participants to start the conference.</p>
    </div>

    <ul
      v-else
      class="participants-grid"
      role="list"
      aria-labelledby="participants-heading"
    >
      <ParticipantCard
        v-for="participant in participants"
        :key="participant.id"
        :participant="participant"
        :is-local="participant.id === localParticipantId"
        @mute="$emit('muteParticipant', participant.id)"
        @unmute="$emit('unmuteParticipant', participant.id)"
        @remove="$emit('removeParticipant', participant.id)"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { Participant } from 'vuesip'
import ParticipantCard from './ParticipantCard.vue'

/**
 * Participant List Component
 *
 * Displays all conference participants in a grid layout.
 * Each participant is shown with their status and controls.
 */

interface Props {
  participants: Participant[]
  localParticipantId?: string
}

interface Emits {
  (e: 'muteParticipant', participantId: string): void
  (e: 'unmuteParticipant', participantId: string): void
  (e: 'removeParticipant', participantId: string): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.participant-list h3 {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.participant-count {
  font-size: 0.9rem;
  font-weight: normal;
  color: rgba(255, 255, 255, 0.7);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.participants-grid {
  /* Reset list styles */
  list-style: none;
  padding: 0;
  margin: 0;

  /* Grid layout */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

@media (prefers-color-scheme: light) {
  .participant-count {
    color: rgba(0, 0, 0, 0.7);
  }

  .empty-state {
    color: rgba(0, 0, 0, 0.6);
  }
}

@media (max-width: 768px) {
  .participants-grid {
    grid-template-columns: 1fr;
  }
}
</style>
