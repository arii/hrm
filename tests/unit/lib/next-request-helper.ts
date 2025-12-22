import { NextRequest } from 'next/server'

interface RequestOptions {
  body?: unknown
  query?: Record<string, string>
  headers?: Record<string, string>
}

export function createTestRequest({
  body,
  query,
  headers,
}: RequestOptions): NextRequest {
  const url = new URL('http://localhost')
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const requestHeaders = new Headers(headers)
  if (body && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json')
  }

  const request = new NextRequest(url.toString(), {
    method: 'POST',
    body: body === '' ? undefined : body ? JSON.stringify(body) : null,
    headers: requestHeaders,
  })

  return request
}
