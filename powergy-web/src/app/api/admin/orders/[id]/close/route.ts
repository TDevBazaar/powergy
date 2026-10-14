import { NextRequest } from 'next/server'
import { proxyApiRequest } from '@/lib/api-proxy'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ title: 'Identificador de solicitud no válido.' }, { status: 400 })
  }
  return proxyApiRequest(request, `/api/admin/orders/${id}/close`)
}
