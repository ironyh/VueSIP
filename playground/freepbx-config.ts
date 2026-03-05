/**
 * FreePBX VueSIP Test Configuration
 * 
 * Server: 192.168.65.129 (Proxmox LXC container #113)
 * WebSocket (extern): wss://pbx.telenurse.se/ws  <-- NY! Via HAProxy
 * WebSocket (intern): ws://192.168.65.129:8088/ws
 * Test Extension: 1001 (password: TestPassword1001!)
 */

export const freepbxConfig = {
  // WebSocket server (via HAProxy/Cloudflare)
  websocketUrl: 'wss://pbx.telenurse.se/ws',
  
  // Fallback: direktanslutning (endast internt nätverk)
  // websocketUrl: 'ws://192.168.65.129:8088/ws',
  
  // Test extensions (from /etc/asterisk/pjsip_websocket.conf)
  extensions: [
    { number: '1001', username: 'nurse_1001', password: 'TestPassword1001!', name: 'Test Nurse 1001' },
    { number: '1002', username: 'nurse_1002', password: 'TestPassword1002!', name: 'Test Nurse 1002' },
    { number: '1003', username: 'nurse_1003', password: 'TestPassword1003!', name: 'Test Nurse 1003' },
    { number: '1004', username: 'nurse_1004', password: 'TestPassword1004!', name: 'Test Nurse 1004' },
    { number: '1005', username: 'nurse_1005', password: 'TestPassword1005!', name: 'Test Nurse 1005' },
  ],
  
  // SIP domain (usually the server IP)
  domain: '192.168.65.129',
  
  // Default extension to use for testing
  defaultExtension: '1001',
};

/**
 * Create a SIP URI for an extension
 */
export function createSipUri(extension: string, domain: string = freepbxConfig.domain): string {
  return `sip:${extension}@${domain}`;
}

/**
 * Get extension config by number
 */
export function getExtensionConfig(number: string = freepbxConfig.defaultExtension) {
  const ext = freepbxConfig.extensions.find(e => e.number === number);
  if (!ext) {
    throw new Error(`Extension ${number} not found in config`);
  }
  return ext;
}