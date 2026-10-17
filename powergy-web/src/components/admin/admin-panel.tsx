'use client'

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ChangeEvent,
} from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Minus, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import {
  actualizarProducto,
  cerrarSolicitudAdmin,
  crearProducto,
  desactivarCategoria,
  desactivarProducto,
  etiquetaMotivoCancelacion,
  guardarCategoria,
  MOTIVOS_CANCELACION,
  obtenerAuditoriaAdmin,
  obtenerCategoriasAdmin,
  obtenerMetricasSolicitudes,
  obtenerProductosAdmin,
  obtenerSolicitudAdmin,
  obtenerSolicitudesAdmin,
  type CategoriaAdmin,
  type EntradaAuditoria,
  type ItemSolicitud,
  type MetricasSolicitudes,
  type PaginaSolicitudes,
  type ProductoAdmin,
  type SolicitudPedido,
} from '@/lib/admin-api'
import { getSupabaseClient } from '@/lib/supabase'
import { obtenerUrlImagen } from '@/lib/image-url'

type Pestaña = 'productos' | 'categorias' | 'solicitudes'

interface FormularioProducto {
  slug: string
  categoryId: string
  subcategory: string
  brand: string
  model: string
  name: string
  priceUsd: string
  specifications: string
  primaryImage: string
  onSale: boolean
  warranty: boolean
  transport: boolean
  invoice: boolean
  topRank: string
  isActive: boolean
}

interface FormularioCategoria {
  name: string
  slug: string
  sortOrder: string
}

const productoVacio: FormularioProducto = {
  slug: '',
  categoryId: '',
  subcategory: '',
  brand: '',
  model: '',
  name: '',
  priceUsd: '',
  specifications: '',
  primaryImage: '',
  onSale: false,
  warranty: false,
  transport: false,
  invoice: false,
  topRank: '',
  isActive: true,
}

const categoriaVacia: FormularioCategoria = {
  name: '',
  slug: '',
  sortOrder: '0',
}

function crearSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}

function formatoMoneda(valor: number | null): string {
  if (valor === null) return 'Por confirmar'
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(valor)
}

function precioProducto(valor: number | null): string {
  if (valor === null || valor <= 0) return 'Consultar'
  return `$ ${valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatoFechaHora(valor: string): string {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })
}

function etiquetaEstado(estado: SolicitudPedido['status']): string {
  if (estado === 'closed') return 'Cerrada'
  if (estado === 'cancelled') return 'Cancelada'
  return 'Solicitada'
}

function claseEstado(estado: SolicitudPedido['status']): string {
  if (estado === 'closed') return 'bg-green-50 text-green-700'
  if (estado === 'cancelled') return 'bg-rose-50 text-rose-700'
  return 'bg-amber-50 text-amber-700'
}

function etiquetaTotal(estado: SolicitudPedido['status']): string {
  if (estado === 'closed') return 'Total vendido'
  if (estado === 'cancelled') return 'Total solicitado'
  return 'Total estimado'
}

function totalItemsSolicitud(items: ItemSolicitud[]): number | null {
  if (items.length === 0) return null
  if (items.some((item) => item.unitPriceUsd === null)) return null
  return items.reduce((total, item) => total + (item.unitPriceUsd ?? 0) * item.quantity, 0)
}

/** Un producto sin precio o con precio cero se considera "por confirmar". */
function itemSinPrecio(item: ItemSolicitud): boolean {
  return item.unitPriceUsd === null || item.unitPriceUsd <= 0
}

function inicioDeDia(fecha: string): string | undefined {
  return fecha ? `${fecha}T00:00:00Z` : undefined
}

function finDeDia(fecha: string): string | undefined {
  return fecha ? `${fecha}T23:59:59Z` : undefined
}

function TarjetaMetrica({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle?: string
}) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{titulo}</p>
      <p className="mt-1 text-xl font-extrabold text-neutral-900">{valor}</p>
      {detalle && <p className="mt-0.5 text-[11px] text-neutral-400">{detalle}</p>}
    </div>
  )
}

function campoFormulario(
  label: string,
  value: string,
  onChange: (value: string) => void,
  options: { required?: boolean; type?: string; placeholder?: string; min?: string } = {},
) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      <input
        required={options.required}
        type={options.type ?? 'text'}
        min={options.min}
        value={value}
        placeholder={options.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
      />
    </label>
  )
}

export default function AdminPanel() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [panelError, setPanelError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pestaña, setPestaña] = useState<Pestaña>('productos')
  const [productos, setProductos] = useState<ProductoAdmin[]>([])
  const [totalProductos, setTotalProductos] = useState(0)
  const [totalPaginasProductos, setTotalPaginasProductos] = useState(1)
  const [paginaProductos, setPaginaProductos] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(24)
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([])
  const [productoEnEdicion, setProductoEnEdicion] = useState<string | null>(null)
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false)
  const [formularioProducto, setFormularioProducto] =
    useState<FormularioProducto>(productoVacio)
  const [formularioCategoria, setFormularioCategoria] =
    useState<FormularioCategoria>(categoriaVacia)
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [solicitudes, setSolicitudes] = useState<PaginaSolicitudes | null>(null)
  const [metricas, setMetricas] = useState<MetricasSolicitudes | null>(null)
  const [solicitudSeleccionada, setSolicitudSeleccionada] =
    useState<SolicitudPedido | null>(null)
  const [itemsEdicion, setItemsEdicion] = useState<ItemSolicitud[]>([])
  const [filtroEstado, setFiltroEstado] = useState<
    '' | 'requested' | 'closed' | 'cancelled'
  >('')
  const [solicitudesDesde, setSolicitudesDesde] = useState('')
  const [solicitudesHasta, setSolicitudesHasta] = useState('')
  const [paginaSolicitudes, setPaginaSolicitudes] = useState(1)
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false)
  const [cerrandoSolicitud, setCerrandoSolicitud] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState<string>('price')
  const [notaCancelacion, setNotaCancelacion] = useState('')
  const [confirmarSinPrecio, setConfirmarSinPrecio] = useState(false)
  const [auditoriaProducto, setAuditoriaProducto] = useState<EntradaAuditoria | null>(null)

  useEffect(() => {
    setItemsEdicion(
      solicitudSeleccionada
        ? solicitudSeleccionada.items.map((item) => ({ ...item }))
        : [],
    )
    setMotivoCancelacion('price')
    setNotaCancelacion('')
    setConfirmarSinPrecio(false)
  }, [solicitudSeleccionada])

  useEffect(() => {
    let activo = true
    let cliente: SupabaseClient

    try {
      cliente = getSupabaseClient()
      setSupabase(cliente)
    } catch (error) {
      setLoginError(mensajeError(error))
      setInitializing(false)
      return
    }

    const {
      data: { subscription },
    } = cliente.auth.onAuthStateChange((_event, nextSession) => {
      if (activo) {
        setSession(nextSession)
        setLoginError('')
      }
    })

    cliente.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error
        if (activo) setSession(data.session)
      })
      .catch((error: unknown) => {
        if (activo) setLoginError(mensajeError(error))
      })
      .finally(() => {
        if (activo) setInitializing(false)
      })

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setProductos([])
      setCategorias([])
      setTotalProductos(0)
      setTotalPaginasProductos(1)
      return
    }

    let activo = true
    setPanelError('')

    obtenerCategoriasAdmin(session.access_token)
      .then((categoriasAdmin) => {
        if (activo) setCategorias(categoriasAdmin)
      })
      .catch((error: unknown) => {
        if (activo) setPanelError(mensajeError(error))
      })

    return () => {
      activo = false
    }
  }, [session])

  const cargarProductos = useCallback(
    async (pagina: number, pageSize: number, q: string) => {
      if (!session) return
      setLoading(true)
      setPanelError('')
      try {
        const resultado = await obtenerProductosAdmin(session.access_token, {
          page: pagina,
          pageSize,
          q,
        })
        setProductos(resultado.items)
        setTotalProductos(resultado.totalItems)
        setTotalPaginasProductos(Math.max(1, resultado.totalPages))
      } catch (error) {
        setPanelError(mensajeError(error))
      } finally {
        setLoading(false)
      }
    },
    [session],
  )

  useEffect(() => {
    if (!session) return
    void cargarProductos(paginaProductos, tamanoPagina, busquedaAplicada)
  }, [session, paginaProductos, tamanoPagina, busquedaAplicada, cargarProductos])

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim())
      setPaginaProductos(1)
    }, 350)
    return () => clearTimeout(temporizador)
  }, [busqueda])

  const cargarSolicitudes = useCallback(
    async (pagina: number) => {
      if (!session) return
      setCargandoSolicitudes(true)
      setPanelError('')
      try {
        const [paginaPedidos, metricasPedidos] = await Promise.all([
          obtenerSolicitudesAdmin(session.access_token, {
            status: filtroEstado || undefined,
            from: inicioDeDia(solicitudesDesde),
            to: finDeDia(solicitudesHasta),
            page: pagina,
          }),
          obtenerMetricasSolicitudes(
            session.access_token,
            inicioDeDia(solicitudesDesde),
            finDeDia(solicitudesHasta),
          ),
        ])
        setSolicitudes(paginaPedidos)
        setMetricas(metricasPedidos)
      } catch (error) {
        setPanelError(mensajeError(error))
      } finally {
        setCargandoSolicitudes(false)
      }
    },
    [session, filtroEstado, solicitudesDesde, solicitudesHasta],
  )

  useEffect(() => {
    if (!session || pestaña !== 'solicitudes') return
    void cargarSolicitudes(paginaSolicitudes)
  }, [session, pestaña, paginaSolicitudes, cargarSolicitudes])

  useEffect(() => {
    if (!session) return
    const parametro = new URLSearchParams(window.location.search).get('order')
    if (!parametro) return

    setPestaña('solicitudes')
    const url = new URL(window.location.href)
    url.searchParams.delete('order')
    window.history.replaceState({}, '', url.toString())

    let activo = true
    obtenerSolicitudAdmin(session.access_token, parametro)
      .then((solicitud) => {
        if (activo) setSolicitudSeleccionada(solicitud)
      })
      .catch((error: unknown) => {
        if (activo) setPanelError(mensajeError(error))
      })

    return () => {
      activo = false
    }
  }, [session])

  const productosDesde =
    totalProductos === 0 ? 0 : (paginaProductos - 1) * tamanoPagina + 1
  const productosHasta = Math.min(paginaProductos * tamanoPagina, totalProductos)

  useEffect(() => {
    if (!modalProductoAbierto) return
    function alPulsar(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setModalProductoAbierto(false)
      setProductoEnEdicion(null)
      setFormularioProducto(productoVacio)
    }
    window.addEventListener('keydown', alPulsar)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = ''
    }
  }, [modalProductoAbierto])

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setSaving(true)
    setLoginError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setLoginError(error.message)
    } catch (error) {
      setLoginError(mensajeError(error))
    } finally {
      setSaving(false)
    }
  }

  async function cerrarSesion() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setPanelError(error.message)
  }

  async function recargarDatos() {
    if (!session) return
    setLoading(true)
    setPanelError('')
    try {
      const [paginaApi, categoriasAdmin] = await Promise.all([
        obtenerProductosAdmin(session.access_token, {
          page: paginaProductos,
          pageSize: tamanoPagina,
          q: busquedaAplicada,
        }),
        obtenerCategoriasAdmin(session.access_token),
      ])
      setProductos(paginaApi.items)
      setTotalProductos(paginaApi.totalItems)
      setTotalPaginasProductos(Math.max(1, paginaApi.totalPages))
      setCategorias(categoriasAdmin)
    } catch (error) {
      setPanelError(mensajeError(error))
    } finally {
      setLoading(false)
    }
  }

  function actualizarSeccion() {
    if (pestaña === 'solicitudes') {
      void cargarSolicitudes(paginaSolicitudes)
    } else {
      void recargarDatos()
    }
  }

  async function abrirSolicitud(id: string) {
    if (!session) return
    setPanelError('')
    try {
      setSolicitudSeleccionada(await obtenerSolicitudAdmin(session.access_token, id))
    } catch (error) {
      setPanelError(mensajeError(error))
    }
  }

  function quitarItemSolicitud(productId: string) {
    setItemsEdicion((items) => items.filter((item) => item.productId !== productId))
  }

  function ajustarCantidadSolicitud(productId: string, delta: number) {
    setItemsEdicion((items) =>
      items.map((item) => {
        if (item.productId !== productId) return item
        const quantity = Math.min(99, Math.max(1, item.quantity + delta))
        return {
          ...item,
          quantity,
          lineTotalUsd:
            item.unitPriceUsd === null ? null : item.unitPriceUsd * quantity,
        }
      }),
    )
  }

  function ajustarPrecioItem(productId: string, valor: string) {
    setItemsEdicion((items) =>
      items.map((item) => {
        if (item.productId !== productId) return item
        if (valor.trim() === '') {
          return { ...item, unitPriceUsd: null, lineTotalUsd: null }
        }
        const precio = Number(valor)
        if (Number.isNaN(precio) || precio < 0) return item
        return {
          ...item,
          unitPriceUsd: precio,
          lineTotalUsd: precio * item.quantity,
        }
      }),
    )
  }

  async function finalizarSolicitud(
    solicitud: SolicitudPedido,
    outcome: 'closed' | 'cancelled',
  ) {
    if (!session || solicitud.status !== 'requested') return
    const esVenta = outcome === 'closed'
    if (esVenta && itemsEdicion.length === 0) {
      setPanelError('La solicitud debe conservar al menos un producto para marcarla como vendida.')
      return
    }
    if (!esVenta && !motivoCancelacion) {
      setPanelError('Selecciona el motivo de la cancelación.')
      return
    }
    if (esVenta && itemsEdicion.some(itemSinPrecio) && !confirmarSinPrecio) {
      setPanelError(
        'Hay productos sin precio definido o en $0. Corrige el precio o confirma la venta en la casilla de aviso.',
      )
      return
    }
    const accion = esVenta
      ? `¿Marcar la solicitud ${solicitud.reference} como VENDIDA?`
      : `¿Cancelar la solicitud ${solicitud.reference}?`
    if (!window.confirm(accion)) return
    setCerrandoSolicitud(true)
    setPanelError('')
    setNotice('')
    try {
      const actualizada = await cerrarSolicitudAdmin(session.access_token, solicitud.id, {
        outcome,
        items: itemsEdicion.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceUsd: item.unitPriceUsd,
        })),
        ...(esVenta
          ? {}
          : {
              cancellationReason: motivoCancelacion,
              cancellationNote: notaCancelacion.trim() || undefined,
            }),
      })
      setSolicitudSeleccionada(actualizada)
      setNotice(
        `Solicitud ${actualizada.reference} ${esVenta ? 'cerrada' : 'cancelada'}.`,
      )
      await cargarSolicitudes(paginaSolicitudes)
    } catch (error) {
      setPanelError(mensajeError(error))
    } finally {
      setCerrandoSolicitud(false)
    }
  }

  function comenzarEdicionProducto(producto: ProductoAdmin) {
    setProductoEnEdicion(producto.id)
    setFormularioProducto({
      slug: producto.slug,
      categoryId: producto.categoryId,
      subcategory: producto.subcategory,
      brand: producto.brand,
      model: producto.model,
      name: producto.name,
      priceUsd: producto.price_usd === null ? '' : String(producto.price_usd),
      specifications: producto.specifications,
      primaryImage: producto.primary_image,
      onSale: producto.oferta,
      warranty: producto.garantia,
      transport: producto.transporte,
      invoice: producto.factura,
      topRank: producto.top_rank === null ? '' : String(producto.top_rank),
      isActive: producto.isActive,
    })
    setModalProductoAbierto(true)
    setAuditoriaProducto(null)
    if (session) {
      void obtenerAuditoriaAdmin(session.access_token, {
        entityType: 'product',
        entityId: producto.id,
        pageSize: 1,
      })
        .then((pagina) => setAuditoriaProducto(pagina.items[0] ?? null))
        .catch(() => setAuditoriaProducto(null))
    }
  }

  function abrirProductoNuevo() {
    setProductoEnEdicion(null)
    setFormularioProducto(productoVacio)
    setAuditoriaProducto(null)
    setModalProductoAbierto(true)
  }

  function cerrarModalProducto() {
    setModalProductoAbierto(false)
    setProductoEnEdicion(null)
    setFormularioProducto(productoVacio)
    setAuditoriaProducto(null)
  }

  async function guardarProducto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setSaving(true)
    setPanelError('')
    setNotice('')

    const payload = {
      ...formularioProducto,
      priceUsd: formularioProducto.priceUsd ? Number(formularioProducto.priceUsd) : null,
      topRank: formularioProducto.topRank ? Number(formularioProducto.topRank) : null,
    }

    try {
      if (productoEnEdicion) {
        await actualizarProducto(session.access_token, productoEnEdicion, payload)
        setNotice('Producto actualizado.')
      } else {
        await crearProducto(session.access_token, payload)
        setNotice('Producto creado.')
      }
      setProductoEnEdicion(null)
      setFormularioProducto(productoVacio)
      setModalProductoAbierto(false)
      await recargarDatos()
    } catch (error) {
      setPanelError(mensajeError(error))
    } finally {
      setSaving(false)
    }
  }

  async function subirImagen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !supabase) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setPanelError('Usa una imagen JPG, PNG, WebP o AVIF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPanelError('La imagen no puede superar los 10 MB.')
      return
    }

    setUploading(true)
    setPanelError('')
    try {
      const bucket =
        process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'powergy-product-images'
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      })
      if (error) throw error
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      setFormularioProducto((current) => ({ ...current, primaryImage: data.publicUrl }))
      setNotice('Imagen cargada. Guarda el producto para aplicar el cambio.')
    } catch (error) {
      setPanelError(mensajeError(error))
    } finally {
      setUploading(false)
    }
  }

  async function guardarCategoriaFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setSaving(true)
    setPanelError('')
    setNotice('')
    try {
      await guardarCategoria(session.access_token, categoriaEnEdicion, {
        ...formularioCategoria,
        sortOrder: Number(formularioCategoria.sortOrder),
      })
      setNotice(categoriaEnEdicion ? 'Categoría actualizada.' : 'Categoría creada.')
      setFormularioCategoria(categoriaVacia)
      setCategoriaEnEdicion(null)
      await recargarDatos()
    } catch (error) {
      setPanelError(mensajeError(error))
    } finally {
      setSaving(false)
    }
  }

  function comenzarEdicionCategoria(categoria: CategoriaAdmin) {
    setCategoriaEnEdicion(categoria.id)
    setFormularioCategoria({
      name: categoria.name,
      slug: categoria.slug,
      sortOrder: String(categoria.sortOrder),
    })
  }

  async function archivarProducto(producto: ProductoAdmin) {
    if (!session || !window.confirm(`¿Desactivar "${producto.name}" del catálogo?`)) return
    setPanelError('')
    try {
      await desactivarProducto(session.access_token, producto.id)
      setNotice('Producto desactivado.')
      if (productos.length === 1 && paginaProductos > 1) {
        setPaginaProductos(paginaProductos - 1)
      } else {
        await recargarDatos()
      }
    } catch (error) {
      setPanelError(mensajeError(error))
    }
  }

  async function archivarCategoria(categoria: CategoriaAdmin) {
    if (!session || !window.confirm(`¿Desactivar la categoría "${categoria.name}"?`)) return
    setPanelError('')
    try {
      await desactivarCategoria(session.access_token, categoria.id)
      setNotice('Categoría desactivada.')
      await recargarDatos()
    } catch (error) {
      setPanelError(mensajeError(error))
    }
  }

  if (initializing) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-50 px-4">
        <p role="status" className="text-sm text-neutral-500">Comprobando sesión...</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f8] px-4 py-10">
        <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-9">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            POWERGY · Catálogo
          </Link>
          <h1 className="mt-8 text-2xl font-extrabold tracking-tight text-neutral-900">
            Panel de administración
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Inicia sesión con una cuenta autorizada para administrar el catálogo.
          </p>
          <form onSubmit={iniciarSesion} className="mt-7 grid gap-4">
            {campoFormulario('Correo electrónico', email, setEmail, {
              type: 'email',
              required: true,
              placeholder: 'admin@ejemplo.com',
            })}
            {campoFormulario('Contraseña', password, setPassword, {
              type: 'password',
              required: true,
            })}
            {loginError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="mt-2 h-11 rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
          <p className="mt-5 text-xs leading-relaxed text-neutral-400">
            El acceso requiere una cuenta creada en Supabase Auth y habilitada por el administrador.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <Link href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
              POWERGY
            </Link>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
              Administración
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-sm text-neutral-500 sm:block">
              {session.user.email}
            </span>
            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-10">
        <nav aria-label="Secciones del panel" className="mb-6 flex gap-2">
          {(['productos', 'categorias', 'solicitudes'] as const).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setPestaña(section)}
              aria-current={pestaña === section ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                pestaña === section
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {section}
            </button>
          ))}
          <button
            type="button"
            onClick={actualizarSeccion}
            className="ml-auto rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100"
          >
            Actualizar
          </button>
        </nav>

        {panelError && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {panelError}
            {panelError.includes('403') || panelError.toLowerCase().includes('forbidden')
              ? ' La cuenta inició sesión, pero todavía no está habilitada como administradora en la tabla admin_users.'
              : null}
          </div>
        )}
        {notice && (
          <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {notice}
          </p>
        )}

        {pestaña === 'solicitudes' ? (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-neutral-900">Solicitudes de pedido</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Pedidos registrados desde el catálogo antes de abrir WhatsApp.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Desde
                    <input
                      type="date"
                      value={solicitudesDesde}
                      onChange={(event) => {
                        setSolicitudesDesde(event.target.value)
                        setPaginaSolicitudes(1)
                      }}
                      className="h-10 rounded-lg border border-neutral-200 px-3 text-sm font-normal normal-case text-neutral-900 outline-none focus:border-neutral-400"
                    />
                  </label>
                  <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Hasta
                    <input
                      type="date"
                      value={solicitudesHasta}
                      onChange={(event) => {
                        setSolicitudesHasta(event.target.value)
                        setPaginaSolicitudes(1)
                      }}
                      className="h-10 rounded-lg border border-neutral-200 px-3 text-sm font-normal normal-case text-neutral-900 outline-none focus:border-neutral-400"
                    />
                  </label>
                  <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Estado
                    <select
                      value={filtroEstado}
                      onChange={(event) => {
                        setFiltroEstado(
                          event.target.value as '' | 'requested' | 'closed' | 'cancelled',
                        )
                        setPaginaSolicitudes(1)
                      }}
                      className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal normal-case text-neutral-900 outline-none focus:border-neutral-400"
                    >
                      <option value="">Todas</option>
                      <option value="requested">Solicitadas</option>
                      <option value="closed">Cerradas</option>
                      <option value="cancelled">Canceladas</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TarjetaMetrica titulo="Solicitudes" valor={metricas ? String(metricas.requests) : '—'} />
                <TarjetaMetrica titulo="Cerradas" valor={metricas ? String(metricas.closedRequests) : '—'} />
                <TarjetaMetrica titulo="Canceladas" valor={metricas ? String(metricas.cancelledRequests) : '—'} />
                <TarjetaMetrica titulo="Abiertas" valor={metricas ? String(metricas.openRequests) : '—'} />
                <TarjetaMetrica
                  titulo="Tasa de cierre"
                  valor={
                    metricas && metricas.closeRate !== null
                      ? `${Math.round(metricas.closeRate * 100)}%`
                      : '—'
                  }
                />
                <TarjetaMetrica
                  titulo="Valor estimado"
                  valor={formatoMoneda(metricas?.estimatedValueUsd ?? null)}
                />
                <TarjetaMetrica
                  titulo="Valor cerrado"
                  valor={formatoMoneda(metricas?.closedEstimatedValueUsd ?? null)}
                />
                <TarjetaMetrica
                  titulo="Valor cancelado"
                  valor={formatoMoneda(metricas?.cancelledEstimatedValueUsd ?? null)}
                />
                <TarjetaMetrica
                  titulo="Valor solicitado"
                  valor={formatoMoneda(metricas?.originalEstimatedValueUsd ?? null)}
                  detalle="Antes de ajustes del administrador"
                />
                <TarjetaMetrica
                  titulo="Ventas sin precio"
                  valor={metricas ? String(metricas.closedWithoutPriceRequests ?? 0) : '—'}
                  detalle="Cerradas con total por confirmar"
                />
                <TarjetaMetrica
                  titulo="Cerradas en el período"
                  valor={metricas ? String(metricas.closedDuringPeriod) : '—'}
                />
              </div>
              {metricas && (
                <p className="mt-3 text-[11px] text-neutral-400">
                  Período: {formatoFechaHora(metricas.from)} — {formatoFechaHora(metricas.to)}
                </p>
              )}
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
              <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold text-neutral-900">Listado</h2>
                  <span className="text-sm text-neutral-500">
                    {cargandoSolicitudes
                      ? 'Cargando...'
                      : `${solicitudes?.totalItems ?? 0} solicitudes`}
                  </span>
                </div>

                {solicitudes && solicitudes.items.length > 0 ? (
                  <div className="mt-5 divide-y divide-neutral-100">
                    {solicitudes.items.map((solicitud) => (
                      <article
                        key={solicitud.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-neutral-900">{solicitud.reference}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${claseEstado(
                                solicitud.status,
                              )}`}
                            >
                              {etiquetaEstado(solicitud.status)}
                            </span>
                            {solicitud.hasUnpricedItems &&
                              solicitud.status === 'requested' && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                  Sin precio
                                </span>
                              )}
                          </div>
                          <p className="mt-1 truncate text-xs text-neutral-500">
                            {formatoFechaHora(solicitud.createdAt)} ·{' '}
                            {solicitud.items.reduce((total, item) => total + item.quantity, 0)} artículos ·{' '}
                            {formatoMoneda(solicitud.estimatedTotalUsd)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-neutral-400">
                            {solicitud.items
                              .map((item) => `${item.quantity}× ${item.productName}`)
                              .join(', ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void abrirSolicitud(solicitud.id)}
                          className="text-xs font-semibold text-neutral-700 underline underline-offset-2"
                        >
                          Ver detalle
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-neutral-500">
                    {cargandoSolicitudes
                      ? 'Cargando solicitudes...'
                      : 'No hay solicitudes para los filtros seleccionados.'}
                  </p>
                )}

                {solicitudes && solicitudes.totalPages > 1 && (
                  <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold text-neutral-500">
                    <button
                      type="button"
                      disabled={paginaSolicitudes <= 1 || cargandoSolicitudes}
                      onClick={() => setPaginaSolicitudes((pagina) => Math.max(1, pagina - 1))}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <span>
                      Página {solicitudes.page} de {solicitudes.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={paginaSolicitudes >= solicitudes.totalPages || cargandoSolicitudes}
                      onClick={() => setPaginaSolicitudes((pagina) => pagina + 1)}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
                <h2 className="text-lg font-extrabold text-neutral-900">Detalle de la solicitud</h2>
                {solicitudSeleccionada ? (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-neutral-900">{solicitudSeleccionada.reference}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${claseEstado(
                          solicitudSeleccionada.status,
                        )}`}
                      >
                        {etiquetaEstado(solicitudSeleccionada.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      Creada el {formatoFechaHora(solicitudSeleccionada.createdAt)}
                      {solicitudSeleccionada.closedAt
                        ? ` · ${
                            solicitudSeleccionada.status === 'cancelled'
                              ? 'Cancelada'
                              : 'Cerrada'
                          } el ${formatoFechaHora(solicitudSeleccionada.closedAt)}`
                        : null}
                    </p>

                    <ul className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
                      {(solicitudSeleccionada.status === 'requested'
                        ? itemsEdicion
                        : solicitudSeleccionada.items
                      ).map((item) => (
                        <li key={item.productId} className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-neutral-800">
                                {item.productName}
                              </p>
                              <p className="mt-0.5 text-xs text-neutral-500">
                                {solicitudSeleccionada.status === 'requested'
                                  ? `${
                                      itemSinPrecio(item) ? 'Sin precio' : 'Precio definido'
                                    } · ${item.categoryName}`
                                  : `${item.quantity} × ${formatoMoneda(item.unitPriceUsd)} · ${item.categoryName}`}
                              </p>
                              {(item.originalQuantity ?? item.quantity) !== item.quantity && (
                                <p className="mt-0.5 text-[11px] font-semibold text-amber-600">
                                  El cliente pidió {item.originalQuantity} unidad(es)
                                </p>
                              )}
                            </div>
                            {solicitudSeleccionada.status === 'requested' ? (
                              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                <div className="flex items-center rounded-lg border border-neutral-200">
                                  <button
                                    type="button"
                                    aria-label={`Quitar una unidad de ${item.productName}`}
                                    onClick={() => ajustarCantidadSolicitud(item.productId, -1)}
                                    disabled={item.quantity <= 1}
                                    className="flex h-8 w-8 items-center justify-center text-neutral-600 disabled:opacity-30"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="w-7 text-center text-sm font-bold text-neutral-900">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Agregar una unidad de ${item.productName}`}
                                    onClick={() => ajustarCantidadSolicitud(item.productId, 1)}
                                    disabled={item.quantity >= 99}
                                    className="flex h-8 w-8 items-center justify-center text-neutral-600 disabled:opacity-30"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                                  Precio
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    aria-label={`Precio unitario de ${item.productName}`}
                                    value={
                                      item.unitPriceUsd === null ? '' : String(item.unitPriceUsd)
                                    }
                                    onChange={(event) =>
                                      ajustarPrecioItem(item.productId, event.target.value)
                                    }
                                    placeholder="0.00"
                                    className={`h-8 w-24 rounded-lg border px-2 text-sm font-normal normal-case outline-none ${
                                      itemSinPrecio(item)
                                        ? 'border-amber-300 bg-amber-50 text-amber-800 focus:border-amber-400'
                                        : 'border-neutral-200 text-neutral-900 focus:border-neutral-400'
                                    }`}
                                  />
                                </label>
                                <span className="w-16 text-right text-sm font-bold text-neutral-900">
                                  {formatoMoneda(
                                    item.unitPriceUsd === null
                                      ? null
                                      : item.unitPriceUsd * item.quantity,
                                  )}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Quitar ${item.productName} de la solicitud`}
                                  onClick={() => quitarItemSolicitud(item.productId)}
                                  disabled={itemsEdicion.length <= 1}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 disabled:opacity-30"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="shrink-0 text-sm font-bold text-neutral-900">
                                {formatoMoneda(item.lineTotalUsd)}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {solicitudSeleccionada.status !== 'requested' &&
                      (solicitudSeleccionada.removedItems ?? []).length > 0 && (
                        <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                            Productos quitados al finalizar
                          </p>
                          <ul className="mt-2 space-y-1">
                            {(solicitudSeleccionada.removedItems ?? []).map((item) => (
                              <li
                                key={item.productId}
                                className="text-xs text-neutral-400 line-through"
                              >
                                {item.quantity}× {item.productName}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-neutral-500">
                        {etiquetaTotal(solicitudSeleccionada.status)}
                      </span>
                      <div className="text-right">
                        <span className="block text-lg font-extrabold text-neutral-900">
                          {formatoMoneda(
                            solicitudSeleccionada.status === 'requested'
                              ? totalItemsSolicitud(itemsEdicion)
                              : solicitudSeleccionada.estimatedTotalUsd,
                          )}
                        </span>
                        {solicitudSeleccionada.status !== 'requested' &&
                          solicitudSeleccionada.originalEstimatedTotalUsd != null &&
                          solicitudSeleccionada.originalEstimatedTotalUsd !==
                            solicitudSeleccionada.estimatedTotalUsd && (
                            <span className="block text-[11px] text-neutral-400">
                              Solicitado:{' '}
                              {formatoMoneda(solicitudSeleccionada.originalEstimatedTotalUsd)}
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="mt-5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        Historial
                      </h3>
                      <ol className="mt-2 space-y-2">
                        {solicitudSeleccionada.history.map((registro, indice) => (
                          <li
                            key={`${registro.status}-${registro.changedAt}-${indice}`}
                            className="text-xs text-neutral-500"
                          >
                            <span className="font-semibold text-neutral-700">
                              {etiquetaEstado(registro.status as SolicitudPedido['status'])}
                            </span>
                            {' · '}
                            {formatoFechaHora(registro.changedAt)}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {solicitudSeleccionada.status === 'requested' ? (
                      <div className="mt-5">
                        <p className="text-[11px] text-neutral-400">
                          Puedes ajustar cantidades, precios o quitar productos antes de finalizar.
                          La venta suma a las estadísticas; la cancelación no suma, pero se conserva.
                        </p>

                        {itemsEdicion.some(itemSinPrecio) && (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-xs font-semibold text-amber-800">
                              {itemsEdicion.filter(itemSinPrecio).length === 1
                                ? '1 producto está sin precio o en $0.'
                                : `${
                                    itemsEdicion.filter(itemSinPrecio).length
                                  } productos están sin precio o en $0.`}
                            </p>
                            <p className="mt-1 text-[11px] text-amber-700">
                              Escribe el precio unitario acordado antes de venderlos, o confirma que
                              se venden sin precio.
                            </p>
                            <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-900">
                              <input
                                type="checkbox"
                                checked={confirmarSinPrecio}
                                onChange={(event) => setConfirmarSinPrecio(event.target.checked)}
                                className="h-4 w-4 rounded border-amber-300"
                              />
                              Confirmo vender productos sin precio
                            </label>
                          </div>
                        )}

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
                            Motivo de cancelación
                            <select
                              value={motivoCancelacion}
                              onChange={(event) => setMotivoCancelacion(event.target.value)}
                              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal text-neutral-900 outline-none focus:border-neutral-400"
                            >
                              {MOTIVOS_CANCELACION.map((motivo) => (
                                <option key={motivo.valor} value={motivo.valor}>
                                  {motivo.etiqueta}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
                            Nota de la cancelación (opcional)
                            <input
                              value={notaCancelacion}
                              maxLength={500}
                              placeholder="Detalle del motivo"
                              onChange={(event) => setNotaCancelacion(event.target.value)}
                              className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm font-normal text-neutral-900 outline-none focus:border-neutral-400"
                            />
                          </label>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => void finalizarSolicitud(solicitudSeleccionada, 'closed')}
                            disabled={
                              cerrandoSolicitud ||
                              itemsEdicion.length === 0 ||
                              (itemsEdicion.some(itemSinPrecio) && !confirmarSinPrecio)
                            }
                            className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {cerrandoSolicitud ? 'Guardando...' : 'Marcar como vendida'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void finalizarSolicitud(solicitudSeleccionada, 'cancelled')
                            }
                            disabled={cerrandoSolicitud}
                            className="h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancelar solicitud
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <p className="rounded-xl bg-neutral-50 px-4 py-3 text-center text-sm font-semibold text-neutral-500">
                          {solicitudSeleccionada.status === 'cancelled'
                            ? `Solicitud cancelada · ${etiquetaMotivoCancelacion(
                                solicitudSeleccionada.cancellationReason,
                              )}`
                            : 'Solicitud cerrada (vendida)'}
                        </p>
                        {solicitudSeleccionada.status === 'cancelled' &&
                          solicitudSeleccionada.cancellationNote && (
                            <p className="mt-2 text-center text-xs text-neutral-500">
                              {solicitudSeleccionada.cancellationNote}
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-neutral-500">
                    Selecciona una solicitud del listado para ver su detalle.
                  </p>
                )}
              </section>
            </div>
          </div>
        ) : pestaña === 'productos' ? (
          <>
            <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-neutral-900">Productos</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {loading
                      ? 'Cargando catálogo...'
                      : `${totalProductos} ${
                          totalProductos === 1 ? 'producto' : 'productos'
                        }`}
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                  <input
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Buscar producto"
                    aria-label="Buscar producto"
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400 sm:w-64"
                  />
                  <button
                    type="button"
                    onClick={abrirProductoNuevo}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#FFD21E] px-4 text-sm font-bold text-neutral-900 transition hover:bg-[#f2c500]"
                  >
                    <Plus className="h-4 w-4" /> Agregar producto
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      aria-hidden="true"
                      className="h-64 animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50"
                    />
                  ))}
                </div>
              ) : productos.length === 0 ? (
                <p className="py-16 text-center text-sm text-neutral-500">
                  {busquedaAplicada
                    ? `Sin resultados para “${busquedaAplicada}”.`
                    : 'No hay productos para mostrar.'}
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {productos.map((producto) => (
                    <article
                      key={producto.id}
                      className="flex flex-col rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm transition hover:shadow-md"
                    >
                      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f5f6f8]">
                        {producto.primary_image ? (
                          <img
                            src={obtenerUrlImagen(producto.primary_image, 480)}
                            alt={producto.name}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                            {producto.brand || 'Sin foto'}
                          </span>
                        )}
                        <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
                          {producto.top_ventas && (
                            <span className="rounded-full bg-[#FFD21E] px-2 py-0.5 text-[9px] font-bold text-neutral-900 shadow-sm">
                              MÁS VENDIDO
                            </span>
                          )}
                          {producto.oferta && (
                            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                              EN REBAJA
                            </span>
                          )}
                          {!producto.isActive && (
                            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[9px] font-bold text-neutral-600 shadow-sm">
                              INACTIVO
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col px-1 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                          {producto.brand}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-left text-xs font-bold leading-snug text-neutral-900 sm:text-sm">
                          {producto.name}
                        </p>
                        <p className="mt-1 hidden line-clamp-1 text-xs text-neutral-400 sm:block">
                          {producto.specifications}
                        </p>
                        <p className="mt-auto pt-2 text-base font-extrabold tracking-tight text-neutral-900 sm:text-lg">
                          {precioProducto(producto.price_usd)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => comenzarEdicionProducto(producto)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 py-2.5 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-200 sm:text-sm"
                          >
                            <Pencil className="h-4 w-4" /> Editar
                          </button>
                          {producto.isActive && (
                            <button
                              type="button"
                              onClick={() => void archivarProducto(producto)}
                              aria-label={`Desactivar ${producto.name}`}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {!loading && totalProductos > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                  <p className="text-xs text-neutral-500">
                    Mostrando {productosDesde}–{productosHasta} de {totalProductos}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                      Mostrar
                      <select
                        value={tamanoPagina}
                        onChange={(event) => {
                          setTamanoPagina(Number(event.target.value))
                          setPaginaProductos(1)
                        }}
                        className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                      >
                        {[12, 24, 48, 100].map((opcion) => (
                          <option key={opcion} value={opcion}>
                            {opcion}
                          </option>
                        ))}
                      </select>
                      por página
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPaginaProductos((actual) => Math.max(1, actual - 1))}
                        disabled={paginaProductos <= 1}
                        aria-label="Página anterior"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-semibold text-neutral-600">
                        {paginaProductos} / {totalPaginasProductos}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPaginaProductos((actual) =>
                            Math.min(totalPaginasProductos, actual + 1),
                          )
                        }
                        disabled={paginaProductos >= totalPaginasProductos}
                        aria-label="Página siguiente"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {modalProductoAbierto && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-label={productoEnEdicion ? 'Editar producto' : 'Nuevo producto'}
              >
                <div className="absolute inset-0 bg-black/40" onClick={cerrarModalProducto} />
                <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
                  <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 md:px-6">
                    <div>
                      <h2 className="text-lg font-extrabold text-neutral-900">
                        {productoEnEdicion ? 'Editar producto' : 'Nuevo producto'}
                      </h2>
                      <p className="mt-0.5 text-sm text-neutral-500">
                        {productoEnEdicion
                          ? 'Actualiza los datos y guarda los cambios.'
                          : 'Completa los datos para publicarlo en el catálogo.'}
                      </p>
                      {productoEnEdicion && auditoriaProducto && (
                        <p className="mt-1 text-[11px] text-neutral-400">
                          Última edición por{' '}
                          {auditoriaProducto.adminEmail ?? 'un administrador'} el{' '}
                          {formatoFechaHora(auditoriaProducto.createdAt)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={cerrarModalProducto}
                      aria-label="Cerrar"
                      className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                    <form onSubmit={guardarProducto} className="grid gap-4 sm:grid-cols-2">
                      {campoFormulario('Nombre', formularioProducto.name, (name) => {
                        setFormularioProducto((current) => ({
                          ...current,
                          name,
                          slug: productoEnEdicion ? current.slug : crearSlug(name),
                        }))
                      }, { required: true })}
                      {campoFormulario('Slug', formularioProducto.slug, (slug) =>
                        setFormularioProducto((current) => ({ ...current, slug })), { required: true })}

                      <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
                        Categoría
                        <select
                          required
                          value={formularioProducto.categoryId}
                          onChange={(event) =>
                            setFormularioProducto((current) => ({
                              ...current,
                              categoryId: event.target.value,
                            }))
                          }
                          className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-normal outline-none focus:border-neutral-400"
                        >
                          <option value="">Selecciona categoría</option>
                          {categorias.filter((category) => category.isActive).map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </label>
                      {campoFormulario('Subcategoría', formularioProducto.subcategory, (subcategory) =>
                        setFormularioProducto((current) => ({ ...current, subcategory })), { required: true })}
                      {campoFormulario('Marca', formularioProducto.brand, (brand) =>
                        setFormularioProducto((current) => ({ ...current, brand })), { required: true })}
                      {campoFormulario('Modelo', formularioProducto.model, (model) =>
                        setFormularioProducto((current) => ({ ...current, model })), { required: true })}
                      {campoFormulario('Precio USD (vacío = consultar)', formularioProducto.priceUsd, (priceUsd) =>
                        setFormularioProducto((current) => ({ ...current, priceUsd })), {
                        type: 'number',
                        min: '0',
                      })}
                      {(formularioProducto.priceUsd.trim() === '' ||
                        Number(formularioProducto.priceUsd) <= 0) && (
                        <p className="-mt-2 text-[11px] text-amber-600 sm:col-span-2">
                          Sin precio, el producto muestra «Consultar» y no aporta valor a las ventas
                          cerradas. Define un precio antes de venderlo.
                        </p>
                      )}
                      {campoFormulario('Rango destacado (vacío = no destacado)', formularioProducto.topRank, (topRank) =>
                        setFormularioProducto((current) => ({ ...current, topRank })), {
                        type: 'number',
                        min: '1',
                      })}

                      <label className="grid gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
                        Especificaciones
                        <textarea
                          required
                          rows={3}
                          value={formularioProducto.specifications}
                          onChange={(event) =>
                            setFormularioProducto((current) => ({
                              ...current,
                              specifications: event.target.value,
                            }))
                          }
                          className="resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-neutral-400"
                        />
                      </label>

                      <div className="sm:col-span-2">
                        <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
                          Imagen del producto
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploading}
                            onChange={(event) => void subirImagen(event)}
                            className="block w-full rounded-lg border border-neutral-200 bg-white text-sm file:mr-4 file:border-0 file:bg-neutral-100 file:px-4 file:py-2.5 file:font-semibold"
                          />
                        </label>
                        <p className="mt-1 text-xs text-neutral-400">
                          {uploading ? 'Subiendo imagen...' : 'Imágenes de hasta 10 MB. Se guardan en Supabase Storage.'}
                        </p>
                        {campoFormulario('URL de la imagen', formularioProducto.primaryImage, (primaryImage) =>
                          setFormularioProducto((current) => ({ ...current, primaryImage })), { required: true })}
                        {formularioProducto.primaryImage && (
                          <img
                            src={obtenerUrlImagen(formularioProducto.primaryImage)}
                            alt="Vista previa del producto"
                            className="mt-3 h-28 w-28 rounded-xl bg-neutral-50 object-contain"
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 sm:col-span-2">
                        {([
                          ['onSale', 'En oferta'],
                          ['warranty', 'Garantía'],
                          ['transport', 'Transporte'],
                          ['invoice', 'Factura'],
                          ['isActive', 'Visible en catálogo'],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600">
                            <input
                              type="checkbox"
                              checked={formularioProducto[key]}
                              onChange={(event) =>
                                setFormularioProducto((current) => ({
                                  ...current,
                                  [key]: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 accent-neutral-900"
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
                        <button
                          type="submit"
                          disabled={saving || uploading || categorias.every((category) => !category.isActive)}
                          className="h-11 flex-1 rounded-xl bg-[#FFD21E] px-4 text-sm font-bold text-neutral-900 transition hover:bg-[#f2c500] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? 'Guardando...' : productoEnEdicion ? 'Guardar cambios' : 'Crear producto'}
                        </button>
                        <button
                          type="button"
                          onClick={cerrarModalProducto}
                          className="h-11 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.65fr)]">
            <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-extrabold text-neutral-900">Categorías</h2>
              <p className="mt-1 text-sm text-neutral-500">{categorias.length} categorías</p>
              <div className="mt-5 divide-y divide-neutral-100">
                {categorias.map((categoria) => (
                  <article key={categoria.id} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-neutral-900">{categoria.name}</p>
                      <p className="mt-1 truncate text-xs text-neutral-500">
                        {categoria.slug} · orden {categoria.sortOrder}
                        {!categoria.isActive && ' · inactiva'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button
                        type="button"
                        onClick={() => comenzarEdicionCategoria(categoria)}
                        className="text-xs font-semibold text-neutral-700 underline underline-offset-2"
                      >
                        Editar
                      </button>
                      {categoria.isActive && (
                        <button
                          type="button"
                          onClick={() => void archivarCategoria(categoria)}
                          className="text-xs font-semibold text-red-600 underline underline-offset-2"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-extrabold text-neutral-900">
                {categoriaEnEdicion ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
              <form onSubmit={guardarCategoriaFormulario} className="mt-5 grid gap-4">
                {campoFormulario('Nombre', formularioCategoria.name, (name) =>
                  setFormularioCategoria((current) => ({
                    ...current,
                    name,
                    slug: categoriaEnEdicion ? current.slug : crearSlug(name),
                  })), { required: true })}
                {campoFormulario('Slug', formularioCategoria.slug, (slug) =>
                  setFormularioCategoria((current) => ({ ...current, slug })), { required: true })}
                {campoFormulario('Orden', formularioCategoria.sortOrder, (sortOrder) =>
                  setFormularioCategoria((current) => ({ ...current, sortOrder })), {
                  type: 'number',
                  min: '0',
                  required: true,
                })}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-11 flex-1 rounded-xl bg-[#FFD21E] px-4 text-sm font-bold text-neutral-900 transition hover:bg-[#f2c500] disabled:opacity-60"
                  >
                    {saving ? 'Guardando...' : categoriaEnEdicion ? 'Guardar cambios' : 'Crear categoría'}
                  </button>
                  {categoriaEnEdicion && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriaEnEdicion(null)
                        setFormularioCategoria(categoriaVacia)
                      }}
                      className="h-11 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-600"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
