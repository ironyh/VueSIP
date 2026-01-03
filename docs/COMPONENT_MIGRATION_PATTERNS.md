# Component Migration Patterns - PrimeVue Conversion Guide

Quick reference guide for converting custom HTML elements to PrimeVue components.

---

## 🔘 Buttons

### Pattern 1: Basic Button

**Before:**

```vue
<button class="btn btn-primary" @click="handleClick">
  Click Me
</button>
```

**After:**

```vue
<Button label="Click Me" @click="handleClick" />
```

---

### Pattern 2: Button with Icon

**Before:**

```vue
<button class="btn btn-primary">
  <i class="icon-phone"></i>
  Call
</button>
```

**After:**

```vue
<Button label="Call" icon="pi pi-phone" />
```

---

### Pattern 3: Icon-Only Button

**Before:**

```vue
<button class="btn-icon" title="Settings">
  <svg>...</svg>
</button>
```

**After:**

```vue
<Button icon="pi pi-cog" v-tooltip="'Settings'" text rounded />
```

---

### Pattern 4: Button Severities

**Before:**

```vue
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-danger">Danger</button>
```

**After:**

```vue
<Button label="Primary" />
<!-- default is primary -->
<Button label="Secondary" severity="secondary" />
<Button label="Success" severity="success" />
<Button label="Danger" severity="danger" />
```

---

### Pattern 5: Loading State

**Before:**

```vue
<button :disabled="isLoading">
  {{ isLoading ? 'Loading...' : 'Submit' }}
</button>
```

**After:**

```vue
<Button label="Submit" :loading="isLoading" />
```

---

## 📝 Input Fields

### Pattern 1: Text Input

**Before:**

```vue
<input v-model="value" type="text" placeholder="Enter text" class="form-input" />
```

**After:**

```vue
<InputText v-model="value" placeholder="Enter text" />
```

---

### Pattern 2: Password Input

**Before:**

```vue
<input v-model="password" type="password" placeholder="Password" />
```

**After:**

```vue
<Password v-model="password" placeholder="Password" :feedback="false" toggleMask />
```

---

### Pattern 3: Number Input

**Before:**

```vue
<input v-model.number="count" type="number" min="0" max="100" />
```

**After:**

```vue
<InputNumber v-model="count" :min="0" :max="100" showButtons />
```

---

### Pattern 4: Textarea

**Before:**

```vue
<textarea v-model="message" rows="5" placeholder="Enter message"></textarea>
```

**After:**

```vue
<Textarea v-model="message" rows="5" placeholder="Enter message" autoResize />
```

---

## 📋 Dropdowns & Selects

### Pattern 1: Simple Select

**Before:**

```vue
<select v-model="selected">
  <option value="">Choose...</option>
  <option value="opt1">Option 1</option>
  <option value="opt2">Option 2</option>
</select>
```

**After:**

```vue
<Dropdown
  v-model="selected"
  :options="options"
  optionLabel="label"
  optionValue="value"
  placeholder="Choose..."
/>

<script setup>
const options = [
  { label: 'Option 1', value: 'opt1' },
  { label: 'Option 2', value: 'opt2' },
]
</script>
```

---

### Pattern 2: Select with Objects

**Before:**

```vue
<select v-model="selectedUser">
  <option v-for="user in users" :key="user.id" :value="user">
    {{ user.name }}
  </option>
</select>
```

**After:**

```vue
<Dropdown v-model="selectedUser" :options="users" optionLabel="name" placeholder="Select user" />
```

---

## ☑️ Checkboxes & Switches

### Pattern 1: Single Checkbox

**Before:**

```vue
<input type="checkbox" v-model="enabled" id="enable" />
<label for="enable">Enable feature</label>
```

**After:**

```vue
<Checkbox v-model="enabled" inputId="enable" binary />
<label for="enable">Enable feature</label>
```

---

### Pattern 2: Toggle Switch

**Before:**

```vue
<input type="checkbox" v-model="isActive" class="toggle" />
<label>Active</label>
```

**After:**

```vue
<InputSwitch v-model="isActive" />
<label>Active</label>
```

---

## 🎨 Icons

### Icon Mapping Reference

| Custom/SVG   | PrimeIcon                 | Usage                                      |
| ------------ | ------------------------- | ------------------------------------------ |
| Phone icon   | `pi-phone`                | `<i class="pi pi-phone" />`                |
| Microphone   | `pi-microphone`           | `<i class="pi pi-microphone" />`           |
| Video camera | `pi-video`                | `<i class="pi pi-video" />`                |
| Settings/Cog | `pi-cog`                  | `<i class="pi pi-cog" />`                  |
| User         | `pi-user`                 | `<i class="pi pi-user" />`                 |
| Check mark   | `pi-check`                | `<i class="pi pi-check" />`                |
| Close/X      | `pi-times`                | `<i class="pi pi-times" />`                |
| Trash/Delete | `pi-trash`                | `<i class="pi pi-trash" />`                |
| Edit/Pencil  | `pi-pencil`               | `<i class="pi pi-pencil" />`               |
| Search       | `pi-search`               | `<i class="pi pi-search" />`               |
| Download     | `pi-download`             | `<i class="pi pi-download" />`             |
| Upload       | `pi-upload`               | `<i class="pi pi-upload` />`               |
| Play         | `pi-play`                 | `<i class="pi pi-play" />`                 |
| Pause        | `pi-pause`                | `<i class="pi pi-pause" />`                |
| Stop         | `pi-stop`                 | `<i class="pi pi-stop" />`                 |
| Volume high  | `pi-volume-up`            | `<i class="pi pi-volume-up" />`            |
| Volume mute  | `pi-volume-off`           | `<i class="pi pi-volume-off" />`           |
| Calendar     | `pi-calendar`             | `<i class="pi pi-calendar" />`             |
| Clock        | `pi-clock`                | `<i class="pi pi-clock" />`                |
| Info         | `pi-info-circle`          | `<i class="pi pi-info-circle" />`          |
| Warning      | `pi-exclamation-triangle` | `<i class="pi pi-exclamation-triangle" />` |
| Error        | `pi-times-circle`         | `<i class="pi pi-times-circle" />`         |
| Success      | `pi-check-circle`         | `<i class="pi pi-check-circle" />`         |

**Full Icon List:** https://primevue.org/icons

---

## 💬 Dialogs & Notifications

### Pattern 1: Alert Dialog

**Before:**

```typescript
alert('Operation successful!')
```

**After:**

```vue
<template>
  <Toast />
</template>

<script setup>
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const showSuccess = () => {
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Operation successful!',
    life: 3000,
  })
}
</script>
```

---

### Pattern 2: Confirm Dialog

**Before:**

```typescript
if (confirm('Are you sure?')) {
  deleteItem()
}
```

**After:**

```vue
<template>
  <ConfirmDialog />
</template>

<script setup>
import { useConfirm } from 'primevue/useconfirm'

const confirm = useConfirm()

const confirmDelete = () => {
  confirm.require({
    message: 'Are you sure?',
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      deleteItem()
    },
  })
}
</script>
```

---

### Pattern 3: Modal Dialog

**Before:**

```vue
<div v-if="showModal" class="modal-overlay" @click="close">
  <div class="modal-content" @click.stop>
    <h2>Modal Title</h2>
    <p>Modal content...</p>
    <button @click="close">Close</button>
  </div>
</div>
```

**After:**

```vue
<Dialog v-model:visible="showModal" header="Modal Title" :modal="true" :style="{ width: '50vw' }">
  <p>Modal content...</p>
  <template #footer>
    <Button label="Close" @click="showModal = false" />
  </template>
</Dialog>
```

---

## 📊 Data Display

### Pattern 1: Simple Table

**Before:**

```vue
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="user in users" :key="user.id">
      <td>{{ user.name }}</td>
      <td>{{ user.email }}</td>
      <td>
        <button @click="editUser(user)">Edit</button>
      </td>
    </tr>
  </tbody>
</table>
```

**After:**

```vue
<DataTable :value="users" stripedRows>
  <Column field="name" header="Name" />
  <Column field="email" header="Email" />
  <Column header="Actions">
    <template #body="{ data }">
      <Button
        icon="pi pi-pencil"
        text
        rounded
        @click="editUser(data)"
      />
    </template>
  </Column>
</DataTable>
```

---

### Pattern 2: Card Layout

**Before:**

```vue
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
  </div>
  <div class="card-body">
    <p>Card content...</p>
  </div>
  <div class="card-footer">
    <button>Action</button>
  </div>
</div>
```

**After:**

```vue
<Card>
  <template #title>Card Title</template>
  <template #content>
    <p>Card content...</p>
  </template>
  <template #footer>
    <Button label="Action" />
  </template>
</Card>
```

---

## ⏳ Loading States

### Pattern 1: Spinner

**Before:**

```vue
<div v-if="loading" class="spinner">
  Loading...
</div>
```

**After:**

```vue
<ProgressSpinner v-if="loading" />
```

---

### Pattern 2: Progress Bar

**Before:**

```vue
<div class="progress-bar">
  <div
    class="progress-fill"
    :style="{ width: progress + '%' }"
  ></div>
</div>
```

**After:**

```vue
<ProgressBar :value="progress" />
```

---

### Pattern 3: Skeleton Loader

**Before:**

```vue
<div v-if="loading" class="skeleton">
  <div class="skeleton-line"></div>
  <div class="skeleton-line"></div>
</div>
```

**After:**

```vue
<Skeleton v-if="loading" height="2rem" class="mb-2" />
<Skeleton v-if="loading" height="2rem" />
```

---

## 🏷️ Tags & Badges

### Pattern 1: Status Badge

**Before:**

```vue
<span class="badge badge-success">Active</span>
<span class="badge badge-danger">Inactive</span>
```

**After:**

```vue
<Tag value="Active" severity="success" />
<Tag value="Inactive" severity="danger" />
```

---

### Pattern 2: Notification Badge

**Before:**

```vue
<button class="relative">
  <i class="icon-bell"></i>
  <span class="notification-count">3</span>
</button>
```

**After:**

```vue
<Button icon="pi pi-bell" text rounded>
  <Badge :value="3" severity="danger" />
</Button>
```

---

## 🎯 Common Import Pattern

**Before (Multiple Imports):**

```vue
<script setup>
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
</script>
```

**After (Shared Components):**

```vue
<script setup>
import { Button, InputText, Dropdown, Toast, useToast } from './shared-components'
</script>
```

---

## ✅ Migration Checklist

For each component migration:

- [ ] Replace custom HTML elements with PrimeVue components
- [ ] Convert inline SVG icons to PrimeIcons
- [ ] Remove custom CSS classes (btn, form-input, etc.)
- [ ] Update imports to use shared-components.ts
- [ ] Test in both light and dark themes
- [ ] Verify keyboard navigation works
- [ ] Check accessibility with screen reader
- [ ] Ensure touch targets are ≥44px
- [ ] Test responsive behavior
- [ ] Remove unused custom CSS

---

**Last Updated:** 2025-12-22
**Related:** PHASE_1_MIGRATION_GUIDE.md
