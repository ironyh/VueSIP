# VueSIP Operational Runbook

This runbook covers common operational procedures for VueSIP deployments.

## Quick Reference

| Command             | Description             |
| ------------------- | ----------------------- |
| `pnpm run build`    | Build production bundle |
| `pnpm run dev`      | Start dev server        |
| `pnpm run lint`     | Run ESLint              |
| `pnpm run test`     | Run unit tests          |
| `pnpm run test:e2e` | Run E2E tests           |

## Deployment Checklist

### Pre-deployment

1. **Run full test suite**

   ```bash
   pnpm run test
   pnpm run test:e2e
   ```

2. **Run lint and fix**

   ```bash
   pnpm run lint
   ```

3. **Build production bundle**

   ```bash
   pnpm run build
   ```

4. **Verify build output**
   - Check `dist/` directory exists
   - Verify `dist/vuesip.js` size < 1MB

### Deployment

1. **Production build**

   ```bash
   pnpm run build
   ```

2. **Serve dist/ directory** via your hosting provider

### Post-deployment

1. Verify calls work (outbound/inbound)
2. Check browser console for errors
3. Test mobile Safari if supporting iOS

## Common Issues

### Build Failures

**Issue:** `Module not found`

- Run `rm -rf node_modules && pnpm install`

**Issue:** TypeScript errors

- Check `tsc --project tsconfig.build.json` output

### Runtime Issues

**No audio**

- Check browser permissions for microphone
- Verify WebRTC support: `navigator.mediaDevices.getUserMedia({ audio: true })`

**Connection failures**

- Verify SIP server URL is correct
- Check network/firewall allows WebSocket (port 80/443)
- Inspect browser Network tab for WS errors

**Memory leaks**

- Run `pnpm run test:memory` if available
- Check DevTools Memory tab during extended use

## Monitoring

### Key Metrics

- Call success rate (target: >99%)
- Average call duration
- Reconnection frequency
- Audio quality scores

### Log Levels

Set via environment:

```typescript
import { setLogLevel } from 'vuesip'
setLogLevel('debug') // 'error' | 'warn' | 'info' | 'debug'
```

## Rollback Procedure

1. Identify last working version from git tags
2. `git checkout <tag>`
3. `pnpm run build`
4. Redeploy `dist/`

## Health Check Script

```typescript
import { createVuetSIP } from 'vuesip'

const vuetSIP = createVuetSIP()

// Test basic connectivity
async function healthCheck() {
  try {
    await vuetSIP.connect({
      url: 'wss://your-sip-server/ws',
      username: 'test',
      secret: 'test',
    })
    console.log('✓ SIP connection OK')

    vuetSIP.disconnect()
    return true
  } catch (e) {
    console.error('✗ Health check failed:', e)
    return false
  }
}
```

## Support

- Check `docs/guide/troubleshooting.md`
- Review `docs/guide/error-handling.md`
- Search existing GitHub issues
