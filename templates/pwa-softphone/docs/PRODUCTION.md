# Production Hardening Checklist

This checklist helps you deploy the PWA softphone template in a production-ready way. It covers security, performance, testing, reliability, documentation, and accessibility.

## Security

### Credential storage

- **Current behavior:** The template stores SIP and provider credentials in `localStorage` in plain text (e.g. `vuesip-credentials`, `vuesip_46elks_credentials`, `vuesip_telnyx_credentials`). This is acceptable for development or low-risk environments but is **not recommended for production** on shared or untrusted devices.
- **Recommendations:**
  - For production, prefer **encrypted storage** using VueSIP’s `LocalStorageAdapter` with an encryption password (see VueSIP docs: [Security guide](https://github.com/ironyh/VueSIP/blob/main/docs/guide/security.md) → Credential Storage). Derive the encryption key from a user-provided master password or use a short-lived session key.
  - Alternatively use **server-backed authentication** (e.g. your backend issues short-lived SIP credentials or tokens) so the browser never stores long-lived secrets.
- **Optional improvement:** Add an option in Settings to “Use encrypted credential storage” and wire it to `LocalStorageAdapter` with `encryption: { enabled: true }` and a user-derived key.

### Content Security Policy (CSP)

- **Implemented:** The template’s `index.html` includes a CSP meta tag that restricts script, style, connect, and media sources. This reduces the impact of XSS.
- **Deployment:** For stricter policies (e.g. nonce-based script-src, report-uri), set the `Content-Security-Policy` header on your host (e.g. Cloudflare Pages, Nginx, or your CDN) and remove or relax the meta tag if it conflicts.

### WebSocket and transport

- **SIP:** Use **WSS only** in production for the SIP WebSocket URL (e.g. `wss://sip.example.com:8089/ws`). Do not use `ws://` on public networks.
- **Transcription / other WebSockets:** The transcription settings default to `ws://localhost` for local dev. In production, use **wss** endpoints only and ensure the host is in your CSP `connect-src` if needed.

### XSS / CSRF

- **XSS:** Vue’s templating escapes output by default. Avoid `v-html` with user- or provider-controlled data (e.g. display names, numbers). The CSP above limits script injection.
- **CSRF:** SIP and API calls are made from the browser; use same-origin or CORS for your own APIs and ensure backend uses secure session/cookie and CORS policies.

### API keys

- Do not hardcode API keys or SIP passwords in source. Use environment variables or a secure config service at build or runtime, and restrict keys to the minimum required scope (e.g. per-environment).

---

## Performance

- **Bundle size:** Run `pnpm build` and review `dist/` output. Use dynamic imports for heavy or rarely used flows (e.g. settings, call detail) if needed.
- **Lazy loading:** Consider lazy-loading routes or feature components so the initial load stays small.
- **Memory:** Ensure components and composables unsubscribe and release media/workers on unmount (e.g. no lingering timers or WebSocket handlers). The VueSIP composables and the template’s use of `onUnmounted` should be reviewed for cleanup.
- **Audio/video:** Use the same device IDs where possible to avoid unnecessary device re-acquisition; tune `rtcConfiguration` (STUN/TURN) for your network.

---

## Testing

- **Unit tests:** Add or extend unit tests for critical composables and components so coverage moves toward >80% for the template.
- **Integration / E2E:** Add Playwright (or similar) E2E tests for core call flows (e.g. connect, incoming call, answer, hang up) and key settings flows.
- **Cross-browser / devices:** Manually or automatically test on target browsers (Chrome, Firefox, Safari, Edge) and on representative mobile devices.

---

## Reliability

- **Error monitoring:** Integrate an error reporting service (e.g. Sentry) in production builds. Catch unhandled promise rejections and global errors and report with minimal PII (no credentials in reports).
- **Analytics / call quality:** Optionally report anonymized call quality metrics (e.g. connection success, duration) to your backend or analytics provider.
- **Performance monitoring:** Use the browser Performance API or your hosting provider’s RUM to monitor load times and core Web Vitals.

---

## Documentation

- **Deployment:** Document how to build, deploy, and configure the app on your hosting (e.g. Cloudflare Pages, Vercel, or static + CDN). Include environment variables and any required headers (e.g. CSP, CORS).
- **Configuration:** Maintain a short configuration reference (SIP URI, WebSocket URL, push subscription, optional feature flags).
- **Troubleshooting:** Add a troubleshooting section (e.g. no audio, registration failures, push not working) and point to VueSIP docs and browser console/debug logs.

---

## Accessibility

- **WCAG 2.1 AA:** Review forms, buttons, and call UI for contrast, focus indicators, and labels. Ensure interactive elements are keyboard accessible and that screen readers get meaningful names (e.g. `aria-label` on icon-only buttons).
- **Keyboard:** Verify that dial pad, answer/hang up, mute/hold, and settings can be used with keyboard only.
- **Screen readers:** Test critical flows with a screen reader (e.g. NVDA, VoiceOver) and fix announced labels and live regions (e.g. incoming call, call state).

---

## Quick checklist

- [ ] Credentials: encrypted storage or server-backed auth in production
- [ ] CSP: meta tag present; tighten via server headers if needed
- [ ] WebSockets: WSS only for SIP and other production endpoints
- [ ] No hardcoded API keys or passwords
- [ ] Build and bundle size acceptable; lazy load where useful
- [ ] Unit and E2E tests in place; coverage trend >80%
- [ ] Error monitoring (e.g. Sentry) in production
- [ ] Deployment and configuration docs updated
- [ ] Accessibility: keyboard nav and screen reader tested
