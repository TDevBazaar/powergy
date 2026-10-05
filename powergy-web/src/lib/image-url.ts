export function obtenerUrlImagen(value: string): string {
  const image = value.trim()

  if (/^https?:\/\//i.test(image)) return image
  if (/^https?:\/(?!\/)/i.test(image)) return image.replace(/^(https?):\/+/i, '$1://')
  if (image.startsWith('//')) return image

  return `/${image.replace(/^\/+/, '')}`
}
