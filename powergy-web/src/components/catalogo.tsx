'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, X, Menu, ShoppingCart, ArrowRight, Plus, Minus, Trash2, Check,
  ShieldCheck, Truck, Headphones, Lock, Zap, Sun, Fuel, Package,
} from 'lucide-react'
import { ORDEN_CATEGORIAS, type Producto } from '@/data/productos'
import { obtenerCatalogo } from '@/lib/catalogo-api'
import { linkProducto, linkWhatsApp, linkGeneral, WHATSAPP_VISIBLE } from '@/lib/whatsapp'

/* ---------- Utilidades ---------- */

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatoPrecio(n: number): string {
  return `$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function precioTexto(p: Producto): string {
  return typeof p.price_usd === 'number' && p.price_usd > 0 ? formatoPrecio(p.price_usd) : 'Consultar'
}

function tienePrecio(p: Producto): boolean {
  return typeof p.price_usd === 'number' && p.price_usd > 0
}

function IconoCategoria({ cat, className }: { cat: string; className: string }) {
  const cls = `${className} shrink-0`
  switch (cat) {
    case 'Paneles solares':
      return <Sun className={cls} strokeWidth={1.5} />
    case 'Plantas eléctricas':
      return <Fuel className={cls} strokeWidth={1.5} />
    case 'Otros':
      return <Package className={cls} strokeWidth={1.5} />
    default:
      return <Zap className={cls} strokeWidth={1.5} />
  }
}

/* ---------- Icono WhatsApp (SVG oficial) ---------- */

function IconoWhatsApp({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

/* ---------- Etiquetas MÁS VENDIDO / EN REBAJA ---------- */

function ChipsProducto({ p, pequeno }: { p: Producto; pequeno?: boolean }) {
  const chips: { texto: string; clase: string }[] = []
  if (p.top_ventas) chips.push({ texto: 'MÁS VENDIDO', clase: 'bg-[#FFD21E] text-neutral-900' })
  if (p.oferta) chips.push({ texto: 'EN REBAJA', clase: 'bg-neutral-900 text-white' })
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.texto}
          className={`rounded-full font-bold tracking-wide ${c.clase} ${
            pequeno ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
          }`}
        >
          {c.texto}
        </span>
      ))}
    </div>
  )
}

/* ---------- Imagen con reserva ---------- */

function ImagenProducto({ p, alta }: { p: Producto; alta?: boolean }) {
  const [error, setError] = useState(false)
  if (!p.primary_image || error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-300">
        <IconoCategoria cat={p.category} className={alta ? 'h-16 w-16' : 'h-8 w-8'} />
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {p.brand || 'Sin foto'}
        </span>
      </div>
    )
  }
  return (
    <img
      src={`/${p.primary_image}`}
      alt={p.name}
      loading="lazy"
      onError={() => setError(true)}
      className="h-full w-full object-contain"
    />
  )
}

/* ---------- Constantes ---------- */

const ID_BANNER_OFERTA = 'PRD-ecoflow-delta-3-plus'
const CLAVE_CARRITO = 'powergy-carrito-v1'

type Carrito = Record<string, number>

/* ---------- Página ---------- */

export default function Catalogo() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [detalle, setDetalle] = useState<Producto | null>(null)
  const [categoria, setCategoria] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null)
  const [intentoCarga, setIntentoCarga] = useState(0)
  const [carrito, setCarrito] = useState<Carrito>({})
  const [toast, setToast] = useState<string | null>(null)

  const cargarCatalogo = useCallback(async (signal: AbortSignal) => {
    try {
      const catalogo = await obtenerCatalogo(signal)
      if (!signal.aborted) setProductos(catalogo)
    } catch (error) {
      if (signal.aborted) return
      setErrorCatalogo(
        error instanceof Error
          ? `No pudimos cargar el catálogo. ${error.message}`
          : 'No pudimos cargar el catálogo. Intenta nuevamente.'
      )
    } finally {
      if (!signal.aborted) setCargandoCatalogo(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void cargarCatalogo(controller.signal)
    return () => controller.abort()
  }, [cargarCatalogo, intentoCarga])

  /* Carrito persistente en localStorage */
  useEffect(() => {
    try {
      const crudo = localStorage.getItem(CLAVE_CARRITO)
      // Cargar estado persistido al montar es un uso legítimo de setState en efecto.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (crudo) setCarrito(JSON.parse(crudo) as Carrito)
    } catch {
      /* ignora */
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito))
    } catch {
      /* ignora */
    }
  }, [carrito])

  /* Bloquea el scroll del fondo cuando hay un panel abierto */
  useEffect(() => {
    document.body.style.overflow = menuAbierto || carritoAbierto || detalle ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuAbierto, carritoAbierto, detalle])

  /* Toast se auto-oculta */
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  /* Cierra paneles y modal con la tecla Escape */
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setDetalle(null)
      setMenuAbierto(false)
      setCarritoAbierto(false)
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [])

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos])

  const destacados = useMemo(
    () =>
      productos
        .filter((p) => p.top_ventas)
        .sort((a, b) => (a.top_rank ?? 99) - (b.top_rank ?? 99))
        .slice(0, 6),
    [productos]
  )

  const bannerOferta = useMemo(() => porId.get(ID_BANNER_OFERTA) ?? null, [porId])

  const conteos = useMemo(() => {
    const m: Record<string, number> = { Todos: productos.length }
    for (const c of ORDEN_CATEGORIAS) {
      const n = productos.filter((p) => p.category === c).length
      if (n > 0) m[c] = n
    }
    return m
  }, [productos])

  const categoriasVisibles = useMemo(
    () => ORDEN_CATEGORIAS.filter((c) => conteos[c] > 0),
    [conteos]
  )

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return productos.filter((p) => {
      const okCat = !categoria || p.category === categoria
      const okQ =
        !q || normalizar(`${p.name} ${p.brand} ${p.model} ${p.specifications}`).includes(q)
      return okCat && okQ
    })
  }, [categoria, busqueda, productos])

  const itemsCarrito = useMemo(
    () =>
      Object.entries(carrito)
        .map(([id, cant]) => ({ p: porId.get(id), cant }))
        .filter((x): x is { p: Producto; cant: number } => Boolean(x.p) && x.cant > 0),
    [carrito, porId]
  )
  const totalArticulos = itemsCarrito.reduce((n, x) => n + x.cant, 0)
  const totalUSD = itemsCarrito.reduce(
    (s, x) => s + (tienePrecio(x.p) ? (x.p.price_usd as number) * x.cant : 0),
    0
  )

  const linkPedido = useMemo(() => {
    if (itemsCarrito.length === 0) return linkGeneral()
    const lineas = itemsCarrito.map((x) => {
      const precio = tienePrecio(x.p) ? formatoPrecio(x.p.price_usd as number) : 'precio por confirmar'
      return `• ${x.cant} × ${x.p.name} — ${precio}`
    })
    const total = totalUSD > 0 ? `\n\nTotal estimado: ${formatoPrecio(totalUSD)}` : ''
    return linkWhatsApp(`Hola POWERGY, quiero hacer este pedido:\n\n${lineas.join('\n')}${total}`)
  }, [itemsCarrito, totalUSD])

  function agregar(id: string) {
    setCarrito((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
    const p = porId.get(id)
    setToast(p ? `${p.name} añadido al carrito` : 'Añadido al carrito')
  }

  function cambiar(id: string, delta: number) {
    setCarrito((c) => {
      const nueva = (c[id] ?? 0) + delta
      const copia = { ...c }
      if (nueva <= 0) delete copia[id]
      else copia[id] = nueva
      return copia
    })
  }

  function quitar(id: string) {
    setCarrito((c) => {
      const copia = { ...c }
      delete copia[id]
      return copia
    })
  }

  function irACatalogo(cat: string | null) {
    setCategoria(cat)
    setMenuAbierto(false)
    requestAnimationFrame(() =>
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
    )
  }

  const filaMenu = (activo: boolean) =>
    `mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      activo ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
    }`

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 md:gap-6 md:px-8">
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="rounded-lg p-2 transition hover:bg-neutral-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setCategoria(null)
              setBusqueda('')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-label="POWERGY - volver arriba"
            className="shrink-0"
          >
            <img src="/logo-powergy-claro.png" alt="POWERGY" className="h-8 w-auto md:h-9" />
          </button>
          <div className="hidden flex-1 justify-center md:flex">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar productos..."
                aria-label="Buscar productos"
                className="h-11 w-full rounded-full bg-neutral-100 pl-11 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-2 focus:ring-neutral-200"
              />
            </div>
          </div>
          <button
            onClick={() => setCarritoAbierto(true)}
            aria-label={`Abrir carrito, ${totalArticulos} artículos`}
            className="relative ml-auto rounded-lg p-2 transition hover:bg-neutral-100 md:ml-0"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFD21E] px-1 text-[10px] font-bold text-neutral-900">
              {totalArticulos}
            </span>
          </button>
        </div>
        {/* Búsqueda en móvil */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              className="h-10 w-full rounded-full bg-neutral-100 pl-11 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-2 focus:ring-neutral-200"
            />
          </div>
        </div>
      </header>

      {errorCatalogo && (
        <div
          role="alert"
          className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 md:px-8"
        >
          <p className="text-sm text-red-700">{errorCatalogo}</p>
          <button
            onClick={() => {
              setCargandoCatalogo(true)
              setErrorCatalogo(null)
              setIntentoCarga((intento) => intento + 1)
            }}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
          >
            Reintentar
          </button>
        </div>
      )}

      <main>
        {/* ===== Hero ===== */}
        <section className="bg-[#eef0f3]">
          <div className="grid items-stretch lg:grid-cols-2">
            <div className="relative z-10 flex flex-col justify-center py-12 lg:py-24">
              <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:pr-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 md:text-xs">
                  Energía limpia, un mejor futuro
                </p>
                <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-4xl md:text-5xl">
                  Soluciones en energía renovable
                </h1>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-500 md:text-base">
                  Equipos de alta calidad para que tengas energía confiable, eficiente y sostenible.
                </p>
                <div className="mt-7">
                  <button
                    onClick={() => irACatalogo(null)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FFD21E] px-6 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-[#f2c500] active:scale-[0.98]"
                  >
                    Ver productos <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="relative min-h-56 lg:min-h-[26rem]">
              <img
                src="/assets/hero-solar.jpg"
                alt="Paneles solares instalados en el techo de una casa"
                className="absolute inset-0 h-full w-full object-cover lg:[mask-image:linear-gradient(to_right,transparent,black_28%)]"
              />
              <img
                src="/logo-powergy-claro.png"
                alt=""
                aria-hidden="true"
                className="absolute right-6 top-6 hidden h-10 w-auto drop-shadow-sm lg:block xl:right-10"
              />
            </div>
          </div>
        </section>

        {/* ===== Categorías ===== */}
        <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-12">
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            {categoriasVisibles.map((cat) => (
              <button
                key={cat}
                onClick={() => irACatalogo(cat)}
                className="group flex flex-col items-center gap-2.5 rounded-2xl bg-[#f5f6f8] px-3 py-6 transition hover:-translate-y-0.5 hover:shadow-md md:py-9"
              >
                <IconoCategoria
                  cat={cat}
                  className="h-9 w-9 text-neutral-800 transition group-hover:text-neutral-900 md:h-11 md:w-11"
                />
                <span className="text-center text-xs font-semibold leading-tight text-neutral-800 md:text-sm">
                  {cat}
                </span>
                <span className="-mt-1 text-[10px] font-medium text-neutral-400 md:text-xs">
                  {conteos[cat]} productos
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ===== Productos destacados ===== */}
        <section className="mx-auto max-w-7xl px-4 pt-10 md:px-8 md:pt-14">
          <div className="mb-5 flex items-end justify-between md:mb-7">
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">
              Productos destacados
            </h2>
            <button
              onClick={() => irACatalogo(null)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 transition hover:text-neutral-900"
            >
              Ver todos <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {cargandoCatalogo && (
              <p role="status" className="text-sm text-neutral-500">
                Cargando productos destacados...
              </p>
            )}
            {!cargandoCatalogo && !errorCatalogo && destacados.map((p) => (
              <article
                key={p.id}
                className="flex gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <button
                  onClick={() => setDetalle(p)}
                  aria-label={`Ver detalle de ${p.name}`}
                  className="relative flex h-32 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f6f8] sm:h-36 sm:w-36"
                >
                  <ImagenProducto p={p} />
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <ChipsProducto p={p} />
                  <button
                    onClick={() => setDetalle(p)}
                    className="mt-1.5 text-left text-sm font-bold leading-snug text-neutral-900 hover:underline sm:text-base"
                  >
                    {p.name}
                  </button>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                    {[p.brand, p.specifications].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-auto pt-2 text-lg font-extrabold tracking-tight text-neutral-900 sm:text-xl">
                    {precioTexto(p)}
                  </p>
                  <button
                    onClick={() => agregar(p.id)}
                    className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-200 active:scale-[0.98] sm:w-auto sm:self-start"
                  >
                    <ShoppingCart className="h-4 w-4" /> Añadir al carrito
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ===== Banner oferta especial ===== */}
        {bannerOferta && (
          <section className="mx-auto max-w-7xl px-4 pt-10 md:px-8 md:pt-14">
            <div className="overflow-hidden rounded-3xl bg-neutral-900 text-white">
              <div className="grid items-center md:grid-cols-[1.2fr_1fr]">
                <div className="px-6 py-8 md:px-10 md:py-12">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFD21E]">
                    Oferta especial
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight md:text-4xl">
                    {bannerOferta.name}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-300">
                    {bannerOferta.specifications}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-extrabold tracking-tight md:text-3xl">
                      {precioTexto(bannerOferta)}
                    </p>
                    <span className="rounded-full bg-[#FFD21E] px-3 py-1 text-[11px] font-bold text-neutral-900">
                      EN REBAJA
                    </span>
                  </div>
                  <button
                    onClick={() => setDetalle(bannerOferta)}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 transition hover:bg-neutral-100 active:scale-[0.98]"
                  >
                    Ver producto <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative h-60 p-4 md:h-80 md:p-8">
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white p-3 shadow-lg">
                    <ImagenProducto p={bannerOferta} alta />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== Catálogo completo ===== */}
        <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-10 md:px-8 md:pt-14">
          <div className="mb-5 md:mb-7">
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">
              Todos los productos
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
            </p>
          </div>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
            {['Todos', ...categoriasVisibles].map((cat) => {
              const activo = cat === 'Todos' ? !categoria : categoria === cat
              return (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat === 'Todos' ? null : cat)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activo ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat}{' '}
                  <span className={activo ? 'text-neutral-300' : 'text-neutral-400'}>
                    ({conteos[cat]})
                  </span>
                </button>
              )
            })}
          </div>
          {cargandoCatalogo ? (
            <div role="status" className="rounded-2xl bg-neutral-50 py-16 text-center">
              <p className="text-sm font-medium text-neutral-500">Cargando catálogo...</p>
            </div>
          ) : errorCatalogo ? (
            <div className="rounded-2xl bg-neutral-50 py-16 text-center">
              <p className="text-sm font-medium text-neutral-500">
                El catálogo no está disponible en este momento.
              </p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="rounded-2xl bg-neutral-50 py-16 text-center">
              <p className="text-sm font-medium text-neutral-500">
                No encontramos productos para tu búsqueda.
              </p>
              <button
                onClick={() => {
                  setBusqueda('')
                  setCategoria(null)
                }}
                className="mt-3 text-sm font-semibold text-neutral-900 underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {filtrados.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm transition hover:shadow-md"
                >
                  <button
                    onClick={() => setDetalle(p)}
                    aria-label={`Ver detalle de ${p.name}`}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f5f6f8]"
                  >
                    <ImagenProducto p={p} />
                    <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
                      {p.top_ventas && (
                        <span className="rounded-full bg-[#FFD21E] px-2 py-0.5 text-[9px] font-bold text-neutral-900 shadow-sm">
                          MÁS VENDIDO
                        </span>
                      )}
                      {p.oferta && (
                        <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                          EN REBAJA
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col px-1 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      {p.brand}
                    </p>
                    <button
                      onClick={() => setDetalle(p)}
                      className="mt-0.5 line-clamp-2 text-left text-xs font-bold leading-snug text-neutral-900 hover:underline sm:text-sm"
                    >
                      {p.name}
                    </button>
                    <p className="mt-1 hidden line-clamp-1 text-xs text-neutral-400 sm:block">
                      {p.specifications}
                    </p>
                    <p className="mt-auto pt-2 text-base font-extrabold tracking-tight text-neutral-900 sm:text-lg">
                      {precioTexto(p)}
                    </p>
                    <button
                      onClick={() => agregar(p.id)}
                      aria-label={`Añadir ${p.name} al carrito`}
                      className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 py-2.5 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-200 active:scale-[0.98] sm:text-sm"
                    >
                      <ShoppingCart className="h-4 w-4" /> Añadir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ===== Ventajas ===== */}
        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 rounded-3xl bg-[#f5f6f8] px-6 py-10 md:grid-cols-4 md:px-10">
            {[
              { icono: ShieldCheck, titulo: 'Garantía', texto: 'Hasta 5 años en todos nuestros productos' },
              { icono: Truck, titulo: 'Envíos', texto: 'Rápidos y seguros a todo el país' },
              { icono: Headphones, titulo: 'Soporte', texto: 'Atención personalizada antes y después de tu compra' },
              { icono: Lock, titulo: 'Compra segura', texto: 'Trato directo y confiable por WhatsApp' },
            ].map((v) => (
              <div key={v.titulo} className="flex flex-col items-center gap-2 text-center md:flex-row md:items-start md:gap-3 md:text-left">
                <v.icono className="h-6 w-6 shrink-0 text-neutral-800" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-bold text-neutral-900">{v.titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">{v.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ===== Menú lateral ===== */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <img src="/logo-powergy-claro.png" alt="POWERGY" className="h-8 w-auto" />
              <button
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-2 transition hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                Catálogo
              </p>
              <button onClick={() => irACatalogo(null)} className={filaMenu(!categoria)}>
                <Package className="h-4 w-4 shrink-0" />
                <span className="truncate">Todos los productos</span>
                <span className="ml-auto text-xs font-medium text-neutral-400">{conteos.Todos}</span>
              </button>
              {categoriasVisibles.map((cat) => (
                <button key={cat} onClick={() => irACatalogo(cat)} className={filaMenu(categoria === cat)}>
                  <IconoCategoria cat={cat} className="h-4 w-4" />
                  <span className="truncate">{cat}</span>
                  <span className="ml-auto text-xs font-medium text-neutral-400">{conteos[cat]}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-neutral-100 p-5">
              <p className="text-xs text-neutral-400">¿Dudas? Escríbenos</p>
              <a
                href={linkGeneral()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
              >
                <IconoWhatsApp className="h-4 w-4" /> WhatsApp {WHATSAPP_VISIBLE}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== Carrito ===== */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Carrito de compras">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCarritoAbierto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h3 className="text-base font-extrabold tracking-tight">
                Tu carrito <span className="font-semibold text-neutral-400">({totalArticulos})</span>
              </h3>
              <button
                onClick={() => setCarritoAbierto(false)}
                aria-label="Cerrar carrito"
                className="rounded-lg p-2 transition hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {itemsCarrito.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <ShoppingCart className="h-10 w-10 text-neutral-200" strokeWidth={1.5} />
                <p className="text-sm font-medium text-neutral-500">Tu carrito está vacío.</p>
                <button
                  onClick={() => setCarritoAbierto(false)}
                  className="text-sm font-semibold text-neutral-900 underline"
                >
                  Explorar productos
                </button>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-neutral-100 overflow-y-auto px-5">
                  {itemsCarrito.map(({ p, cant }) => (
                    <li key={p.id} className="flex gap-3 py-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f6f8]">
                        <ImagenProducto p={p} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-bold leading-snug text-neutral-900 sm:text-sm">
                          {p.name}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {tienePrecio(p) ? `${formatoPrecio(p.price_usd as number)} c/u` : 'precio por confirmar'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => cambiar(p.id, -1)}
                            aria-label={`Quitar una unidad de ${p.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 transition hover:bg-neutral-200"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{cant}</span>
                          <button
                            onClick={() => cambiar(p.id, 1)}
                            aria-label={`Añadir una unidad de ${p.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 transition hover:bg-neutral-200"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => quitar(p.id)}
                            aria-label={`Eliminar ${p.name} del carrito`}
                            className="ml-auto rounded-lg p-1.5 text-neutral-300 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="w-20 shrink-0 text-right text-sm font-extrabold">
                        {tienePrecio(p) ? formatoPrecio((p.price_usd as number) * cant) : '—'}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-neutral-100 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Total estimado</span>
                    <span className="text-xl font-extrabold tracking-tight">{formatoPrecio(totalUSD)}</span>
                  </div>
                  <a
                    href={linkPedido}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 active:scale-[0.99]"
                  >
                    <IconoWhatsApp className="h-5 w-5" /> Pedir por WhatsApp
                  </a>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[11px] text-neutral-400">Te atendemos por WhatsApp, sin registros.</p>
                    <button
                      onClick={() => setCarrito({})}
                      className="text-[11px] font-semibold text-neutral-400 underline hover:text-neutral-600"
                    >
                      Vaciar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Modal de detalle ===== */}
      {detalle && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de ${detalle.name}`}
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetalle(null)} />
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <button
              onClick={() => setDetalle(null)}
              aria-label="Cerrar detalle"
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow-sm transition hover:bg-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="grid min-h-0 flex-1 overflow-y-auto sm:grid-cols-2">
              <div className="flex aspect-square items-center justify-center bg-[#f5f6f8] p-6 sm:aspect-auto sm:min-h-[26rem]">
                <ImagenProducto p={detalle} alta />
              </div>
              <div className="flex flex-col p-6 md:p-8">
                <ChipsProducto p={detalle} />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  {detalle.brand}
                </p>
                <h3 className="mt-1 text-xl font-extrabold leading-snug tracking-tight text-neutral-900 md:text-2xl">
                  {detalle.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{detalle.specifications}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {detalle.garantia && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                      Garantía
                    </span>
                  )}
                  {detalle.transporte && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                      Transporte
                    </span>
                  )}
                  {detalle.factura && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                      Factura
                    </span>
                  )}
                </div>
                <p className="mt-auto pt-5 text-2xl font-extrabold tracking-tight text-neutral-900 md:text-3xl">
                  {precioTexto(detalle)}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => agregar(detalle.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-200 active:scale-[0.98]"
                  >
                    <ShoppingCart className="h-4 w-4" /> Añadir al carrito
                  </button>
                  <a
                    href={linkProducto(detalle)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 active:scale-[0.98]"
                  >
                    <IconoWhatsApp className="h-4 w-4" /> Consultar
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <p className="flex items-center gap-2 whitespace-nowrap rounded-full bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FFD21E]">
              <Check className="h-3 w-3 text-neutral-900" strokeWidth={3} />
            </span>
            <span className="max-w-[70vw] truncate">{toast}</span>
          </p>
        </div>
      )}
    </div>
  )
}
