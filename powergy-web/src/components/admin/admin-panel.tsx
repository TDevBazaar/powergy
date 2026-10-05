'use client'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ChangeEvent,
} from 'react'
import Link from 'next/link'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import {
  actualizarProducto,
  crearProducto,
  desactivarCategoria,
  desactivarProducto,
  guardarCategoria,
  obtenerCategoriasAdmin,
  obtenerProductosAdmin,
  type CategoriaAdmin,
  type ProductoAdmin,
} from '@/lib/admin-api'
import { getSupabaseClient } from '@/lib/supabase'

type Pestaña = 'productos' | 'categorias'

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
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([])
  const [productoEnEdicion, setProductoEnEdicion] = useState<string | null>(null)
  const [formularioProducto, setFormularioProducto] =
    useState<FormularioProducto>(productoVacio)
  const [formularioCategoria, setFormularioCategoria] =
    useState<FormularioCategoria>(categoriaVacia)
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

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
      return
    }

    let activo = true
    setLoading(true)
    setPanelError('')

    Promise.all([
      obtenerProductosAdmin(session.access_token),
      obtenerCategoriasAdmin(session.access_token),
    ])
      .then(([productosAdmin, categoriasAdmin]) => {
        if (!activo) return
        setProductos(productosAdmin)
        setCategorias(categoriasAdmin)
      })
      .catch((error: unknown) => {
        if (activo) setPanelError(mensajeError(error))
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [session])

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase()
    if (!termino) return productos
    return productos.filter((producto) =>
      [producto.name, producto.brand, producto.model, producto.slug]
        .join(' ')
        .toLocaleLowerCase()
        .includes(termino),
    )
  }, [busqueda, productos])

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
      const [productosAdmin, categoriasAdmin] = await Promise.all([
        obtenerProductosAdmin(session.access_token),
        obtenerCategoriasAdmin(session.access_token),
      ])
      setProductos(productosAdmin)
      setCategorias(categoriasAdmin)
    } catch (error) {
      setPanelError(mensajeError(error))
    } finally {
      setLoading(false)
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      await recargarDatos()
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
          {(['productos', 'categorias'] as const).map((section) => (
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
            onClick={() => void recargarDatos()}
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

        {pestaña === 'productos' ? (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.8fr)]">
            <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-neutral-900">Productos</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {loading ? 'Cargando catálogo...' : `${productos.length} productos`}
                  </p>
                </div>
                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar producto"
                  aria-label="Buscar producto"
                  className="h-10 w-full max-w-xs rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>

              <div className="mt-5 divide-y divide-neutral-100">
                {productosFiltrados.map((producto) => (
                  <article key={producto.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                      {producto.primary_image && (
                        <img
                          src={producto.primary_image}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-neutral-900">{producto.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            producto.isActive
                              ? 'bg-green-50 text-green-700'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {producto.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-neutral-500">
                        {producto.brand} · {producto.category}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => comenzarEdicionProducto(producto)}
                          className="text-xs font-semibold text-neutral-700 underline underline-offset-2"
                        >
                          Editar
                        </button>
                        {producto.isActive && (
                          <button
                            type="button"
                            onClick={() => void archivarProducto(producto)}
                            className="text-xs font-semibold text-red-600 underline underline-offset-2"
                          >
                            Desactivar
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                {!loading && productosFiltrados.length === 0 && (
                  <p className="py-10 text-center text-sm text-neutral-500">No hay productos para mostrar.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-neutral-900">
                    {productoEnEdicion ? 'Editar producto' : 'Nuevo producto'}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">Los cambios se guardan en el catálogo publicado.</p>
                </div>
                {productoEnEdicion && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductoEnEdicion(null)
                      setFormularioProducto(productoVacio)
                    }}
                    className="text-xs font-semibold text-neutral-500 underline"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <form onSubmit={guardarProducto} className="mt-5 grid gap-4 sm:grid-cols-2">
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
                      src={formularioProducto.primaryImage}
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

                <button
                  type="submit"
                  disabled={saving || uploading || categorias.every((category) => !category.isActive)}
                  className="h-11 rounded-xl bg-[#FFD21E] px-4 text-sm font-bold text-neutral-900 transition hover:bg-[#f2c500] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                >
                  {saving ? 'Guardando...' : productoEnEdicion ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </form>
            </section>
          </div>
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
