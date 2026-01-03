# Browser Compatibility Quick Reference Card

**For:** VueSIP Developers
**Purpose:** Fast lookup of browser quirks and workarounds

---

## 🚀 Quick Browser Support Check

```bash
✅ SUPPORTED (Tier 1):
  Chrome 88+  │  Firefox 78+  │  Safari 14+  │  Edge 88+

⚠️ BEST EFFORT (Tier 2):
  Samsung Internet 14+  │  Opera 74+  │  Brave (latest)

❌ UNSUPPORTED (Tier 3):
  IE11  │  Safari < 14  │  Old Chrome/Firefox (< 2 years)
```

---

## 🔍 Feature Detection Cheatsheet

### CSS Variables

```javascript
// Check support
if (CSS.supports('(--test: 0)')) {
  // Supported ✅
} else {
  // IE11 or very old browser ❌
}
```

### System Theme Preference

```javascript
// Check support
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  // Dark mode preferred
} else {
  // Light mode or unsupported
}
```

### LocalStorage

```javascript
// Always wrap in try-catch (privacy mode may block)
try {
  localStorage.setItem('theme', 'dark')
  const theme = localStorage.getItem('theme')
} catch (e) {
  console.warn('LocalStorage blocked')
  // Use in-memory fallback
}
```

---

## ⚠️ Common Browser Quirks

### Safari < 14.1: Flexbox Gap Not Supported

**Problem:**

```css
.container {
  display: flex;
  gap: 1rem; /* ❌ Not supported */
}
```

**Workaround:**

```css
.container {
  display: flex;
  gap: 1rem; /* ✅ Safari 14.1+ */
}

/* Fallback for older Safari */
@supports not (gap: 1rem) {
  .container > * {
    margin: 0.5rem;
  }
  .container > *:first-child {
    margin-left: 0;
  }
  .container > *:last-child {
    margin-right: 0;
  }
}
```

### Safari iOS: 100vh Includes Address Bar

**Problem:**

```css
.full-height {
  height: 100vh; /* ❌ Includes address bar */
}
```

**Workaround:**

```css
.full-height {
  min-height: 100vh; /* Fallback */
  min-height: 100dvh; /* ✅ Dynamic viewport (Safari 15.4+) */
}
```

### IE11: CSS Variables Not Supported

**Problem:**

```css
:root {
  --primary: #667eea; /* ❌ Not supported */
}
.button {
  background: var(--primary); /* ❌ Won't work */
}
```

**Solution:**

```html
<!-- Display unsupported browser message -->
<div class="unsupported-browser-warning">
  Please update your browser to Chrome 88+, Firefox 78+, or Safari 14+
</div>
```

### Firefox: Font Rendering Differences

**Issue:** Fonts may appear thinner than Chrome

**Workaround:**

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale; /* ✅ Firefox */
}
```

### Chrome/Edge: Color Flash on Load

**Problem:** Brief flash of unstyled content before CSS loads

**Workaround:**

```html
<!-- Option 1: Preload CSS -->
<link rel="preload" href="/style.css" as="style" />
<link rel="stylesheet" href="/style.css" />

<!-- Option 2: Inline critical CSS in <head> -->
<style>
  :root {
    --primary: #667eea; /* critical variables */
  }
</style>
```

---

## 🎨 CSS Feature Compatibility

| Feature        | Chrome  | Firefox | Safari   | Edge    | Workaround Needed? |
| -------------- | ------- | ------- | -------- | ------- | ------------------ |
| CSS Variables  | 88+ ✅  | 78+ ✅  | 14+ ✅   | 88+ ✅  | No                 |
| CSS Grid       | 88+ ✅  | 78+ ✅  | 14+ ✅   | 88+ ✅  | No                 |
| Flexbox        | 88+ ✅  | 78+ ✅  | 14+ ✅   | 88+ ✅  | No                 |
| Flexbox gap    | 88+ ✅  | 78+ ✅  | 14.1+ ⚠️ | 88+ ✅  | Safari < 14.1      |
| @layer         | 99+ ⚠️  | 97+ ⚠️  | 15.4+ ⚠️ | 99+ ⚠️  | Older versions     |
| dvh units      | 108+ ⚠️ | 101+ ⚠️ | 15.4+ ⚠️ | 108+ ⚠️ | Older versions     |
| :focus-visible | 88+ ✅  | 78+ ✅  | 15.4+ ⚠️ | 88+ ✅  | Safari < 15.4      |

---

## 📱 Mobile Browser Gotchas

### iOS Safari: Touch Delay

**Problem:** 300ms delay on touch events

**Workaround:**

```css
button,
a,
input {
  touch-action: manipulation; /* ✅ Removes delay */
}
```

### Android Chrome: Pull-to-Refresh Interference

**Problem:** Pull-to-refresh triggers when scrolling up

**Workaround:**

```css
body {
  overscroll-behavior: contain; /* ✅ Disables pull-to-refresh */
}
```

### Mobile: Active State Not Showing

**Problem:** `:active` styles don't show on touch

**Workaround:**

```html
<!-- Add empty touchstart handler -->
<script>
  document.addEventListener('touchstart', () => {}, { passive: true })
</script>
```

---

## 🛠️ Testing Commands

### Local Testing

```bash
# Start dev server
pnpm dev

# Test in multiple browsers simultaneously
# Open manually:
http://localhost:5173  # Chrome
http://localhost:5173  # Firefox
http://localhost:5173  # Safari
```

### Playwright Cross-Browser Tests

```bash
# Install browsers
pnpm exec playwright install

# Run tests on all browsers
pnpm test:e2e

# Run on specific browser
pnpm test:e2e -- --project=chromium
pnpm test:e2e -- --project=firefox
pnpm test:e2e -- --project=webkit

# Debug mode
pnpm test:e2e -- --debug
```

### Browser-Specific DevTools

**Chrome DevTools:**

```bash
F12 → Performance tab → Record → Toggle theme → Analyze
F12 → Lighthouse tab → Run accessibility audit
```

**Firefox DevTools:**

```bash
F12 → Inspector → Computed tab → Check CSS variables
F12 → Accessibility tab → Check contrast ratios
```

**Safari Web Inspector:**

```bash
Develop → Show Web Inspector → Elements → Computed
Develop → Enter Responsive Design Mode → Test viewports
```

---

## 🔧 Common Fixes

### Fix 1: Theme Not Persisting

**Symptom:** Theme resets to light on refresh

**Debug:**

```javascript
// Check localStorage
console.log(localStorage.getItem('vuesip-theme'))

// Check HTML class
console.log(document.documentElement.classList)
```

**Fix:**

```javascript
// Ensure theme saved before page unload
window.addEventListener('beforeunload', () => {
  const theme = document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light'
  localStorage.setItem('vuesip-theme', theme)
})
```

### Fix 2: FOUC (Flash of Unstyled Content)

**Symptom:** Brief flash of light theme before dark theme loads

**Fix:**

```html
<!-- Add inline script in <head> BEFORE Vue loads -->
<script>
  // Apply theme class immediately
  const theme = localStorage.getItem('vuesip-theme')
  if (theme === 'dark') {
    document.documentElement.classList.add('dark-mode', 'dark-theme')
  }
</script>
```

### Fix 3: Transitions Causing Layout Shift

**Symptom:** Elements jump during theme switch

**Fix:**

```css
/* Disable transitions during page load */
.no-transition * {
  transition: none !important;
}

<!-- Add class on load, remove after render -->
<script>
  document.documentElement.classList.add('no-transition');
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.documentElement.classList.remove('no-transition');
    }, 100);
  });
</script>
```

### Fix 4: High Memory Usage

**Symptom:** Browser becomes sluggish after theme switches

**Debug:**

```javascript
// Check for detached nodes
// Chrome DevTools → Memory → Take Heap Snapshot → Search "Detached"
```

**Fix:**

```javascript
// Ensure event listeners removed
const cleanup = () => {
  // Remove old listeners before adding new ones
  element.removeEventListener('click', handler)
  element.addEventListener('click', handler)
}
```

---

## 📊 Performance Targets

| Metric                  | Target  | Browser Check                     |
| ----------------------- | ------- | --------------------------------- |
| Theme switch time       | < 200ms | DevTools Performance tab          |
| Frame rate (transition) | 60fps   | DevTools Performance → Frames     |
| Layout shifts           | 0       | DevTools Performance → Experience |
| Memory increase         | < 1MB   | DevTools Memory → Heap Snapshot   |
| First Contentful Paint  | < 1.5s  | Lighthouse Performance            |

---

## 🚨 Emergency Fixes

### Universal Fallback for Broken Theme

```javascript
// Add to main.ts for emergency theme reset
if (typeof window !== 'undefined') {
  window.__resetTheme = () => {
    localStorage.removeItem('vuesip-theme')
    document.documentElement.classList.remove('dark-mode', 'dark-theme')
    location.reload()
  }
}

// Console command: __resetTheme()
```

### Detect and Report Browser Issues

```javascript
// Add to App.vue for automatic issue reporting
export function detectBrowserIssue() {
  const issues = []

  // Check CSS Variables support
  if (!CSS.supports('(--test: 0)')) {
    issues.push('CSS Variables not supported')
  }

  // Check localStorage
  try {
    localStorage.setItem('test', 'test')
    localStorage.removeItem('test')
  } catch (e) {
    issues.push('LocalStorage blocked')
  }

  // Check Grid support
  if (!CSS.supports('display', 'grid')) {
    issues.push('CSS Grid not supported')
  }

  if (issues.length > 0) {
    console.error('Browser compatibility issues:', issues)
    // Report to analytics or error tracking
  }

  return issues
}
```

---

## 📚 Quick Links

**Documentation:**

- [Full Compatibility Report](./CROSS_BROWSER_REPORT.md)
- [Visual Testing Guide](./CROSS_BROWSER_VISUAL_TESTS.md)
- [Browser Support Policy](./BROWSER_SUPPORT_POLICY.md)

**External Resources:**

- [Can I Use](https://caniuse.com/) - Feature compatibility tables
- [MDN Web Docs](https://developer.mozilla.org/) - Browser compatibility data
- [BrowserStack](https://www.browserstack.com/) - Real device testing

**Testing Tools:**

- [Playwright](https://playwright.dev/) - Cross-browser E2E testing
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance & accessibility
- [WebPageTest](https://www.webpagetest.org/) - Performance testing

---

## 💡 Pro Tips

1. **Always test theme switch in all supported browsers** - Different rendering engines handle transitions differently

2. **Use @supports for progressive enhancement** - Better than browser detection

3. **Wrap localStorage in try-catch** - Privacy mode can block access

4. **Test on real mobile devices** - Simulators don't catch all issues

5. **Check color contrast in both themes** - WCAG AA requires 4.5:1 for normal text

6. **Monitor browser update announcements** - Breaking changes in new versions

7. **Use Playwright for regression tests** - Catches browser-specific bugs early

8. **Profile before optimizing** - Use DevTools Performance tab, don't guess

---

**Last Updated:** 2025-12-22
**Quick Reference Version:** 1.0
