# Template Deployment Guide

This guide covers deploying VueSIP templates to Cloudflare Workers, including secrets management, permissions, and local development.

## Prerequisites

- Node.js 18+
- pnpm 8+
- Cloudflare account
- Wrangler CLI (`pnpm install -g wrangler`)

## Quick Deploy

Each template includes a `wrangler.toml` configuration. Deploy with:

```bash
cd templates/<template-name>
pnpm install
pnpm deploy
```

## Cloudflare Secrets

Sensitive configuration (API keys, SIP credentials) should never be committed. Use Cloudflare Secrets:

### Setting Secrets

```bash
# Via wrangler CLI
wrangler secret put SIP_PASSWORD
# Enter your SIP password when prompted

wrangler secret put FREEPBX_API_KEY
wrangler secret put CRM_API_KEY
```

### Reading Secrets in Code

```ts
// Access secrets in your Worker
export default {
  async fetch(request, env) {
    const sipPassword = env.SIP_PASSWORD
    // Use in SIP client configuration
  },
}
```

### Secret Names by Template

| Template        | Required Secrets                                                                   |
| --------------- | ---------------------------------------------------------------------------------- |
| basic-softphone | `SIP_DOMAIN`, `SIP_USERNAME`, `SIP_PASSWORD`                                       |
| call-center     | `SIP_DOMAIN`, `SIP_USERNAME`, `SIP_PASSWORD`, `AMI_HOST`, `AMI_PORT`, `AMI_SECRET` |
| pwa-softphone   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`                                            |

### .env Example

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your values (do not commit .env)
```

## Permissions

### Workers Permissions

When creating the Cloudflare Worker:

1. **Scope**: Workers Bot Management (if using bot detection)
2. **KV Namespaces**: Create bindings for:
   - `SESSION_STORE` - Call session persistence
   - `SETTINGS_STORE` - User preferences
3. **Durable Objects**: If using for real-time sync

### wrangler.toml Bindings

```toml
[[kv_namespaces]]
binding = "SESSION_STORE"
id = "your-namespace-id"

[[durable_objects.bindings]]
name = "PRESENCE"
class_name = "PresenceAgent"
```

### Minimum Required Permissions

| Permission              | Purpose                      |
| ----------------------- | ---------------------------- |
| Workers Scripts         | Deploy and manage worker     |
| Workers KV              | Session/settings storage     |
| Workers R2              | Recording storage (optional) |
| Workers Durable Objects | Real-time state (optional)   |

## Local Development

### Running Locally

```bash
# Start local dev server
pnpm dev

# Specify port if needed
pnpm dev --port 3001
```

### Environment Variables

Create a `.dev.vars` file for local secrets:

```bash
# .dev.vars (add to .gitignore)
SIP_DOMAIN=your.sip.server
SIP_USERNAME=user
SIP_PASSWORD=secret
```

### Testing with Real SIP Server

1. Update `.dev.vars` with production SIP credentials (use test account)
2. Run `pnpm dev`
3. Test calls in browser devtools
4. Check browser console for SIP traffic logs

### Mock Mode

For testing without a real SIP server:

```ts
import { createSipClient } from 'vuesip'

const client = createSipClient({
  mock: true, // Enables mock SIP transport
  // ...other config
})
```

## Production Deployment

### Build First

```bash
pnpm build
```

This generates the `dist/` folder referenced in `wrangler.toml`.

### Deploy Command

```bash
wrangler deploy
```

Or with a specific environment:

```bash
wrangler deploy --env production
```

### CI/CD with GitHub Actions

Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: deploy
```

### Required GitHub Secrets

| Secret          | Where to Get                                |
| --------------- | ------------------------------------------- |
| `CF_API_TOKEN`  | Cloudflare Dashboard → Profile → API Tokens |
| `CF_ACCOUNT_ID` | Cloudflare Dashboard → Overview             |

## Troubleshooting

### Build Failures

- Ensure `pnpm install` completes without errors
- Check Node version matches `package.json` engines field
- Clear `node_modules` and reinstall: `rm -rf node_modules && pnpm install`

### Deployment Errors

- Verify `wrangler.toml` has valid `name` (unique across account)
- Check Cloudflare quotas (free tier: 100k requests/day)
- Ensure compatibility_date format is correct

### Runtime Errors

- Check Cloudflare Workers logs: `wrangler logs`
- Verify secrets are set: `wrangler secret list`
- Test locally first with `pnpm dev`

### SIP Connection Issues

- Confirm SIP server accepts WebSocket connections
- Check CORS settings on SIP server
- Verify TLS certificate is valid
- Test with a SIP client like MicroSIP first

## Security Best Practices

1. **Never commit secrets** - Use `.gitignore` and Cloudflare Secrets
2. **Rotate credentials** - Change SIP passwords monthly
3. **Use minimum permissions** - Don't request more than needed
4. **Enable HTTPS** - Always use TLS for SIP
5. **Rate limiting** - Implement in your Worker if needed
