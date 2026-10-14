export const WHATSAPP_NUMERO = '5359749037'
export const WHATSAPP_VISIBLE = '+53 5974 9037'

export function linkWhatsApp(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`
}

export function linkGeneral(): string {
  return linkWhatsApp('Hola POWERGY, quiero información sobre sus productos.')
}
