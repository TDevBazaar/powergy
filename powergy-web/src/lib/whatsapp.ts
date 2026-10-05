import type { Producto } from '@/data/productos'

export const WHATSAPP_NUMERO = '5359749037'
export const WHATSAPP_VISIBLE = '+53 5974 9037'

export function linkWhatsApp(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`
}

export function linkProducto(p: Producto): string {
  const conPrecio = typeof p.price_usd === 'number' && p.price_usd > 0
  const precio = conPrecio ? ` ($${p.price_usd} USD)` : ''
  const pregunta = conPrecio ? '¿Está disponible?' : '¿Está disponible y cuál es el precio?'
  return linkWhatsApp(`Hola POWERGY, me interesa este producto: ${p.name}${precio}. ${pregunta}`)
}

export function linkGeneral(): string {
  return linkWhatsApp('Hola POWERGY, quiero información sobre sus productos.')
}
