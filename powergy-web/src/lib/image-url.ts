export function obtenerUrlImagen(value: string, anchoMaximo?: number): string {
  const image = value.trim()

  if (/^https?:\/\//i.test(image)) {
    if (!anchoMaximo) return image

    try {
      const url = new URL(image)
      if (!url.hostname.endsWith('.supabase.co')) return image

      const publicStoragePath = '/storage/v1/object/public/'
      if (!url.pathname.includes(publicStoragePath)) return image

      url.pathname = url.pathname.replace(
        publicStoragePath,
        '/storage/v1/render/image/public/'
      )
      url.searchParams.set('width', String(anchoMaximo))
      url.searchParams.set('quality', '75')
      url.searchParams.set('format', 'webp')
      return url.toString()
    } catch {
      return image
    }
  }
  if (/^https?:\/(?!\/)/i.test(image)) return image.replace(/^(https?):\/+/i, '$1://')
  if (image.startsWith('//')) return image

  return `/${image.replace(/^\/+/, '')}`
}
