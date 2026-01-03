/**
 * Mock for sip.js library
 *
 * This mock simulates sip.js not being installed.
 * Used during testing to verify the SipJsAdapter handles
 * the library not being available correctly.
 */

// Throw error to simulate module not found
throw new Error('Cannot find module \'sip.js\' - library is not installed')
