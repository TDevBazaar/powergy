import { NextRequest } from 'next/server'

const CACHE_SECONDS = 60

export async function GET(request: NextRequest) {
  const base = (
    process.env.NEXT_PUBLIC_POWERGY_API_URL?.trim() || 'https://powergy.somee.com'
  ).replace(/\/+$/, '')
  const upstreamUrl = new URL(`${base}/api/products`)

  for (const parameter of ['page', 'pageSize']) {
    const value = request.nextUrl.searchParams.get(parameter)
    if (value !== null) upstreamUrl.searchParams.set(parameter, value)
  }

  const upstream = await fetch(upstreamUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    next: { revalidate: CACHE_SECONDS },
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  })
}
