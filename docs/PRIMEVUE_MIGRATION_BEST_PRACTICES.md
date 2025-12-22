# PrimeVue Migration Best Practices

**Purpose**: Comprehensive guide for migrating VueSIP demos from custom HTML/CSS to PrimeVue components.

**Based On**: Phase 3 Week 1 execution (15 demos, 100% success rate, 0 ESLint errors)

**Last Updated**: 2025-12-22

---

## Table of Contents

1. [Migration Types](#migration-types)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Component Conversion Patterns](#component-conversion-patterns)
4. [CSS Cleanup](#css-cleanup)
5. [Common Pitfalls](#common-pitfalls)
6. [Quality Assurance](#quality-assurance)
7. [Performance Tips](#performance-tips)

---

## Migration Types

### Type 1: Import Consolidation (5-10 minutes)

Demo already uses PrimeVue components, just needs centralized imports.

**Indicators**:

- ✅ Has `import X from 'primevue/x'` statements
- ✅ No custom HTML buttons or inputs
- ✅ Minimal CSS for form elements

**Process**:

1. Identify all PrimeVue imports
2. Replace with single import from `./shared-components`
3. Remove unused imports
4. Run ESLint validation

**Example**: BlacklistDemo.vue, CDRDashboardDemo.vue

---

### Type 2: Full Migration (30-60 minutes)

Demo uses custom HTML and needs complete component conversion.

**Indicators**:

- ❌ Has `<button class="btn">` elements
- ❌ Has `<input type="text">` elements
- ❌ Has `<div class="error-message">` elements
- ❌ Extensive button/form CSS

**Process**:

1. Add PrimeVue imports
2. Convert all buttons to Button component
3. Convert all inputs to InputText/Password
4. Convert error messages to Message component
5. Clean up CSS (remove button/form styles)
6. Add `:deep()` selectors for custom styling
7. Add utility classes
8. Run ESLint validation

**Example**: SupervisorDemo.vue, PresenceDemo.vue

---

## Pre-Migration Checklist

### Before Starting

- [ ] Read the demo file to understand functionality
- [ ] Identify migration type (consolidation vs full)
- [ ] Check for PrimeVue imports (already present?)
- [ ] Search for CSS typo: `grep "var(--surface-0)-space" filename.vue`
- [ ] Search for hex colors: `grep "#[0-9a-fA-F]\{6\}" filename.vue`
- [ ] Search for HTML elements: `grep "<button\|<input\|<div class=\"error" filename.vue`
- [ ] Estimate time (5-10 min for consolidation, 30-60 min for full)

### Tools Needed

```bash
# Search for PrimeVue imports
grep "from 'primevue/" filename.vue

# Find hex colors
grep -n "#[0-9a-fA-F]\{6\}" filename.vue

# Find custom HTML elements
grep -n "<button\|<input type=\"text\"\|<input type=\"password\"" filename.vue

# Find error messages
grep -n "error-message\|<div.*error" filename.vue
```

---

## Component Conversion Patterns

### Pattern 1: Button Conversion

#### Basic Button

**Before**:

```vue
<button class="btn btn-primary" @click="handleSubmit">
  Submit
</button>
```

**After**:

```vue
<Button label="Submit" @click="handleSubmit" />
```

#### Button with Dynamic Label

**Before**:

```vue
<button class="btn btn-primary" @click="connect">
  {{ connecting ? 'Connecting...' : 'Connect' }}
</button>
```

**After**:

```vue
<Button :label="connecting ? 'Connecting...' : 'Connect'" @click="connect" />
```

#### Small Secondary Button

**Before**:

```vue
<button class="btn btn-sm btn-secondary" @click="refresh">
  Refresh
</button>
```

**After**:

```vue
<Button label="Refresh" severity="secondary" size="small" @click="refresh" />
```

#### Danger/Delete Button

**Before**:

```vue
<button class="btn btn-danger" @click="deleteItem">
  Delete
</button>
```

**After**:

```vue
<Button label="Delete" severity="danger" @click="deleteItem" />
```

#### Button with Custom Class

**Before**:

```vue
<button class="btn btn-monitor" @click="monitor">
  Monitor
</button>
```

**After**:

```vue
<Button label="Monitor" class="btn-monitor" @click="monitor" />
```

Then add `:deep()` selector in CSS:

```css
:deep(.btn-monitor) {
  background: var(--vuesip-info);
  border-color: var(--vuesip-info);
}

:deep(.btn-monitor:hover:not(:disabled)) {
  background: var(--vuesip-info-dark);
  border-color: var(--vuesip-info-dark);
}
```

---

### Pattern 2: Input Conversion

#### Text Input

**Before**:

```vue
<input
  id="username"
  v-model="username"
  type="text"
  placeholder="Enter username"
  :disabled="loading"
/>
```

**After**:

```vue
<InputText
  id="username"
  v-model="username"
  placeholder="Enter username"
  :disabled="loading"
  class="w-full"
/>
```

#### Password Input

**Before**:

```vue
<input
  id="password"
  v-model="password"
  type="password"
  placeholder="Enter password"
  :disabled="loading"
/>
```

**After**:

```vue
<Password
  id="password"
  v-model="password"
  placeholder="Enter password"
  :disabled="loading"
  :feedback="false"
  class="w-full"
/>
```

**Note**: `:feedback="false"` disables the password strength meter.

---

### Pattern 3: Error Message Conversion

**Before**:

```vue
<div v-if="error" class="error-message">
  {{ error }}
</div>
```

**After**:

```vue
<Message v-if="error" severity="error" class="mt-2">
  {{ error }}
</Message>
```

**Success Message**:

```vue
<Message v-if="success" severity="success" class="mt-2">
  {{ success }}
</Message>
```

**Warning Message**:

```vue
<Message v-if="warning" severity="warn" class="mt-2">
  {{ warning }}
</Message>
```

---

### Pattern 4: Import Addition

**Location**: Add after existing imports, before script logic

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient } from '../../src'
// Add here ↓
import { Button, InputText, Password, Message } from './shared-components'

// Script logic starts here
const username = ref('')
</script>
```

**Common Components**:

```typescript
// Form components
;(Button, InputText, Password, Checkbox, InputSwitch, Dropdown)

// Layout components
;(Card, Panel, Divider)

// Data components
;(DataTable, Column, Badge, Tag)

// Feedback components
;(Message, Toast, ProgressBar)
```

---

## CSS Cleanup

### Step 1: Remove Button Styles

Remove all of these classes:

```css
/* ❌ DELETE THESE */
.btn { ... }
.btn-primary { ... }
.btn-secondary { ... }
.btn-danger { ... }
.btn-sm { ... }
.btn:disabled { ... }
.btn-primary:hover:not(:disabled) { ... }
/* etc. */
```

### Step 2: Remove Form Styles

Remove these classes:

```css
/* ❌ DELETE THESE */
.form-group input { ... }
.form-row input { ... }
.form-group input:disabled { ... }
/* etc. */
```

Keep form layout styles:

```css
/* ✅ KEEP THESE */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}
```

### Step 3: Remove Error Message Styles

```css
/* ❌ DELETE THIS */
.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 0.875rem;
}
```

### Step 4: Add `:deep()` Selectors

For custom button styling:

```css
/* ✅ ADD FOR CUSTOM BUTTONS */
:deep(.btn-monitor) {
  background: var(--vuesip-info);
  border-color: var(--vuesip-info);
}

:deep(.btn-monitor:hover:not(:disabled)) {
  background: var(--vuesip-info-dark);
  border-color: var(--vuesip-info-dark);
}
```

### Step 5: Fix Mode Switcher Selectors

If you have mode switchers:

```css
/* ❌ WRONG */
.mode-switcher .btn {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}

/* ✅ CORRECT */
.mode-switcher :deep(.p-button) {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}
```

### Step 6: Add Utility Classes

Add at the end of `<style>` section:

```css
/* Utility classes */
.w-full {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting `:feedback="false"` on Password

**Problem**: Password strength meter appears unexpectedly

```vue
❌
<Password v-model="password" />
<!-- Shows strength meter -->
✅
<Password v-model="password" :feedback="false" />
<!-- Clean input -->
```

### Pitfall 2: Missing `class="w-full"` on Inputs

**Problem**: Inputs don't stretch to full width

```vue
❌
<InputText v-model="username" />
<!-- Narrow input -->
✅
<InputText v-model="username" class="w-full" />
<!-- Full width -->
```

### Pitfall 3: Unused Imports

**Problem**: ESLint error for imported but unused components

```typescript
❌ import { Button, InputText, Dropdown, Badge } from './shared-components'
   // If you only use Button and InputText

✅ import { Button, InputText } from './shared-components'
   // Import only what you use
```

### Pitfall 4: Missing `:deep()` for Custom Styling

**Problem**: Custom button styles don't apply

```css
❌ .btn-monitor {
  background: var(--vuesip-info);
}
/* Doesn't target PrimeVue Button internals */

✅ :deep(.btn-monitor) {
  background: var(--vuesip-info);
}
/* Correctly targets PrimeVue Button */
```

### Pitfall 5: Hard-Coded Hex Colors

**Problem**: ESLint error for hex colors

```typescript
❌ color: '#84cc16'  // Hard-coded
✅ color: 'var(--success)'  // CSS custom property
```

### Pitfall 6: CSS Typo Pattern

**Problem**: Copy-paste error from template

```css
❌ var(--surface-0)-space: nowrap;
✅ white-space: nowrap;
```

**Search Before Starting**:

```bash
grep "var(--surface-0)-space" filename.vue
```

---

## Quality Assurance

### Validation Checklist

After completing migration:

- [ ] Run ESLint: `npm run lint -- path/to/file.vue`
- [ ] Check for 0 errors, 0 warnings in the migrated file
- [ ] Verify no unused imports
- [ ] Verify no hard-coded hex colors
- [ ] Test in browser (both light and dark themes)
- [ ] Test all buttons work correctly
- [ ] Test all inputs accept user input
- [ ] Test error messages display correctly
- [ ] Verify custom styling (Monitor/Whisper/Barge buttons, etc.)

### ESLint Validation

```bash
# Single file
npm run lint -- playground/demos/YourDemo.vue

# Look for these indicators:
✅ 0 errors, 0 warnings  # Perfect!
❌ X errors, Y warnings  # Fix before continuing
```

### Common ESLint Errors

1. **Unused imports**: Remove from import statement
2. **Hard-coded hex colors**: Replace with `var(--color-name)`
3. **Missing props**: Add required props to components

---

## Performance Tips

### Batch Operations

Group similar migrations together:

- All import consolidations in one session
- All form-heavy demos together
- All button-heavy demos together

### Use Find/Replace Efficiently

For common patterns:

```
Find: <button class="btn btn-primary"
Replace: <Button

Find: <input type="text"
Replace: <InputText

Find: <input type="password"
Replace: <Password
```

### Parallel Reading

Use parallel file reads to understand demo structure faster:

```bash
# Read import section and template start simultaneously
Read file lines 1-50
Read file lines 250-280  # Script section
```

---

## Systematic CSS Typo Check

Found in 4 demos across Phase 3 Week 1:

```bash
# Check before starting migration
grep -n "var(--surface-0)-space" filename.vue

# If found, fix:
var(--surface-0)-space: nowrap;  # ❌ WRONG
white-space: nowrap;              # ✅ CORRECT
```

**Pattern**: This typo appears in demos that were copied from a template. Always check before starting migration.

---

## Migration Workflow

### Full Migration Workflow (30-60 minutes)

1. **Pre-Check** (2 minutes)
   - Search for CSS typo
   - Search for hex colors
   - Search for HTML elements
   - Classify migration type

2. **Import Addition** (1 minute)
   - Add shared-components import
   - Include all needed components

3. **Template Conversion** (15-30 minutes)
   - Convert buttons → Button
   - Convert inputs → InputText/Password
   - Convert errors → Message
   - Add `class="w-full"` to inputs
   - Add `class="mt-2"` to messages

4. **CSS Cleanup** (10-20 minutes)
   - Remove button styles
   - Remove form styles
   - Remove error message styles
   - Add `:deep()` selectors
   - Fix mode switcher selectors
   - Add utility classes
   - Fix CSS typo if found
   - Replace hex colors

5. **Validation** (3-5 minutes)
   - Run ESLint
   - Fix any errors
   - Remove unused imports
   - Re-run ESLint until 0 errors

6. **Todo Update** (1 minute)
   - Mark demo complete
   - Update progress counter

### Import Consolidation Workflow (5-10 minutes)

1. **Pre-Check** (1 minute)
   - Confirm it's consolidation type
   - List all PrimeVue imports

2. **Consolidation** (2 minutes)
   - Replace imports with shared-components
   - Remove unused imports

3. **Validation** (2 minutes)
   - Run ESLint
   - Verify 0 errors

4. **Todo Update** (1 minute)
   - Mark demo complete

---

## Templates

### Standard Import Template

```typescript
import { Button, InputText, Password, Message } from './shared-components'
```

### Extended Import Template

```typescript
import {
  Button,
  InputText,
  Password,
  Message,
  Card,
  Panel,
  DataTable,
  Column,
  Tag,
  Badge,
} from './shared-components'
```

### Utility Classes Template

```css
/* Utility classes */
.w-full {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}
```

### Custom Button Styling Template

```css
/* Custom button styling for PrimeVue Button components */
:deep(.btn-custom) {
  background: var(--custom-color);
  border-color: var(--custom-color);
}

:deep(.btn-custom:hover:not(:disabled)) {
  background: var(--custom-color-dark);
  border-color: var(--custom-color-dark);
}
```

---

## Success Metrics

### Phase 3 Week 1 Results

- **Demos Migrated**: 15/15 (100%)
- **ESLint Errors**: 0
- **Average Time**: 30 minutes/demo
- **Import Consolidation**: 5-10 minutes/demo
- **Full Migration**: 30-60 minutes/demo
- **CSS Lines Removed**: ~500 lines
- **CSS Lines Added**: ~100 lines
- **Build Status**: ✅ PASSED
- **Theme Compatibility**: ✅ Full light/dark support

---

## Resources

### Internal Documentation

- `/docs/PHASE_3_WEEK_1_COMPLETION_REPORT.md` - Detailed completion report
- `/docs/CSS_CUSTOM_PROPERTIES_MIGRATION.md` - CSS custom properties guide
- `/playground/demos/shared-components.ts` - Component exports reference

### External Resources

- [PrimeVue Button](https://primevue.org/button/)
- [PrimeVue InputText](https://primevue.org/inputtext/)
- [PrimeVue Password](https://primevue.org/password/)
- [PrimeVue Message](https://primevue.org/message/)
- [PrimeVue Theming](https://primevue.org/theming/)

---

## Conclusion

Following these best practices ensures:

- ✅ Consistent quality across all migrations
- ✅ 0 ESLint errors in all demos
- ✅ Full theme compatibility
- ✅ Clean, maintainable code
- ✅ Efficient migration velocity

**Key Takeaway**: Preparation and systematic approach are more important than speed. A well-planned 45-minute migration is better than a rushed 20-minute migration that requires rework.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-22
**Status**: Complete
