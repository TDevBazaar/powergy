import type { Producto } from '@/data/productos'

interface PaginaProductos {
  items: Producto[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function esProducto(value: unknown): value is Producto {
  return (
    esObjeto(value) &&
    typeof value.id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.category === 'string' &&
    typeof value.subcategory === 'string' &&
    typeof value.brand === 'string' &&
    typeof value.model === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.price_usd === 'number' || value.price_usd === null) &&
    typeof value.specifications === 'string' &&
    typeof value.primary_image === 'string' &&
    typeof value.oferta === 'boolean' &&
    typeof value.garantia === 'boolean' &&
    typeof value.transporte === 'boolean' &&
    typeof value.factura === 'boolean' &&
    typeof value.top_ventas === 'boolean' &&
    (typeof value.top_rank === 'number' || value.top_rank === null)
  )
}

function esPaginaProductos(value: unknown): value is PaginaProductos {
  return (
    esObjeto(value) &&
    Array.isArray(value.items) &&
    value.items.every(esProducto) &&
    typeof value.totalPages === 'number' &&
    Number.isInteger(value.totalPages) &&
    value.totalPages >= 0
  )
}

const TAMANO_PAGINA = 100

export interface SolicitudCreada {
  id: string
  reference: string
  estimatedTotalUsd: number | null
  items: Array<{
    productName: string
    quantity: number
    unitPriceUsd: number | null
  }>
}

function esItemSolicitud(
  value: unknown,
): value is SolicitudCreada['items'][number] {
  return (
    esObjeto(value) &&
    typeof value.productName === 'string' &&
    typeof value.quantity === 'number' &&
    (typeof value.unitPriceUsd === 'number' || value.unitPriceUsd === null)
  )
}

export async function obtenerCatalogo(signal?: AbortSignal): Promise<Producto[]> {
  const productos: Producto[] = []
  let totalPaginas = 1

  for (let page = 1; page <= totalPaginas; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(TAMANO_PAGINA),
    })

    const response = await fetch(`/api/catalog?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })

    if (!response.ok) {
      throw new Error(`El API respondió con HTTP ${response.status}.`)
    }

    const result: unknown = await response.json()
    if (!esPaginaProductos(result)) {
      throw new Error('El API devolvió una respuesta de catálogo inválida.')
    }

    const pagina = result
    productos.push(...pagina.items)
    totalPaginas = pagina.totalPages
  }

  return productos
}

export async function registrarSolicitudPedido(
  items: Array<{ productId: string; quantity: number }>,
  idempotencyKey: string,
): Promise<SolicitudCreada> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotencyKey,
      items: items.map(({ productId, quantity }) => ({
        productId,
        quantity,
      })),
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    let detail = `No se pudo registrar la solicitud (HTTP ${response.status}).`
    try {
      const problem: unknown = await response.json()
      if (
        esObjeto(problem) &&
        typeof problem.detail === 'string'
      ) {
        detail = problem.detail
      }
    } catch {
      // Conserva el mensaje HTTP cuando la respuesta no contiene JSON.
    }
    throw new Error(detail)
  }

  const result: unknown = await response.json()
  if (
    !esObjeto(result) ||
    typeof result.id !== 'string' ||
    typeof result.reference !== 'string' ||
    !(typeof result.estimatedTotalUsd === 'number' || result.estimatedTotalUsd === null) ||
    !Array.isArray(result.items) ||
    !result.items.every(esItemSolicitud)
  ) {
    throw new Error('La API devolvió una solicitud inválida.')
  }

  return {
    id: result.id,
    reference: result.reference,
    estimatedTotalUsd: result.estimatedTotalUsd,
    items: result.items,
  }
}
