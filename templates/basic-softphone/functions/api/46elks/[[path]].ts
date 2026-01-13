/**
 * Cloudflare Pages Function - 46elks API Proxy
 *
 * Proxies requests to the 46elks API to avoid CORS issues.
 * Routes: /api/46elks/a1/* -> https://api.46elks.com/a1/*
 */

interface Env {
  // Add any environment bindings here if needed
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, params } = context

  // Get the path segments after /api/46elks/
  const pathSegments = params.path as string[]
  const apiPath = pathSegments ? pathSegments.join('/') : ''

  // Only allow proxying to a1/* endpoints
  if (!apiPath.startsWith('a1/')) {
    return new Response('Not Found', { status: 404 })
  }

  const targetUrl = `https://api.46elks.com/${apiPath}`

  // Forward the Authorization header if present
  const headers = new Headers()
  const auth = request.headers.get('Authorization')
  if (auth) {
    headers.set('Authorization', auth)
  }
  headers.set('Accept', 'application/json')

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
    })

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
export const onRequestOptions: PagesFunction<Env> = async () => {
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
