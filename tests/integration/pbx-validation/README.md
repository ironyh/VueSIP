# PBX Validation Integration Tests

This directory contains integration test stubs for validating VueSIP against real PBX instances.

## Structure

- `pbx-mock-factory.ts` — Factory for creating mock PBX server scenarios (Asterisk, FreePBX)
- `asterisk-validation.test.ts` — Validation stubs for Asterisk PBX compatibility
- `freepbx-validation.test.ts` — Validation stubs for FreePBX compatibility
- `test-data/` — PBX configuration templates and test data

## Usage

These tests are designed as stubs that can be pointed at real PBX instances by configuring
environment variables:

```bash
VUESIP_TEST_PBX_URI=wss://your-pbx:8089/ws
VUESIP_TEST_PBX_USER=1000
VUESIP_TEST_PBX_PASSWORD=secret
VUESIP_TEST_PBX_TYPE=asterisk|freepbx
```

Without real PBX credentials, tests run with mock scenarios.
