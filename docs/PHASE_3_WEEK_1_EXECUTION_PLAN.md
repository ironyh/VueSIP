# Phase 3 Week 1: Execution Plan

## Tier 1 + Tier 2 Demos (15 Total)

**Timeline:** Days 1-7
**Target:** 15 demos migrated
**Expected Effort:** 39-69 hours
**Velocity Target:** 50% faster than Phase 2 through pattern reuse

---

## 📅 Day 1: Tier 1 Simple Demos (Batch 1 - 3 demos)

### Morning Session (4-6 hours)

#### 1. CallTimerDemo.vue (559 lines) - 2-4 hours

**Estimated Components:**

- Button (start/stop/pause timer)
- Message (status display)
- Simple timer display

**Migration Pattern:**

```vue
<template>
  <!-- Status messages -->
  <Message severity="info">...</Message>

  <!-- Timer controls -->
  <Button @click="startTimer">Start</Button>
  <Button @click="stopTimer" severity="danger">Stop</Button>
  <Button @click="pauseTimer" severity="secondary">Pause</Button>
</template>

<script setup>
import { Button, Message } from './shared-components'
</script>

<style scoped>
/* Remove: .btn, .btn-primary, .btn-danger, .status-message */
/* Add: .mb-3, .w-full */
</style>
```

**Checklist:**

- [ ] Update imports to shared-components
- [ ] Replace buttons with PrimeVue Button
- [ ] Replace status messages with Message component
- [ ] Clean up CSS (remove .btn\*, .status-message)
- [ ] Add utility classes
- [ ] Run ESLint --fix
- [ ] Test timer functionality
- [ ] Verify theme compatibility

---

#### 2. ContactsDemo.vue (610 lines) - 2-4 hours

**Estimated Components:**

- DataTable (contact list)
- InputText (search)
- Button (actions)
- Message (status)

**Migration Pattern:**

```vue
<template>
  <!-- Search -->
  <InputText v-model="searchQuery" placeholder="Search contacts" class="w-full mb-3" />

  <!-- Contact list -->
  <DataTable :value="filteredContacts">
    <Column field="name" header="Name" sortable />
    <Column field="number" header="Number" />
    <Column>
      <template #body="slotProps">
        <Button @click="callContact(slotProps.data)" size="small">Call</Button>
      </template>
    </Column>
  </DataTable>
</template>

<script setup>
import { Button, InputText, DataTable, Column, Message } from './shared-components'
</script>
```

**Checklist:**

- [ ] Update imports
- [ ] Replace search input with InputText
- [ ] Convert contact table to DataTable
- [ ] Replace action buttons
- [ ] Clean up CSS
- [ ] Run ESLint --fix
- [ ] Test search/filter
- [ ] Verify sorting works

---

#### 3. CallbackDemo.vue (628 lines) - 2-4 hours

**Estimated Components:**

- InputText (callback number, time)
- Button (schedule callback)
- Message (confirmation)
- Calendar (optional date picker)

**Migration Pattern:**

```vue
<template>
  <Message severity="info" class="mb-3">Schedule a callback</Message>

  <div class="flex flex-column gap-3">
    <InputText v-model="callbackNumber" placeholder="Phone number" class="w-full" />
    <InputText v-model="callbackTime" placeholder="Time" class="w-full" />
    <Button @click="scheduleCallback" :disabled="!isValid">Schedule Callback</Button>
  </div>

  <Message v-if="scheduled" severity="success" class="mt-3">Callback scheduled!</Message>
</template>

<script setup>
import { Button, InputText, Message } from './shared-components'
</script>
```

**Checklist:**

- [ ] Update imports
- [ ] Replace inputs with InputText
- [ ] Replace buttons with Button
- [ ] Replace status messages with Message
- [ ] Clean up CSS
- [ ] Run ESLint --fix
- [ ] Test callback scheduling
- [ ] Verify validation

---

## 📅 Day 2: Tier 1 Simple Demos (Batch 2 - 3 demos)

### Morning Session (4-6 hours)

#### 4. PagingDemo.vue (665 lines) - 2-4 hours

**Estimated Components:**

- Button (paging controls)
- Dropdown (zone selection)
- InputText (announcement text)
- Message (status)

**Migration Pattern:**

```vue
<template>
  <div class="flex flex-column gap-3">
    <Dropdown
      v-model="selectedZone"
      :options="zones"
      optionLabel="name"
      placeholder="Select zone"
    />
    <InputText v-model="announcement" placeholder="Announcement message" class="w-full" />
    <Button @click="sendPage" :disabled="!canSendPage">Send Page</Button>
  </div>
</template>

<script setup>
import { Button, InputText, Dropdown, Message } from './shared-components'
</script>
```

**Checklist:**

- [ ] Update imports
- [ ] Replace zone selector with Dropdown
- [ ] Replace inputs with InputText
- [ ] Replace buttons with Button
- [ ] Clean up CSS
- [ ] Run ESLint --fix
- [ ] Test paging functionality

---

#### 5. VoicemailDemo.vue (681 lines) - 2-4 hours

**Estimated Components:**

- DataTable (message list)
- Button (play, delete actions)
- Message (status)
- Tag (unread badges)

**Migration Pattern:**

```vue
<template>
  <DataTable :value="voicemails">
    <Column field="from" header="From" />
    <Column field="date" header="Date" />
    <Column field="duration" header="Duration" />
    <Column>
      <template #body="slotProps">
        <Tag v-if="slotProps.data.unread" severity="info">New</Tag>
      </template>
    </Column>
    <Column>
      <template #body="slotProps">
        <Button @click="playMessage(slotProps.data)" size="small">Play</Button>
        <Button @click="deleteMessage(slotProps.data)" size="small" severity="danger"
          >Delete</Button
        >
      </template>
    </Column>
  </DataTable>
</template>

<script setup>
import { Button, DataTable, Column, Tag, Message } from './shared-components'
</script>
```

**Checklist:**

- [ ] Update imports
- [ ] Convert message list to DataTable
- [ ] Replace action buttons
- [ ] Add Tag for unread badges
- [ ] Clean up CSS
- [ ] Run ESLint --fix
- [ ] Test playback controls

---

#### 6. ParkingDemo.vue (693 lines) - 2-4 hours

**Estimated Components:**

- Card (parking slot display)
- Button (park, retrieve)
- Badge (occupied status)
- Message (status)

**Migration Pattern:**

```vue
<template>
  <div class="parking-slots grid">
    <Card v-for="slot in parkingSlots" :key="slot.id" class="parking-slot">
      <template #title>Slot {{ slot.number }}</template>
      <template #content>
        <Badge v-if="slot.occupied" :value="slot.callerName" severity="success" />
        <span v-else>Available</span>
      </template>
      <template #footer>
        <Button v-if="!slot.occupied" @click="parkCall(slot)" size="small">Park Here</Button>
        <Button v-else @click="retrieveCall(slot)" size="small" severity="secondary"
          >Retrieve</Button
        >
      </template>
    </Card>
  </div>
</template>

<script setup>
import { Button, Card, Badge, Message } from './shared-components'
</script>
```

**Checklist:**

- [ ] Update imports
- [ ] Convert parking slots to Cards
- [ ] Add Badge for occupied status
- [ ] Replace buttons with Button
- [ ] Clean up CSS
- [ ] Run ESLint --fix
- [ ] Test park/retrieve

---

## 📅 Days 3-5: Tier 2 Low-Medium Demos (9 demos)

### Day 3: Morning + Afternoon (3 demos, 9-15 hours)

#### 7. SpeedDialDemo.vue (740 lines) - 3-5 hours

**Components:** Button grid, InputText, Dropdown, Message
**Focus:** Speed dial button layout, contact assignment

#### 8. TimeConditionsDemo.vue (786 lines) - 3-5 hours

**Components:** DataTable, Calendar, InputText, Dropdown, Button
**Focus:** Schedule configuration, time-based rules

#### 9. DoNotDisturbDemo.vue (795 lines) - 3-5 hours

**Components:** InputSwitch, Calendar, InputText, Button, Message
**Focus:** DND toggle, schedule configuration

---

### Day 4: Morning + Afternoon (3 demos, 9-15 hours)

#### 10. WebRTCStatsDemo.vue (830 lines) - 3-5 hours

**Components:** DataTable, Card, ProgressBar, Message
**Focus:** Real-time statistics display, data visualization

#### 11. CustomRingtonesDemo.vue (831 lines) - 3-5 hours

**Components:** FileUpload, DataTable, Button, Message
**Focus:** File upload, audio preview, assignment

#### 12. BlacklistDemo.vue (853 lines) - 3-5 hours

**Components:** DataTable, InputText, Button, Dialog, Message
**Focus:** Number management, CRUD operations

---

### Day 5: Morning + Afternoon (3 demos, 9-15 hours)

#### 13. CDRDashboardDemo.vue (862 lines) - 3-5 hours

**Components:** DataTable, Card, Chart (if needed), Calendar
**Focus:** Dashboard layout, call detail records

#### 14. SupervisorDemo.vue (894 lines) - 3-5 hours

**Components:** DataTable, Button, Badge, Card, Message
**Focus:** Agent monitoring, supervisor controls

#### 15. PresenceDemo.vue (904 lines) - 3-5 hours

**Components:** DataTable, Dropdown, Badge, Button, Message
**Focus:** Presence status, BLF integration

---

## 📊 Week 1 Success Metrics

### Daily Targets

| Day | Demos | Hours | Cumulative |
| --- | ----- | ----- | ---------- |
| 1   | 3     | 6-12  | 3 (20%)    |
| 2   | 3     | 6-12  | 6 (40%)    |
| 3   | 3     | 9-15  | 9 (60%)    |
| 4   | 3     | 9-15  | 12 (80%)   |
| 5   | 3     | 9-15  | 15 (100%)  |

### Quality Gates (Per Demo)

- [ ] ESLint: 0 errors, 0 warnings
- [ ] Theme: Light and dark both working
- [ ] Accessibility: ARIA preserved, keyboard nav working
- [ ] Functionality: All features working as before
- [ ] Visual: Layout matches or improves original

---

## 🛠️ Tools & Quick Reference

### Import Template

```typescript
import {
  Button,
  InputText,
  Dropdown,
  DataTable,
  Column,
  Card,
  Message,
  Badge,
  Tag,
  Calendar,
  FileUpload,
  InputSwitch,
  Checkbox,
  Dialog,
  // ... add as needed
} from './shared-components'
```

### CSS Cleanup Checklist

**Remove:**

- [ ] `.btn`, `.btn-*` (all button classes)
- [ ] `.form-group`, `.form-*` (all form classes)
- [ ] `.status-message`, `.status-*` (all status classes)
- [ ] `button` element styles
- [ ] `input` element styles

**Add:**

- [ ] `.w-full { width: 100%; }`
- [ ] `.flex-1 { flex: 1; }`
- [ ] `.mb-3 { margin-bottom: 1rem; }`
- [ ] `.mt-2 { margin-top: 0.5rem; }`
- [ ] `:deep()` selectors as needed

### ESLint Commands

```bash
# Check single demo
pnpm lint -- playground/demos/CallTimerDemo.vue

# Auto-fix issues
pnpm lint -- playground/demos/CallTimerDemo.vue --fix

# Check multiple demos
pnpm lint -- playground/demos/{CallTimer,Contacts,Callback}Demo.vue
```

---

## 🎯 Week 1 Completion Criteria

Week 1 will be considered successful when:

1. ✅ All 15 demos (Tier 1 + Tier 2) migrated
2. ✅ All 15 demos pass ESLint (0 errors)
3. ✅ All 15 demos tested in light/dark themes
4. ✅ All functionality preserved
5. ✅ Velocity metrics documented for Week 2 planning
6. ✅ Any pattern improvements identified and documented

---

## 📈 Progress Tracking

### Tier 1 Progress (6 demos)

- [ ] CallTimerDemo.vue
- [ ] ContactsDemo.vue
- [ ] CallbackDemo.vue
- [ ] PagingDemo.vue
- [ ] VoicemailDemo.vue
- [ ] ParkingDemo.vue

### Tier 2 Progress (9 demos)

- [ ] SpeedDialDemo.vue
- [ ] TimeConditionsDemo.vue
- [ ] DoNotDisturbDemo.vue
- [ ] WebRTCStatsDemo.vue
- [ ] CustomRingtonesDemo.vue
- [ ] BlacklistDemo.vue
- [ ] CDRDashboardDemo.vue
- [ ] SupervisorDemo.vue
- [ ] PresenceDemo.vue

---

**Week 1 Start:** Ready to begin!
**Expected Completion:** Day 5 end
**Next:** Week 2 - Tier 3 Medium Complexity (9 demos)

---

_Let's start with CallTimerDemo.vue!_ 🚀
