# VueSIP Accessibility Guidelines

This document outlines the accessibility standards and best practices for the VueSIP project, ensuring compliance with WCAG 2.1 AA standards.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Component Requirements](#component-requirements)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Screen Reader Support](#screen-reader-support)
5. [Focus Management](#focus-management)
6. [Color and Contrast](#color-and-contrast)
7. [Responsive Design](#responsive-design)
8. [Testing and Validation](#testing-and-validation)
9. [Component Patterns](#component-patterns)
10. [Checklist](#checklist)

## Core Principles

### 1. Perceivable

- All information must be presentable in ways users can perceive
- Provide text alternatives for non-text content
- Ensure sufficient color contrast (minimum 4.5:1)
- Make content adaptable without losing information

### 2. Operable

- Interface must be operable by all users
- Provide sufficient time for all interactions
- Avoid seizures and physical reactions
- Provide keyboard navigation for all functionality
- Provide clear instructions and feedback

### 3. Understandable

- Information and UI operation must be understandable
- Text content must be readable
- UI must be predictable and consistent

### 4. Robust

- Content must be robust enough for various assistive technologies
- Ensure compatibility with current and future technologies

## Component Requirements

### All Components Must Include:

#### ARIA Attributes

- **Interactive Elements**: Buttons, links, and form controls must have appropriate `role` attributes
- **Labels**: All form elements must have associated `aria-label` or `aria-labelledby`
- **States**: Indicate loading, disabled, or error states with `aria-busy`, `aria-disabled`
- **Regions**: Use `role="region"` for major page sections with `aria-label`

#### Keyboard Support

- **Tab Order**: Logical tab order through all interactive elements
- **Focus Indicators**: Visible focus indicators for keyboard users
- **Activation**: Support Enter and Space keys for button activation
- **Escape**: Support Escape key for modal dismissal

#### Semantic HTML

- **Proper Elements**: Use semantic HTML5 elements (`nav`, `main`, `button`, etc.)
- **Heading Structure**: Logical heading hierarchy (h1 → h2 → h3, etc.)
- **Labels**: Associated `<label>` elements for all form inputs

## Keyboard Navigation

### Requirements:

- All interactive elements must be keyboard accessible
- Tab order must follow logical reading order
- Focus must be visible and well-managed
- Keyboard traps for modals and dialogs

### Implementation Patterns:

```vue
<template>
  <button
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleKeyClick"
    @keydown.space="handleKeyClick"
    :aria-label="label"
  >
    {{ label }}
  </button>
</template>

<script setup>
const handleKeyClick = (event: KeyboardEvent) => {
  event.preventDefault()
  handleClick()
}
</script>
```

## Screen Reader Support

### ARIA Patterns:

#### Buttons

```vue
<button role="button" aria-label="Submit form" aria-pressed="false" @click="handleSubmit">
  Submit
</button>
```

#### Dialogs

```vue
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-content"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-content">Are you sure you want to proceed?</p>
</div>
```

#### Progress Indicators

```vue
<div
  role="progressbar"
  aria-valuenow="75"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuetext="75% complete"
>
  75%
</div>
```

#### Lists and Navigation

```vue
<nav role="navigation" aria-label="Main navigation">
  <ul role="list">
    <li role="none">
      <button 
        role="tab"
        :aria-selected="isActive"
        :aria-controls="'panel-' + id"
      >
        Tab Title
      </button>
    </li>
  </ul>
</nav>
```

## Focus Management

### Guidelines:

- Visible focus indicators for keyboard navigation
- Logical tab order through interactive elements
- Focus trapping for modals and dialogs
- Return focus to origin after modal dismissal

### Implementation:

```vue
<script setup>
import { focusManager } from '@/utils/accessibility'

const trapFocus = () => {
  const container = ref(null)
  const cleanup = focusManager.trapFocus(container.value)

  onUnmounted(() => {
    if (cleanup) cleanup()
  })
}
</script>
```

## Color and Contrast

### Requirements:

- Minimum contrast ratio of 4.5:1 for normal text
- Minimum contrast ratio of 3:1 for large text (18pt+)
- Sufficient contrast for interactive elements
- Avoid color-only information encoding

### Testing:

- Use automated tools like axe DevTools or WAVE
- Manual testing with high contrast mode
- Testing with color vision deficiency simulations

## Responsive Design

### Accessibility Considerations:

- Touch targets minimum 48×48 pixels
- Responsive text that scales properly
- Avoid horizontal scrolling on mobile
- Ensure usability across all device sizes

### Implementation:

```css
.button {
  min-height: 48px;
  min-width: 48px;
  /* Ensure proper touch target size */
}

@media (max-width: 768px) {
  .button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

## Testing and Validation

### Automated Testing:

- **ESLint Accessibility Plugin**: `eslint-plugin-jsx-a11y`
- **Pa11y Automated Testing**: Regular accessibility scans
- **axe DevTools**: Browser extension for real-time testing

### Manual Testing:

- **Keyboard Navigation**: Tab through all interactive elements
- **Screen Reader Testing**: Use NVDA, JAWS, or VoiceOver
- **Focus Testing**: Verify focus indicators and management
- **Color Testing**: Check contrast and color compliance

### User Testing:

- Include users with disabilities in testing
- Conduct regular accessibility audits
- Gather feedback and iterate

## Component Patterns

### 1. Accessible Button

```vue
<template>
  <button
    :type="htmlType"
    :disabled="disabled"
    :aria-label="ariaLabel || label"
    :aria-busy="loading"
    @click="handleClick"
    @keydown.enter.prevent="handleKeyClick"
    @keydown.space.prevent="handleKeyClick"
    class="accessible-button"
  >
    <span v-if="loading" class="spinner" aria-hidden="true"></span>
    <span class="label">{{ label }}</span>
  </button>
</template>

<style scoped>
.accessible-button {
  min-height: 48px;
  min-width: 48px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s ease;
}

.accessible-button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>
```

### 2. Accessible Modal/Dialog

```vue
<template>
  <div
    v-if="visible"
    class="modal"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="modalId"
    :aria-describedby="modalContentId"
    @keydown.esc="handleClose"
    @keydown.enter="handleSubmit"
  >
    <div class="modal-content" role="document">
      <h2 :id="modalId">Modal Title</h2>
      <div :id="modalContentId">
        <p>Modal content goes here</p>
      </div>
      <div class="modal-actions">
        <button @click="handleClose" aria-label="Cancel">Cancel</button>
        <button @click="handleSubmit" aria-label="Confirm">Confirm</button>
      </div>
    </div>
  </div>
</template>
```

### 3. Accessible Form

```vue
<template>
  <form @submit="handleSubmit">
    <div class="form-group">
      <label for="email">Email Address</label>
      <input
        id="email"
        type="email"
        v-model="email"
        aria-required="true"
        aria-invalid="!!emailError"
        aria-describedby="email-error"
      />
      <span v-if="emailError" id="email-error" class="error" role="alert">
        {{ emailError }}
      </span>
    </div>
    <button type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? 'Submitting...' : 'Submit' }}
    </button>
  </form>
</template>
```

## Checklist

### Before Launch:

- [ ] All interactive elements are keyboard accessible
- [ ] Proper ARIA labels and roles are implemented
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus is managed correctly
- [ ] Screen reader compatibility is tested
- [ ] Responsive design works across all devices
- [ ] Form inputs have proper labels
- [ ] Images have alt text
- [ ] Videos have captions and transcripts

### Regular Maintenance:

- [ ] Accessibility tests are run in CI/CD
- [ ] Regular manual accessibility audits
- [ ] Update accessibility when adding new features
- [ ] Monitor accessibility tools and plugins
- [ ] Train developers on accessibility best practices

## Resources

### Documentation:

- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Tools:

- [axe DevTools](https://www.deque.com/axe/)
- [WAVE Web Accessibility Tool](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Libraries:

- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [eslint-plugin-vuejs-accessibility](https://github.com/vue-a11y/eslint-plugin-vuejs-accessibility)
- [axe-core](https://github.com/dequelabs/axe-core)

## Implementation Examples

See the `/src/utils/accessibility.ts` file for centralized accessibility utilities and helper functions.

## Training

All developers should complete accessibility training and stay updated on the latest accessibility standards and best practices.
