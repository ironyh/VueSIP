# Troubleshooting Guide

This guide covers common issues encountered when building SIP/VoIP applications with VueSIP and their solutions.

## Table of Contents

- [WebSocket Connection Issues](#websocket-connection-issues)
- [Audio/Video Device Problems](#audiovideo-device-problems)
- [SRTP/DTLS Errors](#srtpdtls-errors)
- [NAT Traversal Issues](#nat-traversal-issues)
- [Registration Failures](#registration-failures)
- [Call Quality Issues](#call-quality-issues)

---

## WebSocket Connection Issues

### Symptom: WebSocket fails to connect, no SIP registration

**Possible Causes:**

- Incorrect WebSocket URL
- Firewall blocking WebSocket traffic
- TLS/SSL certificate issues
- Server not accepting connections

**Solutions:**

1. **Verify WebSocket URL format:**

   ```typescript
   const config = {
     uri: 'wss://your-sip-server.com:8089/ws', // Must use wss:// for TLS
     // or
     uri: 'ws://your-sip-server.com:8088/ws', // Non-TLS (not recommended)
   }
   ```

2. **Check firewall rules:**
   - Ensure ports 443 (wss) or 80 (ws) are open
   - Check if your SIP server requires specific ports

3. **Enable debug logging:**

   ```typescript
   import { createVueSip } from 'vuesip'

   app.use(
     createVueSip({
       debug: true,
       logLevel: 'debug',
     })
   )
   ```

4. **Check server certificates:**
   - Ensure your server has a valid TLS certificate
   - For self-signed certificates, you may need to configure the SIP adapter

### Symptom: Connection drops frequently

**Possible Causes:**

- Network instability
- Server-side connection timeout
- Keep-alive not configured

**Solutions:**

1. **Enable connection recovery:**

   ```typescript
   const { connectionRecovery, reconnect } = useConnectionRecovery({
     enabled: true,
     maxAttempts: 5,
     backoffMs: 1000,
   })
   ```

2. **Configure transport keep-alive:**
   ```typescript
   const config = {
     transport: {
       keepAlive: true,
       keepAliveInterval: 30,
     },
   }
   ```

---

## Audio/Video Device Problems

### Symptom: No audio in calls

**Possible Causes:**

- Microphone permissions denied
- Audio device not selected
- Browser blocking audio autoplay

**Solutions:**

1. **Request permissions explicitly:**

   ```typescript
   const { requestPermissions, hasPermissions } = useMediaDevices()

   await requestPermissions()
   console.log('Audio permissions:', hasPermissions.value)
   ```

2. **List and select audio devices:**

   ```typescript
   const { audioInputs, selectAudioInput } = useAudioDevices()

   const microphones = audioInputs.value
   if (microphones.length > 0) {
     await selectAudioInput(microphones[0].deviceId)
   }
   ```

3. **Check browser console for errors:**
   - Look for `NotAllowedError` - permissions issue
   - Look for `NotFoundError` - device not connected

### Symptom: Can hear but cannot speak

**Possible Causes:**

- Microphone muted in UI
- Microphone disabled by browser
- Device enumeration issue

**Solutions:**

1. **Check call controls:**

   ```typescript
   const { isMuted, toggleMute } = useCallControls()

   if (isMuted.value) {
     await toggleMute() // Unmute
   }
   ```

2. **Verify device is not disabled:**

   ```typescript
   const { audioInputs } = useAudioDevices()

   for (const device of audioInputs.value) {
     console.log(device.label, device.deviceId)
   }
   ```

### Symptom: Video not showing

**Possible Causes:**

- Camera permissions denied
- Video device not available
- Browser doesn't support getUserMedia

**Solutions:**

1. **Request video permissions:**

   ```typescript
   const { requestPermissions } = useMediaDevices()

   await requestPermissions({
     video: true,
     audio: true,
   })
   ```

2. **Check device capabilities:**

   ```typescript
   const { videoInputs } = useMediaDevices()

   const cameras = videoInputs.value
   if (cameras.length === 0) {
     console.error('No cameras found')
   }
   ```

---

## SRTP/DTLS Errors

### Symptom: SRTP negotiation fails, call drops

**Possible Causes:**

- Server doesn't support SRTP
- DTLS certificate mismatch
- Firewall blocking DTLS ports

**Solutions:**

1. **Check SIP adapter configuration:**

   ```typescript
   const config = {
     srtp: {
       enabled: true,
       mode: 'sdes', // or 'dtls'
     },
   }
   ```

2. **Verify DTLS ports are open:**
   - UDP ports 1024-65535 for DTLS media
   - Ensure NAT allows incoming UDP traffic

3. **Check server capabilities:**
   - Contact your SIP server administrator
   - Verify server supports SDES or DTLS

---

## NAT Traversal Issues

### Symptom: One-way audio or no audio through NAT

**Possible Causes:**

- NAT firewall blocking media
- ICE candidates not properly configured
- STUN/TURN servers not configured

**Solutions:**

1. **Configure ICE servers:**

   ```typescript
   const config = {
     rtcConfiguration: {
       iceServers: [
         { urls: 'stun:stun.l.google.com:19302' },
         {
           urls: 'turn:your-turn-server.com:3478',
           username: 'user',
           credential: 'password',
         },
       ],
     },
   }
   ```

2. **Check ICE candidate gathering:**

   ```typescript
   const { connectionStats } = useCallSession()

   // Monitor ICE connection state
   connectionStats.value.iceConnectionState
   ```

3. **Use TURN for symmetric NAT:**
   - Deploy a TURN server for reliable NAT traversal
   - Commercial options: Twilio, Metered, OpenRelay

---

## Registration Failures

### Symptom: SIP registration fails with 403 Forbidden

**Possible Causes:**

- Invalid credentials
- Wrong authentication username
- Domain/realm mismatch

**Solutions:**

1. **Verify credentials:**

   ```typescript
   const config = {
     sipUri: 'sip:username@your-domain.com',
     password: 'your-password',
     authenticationUsername: 'username', // May differ from SIP URI user
   }
   ```

2. **Check authentication settings:**

   ```typescript
   const { registrationState, register, unregister } = useSipRegistration()

   console.log('Registration state:', registrationState.value)
   ```

### Symptom: Registration fails with 404 Not Found

**Possible Causes:**

- Incorrect SIP URI
- User not provisioned on server
- Domain routing issue

**Solutions:**

1. **Verify SIP URI format:**

   ```
   sip:username@domain.com
   ```

2. **Contact your VoIP provider:**
   - Verify your account is active
   - Check domain settings in provider portal

---

## Call Quality Issues

### Symptom: Poor audio quality, choppy audio

**Possible Causes:**

- Network congestion
- High latency
- Insufficient bandwidth
- Codec incompatibility

**Solutions:**

1. **Monitor call quality:**

   ```typescript
   const { callQualityScore, connectionStats } = useCallQualityScore()

   console.log('Quality score:', callQualityScore.value)
   console.log('Packet loss:', connectionStats.value.packetsLost)
   ```

2. **Enable bandwidth adaptation:**

   ```typescript
   const { bandwidthAdaptation } = useBandwidthAdaptation({
     enabled: true,
     targetBitrate: 64000, // 64 kbps
   })
   ```

3. **Use a more robust codec:**
   ```typescript
   const config = {
     codecs: {
       audio: ['PCMU', 'PCMA'], // G.711 u-law and a-law
     },
   }
   ```

### Symptom: High latency in calls

**Possible Causes:**

- Geographic distance from server
- Network routing issues
- Server load

**Solutions:**

1. **Use nearest server:**
   - Select closest POP for your SIP provider
   - Consider geo-DNS for global deployments

2. **Check network path:**

   ```typescript
   const { connectionStats } = useCallSession()

   console.log('Round-trip time:', connectionStats.value.rtt)
   ```

---

## Getting More Help

If you're still experiencing issues:

1. **Enable debug logging** and capture the output
2. **Check browser WebRTC internals**: Navigate to `chrome://webrtc-internals` in Chrome
3. **Review server logs** from your SIP provider
4. **Open an issue** on GitHub with:
   - VueSIP version
   - Browser and version
   - SIP server (and provider if applicable)
   - Debug logs
   - Steps to reproduce

---

## Related Documentation

- [Error Handling Guide](../guide/error-handling.md)
- [Getting Started](../guide/getting-started.md)
- [Provider Configuration](../guide/provider-selector.md)
- [Security Best Practices](../guide/security.md)
