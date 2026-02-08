<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Contact } from '../composables/useContacts'
import { useContacts } from '../composables/useContacts'

const props = defineProps<{
  visible: boolean
  initialNumber?: string
}()

const emit = defineEmits<{
  (e: 'select', contact: Contact): void
  (e: 'call', number: string): void
  (e: 'close'): void
}()

const { contacts, favorites, recentContacts, addContact, updateContact, deleteContact, toggleFavorite, searchContacts } = useContacts()

// UI State
const activeTab = ref<'favorites' | 'all' | 'recent'>('favorites')
const searchQuery = ref('')
const showAddModal = ref(false)
const editingContact = ref<Contact | null>(null)
const confirmDelete = ref<string | null>(null)

// Form state
const formName = ref('')
const formNumber = ref('')
const formNotes = ref('')
const formIsFavorite = ref(false)

// Initialize form with initialNumber if provided
watch(() => props.initialNumber, (num) => {
  if (num && showAddModal.value) {
    formNumber.value = num
  }
}, { immediate: true })

// Filtered contacts based on search
const filteredContacts = computed(() => {
  if (!searchQuery.value.trim()) {
    switch (activeTab.value) {
      case 'favorites':
        return favorites.value
      case 'recent':
        return recentContacts.value
      default:
        return contacts.value.sort((a, b) => a.name.localeCompare(b.name))
    }
  }
  return searchContacts(searchQuery.value)
})

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Format phone number for display
function formatNumber(number: string): string {
  // Simple formatting - can be enhanced for different locales
  if (number.startsWith('+46')) {
    return number.replace(/(\+46)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }
  if (number.startsWith('0') && number.length === 10) {
    return number.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1-$2 $3 $4')
  }
  return number
}

// Open add modal
function openAddModal() {
  editingContact.value = null
  formName.value = ''
  formNumber.value = props.initialNumber || ''
  formNotes.value = ''
  formIsFavorite.value = false
  showAddModal.value = true
}

// Open edit modal
function openEditModal(contact: Contact) {
  editingContact.value = contact
  formName.value = contact.name
  formNumber.value = contact.number
  formNotes.value = contact.notes || ''
  formIsFavorite.value = contact.isFavorite || false
  showAddModal.value = true
}

// Save contact
function saveContact() {
  if (!formName.value.trim() || !formNumber.value.trim()) return

  if (editingContact.value) {
    updateContact(editingContact.value.id, {
      name: formName.value.trim(),
      number: formNumber.value.trim(),
      notes: formNotes.value.trim() || undefined,
      isFavorite: formIsFavorite.value,
    })
  } else {
    addContact({
      name: formName.value.trim(),
      number: formNumber.value.trim(),
      notes: formNotes.value.trim() || undefined,
      isFavorite: formIsFavorite.value,
    })
  }

  showAddModal.value = false
  editingContact.value = null
}

// Delete contact
function handleDelete(id: string) {
  deleteContact(id)
  confirmDelete.value = null
}

// Select contact (fill in dialpad)
function selectContact(contact: Contact) {
  emit('select', contact)
}

// Call contact directly
function callContact(number: string) {
  emit('call', number)
}

// Close on escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showAddModal.value) {
      showAddModal.value = false
    } else {
      emit('close')
    }
  }
}

// Add keyboard listener
watch(() => props.visible, (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <Transition name="slide-up">
    <div v-if="visible" class="contacts-overlay" @click.self="$emit('close')">
      <div class="contacts-container">
        <!-- Header -->
        <div class="contacts-header">
          <h2>Contacts</h2>
          <div class="header-actions">
            <button class="btn-add" @click="openAddModal" title="Add Contact">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button class="btn-close" @click="$emit('close')">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-container">
          <svg
            class="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search contacts..."
            class="search-input"
          />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div v-if="!searchQuery" class="contacts-tabs">
          <button
            :class="['tab', { active: activeTab === 'favorites' }]"
            @click="activeTab = 'favorites'"
          >
            ★ Favorites
          </button>
          <button
            :class="['tab', { active: activeTab === 'recent' }]"
            @click="activeTab = 'recent'"
          >
            🕒 Recent
          </button>
          <button :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'">
            All
          </button>
        </div>

        <!-- Contact List -->
        <div class="contacts-list">
          <div v-if="filteredContacts.length === 0" class="empty-state">
            <div class="empty-icon">👤</div>
            <p v-if="searchQuery">No contacts found matching "{{ searchQuery }}"</p>
            <p v-else-if="activeTab === 'favorites'">No favorites yet. Tap the ★ on any contact!</p>
            <p v-else-if="activeTab === 'recent'">No recent calls to contacts.</p>
            <p v-else>No contacts yet. Click + to add your first contact!</p>
          </div>

          <div v-for="contact in filteredContacts" :key="contact.id" class="contact-item">
            <!-- Avatar -->
            <div
              class="contact-avatar"
              :style="{ backgroundColor: contact.color }"
              @click="selectContact(contact)"
            >
              {{ getInitials(contact.name) }}
            </div>

            <!-- Info -->
            <div class="contact-info" @click="selectContact(contact)">
              <div class="contact-name">{{ contact.name }}</div>
              <div class="contact-number">{{ formatNumber(contact.number) }}</div>
              <div v-if="contact.notes" class="contact-notes">{{ contact.notes }}</div>
            </div>

            <!-- Actions -->
            <div class="contact-actions">
              <button
                :class="['btn-favorite', { active: contact.isFavorite }]"
                @click="toggleFavorite(contact.id)"
                title="Toggle Favorite"
              >
                {{ contact.isFavorite ? '★' : '☆' }}
              </button>
              <button class="btn-call" @click="callContact(contact.number)" title="Call">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                  ></path>
                </svg>
              </button>
              <button class="btn-edit" @click="openEditModal(contact)" title="Edit">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <Transition name="fade">
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
          <div class="modal-container">
            <h3>{{ editingContact ? 'Edit Contact' : 'Add Contact' }}</h3>

            <div class="form-group">
              <label>Name *</label>
              <input
                v-model="formName"
                type="text"
                placeholder="Contact name"
                @keyup.enter="saveContact"
                ref="nameInput"
              />
            </div>

            <div class="form-group">
              <label>Phone Number *</label>
              <input
                v-model="formNumber"
                type="tel"
                placeholder="+46 70 123 45 67"
                @keyup.enter="saveContact"
              />
            </div>

            <div class="form-group">
              <label>Notes (optional)</label>
              <textarea v-model="formNotes" rows="2" placeholder="Add a note..."></textarea>
            </div>

            <label class="form-checkbox">
              <input type="checkbox" v-model="formIsFavorite" />
              <span>Add to Favorites</span>
            </label>

            <div class="modal-actions">
              <button
                v-if="editingContact"
                class="btn-delete"
                @click="confirmDelete = editingContact.id"
              >
                Delete
              </button>
              <div class="spacer"></div>
              <button class="btn-cancel" @click="showAddModal = false">Cancel</button>
              <button
                class="btn-save"
                :disabled="!formName.trim() || !formNumber.trim()"
                @click="saveContact"
              >
                {{ editingContact ? 'Save' : 'Add' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Delete Confirmation -->
      <Transition name="fade">
        <div v-if="confirmDelete" class="modal-overlay" @click.self="confirmDelete = null">
          <div class="modal-container modal-small">
            <h3>Delete Contact?</h3>
            <p>This action cannot be undone.</p>
            <div class="modal-actions">
              <button class="btn-cancel" @click="confirmDelete = null">Cancel</button>
              <button class="btn-delete" @click="handleDelete(confirmDelete)">Delete</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.contacts-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.contacts-container {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 24px 24px 0 0;
  height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.contacts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.contacts-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-add,
.btn-close {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover,
.btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-add {
  background: linear-gradient(135deg, #10b981, #059669);
}

.search-container {
  position: relative;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.search-icon {
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.08);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-clear {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear:hover {
  color: white;
}

.contacts-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  overflow-x: auto;
}

.tab {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.tab:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
}

.contacts-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.contact-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.contact-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  color: white;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.contact-avatar:hover {
  transform: scale(1.05);
}

.contact-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.contact-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-number {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-notes {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-actions {
  display: flex;
  gap: 4px;
}

.btn-favorite,
.btn-call,
.btn-edit {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.125rem;
}

.btn-favorite {
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
}

.btn-favorite.active {
  color: #fbbf24;
}

.btn-call {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.btn-call:hover {
  background: rgba(16, 185, 129, 0.3);
}

.btn-edit {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.btn-edit:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 200;
}

.modal-container {
  background: linear-gradient(180deg, #1e1e3f 0%, #1a1a2e 100%);
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  animation: fadeIn 0.2s ease-out;
}

.modal-small {
  max-width: 320px;
  text-align: center;
}

.modal-container h3 {
  margin: 0 0 20px 0;
  font-size: 1.25rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.08);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9375rem;
}

.form-checkbox input[type='checkbox'] {
  width: 20px;
  height: 20px;
  accent-color: #3b82f6;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.spacer {
  flex: 1;
}

.btn-cancel,
.btn-save,
.btn-delete {
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-save {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scrollbar styling */
.contacts-list::-webkit-scrollbar {
  width: 6px;
}

.contacts-list::-webkit-scrollbar-track {
  background: transparent;
}

.contacts-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.contacts-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
