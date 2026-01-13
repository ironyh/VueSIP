# VueSIP npm Publication and Growth Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get VueSIP published on npm and establish a continuous improvement cycle for user growth.

**Architecture:** Phase 0 (npm publication) comes first as a prerequisite for all other roadmap items. Subsequent phases focus on discoverability, developer experience, and community building. Each phase builds on the previous to create a growth flywheel.

**Tech Stack:** Vue 3, TypeScript, Vite, npm/pnpm, VitePress documentation

---

## Strategic Context

The FUTURE_ROADMAP.md contains excellent feature plans, but they're useless if no one can `npm install vuesip`. This plan front-loads publication and discoverability work.

**Current State (verified):**
| Aspect | Status |
|--------|--------|
| `package.json` exports | ✅ Ready |
| Build output (dist/) | ✅ 639KB bundle |
| TypeScript declarations | ✅ Generated |
| README | ✅ Has install instructions |
| LICENSE | ✅ MIT |
| `author` field | ⚠️ Empty |

---

## Task 1: Fix package.json Author Field

**Files:**

- Modify: `/home/irony/code/VueSIP/package.json:6`

**Step 1: Update the author field**

Open `package.json` and change line 6 from:

```json
  "author": "",
```

to:

```json
  "author": "ironyh <your-email@example.com>",
```

**Step 2: Verify the change**

Run: `cat package.json | grep author`
Expected: `"author": "ironyh <your-email@example.com>",`

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add author to package.json for npm publication"
```

---

## Task 2: Verify Build and Package Contents

**Files:**

- None (verification only)

**Step 1: Clean and rebuild**

```bash
rm -rf dist/
pnpm run build
```

Expected: Build completes without errors.

**Step 2: Verify dist contents**

Run: `ls -la dist/`
Expected:

- `vuesip.js` (ESM bundle)
- `vuesip.cjs` (CommonJS bundle)
- `index.d.ts` (TypeScript declarations)
- Various `.d.ts` files for types

**Step 3: Check what npm will publish**

Run: `npm pack --dry-run`
Expected: Lists files that will be included:

- `dist/` folder
- `README.md`
- `LICENSE`
- `package.json`

**Step 4: Verify package size**

Run: `npm pack --dry-run 2>&1 | grep "total files"`
Expected: Should report package size (target: <1MB tarball)

---

## Task 3: Publish to npm

**Files:**

- None (npm registry operation)

**Step 1: Login to npm (if not already)**

Run: `npm whoami`

- If error: Run `npm login` and follow prompts
- If shows username: Proceed to next step

**Step 2: Do a final dry-run**

Run: `npm publish --dry-run`
Expected: Shows what would be published, no errors

**Step 3: Publish the package**

Run: `npm publish --access public`
Expected:

```
+ vuesip@1.0.0
```

**Step 4: Verify on npm**

Run: `npm view vuesip`
Expected: Shows package info including version 1.0.0

**Step 5: Test installation**

```bash
mkdir /tmp/test-vuesip && cd /tmp/test-vuesip
npm init -y
npm install vuesip
node -e "console.log(require.resolve('vuesip'))"
```

Expected: Path to installed package

---

## Task 4: Add npm Badge to README

**Files:**

- Modify: `/home/irony/code/VueSIP/README.md:4`

**Step 1: Update the npm badge URL**

The README already has an npm badge on line 4:

```markdown
[![npm version](https://img.shields.io/npm/v/vuesip.svg)](https://www.npmjs.com/package/vuesip)
```

This should now work after publishing. Verify by visiting:
https://img.shields.io/npm/v/vuesip.svg

**Step 2: Add downloads badge after npm version badge**

After line 4, add:

```markdown
[![npm downloads](https://img.shields.io/npm/dm/vuesip.svg)](https://www.npmjs.com/package/vuesip)
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add npm downloads badge to README"
```

---

## Task 5: Create GitHub Release

**Files:**

- None (GitHub operation)

**Step 1: Create a git tag**

```bash
git tag -a v1.0.0 -m "Release v1.0.0 - Initial npm publication"
git push origin v1.0.0
```

**Step 2: Create GitHub release via CLI**

```bash
gh release create v1.0.0 \
  --title "VueSIP v1.0.0" \
  --notes "## First Public Release

VueSIP is now available on npm!

\`\`\`bash
npm install vuesip
\`\`\`

### Highlights
- 70 composables for SIP/VoIP applications
- Full TypeScript support
- Vue 3 Composition API
- WebRTC calling with JsSIP adapter
- Call center features (queues, agents, supervisors)
- Real-time transcription support
- 55+ interactive demos

### Documentation
Visit the [documentation site](https://github.com/ironyh/VueSIP) for guides and API reference.
"
```

**Step 3: Verify release**

Run: `gh release view v1.0.0`
Expected: Shows the release details

---

## Task 6: Announce on Vue Community Channels

**Files:**

- Create: `/home/irony/code/VueSIP/claudedocs/ANNOUNCEMENTS.md`

**Step 1: Create announcement template document**

Create file with content:

```markdown
# VueSIP Announcement Templates

## Twitter/X Post
```

🎉 VueSIP v1.0.0 is now on npm!

A headless Vue.js library for SIP/VoIP applications:
✅ 70 composables
✅ Full TypeScript
✅ Call center features
✅ Real-time transcription
✅ WebRTC calling

npm install vuesip

https://github.com/ironyh/VueSIP

#vuejs #webrtc #voip #typescript

```

## Reddit r/vuejs Post
```

Title: [Library] VueSIP - Headless Vue.js composables for SIP/VoIP applications

Hey Vue community!

I just published VueSIP to npm - a headless component library for building SIP/VoIP applications.

**What it does:**

- 70+ composables for call management, media devices, conferencing, etc.
- Works with Asterisk, FreePBX, and other SIP servers
- Full TypeScript support
- You control the UI, we handle the business logic

**Install:**
npm install vuesip

**GitHub:** https://github.com/ironyh/VueSIP

**Why headless?**
Every VoIP app needs different UI - call centers look different from consumer apps. VueSIP gives you all the logic without forcing any UI decisions.

Would love feedback from anyone building VoIP/WebRTC apps!

```

## Vue Discord
```

Hey everyone! Just released VueSIP v1.0.0 on npm - a headless library for building SIP/VoIP apps with Vue 3.

70 composables for calls, conferencing, call centers, transcription, and more. Full TypeScript support.

npm install vuesip
GitHub: https://github.com/ironyh/VueSIP

Happy to answer any questions!

```

```

**Step 2: Commit**

```bash
git add claudedocs/ANNOUNCEMENTS.md
git commit -m "docs: add community announcement templates"
```

---

## Task 7: Set Up Automated Publishing with GitHub Actions

**Files:**

- Create: `/home/irony/code/VueSIP/.github/workflows/publish.yml`

**Step 1: Create the workflow file**

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Type check
        run: pnpm run typecheck

      - name: Run tests
        run: pnpm run test:unit

      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Step 2: Verify workflow syntax**

Run: `cat .github/workflows/publish.yml | head -20`
Expected: Shows the workflow file without syntax errors

**Step 3: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: add automated npm publish workflow on release"
```

**Step 4: Set up NPM_TOKEN secret (manual step)**

Go to:

1. npm → Account Settings → Access Tokens → Generate New Token (Automation)
2. GitHub repo → Settings → Secrets and variables → Actions → New repository secret
3. Name: `NPM_TOKEN`, Value: [the npm token]

---

## Task 8: Create CONTRIBUTING.md for Community Growth

**Files:**

- Create: `/home/irony/code/VueSIP/CONTRIBUTING.md`

**Step 1: Create the contributing guide**

````markdown
# Contributing to VueSIP

Thank you for your interest in contributing to VueSIP! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/VueSIP.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature`

## Development Setup

```bash
# Install dependencies
pnpm install

# Start development playground
pnpm run dev

# Run tests
pnpm run test

# Build the library
pnpm run build

# Type check
pnpm run typecheck

# Lint
pnpm run lint
```
````

## Project Structure

```
src/
├── composables/     # Vue composables (the core of VueSIP)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── providers/       # SIP provider integrations
└── transcription/   # Transcription features
```

## Coding Standards

- **TypeScript**: All code must be fully typed
- **Tests**: New features must include unit tests
- **Documentation**: Public APIs must have JSDoc comments
- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)

## Adding a New Composable

1. Create the composable in `src/composables/`
2. Export it from `src/index.ts`
3. Add unit tests in `tests/unit/composables/`
4. Add a playground demo in `playground/demos/`
5. Add documentation in `docs/`

## Testing

```bash
# Run all tests
pnpm run test

# Run unit tests only
pnpm run test:unit

# Run with coverage
pnpm run coverage

# Run E2E tests
pnpm run test:e2e
```

## Pull Request Process

1. Update documentation if needed
2. Add/update tests for your changes
3. Run `pnpm run lint` and fix any issues
4. Run `pnpm run typecheck` and fix any issues
5. Run `pnpm run test` and ensure all tests pass
6. Submit your PR with a clear description

## Good First Issues

Look for issues labeled `good first issue` - these are great for newcomers!

## Questions?

Open an issue or start a discussion on GitHub.

````

**Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md for community contributions"
````

---

## Task 9: Add "Good First Issue" Labels and Create Starter Issues

**Files:**

- None (GitHub operation)

**Step 1: Create label via CLI**

```bash
gh label create "good first issue" --description "Good for newcomers" --color 7057ff
gh label create "help wanted" --description "Extra attention is needed" --color 008672
gh label create "documentation" --description "Improvements or additions to documentation" --color 0075ca
```

**Step 2: Create a few starter issues**

```bash
gh issue create \
  --title "docs: Add more usage examples to README" \
  --body "The README could use more real-world usage examples showing common patterns like:
- Handling incoming calls
- Call transfer workflow
- Conference call setup

This is a good first issue for someone getting familiar with the codebase." \
  --label "good first issue,documentation"

gh issue create \
  --title "docs: Add troubleshooting guide" \
  --body "Create a troubleshooting guide covering common issues:
- WebSocket connection failures
- Audio/video device permissions
- SRTP/DTLS errors
- NAT traversal issues

Location: docs/guides/troubleshooting.md" \
  --label "good first issue,documentation"

gh issue create \
  --title "test: Increase test coverage for useCallHistory" \
  --body "The useCallHistory composable could use more test coverage. Current tests don't cover:
- Filtering by date range
- Export to CSV format
- Edge cases with malformed data

See: tests/unit/composables/" \
  --label "good first issue,help wanted"
```

---

## Task 10: Update FUTURE_ROADMAP.md with Phase 0

**Files:**

- Modify: `/home/irony/code/VueSIP/claudedocs/FUTURE_ROADMAP.md`

**Step 1: Add Phase 0 section after Strategic Pillars**

After line 53 (after `---` following Strategic Pillars), insert:

```markdown
## Phase 0: npm Publication (Prerequisite) ✅

> **Status:** COMPLETED - VueSIP is now on npm!

### 0.1 Publication Tasks

| Task                   | Status      | Notes                    |
| ---------------------- | ----------- | ------------------------ |
| Fill `author` field    | ✅ Complete | package.json updated     |
| Verify build           | ✅ Complete | 639KB bundle             |
| Publish to npm         | ✅ Complete | v1.0.0                   |
| GitHub Release         | ✅ Complete | v1.0.0 tag               |
| Community Announcement | ✅ Complete | Reddit, Discord, Twitter |
| CI/CD for publishing   | ✅ Complete | GitHub Actions workflow  |
| CONTRIBUTING.md        | ✅ Complete | Community guidelines     |

### 0.2 Growth Infrastructure

| Task                    | Status      | Notes                         |
| ----------------------- | ----------- | ----------------------------- |
| npm badges in README    | ✅ Complete | Version + downloads           |
| Good first issues       | ✅ Complete | 3 starter issues created      |
| Labels for contributors | ✅ Complete | good first issue, help wanted |

---
```

**Step 2: Commit**

```bash
git add claudedocs/FUTURE_ROADMAP.md
git commit -m "docs: add completed Phase 0 to FUTURE_ROADMAP"
```

---

## Task 11: Final Verification and Push

**Files:**

- None (verification and git operations)

**Step 1: Run full test suite**

```bash
pnpm run lint
pnpm run typecheck
pnpm run test:unit
```

Expected: All pass

**Step 2: Push all commits**

```bash
git push origin feature/conference-enhancements
```

**Step 3: Create PR for the publication work**

```bash
gh pr create \
  --title "feat: npm publication infrastructure and community setup" \
  --body "## Summary
This PR sets up VueSIP for npm publication and community growth:

- ✅ Fixed package.json author field
- ✅ Added npm downloads badge
- ✅ Created GitHub Actions publish workflow
- ✅ Added CONTRIBUTING.md
- ✅ Created community announcement templates
- ✅ Updated FUTURE_ROADMAP.md with Phase 0
- ✅ Created good-first-issue labels and starter issues

## Test Plan
- [ ] Verify build: \`pnpm run build\`
- [ ] Verify tests: \`pnpm run test:unit\`
- [ ] Verify npm pack: \`npm pack --dry-run\`

After merge, will manually:
1. \`npm publish --access public\`
2. Create GitHub release v1.0.0
3. Post announcements to Vue community
"
```

---

## Post-Publication: Continuous Improvement Cycle

After completing Tasks 1-11, establish this ongoing cycle:

### Weekly Checklist

- [ ] Check npm download stats
- [ ] Respond to GitHub issues
- [ ] Review and merge community PRs
- [ ] Update dependencies if needed

### Monthly Checklist

- [ ] Publish patch/minor versions with improvements
- [ ] Write a blog post or tutorial
- [ ] Engage on Vue community channels
- [ ] Review and update documentation

### Quarterly Checklist

- [ ] Major feature release (from FUTURE_ROADMAP phases)
- [ ] Gather user feedback for roadmap prioritization
- [ ] Review competitive landscape
- [ ] Update strategic direction if needed

---

## Success Metrics

Track these to measure growth:

| Metric               | Baseline | 30-Day Target | 90-Day Target |
| -------------------- | -------- | ------------- | ------------- |
| npm weekly downloads | 0        | 100           | 500           |
| GitHub stars         | current  | +50           | +200          |
| Open issues          | 0        | 10            | 30            |
| Contributors         | 1        | 3             | 5             |
| Documentation pages  | current  | +5            | +15           |

---

## Files Modified/Created Summary

| File                            | Action                          |
| ------------------------------- | ------------------------------- |
| `package.json`                  | MODIFY - Add author             |
| `README.md`                     | MODIFY - Add downloads badge    |
| `.github/workflows/publish.yml` | CREATE - Automated publishing   |
| `CONTRIBUTING.md`               | CREATE - Contribution guide     |
| `claudedocs/ANNOUNCEMENTS.md`   | CREATE - Announcement templates |
| `claudedocs/FUTURE_ROADMAP.md`  | MODIFY - Add Phase 0            |
