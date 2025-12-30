# Phase 1: Critical Foundation Fixes - Migration Guide

**Status:** 🟢 In Progress
**Duration:** Week 1-2
**Priority:** 🔴 CRITICAL

---

## ✅ COMPLETED

### 1. PrimeVue Installation Verified

- ✅ PrimeVue v3.53.1 installed
- ✅ PrimeIcons v7.0.0 installed
- ✅ Configured in `playground/main.ts`
- ✅ Aura theme preset enabled
- ✅ Dark mode selector: `.dark-theme`

---

## 🔧 IN PROGRESS

### Step 1: Fix Theme Transition Issues (CRITICAL)

**Problem:** Global `*` selector applies transitions to ALL elements, causing:

- Input field flicker
- Unnecessary repaints
- Performance degradation

**Current Code (style.css:419-427):**

```css
/* ❌ WRONG: Too broad */
*,
*::before,
*::after {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}
```

**Fixed Code:**

```css
/* ✅ CORRECT: Scoped to theme-aware elements */
.theme-transition,
[class*='bg-'],
[class*='text-'],
[class*='border-'],
.card,
.btn,
button:not(input),
.playground-header,
.playground-sidebar,
.playground-main {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}
```

---

### Step 2: Add Motion Preference Support (WCAG 2.1)

**Problem:** No `prefers-reduced-motion` support violates WCAG 2.1 Level AAA

**Solution:**

```css
/* Add to style.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### Step 3: Create ESLint Rules

**File:** `.eslintrc.cjs` or `eslint.config.js`

```javascript
module.exports = {
  extends: ['@vue/eslint-config-typescript', 'plugin:vue/vue3-recommended', 'prettier'],
  rules: {
    // Prevent hard-coded colors
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/#[0-9a-fA-F]{3,8}/]',
        message:
          'Hard-coded hex colors are not allowed. Use CSS custom properties instead (e.g., var(--primary)).',
      },
      {
        selector: 'Literal[value=/rgb\\(/]',
        message: 'Hard-coded RGB colors are not allowed. Use CSS custom properties instead.',
      },
      {
        selector: 'Literal[value=/rgba\\(/]',
        message: 'Hard-coded RGBA colors are not allowed. Use CSS custom properties instead.',
      },
    ],

    // Encourage PrimeVue components
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/no-deprecated-slot-attribute': 'error',
    'vue/require-explicit-emits': 'error',

    // Accessibility
    'vue/require-default-prop': 'error',
    'vuejs-accessibility/click-events-have-key-events': 'warn',
    'vuejs-accessibility/form-control-has-label': 'warn',
  },
}
```

---

### Step 4: Migration Templates

#### 4.1 Button Migration Template

**Before (Custom Button):**

```vue
<button class="btn btn-primary" @click="handleClick">
  Click Me
</button>

<button class="btn btn-secondary" :disabled="isLoading">
  Submit
</button>
```

**After (PrimeVue Button):**

```vue
<Button label="Click Me" @click="handleClick" />

<Button label="Submit" severity="secondary" :disabled="isLoading" />
```

**Import Required:**

```typescript
import Button from 'primevue/button'
```

---

#### 4.2 Input Migration Template

**Before (Native Input):**

```vue
<input v-model="username" type="text" placeholder="Enter username" :disabled="isLoading" />

<input v-model="password" type="password" required />
```

**After (PrimeVue InputText):**

```vue
<InputText v-model="username" placeholder="Enter username" :disabled="isLoading" />

<Password v-model="password" :feedback="false" />
```

**Import Required:**

```typescript
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
```

---

#### 4.3 Dropdown/Select Migration Template

**Before (Native Select):**

```vue
<select v-model="selectedOption">
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

**After (PrimeVue Dropdown):**

```vue
<Dropdown
  v-model="selectedOption"
  :options="options"
  optionLabel="label"
  optionValue="value"
  placeholder="Select an option"
/>
```

**Script Setup:**

```typescript
import Dropdown from 'primevue/dropdown'

const options = ref([
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
])
```

---

#### 4.4 Checkbox Migration Template

**Before (Native Checkbox):**

```vue
<input type="checkbox" v-model="isEnabled" id="enable-feature" />
<label for="enable-feature">Enable Feature</label>
```

**After (PrimeVue Checkbox):**

```vue
<Checkbox v-model="isEnabled" inputId="enable-feature" binary />
<label for="enable-feature">Enable Feature</label>
```

**Import Required:**

```typescript
import Checkbox from 'primevue/checkbox'
```

---

#### 4.5 Icon Migration Template

**Before (Inline SVG):**

```vue
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M5 13l4 4L19 7" />
</svg>
```

**After (PrimeIcons):**

```vue
<i class="pi pi-check" />
```

**Icon Reference:**

- ✅ Check: `pi-check`
- ✖️ Close: `pi-times`
- 📞 Phone: `pi-phone`
- 🎤 Microphone: `pi-microphone`
- 🔇 Mute: `pi-volume-off`
- 📹 Video: `pi-video`
- ⚙️ Settings: `pi-cog`
- 👤 User: `pi-user`
- 🚪 Logout: `pi-sign-out`

See full icon list: https://primevue.org/icons

---

#### 4.6 Dialog/Alert Migration Template

**Before (Native Alert):**

```typescript
alert('Operation successful!')
confirm('Are you sure?')
```

**After (PrimeVue Toast/ConfirmDialog):**

```vue
<template>
  <Toast />
  <ConfirmDialog />
</template>

<script setup>
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const showSuccess = () => {
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Operation successful!',
    life: 3000,
  })
}

const confirmAction = () => {
  confirm.require({
    message: 'Are you sure?',
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      // User confirmed
    },
    reject: () => {
      // User cancelled
    },
  })
}
</script>
```

**Import Required:**

```typescript
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
```

---

### Step 5: Shared Component Utilities

**File:** `playground/demos/shared-components.ts`

```typescript
/**
 * Shared component imports for playground demos
 * Import this in each demo file to get all necessary PrimeVue components
 */

// Form Components
export { default as Button } from 'primevue/button'
export { default as InputText } from 'primevue/inputtext'
export { default as Password } from 'primevue/password'
export { default as Dropdown } from 'primevue/dropdown'
export { default as Checkbox } from 'primevue/checkbox'
export { default as InputSwitch } from 'primevue/inputswitch'
export { default as InputNumber } from 'primevue/inputnumber'
export { default as Textarea } from 'primevue/textarea'

// Data Display
export { default as DataTable } from 'primevue/datatable'
export { default as Column } from 'primevue/column'
export { default as Card } from 'primevue/card'
export { default as Panel } from 'primevue/panel'
export { default as Divider } from 'primevue/divider'

// Overlay
export { default as Dialog } from 'primevue/dialog'
export { default as Toast } from 'primevue/toast'
export { default as ConfirmDialog } from 'primevue/confirmdialog'

// Misc
export { default as ProgressSpinner } from 'primevue/progressspinner'
export { default as ProgressBar } from 'primevue/progressbar'
export { default as Message } from 'primevue/message'
export { default as Badge } from 'primevue/badge'

// Composables
export { useToast } from 'primevue/usetoast'
export { useConfirm } from 'primevue/useconfirm'
```

**Usage in Demo Files:**

```typescript
// Instead of importing individually:
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
// ...

// Import from shared file:
import { Button, InputText, Dropdown, Toast } from './shared-components'
```

---

### Step 6: Fix Hard-Coded Colors Script

**File:** `scripts/fix-hardcoded-colors.sh`

```bash
#!/bin/bash

# Fix hard-coded colors in Vue files
# This script replaces common hard-coded color values with CSS variables

echo "🔍 Finding hard-coded colors in playground demos..."

# Common color replacements
declare -A colors=(
  ["#667eea"]="var(--primary)"
  ["#5568d3"]="var(--primary-hover)"
  ["#10b981"]="var(--success)"
  ["#ef4444"]="var(--danger)"
  ["#f59e0b"]="var(--warning)"
  ["#3b82f6"]="var(--info)"
  ["#6b7280"]="var(--text-secondary)"
  ["#e5e7eb"]="var(--border-color)"
  ["#f9fafb"]="var(--surface-50)"
  ["#ffffff"]="var(--surface-0)"
  ["white"]="var(--surface-0)"
  ["#000000"]="var(--surface-900)"
  ["black"]="var(--surface-900)"
)

for file in playground/demos/*.vue; do
  echo "Processing: $file"

  for hex in "${!colors[@]}"; do
    variable="${colors[$hex]}"

    # Replace in style tags
    sed -i "s/$hex/$variable/gi" "$file"
  done
done

echo "✅ Color replacement complete!"
echo "⚠️  Manual review required for complex color calculations"
```

**Make executable:**

```bash
chmod +x scripts/fix-hardcoded-colors.sh
```

---

## 📋 PHASE 1 CHECKLIST

### Critical Fixes

- [ ] Fix overly broad transition selector
- [ ] Add `prefers-reduced-motion` support
- [ ] Create ESLint rules for hard-coded colors
- [ ] Set up pre-commit hooks
- [ ] Create shared component utilities file

### Migration Templates

- [ ] Button migration template
- [ ] Input migration template
- [ ] Dropdown migration template
- [ ] Checkbox migration template
- [ ] Icon migration template
- [ ] Dialog/Toast migration template

### Example Migration

- [ ] Migrate BasicCallDemo.vue as reference
- [ ] Document all changes made
- [ ] Test in both light and dark mode
- [ ] Verify accessibility with axe DevTools
- [ ] Create "before/after" comparison

### Documentation

- [ ] Migration guide for developers
- [ ] PrimeVue component decision tree
- [ ] Common patterns documentation
- [ ] Troubleshooting guide

---

## 🎯 SUCCESS CRITERIA

Phase 1 is complete when:

1. ✅ Theme transitions don't cause input flicker
2. ✅ Motion preference is respected
3. ✅ ESLint prevents new hard-coded colors
4. ✅ Migration templates documented
5. ✅ BasicCallDemo.vue fully migrated
6. ✅ Dark mode works in migrated demo
7. ✅ All tests pass
8. ✅ No accessibility regressions

---

## 📊 PROGRESS TRACKING

| Task                    | Status         | Assigned   | Completion |
| ----------------------- | -------------- | ---------- | ---------- |
| Fix transitions         | 🔄 In Progress | Coder      | 0%         |
| Motion preference       | 🔄 In Progress | Coder      | 0%         |
| ESLint rules            | 🔄 In Progress | Coder      | 0%         |
| Migration templates     | ✅ Complete    | Researcher | 100%       |
| Shared utilities        | 📝 Pending     | Coder      | 0%         |
| BasicCallDemo migration | 📝 Pending     | Coder      | 0%         |
| Documentation           | 🔄 In Progress | Scribe     | 25%        |
| Testing                 | 📝 Pending     | Tester     | 0%         |

---

## 🚀 NEXT STEPS

After Phase 1 completion:

1. Begin Phase 2: Core Migration (8 high-traffic demos)
2. Set up automated testing for theme switching
3. Create CI/CD checks for PrimeVue compliance
4. Train team on new patterns

---

**Last Updated:** 2025-12-22
**Phase 1 ETA:** 2 weeks
**Overall Project ETA:** 6-7 weeks
