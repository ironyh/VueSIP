# Playground with Real SIP

The VueSIP Playground lets you run all interactive demos against a real SIP account. From a fresh `pnpm dev`, you can configure a SIP connection once and use the same `SipClient` across every demo (Basic Call, DTMF, Hold, etc.).

## Quick start

1. **Start the dev server** (from repo root):

   ```bash
   pnpm dev
   ```

2. **Open the Playground** at `http://localhost:5173`.

3. **Configure your SIP connection**  
   Click **"Configure SIP connection"** in the header (or open the **Settings Manager** demo from the sidebar). In the **SIP Connections** panel you can:
   - Add a new connection (name, WebSocket URI, SIP URI, password, optional display name and audio codec).
   - Save multiple connections and choose a default.
   - Connect with one click; status (Connected / Registered / Error) and basic logs are shown.

4. **Run demos**  
   Once connected, switch to any demo (e.g. **Basic Audio Call**). They all share the same SIP client, so you can place and receive real calls from the Playground.

## Connection panel

The connection panel supports:

- **Custom PBX** – Any WebSocket SIP server (e.g. Asterisk, FreeSWITCH, FreePBX).
- **Presets** – Same concept as the PWA softphone: server URI, SIP URI, password, optional display name and codec (e.g. PCMA for 46elks).

Credentials are stored in the browser only (e.g. in localStorage if you opt in to “Save password”). They are never sent to the VueSIP repo or any third party.

## Safety and credentials

::: warning Do not use production secrets in the Playground

- Use **test or development** SIP accounts only when trying the Playground.
- Do **not** enter production SIP credentials in shared or public environments (e.g. Codespaces, shared screens, or any deployment that others can access).
- The Playground is intended for local development and learning. For production apps, use proper secret management and never commit or expose real credentials.
  :::

Credentials you enter in the Playground stay in your browser. Optional “Save password” uses browser storage (e.g. localStorage) and is not encrypted; only use it on trusted devices.

## Relation to PWA softphone

The Playground reuses the same connection model and shared `SipClient` pattern as the [PWA softphone](/guide/demos#softphone) templates. If you already use the softphone with 46elks, Telnyx, or a custom PBX, the same server URI, SIP URI, and password format work in the Playground.

## See also

- [Live Demos](/guide/demos) – Deployed apps and ports
- [Basic Audio Call](/examples/basic-call) – First demo to try after connecting
- [Settings Manager](/examples/settings) – Where the SIP Connections panel lives in the Playground
