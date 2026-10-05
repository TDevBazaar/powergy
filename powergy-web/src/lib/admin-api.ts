export interface CategoriaAdmin {
  id: string
  name: string
  slug: string
  sortOrder: number
  isActive: boolean
}

export interface ProductoAdmin {
  id: string
  slug: string
  category: string
  categoryId: string
  subcategory: string
  brand: string
  model: string
  name: string
  price_usd: number | null
  specifications: string
  primary_image: string
  oferta: boolean
  garantia: boolean
  transporte: boolean
  factura: boolean
  top_ventas: boolean
  top_rank: number | null
  isActive: boolean
}

interface Pagina<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

const API_URL = (
  process.env.NEXT_PUBLIC_POWERGY_API_URL || 'https://powergy.somee.com'
).replace(/\/+$/, '')

async function solicitarApi<T>(
  ruta: string,
  token: string,
  init: RequestInit = {},
): Promise<T | null> {
  const response = await fetch(`${API_URL}${ruta}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    let detail = `La API respondió con HTTP ${response.status}.`
    try {
      const problem: unknown = await response.json()
      if (
        typeof problem === 'object' &&
        problem !== null &&
        'detail' in problem &&
        typeof problem.detail === 'string'
      ) {
        detail = problem.detail
      } else if (
        typeof problem === 'object' &&
        problem !== null &&
        'title' in problem &&
        typeof problem.title === 'string'
      ) {
        detail = problem.title
      }
    } catch {
      // Conserva el mensaje HTTP cuando la respuesta no contiene JSON.
    }
    throw new Error(detail)
  }

  if (response.status === 204) return null
  return (await response.json()) as T
}

export async function obtenerCategoriasAdmin(token: string): Promise<CategoriaAdmin[]> {
  const resultado = await solicitarApi<CategoriaAdmin[]>('/api/categories/admin', token)
  if (!Array.isArray(resultado)) {
    throw new Error('La API devolvió una respuesta de categorías inválida.')
  }
  return resultado
}

export async function obtenerProductosAdmin(token: string): Promise<ProductoAdmin[]> {
  const productos: ProductoAdmin[] = []
  let pagina = 1
  let totalPaginas = 1

  do {
    const resultado = await solicitarApi<Pagina<ProductoAdmin>>(
      `/api/products/admin?page=${pagina}&pageSize=100&includeInactive=true`,
      token,
    )
    if (
      !resultado ||
      !Array.isArray(resultado.items) ||
      !Number.isInteger(resultado.totalPages) ||
      resultado.totalPages < 0
    ) {
      throw new Error('La API devolvió una respuesta de productos inválida.')
    }
    productos.push(...resultado.items)
    totalPaginas = resultado.totalPages
    pagina += 1
  } while (pagina <= totalPaginas)

  return productos
}

export function crearProducto(token: string, payload: object): Promise<ProductoAdmin | null> {
  return solicitarApi<ProductoAdmin>('/api/products', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function actualizarProducto(
  token: string,
  id: string,
  payload: object,
): Promise<ProductoAdmin | null> {
  return solicitarApi<ProductoAdmin>(`/api/products/${encodeURIComponent(id)}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function desactivarProducto(token: string, id: string): Promise<null> {
  return solicitarApi<never>(`/api/products/${encodeURIComponent(id)}`, token, { method: 'DELETE' })
}

export function guardarCategoria(
  token: string,
  id: string | null,
  payload: object,
): Promise<CategoriaAdmin | null> {
  return solicitarApi<CategoriaAdmin>(
    id ? `/api/categories/${encodeURIComponent(id)}` : '/api/categories',
    token,
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function desactivarCategoria(token: string, id: string): Promise<null> {
  return solicitarApi<never>(`/api/categories/${encodeURIComponent(id)}`, token, { method: 'DELETE' })
}
