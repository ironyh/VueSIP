/**
 * Real-PBX integration test environment helpers.
 *
 * All configuration comes from env vars; if the relevant block is missing, the
 * accessor returns null and the calling suite self-skips. This keeps tests
 * silent on machines (and CI jobs) that have no PBX available.
 */

export interface AmiEnv {
  host: string
  port: number
  user: string
  secret: string
}

export interface SipWsEnv {
  wsUrl: string
  domain: string
  user: string
  password: string
  displayName?: string
}

const str = (key: string): string | null => {
  const v = process.env[key]
  return v && v.length > 0 ? v : null
}

export const amiEnv = (): AmiEnv | null => {
  const host = str('VUESIP_TEST_AMI_HOST')
  const user = str('VUESIP_TEST_AMI_USER')
  const secret = str('VUESIP_TEST_AMI_SECRET')
  if (!host || !user || !secret) return null
  const port = Number(process.env.VUESIP_TEST_AMI_PORT ?? 5038)
  return { host, port, user, secret }
}

export const sipWsEnv = (): SipWsEnv | null => {
  const wsUrl = str('VUESIP_TEST_WS_URL')
  const domain = str('VUESIP_TEST_SIP_DOMAIN')
  const user = str('VUESIP_TEST_SIP_USER')
  const password = str('VUESIP_TEST_SIP_PASSWORD')
  if (!wsUrl || !domain || !user || !password) return null
  return {
    wsUrl,
    domain,
    user,
    password,
    displayName: str('VUESIP_TEST_SIP_DISPLAY_NAME') ?? undefined,
  }
}
