# Phase 2: Core Migration - High-Traffic Demos

**Status:** 🔄 In Progress
**Duration:** Week 3-4 (2-3 weeks)
**Priority:** 🟡 HIGH
**Estimated Effort:** 40-60 hours

---

## 🎯 Phase 2 Objectives

Migrate 8 high-traffic playground demos to PrimeVue, building on the solid foundation established in Phase 1.

**Success Criteria:**

- ✅ All 8 demos use PrimeVue components exclusively
- ✅ Zero hard-coded colors (validated by ESLint)
- ✅ Full WCAG 2.1 AA accessibility compliance
- ✅ Light and dark themes work flawlessly
- ✅ All demos pass ESLint with 0 errors
- ✅ Maintain or improve existing functionality

---

## 📋 Priority Demos (8 Total)

### Tier 1: Core Communication (High Priority)

#### 1. VideoCallDemo.vue 📹

**Complexity:** High
**Estimated Effort:** 8-10 hours
**Key Features:**

- Video controls and preview
- Camera/microphone selection
- Video quality indicators
- Screen sharing controls

**Migration Checklist:**

- [ ] Replace custom buttons with PrimeVue Button
- [ ] Replace custom dropdowns with PrimeVue Dropdown
- [ ] Convert video controls to PrimeVue components
- [ ] Replace icons with PrimeIcons
- [ ] Remove all hard-coded colors
- [ ] Test video functionality
- [ ] Verify accessibility (ARIA, keyboard nav)
- [ ] Test light/dark themes

**PrimeVue Components Needed:**

- Button, Dropdown, Card, Panel, Message, InputSwitch, Badge, Tag

---

#### 2. AudioDevicesDemo.vue 🎤

**Complexity:** Medium
**Estimated Effort:** 5-7 hours
**Key Features:**

- Audio device enumeration
- Device selection dropdowns
- Volume controls
- Audio level indicators

**Migration Checklist:**

- [ ] Replace custom dropdowns with PrimeVue Dropdown
- [ ] Replace custom sliders with PrimeVue Slider
- [ ] Convert audio level meters to PrimeVue ProgressBar
- [ ] Replace icons with PrimeIcons
- [ ] Remove all hard-coded colors
- [ ] Test audio device switching
- [ ] Verify accessibility
- [ ] Test light/dark themes

**PrimeVue Components Needed:**

- Dropdown, Slider, ProgressBar, Card, Message, Button, Badge

---

#### 3. CallHistoryDemo.vue 📞

**Complexity:** Medium-High
**Estimated Effort:** 6-8 hours
**Key Features:**

- Call log display
- Filtering and sorting
- Call type badges
- Timestamp formatting

**Migration Checklist:**

- [ ] Replace custom table with PrimeVue DataTable
- [ ] Convert filters to PrimeVue Dropdown
- [ ] Replace badges with PrimeVue Tag/Badge
- [ ] Replace icons with PrimeIcons
- [ ] Remove all hard-coded colors
- [ ] Test filtering functionality
- [ ] Verify accessibility
- [ ] Test light/dark themes

**PrimeVue Components Needed:**

- DataTable, Column, Dropdown, Tag, Badge, Card, Button, Calendar

---

#### 4. DTMFDemo.vue ☎️

**Complexity:** Low-Medium
**Estimated Effort:** 4-6 hours
**Key Features:**

- Dial pad interface
- DTMF tone controls
- Input validation

**Migration Checklist:**

- [ ] Replace custom dial pad buttons with PrimeVue Button
- [ ] Convert input fields to PrimeVue InputText
- [ ] Replace icons with PrimeIcons
- [ ] Remove all hard-coded colors
- [ ] Test DTMF functionality
- [ ] Verify accessibility (keyboard entry)
- [ ] Test light/dark themes

**PrimeVue Components Needed:**

- Button, InputText, Card, Message

---

### Tier 2: Advanced Features (Medium Priority)

#### 5. MultiLineDemo.vue 📱

**Complexity:** High
**Estimated Effort:** 8-10 hours
**Key Features:**

- Multiple call line management
- Line switching
- Call parking
- Status indicators

**Migration Checklist:**

- [ ] Replace custom line cards with PrimeVue Card
- [ ] Convert buttons to PrimeVue Button
- [ ] Replace status badges with PrimeVue Badge/Tag
- [ ] Replace icons with PrimeIcons
- [ ] Remove all hard-coded colors
- [ ] Test multi-line functionality
- [ ] Verify accessibility
- [ ] Test light/dark themes

**PrimeVue Components Needed:**

- Card, Button, Badge, Tag, Divider, Panel, Message

---

#### 6. CallTransferDemo.vue 🔄

**Complexity:** Medium-High
**Estimated Effort:** 6-8 hours
**Key Features:**

- Transfer type selection
- Contact selection
- Transfer controls
- Status feedback

**Migration Checklist:**

- [ ] Replace custom dropdowns with PrimeVue Dropdown
- [ ] Convert buttons to PrimeVue Button
- [ ] Replace status messages with PrimeVue Message
- [ ] Replace icons with PrimeIcons
- [ ] Remove all hard-coded colors
- [ ] Test transfer functionality
- [ ] Verify accessibility
- [ ] Test light/dark themes

**PrimeVue Components Needed:**

- Dropdown, Button, Card, Message, RadioButton, InputText

---

#### 7. ConferenceCallDemo.vue 👥

**Complexity:** High
**Estimated Effort:** 8-10 hours
**Key Features:**

- Participant management
- Conference controls
- Participant list
- Mute/unmute participants

**Migration Checklist:**

- [ ] Replace custom participant list with PrimeVue DataTable
- [ ] Convert controls to PrimeVue Button
- [ ] Replace status indicators with PrimeVue Badge
- [ ] Replace icons with PrimeIcons
- [ ] Remove all hard-coded colors
- [ ] Test conference functionality
- [ ] Verify accessibility
- [ ] Test light/dark themes

**PrimeVue Components Needed:**

- DataTable, Column, Button, Badge, Card, Message, Avatar, AvatarGroup

---

#### 8. SettingsDemo.vue ⚙️

**Complexity:** Medium
**Estimated Effort:** 5-7 hours
**Key Features:**

- Settings categories
- Form controls
- Validation
- Save/reset controls

**Migration Checklist:**

- [ ] Replace custom inputs with PrimeVue InputText
- [ ] Convert dropdowns to PrimeVue Dropdown
- [ ] Replace checkboxes with PrimeVue Checkbox
- [ ] Replace sliders with PrimeVue Slider
- [ ] Replace icons with PrimeIcons
- [ ] Remove all hard-coded colors
- [ ] Test settings persistence
- [ ] Verify accessibility
- [ ] Test light/dark themes

**PrimeVue Components Needed:**

- InputText, Dropdown, Checkbox, InputSwitch, Slider, Button, Card, Panel, Accordion, AccordionTab

---

## 🛠️ Migration Process

### For Each Demo:

**1. Preparation (5-10 min)**

- [ ] Read current implementation
- [ ] Identify all custom HTML elements
- [ ] List required PrimeVue components
- [ ] Plan conversion strategy

**2. Import Conversion (5 min)**

- [ ] Update imports to use `shared-components.ts`
- [ ] Add any additional component imports needed

**3. Template Migration (30-60 min)**

- [ ] Replace buttons with PrimeVue Button
- [ ] Replace inputs with PrimeVue InputText/Password/etc.
- [ ] Replace dropdowns with PrimeVue Dropdown
- [ ] Replace checkboxes with PrimeVue Checkbox
- [ ] Replace icons with PrimeIcons
- [ ] Replace tables with PrimeVue DataTable (if applicable)
- [ ] Replace cards with PrimeVue Card
- [ ] Replace dialogs with PrimeVue Dialog/Toast

**4. Style Cleanup (15-30 min)**

- [ ] Remove custom CSS classes (btn, form-input, etc.)
- [ ] Replace hard-coded colors with CSS variables
- [ ] Remove unused styles
- [ ] Ensure theme compatibility

**5. Functionality Testing (20-30 min)**

- [ ] Test all interactive features
- [ ] Verify event handlers work
- [ ] Test edge cases
- [ ] Check error handling

**6. Accessibility Validation (15-20 min)**

- [ ] Verify ARIA attributes
- [ ] Test keyboard navigation
- [ ] Check focus indicators
- [ ] Test with screen reader (optional but recommended)

**7. Theme Testing (10 min)**

- [ ] Test in light mode
- [ ] Test in dark mode
- [ ] Verify smooth theme switching
- [ ] Check color contrast

**8. ESLint Validation (5 min)**

- [ ] Run `pnpm lint -- playground/demos/[DemoName].vue`
- [ ] Fix any errors
- [ ] Verify 0 errors, 0 warnings

---

## 📊 Progress Tracking

| Demo                   | Status     | Complexity  | Effort     | Completion | Assignee |
| ---------------------- | ---------- | ----------- | ---------- | ---------- | -------- |
| VideoCallDemo.vue      | 📝 Pending | High        | 8-10h      | 0%         | -        |
| AudioDevicesDemo.vue   | 📝 Pending | Medium      | 5-7h       | 0%         | -        |
| CallHistoryDemo.vue    | 📝 Pending | Medium-High | 6-8h       | 0%         | -        |
| DTMFDemo.vue           | 📝 Pending | Low-Medium  | 4-6h       | 0%         | -        |
| MultiLineDemo.vue      | 📝 Pending | High        | 8-10h      | 0%         | -        |
| CallTransferDemo.vue   | 📝 Pending | Medium-High | 6-8h       | 0%         | -        |
| ConferenceCallDemo.vue | 📝 Pending | High        | 8-10h      | 0%         | -        |
| SettingsDemo.vue       | 📝 Pending | Medium      | 5-7h       | 0%         | -        |
| **TOTAL**              | **0/8**    | **-**       | **50-66h** | **0%**     | **-**    |

---

## 🎯 Quick Reference

### Common Patterns

**Button Migration:**

```vue
<!-- Before -->
<button class="btn btn-primary" @click="handleClick">Click Me</button>

<!-- After -->
<Button label="Click Me" @click="handleClick" />
```

**Input Migration:**

```vue
<!-- Before -->
<input v-model="value" type="text" placeholder="Enter text" />

<!-- After -->
<InputText v-model="value" placeholder="Enter text" />
```

**Dropdown Migration:**

```vue
<!-- Before -->
<select v-model="selected">
  <option value="opt1">Option 1</option>
  <option value="opt2">Option 2</option>
</select>

<!-- After -->
<Dropdown
  v-model="selected"
  :options="options"
  optionLabel="label"
  optionValue="value"
  placeholder="Select an option"
/>
```

**Icon Migration:**

```vue
<!-- Before -->
<svg>...</svg>

<!-- After -->
<i class="pi pi-[icon-name]" />
```

### Import Pattern

```typescript
// Always use shared-components.ts
import {
  Button,
  InputText,
  Dropdown,
  Card,
  Message,
  // ... other components
} from '../shared-components'
```

---

## 🧪 Testing Checklist

For each migrated demo:

### Functional Testing

- [ ] All features work as before
- [ ] Event handlers fire correctly
- [ ] Data binding works
- [ ] Error handling intact
- [ ] Edge cases handled

### Visual Testing

- [ ] Layout matches original (or improves it)
- [ ] Spacing and alignment correct
- [ ] Icons render correctly
- [ ] Responsive behavior maintained

### Accessibility Testing

- [ ] ARIA attributes present
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible
- [ ] Touch targets ≥44px

### Theme Testing

- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] Theme switching is smooth
- [ ] Color contrast meets WCAG AA
- [ ] No layout shift on theme change

### Code Quality

- [ ] ESLint passes (0 errors)
- [ ] No hard-coded colors
- [ ] Uses shared-components.ts
- [ ] TypeScript types correct
- [ ] No console errors

---

## 📈 Success Metrics

### Quantitative Goals

| Metric            | Target | Current        | Status     |
| ----------------- | ------ | -------------- | ---------- |
| Demos migrated    | 8/8    | 0/8            | 📝 Pending |
| PrimeVue adoption | 100%   | Unknown        | 📝 Pending |
| Hard-coded colors | 0      | ~150 remaining | 📝 Pending |
| ESLint pass rate  | 100%   | Unknown        | 📝 Pending |
| WCAG compliance   | AA     | Unknown        | 📝 Pending |

### Qualitative Goals

- [ ] Consistent UI/UX across all demos
- [ ] Improved accessibility
- [ ] Better theme integration
- [ ] Cleaner, more maintainable code
- [ ] Enhanced developer experience

---

## 🚧 Known Challenges

### Complex Components

- VideoCallDemo: Video player integration with PrimeVue
- ConferenceCallDemo: Participant list management
- MultiLineDemo: Complex state management across lines

### Solutions

1. Use PrimeVue DataTable for complex lists
2. Use Card components for logical grouping
3. Leverage PrimeVue's built-in accessibility features
4. Consult Phase 1 patterns for guidance

---

## 🔗 Resources

### Documentation

- [Component Migration Patterns](/docs/COMPONENT_MIGRATION_PATTERNS.md)
- [Phase 1 Migration Guide](/docs/PHASE_1_MIGRATION_GUIDE.md)
- [PrimeVue Documentation](https://primevue.org/)
- [PrimeIcons Catalog](https://primevue.org/icons)

### Tools

- `/playground/demos/shared-components.ts` - Centralized imports
- `/scripts/fix-hardcoded-colors.sh` - Color replacement automation
- ESLint rules - Hard-coded color prevention
- Pre-commit hooks - Automated validation

### Reference

- BasicCallDemo.vue - Completed reference example
- Phase 1 Completion Summary - Foundation achievements

---

## 📅 Timeline

### Week 3 (Days 1-5)

- **Days 1-2:** VideoCallDemo.vue + AudioDevicesDemo.vue
- **Days 3-4:** CallHistoryDemo.vue + DTMFDemo.vue
- **Day 5:** Review and testing

### Week 4 (Days 1-5)

- **Days 1-2:** MultiLineDemo.vue + CallTransferDemo.vue
- **Days 3-4:** ConferenceCallDemo.vue + SettingsDemo.vue
- **Day 5:** Final review, testing, and documentation

### Buffer

- Additional 2-3 days for unexpected issues or polish

---

## 🎯 Phase 2 Completion Criteria

Phase 2 will be considered complete when:

1. ✅ All 8 priority demos migrated to PrimeVue
2. ✅ Zero hard-coded colors (ESLint validation)
3. ✅ 100% ESLint pass rate across all demos
4. ✅ WCAG 2.1 AA accessibility compliance
5. ✅ Light and dark themes working perfectly
6. ✅ All functionality preserved or improved
7. ✅ Documentation updated
8. ✅ Team trained on patterns

---

## 🚀 After Phase 2

### Phase 3 Preview: Remaining Demos (36 demos)

**Timeline:** Week 5-7 (3-4 weeks)
**Estimated Effort:** 80-120 hours

With 8 core demos complete and patterns well-established, Phase 3 should be significantly faster (40-50% speed improvement expected).

---

**Phase 2 Start Date:** 2025-12-22
**Estimated Completion:** 2026-01-05 (2-3 weeks)
**Confidence Level:** High (90%+)

---

_Ready to begin Phase 2 migration!_
