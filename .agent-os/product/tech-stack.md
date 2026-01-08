# Technical Stack

## Core Framework

- **Vue.js:** 3.4+ (Composition API, script setup)
- **TypeScript:** 5.4 (strict mode enabled)
- **Build Tool:** Vite 7.2

## SIP/WebRTC

- **Primary SIP Library:** JsSIP 3.10 (more features than SIP.js)
- **Secondary SIP Library:** SIP.js (via adapter pattern)
- **WebRTC Adapter:** webrtc-adapter 9.0
- **Architecture:** Adapter pattern for SIP library abstraction

## State Management

- **Store:** Pinia 2.1
- **Reactivity:** Vue 3 Composition API refs/computed
- **Persistence:** IndexedDB, LocalStorage, SessionStorage adapters

## Testing

- **Unit/Integration:** Vitest 4.0
- **E2E Testing:** Playwright 1.48
- **Coverage:** @vitest/coverage-v8
- **Accessibility:** @axe-core/playwright

## Documentation

- **Site Generator:** VitePress 1.5
- **API Docs:** TypeDoc 0.28

## Code Quality

- **Linting:** ESLint 9 with TypeScript and Vue plugins
- **Formatting:** Prettier 3
- **Pre-commit:** Husky 9 with lint-staged

## UI Examples (Playground Only)

- **Component Library:** PrimeVue 3.50
- **Icons:** PrimeIcons 7
- **CSS Utilities:** PrimeFlex

## Deployment

- **Playground Hosting:** Cloudflare Workers (Wrangler)
- **Docs Hosting:** GitHub Pages (via GitHub Actions)
- **Package Registry:** npm

## Repository

- **Package Manager:** pnpm 9.14 (required)
- **Node Version:** 20.0.0+
- **Repository:** https://github.com/ironyh/VueSIP
- **License:** MIT
