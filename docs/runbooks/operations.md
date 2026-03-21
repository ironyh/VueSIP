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

### WebRTC Issues

**getUserMedia fails with NotAllowedError**

- User denied microphone permission → show permission request UI
- Browser blocked autoplay → request on user gesture
- Solution: Use `useMediaPermissions` composable for guided flow

**getUserMedia fails with NotFoundError**

- No microphone connected → show device selection UI
- Device disconnected → listen for `devicechange` events
- Solution: Use `useAudioDevices` composable for device enumeration

**getUserMedia fails with NotReadableError**

- Another app is using the microphone (Zoom, Teams, etc.)
- On macOS: check System Preferences → Security & Privacy → Microphone
- Solution: Close other apps or use `useAudioDeviceSwitch` to let user choose

**One-way audio (can hear but can't be heard)**

- Check NAT/firewall: UDP port 10000-20000 needs to be open
- Missing STUN/TURN for external users → configure in SipClient config
- Solution: Use `useCallQualityScore` to diagnose

**Audio quality poor / choppy**

- Network congestion → check bandwidth, enable Opus codec
- High latency → verify TURN servers are configured
- CPU overload → reduce processing (disable video, lower sample rate)

**WebRTC connection fails to establish**

- TLS/SSL certificate issues → ensure valid cert or use wss://
- Firewall blocking WebSocket → use port 443 or configure proxy
- Check browser console for specific ICE/SDP errors

**ICE candidate gathering timeout**

- Usually indicates network/firewall issue
- Configure TURN server for reliable NAT traversal
- Check `iceCandidatePoolSize` in config (try 10)

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

### Provider-Specific Issues (FreePBX/Asterisk)

**Failed to connect to AMI (Asterisk Manager Interface)**

- Verify AMI is enabled in FreePBX: Settings → Asterisk Manager Interface
- Check username/password credentials match your config
- Verify firewall allows access to port 5038 (or configured AMI port)
- Ensure "Write" permissions are enabled for your AMI user

**Agent login fails**

- Verify agent is created in FreePBX queue configuration
- Check agent extension exists and is available
- Ensure proper queue membership and penalty settings
- Check AST_HOOK function (if using fancy extensions)

**Queue calls not arriving**

- Verify queue is properly configured with members
- Check queue timeout and retry settings
- Ensure agents are logged in and available (not in wrap-up)
- Check for queue paused orbusy agents: `queue show` in Asterisk CLI

**CDR (Call Detail Records) not logging**

- Verify CDR is enabled in FreePBX Advanced Settings
- Check MySQL/MariaDB connection for CDR database
- Ensure proper permissions for CDR write user
- Check `cdr_adaptive_odbc` module is loaded

**Voicemail not working**

- Verify voicemail extension is configured in FreePBX
- Check voicemail storage directory permissions
- Ensure email settings are configured for voicemail-to-email
- Check for disk space on voicemail storage

**Presence/BLF not updating**

- Verify FreePBX presence is enabled
- Check SIP peer is properly configured for `busy` detection
- Ensure proper `hint` extensions are set in extensions_custom.conf
- Verify NAT settings don't block NOTIFY packets

**Call recording not starting**

- Verify FreePBX recording is enabled for the extension/queue
- Check storage location has proper permissions
- Ensure enough disk space for recordings
- Verify MixMonitor path is correct in Asterisk config

**TTS (Text-to-Speech) not working**

- Verify TTS engine is installed (e.g., Google TTS, Festival)
- Check AGI script permissions
- Ensure network access for external TTS APIs
- Verify temp directory is writable

## Monitoring

### Key Metrics

- Call success rate (target: >99%)
- Average call duration
- Reconnection frequency
- Audio quality scores

### Essential Health Checks

Run these checks in production to verify system health:

```bash
# 1. Verify build integrity
pnpm run build  # Should complete without errors

# 2. Run unit tests
pnpm run test:unit  # All tests should pass

# 3. Check for TypeScript errors
pnpm exec tsc --noEmit  # Should have no errors
```

### Retry and Resilience Patterns

VueSIP provides utilities for handling transient failures:

```typescript
import { useTransportRecovery } from 'vuesip'

const { isReconnecting, connectionAttempts, lastError, retryAfter } = useTransportRecovery(client, {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
})

// Monitor reconnection state
watch(isReconnecting, (reconnecting) => {
  if (reconnecting) {
    console.log(`Reconnecting... attempt ${connectionAttempts.value}`)
  }
})
```

### Circuit Breaker Pattern

For provider-level resilience, implement circuit breaker logic:

```typescript
import { ref, computed } from 'vue'

class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  private readonly failureThreshold = 5
  private readonly resetTimeoutMs = 30000

  get isOpen() {
    if (this.state === 'open') {
      // Check if reset timeout has passed
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'half-open'
        return false
      }
      return true
    }
    return false
  }

  recordSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  recordFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
    }
  }
}
```

### Rate Limiting

When using provider APIs (46elks, Telnyx), implement rate limiting:

```typescript
import { ref } from 'vue'

class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  canProceed(): boolean {
    const now = Date.now()
    this.requests = this.requests.filter((t) => now - t < this.windowMs)
    return this.requests.length < this.maxRequests
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  retryAfterMs(): number {
    if (this.requests.length === 0) return 0
    const oldest = Math.min(...this.requests)
    return Math.max(0, this.windowMs - (Date.now() - oldest))
  }
}

// Example: 46elks API rate limiter (10 req/sec)
const apiLimiter = new RateLimiter(10, 1000)

async function callWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  while (!apiLimiter.canProceed()) {
    await new Promise((r) => setTimeout(r, apiLimiter.retryAfterMs()))
  }
  apiLimiter.recordRequest()
  return fn()
}
```

### Log Levels

Set via environment:

```typescript
import { setLogLevel } from 'vuesip'
setLogLevel('debug') // 'error' | 'warn' | 'info' | 'debug'
```

### Quality Monitoring

VueSIP provides quality monitoring utilities for diagnosing call issues:

```typescript
import {
  calculateMOS,
  calculateQualityScore,
  determineQualityLevel,
  QualityHistoryBuffer
} from 'vuesip'

// Calculate MOS from metrics
const mos = calculateMOS(packetLossPercent, jitterMs, rttMs)

// Determine quality level from score
const level = determineQualityLevel(qualityScore) // 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

// Track quality history
const buffer = new QualityHistoryBuffer(60) // 60 seconds of history
buffer.push({ rtt: 50, jitter: 10, packetLossPercent: 0.5, ... })
const metrics = buffer.getMetrics()
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
