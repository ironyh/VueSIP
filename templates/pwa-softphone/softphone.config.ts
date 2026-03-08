/**
 * FreePBX Softphone Configuration
 * Förkonfigurerad för pbx.telenurse.se
 * 
 * Denna fil används för att bygga en softphone med förkonfigurerade inställningar
 */

export const softphoneConfig = {
  // App-inställningar
  appName: 'Telenurse Softphone',
  appVersion: '1.0.0',
  
  // SIP-server inställningar (förkonfigurerade)
  sip: {
    websocketUrl: 'wss://pbx.telenurse.se/ws',
    domain: 'pbx.telenurse.se',
    stunServers: ['stun.l.google.com:19302'],
  },
  
  // Förkonfigurerade extensions (välj vid inloggning)
  presets: [
    { number: '1001', username: 'nurse_1001', password: 'TestPassword1001!', name: 'Test Nurse 1001' },
    { number: '1002', username: 'nurse_1002', password: 'TestPassword1002!', name: 'Test Nurse 1002' },
    { number: '1003', username: 'nurse_1003', password: 'TestPassword1003!', name: 'Test Nurse 1003' },
    { number: '1004', username: 'nurse_1004', password: 'TestPassword1004!', name: 'Test Nurse 1004' },
    { number: '1005', username: 'nurse_1005', password: 'TestPassword1005!', name: 'Test Nurse 1005' },
  ],
  
  // UI-inställningar
  ui: {
    theme: 'light',
    showDialpad: true,
    showCallHistory: true,
    showContacts: false,
    defaultTab: 'dialpad',
  },
  
  // Ljudinställningar
  audio: {
    ringtone: '/sounds/ringtone.mp3',
    dialtone: '/sounds/dialtone.mp3',
    enableEchoCancellation: true,
    preferredCodec: 'opus',
  },
};

export default softphoneConfig;