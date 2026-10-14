import { NextRequest } from 'next/server'

export async function proxyApiRequest(
  request: NextRequest,
  upstreamPath: string,
): Promise<Response> {
  const base = (
    process.env.NEXT_PUBLIC_POWERGY_API_URL?.trim() || 'https://powergy.somee.com'
  ).replace(/\/+$/, '')
  const upstreamUrl = new URL(`${base}${upstreamPath}`)
  upstreamUrl.search = request.nextUrl.search

  const headers = new Headers({ Accept: 'application/json' })
  const authorization = request.headers.get('authorization')
  if (authorization) headers.set('Authorization', authorization)
  const contentType = request.headers.get('content-type')
  if (contentType) {
    headers.set('Content-Type', contentType)
  }

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer(),
    cache: 'no-store',
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
