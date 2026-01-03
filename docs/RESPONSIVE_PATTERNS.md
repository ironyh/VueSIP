# Mobile-First Responsive Patterns Guide

**VueSIP Playground Demos - Comprehensive Responsive Design Implementation**

## Table of Contents

1. [Philosophy & Approach](#philosophy--approach)
2. [Breakpoint Strategy](#breakpoint-strategy)
3. [Core Responsive Patterns](#core-responsive-patterns)
4. [Component-Specific Patterns](#component-specific-patterns)
5. [Testing Guidelines](#testing-guidelines)
6. [Implementation Checklist](#implementation-checklist)

---

## Philosophy & Approach

### Mobile-First Design

**Start with mobile** (320px+) and progressively enhance for larger screens:

- Base styles work on smallest screens
- Use `@media (min-width: ...)` for enhancements
- Never use `max-width` breakpoints (desktop-first anti-pattern)

### Progressive Enhancement

```css
/* ✅ CORRECT - Mobile First */
.component {
  flex-direction: column; /* Mobile: stack vertically */
}

@media (min-width: 768px) {
  .component {
    flex-direction: row; /* Tablet+: horizontal layout */
  }
}

/* ❌ WRONG - Desktop First */
.component {
  flex-direction: row;
}

@media (max-width: 767px) {
  .component {
    flex-direction: column;
  }
}
```

---

## Breakpoint Strategy

### Tailwind-Style Breakpoints

```css
/* Base (Mobile Portrait) - 320px+ */
Default styles apply to all screen sizes

/* sm: Mobile Landscape / Small Tablet - 640px+ */
@media (min-width: 640px) {
}

/* md: Tablet Portrait - 768px+ */
@media (min-width: 768px) {
}

/* lg: Tablet Landscape / Desktop - 1024px+ */
@media (min-width: 1024px) {
}

/* xl: Large Desktop - 1280px+ */
@media (min-width: 1280px) {
}

/* 2xl: Extra Large Desktop - 1536px+ */
@media (min-width: 1536px) {
}
```

### When to Use Each Breakpoint

| Breakpoint        | Use Case                               | Example                                   |
| ----------------- | -------------------------------------- | ----------------------------------------- |
| **Base (320px+)** | Mobile portrait, vertical stacking     | Single column layouts, full-width buttons |
| **sm (640px+)**   | Mobile landscape, initial multi-column | 2-column layouts, auto-width buttons      |
| **md (768px+)**   | Tablet portrait, optimized spacing     | 3-column grids, sidebar layouts           |
| **lg (1024px+)**  | Desktop, horizontal layouts            | 4-column grids, complex dashboards        |
| **xl (1280px+)**  | Large desktop, maximum widths          | Wide content areas, expanded spacing      |

---

## Core Responsive Patterns

### 1. Flex Direction Switching

**Pattern:** Stack vertically on mobile, horizontal on larger screens

```vue
<template>
  <!-- Stack vertically on mobile, horizontal on tablet+ -->
  <div class="flex flex-column md:flex-row gap-3">
    <div>Left content</div>
    <div>Right content</div>
  </div>

  <!-- Stack on mobile, horizontal on desktop -->
  <div class="flex flex-column lg:flex-row gap-4">
    <aside>Sidebar</aside>
    <main>Main content</main>
  </div>
</template>

<style scoped>
/* CSS version for non-utility class projects */
.responsive-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .responsive-container {
    flex-direction: row;
  }
}
</style>
```

### 2. Button Width Management

**Pattern:** Full width on mobile, auto on larger screens

```vue
<template>
  <!-- Full width on mobile, auto on tablet+ -->
  <Button class="w-full sm:w-auto" label="Submit" />

  <!-- Full width on mobile/tablet, auto on desktop -->
  <Button class="w-full lg:w-auto" label="Advanced Action" />

  <!-- Button group responsive -->
  <div class="flex flex-column sm:flex-row gap-2">
    <Button class="w-full sm:flex-1" label="Option 1" />
    <Button class="w-full sm:flex-1" label="Option 2" />
    <Button class="w-full sm:flex-1" label="Option 3" />
  </div>
</template>

<style scoped>
/* CSS version */
.button-responsive {
  width: 100%;
}

@media (min-width: 640px) {
  .button-responsive {
    width: auto;
  }
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .button-group {
    flex-direction: row;
  }

  .button-group button {
    flex: 1;
  }
}
</style>
```

### 3. Grid Responsiveness

**Pattern:** 1 column mobile → 2 tablet → 3 desktop → 4 large

```vue
<template>
  <!-- PrimeVue Grid System -->
  <div class="grid">
    <!-- 1 column mobile, 2 tablet, 3 desktop, 4 large -->
    <div class="col-12 sm:col-6 lg:col-4 xl:col-3" v-for="item in items" :key="item.id">
      <Card>{{ item.title }}</Card>
    </div>
  </div>

  <!-- 1 column mobile, 2 desktop -->
  <div class="grid">
    <div class="col-12 lg:col-6" v-for="item in items" :key="item.id">
      <Panel>{{ item.content }}</Panel>
    </div>
  </div>
</template>

<style scoped>
/* CSS Grid version */
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: 1 column */
  gap: 1rem;
}

@media (min-width: 640px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr); /* Tablet: 2 columns */
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr); /* Desktop: 3 columns */
  }
}

@media (min-width: 1280px) {
  .responsive-grid {
    grid-template-columns: repeat(4, 1fr); /* Large: 4 columns */
  }
}
</style>
```

### 4. Progressive Disclosure

**Pattern:** Hide labels/details on mobile, show on larger screens

```vue
<template>
  <!-- Hide label on mobile, show on tablet+ -->
  <div class="flex align-items-center gap-2">
    <i class="pi pi-phone"></i>
    <span class="hidden sm:inline">Call Details</span>
  </div>

  <!-- Icon only on mobile, with text on desktop -->
  <Button icon="pi pi-phone" class="sm:hidden" />
  <Button icon="pi pi-phone" label="Make Call" class="hidden sm:inline-flex" />

  <!-- Abbreviated text on mobile, full on desktop -->
  <span>
    <span class="sm:hidden">Rec</span>
    <span class="hidden sm:inline">Recording</span>
  </span>
</template>

<style scoped>
/* CSS version */
.mobile-hidden {
  display: none;
}

@media (min-width: 640px) {
  .mobile-hidden {
    display: inline;
  }
}

.desktop-hidden {
  display: inline;
}

@media (min-width: 640px) {
  .desktop-hidden {
    display: none;
  }
}
</style>
```

### 5. Spacing Optimization

**Pattern:** Smaller padding/gaps on mobile, larger on desktop

```vue
<template>
  <!-- Responsive padding -->
  <div class="p-2 md:p-4 lg:p-6">
    <h3>Content with responsive padding</h3>
  </div>

  <!-- Responsive gaps -->
  <div class="flex gap-2 md:gap-3 lg:gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
  </div>

  <!-- Responsive margins -->
  <section class="mb-3 md:mb-4 lg:mb-6">
    <h2>Section Title</h2>
  </section>
</template>

<style scoped>
/* CSS version */
.responsive-padding {
  padding: 0.5rem;
}

@media (min-width: 768px) {
  .responsive-padding {
    padding: 1rem;
  }
}

@media (min-width: 1024px) {
  .responsive-padding {
    padding: 1.5rem;
  }
}

.responsive-gap {
  display: flex;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .responsive-gap {
    gap: 0.75rem;
  }
}

@media (min-width: 1024px) {
  .responsive-gap {
    gap: 1rem;
  }
}
</style>
```

### 6. Container Width Management

**Pattern:** Controlled maximum widths for readability

```vue
<template>
  <!-- Content container with responsive max-width -->
  <div class="container-responsive">
    <h1>Page Title</h1>
    <p>Content stays readable at all sizes</p>
  </div>
</template>

<style scoped>
.container-responsive {
  width: 100%;
  max-width: 100%; /* Mobile: full width */
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .container-responsive {
    max-width: 640px; /* Small devices */
  }
}

@media (min-width: 768px) {
  .container-responsive {
    max-width: 768px; /* Tablets */
  }
}

@media (min-width: 1024px) {
  .container-responsive {
    max-width: 1024px; /* Desktop */
  }
}

@media (min-width: 1280px) {
  .container-responsive {
    max-width: 1280px; /* Large desktop */
  }
}
</style>
```

---

## Component-Specific Patterns

### Call Status Cards

```vue
<template>
  <div class="call-card">
    <div class="call-header flex-column sm:flex-row gap-2 sm:gap-3">
      <Avatar />
      <div class="call-info flex-1">
        <h4>Caller Name</h4>
        <p class="text-sm">sip:user@example.com</p>
      </div>
      <div class="call-controls flex flex-column sm:flex-row gap-1 sm:gap-2">
        <Button icon="pi pi-phone" class="w-full sm:w-auto" />
        <Button icon="pi pi-times" class="w-full sm:w-auto" severity="danger" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.call-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
}

@media (min-width: 640px) {
  .call-card {
    flex-direction: row;
    align-items: center;
  }
}

.call-header {
  display: flex;
  align-items: flex-start;
}

@media (min-width: 640px) {
  .call-header {
    align-items: center;
  }
}
</style>
```

### Statistics Dashboard

```vue
<template>
  <!-- Stats Grid - 1 col mobile, 2 tablet, 3 desktop, 6 wide -->
  <div class="stats-grid grid">
    <div class="col-12 sm:col-6 md:col-4 xl:col-2" v-for="stat in stats" :key="stat.label">
      <Card>
        <template #content>
          <div class="text-2xl font-bold">{{ stat.value }}</div>
          <div class="text-sm text-secondary">{{ stat.label }}</div>
        </template>
      </Card>
    </div>
  </div>
</template>
```

### Form Layouts

```vue
<template>
  <!-- Responsive form with stacked inputs on mobile -->
  <form class="grid p-fluid">
    <!-- Full width on mobile, half on tablet+ -->
    <div class="col-12 md:col-6">
      <label for="firstName">First Name</label>
      <InputText id="firstName" />
    </div>
    <div class="col-12 md:col-6">
      <label for="lastName">Last Name</label>
      <InputText id="lastName" />
    </div>

    <!-- Full width field -->
    <div class="col-12">
      <label for="email">Email</label>
      <InputText id="email" type="email" />
    </div>

    <!-- Buttons -->
    <div class="col-12 flex flex-column sm:flex-row gap-2 justify-content-end mt-3">
      <Button label="Cancel" severity="secondary" class="w-full sm:w-auto" />
      <Button label="Submit" class="w-full sm:w-auto" />
    </div>
  </form>
</template>
```

### Data Tables

```vue
<template>
  <DataTable :value="records" responsiveLayout="scroll" breakpoint="768px" class="p-datatable-sm">
    <!-- Show abbreviated columns on mobile -->
    <Column field="id" header="ID" class="hidden md:table-cell" />
    <Column field="name" header="Name" />
    <Column field="status" header="Status">
      <template #body="{ data }">
        <Tag :value="data.status" :severity="getSeverity(data.status)" />
      </template>
    </Column>
    <Column header="Actions" class="w-full sm:w-auto">
      <template #body>
        <div class="flex flex-column sm:flex-row gap-1">
          <Button icon="pi pi-pencil" size="small" class="w-full sm:w-auto" />
          <Button icon="pi pi-trash" size="small" severity="danger" class="w-full sm:w-auto" />
        </div>
      </template>
    </Column>
  </DataTable>
</template>
```

### Navigation & Sidebars

```vue
<template>
  <div class="layout-wrapper">
    <!-- Sidebar: Collapsed on mobile, expanded on desktop -->
    <aside class="sidebar" :class="{ 'sidebar-mobile-hidden': !sidebarVisible }">
      <nav><!-- Navigation items --></nav>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <!-- Mobile menu toggle -->
      <Button icon="pi pi-bars" class="lg:hidden mb-3" @click="sidebarVisible = !sidebarVisible" />
      <slot />
    </main>
  </div>
</template>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .layout-wrapper {
    flex-direction: row;
  }
}

.sidebar {
  width: 100%;
  background: var(--surface-card);
  border-right: 1px solid var(--surface-border);
}

@media (min-width: 1024px) {
  .sidebar {
    width: 250px;
    position: sticky;
    top: 0;
    height: 100vh;
  }
}

.sidebar-mobile-hidden {
  display: none;
}

@media (min-width: 1024px) {
  .sidebar-mobile-hidden {
    display: block;
  }
}

.main-content {
  flex: 1;
  padding: 1rem;
}

@media (min-width: 1024px) {
  .main-content {
    padding: 2rem;
  }
}
</style>
```

---

## Testing Guidelines

### Required Test Breakpoints

Test **every demo** at these exact widths:

1. **320px** - iPhone SE (Portrait)
   - ✓ No horizontal scrolling
   - ✓ All text readable
   - ✓ All buttons accessible
   - ✓ Forms usable

2. **375px** - iPhone (Portrait)
   - ✓ Comfortable spacing
   - ✓ Touch targets ≥44px

3. **768px** - iPad (Portrait)
   - ✓ Optimized for tablet
   - ✓ 2-column layouts work
   - ✓ Enhanced spacing

4. **1024px** - iPad (Landscape) / Small Desktop
   - ✓ Desktop layouts activate
   - ✓ Sidebars visible
   - ✓ Complex grids work

5. **1920px** - Full HD Desktop
   - ✓ Content doesn't stretch too wide
   - ✓ Maximum widths applied
   - ✓ Spacing appropriate

### Testing Checklist

For each demo, verify:

- [ ] **No horizontal scroll** at any breakpoint
- [ ] **All controls accessible** with touch (44px minimum)
- [ ] **Text readable** without zooming
- [ ] **Forms functional** on mobile
- [ ] **Images/media responsive** (don't overflow)
- [ ] **Navigation usable** on all sizes
- [ ] **Performance acceptable** (<3s load on 3G)
- [ ] **Keyboard navigation** works
- [ ] **Screen reader friendly** (ARIA labels present)

### Browser Testing

Test on:

- ✓ Chrome/Edge (Desktop & Mobile)
- ✓ Firefox (Desktop & Mobile)
- ✓ Safari (Desktop & iOS)
- ✓ Samsung Internet (Android)

---

## Implementation Checklist

### Before You Start

- [ ] Review this guide thoroughly
- [ ] Understand mobile-first philosophy
- [ ] Identify component's core functionality
- [ ] Determine primary use case (mobile vs desktop)

### During Implementation

- [ ] Start with base (mobile) styles
- [ ] Add breakpoints progressively
- [ ] Test at each breakpoint as you code
- [ ] Use utility classes where appropriate
- [ ] Keep CSS DRY (don't repeat breakpoint logic)

### Quality Gates

- [ ] All 5 breakpoints tested
- [ ] No horizontal scrolling anywhere
- [ ] Touch targets ≥44px
- [ ] Text readable without zoom
- [ ] Performance acceptable (<3s load)
- [ ] Accessibility verified (ARIA, keyboard)
- [ ] Code reviewed for mobile-first patterns
- [ ] Documentation updated

### Post-Implementation

- [ ] Screenshot representative breakpoints
- [ ] Document any unique patterns used
- [ ] Update this guide if new patterns emerge
- [ ] Share learnings with team

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```css
/* Desktop-first (wrong) */
.component {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 1023px) {
  .component {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .component {
    grid-template-columns: 1fr;
  }
}
```

### ✅ Do This Instead

```css
/* Mobile-first (correct) */
.component {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .component {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .component {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Common Anti-Patterns

1. **Fixed widths**: Never use `width: 600px` without responsive alternatives
2. **Pixel-perfect breakpoints**: Use standard breakpoints, not `@media (min-width: 847px)`
3. **Too many breakpoints**: Stick to 5 standard breakpoints maximum
4. **Forgetting touch targets**: Buttons/links must be ≥44px for mobile
5. **Ignoring landscape**: Test both portrait AND landscape orientations
6. **Desktop-only thinking**: Design for mobile FIRST, desktop SECOND

---

## Quick Reference

### Utility Class Cheatsheet

```html
<!-- Flex Direction -->
<div class="flex flex-column sm:flex-row">
  <!-- Width -->
  <button class="w-full sm:w-auto">
    <!-- Padding -->
    <div class="p-2 md:p-4 lg:p-6">
      <!-- Gap -->
      <div class="flex gap-2 md:gap-3 lg:gap-4">
        <!-- Grid Columns -->
        <div class="col-12 sm:col-6 md:col-4 lg:col-3">
          <!-- Display -->
          <span class="hidden sm:inline">
            <span class="sm:hidden">
              <!-- Text Size -->
              <p class="text-sm md:text-base lg:text-lg"></p></span
          ></span>
        </div>
      </div>
    </div>
  </button>
</div>
```

### Breakpoint Reference

| Breakpoint | Min Width | Target Devices                  |
| ---------- | --------- | ------------------------------- |
| Base       | 320px+    | All devices (mobile portrait)   |
| sm         | 640px+    | Mobile landscape, small tablets |
| md         | 768px+    | Tablets portrait                |
| lg         | 1024px+   | Tablets landscape, desktop      |
| xl         | 1280px+   | Large desktop                   |
| 2xl        | 1536px+   | Extra large desktop             |

---

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [PrimeVue Flex Utilities](https://primevue.org/flex/)
- [PrimeVue Grid System](https://primevue.org/grid/)
- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Google: Mobile-First Indexing](https://developers.google.com/search/mobile-sites/mobile-first-indexing)

---

**Last Updated:** 2025-12-21
**Version:** 1.0.0
**Maintainer:** VueSIP Team
