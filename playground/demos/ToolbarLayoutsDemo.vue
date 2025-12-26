<template>
  <div class="toolbar-layouts-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
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

    <div class="demo-header">
      <h3>Toolbar Layout Patterns</h3>
      <p>Static examples of different call states and framework implementations</p>
    </div>

    <!-- Tab Navigation -->
    <div class="main-tabs">
      <button
        :class="['tab-btn', { active: activeMainTab === 'states' }]"
        @click="activeMainTab = 'states'"
      >
        Call States
      </button>
      <button
        :class="['tab-btn', { active: activeMainTab === 'frameworks' }]"
        @click="activeMainTab = 'frameworks'"
      >
        Framework Examples
      </button>
      <button
        :class="['tab-btn', { active: activeMainTab === 'layouts' }]"
        @click="activeMainTab = 'layouts'"
      >
        Layout Positions
      </button>
      <button
        :class="['tab-btn', { active: activeMainTab === 'advanced' }]"
        @click="activeMainTab = 'advanced'"
      >
        Advanced Examples
      </button>
    </div>

    <!-- Call States Tab -->
    <div v-if="activeMainTab === 'states'" class="tab-content">
      <div class="states-grid">
        <!-- Disconnected (First State) -->
        <div class="state-card">
          <h4>Disconnected</h4>
          <div class="toolbar-preview toolbar-disconnected">
            <div class="toolbar-section">
              <div
                class="combined-status status-red"
                title="Disconnected - Not connected to SIP server"
              >
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span class="status-label">Offline</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="disconnected-text">Not connected to server</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-primary" title="Connect">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span class="btn-text">Connect</span>
              </button>
            </div>
          </div>
          <p class="state-description">Red = No connection to SIP server</p>
        </div>

        <!-- Connected but Not Registered -->
        <div class="state-card">
          <h4>Connected (Not Registered)</h4>
          <div class="toolbar-preview toolbar-connecting">
            <div class="toolbar-section">
              <div
                class="combined-status status-orange"
                title="Connected but not registered - Cannot receive calls"
              >
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span class="status-label">Connecting</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="connecting-text">Registering with server...</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-warning" title="Cancel">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span class="btn-text">Cancel</span>
              </button>
            </div>
          </div>
          <p class="state-description">
            Orange = Connected but not yet registered (cannot receive calls)
          </p>
        </div>

        <!-- Idle / No Call -->
        <div class="state-card">
          <h4>Ready (Idle)</h4>
          <div class="toolbar-preview toolbar-idle">
            <div class="toolbar-section">
              <div
                class="combined-status status-green"
                title="Connected and registered - Ready for calls"
              >
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="idle-text">No active call</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-settings" title="Settings">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  />
                </svg>
                <span class="btn-text">Settings</span>
              </button>
            </div>
          </div>
          <p class="state-description">Green = Connected and registered, ready for calls</p>
        </div>

        <!-- Incoming Call / Ringing -->
        <div class="state-card">
          <h4>Incoming Call (Ringing)</h4>
          <div class="toolbar-preview toolbar-ringing">
            <div class="toolbar-section">
              <div class="combined-status status-green" title="Ready">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge ringing">Ringing</span>
              <span class="caller-name">John Smith</span>
              <span class="caller-number">+1 (555) 123-4567</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-success" title="Answer">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                  />
                </svg>
                <span class="btn-text">Answer</span>
              </button>
              <button class="toolbar-btn btn-danger" title="Decline">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <span class="btn-text">Decline</span>
              </button>
            </div>
          </div>
          <p class="state-description">Incoming call with answer/decline options</p>
        </div>

        <!-- Active Call -->
        <div class="state-card">
          <h4>Active Call (In Progress)</h4>
          <div class="toolbar-preview toolbar-active">
            <div class="toolbar-section">
              <div class="combined-status status-green" title="Ready">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge active">Active</span>
              <span class="caller-name">John Smith</span>
              <span class="call-duration">03:45</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-secondary" title="Mute">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span class="btn-text">Mute</span>
              </button>
              <button class="toolbar-btn btn-secondary" title="Hold">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span class="btn-text">Hold</span>
              </button>
              <button class="toolbar-btn btn-secondary" title="Transfer">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span class="btn-text">Transfer</span>
              </button>
              <button class="toolbar-btn btn-danger" title="Hangup">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <span class="btn-text">Hangup</span>
              </button>
            </div>
          </div>
          <p class="state-description">Call in progress with full control options</p>
        </div>

        <!-- Incoming Call While On Call -->
        <div class="state-card">
          <h4>Incoming Call (While On Call)</h4>
          <div class="toolbar-preview toolbar-incoming-oncall">
            <div class="toolbar-section">
              <div class="combined-status status-green" title="Ready">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge active">Active</span>
              <span class="caller-name">John Smith</span>
              <span class="call-duration">03:45</span>
              <span class="incoming-badge">
                <span class="incoming-pulse"></span>
                Incoming: Jane Doe
              </span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-success btn-sm" title="Answer + Hold">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                  />
                </svg>
                <span class="btn-text">Answer + Hold</span>
              </button>
              <button class="toolbar-btn btn-success btn-sm" title="Answer + Conference">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span class="btn-text">Answer + Conference</span>
              </button>
              <button class="toolbar-btn btn-warning btn-sm" title="Ignore">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                <span class="btn-text">Ignore</span>
              </button>
              <button class="toolbar-btn btn-danger" title="Hangup">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <span class="btn-text">Hangup</span>
              </button>
            </div>
          </div>
          <p class="state-description">
            Call waiting - answer and hold current, merge into conference, or ignore
          </p>
        </div>

        <!-- On Hold -->
        <div class="state-card">
          <h4>Call On Hold</h4>
          <div class="toolbar-preview toolbar-hold">
            <div class="toolbar-section">
              <div class="combined-status status-green" title="Ready">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge hold">On Hold</span>
              <span class="caller-name">John Smith</span>
              <span class="call-duration">05:12</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-secondary" title="Mute">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span class="btn-text">Mute</span>
              </button>
              <button class="toolbar-btn btn-primary" title="Resume">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span class="btn-text">Resume</span>
              </button>
              <button class="toolbar-btn btn-secondary" title="Conference">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span class="btn-text">Conference</span>
              </button>
              <button class="toolbar-btn btn-secondary" title="Transfer">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span class="btn-text">Transfer</span>
              </button>
              <button class="toolbar-btn btn-danger" title="Hangup">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <span class="btn-text">Hangup</span>
              </button>
            </div>
          </div>
          <p class="state-description">
            Call is paused - resume, merge into conference, or transfer
          </p>
        </div>

        <!-- Muted -->
        <div class="state-card">
          <h4>Call Muted</h4>
          <div class="toolbar-preview toolbar-muted">
            <div class="toolbar-section">
              <div class="combined-status status-green" title="Ready">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge active">Active</span>
              <span class="mute-indicator">MUTED</span>
              <span class="caller-name">John Smith</span>
              <span class="call-duration">02:30</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-warning active" title="Unmute">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span class="btn-text">Unmute</span>
              </button>
              <button class="toolbar-btn btn-secondary" title="Hold">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span class="btn-text">Hold</span>
              </button>
              <button class="toolbar-btn btn-secondary" title="Transfer">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span class="btn-text">Transfer</span>
              </button>
              <button class="toolbar-btn btn-danger" title="Hangup">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <span class="btn-text">Hangup</span>
              </button>
            </div>
          </div>
          <p class="state-description">Microphone muted, caller cannot hear you</p>
        </div>

        <!-- Transfer in Progress -->
        <div class="state-card">
          <h4>Transfer in Progress</h4>
          <div class="toolbar-preview toolbar-transfer">
            <div class="toolbar-section">
              <div class="combined-status status-green" title="Ready">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge transfer">Transferring</span>
              <span class="transfer-info">
                <span class="from-caller">John Smith</span>
                <span class="transfer-arrow">-></span>
                <span class="to-caller">Support Queue</span>
              </span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-warning" title="Cancel">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span class="btn-text">Cancel</span>
              </button>
            </div>
          </div>
          <p class="state-description">Blind or attended transfer in progress</p>
        </div>

        <!-- Outgoing Call -->
        <div class="state-card">
          <h4>Outgoing Call (Dialing)</h4>
          <div class="toolbar-preview toolbar-dialing">
            <div class="toolbar-section">
              <div class="combined-status status-green" title="Ready">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge dialing">Calling...</span>
              <span class="caller-name">+1 (555) 987-6543</span>
              <span class="dialing-indicator">
                <span class="dot-pulse"></span>
                <span class="dot-pulse"></span>
                <span class="dot-pulse"></span>
              </span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-danger" title="Cancel">
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <span class="btn-text">Cancel</span>
              </button>
            </div>
          </div>
          <p class="state-description">Waiting for remote party to answer</p>
        </div>
      </div>
    </div>

    <!-- UI Framework Examples Tab -->
    <div v-if="activeMainTab === 'frameworks'" class="tab-content">
      <div class="framework-tabs">
        <button
          v-for="fw in frameworks"
          :key="fw.id"
          :class="['fw-tab', { active: activeFramework === fw.id }]"
          @click="activeFramework = fw.id"
        >
          {{ fw.name }}
        </button>
      </div>

      <div class="framework-content">
        <!-- Tailwind CSS Example -->
        <div v-if="activeFramework === 'tailwind'" class="framework-example">
          <h4>Tailwind CSS</h4>
          <p class="fw-description">Utility-first CSS framework for rapid custom styling</p>

          <div class="toolbar-preview-tailwind">
            <div class="tw-flex tw-items-center tw-gap-4">
              <span class="tw-w-3 tw-h-3 tw-rounded-full tw-bg-emerald-500"></span>
              <span class="tw-text-sm tw-font-medium">Connected</span>
            </div>
            <div class="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-3">
              <span
                class="tw-px-2 tw-py-1 tw-bg-emerald-500/20 tw-text-emerald-400 tw-rounded tw-text-xs tw-font-semibold"
                >Active</span
              >
              <span class="tw-font-medium">John Smith</span>
              <span
                class="tw-font-mono tw-bg-var(--surface-900)/20 tw-px-2 tw-py-1 tw-rounded tw-text-sm"
                >02:45</span
              >
            </div>
            <div class="tw-flex tw-gap-2">
              <button
                class="tw-px-3 tw-py-1.5 tw-bg-var(--surface-0)/20 tw-border tw-border-var(--surface-0)/30 tw-rounded-md tw-text-sm tw-font-medium hover:tw-bg-var(--surface-0)/30"
              >
                Mute
              </button>
              <button
                class="tw-px-3 tw-py-1.5 tw-bg-var(--surface-0)/20 tw-border tw-border-var(--surface-0)/30 tw-rounded-md tw-text-sm tw-font-medium hover:tw-bg-var(--surface-0)/30"
              >
                Hold
              </button>
              <button
                class="tw-px-3 tw-py-1.5 tw-bg-red-500 tw-rounded-md tw-text-sm tw-font-medium hover:tw-bg-red-600"
              >
                Hangup
              </button>
            </div>
          </div>

          <div class="code-block">
            <pre><code>&lt;template&gt;
  &lt;div class="flex items-center gap-6 px-4 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-var(--surface-0)"&gt;
    &lt;!-- Status --&gt;
    &lt;div class="flex items-center gap-2"&gt;
      &lt;span :class="[
        'w-3 h-3 rounded-full',
        isConnected ? 'bg-emerald-500' : 'bg-red-500'
      ]"&gt;&lt;/span&gt;
      &lt;span class="text-sm font-medium"&gt;{{ isConnected ? 'Connected' : 'Disconnected' }}&lt;/span&gt;
    &lt;/div&gt;

    &lt;!-- Call Info --&gt;
    &lt;div v-if="session" class="flex-1 flex items-center justify-center gap-3"&gt;
      &lt;span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-semibold"&gt;
        {{ state }}
      &lt;/span&gt;
      &lt;span class="font-medium"&gt;{{ remoteDisplayName }}&lt;/span&gt;
      &lt;span class="font-mono bg-var(--surface-900)/20 px-2 py-1 rounded text-sm"&gt;{{ formattedDuration }}&lt;/span&gt;
    &lt;/div&gt;

    &lt;!-- Controls --&gt;
    &lt;div class="flex gap-2"&gt;
      &lt;button @click="toggleMute" class="px-3 py-1.5 bg-var(--surface-0)/20 border border-var(--surface-0)/30 rounded-md text-sm font-medium transition hover:bg-var(--surface-0)/30"&gt;
        {{ isMuted ? 'Unmute' : 'Mute' }}
      &lt;/button&gt;
      &lt;button @click="toggleHold" class="px-3 py-1.5 bg-var(--surface-0)/20 border border-var(--surface-0)/30 rounded-md text-sm font-medium transition hover:bg-var(--surface-0)/30"&gt;
        {{ isOnHold ? 'Resume' : 'Hold' }}
      &lt;/button&gt;
      &lt;button @click="hangup" class="px-3 py-1.5 bg-red-500 rounded-md text-sm font-medium transition hover:bg-red-600"&gt;
        Hangup
      &lt;/button&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;</code></pre>
          </div>
        </div>

        <!-- PrimeVue Example -->
        <div v-if="activeFramework === 'primevue'" class="framework-example">
          <h4>PrimeVue</h4>
          <p class="fw-description">Rich UI component library with 90+ components for Vue 3</p>

          <div class="toolbar-preview-primevue">
            <div class="pv-status-section">
              <span class="pv-badge pv-badge-success">Connected</span>
              <span class="pv-badge pv-badge-success">Registered</span>
            </div>
            <div class="pv-call-info">
              <span class="pv-tag pv-tag-info">Active</span>
              <span class="pv-caller">John Smith</span>
              <span class="pv-duration">02:45</span>
            </div>
            <div class="pv-button-group">
              <button class="pv-button pv-button-outlined">Mute</button>
              <button class="pv-button pv-button-outlined">Hold</button>
              <button class="pv-button pv-button-danger">Hangup</button>
            </div>
          </div>

          <div class="code-block">
            <pre><code>&lt;template&gt;
  &lt;Toolbar class="call-toolbar"&gt;
    &lt;template #start&gt;
      &lt;Badge :value="isConnected ? 'Connected' : 'Disconnected'"
             :severity="isConnected ? 'success' : 'danger'" /&gt;
      &lt;Badge :value="isRegistered ? 'Registered' : 'Unregistered'"
             :severity="isRegistered ? 'success' : 'warn'" class="ml-2" /&gt;
    &lt;/template&gt;

    &lt;template #center&gt;
      &lt;div v-if="session" class="flex align-items-center gap-3"&gt;
        &lt;Tag :value="state" :severity="stateToSeverity(state)" /&gt;
        &lt;span class="font-semibold"&gt;{{ remoteDisplayName }}&lt;/span&gt;
        &lt;Chip :label="formattedDuration" icon="pi pi-clock" /&gt;
      &lt;/div&gt;
      &lt;span v-else class="text-500 font-italic"&gt;No active call&lt;/span&gt;
    &lt;/template&gt;

    &lt;template #end&gt;
      &lt;Button :label="isMuted ? 'Unmute' : 'Mute'"
              :icon="isMuted ? 'pi pi-volume-up' : 'pi pi-volume-off'"
              :severity="isMuted ? 'warning' : 'secondary'"
              @click="toggleMute" outlined /&gt;
      &lt;Button :label="isOnHold ? 'Resume' : 'Hold'"
              :icon="isOnHold ? 'pi pi-play' : 'pi pi-pause'"
              :severity="isOnHold ? 'info' : 'secondary'"
              @click="toggleHold" outlined class="ml-2" /&gt;
      &lt;Button label="Hangup" icon="pi pi-phone" severity="danger"
              @click="hangup" class="ml-2" /&gt;
    &lt;/template&gt;
  &lt;/Toolbar&gt;
&lt;/template&gt;

&lt;script setup&gt;
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Chip from 'primevue/chip'
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- Vuetify Example -->
        <div v-if="activeFramework === 'vuetify'" class="framework-example">
          <h4>Vuetify</h4>
          <p class="fw-description">Material Design component framework for Vue 3</p>

          <div class="toolbar-preview-vuetify">
            <div class="v-status">
              <span class="v-chip v-chip-success">Connected</span>
            </div>
            <div class="v-call-info">
              <span class="v-chip v-chip-primary">Active</span>
              <span class="v-caller">John Smith</span>
              <span class="v-duration">02:45</span>
            </div>
            <div class="v-btn-group">
              <button class="v-btn v-btn-text">Mute</button>
              <button class="v-btn v-btn-text">Hold</button>
              <button class="v-btn v-btn-error">Hangup</button>
            </div>
          </div>

          <div class="code-block">
            <pre><code>&lt;template&gt;
  &lt;v-app-bar color="deep-purple" density="comfortable"&gt;
    &lt;template #prepend&gt;
      &lt;v-chip :color="isConnected ? 'success' : 'error'" size="small" class="mr-2"&gt;
        &lt;v-icon start :icon="isConnected ? 'mdi-wifi' : 'mdi-wifi-off'" /&gt;
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      &lt;/v-chip&gt;
    &lt;/template&gt;

    &lt;v-app-bar-title v-if="session" class="text-center"&gt;
      &lt;v-chip color="primary" size="small" class="mr-2"&gt;{{ state }}&lt;/v-chip&gt;
      &lt;span class="font-weight-medium"&gt;{{ remoteDisplayName }}&lt;/span&gt;
      &lt;v-chip variant="outlined" size="small" class="ml-2"&gt;
        &lt;v-icon start icon="mdi-timer" /&gt;
        {{ formattedDuration }}
      &lt;/v-chip&gt;
    &lt;/v-app-bar-title&gt;
    &lt;v-app-bar-title v-else class="text-center text-grey-lighten-1"&gt;
      No active call
    &lt;/v-app-bar-title&gt;

    &lt;template #append&gt;
      &lt;v-btn :icon="isMuted ? 'mdi-microphone-off' : 'mdi-microphone'"
             :color="isMuted ? 'warning' : undefined"
             variant="text" @click="toggleMute" /&gt;
      &lt;v-btn :icon="isOnHold ? 'mdi-play' : 'mdi-pause'"
             :color="isOnHold ? 'info' : undefined"
             variant="text" @click="toggleHold" /&gt;
      &lt;v-btn icon="mdi-phone-hangup" color="error" @click="hangup" /&gt;
    &lt;/template&gt;
  &lt;/v-app-bar&gt;
&lt;/template&gt;</code></pre>
          </div>
        </div>

        <!-- Quasar Example -->
        <div v-if="activeFramework === 'quasar'" class="framework-example">
          <h4>Quasar</h4>
          <p class="fw-description">High performance Vue framework with Material and iOS design</p>

          <div class="toolbar-preview-quasar">
            <div class="q-status">
              <span class="q-badge q-badge-positive">Connected</span>
            </div>
            <div class="q-call-info">
              <span class="q-badge q-badge-primary">Active</span>
              <span class="q-caller">John Smith</span>
              <span class="q-duration">02:45</span>
            </div>
            <div class="q-btn-group">
              <button class="q-btn q-btn-flat">Mute</button>
              <button class="q-btn q-btn-flat">Hold</button>
              <button class="q-btn q-btn-negative">Hangup</button>
            </div>
          </div>

          <div class="code-block">
            <pre><code>&lt;template&gt;
  &lt;q-toolbar class="bg-deep-purple text-var(--surface-0)"&gt;
    &lt;q-badge :color="isConnected ? 'positive' : 'negative'" class="q-mr-sm"&gt;
      {{ isConnected ? 'Connected' : 'Disconnected' }}
    &lt;/q-badge&gt;
    &lt;q-badge :color="isRegistered ? 'positive' : 'warning'"&gt;
      {{ isRegistered ? 'Registered' : 'Unregistered' }}
    &lt;/q-badge&gt;

    &lt;q-space /&gt;

    &lt;div v-if="session" class="row items-center q-gutter-sm"&gt;
      &lt;q-badge color="primary" :label="state" /&gt;
      &lt;span class="text-weight-medium"&gt;{{ remoteDisplayName }}&lt;/span&gt;
      &lt;q-chip dense color="dark" text-color="var(--surface-0)" icon="schedule"&gt;
        {{ formattedDuration }}
      &lt;/q-chip&gt;
    &lt;/div&gt;
    &lt;span v-else class="text-grey-5"&gt;No active call&lt;/span&gt;

    &lt;q-space /&gt;

    &lt;q-btn-group flat&gt;
      &lt;q-btn flat :icon="isMuted ? 'mic_off' : 'mic'"
             :color="isMuted ? 'warning' : undefined"
             @click="toggleMute"&gt;
        &lt;q-tooltip&gt;{{ isMuted ? 'Unmute' : 'Mute' }}&lt;/q-tooltip&gt;
      &lt;/q-btn&gt;
      &lt;q-btn flat :icon="isOnHold ? 'play_arrow' : 'pause'"
             :color="isOnHold ? 'info' : undefined"
             @click="toggleHold"&gt;
        &lt;q-tooltip&gt;{{ isOnHold ? 'Resume' : 'Hold' }}&lt;/q-tooltip&gt;
      &lt;/q-btn&gt;
      &lt;q-btn flat icon="call_end" color="negative" @click="hangup"&gt;
        &lt;q-tooltip&gt;Hangup&lt;/q-tooltip&gt;
      &lt;/q-btn&gt;
    &lt;/q-btn-group&gt;
  &lt;/q-toolbar&gt;
&lt;/template&gt;</code></pre>
          </div>
        </div>

        <!-- Element Plus Example -->
        <div v-if="activeFramework === 'element'" class="framework-example">
          <h4>Element Plus</h4>
          <p class="fw-description">Desktop UI library with elegant design for Vue 3</p>

          <div class="toolbar-preview-element">
            <div class="el-status">
              <span class="el-tag el-tag-success">Connected</span>
            </div>
            <div class="el-call-info">
              <span class="el-tag el-tag-primary">Active</span>
              <span class="el-caller">John Smith</span>
              <span class="el-duration">02:45</span>
            </div>
            <div class="el-btn-group">
              <button class="el-button el-button-default">Mute</button>
              <button class="el-button el-button-default">Hold</button>
              <button class="el-button el-button-danger">Hangup</button>
            </div>
          </div>

          <div class="code-block">
            <pre><code>&lt;template&gt;
  &lt;div class="call-toolbar"&gt;
    &lt;el-space&gt;
      &lt;el-tag :type="isConnected ? 'success' : 'danger'" effect="dark"&gt;
        &lt;el-icon&gt;&lt;Connection /&gt;&lt;/el-icon&gt;
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      &lt;/el-tag&gt;
      &lt;el-tag :type="isRegistered ? 'success' : 'warning'" effect="dark"&gt;
        {{ isRegistered ? 'Registered' : 'Unregistered' }}
      &lt;/el-tag&gt;
    &lt;/el-space&gt;

    &lt;div v-if="session" class="call-info"&gt;
      &lt;el-tag type="primary"&gt;{{ state }}&lt;/el-tag&gt;
      &lt;span class="caller-name"&gt;{{ remoteDisplayName }}&lt;/span&gt;
      &lt;el-tag type="info" effect="plain"&gt;
        &lt;el-icon&gt;&lt;Timer /&gt;&lt;/el-icon&gt;
        {{ formattedDuration }}
      &lt;/el-tag&gt;
    &lt;/div&gt;
    &lt;el-text v-else type="info"&gt;No active call&lt;/el-text&gt;

    &lt;el-button-group&gt;
      &lt;el-button :type="isMuted ? 'warning' : 'default'" @click="toggleMute"&gt;
        &lt;el-icon&gt;&lt;Microphone v-if="!isMuted" /&gt;&lt;Mute v-else /&gt;&lt;/el-icon&gt;
        {{ isMuted ? 'Unmute' : 'Mute' }}
      &lt;/el-button&gt;
      &lt;el-button :type="isOnHold ? 'primary' : 'default'" @click="toggleHold"&gt;
        &lt;el-icon&gt;&lt;VideoPlay v-if="isOnHold" /&gt;&lt;VideoPause v-else /&gt;&lt;/el-icon&gt;
        {{ isOnHold ? 'Resume' : 'Hold' }}
      &lt;/el-button&gt;
      &lt;el-button type="danger" @click="hangup"&gt;
        &lt;el-icon&gt;&lt;Phone /&gt;&lt;/el-icon&gt;
        Hangup
      &lt;/el-button&gt;
    &lt;/el-button-group&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { Connection, Timer, Microphone, Mute, VideoPlay, VideoPause, Phone } from '@element-plus/icons-vue'
&lt;/script&gt;</code></pre>
          </div>
        </div>

        <!-- Naive UI Example -->
        <div v-if="activeFramework === 'naive'" class="framework-example">
          <h4>Naive UI</h4>
          <p class="fw-description">
            Modern, lightweight, and customizable Vue 3 component library
          </p>

          <div class="toolbar-preview-naive">
            <div class="n-status">
              <span class="n-tag n-tag-success">Connected</span>
            </div>
            <div class="n-call-info">
              <span class="n-tag n-tag-info">Active</span>
              <span class="n-caller">John Smith</span>
              <span class="n-duration">02:45</span>
            </div>
            <div class="n-btn-group">
              <button class="n-button n-button-default">Mute</button>
              <button class="n-button n-button-default">Hold</button>
              <button class="n-button n-button-error">Hangup</button>
            </div>
          </div>

          <div class="code-block">
            <pre><code>&lt;template&gt;
  &lt;n-layout-header class="call-toolbar"&gt;
    &lt;n-space align="center"&gt;
      &lt;n-tag :type="isConnected ? 'success' : 'error'" size="small"&gt;
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      &lt;/n-tag&gt;
      &lt;n-tag :type="isRegistered ? 'success' : 'warning'" size="small"&gt;
        {{ isRegistered ? 'Registered' : 'Unregistered' }}
      &lt;/n-tag&gt;
    &lt;/n-space&gt;

    &lt;n-space v-if="session" align="center" justify="center" class="call-info"&gt;
      &lt;n-tag type="info"&gt;{{ state }}&lt;/n-tag&gt;
      &lt;n-text strong&gt;{{ remoteDisplayName }}&lt;/n-text&gt;
      &lt;n-tag :bordered="false"&gt;
        &lt;template #icon&gt;&lt;n-icon :component="TimeOutline" /&gt;&lt;/template&gt;
        {{ formattedDuration }}
      &lt;/n-tag&gt;
    &lt;/n-space&gt;
    &lt;n-text v-else depth="3"&gt;No active call&lt;/n-text&gt;

    &lt;n-space&gt;
      &lt;n-button :type="isMuted ? 'warning' : 'default'"
                secondary @click="toggleMute"&gt;
        &lt;template #icon&gt;
          &lt;n-icon :component="isMuted ? MicOffOutline : MicOutline" /&gt;
        &lt;/template&gt;
        {{ isMuted ? 'Unmute' : 'Mute' }}
      &lt;/n-button&gt;
      &lt;n-button :type="isOnHold ? 'info' : 'default'"
                secondary @click="toggleHold"&gt;
        &lt;template #icon&gt;
          &lt;n-icon :component="isOnHold ? PlayOutline : PauseOutline" /&gt;
        &lt;/template&gt;
        {{ isOnHold ? 'Resume' : 'Hold' }}
      &lt;/n-button&gt;
      &lt;n-button type="error" @click="hangup"&gt;
        &lt;template #icon&gt;&lt;n-icon :component="CallOutline" /&gt;&lt;/template&gt;
        Hangup
      &lt;/n-button&gt;
    &lt;/n-space&gt;
  &lt;/n-layout-header&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { TimeOutline, MicOutline, MicOffOutline, PlayOutline, PauseOutline, CallOutline } from '@vicons/ionicons5'
&lt;/script&gt;</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Layout Positions Tab -->
    <div v-if="activeMainTab === 'layouts'" class="tab-content">
      <div class="layout-selector">
        <button
          v-for="layout in layouts"
          :key="layout.id"
          :class="['layout-btn', { active: currentLayout === layout.id }]"
          @click="currentLayout = layout.id"
        >
          {{ layout.name }}
        </button>
      </div>

      <div class="layout-container">
        <div class="layout-description">
          <h4>{{ activeLayout.name }}</h4>
          <p>{{ activeLayout.description }}</p>
          <div class="use-cases">
            <strong>Best For:</strong>
            <ul>
              <li v-for="useCase in activeLayout.useCases" :key="useCase">{{ useCase }}</li>
            </ul>
          </div>
        </div>

        <!-- Top Horizontal -->
        <div v-if="currentLayout === 'top'" class="demo-layout demo-layout-top">
          <div class="demo-toolbar toolbar-top">
            <div class="toolbar-section">
              <span class="status-dot connected"></span>
              <span class="status-text">Connected</span>
              <span class="status-dot connected"></span>
              <span class="status-text">Registered</span>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge active">Active</span>
              <span class="caller-name">John Smith</span>
              <span class="call-duration">02:45</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-secondary">Mute</button>
              <button class="toolbar-btn btn-secondary">Hold</button>
              <button class="toolbar-btn btn-danger">Hangup</button>
            </div>
          </div>
          <div class="demo-content">
            <p class="demo-placeholder">Main content area below toolbar</p>
          </div>
        </div>

        <!-- Left Sidebar -->
        <div v-if="currentLayout === 'left'" class="demo-layout demo-layout-left">
          <div class="demo-toolbar toolbar-left">
            <div class="toolbar-section-vertical">
              <div class="section-title">Status</div>
              <div class="status-group-vertical">
                <span class="status-dot connected"></span>
                <span class="status-label-small">Connected</span>
              </div>
              <div class="status-group-vertical">
                <span class="status-dot connected"></span>
                <span class="status-label-small">Registered</span>
              </div>
            </div>
            <div class="toolbar-section-vertical">
              <div class="section-title">Active Call</div>
              <div class="info-item">
                <span class="info-label">State:</span>
                <span class="state-badge-small active">Active</span>
              </div>
              <div class="info-item">
                <span class="info-label">Caller:</span>
                <span class="info-value">John Smith</span>
              </div>
              <div class="info-item">
                <span class="info-label">Duration:</span>
                <span class="info-value">02:45</span>
              </div>
            </div>
            <div class="toolbar-section-vertical">
              <div class="section-title">Controls</div>
              <button class="toolbar-btn-vertical btn-secondary">Mute</button>
              <button class="toolbar-btn-vertical btn-secondary">Hold</button>
              <button class="toolbar-btn-vertical btn-danger">Hangup</button>
            </div>
          </div>
          <div class="demo-content">
            <p class="demo-placeholder">Main content area to the right</p>
          </div>
        </div>

        <!-- Right Sidebar -->
        <div v-if="currentLayout === 'right'" class="demo-layout demo-layout-right">
          <div class="demo-content">
            <p class="demo-placeholder">Main content area to the left</p>
          </div>
          <div class="demo-toolbar toolbar-right">
            <div class="toolbar-section-vertical">
              <div class="section-title">Status</div>
              <div class="status-group-vertical">
                <span class="status-dot connected"></span>
                <span class="status-label-small">Connected</span>
              </div>
            </div>
            <div class="toolbar-section-vertical">
              <div class="section-title">Call Details</div>
              <div class="info-item">
                <span class="info-label">State:</span>
                <span class="state-badge-small active">Active</span>
              </div>
              <div class="info-item">
                <span class="info-label">Caller:</span>
                <span class="info-value">John Smith</span>
              </div>
              <div class="info-item">
                <span class="info-label">Duration:</span>
                <span class="info-value">02:45</span>
              </div>
            </div>
            <div class="toolbar-section-vertical">
              <div class="section-title">Actions</div>
              <div class="icon-buttons">
                <button class="toolbar-btn-icon">M</button>
                <button class="toolbar-btn-icon">H</button>
                <button class="toolbar-btn-icon btn-danger">X</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Toolbar -->
        <div v-if="currentLayout === 'bottom'" class="demo-layout demo-layout-bottom">
          <div class="demo-content">
            <p class="demo-placeholder">Main content area above toolbar</p>
          </div>
          <div class="demo-toolbar toolbar-bottom">
            <div class="toolbar-section">
              <span class="status-dot connected"></span>
              <span class="status-dot connected"></span>
            </div>
            <div class="toolbar-section toolbar-center">
              <span class="state-badge active">Active</span>
              <span class="caller-name">John Smith</span>
              <span class="call-duration">02:45</span>
            </div>
            <div class="toolbar-section">
              <button class="toolbar-btn btn-secondary">M</button>
              <button class="toolbar-btn btn-secondary">H</button>
              <button class="toolbar-btn btn-danger">X</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced Examples Tab -->
    <div v-if="activeMainTab === 'advanced'" class="tab-content">
      <div class="advanced-section">
        <h3>Nurse Workflow Example</h3>
        <p class="section-description">
          An advanced example showing user presence/availability states for a healthcare worker. The
          user can switch between different workflow states, and the system automatically switches
          to "In Call" when a call becomes active.
        </p>

        <!-- Interactive Nurse Workflow Demo -->
        <div class="nurse-workflow-demo">
          <div class="toolbar-preview toolbar-nurse">
            <div class="toolbar-section">
              <!-- Combined SIP Status -->
              <div
                class="combined-status status-green"
                title="Connected and registered - Ready for calls"
              >
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span class="status-label">Ready</span>
              </div>

              <!-- User Presence Dropdown -->
              <div class="presence-dropdown" :class="{ open: nursePresenceOpen }">
                <button
                  class="presence-button"
                  @click="nursePresenceOpen = !nursePresenceOpen"
                  :title="`Current status: ${currentNursePresence.label}`"
                >
                  <span
                    class="presence-dot"
                    :style="{ background: currentNursePresence.color }"
                  ></span>
                  <span class="presence-label">{{ currentNursePresence.label }}</span>
                  <span
                    v-if="formattedReturnTime && currentNursePresence.allowsReturnTime"
                    class="return-time-badge"
                  >
                    {{ formattedReturnTime }}
                  </span>
                  <svg
                    class="dropdown-arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div v-if="nursePresenceOpen" class="presence-menu">
                  <button
                    v-for="presence in nursePresenceOptions"
                    :key="presence.id"
                    class="presence-option"
                    :class="{ active: presence.id === currentNursePresenceId }"
                    @click="selectNursePresence(presence.id)"
                  >
                    <span class="presence-dot" :style="{ background: presence.color }"></span>
                    <span class="presence-option-label">{{ presence.label }}</span>
                    <span class="presence-option-desc">{{ presence.description }}</span>
                    <span v-if="presence.allowsReturnTime" class="return-time-hint">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        width="12"
                        height="12"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Can set return time
                    </span>
                  </button>
                </div>
              </div>

              <!-- Return Time Picker (shows when presence allows it) -->
              <div
                v-if="currentNursePresence.allowsReturnTime"
                class="return-time-picker"
                :class="{ open: returnTimePickerOpen }"
              >
                <button
                  class="return-time-button"
                  @click="returnTimePickerOpen = !returnTimePickerOpen"
                  :title="
                    formattedReturnTime
                      ? `Returns: ${formattedReturnTime}`
                      : 'Set expected return time'
                  "
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="clock-icon"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span v-if="formattedReturnTime">{{ formattedReturnTime }}</span>
                  <span v-else class="set-time-text">Set return</span>
                </button>
                <div v-if="returnTimePickerOpen" class="return-time-menu">
                  <div class="return-time-section">
                    <div class="return-time-header">Quick Duration</div>
                    <div class="duration-grid">
                      <button
                        v-for="preset in durationPresets"
                        :key="preset.value"
                        class="duration-btn"
                        :class="{
                          active:
                            returnTime.type === 'duration' &&
                            returnTime.durationMinutes === preset.value,
                        }"
                        @click="setReturnDuration(preset.value)"
                      >
                        {{ preset.label }}
                      </button>
                    </div>
                  </div>
                  <div class="return-time-section">
                    <div class="return-time-header">Specific Time</div>
                    <input
                      type="time"
                      class="time-input"
                      :value="returnTime.specificTime || ''"
                      @change="setReturnSpecificTime(($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <button
                    v-if="returnTime.type !== 'none'"
                    class="clear-return-btn"
                    @click="clearReturnTime"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      width="14"
                      height="14"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Clear return time
                  </button>
                </div>
              </div>
            </div>

            <div class="toolbar-section toolbar-center">
              <span v-if="currentNursePresenceId === 'in-call'" class="call-badge">
                <span class="call-state-tag">Active</span>
                <span class="caller-info">Dr. Smith</span>
                <span class="call-timer">02:34</span>
              </span>
              <span v-else class="presence-message">{{ fullStatusMessage }}</span>
            </div>

            <div class="toolbar-section">
              <button
                v-if="currentNursePresenceId === 'in-call'"
                class="toolbar-btn btn-secondary"
                title="Mute"
              >
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span class="btn-text">Mute</span>
              </button>
              <button
                v-if="currentNursePresenceId === 'in-call'"
                class="toolbar-btn btn-secondary"
                title="Hold"
              >
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span class="btn-text">Hold</span>
              </button>
              <button
                v-if="currentNursePresenceId === 'in-call'"
                class="toolbar-btn btn-danger"
                title="End Call"
              >
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                    transform="rotate(135 12 12)"
                  />
                </svg>
                <span class="btn-text">End</span>
              </button>
              <button
                v-if="currentNursePresenceId !== 'in-call'"
                class="toolbar-btn btn-settings"
                title="Settings"
              >
                <svg
                  class="btn-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  />
                </svg>
                <span class="btn-text">Settings</span>
              </button>
            </div>
          </div>

          <!-- Presence States Legend -->
          <div class="presence-legend">
            <h4>Available Presence States</h4>
            <div class="presence-grid">
              <div
                v-for="presence in nursePresenceOptions"
                :key="presence.id"
                class="presence-card"
                :class="{ active: presence.id === currentNursePresenceId }"
                @click="selectNursePresence(presence.id)"
              >
                <div class="presence-card-header">
                  <span class="presence-dot" :style="{ background: presence.color }"></span>
                  <span class="presence-card-label">{{ presence.label }}</span>
                </div>
                <p class="presence-card-desc">{{ presence.description }}</p>
                <div class="presence-card-meta">
                  <span :class="['call-capability', { enabled: presence.canReceiveCalls }]">
                    {{ presence.canReceiveCalls ? 'Can receive calls' : 'Cannot receive calls' }}
                  </span>
                  <span v-if="presence.allowsReturnTime" class="return-time-capability">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      width="12"
                      height="12"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Supports return time
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Code Example -->
          <div class="code-example">
            <h4>Implementation Code</h4>
            <pre><code>// Presence/Availability Options with Return Time Support
interface PresenceOption {
  id: string
  label: string
  description: string
  color: string
  canReceiveCalls: boolean
  allowsReturnTime: boolean  // Can user set expected return?
}

// Return time state
type ReturnTimeType = 'none' | 'duration' | 'specific'
interface ReturnTimeState {
  type: ReturnTimeType
  durationMinutes: number | null  // e.g., 10, 15, 30
  specificTime: string | null     // e.g., "14:30"
}

const presenceOptions: PresenceOption[] = [
  { id: 'ready', label: 'Ready', ..., allowsReturnTime: false },
  { id: 'in-call', label: 'In Call', ..., allowsReturnTime: false },
  { id: 'in-meeting', label: 'In Meeting', ..., allowsReturnTime: true },
  { id: 'on-break', label: 'On Break', ..., allowsReturnTime: true },
  { id: 'lunch', label: 'Lunch', ..., allowsReturnTime: true },
]

// Quick duration presets
const durationPresets = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
]

// Set return time by duration
const setReturnDuration = (minutes: number) => {
  returnTime.value = { type: 'duration', durationMinutes: minutes, specificTime: null }
}

// Set return time by specific time (e.g., "14:30")
const setReturnSpecificTime = (time: string) => {
  returnTime.value = { type: 'specific', durationMinutes: null, specificTime: time }
}

// Format for display: "10 min" or "2:30 PM"
const formattedReturnTime = computed(() => {
  if (returnTime.value.type === 'duration') {
    return `${returnTime.value.durationMinutes} min`
  }
  if (returnTime.value.type === 'specific') {
    // Format as "2:30 PM"
    return formatTime(returnTime.value.specificTime)
  }
  return null
})</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system - for demonstrating toolbar states in the patterns
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Main tab state
const activeMainTab = ref<'states' | 'frameworks' | 'layouts' | 'advanced'>('states')

// UI Framework selection
const activeFramework = ref('tailwind')
const frameworks = [
  { id: 'tailwind', name: 'Tailwind CSS' },
  { id: 'primevue', name: 'PrimeVue' },
  { id: 'vuetify', name: 'Vuetify' },
  { id: 'quasar', name: 'Quasar' },
  { id: 'element', name: 'Element Plus' },
  { id: 'naive', name: 'Naive UI' },
]

// Layout selection
interface LayoutOption {
  id: string
  name: string
  description: string
  useCases: string[]
}

const layouts: LayoutOption[] = [
  {
    id: 'top',
    name: 'Top Horizontal',
    description: 'Full-width toolbar at the top. Standard for desktop applications.',
    useCases: ['Desktop apps', 'Dashboard layouts', 'Global navigation'],
  },
  {
    id: 'left',
    name: 'Left Sidebar',
    description: 'Vertical sidebar on the left. Good for navigation-heavy apps.',
    useCases: ['CRM applications', 'Admin panels', 'Expandable menus'],
  },
  {
    id: 'right',
    name: 'Right Sidebar',
    description: 'Vertical sidebar on the right. Ideal for details and settings.',
    useCases: ['Call details panel', 'Settings sidebar', 'Contextual info'],
  },
  {
    id: 'bottom',
    name: 'Bottom Toolbar',
    description: 'Fixed toolbar at the bottom. Mobile-friendly design.',
    useCases: ['Mobile apps', 'Media players', 'Thumb-zone optimization'],
  },
]

const currentLayout = ref('top')
const activeLayout = computed(() => layouts.find((l) => l.id === currentLayout.value) || layouts[0])

// Nurse Workflow Presence Demo
interface NursePresenceOption {
  id: string
  label: string
  description: string
  color: string
  canReceiveCalls: boolean
  statusMessage: string
  allowsReturnTime: boolean // Whether this status can have an expected return time
}

// Return time types
type ReturnTimeType = 'none' | 'duration' | 'specific'

interface ReturnTimeState {
  type: ReturnTimeType
  durationMinutes: number | null // e.g., 10, 15, 30, 60
  specificTime: string | null // e.g., "14:30"
}

const nursePresenceOptions: NursePresenceOption[] = [
  {
    id: 'ready',
    label: 'Ready',
    description: 'Available for calls',
    color: 'var(--success)',
    canReceiveCalls: true,
    statusMessage: 'Available and ready for incoming calls',
    allowsReturnTime: false,
  },
  {
    id: 'in-call',
    label: 'In Call',
    description: 'Currently on a call',
    color: 'var(--info)',
    canReceiveCalls: false,
    statusMessage: 'Currently on an active call',
    allowsReturnTime: false,
  },
  {
    id: 'documenting',
    label: 'Documenting',
    description: 'Writing patient notes',
    color: 'var(--primary)',
    canReceiveCalls: true,
    statusMessage: 'Documenting - can still receive urgent calls',
    allowsReturnTime: true,
  },
  {
    id: 'in-meeting',
    label: 'In Meeting',
    description: 'Attending a meeting',
    color: 'var(--warning)',
    canReceiveCalls: false,
    statusMessage: 'In a meeting - calls will go to voicemail',
    allowsReturnTime: true,
  },
  {
    id: 'on-break',
    label: 'On Break',
    description: 'Taking a short break',
    color: 'var(--text-secondary)',
    canReceiveCalls: false,
    statusMessage: 'On break - back shortly',
    allowsReturnTime: true,
  },
  {
    id: 'lunch',
    label: 'Lunch',
    description: 'On lunch break',
    color: 'var(--warning)',
    canReceiveCalls: false,
    statusMessage: 'On lunch break',
    allowsReturnTime: true,
  },
  {
    id: 'paused',
    label: 'Paused',
    description: 'Temporarily unavailable',
    color: 'var(--danger)',
    canReceiveCalls: false,
    statusMessage: 'Temporarily unavailable',
    allowsReturnTime: true,
  },
]

// Quick duration presets (in minutes)
const durationPresets = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
]

const nursePresenceOpen = ref(false)
const currentNursePresenceId = ref('ready')
const returnTimePickerOpen = ref(false)
const returnTime = ref<ReturnTimeState>({
  type: 'none',
  durationMinutes: null,
  specificTime: null,
})

const currentNursePresence = computed(
  () =>
    nursePresenceOptions.find((p) => p.id === currentNursePresenceId.value) ||
    nursePresenceOptions[0]
)

// Format the return time for display
const formattedReturnTime = computed(() => {
  if (returnTime.value.type === 'none') return null

  if (returnTime.value.type === 'duration' && returnTime.value.durationMinutes) {
    const mins = returnTime.value.durationMinutes
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return remainingMins > 0
        ? `${hours}h ${remainingMins}m`
        : `${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${mins} min`
  }

  if (returnTime.value.type === 'specific' && returnTime.value.specificTime) {
    // Format time for display (e.g., "2:30 PM")
    const [hours, minutes] = returnTime.value.specificTime.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  return null
})

// Build full status message with return time
const fullStatusMessage = computed(() => {
  let message = currentNursePresence.value.statusMessage
  if (formattedReturnTime.value && currentNursePresence.value.allowsReturnTime) {
    message += ` - Back in ${formattedReturnTime.value}`
    if (returnTime.value.type === 'specific') {
      message =
        currentNursePresence.value.statusMessage + ` - Returns at ${formattedReturnTime.value}`
    }
  }
  return message
})

const selectNursePresence = (id: string) => {
  currentNursePresenceId.value = id
  nursePresenceOpen.value = false
  // Reset return time when changing presence (unless it allows return time)
  const presence = nursePresenceOptions.find((p) => p.id === id)
  if (!presence?.allowsReturnTime) {
    returnTime.value = { type: 'none', durationMinutes: null, specificTime: null }
  }
}

const setReturnDuration = (minutes: number) => {
  returnTime.value = {
    type: 'duration',
    durationMinutes: minutes,
    specificTime: null,
  }
  returnTimePickerOpen.value = false
}

const setReturnSpecificTime = (time: string) => {
  returnTime.value = {
    type: 'specific',
    durationMinutes: null,
    specificTime: time,
  }
  returnTimePickerOpen.value = false
}

const clearReturnTime = () => {
  returnTime.value = { type: 'none', durationMinutes: null, specificTime: null }
  returnTimePickerOpen.value = false
}
</script>

<style scoped>
/* Combined Status Indicator */
.combined-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.status-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.status-label {
  var(--surface-0)-space: nowrap;
}

.status-red {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-orange {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-green {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

/* Pulse animation for connecting state */
.status-orange .status-icon {
  animation: pulse-orange 2s ease-in-out infinite;
}

@keyframes pulse-orange {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.toolbar-layouts-demo {
  padding: 1.5rem;
}

.demo-header {
  margin-bottom: 2rem;
  text-align: center;
}

.demo-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  color: var(--text-primary);
}

.demo-header p {
  margin: 0;
  color: var(--text-secondary);
}

/* Main Tabs */
.main-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: var(--primary);
}

.tab-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--surface-0);
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* States Grid */
.states-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.state-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.state-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  color: var(--text-primary);
}

.state-description {
  margin: 1rem 0 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Toolbar Preview */
.toolbar-preview {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1.25rem;
  border-radius: 8px;
  background: var(--primary);
  color: var(--surface-0);
  font-size: 0.875rem;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

/* Status Dots */
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--danger);
  flex-shrink: 0;
}

.status-dot.connected {
  background: var(--success);
}

.status-dot.disconnected {
  background: var(--danger);
}

.status-text {
  font-size: 0.8125rem;
  font-weight: 500;
}

/* State Badges */
.state-badge {
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.state-badge.active {
  background: rgba(16, 185, 129, 0.2);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.state-badge.ringing {
  background: rgba(251, 191, 36, 0.2);
  color: var(--warning);
  border: 1px solid rgba(251, 191, 36, 0.3);
  animation: pulse-ring 1.5s infinite;
}

.state-badge.hold {
  background: rgba(139, 92, 246, 0.2);
  color: var(--primary);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.state-badge.transfer {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.state-badge.dialing {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

@keyframes pulse-ring {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Incoming While On Call */
.toolbar-incoming-oncall {
  background: linear-gradient(120deg, var(--primary) 0%, #764ba2 50%, #4f46e5 100%);
  border: 2px solid #fbbf24;
}

.incoming-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.5);
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  animation: pulse-incoming 1s infinite;
}

.incoming-pulse {
  width: 8px;
  height: 8px;
  background: #fbbf24;
  border-radius: 50%;
  animation: pulse-dot 1s infinite;
}

@keyframes pulse-incoming {
  0%,
  100% {
    background: rgba(251, 191, 36, 0.3);
  }
  50% {
    background: rgba(251, 191, 36, 0.5);
  }
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.toolbar-btn.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

/* Button Icons */
.btn-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.btn-text {
  var(--surface-0)-space: nowrap;
}

/* Hide text on mobile, show only icons */
@media (max-width: 640px) {
  .toolbar-btn .btn-text {
    display: none;
  }

  .toolbar-btn {
    padding: 0.5rem;
  }

  .toolbar-btn.btn-sm {
    padding: 0.375rem;
  }

  .btn-icon {
    width: 16px;
    height: 16px;
  }
}

.caller-name {
  font-weight: 500;
}

.caller-number {
  font-size: 0.75rem;
  opacity: 0.85;
}

.call-duration {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.idle-text,
.disconnected-text {
  opacity: 0.8;
  font-style: italic;
}

.mute-indicator {
  background: var(--danger);
  color: var(--surface-0);
  padding: 0.125rem 0.5rem;
  border-radius: 3px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* Transfer Info */
.transfer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.transfer-arrow {
  opacity: 0.7;
}

/* Dialing Indicator */
.dialing-indicator {
  display: flex;
  gap: 0.25rem;
}

.dot-pulse {
  width: 6px;
  height: 6px;
  background: var(--surface-0);
  border-radius: 50%;
  animation: dot-pulse 1.4s infinite ease-in-out both;
}

.dot-pulse:nth-child(1) {
  animation-delay: -0.32s;
}
.dot-pulse:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes dot-pulse {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Toolbar Buttons */
.toolbar-btn {
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 5px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: var(--surface-0);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-secondary.active {
  background: rgba(255, 255, 255, 0.4);
}

.btn-primary {
  background: var(--info);
  color: var(--surface-0);
}

.btn-success {
  background: var(--success);
  color: var(--surface-0);
}

.btn-danger {
  background: var(--danger);
  color: var(--surface-0);
}

.btn-warning {
  background: var(--warning);
  color: var(--surface-0);
}

.btn-settings {
  background: rgba(255, 255, 255, 0.15);
  color: var(--surface-0);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

/* Framework Tabs */
.framework-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.fw-tab {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.fw-tab:hover {
  border-color: var(--primary);
  color: var(--text-primary);
}

.fw-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--surface-0);
}

/* Framework Example */
.framework-example {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.framework-example h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.fw-description {
  margin: 0 0 1.5rem 0;
  color: var(--text-secondary);
}

.framework-example .toolbar-preview {
  margin-bottom: 1.5rem;
}

.code-block {
  background: var(--surface-section);
  border-radius: 8px;
  overflow: hidden;
}

.code-block pre {
  margin: 0;
  padding: 1.25rem;
  overflow-x: auto;
}

.code-block code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* Layout Selector */
.layout-selector {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.layout-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.layout-btn:hover {
  border-color: var(--primary);
}

.layout-btn.active {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--surface-0);
}

/* Layout Container */
.layout-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
}

.layout-description {
  margin-bottom: 2rem;
}

.layout-description h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.layout-description p {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
}

.use-cases {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 6px;
  border-left: 3px solid var(--primary);
}

.use-cases strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.use-cases ul {
  margin: 0;
  padding-left: 1.25rem;
}

.use-cases li {
  color: var(--text-secondary);
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
}

/* Demo Layout */
.demo-layout {
  background: #f8f9fa;
  border: 2px dashed #cbd5e0;
  border-radius: 8px;
  min-height: 300px;
  overflow: hidden;
}

:global(.dark-mode) .demo-layout {
  background: #1a202c;
  border-color: #4a5568;
}

.demo-content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 2rem;
}

.demo-placeholder {
  color: #a0aec0;
  font-style: italic;
  margin: 0;
}

/* Demo Toolbar */
.demo-toolbar {
  background: linear-gradient(120deg, var(--primary) 0%, #764ba2 50%, #4f46e5 100%);
  color: var(--surface-0);
}

/* Top Layout */
.demo-layout-top {
  display: flex;
  flex-direction: column;
}

.toolbar-top {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0.875rem 1.25rem;
}

/* Left/Right Sidebar */
.demo-layout-left,
.demo-layout-right {
  display: flex;
}

.toolbar-left,
.toolbar-right {
  width: 200px;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.toolbar-section-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.9;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.status-group-vertical {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label-small {
  font-size: 0.8125rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.info-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  opacity: 0.8;
}

.info-value {
  font-size: 0.8125rem;
  font-weight: 500;
}

.state-badge-small {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.state-badge-small.active {
  background: rgba(16, 185, 129, 0.2);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.toolbar-btn-vertical {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 5px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  background: rgba(255, 255, 255, 0.2);
  color: var(--surface-0);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.toolbar-btn-vertical.btn-danger {
  background: var(--danger);
  border-color: var(--danger);
}

.icon-buttons {
  display: flex;
  gap: 0.5rem;
}

.toolbar-btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  color: var(--surface-0);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.toolbar-btn-icon.btn-danger {
  background: var(--danger);
  border-color: var(--danger);
}

/* Bottom Layout */
.demo-layout-bottom {
  display: flex;
  flex-direction: column;
}

.toolbar-bottom {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1.25rem;
}

/* UI Framework Preview Toolbars */
.toolbar-preview-tailwind,
.toolbar-preview-primevue,
.toolbar-preview-vuetify,
.toolbar-preview-quasar,
.toolbar-preview-element,
.toolbar-preview-naive {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1.25rem;
  border-radius: 8px;
  color: var(--surface-0);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

/* Tailwind Preview */
.toolbar-preview-tailwind {
  background: linear-gradient(120deg, #6366f1 0%, #8b5cf6 50%, #4f46e5 100%);
}

.tw-flex {
  display: flex;
}
.tw-flex-1 {
  flex: 1;
}
.tw-items-center {
  align-items: center;
}
.tw-justify-center {
  justify-content: center;
}
.tw-gap-2 {
  gap: 0.5rem;
}
.tw-gap-3 {
  gap: 0.75rem;
}
.tw-gap-4 {
  gap: 1rem;
}
.tw-w-3 {
  width: 0.75rem;
}
.tw-h-3 {
  height: 0.75rem;
}
.tw-rounded-full {
  border-radius: 9999px;
}
.tw-rounded {
  border-radius: 0.25rem;
}
.tw-rounded-md {
  border-radius: 0.375rem;
}
.tw-bg-emerald-500 {
  background-color: var(--success);
}
.tw-text-sm {
  font-size: 0.875rem;
}
.tw-text-xs {
  font-size: 0.75rem;
}
.tw-font-medium {
  font-weight: 500;
}
.tw-font-semibold {
  font-weight: 600;
}
.tw-font-mono {
  font-family: monospace;
}
.tw-px-2 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
.tw-px-3 {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}
.tw-py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}
.tw-py-1\.5 {
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}
.tw-bg-emerald-500\/20 {
  background-color: rgba(16, 185, 129, 0.2);
}
.tw-text-emerald-400 {
  color: var(--success-light);
}
.tw-bg-var(--surface-900)\/20 {
  background-color: rgba(0, 0, 0, 0.2);
}
.tw-bg-var(--surface-0)\/20 {
  background-color: rgba(255, 255, 255, 0.2);
}
.tw-border {
  border-width: 1px;
}
.tw-border-var(--surface-0)\/30 {
  border-color: rgba(255, 255, 255, 0.3);
}
.tw-bg-red-500 {
  background-color: var(--danger);
}

/* PrimeVue Preview */
.toolbar-preview-primevue {
  background: linear-gradient(120deg, var(--info) 0%, #6366f1 100%);
}

.pv-status-section {
  display: flex;
  gap: 0.5rem;
}
.pv-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
.pv-badge-success {
  background: #22c55e;
}
.pv-call-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.pv-tag {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
.pv-tag-info {
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}
.pv-caller {
  font-weight: 500;
}
.pv-duration {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.pv-button-group {
  display: flex;
  gap: 0.5rem;
}
.pv-button {
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
.pv-button-outlined {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: var(--surface-0);
}
.pv-button-danger {
  background: var(--danger);
  color: var(--surface-0);
}

/* Vuetify Preview */
.toolbar-preview-vuetify {
  background: linear-gradient(120deg, #673ab7 0%, #9c27b0 100%);
}

.v-status {
  display: flex;
  gap: 0.5rem;
}
.v-chip {
  padding: 0.25rem 0.625rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
}
.v-chip-success {
  background: #4caf50;
}
.v-chip-primary {
  background: #2196f3;
}
.v-call-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.v-caller {
  font-weight: 500;
}
.v-duration {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.v-btn-group {
  display: flex;
  gap: 0.25rem;
}
.v-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.v-btn-text {
  background: transparent;
  color: var(--surface-0);
}
.v-btn-text:hover {
  background: rgba(255, 255, 255, 0.1);
}
.v-btn-error {
  background: #f44336;
  color: var(--surface-0);
}

/* Quasar Preview */
.toolbar-preview-quasar {
  background: linear-gradient(120deg, #1976d2 0%, #7c4dff 100%);
}

.q-status {
  display: flex;
  gap: 0.5rem;
}
.q-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
}
.q-badge-positive {
  background: #21ba45;
}
.q-badge-primary {
  background: #1976d2;
}
.q-call-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.q-caller {
  font-weight: 500;
}
.q-duration {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.q-btn-group {
  display: flex;
  gap: 0.25rem;
}
.q-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 3px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
}
.q-btn-flat {
  background: transparent;
  color: var(--surface-0);
}
.q-btn-flat:hover {
  background: rgba(255, 255, 255, 0.1);
}
.q-btn-negative {
  background: #c10015;
  color: var(--surface-0);
}

/* Element Plus Preview */
.toolbar-preview-element {
  background: linear-gradient(120deg, #409eff 0%, #67c23a 100%);
}

.el-status {
  display: flex;
  gap: 0.5rem;
}
.el-tag {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid transparent;
}
.el-tag-success {
  background: #67c23a;
  border-color: #67c23a;
}
.el-tag-primary {
  background: #409eff;
  border-color: #409eff;
}
.el-call-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.el-caller {
  font-weight: 500;
}
.el-duration {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.el-btn-group {
  display: flex;
  gap: 0.5rem;
}
.el-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
}
.el-button-default {
  background: rgba(255, 255, 255, 0.1);
  color: var(--surface-0);
}
.el-button-danger {
  background: #f56c6c;
  border-color: #f56c6c;
  color: var(--surface-0);
}

/* Naive UI Preview */
.toolbar-preview-naive {
  background: linear-gradient(120deg, #18a058 0%, #2080f0 100%);
}

.n-status {
  display: flex;
  gap: 0.5rem;
}
.n-tag {
  padding: 0.125rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
}
.n-tag-success {
  background: rgba(24, 160, 88, 0.3);
  color: #63e2b7;
}
.n-tag-info {
  background: rgba(32, 128, 240, 0.3);
  color: #70c0e8;
}
.n-call-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.n-caller {
  font-weight: 500;
}
.n-duration {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.n-btn-group {
  display: flex;
  gap: 0.5rem;
}
.n-button {
  padding: 0.375rem 0.875rem;
  border-radius: 3px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
.n-button-default {
  background: rgba(255, 255, 255, 0.15);
  color: var(--surface-0);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.n-button-error {
  background: #d03050;
  color: var(--surface-0);
}

/* Advanced Examples Tab - Nurse Workflow */
.advanced-section {
  padding: 1rem 0;
}

.advanced-section h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #1e293b;
}

.section-description {
  margin: 0 0 1.5rem 0;
  color: #64748b;
  line-height: 1.6;
}

.nurse-workflow-demo {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
}

.toolbar-nurse {
  background: linear-gradient(135deg, var(--primary) 0%, #764ba2 100%);
  border-radius: 10px;
  padding: 0.875rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--surface-0);
}

/* Presence Dropdown */
.presence-dropdown {
  position: relative;
}

.presence-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  color: var(--surface-0);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.presence-button:hover {
  background: rgba(255, 255, 255, 0.25);
}

.presence-dropdown.open .presence-button {
  background: rgba(255, 255, 255, 0.25);
}

.presence-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.presence-label {
  var(--surface-0)-space: nowrap;
}

.dropdown-arrow {
  width: 14px;
  height: 14px;
  opacity: 0.8;
  transition: transform 0.2s ease;
}

.presence-dropdown.open .dropdown-arrow {
  transform: rotate(180deg);
}

.presence-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 220px;
  background: var(--surface-0);
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 100;
  overflow: hidden;
}

.presence-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: left;
}

.presence-option:hover {
  background: #f1f5f9;
}

.presence-option.active {
  background: var(--surface-ground);
}

.presence-option-label {
  font-weight: 500;
  color: #1e293b;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.presence-option .presence-dot {
  display: inline-block;
  vertical-align: middle;
}

.presence-option-desc {
  font-size: 0.75rem;
  color: #64748b;
  padding-left: 1.375rem;
}

/* Return Time Hint in Presence Options */
.return-time-hint {
  font-size: 0.625rem;
  color: var(--text-muted);
  padding-left: 1.375rem;
  font-style: italic;
}

/* Return Time Picker */
.return-time-picker {
  position: relative;
}

.return-time-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: var(--surface-0);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.return-time-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.return-time-picker.open .return-time-button {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.clock-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
  opacity: 0.9;
}

.set-time-text {
  opacity: 0.8;
}

.return-time-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: var(--surface-0);
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 100;
  overflow: hidden;
  padding: 0.5rem;
}

.return-time-section {
  padding: 0.5rem;
}

.return-time-section:not(:last-child) {
  border-bottom: 1px solid #e2e8f0;
}

.return-time-header {
  font-size: 0.625rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.duration-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.duration-btn {
  padding: 0.5rem 0.25rem;
  background: #f1f5f9;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.duration-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.duration-btn.active {
  background: var(--primary);
  color: var(--surface-0);
  border-color: #5a67d8;
}

.time-input {
  width: 100%;
  padding: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1e293b;
  cursor: pointer;
}

.time-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.clear-return-btn {
  width: 100%;
  padding: 0.5rem;
  background: none;
  border: none;
  color: var(--danger);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
  border-radius: 6px;
  margin-top: 0.25rem;
}

.clear-return-btn:hover {
  background: #fef2f2;
}

/* Return Time Badge in Presence Button */
.return-time-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 0.625rem;
  font-weight: 500;
  margin-left: 0.25rem;
}

/* Return Time Capability Indicator */
.return-time-capability {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  color: var(--primary);
  margin-top: 0.25rem;
  padding-left: 1.375rem;
}

.return-time-capability svg {
  width: 10px;
  height: 10px;
  fill: currentColor;
}

/* Call Badge */
.call-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.call-state-tag {
  padding: 0.25rem 0.625rem;
  background: rgba(16, 185, 129, 0.2);
  color: var(--success);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.caller-info {
  font-weight: 500;
}

.call-timer {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 0.875rem;
  opacity: 0.9;
}

.presence-message {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
}

/* Presence Legend Grid */
.presence-legend {
  margin-top: 1.5rem;
}

.presence-legend h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #1e293b;
}

.presence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.presence-card {
  background: var(--surface-0);
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.presence-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.presence-card.active {
  border-color: var(--primary);
  background: #f5f3ff;
}

.presence-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.presence-card-label {
  font-weight: 600;
  color: #1e293b;
}

.presence-card-desc {
  margin: 0 0 0.75rem 0;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.4;
}

.presence-card-meta {
  border-top: 1px solid #e2e8f0;
  padding-top: 0.75rem;
}

.call-capability {
  font-size: 0.75rem;
  font-weight: 500;
}

.call-capability.enabled {
  color: var(--success);
}

.call-capability:not(.enabled) {
  color: var(--danger);
}

/* Code Example in Advanced Tab */
.nurse-workflow-demo .code-example {
  margin-top: 1.5rem;
  background: var(--surface-0);
  border-radius: 10px;
  padding: 1rem;
}

.nurse-workflow-demo .code-example h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9375rem;
  color: #1e293b;
}

.nurse-workflow-demo .code-example pre {
  background: #1e293b;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  margin: 0;
}

.nurse-workflow-demo .code-example code {
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #e2e8f0;
}

/* Responsive */
@media (max-width: 768px) {
  .toolbar-preview {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .toolbar-center {
    flex: 1 1 100%;
    order: -1;
  }

  .demo-layout-left,
  .demo-layout-right {
    flex-direction: column;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
  }

  .toolbar-preview-tailwind,
  .toolbar-preview-primevue,
  .toolbar-preview-vuetify,
  .toolbar-preview-quasar,
  .toolbar-preview-element,
  .toolbar-preview-naive {
    flex-wrap: wrap;
    gap: 0.75rem;
  }
}
</style>
