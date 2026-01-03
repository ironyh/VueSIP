# Theme Fix Priority List

**Generated:** 2025-12-22
**Total Hardcoded Colors:** 694 instances
**Files Affected:** 30+ demo files

## Critical Priority (Week 1)

### 1. PresenceDemo.vue (163 hardcoded colors) 🔴

**Impact:** High - Core FreePBX feature
**Effort:** 3-4 hours

**Common Patterns to Replace:**

```css
/* OLD */
background: #667eea;
color: #333;
border: 1px solid #e5e7eb;

/* NEW */
background: var(--primary);
color: var(--text-primary);
border: 1px solid var(--border-color);
```

### 2. VideoCallDemo.vue (127 hardcoded colors) 🔴

**Impact:** High - Major feature
**Effort:** 3-4 hours

**Special Cases:**

```css
/* OLD */
background: #000; /* Video backgrounds */
background: rgba(0, 0, 0, 0.7); /* Overlays */

/* NEW */
background: var(--surface-900);
background: var(--bg-overlay);
```

### 3. NetworkSimulatorDemo.vue (132 hardcoded colors) 🔴

**Impact:** High - Testing utility
**Effort:** 4-5 hours

**JavaScript Functions Need Refactoring:**

```typescript
// OLD
const getQualityColor = (quality: string) => {
  if (quality === 'excellent') return '#10b981'
  if (quality === 'poor') return '#ef4444'
}

// NEW
const getQualityColor = (quality: string) => {
  if (quality === 'excellent') return 'var(--success)'
  if (quality === 'poor') return 'var(--danger)'
}
```

## High Priority (Week 2)

### 4. RecordingManagementDemo.vue (91 colors) 🟡

**Effort:** 2-3 hours

### 5. DoNotDisturbDemo.vue (52 colors) 🟡

**Effort:** 2 hours

### 6. E911Demo.vue (21 colors) 🟡

**Effort:** 1 hour

### 7. ClickToCallDemo.vue (26 colors) 🟡

**Effort:** 1-2 hours

## Medium Priority (Week 3)

### Remaining Demos (8-15 colors each)

- AgentStatsDemo.vue (17)
- SupervisorDemo.vue (7)
- PagingDemo.vue (11)
- QueueMonitorDemo.vue (8)
- BLFDemo.vue (9)
- CallHistoryDemo.vue (8)
- AgentLoginDemo.vue (12)
- AutoAnswerDemo.vue (10)
- CallWaitingDemo.vue (14)
- FeatureCodesDemo.vue (8)
- ToolbarLayoutsDemo.vue (45)

**Estimated Total:** 5-8 hours

## Low Priority (Week 4)

### PlaygroundApp.vue Shadow/Overlay Refactoring

**Goal:** Replace rgba() shadows with CSS variables

```css
/* Create new variables in style.css */
:root {
  --shadow-overlay: rgba(0, 0, 0, 0.08);
  --highlight-overlay: rgba(255, 255, 255, 0.04);
  --gradient-overlay: rgba(102, 126, 234, 0.15);
}

:root.dark-mode {
  --shadow-overlay: rgba(0, 0, 0, 0.3);
  --highlight-overlay: rgba(255, 255, 255, 0.06);
  --gradient-overlay: rgba(129, 140, 248, 0.25);
}
```

## Automation Tools

### Color Migration Script

```bash
#!/bin/bash
# scripts/migrate-colors.sh

# Common color replacements
sed -i 's/background: #667eea/background: var(--primary)/g' playground/demos/*.vue
sed -i 's/color: #333/color: var(--text-primary)/g' playground/demos/*.vue
sed -i 's/color: #666/color: var(--text-secondary)/g' playground/demos/*.vue
sed -i 's/border: 1px solid #e5e7eb/border: 1px solid var(--border-color)/g' playground/demos/*.vue
sed -i 's/background: #f9fafb/background: var(--surface-ground)/g' playground/demos/*.vue
sed -i 's/background: #ef4444/background: var(--danger)/g' playground/demos/*.vue
sed -i 's/background: #10b981/background: var(--success)/g' playground/demos/*.vue
sed -i 's/background: #f59e0b/background: var(--warning)/g' playground/demos/*.vue
sed -i 's/background: #3b82f6/background: var(--info)/g' playground/demos/*.vue
```

### Color Mapping Reference

```typescript
// Common hardcoded → CSS variable mappings

const colorMap = {
  // Primary colors
  '#667eea': 'var(--primary)',
  '#5568d3': 'var(--primary-hover)',
  '#4f46e5': 'var(--primary-active)',

  // Status colors
  '#10b981': 'var(--success)',
  '#ef4444': 'var(--danger)',
  '#f59e0b': 'var(--warning)',
  '#3b82f6': 'var(--info)',

  // Text colors
  '#333': 'var(--text-primary)',
  '#666': 'var(--text-secondary)',
  '#999': 'var(--text-muted)',
  '#1f2937': 'var(--text-primary)',
  '#6b7280': 'var(--text-secondary)',

  // Background colors
  '#f9fafb': 'var(--surface-ground)',
  '#ffffff': 'var(--surface-card)',
  '#f3f4f6': 'var(--surface-hover)',
  '#e5e7eb': 'var(--surface-border)',

  // Grays
  '#e5e7eb': 'var(--border-color)',
  '#d1d5db': 'var(--border-color-dark)',
  '#9ca3af': 'var(--gray-400)',
  '#6b7280': 'var(--gray-500)',
  '#4b5563': 'var(--gray-600)',
}
```

## Testing Checklist

After each demo is migrated:

- [ ] Visual test in light mode
- [ ] Visual test in dark mode
- [ ] Verify smooth transitions
- [ ] Check no console errors
- [ ] Verify contrast ratios (WCAG AA)
- [ ] Test theme toggle while demo active
- [ ] Verify localStorage persistence

## Success Metrics

**Target:** 0 hardcoded colors by end of Week 4

**Current:** 694 hardcoded colors
**Week 1 Goal:** <300 colors (3 critical demos fixed)
**Week 2 Goal:** <100 colors (7 high-priority demos fixed)
**Week 3 Goal:** <20 colors (remaining demos fixed)
**Week 4 Goal:** 0 colors (shadows/overlays refactored)

## Notes

- **PrimeVue Integration:** Ensure PrimeVue components inherit theme colors via CSS variable mapping
- **JavaScript Color Functions:** Create `useThemeColor()` composable for dynamic color access
- **CI/CD:** Add linting rule to prevent new hardcoded colors
- **Documentation:** Update component library docs with theme token usage examples
