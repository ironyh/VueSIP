<template>
  <div class="playground" data-testid="sip-client">
    <!-- Header -->
    <header class="playground-header">
      <div class="container">
        <div class="header-content">
          <div class="header-title">
            <h1>VueSIP Playground</h1>
            <p class="subtitle">Interactive demos for SIP/VoIP composables</p>
          </div>
          <div class="header-actions">
            <button
              data-testid="playground-connect-cta"
              class="connect-cta"
              :class="{
                'cta-ready': isConnected && isRegistered,
                'cta-connected': isConnected && !isRegistered,
              }"
              type="button"
              @click="openConnectionSettings"
              :aria-label="
                isConnected
                  ? isRegistered
                    ? 'SIP ready for calls – open settings'
                    : 'SIP connected – open settings'
                  : 'Configure SIP connection'
              "
            >
              <span
                class="cta-dot"
                :class="{
                  ready: isConnected && isRegistered,
                  connected: isConnected && !isRegistered,
                }"
              ></span>
              <span>{{
                isConnected ? (isRegistered ? 'Ready' : 'Connected') : 'Configure SIP connection'
              }}</span>
            </button>
            <button
              @click="toggleTheme"
              class="theme-toggle"
              :aria-label="`Switch to ${isDarkMode ? 'light' : 'dark'} mode`"
              type="button"
            >
              <svg
                v-if="isDarkMode"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Call Toolbar -->
    <CallToolbar @open-settings="selectExample('settings')" />

    <!-- Main Content -->
    <div class="playground-content">
      <!-- Sidebar Navigation -->
      <aside class="playground-sidebar">
        <nav>
          <h2>Examples</h2>

          <!-- Category Filter - Segmented Control -->
          <div class="category-filter" role="tablist" aria-label="Filter by category">
            <div class="filter-track">
              <button
                :class="['filter-segment', { active: activeCategory === 'all' }]"
                @click="selectCategory('all')"
                type="button"
                role="tab"
                :aria-selected="activeCategory === 'all'"
              >
                <span class="segment-label">All</span>
                <span v-if="activeCategory === 'all'" class="segment-count">{{
                  categoryCounts.all
                }}</span>
              </button>
              <button
                v-for="cat in categoryOrder"
                :key="cat"
                :class="['filter-segment', { active: activeCategory === cat }]"
                @click="selectCategory(cat)"
                type="button"
                role="tab"
                :aria-selected="activeCategory === cat"
                :title="categoryInfo[cat].description"
              >
                <svg
                  class="segment-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path :d="categoryInfo[cat].icon" />
                </svg>
                <span v-if="activeCategory === cat" class="segment-label">{{
                  categoryInfo[cat].label
                }}</span>
                <span v-if="activeCategory === cat" class="segment-count">{{
                  categoryCounts[cat]
                }}</span>
              </button>
            </div>
          </div>

          <!-- Search Input -->
          <div class="search-box">
            <input
              v-model="searchQuery"
              data-testid="playground-search-input"
              type="search"
              :placeholder="
                activeCategory === 'all'
                  ? 'Search all demos...'
                  : `Search ${categoryInfo[activeCategory]?.label || 'demos'}...`
              "
              class="search-input"
              aria-label="Search demos"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="clear-search"
              aria-label="Clear search"
              type="button"
            >
              ✕
            </button>
          </div>

          <!-- Filter Stats -->
          <div v-if="searchQuery || activeCategory !== 'all'" class="filter-stats">
            Showing {{ filteredExamples.length }} of {{ categoryCounts[activeCategory] }} demos
            <span v-if="activeCategory !== 'all'" class="active-filter">
              in {{ categoryInfo[activeCategory]?.label }}
            </span>
          </div>

          <!-- Example List -->
          <ul class="example-list" data-testid="example-list">
            <li
              v-for="example in filteredExamples"
              :key="example.id"
              :data-testid="`example-item-${example.id}`"
              :class="{ active: currentExample === example.id }"
              @click="selectExample(example.id)"
            >
              <div class="example-info">
                <h3 v-html="highlightMatch(example.title)"></h3>
                <p v-html="highlightMatch(example.description)"></p>
              </div>
              <!-- Show matching tags when searching -->
              <div
                v-if="searchQuery && getMatchingTags(example.tags).length > 0"
                class="matching-tags"
              >
                <span v-for="tag in getMatchingTags(example.tags)" :key="tag" class="tag-badge">
                  {{ tag }}
                </span>
              </div>
            </li>
          </ul>

          <!-- No Results Message -->
          <div v-if="filteredExamples.length === 0" class="no-results">
            <p>No demos found matching "{{ searchQuery }}"</p>
            <button @click="searchQuery = ''" type="button" class="btn-secondary">
              Clear search
            </button>
          </div>
        </nav>

        <!-- Quick Links -->
        <div class="quick-links">
          <h3>Resources</h3>
          <ul>
            <li>
              <a href="/docs" target="_blank">Documentation</a>
            </li>
            <li>
              <a href="https://github.com/anthropics/VueSip" target="_blank">GitHub</a>
            </li>
            <li>
              <a href="https://www.npmjs.com/package/vuesip" target="_blank">NPM</a>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Main Area -->
      <main class="playground-main">
        <!-- Example Header -->
        <div class="example-header">
          <div class="example-title-row">
            <h2 data-testid="active-example-title">{{ activeExample.title }}</h2>
            <button
              @click="copyShareLink"
              class="share-link-btn"
              :class="{ copied: linkCopied }"
              :aria-label="linkCopied ? 'Link copied!' : 'Copy link to this demo'"
              type="button"
            >
              <svg
                v-if="!linkCopied"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ linkCopied ? 'Copied!' : 'Share' }}</span>
            </button>
          </div>
          <p>{{ activeExample.description }}</p>
          <div class="example-tags">
            <span v-for="tag in activeExample.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-navigation">
          <button :class="{ active: activeTab === 'demo' }" @click="selectTab('demo')">Demo</button>
          <button :class="{ active: activeTab === 'code' }" @click="selectTab('code')">Code</button>
          <button :class="{ active: activeTab === 'setup' }" @click="selectTab('setup')">
            Setup
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Live Demo Tab -->
          <div v-show="activeTab === 'demo'" class="demo-container" data-testid="demo-container">
            <KeepAlive>
              <component
                v-if="activeExample?.component"
                :is="activeExample.component"
                :key="activeExample.id"
              />
            </KeepAlive>
            <div v-if="!activeExample?.component" class="error-message">
              Component not found for this example.
            </div>
          </div>

          <!-- Code Examples Tab -->
          <div v-show="activeTab === 'code'" class="code-container">
            <div
              v-for="(snippet, index) in activeExample.codeSnippets"
              :key="index"
              class="code-snippet"
            >
              <h3>{{ snippet.title }}</h3>
              <p v-if="snippet.description" class="snippet-description">
                {{ snippet.description }}
              </p>
              <div class="code-block-wrapper">
                <button
                  @click="copyCode(snippet.code, index)"
                  class="copy-button"
                  :class="{ copied: copiedSnippets[index] }"
                  :aria-label="copiedSnippets[index] ? 'Copied!' : 'Copy code'"
                  type="button"
                >
                  <span class="copy-text">
                    {{ copiedSnippets[index] ? 'Copied' : 'Copy' }}
                  </span>
                </button>
                <pre><code>{{ snippet.code }}</code></pre>
              </div>
            </div>
          </div>

          <!-- Setup Guide Tab -->
          <div v-show="activeTab === 'setup'" class="setup-container">
            <div class="setup-content">
              <h3>Prerequisites</h3>
              <ul>
                <li>Vue 3.4.0 or higher</li>
                <li>A SIP server (Asterisk, FreeSWITCH, etc.)</li>
                <li>WebRTC-enabled browser (Chrome 90+, Firefox 88+, Safari 14+)</li>
              </ul>

              <h3>Installation</h3>
              <pre><code># npm
npm install vuesip

# pnpm
pnpm add vuesip

# yarn
yarn add vuesip</code></pre>

              <h3>Quick Start</h3>
              <pre><code>import { useSipClient, useCallSession } from 'vuesip'

// In your component
const { connect, isConnected } = useSipClient()
const { makeCall, answer, hangup } = useCallSession()</code></pre>

              <h3>{{ activeExample.title }} Specific Setup</h3>
              <div v-html="activeExample.setupGuide"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { allExamples, examplesByCategory, categoryInfo } from './examples'
import type { ExampleCategory } from './examples'
import CallToolbar from './components/CallToolbar.vue'
import { playgroundSipClient } from './sipClient'
import { useConnectionManager } from './composables/useConnectionManager'

// Connection Manager for auto-connect
const connectionManager = useConnectionManager()

// Legacy localStorage keys (for migration support)
const CREDENTIALS_STORAGE_KEY = 'vuesip-credentials'
const CREDENTIALS_OPTIONS_KEY = 'vuesip-credentials-options'

interface StoredCredentials {
  uri: string
  sipUri: string
  password?: string
  displayName: string
  timestamp: string
}

interface CredentialsOptions {
  rememberMe: boolean
  savePassword: boolean
}

// Use imported examples
const examples = allExamples

// Get shared SIP client for global auto-connect (lazy-loaded via Proxy)
const {
  connect,
  disconnect: _disconnect,
  isConnected,
  isRegistered,
  updateConfig,
} = playgroundSipClient

// State
const currentExample = ref('click-to-call-widget')
const activeTab = ref<'demo' | 'code' | 'setup'>('demo')
const searchQuery = ref('')
const copiedSnippets = ref<Record<number, boolean>>({})
const isDarkMode = ref(false)
const linkCopied = ref(false)
const activeCategory = ref<ExampleCategory | 'all'>('all')

// Category order for display
const categoryOrder: ExampleCategory[] = ['sip', 'ami', 'utility']

// URL Hash Routing
const parseHashRoute = () => {
  const hash = window.location.hash.slice(1) // Remove the #
  if (!hash) return { example: 'click-to-call-widget', tab: 'demo' as const }

  // Support formats: #basic-call, #basic-call/code, #basic-call/setup
  const parts = hash.split('/')
  const example = parts[0] || 'click-to-call-widget'
  const tab = (parts[1] as 'demo' | 'code' | 'setup') || 'demo'

  // Validate example exists
  const validExample = examples.find((ex) => ex.id === example) ? example : 'click-to-call-widget'
  // Validate tab
  const validTab = ['demo', 'code', 'setup'].includes(tab) ? tab : 'demo'

  return { example: validExample, tab: validTab as 'demo' | 'code' | 'setup' }
}

const updateHashRoute = () => {
  const tab = activeTab.value === 'demo' ? '' : `/${activeTab.value}`
  const newHash = `#${currentExample.value}${tab}`
  if (window.location.hash !== newHash) {
    window.history.pushState(null, '', newHash)
  }
}

// Computed - get examples based on active category
const categoryExamples = computed(() => {
  if (activeCategory.value === 'all') {
    return examples
  }
  return examplesByCategory[activeCategory.value] || []
})

const filteredExamples = computed(() => {
  const baseExamples = categoryExamples.value

  if (!searchQuery.value.trim()) {
    return baseExamples
  }

  const query = searchQuery.value.toLowerCase()
  return baseExamples.filter((example) => {
    // Search in title
    if (example.title.toLowerCase().includes(query)) return true

    // Search in description
    if (example.description.toLowerCase().includes(query)) return true

    // Search in tags
    if (example.tags.some((tag) => tag.toLowerCase().includes(query))) return true

    return false
  })
})

// Get count of examples per category
const categoryCounts = computed(() => ({
  all: examples.length,
  sip: examplesByCategory.sip.length,
  ami: examplesByCategory.ami.length,
  utility: examplesByCategory.utility.length,
}))

const activeExample = computed(() => {
  return examples.find((ex) => ex.id === currentExample.value) || examples[0]
})

const scrollToTop = () => {
  // Avoid smooth scrolling during automation (it slows tests and can create timing flake)
  const behavior = navigator.webdriver ? 'auto' : 'smooth'
  window.scrollTo({ top: 0, behavior })
}

// Methods
const selectExample = (id: string) => {
  currentExample.value = id
  activeTab.value = 'demo'
  updateHashRoute()
  // Scroll to top of main content area
  scrollToTop()
}

const openConnectionSettings = () => {
  // Jump directly to the Settings demo, which hosts the SIP Connection Manager panel
  selectExample('settings')
}

const selectCategory = (category: ExampleCategory | 'all') => {
  activeCategory.value = category
  // Clear search when switching categories
  searchQuery.value = ''
}

const selectTab = (tab: 'demo' | 'code' | 'setup') => {
  activeTab.value = tab
  updateHashRoute()
}

const copyShareLink = async () => {
  try {
    const url = window.location.href
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy link:', error)
  }
}

const highlightMatch = (text: string): string => {
  if (!searchQuery.value.trim()) return text

  const regex = new RegExp(`(${searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

const getMatchingTags = (tags: string[]): string[] => {
  if (!searchQuery.value.trim()) return []

  const query = searchQuery.value.toLowerCase()
  return tags.filter((tag) => tag.toLowerCase().includes(query))
}

const copyCode = async (code: string, index: number) => {
  try {
    // Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code)
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    // Show success feedback
    copiedSnippets.value[index] = true

    // Reset after 2 seconds
    setTimeout(() => {
      copiedSnippets.value[index] = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy code:', error)
    alert('Failed to copy code. Please select and copy manually.')
  }
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}

const applyTheme = (dark: boolean) => {
  if (dark) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

// Global credential loading for auto-connect across all demos
const loadAndConnectCredentials = async () => {
  // First, try to use the Connection Manager's default connection
  const defaultConnection = connectionManager.defaultConnection.value

  if (defaultConnection && !isConnected.value) {
    console.log('🔍 PlaygroundApp: Found default connection:', defaultConnection.name)

    // Build config object from the default connection
    const config: any = {
      uri: defaultConnection.uri,
      sipUri: defaultConnection.sipUri,
      displayName: defaultConnection.displayName || undefined,
      autoRegister: true,
      connectionTimeout: 10000,
      registerExpires: 600,
      mediaConfiguration: defaultConnection.audioCodec
        ? { audioCodec: defaultConnection.audioCodec }
        : undefined,
    }

    // Add password if it was saved
    if (defaultConnection.savePassword && defaultConnection.password) {
      config.password = defaultConnection.password
    }

    console.log('📝 PlaygroundApp: Auto-connecting with default connection:', {
      name: defaultConnection.name,
      uri: config.uri,
      sipUri: config.sipUri,
      hasPassword: !!config.password,
    })

    // Update configuration
    const validationResult = updateConfig(config)

    if (!validationResult.valid) {
      console.error('PlaygroundApp: Invalid default connection config:', validationResult.errors)
      return
    }

    // Mark this connection as active
    connectionManager.setActiveConnection(defaultConnection.id)

    // Auto-connect
    try {
      await connect()
      console.log('✅ PlaygroundApp: Auto-connect with default connection successful')
      return // Success - no need to try legacy storage
    } catch (error) {
      console.error('❌ PlaygroundApp: Auto-connect with default connection failed:', error)
      // Continue to try legacy storage as fallback
    }
  }

  // Fallback: Try legacy localStorage credentials
  const saved = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
  const options = localStorage.getItem(CREDENTIALS_OPTIONS_KEY)

  if (saved && options) {
    try {
      const credentials: StoredCredentials = JSON.parse(saved)
      const opts: CredentialsOptions = JSON.parse(options)

      // Debug: Log what was loaded from localStorage
      console.log('🔍 PlaygroundApp: Loaded from legacy localStorage:', {
        uri: credentials.uri,
        sipUri: credentials.sipUri,
        displayName: credentials.displayName,
        hasPassword: !!credentials.password,
        rememberMe: opts.rememberMe,
        savePassword: opts.savePassword,
      })

      // Only auto-connect if rememberMe is enabled and not already connected
      if (opts.rememberMe && !isConnected.value) {
        console.log('🌐 PlaygroundApp: Loading legacy credentials for global auto-connect...')

        // Build config object
        const config: any = {
          uri: credentials.uri,
          sipUri: credentials.sipUri,
          displayName: credentials.displayName || undefined,
          autoRegister: true,
          connectionTimeout: 10000,
          registerExpires: 600,
        }

        // Add password if it was saved
        if (opts.savePassword && credentials.password) {
          config.password = credentials.password
        }

        // Update configuration
        const validationResult = updateConfig(config)

        if (!validationResult.valid) {
          console.error('PlaygroundApp: Invalid legacy credentials:', validationResult.errors)
          return
        }

        // Auto-connect
        try {
          await connect()
          console.log('✅ PlaygroundApp: Global auto-connect with legacy credentials successful')
        } catch (error) {
          console.error('❌ PlaygroundApp: Global auto-connect failed:', error)
          // Don't throw - allow user to manually connect from BasicCallDemo
        }
      }
    } catch (error) {
      console.error('PlaygroundApp: Failed to load legacy credentials:', error)
    }
  }
}

// Handle browser back/forward navigation
const handleHashChange = () => {
  const { example, tab } = parseHashRoute()
  currentExample.value = example
  activeTab.value = tab
  // Scroll to top when navigating via browser history
  scrollToTop()
}

// Initialize theme from localStorage or system preference
onMounted(async () => {
  // 1. Initialize URL hash routing - load state from URL
  const { example, tab } = parseHashRoute()
  currentExample.value = example
  activeTab.value = tab

  // Listen for browser back/forward navigation
  window.addEventListener('hashchange', handleHashChange)

  // 2. Try to auto-connect with saved credentials (global for all demos)
  await loadAndConnectCredentials()

  // 3. Initialize theme
  const stored = localStorage.getItem('vuesip-theme')
  if (stored) {
    isDarkMode.value = stored === 'dark'
  } else {
    isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme(isDarkMode.value)
})

// Cleanup
onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange)
})

// Watch for theme changes
watch(isDarkMode, (newValue) => {
  applyTheme(newValue)
  localStorage.setItem('vuesip-theme', newValue ? 'dark' : 'light')
})
</script>

<style scoped>
.playground {
  min-height: 100vh;
  background: var(--bg-secondary);
}

.playground-header {
  position: relative;
  background: #1a1a2e;
  color: white;
  padding: 1.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.playground-header .container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

.playground-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  font-size: 1.125rem;
  opacity: 0.95;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-title {
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.connect-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #16a34a, #22c55e);
  color: #052e16;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(22, 163, 74, 0.35);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease,
    opacity 0.15s ease;
}

.connect-cta:hover {
  background: linear-gradient(135deg, #15803d, #22c55e);
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(21, 128, 61, 0.4);
}

.connect-cta:active {
  transform: translateY(0);
  box-shadow: 0 3px 10px rgba(22, 163, 74, 0.35);
}

.connect-cta:focus-visible {
  outline: 2px solid #22c55e;
  outline-offset: 2px;
}

.cta-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #bbf7d0;
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.35);
}

.cta-dot.connected {
  background: #fcd34d;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.35);
}

.cta-dot.ready {
  background: #6ee7b7;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.35);
}

.connect-cta.cta-connected {
  background: linear-gradient(135deg, #b45309, #d97706);
  color: #fff7ed;
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);
}

.connect-cta.cta-connected:hover {
  background: linear-gradient(135deg, #92400e, #b45309);
  box-shadow: 0 8px 22px rgba(245, 158, 11, 0.4);
}

.connect-cta.cta-ready {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ecfdf5;
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.connect-cta.cta-ready:hover {
  background: linear-gradient(135deg, #047857, #059669);
  box-shadow: 0 8px 22px rgba(16, 185, 129, 0.4);
}

.theme-toggle {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.5rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  backdrop-filter: blur(6px) saturate(120%);
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.theme-icon {
  display: block;
  line-height: 1;
}

.playground-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  max-width: 1400px;
  margin: 2rem auto;
  gap: 2rem;
  padding: 0 2rem;
}

/* Sidebar */
.playground-sidebar {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  height: fit-content;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  position: sticky;
  top: 2rem;
}

.playground-sidebar h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

/* Category Filter - Segmented Control */
.category-filter {
  margin-bottom: 0.75rem;
}

.filter-track {
  display: flex;
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
  overflow: hidden;
}

.filter-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  flex: 0 0 auto;
  padding: 0.4rem 0.5rem;
  background: transparent;
  border: none;
  border-radius: 7px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color 0.2s ease,
    flex 0.2s ease;
  white-space: nowrap;
  position: relative;
  z-index: 1;
  min-width: 32px;
}

.filter-segment:hover:not(.active) {
  color: var(--text-primary);
}

.filter-segment.active {
  color: white;
  flex: 1 1 auto;
  background: linear-gradient(135deg, var(--primary), #4f46e5);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
}

.segment-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.segment-label {
  display: inline;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.segment-count {
  font-size: 0.55rem;
  padding: 0.1rem 0.3rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  min-width: 1rem;
  text-align: center;
}

.filter-segment.active .segment-count {
  background: rgba(255, 255, 255, 0.25);
}

.filter-stats .active-filter {
  font-weight: 600;
  color: var(--primary);
}

/* Search Box */
.search-box {
  position: relative;
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 1px solid var(--gray-300);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  transition: all 0.2s;
  color: var(--text-primary);
  background: var(--bg-card);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 1.125rem;
  line-height: 1;
  transition: color 0.2s;
}

.clear-search:hover {
  color: var(--danger);
}

/* Filter Stats */
.filter-stats {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  text-align: center;
}

/* Highlight Mark */
:deep(mark) {
  background-color: #fef3c7;
  color: inherit;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-weight: 600;
}

/* Matching Tags */
.matching-tags {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.tag-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: var(--primary);
  color: white;
  border-radius: 3px;
  font-weight: 500;
}

/* No Results */
.no-results {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
}

.no-results p {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--border-color);
}

.example-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.example-list li {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid var(--border-color);
  background:
    linear-gradient(var(--bg-primary), var(--bg-primary)) padding-box,
    linear-gradient(180deg, transparent, rgba(102, 126, 234, 0.15)) border-box;
  position: relative;
  overflow: hidden;
}

.example-list li:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.example-list li::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255, 255, 255, 0.06) 35%,
    transparent 65%
  );
  opacity: 0;
  transform: translateX(-15%);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  pointer-events: none;
}

.example-list li:hover::after {
  opacity: 1;
  transform: translateX(0);
}

.example-list li.active {
  background:
    linear-gradient(var(--bg-primary), var(--bg-primary)) padding-box,
    linear-gradient(180deg, rgba(102, 126, 234, 0.6), rgba(99, 102, 241, 0.6)) border-box;
  border-color: transparent;
}

.example-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.example-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.example-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Quick Links */
.quick-links {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.quick-links h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.quick-links ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.quick-links li {
  margin-bottom: 0.5rem;
}

.quick-links a {
  color: var(--primary);
  text-decoration: none;
  font-size: 0.875rem;
  display: block;
  padding: 0.5rem;
  border-radius: 4px;
  transition:
    background 0.2s,
    color 0.2s;
}

.quick-links a:hover {
  background: rgba(102, 126, 234, 0.08);
  color: var(--primary-dark);
}

/* Main Area */
.playground-main {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 2rem;
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  min-height: 600px;
  border: 1px solid var(--border-color);
}

.example-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: var(--text-primary);
}

/* Share Link Button */
.example-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.example-title-row h2 {
  margin: 0;
}

.share-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.share-link-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.share-link-btn.copied {
  background: var(--success);
  color: white;
  border-color: var(--success);
}

.share-link-btn svg {
  flex-shrink: 0;
}

.example-header p {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  font-size: 1.125rem;
}

.example-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tag {
  background:
    linear-gradient(var(--bg-primary), var(--bg-primary)) padding-box,
    linear-gradient(90deg, rgba(99, 102, 241, 0.65), rgba(59, 130, 246, 0.65)) border-box;
  border: 1px solid transparent;
  color: var(--primary);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Tab Navigation */
.tab-navigation {
  display: inline-flex;
  background: var(--bg-secondary);
  padding: 0.375rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  margin-bottom: 1.25rem;
  gap: 0.375rem;
}

.tab-navigation button {
  background: transparent;
  border: 1px solid transparent;
  padding: 0.625rem 1rem;
  font-size: 0.95rem;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-weight: 600;
}

.tab-navigation button:hover {
  color: var(--text-primary);
  background: rgba(102, 126, 234, 0.06);
}

.tab-navigation button.active {
  color: white;
  background: linear-gradient(135deg, var(--primary), #4f46e5);
  border-color: transparent;
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.25);
}

/* Tab Content */
.tab-content {
  min-height: 400px;
}

.demo-container {
  padding: 1rem;
}

/* Code Container */
.code-container {
  padding: 1rem;
}

.code-snippet {
  margin-bottom: 2rem;
}

.code-snippet h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.snippet-description {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
}

.code-snippet code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Code Block Wrapper */
.code-block-wrapper {
  position: relative;
  margin-bottom: 1.5rem;
}

.copy-button {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: #1f2937;
  color: var(--gray-300);
  border: 1px solid #374151;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
  min-height: 32px;
  min-width: 80px;
}

.copy-button:hover {
  background: #374151;
  color: white;
  border-color: #4b5563;
  transform: translateY(-1px);
}

.copy-button.copied {
  background: var(--success);
  color: white;
  border-color: var(--success-dark);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25);
}

.copy-icon {
  font-size: 0.875rem;
  line-height: 1;
}

.copy-text {
  font-weight: 500;
}

/* Ensure code block has enough padding for button */
.code-snippet pre {
  background: linear-gradient(180deg, #111827 0%, #0b1220 100%);
  color: #e5e7eb;
  padding: 3rem 1.5rem 1.5rem 1.5rem; /* Extra padding at top for button */
  border-radius: 10px;
  overflow-x: auto;
  margin: 0;
  border: 1px solid #1f2937;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  position: relative;
}

.code-snippet pre::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #3b82f6, #10b981);
  opacity: 0.8;
}

/* Setup Container */
.setup-container {
  padding: 1rem;
}

.setup-content h3 {
  margin: 2rem 0 1rem 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.setup-content h3:first-child {
  margin-top: 0;
}

.setup-content ul {
  margin: 0 0 1.5rem 0;
  padding-left: 1.5rem;
}

.setup-content li {
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.setup-content pre {
  background: linear-gradient(180deg, #111827 0%, #0b1220 100%);
  color: #e5e7eb;
  padding: 1.5rem;
  border-radius: 10px;
  overflow-x: auto;
  margin: 1rem 0 1.5rem 0;
  border: 1px solid #1f2937;
}

.setup-content code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 1024px) {
  .playground-content {
    grid-template-columns: 1fr;
  }

  .playground-sidebar {
    position: static;
  }
}

@media (max-width: 768px) {
  .playground-header h1 {
    font-size: 1.75rem;
  }

  .playground-content {
    padding: 0 1rem;
    margin: 1rem auto;
  }

  .playground-main {
    padding: 1.5rem;
  }

  .tab-navigation {
    overflow-x: auto;
  }

  .tab-navigation button {
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  /* Mobile filter adjustments - hide labels, show only icons + counts */
  .filter-segment {
    padding: 0.35rem 0.4rem;
    gap: 0.2rem;
  }

  .segment-label {
    display: none !important;
  }

  .segment-icon {
    width: 18px;
    height: 18px;
  }

  .segment-count {
    font-size: 0.55rem;
  }
}

/* Decorative header blobs - do not intercept pointer events */
.playground-header::before,
.playground-header::after {
  content: '';
  position: absolute;
  pointer-events: none;
  filter: blur(40px);
  opacity: 0.6;
  transform: translateZ(0);
}

.playground-header::before {
  width: 420px;
  height: 420px;
  top: -120px;
  left: -120px;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.25), transparent 70%);
  animation: floatY 12s ease-in-out infinite alternate;
}

.playground-header::after {
  width: 360px;
  height: 360px;
  right: -120px;
  bottom: -120px;
  background: radial-gradient(closest-side, rgba(99, 102, 241, 0.45), transparent 70%);
  animation: floatY 14s ease-in-out infinite alternate-reverse;
}

@keyframes headerGradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes floatY {
  0% {
    transform: translateY(0) translateZ(0);
  }
  100% {
    transform: translateY(10px) translateZ(0);
  }
}
</style>
