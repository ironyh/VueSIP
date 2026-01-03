# Browser Compatibility Implementation Checklist

**For:** Development Team
**Purpose:** Ensure browser compatibility when making changes
**Use When:** Adding features, modifying CSS, updating dependencies

---

## 🎯 Pre-Development Checklist

Before starting any feature that affects UI or theming:

- [ ] Review [Browser Support Policy](./BROWSER_SUPPORT_POLICY.md) for target browsers
- [ ] Check [Can I Use](https://caniuse.com/) for feature compatibility
- [ ] Identify browser-specific quirks that may affect implementation
- [ ] Plan fallbacks for unsupported features
- [ ] Set up local testing environment (Chrome, Firefox, Safari)

---

## 🎨 CSS Development Checklist

### When Adding New Styles

- [ ] **Use CSS Variables** - Don't hardcode colors/values

  ```css
  ✅ background: var(--surface-card);
  ❌ background: #ffffff;
  ```

- [ ] **Test both light and dark themes** - Toggle theme during development

- [ ] **Avoid browser-specific prefixes unless necessary**

  ```css
  ✅ display: flex;
  ⚠️ display: -webkit-flex; /* Only if targeting very old browsers */
  ```

- [ ] **Check Flexbox gap support** - Add fallback for Safari < 14.1

  ```css
  .container {
    display: flex;
    gap: 1rem;
  }

  @supports not (gap: 1rem) {
    .container > * {
      margin: 0.5rem;
    }
  }
  ```

- [ ] **Use @supports for new features**

  ```css
  @supports (display: grid) {
    .layout {
      display: grid;
    }
  }
  @supports not (display: grid) {
    .layout {
      display: flex;
      flex-wrap: wrap;
    }
  }
  ```

- [ ] **Avoid 100vh on mobile** - Use 100dvh with fallback
  ```css
  .full-height {
    min-height: 100vh;
    min-height: 100dvh; /* Safari 15.4+ */
  }
  ```

### Transitions and Animations

- [ ] **Test animation performance** - Use DevTools Performance tab
- [ ] **Ensure 60fps** - Check frame rate during transitions
- [ ] **Use GPU-accelerated properties** - transform, opacity

  ```css
  ✅ transform: translateX(10px);
  ⚠️ left: 10px; /* Can cause reflow */
  ```

- [ ] **Add will-change sparingly** - Only for known animations
  ```css
  .animated-element {
    will-change: transform, opacity;
  }
  ```

### Responsive Design

- [ ] **Test all breakpoints** - Mobile, tablet, desktop
- [ ] **Use mobile-first approach** - Start with mobile styles
- [ ] **Test touch interactions** - Buttons should be 44x44px minimum
- [ ] **Add touch-action** - Remove 300ms delay
  ```css
  button {
    touch-action: manipulation;
  }
  ```

---

## 🔧 JavaScript Development Checklist

### When Using Browser APIs

- [ ] **Check API support** - Use feature detection

  ```javascript
  ✅ if ('matchMedia' in window) { /* use matchMedia */ }
  ❌ if (navigator.userAgent.includes('Chrome')) { /* bad */ }
  ```

- [ ] **Wrap localStorage in try-catch** - Privacy mode may block

  ```javascript
  ✅ try {
       localStorage.setItem('key', 'value');
     } catch (e) {
       console.warn('LocalStorage blocked');
     }
  ❌ localStorage.setItem('key', 'value'); // May throw in privacy mode
  ```

- [ ] **Use modern JavaScript features safely** - Vite transpiles automatically

  ```javascript
  ✅ const theme = data?.theme ?? 'light'; // Optional chaining + nullish coalescing
  ```

- [ ] **Avoid browser-specific code** - Let Vite handle polyfills
  ```javascript
  ✅ array.includes(item)
  ❌ array.indexOf(item) !== -1 // Unnecessary for modern browsers
  ```

### Event Handling

- [ ] **Use passive event listeners** - Improve scroll performance

  ```javascript
  ✅ element.addEventListener('scroll', handler, { passive: true });
  ```

- [ ] **Remove event listeners on cleanup**

  ```javascript
  onUnmounted(() => {
    element.removeEventListener('click', handler)
  })
  ```

- [ ] **Handle touch and mouse events**
  ```javascript
  // For click-like interactions, use 'click' (works for both)
  ✅ button.addEventListener('click', handler);
  ❌ button.addEventListener('touchend', handler); // Unless touch-specific
  ```

---

## 🧪 Testing Checklist

### Manual Testing (Required)

**Desktop:**

- [ ] Chrome latest - Full feature test
- [ ] Firefox latest - Full feature test
- [ ] Safari latest - Full feature test
- [ ] Edge latest - Smoke test

**Mobile:**

- [ ] Safari iOS - Touch interactions, viewport
- [ ] Chrome Android - Touch interactions, viewport

### Automated Testing

- [ ] **Add Playwright test for new feature**

  ```javascript
  test('feature works in all browsers', async ({ page }) => {
    // Test implementation
  })
  ```

- [ ] **Run tests on all browsers**

  ```bash
  pnpm test:e2e -- --project=chromium firefox webkit
  ```

- [ ] **Check for console errors** - No warnings/errors in any browser

### Visual Testing

- [ ] **Take screenshots in both themes** - Light and dark
- [ ] **Compare across browsers** - Chrome, Firefox, Safari
- [ ] **Check responsive breakpoints** - Mobile, tablet, desktop
- [ ] **Verify no layout shifts** - Use DevTools Performance tab

### Performance Testing

- [ ] **Measure theme switch time** - Should be < 200ms
- [ ] **Check frame rate** - Should maintain 60fps
- [ ] **Monitor memory usage** - No leaks after repeated switches
- [ ] **Run Lighthouse audit** - Performance score > 90

---

## 📦 Dependency Updates Checklist

### When Updating PrimeVue or Vue

- [ ] **Review release notes** - Check for breaking changes
- [ ] **Test theme compatibility** - Ensure Aura theme still works
- [ ] **Check CSS cascade layers** - Verify @layer support
- [ ] **Test all PrimeVue components** - Buttons, inputs, modals, etc.
- [ ] **Run full test suite** - Automated + manual testing

### When Updating Vite or Build Tools

- [ ] **Verify transpilation** - Check output targets in vite.config.ts
- [ ] **Test production build** - pnpm build && pnpm preview
- [ ] **Check bundle size** - Should not increase significantly
- [ ] **Verify polyfills** - Ensure backward compatibility maintained

---

## 🔍 Code Review Checklist

### For Reviewers

**CSS Changes:**

- [ ] Uses CSS variables for theme-able properties
- [ ] No hardcoded colors or values
- [ ] Includes fallbacks for new CSS features
- [ ] Tested in both light and dark themes
- [ ] No browser-specific hacks without justification

**JavaScript Changes:**

- [ ] Uses feature detection, not user-agent sniffing
- [ ] Handles localStorage errors gracefully
- [ ] Removes event listeners on cleanup
- [ ] No console.log statements (use proper logging)
- [ ] Modern syntax is transpiled by build process

**Testing:**

- [ ] Includes automated tests
- [ ] Manual testing documented in PR
- [ ] Screenshots provided for visual changes
- [ ] Performance impact noted

**Documentation:**

- [ ] Browser-specific quirks documented
- [ ] Breaking changes highlighted
- [ ] Migration guide provided if needed

---

## 🚨 Pre-Release Checklist

### Final Testing

- [ ] **Full regression test** - All major features work
- [ ] **Cross-browser smoke test** - Chrome, Firefox, Safari, Edge
- [ ] **Mobile device testing** - iOS Safari, Chrome Android
- [ ] **Accessibility audit** - Lighthouse accessibility score > 90
- [ ] **Performance baseline** - Core Web Vitals meet targets

### Browser Compatibility Verification

- [ ] **CSS Variables render** - No fallback to broken styles
- [ ] **Theme toggle works** - In all supported browsers
- [ ] **LocalStorage persists** - Theme saved across sessions
- [ ] **No console errors** - Clean console in all browsers
- [ ] **Responsive design** - Layouts work at all breakpoints

### Documentation

- [ ] **Update CHANGELOG.md** - Note browser-specific changes
- [ ] **Update browser support policy** - If minimum versions changed
- [ ] **Document known issues** - Any browser-specific bugs
- [ ] **Update testing documentation** - New test procedures

---

## 📋 Issue Triage Checklist

### When User Reports Browser Issue

1. **Collect Information:**
   - [ ] Browser name and version
   - [ ] Operating system
   - [ ] Steps to reproduce
   - [ ] Screenshot or screen recording
   - [ ] Console error messages

2. **Reproduce Locally:**
   - [ ] Test in reported browser
   - [ ] Test in other browsers (compare)
   - [ ] Check if browser is supported
   - [ ] Verify browser version meets minimum

3. **Diagnose:**
   - [ ] Check if CSS Variables supported
   - [ ] Verify localStorage not blocked
   - [ ] Review recent code changes
   - [ ] Check for known browser bugs

4. **Fix or Workaround:**
   - [ ] Implement fix if browser is supported
   - [ ] Add feature detection if needed
   - [ ] Document workaround if no fix possible
   - [ ] Consider dropping support if usage too low

5. **Verify Fix:**
   - [ ] Test fix in reported browser
   - [ ] Ensure fix doesn't break other browsers
   - [ ] Add regression test
   - [ ] Update documentation

---

## 🛠️ Common Scenarios

### Scenario 1: Adding New PrimeVue Component

```markdown
✅ Checklist:

- [ ] Test component in light theme
- [ ] Test component in dark theme
- [ ] Verify CSS variables applied correctly
- [ ] Check component in Chrome, Firefox, Safari
- [ ] Test mobile rendering
- [ ] Verify accessibility (keyboard nav, ARIA)
```

### Scenario 2: Modifying Theme System

```markdown
✅ Checklist:

- [ ] Test theme toggle in all browsers
- [ ] Verify persistence works (localStorage)
- [ ] Check system preference detection
- [ ] Test transitions smooth (60fps)
- [ ] No FOUC (flash of unstyled content)
- [ ] Document any breaking changes
```

### Scenario 3: Optimizing Performance

```markdown
✅ Checklist:

- [ ] Profile before making changes
- [ ] Test optimizations in multiple browsers
- [ ] Verify no visual regressions
- [ ] Measure performance improvement
- [ ] Document trade-offs
- [ ] Add performance tests
```

### Scenario 4: Fixing Browser-Specific Bug

```markdown
✅ Checklist:

- [ ] Confirm bug exists in reported browser
- [ ] Test in other browsers (ensure not universal)
- [ ] Research known browser issues
- [ ] Implement minimal fix (avoid browser hacks)
- [ ] Test fix doesn't break other browsers
- [ ] Add regression test
- [ ] Document issue and fix
```

---

## 📚 Resources

### Quick Links

**Internal Docs:**

- [Browser Support Policy](./BROWSER_SUPPORT_POLICY.md)
- [Cross-Browser Report](./CROSS_BROWSER_REPORT.md)
- [Visual Testing Guide](./CROSS_BROWSER_VISUAL_TESTS.md)
- [Quick Reference](./BROWSER_QUICK_REFERENCE.md)

**External Resources:**

- [Can I Use](https://caniuse.com/) - Feature compatibility
- [MDN Web Docs](https://developer.mozilla.org/) - Browser compatibility data
- [Playwright Docs](https://playwright.dev/) - Cross-browser testing

### Testing Commands

```bash
# Local development
pnpm dev

# Run tests on all browsers
pnpm test:e2e

# Run tests on specific browser
pnpm test:e2e -- --project=chromium
pnpm test:e2e -- --project=firefox
pnpm test:e2e -- --project=webkit

# Debug tests
pnpm test:e2e -- --debug

# Production build test
pnpm build
pnpm preview
```

### Browser DevTools

**Performance Profiling:**

```
Chrome: F12 → Performance → Record → Profile
Firefox: F12 → Performance → Start Recording
Safari: Develop → Show Web Inspector → Timelines
```

**Accessibility Audit:**

```
Chrome: F12 → Lighthouse → Accessibility
Firefox: F12 → Accessibility
Safari: Develop → Show Web Inspector → Audit
```

---

## ✅ Summary

**Before committing code:**

1. ✅ Tested in Chrome, Firefox, Safari
2. ✅ Verified light and dark themes
3. ✅ Checked responsive design
4. ✅ Added automated tests
5. ✅ Documented browser-specific issues

**Before merging PR:**

1. ✅ Code review completed
2. ✅ All tests passing
3. ✅ Performance acceptable
4. ✅ Accessibility verified
5. ✅ Documentation updated

**Before releasing:**

1. ✅ Full regression test
2. ✅ Mobile testing
3. ✅ Performance baseline
4. ✅ Browser compatibility verified
5. ✅ Known issues documented

---

**Checklist Version:** 1.0
**Last Updated:** 2025-12-22
**Maintained By:** Engineering Team

**Remember:** When in doubt, test in all supported browsers! 🚀
