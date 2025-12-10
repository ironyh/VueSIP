# OAuth2 Authentication & Auto-Provisioning

This guide covers OAuth2 authentication integration for VueSip applications, enabling automatic user creation and SIP credential provisioning from identity providers like Google, Microsoft, GitHub, Okta, Auth0, and Keycloak.

## Overview

**Why OAuth2 for VoIP?**

Traditional SIP authentication requires users to remember separate credentials for your VoIP system. OAuth2 integration allows users to sign in with their existing identity (Google Workspace, Microsoft 365, corporate SSO) and automatically provision SIP credentials - no manual account setup required.

**VueSip OAuth2 Features:**

- **Single Sign-On** - Users log in with their existing identity provider
- **Auto-Provisioning** - SIP accounts created automatically on first login
- **PKCE Security** - Proof Key for Code Exchange for enhanced SPA security
- **Multiple Providers** - Support for Google, Microsoft, GitHub, Okta, Auth0, Keycloak, and custom providers
- **Token Management** - Automatic token refresh and expiration handling
- **Flexible Credentials** - Multiple strategies for mapping OAuth2 users to SIP credentials

---

## Quick Start

**Want to get started quickly?** Here's a minimal setup using Google OAuth2:

```typescript
import { useOAuth2, createGoogleOAuth2Config } from 'vuesip'

// Configure Google OAuth2 with auto-provisioning
const oauth2 = useOAuth2({
  provider: createGoogleOAuth2Config({
    clientId: 'your-google-client-id.apps.googleusercontent.com',
    redirectUri: 'https://your-app.com/oauth/callback',
  }),
  credentialMapping: {
    usernameField: 'email',
    displayNameField: 'name',
    sipDomain: 'sip.example.com',
    wsServerUri: 'wss://sip.example.com:7443',
    passwordStrategy: { type: 'access_token' },
  },
})

// Login - redirects to Google
async function handleLogin() {
  await oauth2.login()
}

// Handle callback - provision SIP credentials
async function handleCallback() {
  const sipCredentials = await oauth2.handleCallback()

  // Use credentials with SIP client
  console.log('SIP URI:', sipCredentials.sipUri)
  console.log('Username:', sipCredentials.username)
  // sipCredentials.password automatically generated
}
```

---

## Table of Contents

- [Understanding OAuth2 Flow](#understanding-oauth2-flow)
- [Installation & Setup](#installation--setup)
- [Provider Configuration](#provider-configuration)
- [SIP Credential Mapping](#sip-credential-mapping)
- [Using the OAuth2 Composable](#using-the-oauth2-composable)
- [Using the OAuth2 Provider Component](#using-the-oauth2-provider-component)
- [Provider-Specific Setup](#provider-specific-setup)
- [Token Management](#token-management)
- [Security Best Practices](#security-best-practices)
- [Error Handling](#error-handling)
- [Integration Examples](#integration-examples)
- [Enterprise Patterns](#enterprise-patterns)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## Understanding OAuth2 Flow

### Authorization Code Flow with PKCE

VueSip uses the OAuth2 Authorization Code Flow with PKCE (Proof Key for Code Exchange), which is the recommended flow for single-page applications.

**Flow Diagram:**

```
User clicks "Login with Google"
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Generate PKCE (code_verifier)    │
│ 2. Store verifier in session        │
│ 3. Redirect to Google with:         │
│    - client_id                      │
│    - redirect_uri                   │
│    - code_challenge (SHA256)        │
│    - state (CSRF protection)        │
└─────────────────────────────────────┘
         │
         ▼
    Google Login Page
         │
    User authenticates
         │
         ▼
┌─────────────────────────────────────┐
│ Google redirects back with:         │
│ - authorization code                │
│ - state parameter                   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. Exchange code for tokens:        │
│    - Send code + code_verifier      │
│    - Receive access_token, id_token │
│                                     │
│ 5. Fetch user info (email, name)    │
│                                     │
│ 6. Provision SIP credentials:       │
│    - Generate SIP username          │
│    - Generate SIP password          │
│    - Build complete config          │
└─────────────────────────────────────┘
         │
         ▼
    Ready to make calls!
```

**Why PKCE?**

PKCE adds an extra layer of security for SPAs that cannot securely store a client secret. It prevents authorization code interception attacks by requiring proof that the same client that initiated the flow is completing it.

---

## Installation & Setup

### Prerequisites

Ensure you have VueSip installed:

```bash
npm install vuesip
# or
pnpm add vuesip
# or
yarn add vuesip
```

### OAuth2 Provider Setup

You'll need to register your application with your chosen identity provider:

1. **Create OAuth2 Application** - In your provider's developer console
2. **Configure Redirect URI** - Must match exactly (e.g., `https://your-app.com/oauth/callback`)
3. **Get Client ID** - Copy the client ID for your application
4. **Configure Scopes** - Request `openid`, `email`, `profile` at minimum

---

## Provider Configuration

### Provider Configuration Interface

```typescript
interface OAuth2ProviderConfig {
  // Required - Provider identification
  type: 'google' | 'microsoft' | 'github' | 'okta' | 'auth0' | 'keycloak' | 'custom'
  clientId: string
  redirectUri: string

  // Endpoints
  authorizationEndpoint: string
  tokenEndpoint: string
  userInfoEndpoint?: string
  revocationEndpoint?: string

  // OAuth2 settings
  scopes: string[]
  responseType?: string // Default: 'code'
  responseMode?: string // Default: 'query'
  usePKCE?: boolean // Default: true

  // Optional
  clientSecret?: string // For confidential clients
  additionalParams?: Record<string, string>
}
```

### Using Provider Templates

VueSip provides pre-configured templates for common providers:

```typescript
import {
  createGoogleOAuth2Config,
  createMicrosoftOAuth2Config,
  createGitHubOAuth2Config,
  createOktaOAuth2Config,
  createAuth0OAuth2Config,
  createKeycloakOAuth2Config,
} from 'vuesip'

// Google (minimal config)
const googleConfig = createGoogleOAuth2Config({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',
})

// Microsoft with tenant
const microsoftConfig = createMicrosoftOAuth2Config({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',
  tenantId: 'your-tenant-id', // or 'common' for multi-tenant
})

// Okta with domain
const oktaConfig = createOktaOAuth2Config({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',
  domain: 'your-org.okta.com',
})

// Auth0 with domain
const auth0Config = createAuth0OAuth2Config({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',
  domain: 'your-tenant.auth0.com',
})

// Keycloak with realm
const keycloakConfig = createKeycloakOAuth2Config({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',
  domain: 'keycloak.example.com',
  realm: 'your-realm',
})
```

### Custom Provider Configuration

For providers not covered by templates:

```typescript
const customProvider: OAuth2ProviderConfig = {
  type: 'custom',
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',

  // Your provider's endpoints
  authorizationEndpoint: 'https://idp.example.com/oauth2/authorize',
  tokenEndpoint: 'https://idp.example.com/oauth2/token',
  userInfoEndpoint: 'https://idp.example.com/oauth2/userinfo',
  revocationEndpoint: 'https://idp.example.com/oauth2/revoke',

  // Required scopes
  scopes: ['openid', 'email', 'profile'],

  // Enable PKCE (recommended)
  usePKCE: true,

  // Provider-specific parameters
  additionalParams: {
    prompt: 'consent',
    access_type: 'offline', // For refresh tokens
  },
}
```

---

## SIP Credential Mapping

### Credential Mapping Configuration

The `credentialMapping` configuration defines how OAuth2 user info is transformed into SIP credentials:

```typescript
interface SipCredentialMapping {
  // Username mapping
  usernameField: keyof OAuth2UserInfo // 'email', 'preferred_username', 'sub'
  usernameTransformer?: (userInfo: OAuth2UserInfo) => string

  // Display name mapping
  displayNameField?: keyof OAuth2UserInfo
  displayNameTransformer?: (userInfo: OAuth2UserInfo) => string

  // SIP server configuration
  sipDomain: string // e.g., 'sip.example.com'
  wsServerUri: string // e.g., 'wss://sip.example.com:7443'
  sipRealm?: string // For SIP authentication

  // Password generation strategy
  passwordStrategy: SipPasswordStrategy
}
```

### Password Generation Strategies

VueSip supports multiple strategies for generating SIP passwords from OAuth2 tokens:

#### 1. Access Token Strategy

Uses the OAuth2 access token directly as the SIP password:

```typescript
credentialMapping: {
  // ...
  passwordStrategy: {
    type: 'access_token'
  }
}
```

**Use case:** When your SIP server validates OAuth2 access tokens directly.

#### 2. ID Token Strategy

Uses the OIDC ID token as the SIP password:

```typescript
credentialMapping: {
  // ...
  passwordStrategy: {
    type: 'id_token'
  }
}
```

**Use case:** When your SIP server validates OIDC ID tokens.

#### 3. Hash Strategy

Generates a deterministic hash from user info and token:

```typescript
credentialMapping: {
  // ...
  passwordStrategy: {
    type: 'hash',
    algorithm: 'sha256',  // or 'sha512'
    salt: 'your-secret-salt',
  }
}
```

**Use case:** When you need a deterministic password that can be verified server-side.

#### 4. API-Generated Strategy

Calls your backend API to generate the password:

```typescript
credentialMapping: {
  // ...
  passwordStrategy: {
    type: 'api_generated',
    endpoint: 'https://api.example.com/sip/provision',
    method: 'POST',  // or 'GET'
  }
}
```

**Use case:** When password generation requires server-side logic or database access.

#### 5. Static Strategy

Uses a fixed password for all users:

```typescript
credentialMapping: {
  // ...
  passwordStrategy: {
    type: 'static',
    password: 'shared-secret',
  }
}
```

**Use case:** Development/testing only. Not recommended for production.

#### 6. Custom Strategy

Provide your own password generation function:

```typescript
credentialMapping: {
  // ...
  passwordStrategy: {
    type: 'custom',
    generator: async (tokens, userInfo) => {
      // Your custom logic
      const response = await fetch('https://api.example.com/credentials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userInfo.sub }),
      })
      const data = await response.json()
      return data.sipPassword
    },
  }
}
```

### Username Transformation

Transform OAuth2 user info into SIP-compatible usernames:

```typescript
credentialMapping: {
  usernameField: 'email',
  usernameTransformer: (userInfo) => {
    // Extract username from email, sanitize for SIP
    const email = userInfo.email || ''
    return email
      .split('@')[0]           // Remove domain
      .toLowerCase()           // Lowercase
      .replace(/[^a-z0-9._-]/g, '')  // Remove special chars
  },
  // ...
}
```

---

## Using the OAuth2 Composable

### Basic Usage

```typescript
import { useOAuth2, createGoogleOAuth2Config } from 'vuesip'

export default {
  setup() {
    const oauth2 = useOAuth2({
      provider: createGoogleOAuth2Config({
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        redirectUri: `${window.location.origin}/oauth/callback`,
      }),
      credentialMapping: {
        usernameField: 'email',
        displayNameField: 'name',
        sipDomain: 'sip.example.com',
        wsServerUri: 'wss://sip.example.com:7443',
        passwordStrategy: { type: 'access_token' },
      },
    })

    // Destructure reactive state and methods
    const {
      authState, // 'idle' | 'redirecting' | 'exchanging_code' | 'authenticated' | 'error'
      isAuthenticated, // Computed: true when authenticated
      error, // OAuth2Error | null
      userInfo, // OAuth2UserInfo | null
      sipCredentials, // ProvisionedSipCredentials | null
      tokens, // OAuth2TokenResponse | null
      tokenExpiresAt, // Date | null
      isRefreshing, // boolean

      // Methods
      login, // Start OAuth2 flow
      handleCallback, // Handle redirect callback
      logout, // Clear auth and revoke tokens
      refreshTokens, // Manually refresh tokens
      getAccessToken, // Get current access token (auto-refresh)
      isTokenExpired, // Check if token needs refresh
      clearAuth, // Clear local auth state
    } = oauth2

    return {
      authState,
      isAuthenticated,
      error,
      userInfo,
      sipCredentials,
      login,
      logout,
    }
  },
}
```

### Complete Login Flow Example

```vue
<template>
  <div class="oauth-login">
    <!-- Not authenticated -->
    <div v-if="!isAuthenticated" class="login-section">
      <h2>Sign In</h2>

      <!-- Loading state -->
      <div v-if="authState === 'redirecting' || authState === 'exchanging_code'">
        <p>Authenticating...</p>
      </div>

      <!-- Error display -->
      <div v-if="error" class="error">
        <p>{{ error.error_description || error.error }}</p>
        <button @click="clearError">Dismiss</button>
      </div>

      <!-- Login buttons -->
      <div v-else class="login-buttons">
        <button @click="loginWithGoogle" class="btn-google">Sign in with Google</button>
        <button @click="loginWithMicrosoft" class="btn-microsoft">Sign in with Microsoft</button>
      </div>
    </div>

    <!-- Authenticated -->
    <div v-else class="authenticated-section">
      <h2>Welcome, {{ userInfo?.name }}</h2>
      <p>Email: {{ userInfo?.email }}</p>

      <div class="sip-credentials">
        <h3>SIP Credentials</h3>
        <p>SIP URI: {{ sipCredentials?.sipUri }}</p>
        <p>Server: {{ sipCredentials?.wsServerUri }}</p>
        <p>Display Name: {{ sipCredentials?.displayName }}</p>
      </div>

      <button @click="handleLogout" class="btn-logout">Sign Out</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useOAuth2, createGoogleOAuth2Config, createMicrosoftOAuth2Config } from 'vuesip'

// Google OAuth2
const googleOAuth = useOAuth2({
  provider: createGoogleOAuth2Config({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirectUri: `${window.location.origin}/oauth/callback`,
  }),
  credentialMapping: {
    usernameField: 'email',
    displayNameField: 'name',
    sipDomain: 'sip.example.com',
    wsServerUri: 'wss://sip.example.com:7443',
    passwordStrategy: { type: 'access_token' },
  },
})

// Microsoft OAuth2
const microsoftOAuth = useOAuth2({
  provider: createMicrosoftOAuth2Config({
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    redirectUri: `${window.location.origin}/oauth/callback`,
    tenantId: 'common',
  }),
  credentialMapping: {
    usernameField: 'preferred_username',
    displayNameField: 'name',
    sipDomain: 'sip.example.com',
    wsServerUri: 'wss://sip.example.com:7443',
    passwordStrategy: { type: 'access_token' },
  },
})

// Use Google as primary (or switch based on stored preference)
const {
  authState,
  isAuthenticated,
  error,
  userInfo,
  sipCredentials,
  login,
  logout,
  handleCallback,
  clearAuth,
} = googleOAuth

// Login handlers
async function loginWithGoogle() {
  await login()
}

async function loginWithMicrosoft() {
  await microsoftOAuth.login()
}

async function handleLogout() {
  await logout()
}

function clearError() {
  clearAuth()
}

// Handle callback on mount (for callback page)
onMounted(async () => {
  // Check if this is a callback URL
  const url = new URL(window.location.href)
  if (url.searchParams.has('code')) {
    try {
      const credentials = await handleCallback()
      console.log('Authenticated!', credentials.sipUri)
      // Redirect to main app
      window.location.href = '/'
    } catch (err) {
      console.error('Auth failed:', err)
    }
  }
})
</script>
```

---

## Using the OAuth2 Provider Component

### Provider Component

For larger applications, use the `OAuth2Provider` component to share authentication state across your component tree:

```vue
<!-- App.vue -->
<template>
  <OAuth2Provider
    :config="oauth2Config"
    :auto-initialize="true"
    @authenticated="onAuthenticated"
    @error="onError"
    @logout="onLogout"
  >
    <template #default="{ authState, sipCredentials, login, logout }">
      <RouterView />
    </template>
  </OAuth2Provider>
</template>

<script setup lang="ts">
import { OAuth2Provider, createGoogleOAuth2Config } from 'vuesip'
import type { ProvisionedSipCredentials, OAuth2Error } from 'vuesip'

const oauth2Config = {
  provider: createGoogleOAuth2Config({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirectUri: `${window.location.origin}/oauth/callback`,
  }),
  credentialMapping: {
    usernameField: 'email',
    displayNameField: 'name',
    sipDomain: 'sip.example.com',
    wsServerUri: 'wss://sip.example.com:7443',
    passwordStrategy: { type: 'access_token' },
  },
}

function onAuthenticated(credentials: ProvisionedSipCredentials) {
  console.log('User authenticated:', credentials.sipUri)
}

function onError(error: OAuth2Error) {
  console.error('Auth error:', error)
}

function onLogout() {
  console.log('User logged out')
}
</script>
```

### Consuming Provider Context

In child components, use injection hooks to access OAuth2 state:

```vue
<!-- ChildComponent.vue -->
<script setup lang="ts">
import { useOAuth2Provider, useOAuth2Credentials } from 'vuesip'

// Get full OAuth2 context
const oauth2 = useOAuth2Provider()

// Or just get SIP credentials
const credentials = useOAuth2Credentials()

// Use in your component
if (oauth2.isAuthenticated.value) {
  console.log('User:', oauth2.userInfo.value?.name)
  console.log('SIP URI:', credentials.value?.sipUri)
}
</script>
```

---

## Provider-Specific Setup

### Google OAuth2

**1. Create OAuth2 Credentials:**

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing
- Navigate to APIs & Services > Credentials
- Click "Create Credentials" > "OAuth 2.0 Client IDs"
- Select "Web application"
- Add authorized redirect URIs

**2. Configure in VueSip:**

```typescript
const googleConfig = createGoogleOAuth2Config({
  clientId: 'xxxxx.apps.googleusercontent.com',
  redirectUri: 'https://your-app.com/oauth/callback',
  // Optional: request offline access for refresh tokens
  additionalParams: {
    access_type: 'offline',
    prompt: 'consent',
  },
})
```

### Microsoft Azure AD

**1. Register Application:**

- Go to [Azure Portal](https://portal.azure.com/)
- Navigate to Azure Active Directory > App registrations
- Click "New registration"
- Configure redirect URIs and supported account types

**2. Configure in VueSip:**

```typescript
const microsoftConfig = createMicrosoftOAuth2Config({
  clientId: 'your-azure-app-client-id',
  redirectUri: 'https://your-app.com/oauth/callback',
  tenantId: 'your-tenant-id', // or 'common' for multi-tenant
})
```

### GitHub

**1. Create OAuth App:**

- Go to GitHub Settings > Developer settings > OAuth Apps
- Click "New OAuth App"
- Configure application details and callback URL

**2. Configure in VueSip:**

```typescript
const githubConfig = createGitHubOAuth2Config({
  clientId: 'your-github-client-id',
  redirectUri: 'https://your-app.com/oauth/callback',
})
```

### Okta

**1. Create Application:**

- Log in to Okta Admin Console
- Navigate to Applications > Create App Integration
- Select "OIDC - OpenID Connect" and "Single-Page Application"

**2. Configure in VueSip:**

```typescript
const oktaConfig = createOktaOAuth2Config({
  clientId: 'your-okta-client-id',
  redirectUri: 'https://your-app.com/oauth/callback',
  domain: 'your-org.okta.com',
})
```

### Auth0

**1. Create Application:**

- Log in to Auth0 Dashboard
- Navigate to Applications > Create Application
- Select "Single Page Application"

**2. Configure in VueSip:**

```typescript
const auth0Config = createAuth0OAuth2Config({
  clientId: 'your-auth0-client-id',
  redirectUri: 'https://your-app.com/oauth/callback',
  domain: 'your-tenant.auth0.com',
})
```

### Keycloak

**1. Create Client:**

- Log in to Keycloak Admin Console
- Navigate to your realm > Clients > Create
- Set Access Type to "public" for SPAs

**2. Configure in VueSip:**

```typescript
const keycloakConfig = createKeycloakOAuth2Config({
  clientId: 'your-keycloak-client-id',
  redirectUri: 'https://your-app.com/oauth/callback',
  domain: 'keycloak.example.com',
  realm: 'your-realm',
})
```

---

## Token Management

### Automatic Token Refresh

VueSip automatically handles token refresh when configured with a refresh token:

```typescript
const oauth2 = useOAuth2({
  // ... provider config
  autoRefresh: true, // Default: true
  refreshThreshold: 300, // Refresh 5 minutes before expiry
})
```

### Manual Token Refresh

```typescript
const { tokens, refreshTokens, isTokenExpired } = useOAuth2(config)

// Check if refresh is needed
if (isTokenExpired()) {
  const newTokens = await refreshTokens()
  console.log('Tokens refreshed:', newTokens)
}
```

### Getting Access Token for API Calls

```typescript
const { getAccessToken } = useOAuth2(config)

// This automatically refreshes if needed
const accessToken = await getAccessToken()

// Use for API calls
const response = await fetch('https://api.example.com/data', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
})
```

### Token Storage Options

Configure where tokens are stored:

```typescript
const oauth2 = useOAuth2({
  // ...
  storageType: 'localStorage', // Persists across sessions
  // or
  storageType: 'sessionStorage', // Cleared when tab closes
  // or
  storageType: 'memory', // Cleared on page refresh

  storageKeyPrefix: 'vuesip_oauth2_', // Storage key prefix
})
```

---

## Security Best Practices

### 1. Always Use PKCE

PKCE is enabled by default and should not be disabled:

```typescript
const provider = {
  // ...
  usePKCE: true, // Default, don't set to false
}
```

### 2. Use HTTPS and TLS/SRTP

OAuth2 requires HTTPS in production. Additionally, your SIP connections should use secure transport:

```typescript
const provider = {
  // ...
  redirectUri: 'https://your-app.com/oauth/callback',  // Not http://
}

// SIP credentials should use WSS (WebSocket Secure)
credentialMapping: {
  wsServerUri: 'wss://sip.example.com:7443',  // Not ws://
  // ...
}
```

**Why TLS/SRTP matters:** VoIP traffic without encryption can expose call metadata and content. Always use:

- **WSS** for WebSocket connections to SIP servers
- **SRTP** for media encryption (configured server-side)

### 3. Validate State Parameter

VueSip automatically validates the state parameter to prevent CSRF attacks. The state is generated cryptographically and verified on callback.

### 4. Store Tokens Securely

Choose appropriate storage based on your security requirements:

```typescript
// Most secure: In-memory only (no persistence)
storageType: 'memory'

// Medium security: Session storage (cleared on tab close)
storageType: 'sessionStorage'

// Convenience: Local storage (persists)
storageType: 'localStorage'
```

**Enterprise recommendation:** Use `sessionStorage` or `memory` for sensitive environments. Never store tokens in localStorage for applications handling financial or healthcare data.

### 5. Short-Lived Tokens

Request short-lived access tokens and use refresh tokens:

```typescript
// Request offline access for refresh tokens (Google)
additionalParams: {
  access_type: 'offline',
  prompt: 'consent',
}
```

### 6. Revoke Tokens on Logout

VueSip automatically attempts to revoke tokens on logout if a revocation endpoint is configured:

```typescript
await oauth2.logout() // Revokes tokens if endpoint available
```

### 7. SIP Registration Security

When using OAuth tokens for SIP authentication, implement these additional safeguards:

```typescript
// Use token introspection for SIP server validation
credentialMapping: {
  passwordStrategy: {
    type: 'api_generated',
    endpoint: 'https://api.example.com/sip/provision',
    // Backend validates OAuth token before issuing SIP credentials
  },
}
```

**Protect against common SIP threats:**

- **Toll fraud:** Validate user identity before allowing outbound calls
- **Registration hijacking:** Use unique, per-session credentials
- **Brute-force attacks:** Implement rate limiting on your SIP server

### 8. IP Access Controls (Enterprise)

For enterprise deployments, combine OAuth2 with IP-based restrictions:

```typescript
// Backend provisioning endpoint should verify:
// 1. Valid OAuth token
// 2. User's IP is in allowed ranges
// 3. Device fingerprint (optional)

credentialMapping: {
  passwordStrategy: {
    type: 'custom',
    generator: async (tokens, userInfo) => {
      const response = await fetch('https://api.example.com/sip/secure-provision', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'X-Client-IP': await getClientIP(),
          'X-Device-Fingerprint': getDeviceFingerprint(),
        },
        body: JSON.stringify({ userId: userInfo.sub }),
      })
      // Server validates IP allowlist before returning credentials
      return (await response.json()).sipPassword
    },
  },
}
```

### 9. Token Refresh Security

Handle token refresh failures gracefully to prevent security gaps:

```typescript
const { getAccessToken, logout, login } = useOAuth2(config)

async function secureApiCall(url: string) {
  try {
    const token = await getAccessToken() // Auto-refreshes if needed
    return await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    if (error.error === 'invalid_grant') {
      // Refresh token expired or revoked - force re-authentication
      await logout()
      await login()
    }
    throw error
  }
}
```

### 10. Multi-Factor Authentication (MFA)

For high-security environments, require MFA through your OAuth provider:

```typescript
// Force MFA prompt (provider-specific)
const googleConfig = createGoogleOAuth2Config({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',
  additionalParams: {
    // Google: Use ACR values for step-up auth
    acr_values: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor',
  },
})

// Okta: Require MFA
const oktaConfig = createOktaOAuth2Config({
  // ...
  additionalParams: {
    acr_values: 'urn:okta:loa:2fa:any',
  },
})
```

---

## Error Handling

### Error Types

```typescript
interface OAuth2Error {
  error: string // Error code
  error_description?: string // Human-readable description
  state?: string // State parameter if present
}
```

### Common Errors

| Error                 | Description              | Solution                     |
| --------------------- | ------------------------ | ---------------------------- |
| `invalid_request`     | Malformed request        | Check configuration          |
| `unauthorized_client` | Client not authorized    | Verify client ID             |
| `access_denied`       | User denied access       | User canceled login          |
| `invalid_scope`       | Invalid scopes           | Check provider documentation |
| `server_error`        | Provider error           | Retry or contact provider    |
| `invalid_state`       | PKCE state mismatch      | Session expired, retry login |
| `missing_code`        | No auth code in callback | Check redirect URI           |

### Error Handling Example

```vue
<template>
  <div v-if="error" class="oauth-error">
    <h3>Authentication Failed</h3>
    <p>{{ getErrorMessage(error) }}</p>
    <button @click="retryLogin">Try Again</button>
  </div>
</template>

<script setup lang="ts">
import type { OAuth2Error } from 'vuesip'

const { error, login, clearAuth } = useOAuth2(config)

function getErrorMessage(err: OAuth2Error): string {
  switch (err.error) {
    case 'access_denied':
      return 'You canceled the login. Please try again.'
    case 'invalid_state':
      return 'Session expired. Please try logging in again.'
    case 'server_error':
      return 'The authentication server encountered an error. Please try again later.'
    default:
      return err.error_description || 'An error occurred during authentication.'
  }
}

async function retryLogin() {
  await clearAuth()
  await login()
}
</script>
```

---

## Integration Examples

### Integrating with SipClientProvider

Combine OAuth2 authentication with SIP client:

```vue
<template>
  <OAuth2Provider :config="oauth2Config">
    <template #default="{ isAuthenticated, sipCredentials }">
      <!-- Only render SIP client when authenticated -->
      <SipClientProvider
        v-if="isAuthenticated && sipCredentials"
        :config="getSipConfig(sipCredentials)"
      >
        <YourPhoneApp />
      </SipClientProvider>

      <!-- Show login when not authenticated -->
      <LoginPage v-else />
    </template>
  </OAuth2Provider>
</template>

<script setup lang="ts">
import { OAuth2Provider, SipClientProvider } from 'vuesip'
import type { ProvisionedSipCredentials, SipClientConfig } from 'vuesip'

const oauth2Config = {
  // ... your OAuth2 config
}

function getSipConfig(credentials: ProvisionedSipCredentials): SipClientConfig {
  return {
    uri: credentials.wsServerUri,
    sipUri: credentials.sipUri,
    password: credentials.password,
    displayName: credentials.displayName,
    authorizationUsername: credentials.authorizationUsername,
    realm: credentials.realm,
  }
}
</script>
```

### Complete Softphone with OAuth2

```vue
<template>
  <div class="softphone-app">
    <!-- OAuth2 Login -->
    <div v-if="!isAuthenticated" class="login-screen">
      <h1>VueSip Phone</h1>
      <button @click="login" :disabled="authState === 'redirecting'">
        {{ authState === 'redirecting' ? 'Redirecting...' : 'Sign In' }}
      </button>
    </div>

    <!-- Phone Interface -->
    <div v-else class="phone-interface">
      <header>
        <span>{{ userInfo?.name }}</span>
        <button @click="logout">Sign Out</button>
      </header>

      <!-- SIP Phone Component -->
      <SipPhone :credentials="sipCredentials" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOAuth2, createGoogleOAuth2Config } from 'vuesip'
import SipPhone from './components/SipPhone.vue'

const { authState, isAuthenticated, userInfo, sipCredentials, login, logout } = useOAuth2({
  provider: createGoogleOAuth2Config({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirectUri: `${window.location.origin}/oauth/callback`,
  }),
  credentialMapping: {
    usernameField: 'email',
    displayNameField: 'name',
    sipDomain: 'sip.example.com',
    wsServerUri: 'wss://sip.example.com:7443',
    passwordStrategy: { type: 'access_token' },
  },
  autoRefresh: true,
  storageType: 'localStorage', // Remember login
})
</script>
```

---

## Enterprise Patterns

### Multi-Tenant SIP Deployments

For SaaS applications serving multiple organizations, dynamically configure SIP domains:

```typescript
const oauth2 = useOAuth2({
  provider: createMicrosoftOAuth2Config({
    clientId: import.meta.env.VITE_MS_CLIENT_ID,
    redirectUri: `${window.location.origin}/oauth/callback`,
    tenantId: 'common', // Allow any tenant
  }),
  credentialMapping: {
    usernameField: 'email',
    displayNameField: 'name',
    // Dynamic SIP domain based on user's organization
    sipDomainResolver: (userInfo) => {
      const domain = userInfo.email?.split('@')[1]
      return `sip.${domain}` // e.g., sip.contoso.com
    },
    wsServerUriResolver: (userInfo) => {
      const domain = userInfo.email?.split('@')[1]
      return `wss://pbx.${domain}:7443`
    },
    passwordStrategy: { type: 'api_generated', endpoint: '/api/sip/provision' },
  },
})
```

### Session Management & Credential Lifecycle

Implement proper session lifecycle for enterprise security:

```typescript
import { useOAuth2 } from 'vuesip'
import { onMounted, onUnmounted, watch } from 'vue'

export function useSecureSession() {
  const oauth2 = useOAuth2(config)
  let activityTimer: number
  let credentialRefreshInterval: number

  // Re-provision SIP credentials periodically (for rotating passwords)
  function startCredentialRotation() {
    credentialRefreshInterval = window.setInterval(
      async () => {
        if (oauth2.isAuthenticated.value) {
          // Re-provision credentials every 4 hours
          await oauth2.reprovisionCredentials()
        }
      },
      4 * 60 * 60 * 1000
    )
  }

  // Auto-logout on inactivity
  function resetActivityTimer() {
    clearTimeout(activityTimer)
    activityTimer = window.setTimeout(
      async () => {
        if (oauth2.isAuthenticated.value) {
          console.log('Session timeout due to inactivity')
          await oauth2.logout()
        }
      },
      30 * 60 * 1000
    ) // 30 minutes
  }

  onMounted(() => {
    startCredentialRotation()

    // Track user activity
    ;['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((event) => {
      document.addEventListener(event, resetActivityTimer)
    })
    resetActivityTimer()
  })

  onUnmounted(() => {
    clearInterval(credentialRefreshInterval)
    clearTimeout(activityTimer)
  })

  return oauth2
}
```

### Audit Logging

Track OAuth2 and SIP provisioning events for compliance:

```typescript
const oauth2 = useOAuth2({
  // ...config
  onStateChange: (newState, oldState) => {
    // Log state transitions for audit trail
    logAuditEvent({
      event: 'oauth2_state_change',
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString(),
      userId: oauth2.userInfo.value?.sub,
    })
  },
  onCredentialsProvisioned: (credentials) => {
    logAuditEvent({
      event: 'sip_credentials_provisioned',
      sipUri: credentials.sipUri,
      timestamp: new Date().toISOString(),
      userId: oauth2.userInfo.value?.sub,
    })
  },
  onLogout: (reason) => {
    logAuditEvent({
      event: 'user_logout',
      reason, // 'user_initiated' | 'token_expired' | 'session_timeout'
      timestamp: new Date().toISOString(),
    })
  },
})
```

### Backend Token Validation Pattern

For server-side SIP credential provisioning, validate OAuth tokens properly:

```typescript
// Backend: /api/sip/provision endpoint example (Node.js)

import { OAuth2Client } from 'google-auth-library'
import crypto from 'crypto'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function provisionSipCredentials(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }

  const token = authHeader.slice(7)

  try {
    // 1. Validate the OAuth token with the provider
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    // 2. Check user is authorized for SIP access
    const user = await db.users.findByEmail(payload.email)
    if (!user?.sipEnabled) {
      return res.status(403).json({ error: 'SIP access not enabled' })
    }

    // 3. Generate deterministic but secure SIP password
    const sipPassword = crypto
      .createHmac('sha256', process.env.SIP_SECRET)
      .update(`${payload.sub}:${user.sipSalt}`)
      .digest('hex')
      .slice(0, 32)

    // 4. Ensure user exists on SIP server (provision if new)
    await sipServer.ensureUser({
      username: payload.email,
      password: sipPassword,
      displayName: payload.name,
    })

    // 5. Return credentials to client
    return res.json({
      sipPassword,
      sipDomain: process.env.SIP_DOMAIN,
      wsServerUri: process.env.SIP_WS_URI,
    })
  } catch (error) {
    console.error('Token validation failed:', error)
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

---

## Troubleshooting

### Common Issues

**1. Callback URL Mismatch**

Ensure the redirect URI in your code exactly matches what's configured in your OAuth2 provider:

```typescript
// Must match EXACTLY including trailing slash
redirectUri: 'https://your-app.com/oauth/callback' // Not /callback/
```

**2. CORS Errors**

Token endpoint calls may fail with CORS errors if your provider doesn't support browser-based token exchange. Solutions:

- Use a backend proxy
- Check provider CORS configuration
- Use implicit flow (not recommended)

**3. Popup Blockers**

If using popup-based login, ensure users allow popups or use redirect-based flow:

```typescript
// Redirect-based (recommended)
await login()

// Note: VueSip uses redirect-based flow by default
```

**4. Token Refresh Failures**

If refresh fails, users will need to re-authenticate:

```typescript
try {
  await refreshTokens()
} catch (error) {
  if (error.error === 'invalid_grant') {
    // Refresh token expired or revoked
    await clearAuth()
    await login() // Re-authenticate
  }
}
```

---

## API Reference

### useOAuth2

```typescript
function useOAuth2(config: OAuth2ServiceConfig): UseOAuth2Return

interface UseOAuth2Return {
  // State
  authState: Ref<OAuth2AuthState>
  isAuthenticated: ComputedRef<boolean>
  error: Ref<OAuth2Error | null>
  userInfo: Ref<OAuth2UserInfo | null>
  sipCredentials: Ref<ProvisionedSipCredentials | null>
  tokens: Ref<OAuth2TokenResponse | null>
  tokenExpiresAt: Ref<Date | null>
  isRefreshing: Ref<boolean>

  // Methods
  login(options?: { prompt?: string; loginHint?: string }): Promise<void>
  handleCallback(url?: string): Promise<ProvisionedSipCredentials>
  logout(): Promise<void>
  refreshTokens(): Promise<OAuth2TokenResponse>
  getAccessToken(): Promise<string>
  isTokenExpired(): boolean
  clearAuth(): Promise<void>
}
```

### OAuth2Provider

```typescript
// Props
interface OAuth2ProviderProps {
  config: OAuth2ServiceConfig
  autoInitialize?: boolean  // Default: true
}

// Events
@authenticated(credentials: ProvisionedSipCredentials)
@error(error: OAuth2Error)
@logout()
@state-change(state: OAuth2AuthState)
```

### Provider Config Helpers

```typescript
createGoogleOAuth2Config(options: GoogleOAuth2Options): OAuth2ProviderConfig
createMicrosoftOAuth2Config(options: MicrosoftOAuth2Options): OAuth2ProviderConfig
createGitHubOAuth2Config(options: GitHubOAuth2Options): OAuth2ProviderConfig
createOktaOAuth2Config(options: OktaOAuth2Options): OAuth2ProviderConfig
createAuth0OAuth2Config(options: Auth0OAuth2Options): OAuth2ProviderConfig
createKeycloakOAuth2Config(options: KeycloakOAuth2Options): OAuth2ProviderConfig
```

---

## Next Steps

Now that you understand OAuth2 authentication in VueSip:

- **[Getting Started](./getting-started.md)** - Learn VueSip basics
- **[Security](./security.md)** - Deep dive into security best practices
- **[Making Calls](./making-calls.md)** - Start making calls with your OAuth2 credentials
- **[Error Handling](./error-handling.md)** - Handle errors gracefully

---

## Summary

OAuth2 authentication in VueSip enables:

- **Seamless SSO** - Users sign in with existing identity providers
- **Automatic Provisioning** - SIP credentials generated from OAuth2 user info
- **Secure by Default** - PKCE, state validation, and secure token storage
- **Multiple Providers** - Google, Microsoft, GitHub, Okta, Auth0, Keycloak, and custom
- **Flexible Mapping** - Multiple strategies for username and password generation
- **Token Management** - Automatic refresh, expiration handling, and storage options

Happy building!
