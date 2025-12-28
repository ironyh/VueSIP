# Toolbar Layouts Component Architecture

**Created**: 2025-12-23
**Purpose**: Modular architecture for ToolbarLayoutsDemo.vue refactoring

---

## Directory Structure

```
/playground/demos/toolbar-layouts/
├── ARCHITECTURE.md (this file)
├── /shared/
│   ├── ToolbarButton.vue       # Reusable button component (106 instances → 1)
│   ├── StatusIndicator.vue     # Status display component (10 instances → 1)
│   ├── CallBadge.vue           # Badge/chip component
│   └── /icons/
│       ├── PhoneIcon.vue
│       ├── MicrophoneIcon.vue
│       ├── VideoIcon.vue
│       ├── HoldIcon.vue
│       ├── TransferIcon.vue
│       ├── HangupIcon.vue
│       └── ... (12 total icon components)
├── /states/
│   ├── DisconnectedState.vue   # Lines 60-101 (~42 lines)
│   ├── ConnectedState.vue      # Lines 104-149 (~46 lines)
│   ├── IdleState.vue           # Lines 152-195 (~44 lines)
│   ├── IncomingCallState.vue   # Lines 198-254 (~57 lines)
│   ├── ActiveCallState.vue     # Lines 257-341 (~85 lines)
│   ├── OnHoldState.vue
│   ├── TransferState.vue
│   ├── ConferenceState.vue
│   ├── MutedState.vue
│   └── OnCallState.vue
├── /frameworks/
│   ├── TailwindExample.vue
│   ├── PrimeVueExample.vue
│   ├── VuetifyExample.vue
│   ├── QuasarExample.vue
│   ├── ElementExample.vue
│   └── NaiveExample.vue
├── /layouts/
│   ├── TopHorizontalLayout.vue
│   ├── LeftSidebarLayout.vue
│   ├── RightSidebarLayout.vue
│   └── FloatingOverlayLayout.vue
└── /advanced/
    └── NurseWorkflowDemo.vue
```

---

## Component APIs

### **ToolbarButton.vue**

**Props**:

```typescript
interface ToolbarButtonProps {
  label: string // Button text
  icon?: Component // Vue component for icon
  buttonClass?: string // CSS class (btn-primary, btn-danger, etc.)
  title?: string // Tooltip text
  ariaLabel?: string // Accessibility label (overrides auto-generated)
  disabled?: boolean // Disabled state
}
```

**Emits**:

```typescript
defineEmits<{
  click: []
}>()
```

**Usage**:

```vue
<ToolbarButton
  label="Connect"
  :icon="PhoneIcon"
  button-class="btn-primary"
  aria-label="Connect to SIP server"
  @click="handleConnect"
/>
```

---

### **StatusIndicator.vue**

**Props**:

```typescript
interface StatusIndicatorProps {
  status: 'red' | 'yellow' | 'green' // Status color
  label: string // Display text
  ariaLabel?: string // Screen reader announcement
  icon?: Component // Optional icon component
  pulseAnimation?: boolean // Pulse effect for active states
}
```

**Usage**:

```vue
<StatusIndicator
  status="green"
  label="Connected"
  aria-label="Connection status: Connected to SIP server"
  :pulse-animation="true"
/>
```

---

### **CallBadge.vue**

**Props**:

```typescript
interface CallBadgeProps {
  type: 'success' | 'warning' | 'danger' | 'info'
  label: string
  count?: number
  size?: 'small' | 'medium' | 'large'
}
```

**Usage**:

```vue
<CallBadge type="success" label="Active" :count="2" />
```

---

## Icon Strategy Decision

**Selected Approach**: Use existing icon library imports (Element Plus, Ionicons)

**Rationale**:

- Reduces bundle size by ~30KB (no need to maintain 44 custom SVG components)
- Leverages existing imports already in package.json
- Consistent with other demos in the project
- Less maintenance overhead

**Implementation**:

- Extract 12 most common icons as thin wrapper components
- Each wrapper uses existing library icons
- Provides consistent API across all toolbar components

**Icon Mapping**:

```typescript
// PhoneIcon.vue wraps @element-plus/icons-vue/Phone
// MicrophoneIcon.vue wraps @vicons/ionicons5/MicOutline
// etc.
```

---

## State Component Pattern

Each state component follows this structure:

```vue
<template>
  <div class="state-card">
    <h4>{{ title }}</h4>
    <div class="toolbar-preview" :class="toolbarClass">
      <div class="toolbar-section">
        <StatusIndicator :status="status" :label="statusLabel" />
      </div>
      <div class="toolbar-section toolbar-center">
        <slot name="center">{{ centerContent }}</slot>
      </div>
      <div class="toolbar-section">
        <ToolbarButton
          v-for="action in actions"
          :key="action.id"
          v-bind="action"
          @click="$emit(action.event)"
        />
      </div>
    </div>
    <p class="state-description">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
// Props, emits, and logic
</script>

<style scoped>
/* State-specific styles */
</style>
```

---

## Accessibility Standards

**WCAG 2.1 AA Compliance Requirements**:

1. **Tab Navigation**:
   - `role="tablist"` on container
   - `role="tab"` on each tab button
   - `aria-selected="true/false"` for active state
   - `tabindex="0"` for active tab, `tabindex="-1"` for inactive
   - Arrow key navigation (Left/Right, Home/End)

2. **Interactive Buttons**:
   - `aria-label` describing action and context
   - `title` for visual tooltip
   - Icons have `aria-hidden="true"`

3. **Status Indicators**:
   - `role="status"` for live regions
   - `aria-live="polite"` for dynamic updates
   - `aria-label` with full status description

4. **Keyboard Navigation**:
   - All interactive elements reachable via Tab
   - Enter/Space activate buttons
   - Esc closes modals/menus
   - No keyboard traps

---

## Performance Optimizations

1. **Lazy Loading**: All tab components loaded on-demand
2. **v-show vs v-if**: Tabs use v-show to preserve DOM state
3. **Component Caching**: KeepAlive for tab content
4. **Icon Optimization**: Reuse icon components vs inline SVGs
5. **Tree Shaking**: Import only used framework components

---

## Migration Strategy

**Phase 1**: Foundation (Completed)

- ✅ Directory structure created
- ✅ Architecture documented
- ✅ Component APIs designed

**Phase 2**: Quick Wins (In Progress)

- Remove dead code (lines 1617-1662)
- Remove unused imports (PrimeVue, Element, Ionicons)
- Verify build stability

**Phases 3-11**: See `/docs/TOOLBARLAYOUTS_REFACTORING_PLAN.md`

---

**Status**: Phase 1 Complete, Phase 2 Starting
**Next**: Remove dead code and unused imports
