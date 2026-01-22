/**
 * Cloudflare Pages Function - 46elks voice_start webhook
 *
 * 46elks requires `voice_start` on an inbound number to be either:
 * - a URL that returns call actions JSON (this function)
 * - a stringified JSON object with call actions (configured directly on the number)
 *
 * This endpoint is intentionally generic so it can be reused across multiple 46elks
 * numbers without re-deploying:
 *
 * - Configure `voice_start` to: https://softphone.vuesip.com/elks/calls?connect=+4600XXXXXX
 * - Or use any E.164 number / (whitelisted) SIP URI
 */

type AnyRecord = Record<string, unknown>

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Not required for 46elks callbacks, but convenient for manual debugging.
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export const onRequest = async (context: AnyRecord) => {
  const request = context.request as Request

  if (!request) {
    return jsonResponse({ hangup: 'reject' }, 400)
  }

  const url = new URL(request.url)
  const connect = (
    url.searchParams.get('connect') ||
    url.searchParams.get('connect_to') ||
    ''
  ).trim()

  // Simple health check / debug helper
  if (request.method === 'GET') {
    return jsonResponse({ ok: true, connect: connect || null })
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ hangup: 'reject' }, 405)
  }

  // 46elks sends application/x-www-form-urlencoded
  const bodyText = await request.text()
  const params = new URLSearchParams(bodyText)

  const payload = {
    direction: params.get('direction') || null,
    callid: params.get('callid') || params.get('id') || null,
    from: params.get('from') || null,
    to: params.get('to') || null,
    created: params.get('created') || null,
  }

  // Destination must be provided via query param to avoid shipping secrets.
  if (!connect) {
    console.warn('[46elks voice_start] Missing ?connect=...', payload)
    return jsonResponse({ hangup: 'reject' })
  }

  console.log('[46elks voice_start] connect', { ...payload, connect })

  return jsonResponse({ connect })
}
