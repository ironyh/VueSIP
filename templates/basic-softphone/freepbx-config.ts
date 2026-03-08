/**
 * FreePBX Custom Softphone Configuration
 * Minimal version för att testa pbx.telenurse.se
 */

// Pre-configured settings - no UI needed
export const config = {
  websocketUrl: 'wss://pbx.telenurse.se/ws',
  domain: 'pbx.telenurse.se',
  extensions: [
    { number: '1001', name: 'Test Nurse 1001', username: 'nurse_1001', password: 'TestPassword1001!' },
    { number: '1002', name: 'Test Nurse 1002', username: 'nurse_1002', password: 'TestPassword1002!' },
    { number: '1003', name: 'Test Nurse 1003', username: 'nurse_1003', password: 'TestPassword1003!' },
    { number: '1004', name: 'Test Nurse 1004', username: 'nurse_1004', password: 'TestPassword1004!' },
    { number: '1005', name: 'Test Nurse 1005', username: 'nurse_1005', password: 'TestPassword1005!' },
  ],
  defaultExtension: '1001',
};

export default config;