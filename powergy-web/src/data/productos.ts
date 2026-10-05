export interface Producto {
  id: string
  slug: string
  category: string
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
  top_ventas?: boolean
  top_rank?: number | null
}

export const ORDEN_CATEGORIAS = [
  'Estaciones de energía',
  'Plantas eléctricas',
  'Paneles solares',
  'Otros',
]
