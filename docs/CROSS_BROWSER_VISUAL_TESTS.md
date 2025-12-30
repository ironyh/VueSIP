# Cross-Browser Visual Testing Guide

**Companion to:** CROSS_BROWSER_REPORT.md
**Purpose:** Step-by-step visual verification checklist

---

## Quick Visual Test (5 minutes)

### Test Setup

1. Open the application in each browser
2. Open DevTools (F12)
3. Set viewport to 1920x1080
4. Clear localStorage before each test

### Basic Theme Toggle Test

**Test 1: Light to Dark Transition**

```
1. Ensure page loads in light mode
2. Click theme toggle button
3. Verify smooth transition (no flash)
4. Check all sections update colors
5. Verify no layout shifts
```

**Expected Results:**

- ✅ Backgrounds change from white/light to dark
- ✅ Text inverts (dark → light)
- ✅ Borders visible in both themes
- ✅ Shadows render appropriately
- ✅ Transition completes in < 300ms

**Test 2: Dark to Light Transition**

```
1. Start in dark mode
2. Click theme toggle button
3. Verify reverse transition smooth
4. Check all colors revert correctly
```

**Expected Results:**

- ✅ Same quality as light→dark
- ✅ No color artifacts
- ✅ All sections update

---

## Detailed Component Testing

### 1. Buttons

**Components to Test:**

- Primary buttons (Connect, Call)
- Secondary buttons (Settings, Transfer)
- Danger buttons (Disconnect, Hangup)
- Success buttons (Answer)

**Visual Checklist:**

| Component        | Light Mode   | Dark Mode    | Hover     | Disabled       | Focus      |
| ---------------- | ------------ | ------------ | --------- | -------------- | ---------- |
| Primary Button   | `#667eea` bg | `#818cf8` bg | ✅ Darker | ✅ 50% opacity | ✅ Outline |
| Secondary Button | `#6b7280` bg | `#d1d5db` bg | ✅ Darker | ✅ 50% opacity | ✅ Outline |
| Danger Button    | `#ef4444` bg | `#f87171` bg | ✅ Darker | ✅ 50% opacity | ✅ Outline |
| Success Button   | `#10b981` bg | `#34d399` bg | ✅ Darker | ✅ 50% opacity | ✅ Outline |

**Test Procedure:**

```
For each button:
1. Verify background color correct
2. Hover → check color darkens
3. Click → check active state
4. Tab → verify focus indicator visible
5. Disable → check 50% opacity applied
```

### 2. Form Inputs

**Components to Test:**

- Text inputs (SIP URI, Password, Server URI)
- Number input (Dialpad)
- Select dropdowns (Audio devices)

**Visual Checklist:**

| State       | Light Mode   | Dark Mode    | Verification      |
| ----------- | ------------ | ------------ | ----------------- |
| Default     | White bg     | `#1e293b` bg | ✅ Border visible |
| Hover       | Same bg      | Same bg      | ✅ Border darkens |
| Focus       | Same bg      | Same bg      | ✅ Blue outline   |
| Placeholder | Gray text    | `#64748b`    | ✅ Readable       |
| Disabled    | `#f3f4f6` bg | `#1e293b` bg | ✅ Grayed out     |

**Test Procedure:**

```
For each input:
1. Verify background matches theme
2. Type text → check color readable
3. Tab → check focus indicator
4. Hover → check border change
5. Check placeholder text contrast
```

### 3. Cards & Panels

**Components to Test:**

- Settings panel
- Active call panel
- DTMF section
- Device panel
- Call history panel

**Visual Checklist:**

| Component      | Light Background | Dark Background | Border    | Shadow    |
| -------------- | ---------------- | --------------- | --------- | --------- |
| Settings Panel | `#ffffff`        | `#1e293b`       | `#e5e7eb` | ✅ Subtle |
| Call Panel     | `#ffffff`        | `#1e293b`       | `#e5e7eb` | ✅ Subtle |
| DTMF Section   | `#ffffff`        | `#1e293b`       | `#e5e7eb` | ✅ Subtle |

**Test Procedure:**

```
For each panel:
1. Verify background distinct from page
2. Check border visible but subtle
3. Verify shadow renders (may be darker in dark mode)
4. Check text contrast (4.5:1 minimum)
```

### 4. Status Indicators

**Components to Test:**

- Connection status (Connected/Disconnected)
- Registration status (Registered/Unregistered)
- Call status (Ringing, Active, Held)
- Audio/Video status (Muted/Unmuted)

**Visual Checklist:**

| Status               | Light Theme Color   | Dark Theme Color    | Contrast |
| -------------------- | ------------------- | ------------------- | -------- |
| Success (Connected)  | Green bg `#d1fae5`  | Green bg `#10b981`  | ✅ 4.5:1 |
| Error (Disconnected) | Red bg `#fee2e2`    | Red bg `#f87171`    | ✅ 4.5:1 |
| Warning              | Yellow bg `#fef3c7` | Yellow bg `#fbbf24` | ✅ 4.5:1 |
| Info                 | Blue bg `#dbeafe`   | Blue bg `#60a5fa`   | ✅ 4.5:1 |

**Test Procedure:**

```
For each status:
1. Verify color appropriate for state
2. Check text readable (contrast check)
3. Ensure color-blind friendly (not relying on color alone)
```

### 5. DTMF Keypad

**Grid Layout Test:**

```
Expected Layout:
[1] [2] [3]
[4] [5] [6]
[7] [8] [9]
[*] [0] [#]
```

**Visual Checklist:**

- [ ] Grid renders correctly (3 columns)
- [ ] Buttons have equal size
- [ ] Gap between buttons (0.5rem)
- [ ] Hover state changes background
- [ ] Click feedback visible
- [ ] Border visible in both themes

**Test Procedure:**

```
1. Open DTMF pad during call
2. Verify 3-column grid layout
3. Hover each button → check highlight
4. Click button → verify feedback
5. Check all 12 buttons render
```

---

## Browser-Specific Tests

### Chrome/Edge (Chromium)

**Specific Tests:**

1. **CSS Grid:**
   - [ ] DTMF pad 3-column layout
   - [ ] Main interface 2-column layout
   - [ ] Responsive breakpoint (< 768px → 1 column)

2. **Transitions:**
   - [ ] Smooth theme switch (60fps)
   - [ ] No jank during transitions
   - [ ] DevTools Performance tab: no long tasks

3. **Shadow Rendering:**
   - [ ] Card shadows visible but subtle
   - [ ] Shadow layers correct (sm, md, lg, xl)

**How to Test:**

```
1. Open Chrome DevTools
2. Performance tab → Record
3. Toggle theme
4. Stop recording
5. Verify no layout shifts, 60fps maintained
```

### Firefox

**Specific Tests:**

1. **Font Rendering:**
   - [ ] Fonts may appear thinner than Chrome
   - [ ] `-moz-osx-font-smoothing: grayscale` applied
   - [ ] Check text remains readable

2. **CSS Variables:**
   - [ ] Inspector shows computed values
   - [ ] Variables cascade correctly
   - [ ] No fallback needed

3. **Flexbox:**
   - [ ] Call controls render correctly
   - [ ] Flex wrap works on narrow screens

**How to Test:**

```
1. Open Firefox DevTools
2. Inspector → Computed tab
3. Select element with CSS variables
4. Verify variables resolve correctly
5. Compare font rendering to Chrome
```

### Safari

**Specific Tests:**

1. **Flexbox Gap (Safari < 14.1):**
   - [ ] Call controls have spacing
   - [ ] Fallback margins working if gap unsupported
   - [ ] No overlapping elements

2. **100vh Issue:**
   - [ ] Full-height elements don't get cut off
   - [ ] Address bar doesn't cause scroll
   - [ ] `100dvh` used where needed

3. **CSS Layers:**
   - [ ] PrimeVue styles apply correctly
   - [ ] No cascade layer issues

**How to Test:**

```
1. Open Safari Web Inspector
2. Check computed styles for gap property
3. Scroll page → verify no address bar jump
4. Verify no console errors
```

### Safari iOS

**Mobile-Specific Tests:**

1. **Touch Interactions:**
   - [ ] Theme toggle button tappable
   - [ ] No 300ms delay on buttons
   - [ ] Touch feedback visible

2. **Viewport:**
   - [ ] Content fits screen
   - [ ] No horizontal scroll
   - [ ] Safe area insets respected

3. **Address Bar:**
   - [ ] `100vh` doesn't cause issues
   - [ ] Scroll behavior smooth

**How to Test:**

```
1. Open on physical iPhone or iOS Simulator
2. Safari → Settings → Advanced → Web Inspector
3. Tap all interactive elements
4. Verify touch feedback
5. Scroll page → check for jumps
```

---

## Performance Testing

### Theme Switch Performance

**Test Procedure:**

```
1. Open DevTools → Performance tab
2. Start recording
3. Toggle theme
4. Stop recording after transition completes
5. Analyze results
```

**Expected Metrics:**

| Browser | Switch Time | FPS   | Layout Shifts | Repaints |
| ------- | ----------- | ----- | ------------- | -------- |
| Chrome  | < 200ms     | 60fps | 0             | 1        |
| Firefox | < 250ms     | 60fps | 0             | 1        |
| Safari  | < 300ms     | 60fps | 0             | 1        |

**Red Flags:**

- ❌ FPS drops below 30
- ❌ Multiple layout shifts
- ❌ Switch takes > 500ms
- ❌ Console errors appear

### Memory Leak Test

**Test Procedure:**

```
1. Open DevTools → Memory tab
2. Take heap snapshot (Baseline)
3. Toggle theme 10 times
4. Force garbage collection
5. Take heap snapshot (After)
6. Compare snapshots
```

**Expected Results:**

- ✅ Memory increase < 1MB
- ✅ No detached DOM nodes
- ✅ No event listener leaks

**How to Force GC:**

- Chrome: DevTools → Performance Monitor → click GC icon
- Firefox: `about:memory` → Measure and save memory reports → Minimize memory usage

---

## Accessibility Testing

### Keyboard Navigation

**Test Procedure:**

```
1. Tab through all interactive elements
2. Verify focus indicators visible
3. Test Shift+Tab (reverse)
4. Test Enter/Space on buttons
```

**Checklist:**

- [ ] Theme toggle reachable via Tab
- [ ] Focus indicator has 3:1 contrast
- [ ] Tab order logical
- [ ] No keyboard traps

### Screen Reader Testing

**Tools:**

- macOS: VoiceOver (Cmd+F5)
- Windows: NVDA (free)
- iOS: VoiceOver (Settings → Accessibility)

**Test Procedure:**

```
1. Enable screen reader
2. Navigate to theme toggle
3. Activate toggle
4. Verify theme change announced
```

**Expected Announcements:**

- "Theme toggle button"
- "Switched to dark mode" (after activation)
- "Switched to light mode" (after second activation)

### Color Contrast

**Test Tools:**

- Chrome DevTools → Lighthouse → Accessibility
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**WCAG AA Requirements:**

- Normal text: 4.5:1 contrast
- Large text (18pt+): 3:1 contrast
- UI components: 3:1 contrast

**Test Procedure:**

```
1. Run Lighthouse accessibility audit
2. Check for contrast violations
3. Manually test with contrast checker
4. Verify both light and dark themes
```

---

## Automated Visual Testing

### Playwright Screenshot Comparison

**Setup:**

```bash
npm install -D @playwright/test
pnpm exec playwright install
```

**Test Script:**

```typescript
// tests/visual/theme.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('light theme matches baseline', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.removeItem('vuesip-theme')
      document.documentElement.classList.remove('dark-mode', 'dark-theme')
    })
    await page.reload()
    await expect(page).toHaveScreenshot('theme-light.png')
  })

  test('dark theme matches baseline', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.setItem('vuesip-theme', 'dark')
      document.documentElement.classList.add('dark-mode', 'dark-theme')
    })
    await page.reload()
    await expect(page).toHaveScreenshot('theme-dark.png')
  })

  test('theme transition smooth', async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Record video of transition
    await page.video()

    // Toggle theme
    await page.click('[data-testid="theme-toggle"]')

    // Wait for transition
    await page.waitForTimeout(500)

    // Verify no layout shifts
    const shifts = await page.evaluate(() => {
      return window.performance.getEntriesByType('layout-shift').length
    })
    expect(shifts).toBe(0)
  })
})
```

**Run Tests:**

```bash
# Generate baseline screenshots
pnpm exec playwright test --update-snapshots

# Compare against baseline
pnpm test:e2e

# Run on specific browser
pnpm test:e2e -- --project=firefox
pnpm test:e2e -- --project=webkit
pnpm test:e2e -- --project=chromium
```

---

## Issue Reporting Template

When you find a browser-specific issue, document it like this:

```markdown
## Issue: [Brief Description]

**Browser:** [Chrome/Firefox/Safari] [Version]
**OS:** [Windows/macOS/Linux/iOS/Android] [Version]
**Date:** [YYYY-MM-DD]

### Steps to Reproduce:

1. Open application in [Browser]
2. [Step 2]
3. [Step 3]

### Expected Behavior:

[What should happen]

### Actual Behavior:

[What actually happens]

### Screenshots:

[Attach screenshots]

### Console Errors:
```

[Paste any console errors]

```

### Severity:
- [ ] Critical (blocks functionality)
- [ ] Major (impacts UX significantly)
- [ ] Minor (cosmetic issue)

### Workaround:
[Any temporary fix]
```

---

## Testing Checklist Summary

### Pre-Release Testing

**Desktop Browsers (Required):**

- [ ] Chrome latest - Full test suite
- [ ] Firefox latest - Full test suite
- [ ] Safari latest - Full test suite
- [ ] Edge latest - Quick smoke test

**Mobile Browsers (Required):**

- [ ] Safari iOS - Touch interactions, viewport
- [ ] Chrome Android - Touch interactions, viewport

**Accessibility (Required):**

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA

**Performance (Required):**

- [ ] Theme switch < 300ms
- [ ] No memory leaks
- [ ] 60fps transitions

**Visual (Required):**

- [ ] Components render correctly
- [ ] No layout shifts
- [ ] Colors appropriate for theme

### Post-Release Monitoring

**Monitor for:**

- [ ] Browser console errors
- [ ] User-reported visual bugs
- [ ] Performance degradation
- [ ] Accessibility complaints

**Review after:**

- [ ] Major browser updates
- [ ] PrimeVue updates
- [ ] Vue updates
- [ ] CSS changes

---

**Guide Version:** 1.0
**Last Updated:** 2025-12-22
**Maintainer:** Cross-Browser Testing Specialist
