/**
 * QR Code Provisioning Utility
 *
 * Generates QR codes containing SIP configuration for easy provisioning.
 * Based on standard SIP configuration format used by Zoiper and other softphones.
 */

import QRCode from 'qrcode'
import type { QRCodeToDataURLOptions } from 'qrcode'

export interface SipAccountConfig {
  /** Display name for the account */
  displayName: string
  /** SIP username */
  username: string
  /** SIP password */
  password: string
  /** SIP domain/realm */
  domain: string
  /** SIP port (default: 5060) */
  port?: number
  /** Transport protocol (udp, tcp, tls) */
  transport?: 'udp' | 'tcp' | 'tls'
  /** STUN server URL (optional) */
  stunServer?: string
  /** SIP outbound proxy (optional) */
  outboundProxy?: string
}

/**
 * Generate SIP configuration URI for QR code
 * Format: sip:username@domain:port;transport=udp?parameters
 * Or comprehensive format for provisioning apps
 */
export function generateSipUri(config: SipAccountConfig): string {
  const port = config.port || 5060
  const transport = config.transport || 'udp'

  // Build the SIP URI
  let uri = `sip:${config.username}@${config.domain}:${port};transport=${transport}`

  // Note: Additional parameters can be added here if needed
  // For now, using simple SIP URI format;

  if (config.displayName) {
    // For display name, we need to use the full format
    return `"${config.displayName}" <sip:${config.username}@${config.domain}:${port};transport=${transport}>`
  }

  return uri
}

/**
 * Generate provisioning data as JSON for QR code
 * This provides more complete configuration than just SIP URI
 */
export function generateProvisioningData(config: SipAccountConfig): string {
  const data = {
    version: '1.0',
    type: 'sip',
    account: {
      authname: config.username,
      password: config.password,
      display_name: config.displayName,
      realm: config.domain,
      server: config.domain,
      port: config.port || 5060,
      transport: config.transport || 'udp',
    },
    stun: config.stunServer
      ? {
          server: config.stunServer,
        }
      : undefined,
    outbound: config.outboundProxy
      ? {
          proxy: config.outboundProxy,
        }
      : undefined,
  }

  return JSON.stringify(data)
}

/**
 * Generate QR code as data URL (base64 image)
 */
export async function generateQrCodeDataUrl(
  data: string,
  options: Partial<QRCodeToDataURLOptions> = {}
): Promise<string> {
  const defaultOptions: QRCodeToDataURLOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  }

  return QRCode.toDataURL(data, { ...defaultOptions, ...options })
}

/**
 * Generate QR code as SVG string
 */
export async function generateQrCodeSvg(
  data: string,
  options: {
    width?: number
    margin?: number
  } = {}
): Promise<string> {
  return QRCode.toString(data, {
    type: 'svg',
    width: options.width || 300,
    margin: options.margin || 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  })
}

/**
 * Generate complete provisioning QR code for SIP account
 * Returns both the data URL (image) and the raw provisioning data
 */
export async function generateSipProvisioningQr(config: SipAccountConfig): Promise<{
  dataUrl: string
  svg: string
  provisioningData: string
}> {
  const provisioningData = generateProvisioningData(config)

  const [dataUrl, svg] = await Promise.all([
    generateQrCodeDataUrl(provisioningData),
    generateQrCodeSvg(provisioningData),
  ])

  return {
    dataUrl,
    svg,
    provisioningData,
  }
}

/**
 * Validate SIP configuration before generating QR
 */
export function validateSipConfig(config: Partial<SipAccountConfig>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!config.username?.trim()) {
    errors.push('Username is required')
  }

  if (!config.password?.trim()) {
    errors.push('Password is required')
  }

  if (!config.domain?.trim()) {
    errors.push('Domain is required')
  }

  if (config.port !== undefined && (config.port < 1 || config.port > 65535)) {
    errors.push('Port must be between 1 and 65535')
  }

  if (config.transport && !['udp', 'tcp', 'tls'].includes(config.transport)) {
    errors.push('Transport must be udp, tcp, or tls')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
