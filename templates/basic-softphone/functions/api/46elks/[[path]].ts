/**
 * Cloudflare Pages Function - 46elks API Proxy
 *
 * Proxies requests to the 46elks API to avoid CORS issues.
 * Routes: /api/46elks/a1/* -> https://api.46elks.com/a1/*
 */

export const onRequest = async (context: any) => {
  const { request, params } = context

  if (request.method === 'OPTIONS') {
    return onRequestOptions()
  }

  // Get the path segments after /api/46elks/
  const pathSegments = params.path as string[]
  const apiPath = pathSegments ? pathSegments.join('/') : ''

  // Only allow proxying to a1/* endpoints
  if (!apiPath.startsWith('a1/')) {
    return new Response('Not Found', { status: 404 })
  }

  const incomingUrl = new URL(request.url)
  const targetUrl = new URL(`https://api.46elks.com/${apiPath}`)
  targetUrl.search = incomingUrl.search

  // Forward auth and request content type (needed for form POSTs)
  const headers = new Headers()
  const auth = request.headers.get('Authorization')
  if (auth) {
    headers.set('Authorization', auth)
  }
  const contentType = request.headers.get('Content-Type')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }
  headers.set('Accept', 'application/json')

  try {
    const init: RequestInit = {
      method: request.method,
      headers,
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer()
    }

    const response = await fetch(targetUrl.toString(), init)

    // Create response with CORS headers
    const responseHeaders = new Headers(response.headers)
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept')

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response('Proxy Error', { status: 502 })
  }
}

// Handle CORS preflight requests
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  })
}
