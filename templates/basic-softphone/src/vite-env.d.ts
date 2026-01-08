/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIP_URI: string
  readonly VITE_SIP_USER: string
  readonly VITE_SIP_PASSWORD: string
  readonly VITE_SIP_DISPLAY_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
