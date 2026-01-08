# Spec Requirements Document

> Spec: Starter Templates with Working Examples
> Created: 2026-01-08
> Status: Planning

## Overview

Create standalone, production-ready starter templates that developers can copy and use immediately to build VueSip applications. Each template will be a complete, working project with proper configuration, example code, and documentation - enabling developers to make their first call within 5 minutes.

## User Stories

### Quick Start Developer

As a Vue developer evaluating VueSip, I want to clone a working template and see it make a real call, so that I can quickly validate the library works for my use case.

The developer clones a template, runs `pnpm install && pnpm dev`, enters their SIP credentials, and makes a test call - all within 5 minutes. No configuration hunting or boilerplate writing required.

### Enterprise Integrator

As an enterprise developer building a call center application, I want a template with agent login, queue stats, and call controls already wired up, so that I can focus on business logic instead of SIP plumbing.

The developer starts with the call-center template that includes agent dashboard, queue monitoring, and supervisor features. They customize the UI to match their design system while the SIP/AMI integration "just works."

### Startup Builder

As a startup developer adding calling to my SaaS product, I want a minimal template I can embed into my existing Vue app, so that I don't have to restructure my entire application.

The developer copies the minimal template's composable usage patterns into their existing app, following clear examples of how to integrate VueSip with their current architecture.

## Spec Scope

1. **Minimal Template** - Bare-bones VueSip setup with single-file example, no UI framework dependencies
2. **Basic Softphone Template** - Complete softphone with PrimeVue UI, dialpad, call history, device settings
3. **Call Center Template** - Agent dashboard with queue stats, supervisor features, AMI integration
4. **Standalone Repository Structure** - Each template as a self-contained project with its own package.json, README, and configuration

## Out of Scope

- CLI scaffolding tool (separate future spec)
- Video-specific templates (video-call example already exists)
- Conference-specific templates (conference-call example already exists)
- Framework integrations (Nuxt, Quasar - Phase 5 roadmap items)
- Deployment configurations (Docker, Kubernetes)

## Expected Deliverable

1. Three new template directories in `templates/` folder, each runnable with `pnpm install && pnpm dev`
2. Each template includes README with setup instructions, SIP provider configuration examples, and customization guide
3. Templates demonstrate best practices for VueSip integration patterns
