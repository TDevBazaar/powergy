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

function urlApi(): string {
  const base = process.env.NEXT_PUBLIC_POWERGY_API_URL?.trim()
  return (base || 'https://powergy.somee.com').replace(/\/+$/, '')
}

export async function obtenerCatalogo(signal?: AbortSignal): Promise<Producto[]> {
  const productos: Producto[] = []
  let totalPaginas = 1

  for (let page = 1; page <= totalPaginas; page += 1) {
    const url = new URL(`${urlApi()}/api/products`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('pageSize', String(TAMANO_PAGINA))

    const response = await fetch(url, {
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
