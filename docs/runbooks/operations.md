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

### Provider-Specific Issues (46elks)

**Failed to fetch account list**

- Verify API credentials in config
- Check network can reach `https://api.46elks.com`
- Ensure API key has correct IAM permissions

**Outbound calls fail immediately**

- Verify originate (REST) is enabled on your 46elks account
- Check that your DID numbers are configured for outbound calling
- Verify caller ID (CLID) is properly set in config

**Inbound calls not arriving**

- Ensure your Webhook URL is reachable from 46elks servers
- Check that SIP registration is successful (see registration status)
- Verify DID is correctly mapped to your SIP account

**SMS not working**

- 46elks SMS requires separate webhook configuration
- Verify SMS webhook URL is publicly accessible
- Check that sender number (from) is verified in 46elks dashboard

### Provider-Specific Issues (Telnyx)

**Failed to connect or authenticate**

- Verify API key is valid and has not expired
- Check network can reach `https://api.telnyx.com`
- Ensure your Telnyx workspace is active and in good standing

**Outbound calls fail with "Insufficient permissions"**

- Verify your Telnyx SIP connection has origination enabled
- Check that your calling plan includes outbound voice
- Ensure your caller ID (CLID) is verified in Telnyx portal

**Inbound calls not arriving**

- Verify your webhook endpoint is reachable from Telnyx servers
- Check SIP registration status in Telnyx portal
- Ensure DID number is properly associated with your SIP connection
- Verify TLS/SSL settings match Telnyx requirements

**Call quality issues or one-way audio**

- Check Telnyx connection region matches your geographic location
- Verify STUN/TURN servers are properly configured
- Check for packet loss in Telnyx call logs

**Fax calls failing**

- Ensure T.38 fax mode is enabled if using fax
- Check that your connection supports T.38 passthrough

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
