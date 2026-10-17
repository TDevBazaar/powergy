"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BadgeDollarSign,
  Boxes,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { formatDate, formatPrice, formatPriceLabel } from "@/lib/format";
import { slugify, type ApiCategory, type ApiProduct } from "@/lib/powergy-api";
import {
  CANCELLATION_REASONS,
  STATUS_LABELS,
  closeOrder,
  createCategory,
  createProduct,
  deactivateCategory,
  deactivateProduct,
  fetchAdminCategories,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchOrder,
  fetchOrderMetrics,
  updateCategory,
  updateProduct,
  type AdminOrder,
  type AdminOrderListItem,
  type OrderMetrics,
} from "@/lib/admin-api";
import { STORAGE_BUCKET, getSupabaseClient } from "@/lib/supabase";
import { reloadCatalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-camel/15 text-camel-deep",
  closed: "bg-[#4E5B48]/15 text-[#4E5B48]",
  cancelled: "bg-[#B3402E]/12 text-[#B3402E]",
};

interface ProductForm {
  id: string | null;
  name: string;
  slug: string;
  categoryId: string;
  subcategory: string;
  brand: string;
  model: string;
  price: string;
  image: string;
  specifications: string;
  onSale: boolean;
  topVentas: boolean;
  active: boolean;
}

const emptyProduct: ProductForm = {
  id: null,
  name: "",
  slug: "",
  categoryId: "",
  subcategory: "",
  brand: "",
  model: "",
  price: "",
  image: "",
  specifications: "",
  onSale: false,
  topVentas: false,
  active: true,
};

interface CategoryForm {
  id: string | null;
  name: string;
  sortOrder: string;
}

const emptyCategory: CategoryForm = {
  id: null,
  name: "",
  sortOrder: "0",
};

interface EditableLine {
  productId: string;
  productName: string;
  quantity: number;
  price: string;
  quitar: boolean;
}

function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

export function AdminView() {
  /* ── Sesión ─────────────────────────────────────────────────── */
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [token, setToken] = useState("");
  const [sesionEmail, setSesionEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Datos ──────────────────────────────────────────────────── */
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics | null>(null);
  const [cargando, setCargando] = useState(false);
  const [panelError, setPanelError] = useState("");

  const [query, setQuery] = useState("");
  const [modalProducto, setModalProducto] = useState(false);
  const [formProducto, setFormProducto] = useState<ProductForm>(emptyProduct);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const [modalCategoria, setModalCategoria] = useState(false);
  const [formCategoria, setFormCategoria] = useState<CategoryForm>(emptyCategory);

  const [solicitud, setSolicitud] = useState<AdminOrderListItem | null>(null);
  const [detalle, setDetalle] = useState<AdminOrder | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [itemsEdicion, setItemsEdicion] = useState<EditableLine[]>([]);
  const [resultado, setResultado] = useState<"closed" | "cancelled">("closed");
  const [motivo, setMotivo] = useState("price");
  const [nota, setNota] = useState("");
  const [confirmarSinPrecio, setConfirmarSinPrecio] = useState(false);

  /* ── Sesión de Supabase ─────────────────────────────────────── */
  useEffect(() => {
    let activo = true;
    let cliente: SupabaseClient;

    try {
      cliente = getSupabaseClient();
      setSupabase(cliente);
    } catch (error) {
      setLoginError(mensajeError(error));
      setInitializing(false);
      return;
    }

    const {
      data: { subscription },
    } = cliente.auth.onAuthStateChange((_event, sesion) => {
      if (!activo) return;
      setToken(sesion?.access_token ?? "");
      setSesionEmail(sesion?.user?.email ?? "");
      setInitializing(false);
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  const iniciarSesion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setLoginError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setLoginError(error.message);
    } catch (error) {
      setLoginError(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  const cerrarSesion = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken("");
    setSesionEmail("");
  };

  /* ── Carga de datos ─────────────────────────────────────────── */
  const recargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setPanelError("");
    try {
      const [productos, categorias, solicitudes, estadisticas] =
        await Promise.all([
          fetchAdminProducts(token),
          fetchAdminCategories(token),
          fetchAdminOrders(token),
          fetchOrderMetrics(token),
        ]);
      setProducts(productos.items);
      setCategories(categorias);
      setOrders(solicitudes.items);
      setMetrics(estadisticas);
      reloadCatalog();
    } catch (error) {
      setPanelError(mensajeError(error));
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void recargar();
  }, [token, recargar]);

  useEffect(() => {
    if (!modalProducto) {
      setFormProducto(emptyProduct);
    }
  }, [modalProducto]);

  useEffect(() => {
    if (!modalCategoria) {
      setFormCategoria(emptyCategory);
    }
  }, [modalCategoria]);

  /* ── Productos ──────────────────────────────────────────────── */
  const categoriasActivas = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const productosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, query]);

  const abrirNuevoProducto = () => {
    setFormProducto({
      ...emptyProduct,
      categoryId: categoriasActivas[0]?.id ?? "",
    });
    setModalProducto(true);
  };

  const abrirEdicionProducto = (producto: ApiProduct) => {
    setFormProducto({
      id: producto.id,
      name: producto.name,
      slug: producto.slug,
      categoryId: producto.categoryId,
      subcategory: producto.subcategory,
      brand: producto.brand,
      model: producto.model,
      price: producto.price_usd === null ? "" : String(producto.price_usd),
      image: producto.primary_image,
      specifications: producto.specifications,
      onSale: producto.oferta,
      topVentas: producto.top_ventas || producto.top_rank !== null,
      active: producto.isActive,
    });
    setModalProducto(true);
  };

  const guardarProducto = async () => {
    if (!token) return;
    const name = formProducto.name.trim();
    const slug = (formProducto.slug.trim() || slugify(name)).toLowerCase();
    if (name.length < 3) {
      toast.error("El nombre necesita al menos 3 caracteres.");
      return;
    }
    if (!slug) {
      toast.error("Indica un enlace (slug) para el producto.");
      return;
    }
    if (!formProducto.categoryId) {
      toast.error("Elige una categoría.");
      return;
    }
    if (!formProducto.image.trim()) {
      toast.error("Sube una imagen o pega su dirección.");
      return;
    }

    const precioTexto = formProducto.price.trim().replace(",", ".");
    const precio = precioTexto === "" ? null : Number.parseFloat(precioTexto);
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
      toast.error("El precio no es válido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        slug,
        categoryId: formProducto.categoryId,
        subcategory: formProducto.subcategory.trim() || "General",
        brand: formProducto.brand.trim() || "NOVA MODA",
        model: formProducto.model.trim() || name,
        name,
        priceUsd: precio,
        specifications: formProducto.specifications.trim() || name,
        primaryImage: formProducto.image.trim(),
        onSale: formProducto.onSale,
        warranty: false,
        transport: false,
        invoice: false,
        topRank: formProducto.topVentas ? 1 : null,
        isActive: formProducto.active,
      };

      if (formProducto.id) {
        await updateProduct(token, formProducto.id, payload);
        toast.success("Producto actualizado");
      } else {
        await createProduct(token, payload);
        toast.success("Producto creado");
      }
      setModalProducto(false);
      await recargar();
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  const alternarProducto = async (producto: ApiProduct) => {
    if (!token) return;
    try {
      if (producto.isActive) {
        await deactivateProduct(token, producto.id);
        toast.info(`“${producto.name}” oculto en la tienda`);
      } else {
        await updateProduct(token, producto.id, {
          id: producto.id,
          slug: producto.slug,
          categoryId: producto.categoryId,
          subcategory: producto.subcategory,
          brand: producto.brand,
          model: producto.model,
          name: producto.name,
          priceUsd: producto.price_usd,
          specifications: producto.specifications,
          primaryImage: producto.primary_image,
          onSale: producto.oferta,
          warranty: producto.garantia,
          transport: producto.transporte,
          invoice: producto.factura,
          topRank: producto.top_rank,
          isActive: true,
        });
        toast.success(`“${producto.name}” visible otra vez`);
      }
      await recargar();
    } catch (error) {
      toast.error(mensajeError(error));
    }
  };

  const subirImagen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      toast.error("Usa una imagen JPG, PNG, WebP o AVIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 10 MB.");
      return;
    }

    setSubiendoImagen(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `nova-moda/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: false, cacheControl: "31536000" });
      if (error) throw error;
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      setFormProducto((prev) => ({ ...prev, image: data.publicUrl }));
      toast.success("Imagen subida");
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSubiendoImagen(false);
    }
  };

  /* ── Categorías ─────────────────────────────────────────────── */
  const guardarCategoria = async () => {
    if (!token) return;
    const name = formCategoria.name.trim();
    const slug = slugify(name);
    const orden = Number.parseInt(formCategoria.sortOrder, 10);
    if (name.length < 2) {
      toast.error("El nombre de la categoría es muy corto.");
      return;
    }
    if (!slug) {
      toast.error("El nombre debe contener letras o números.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        sortOrder: Number.isFinite(orden) ? orden : 0,
      };
      if (formCategoria.id) {
        await updateCategory(token, formCategoria.id, payload);
        toast.success("Categoría actualizada");
      } else {
        await createCategory(token, payload);
        toast.success("Categoría creada");
      }
      setModalCategoria(false);
      await recargar();
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  const alternarCategoria = async (categoria: ApiCategory) => {
    if (!token) return;
    try {
      if (categoria.isActive) {
        await deactivateCategory(token, categoria.id);
        toast.info(`Categoría “${categoria.name}” desactivada`);
      } else {
        await updateCategory(token, categoria.id, {
          name: categoria.name,
          slug: categoria.slug,
          sortOrder: categoria.sortOrder,
        });
        toast.success(`Categoría “${categoria.name}” activada`);
      }
      await recargar();
    } catch (error) {
      toast.error(mensajeError(error));
    }
  };

  /* ── Solicitudes ────────────────────────────────────────────── */
  const abrirSolicitud = async (item: AdminOrderListItem) => {
    if (!token) return;
    setSolicitud(item);
    setDetalle(null);
    setItemsEdicion([]);
    setResultado("closed");
    setMotivo("price");
    setNota("");
    setConfirmarSinPrecio(false);
    setCargandoDetalle(true);
    try {
      const completa = await fetchOrder(token, item.id);
      setDetalle(completa);
      setItemsEdicion(
        completa.items.map((linea) => ({
          productId: linea.productId,
          productName: linea.productName,
          quantity: linea.quantity,
          price:
            linea.unitPriceUsd === null ? "" : String(linea.unitPriceUsd),
          quitar: false,
        }))
      );
    } catch (error) {
      toast.error(mensajeError(error));
      setSolicitud(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const lineasFinales = itemsEdicion.filter((l) => !l.quitar);
  const haySinPrecio = lineasFinales.some((l) => {
    const valor = Number.parseFloat(l.price.replace(",", "."));
    return !Number.isFinite(valor) || valor <= 0;
  });

  const cerrarSolicitud = async () => {
    if (!token || !solicitud) return;
    if (lineasFinales.length === 0) {
      toast.error("La solicitud necesita al menos un producto.");
      return;
    }
    if (resultado === "cancelled" && !motivo) {
      toast.error("Indica el motivo de la cancelación.");
      return;
    }
    if (resultado === "closed" && haySinPrecio && !confirmarSinPrecio) {
      toast.error("Confirma que vas a vender con productos sin precio.");
      return;
    }

    setSaving(true);
    try {
      await closeOrder(token, solicitud.id, {
        outcome: resultado,
        items: lineasFinales.map((l) => {
          const valor = Number.parseFloat(l.price.replace(",", "."));
          return {
            productId: l.productId,
            quantity: l.quantity,
            unitPriceUsd: Number.isFinite(valor) ? valor : null,
          };
        }),
        cancellationReason: resultado === "cancelled" ? motivo : null,
        cancellationNote: resultado === "cancelled" ? nota.trim() || null : null,
      });
      toast.success(
        resultado === "closed" ? "Solicitud marcada como vendida" : "Solicitud cancelada"
      );
      setSolicitud(null);
      setDetalle(null);
      await recargar();
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  /* ── Sesión todavía en marcha ───────────────────────────────── */
  if (initializing) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-24 sm:px-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Comprobando la sesión…
        </p>
      </div>
    );
  }

  /* ── Acceso ─────────────────────────────────────────────────── */
  if (!token) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-7">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
            <ShieldCheck className="h-3.5 w-3.5" />
            NOVA MODA · ADMIN
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Panel de gestión
          </h1>
        </header>

        <div className="mx-auto max-w-md rounded-[1.6rem] bg-card p-6 shadow-card sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <ShieldCheck className="h-5 w-5 text-camel-deep" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Acceso del personal</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Entra con tu cuenta de Supabase para gestionar el catálogo, las
            categorías y las solicitudes de la tienda.
          </p>

          <form onSubmit={iniciarSesion} className="mt-6 grid gap-4">
            <div>
              <Label htmlFor="admin-email">Correo electrónico</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                className="mt-1.5 h-11 rounded-2xl border-input bg-background"
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Contraseña</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="mt-1.5 h-11 rounded-2xl border-input bg-background"
              />
            </div>
            {loginError && (
              <p className="rounded-2xl bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive">
                {loginError}
              </p>
            )}
            <Button
              type="submit"
              disabled={saving || !supabase}
              className="h-11 rounded-full text-sm font-semibold"
            >
              {saving ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Panel ──────────────────────────────────────────────────── */
  const cerradas = metrics?.closedRequests ?? 0;
  const canceladas = metrics?.cancelledRequests ?? 0;
  const tasa =
    metrics?.closeRate === null || metrics?.closeRate === undefined
      ? "—"
      : `${Math.round(metrics.closeRate * 100)} %`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      {/* Aviso del panel */}
      <div className="mb-7 flex flex-wrap items-start gap-3 rounded-[1.4rem] border border-dashed border-camel bg-card p-4.5 shadow-card sm:items-center">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-camel-deep sm:mt-0" />
        <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">
            Panel conectado a la tienda real.
          </span>{" "}
          Los cambios se guardan en el API de NOVA MODA
          {sesionEmail ? ` · ${sesionEmail}` : ""}.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void cerrarSesion()}
          className="h-9 shrink-0 rounded-full border-input bg-card"
        >
          Cerrar sesión
        </Button>
      </div>

      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
            <ShieldCheck className="h-3.5 w-3.5" />
            NOVA MODA · ADMIN
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Panel de gestión
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => void recargar()}
          disabled={cargando}
          className="h-11 rounded-full border-input bg-card px-5 text-[13px] font-medium"
        >
          {cargando ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
          )}
          Actualizar
        </Button>
      </header>

      {panelError && (
        <p className="mb-6 rounded-2xl bg-destructive/10 p-3.5 text-[12.5px] leading-relaxed text-destructive">
          {panelError}
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: Boxes,
            label: "Productos activos",
            value: String(products.filter((p) => p.isActive).length),
            sub: `${products.length} en total`,
          },
          {
            icon: BadgeDollarSign,
            label: "Solicitudes (30 días)",
            value: String(metrics?.requests ?? 0),
            sub: `${metrics?.openRequests ?? 0} abiertas`,
          },
          {
            icon: CheckCircle2,
            label: "Vendidas",
            value: String(cerradas),
            sub: formatPrice(metrics?.closedEstimatedValueUsd ?? 0),
          },
          {
            icon: XCircle,
            label: "Canceladas",
            value: String(canceladas),
            sub: formatPrice(metrics?.cancelledEstimatedValueUsd ?? 0),
          },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-[1.4rem] bg-card p-5 shadow-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Icon className="h-4.5 w-4.5 text-camel-deep" />
            </span>
            <p className="mt-3 text-[11.5px] text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        Tasa de cierre: <span className="font-semibold text-foreground">{tasa}</span>{" "}
        · Cerradas sin precio:{" "}
        <span className="font-semibold text-foreground">
          {metrics?.closedWithoutPriceRequests ?? 0}
        </span>
      </p>

      {/* Pestañas */}
      <Tabs defaultValue="productos" className="mt-8">
        <TabsList className="h-11 rounded-full bg-secondary p-1">
          <TabsTrigger
            value="productos"
            className="rounded-full px-5 text-[13px] font-medium"
          >
            Productos ({products.length})
          </TabsTrigger>
          <TabsTrigger
            value="categorias"
            className="rounded-full px-5 text-[13px] font-medium"
          >
            Categorías ({categories.length})
          </TabsTrigger>
          <TabsTrigger
            value="pedidos"
            className="rounded-full px-5 text-[13px] font-medium"
          >
            Solicitudes ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Productos ── */}
        <TabsContent value="productos" className="mt-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, marca o categoría…"
              className="h-11 max-w-sm rounded-full border-input bg-card px-5"
            />
            <Button
              onClick={abrirNuevoProducto}
              disabled={categoriasActivas.length === 0}
              className="ml-auto h-11 rounded-full px-5 text-[13px] font-medium"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
          {categoriasActivas.length === 0 && (
            <p className="mb-4 rounded-2xl bg-secondary/70 p-3.5 text-[12.5px] text-muted-foreground">
              Crea primero una categoría activa para poder publicar productos.
            </p>
          )}

          {/* Tabla (escritorio) */}
          <div className="hidden overflow-hidden rounded-[1.4rem] bg-card shadow-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5 font-medium">Producto</th>
                  <th className="px-4 py-3.5 font-medium">Categoría</th>
                  <th className="px-4 py-3.5 font-medium">Precio</th>
                  <th className="px-4 py-3.5 font-medium">Visible</th>
                  <th className="px-4 py-3.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.primary_image ? (
                          <img
                            src={p.primary_image}
                            alt=""
                            className="h-12 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="h-12 w-10 rounded-lg bg-secondary" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {p.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{p.category}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPriceLabel(p.price_usd ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={() => void alternarProducto(p)}
                        aria-label={
                          p.isActive ? `Ocultar ${p.name}` : `Mostrar ${p.name}`
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirEdicionProducto(p)}
                          className="h-9 rounded-full border-input bg-card px-3"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void alternarProducto(p)}
                          className="h-9 rounded-full border-input bg-card px-3 text-muted-foreground"
                          aria-label={p.isActive ? `Ocultar ${p.name}` : `Mostrar ${p.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {productosFiltrados.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                {query ? `Sin resultados para “${query}”.` : "Todavía no hay productos."}
              </p>
            )}
          </div>

          {/* Tarjetas (móvil) */}
          <div className="space-y-3 md:hidden">
            {productosFiltrados.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-[1.3rem] bg-card p-3.5 shadow-card"
              >
                {p.primary_image ? (
                  <img
                    src={p.primary_image}
                    alt=""
                    className="h-16 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <span className="h-16 w-14 rounded-xl bg-secondary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {p.category} · {formatPriceLabel(p.price_usd ?? 0)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirEdicionProducto(p)}
                      className="h-9 rounded-full border-input bg-card px-3 text-[12px]"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Switch
                      checked={p.isActive}
                      onCheckedChange={() => void alternarProducto(p)}
                      aria-label={
                        p.isActive ? `Ocultar ${p.name}` : `Mostrar ${p.name}`
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            {productosFiltrados.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {query ? "Sin resultados." : "Todavía no hay productos."}
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── Categorías ── */}
        <TabsContent value="categorias" className="mt-5">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => {
                setFormCategoria(emptyCategory);
                setModalCategoria(true);
              }}
              className="h-11 rounded-full px-5 text-[13px] font-medium"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva categoría
            </Button>
          </div>

          <div className="overflow-hidden rounded-[1.4rem] bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5 font-medium">Categoría</th>
                  <th className="px-4 py-3.5 font-medium">Enlace</th>
                  <th className="px-4 py-3.5 font-medium">Orden</th>
                  <th className="px-4 py-3.5 font-medium">Visible</th>
                  <th className="px-4 py-3.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3.5 font-medium">{c.name}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-muted-foreground">
                      {c.slug}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {c.sortOrder}
                    </td>
                    <td className="px-4 py-3.5">
                      <Switch
                        checked={c.isActive}
                        onCheckedChange={() => void alternarCategoria(c)}
                        aria-label={
                          c.isActive
                            ? `Desactivar ${c.name}`
                            : `Activar ${c.name}`
                        }
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormCategoria({
                              id: c.id,
                              name: c.name,
                              sortOrder: String(c.sortOrder),
                            });
                            setModalCategoria(true);
                          }}
                          className="h-9 rounded-full border-input bg-card px-3"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Todavía no hay categorías.
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── Solicitudes ── */}
        <TabsContent value="pedidos" className="mt-5">
          <div className="overflow-hidden rounded-[1.4rem] bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5 font-medium">Solicitud</th>
                  <th className="px-4 py-3.5 font-medium">Fecha</th>
                  <th className="px-4 py-3.5 font-medium">Artículos</th>
                  <th className="px-4 py-3.5 font-medium">Total</th>
                  <th className="px-4 py-3.5 font-medium">Estado</th>
                  <th className="px-4 py-3.5 text-right font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-[13px] font-semibold">
                        {o.reference}
                      </p>
                      {o.hasUnpricedItems && o.status === "requested" && (
                        <span className="mt-1 inline-block rounded-full bg-camel/15 px-2 py-0.5 text-[10px] font-medium text-camel-deep">
                          SIN PRECIO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      {o.items.reduce((a, i) => a + i.quantity, 0)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      {formatPriceLabel(o.estimatedTotalUsd ?? 0)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-[11px] font-semibold",
                          STATUS_STYLES[o.status]
                        )}
                      >
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void abrirSolicitud(o)}
                        className="h-9 rounded-full border-input bg-card px-4 text-[12px]"
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Todavía no hay solicitudes.
              </p>
            )}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            Cada solicitud guarda los productos pedidos desde la tienda. Al
            finalizarla puedes ajustar cantidades y precios, quitar líneas y
            dejarla como vendida o cancelada con su motivo.
          </p>
        </TabsContent>
      </Tabs>

      {/* ── Diálogo de producto ── */}
      <Dialog open={modalProducto} onOpenChange={setModalProducto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.6rem] bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formProducto.id ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="p-name">Nombre *</Label>
              <Input
                id="p-name"
                value={formProducto.name}
                onChange={(e) =>
                  setFormProducto({ ...formProducto, name: e.target.value })
                }
                placeholder="Blazer de lino"
                className="mt-1.5 h-11 rounded-2xl border-input bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría *</Label>
                <Select
                  value={formProducto.categoryId}
                  onValueChange={(v) =>
                    setFormProducto({ ...formProducto, categoryId: v })
                  }
                >
                  <SelectTrigger className="mt-1.5 h-11 rounded-2xl border-input bg-background">
                    <SelectValue placeholder="Elige una" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasActivas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="p-price">Precio (USD)</Label>
                <Input
                  id="p-price"
                  value={formProducto.price}
                  onChange={(e) =>
                    setFormProducto({ ...formProducto, price: e.target.value })
                  }
                  placeholder="Vacío = «Consultar»"
                  inputMode="decimal"
                  className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="p-brand">Marca</Label>
                <Input
                  id="p-brand"
                  value={formProducto.brand}
                  onChange={(e) =>
                    setFormProducto({ ...formProducto, brand: e.target.value })
                  }
                  placeholder="NOVA MODA"
                  className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                />
              </div>
              <div>
                <Label htmlFor="p-model">Modelo</Label>
                <Input
                  id="p-model"
                  value={formProducto.model}
                  onChange={(e) =>
                    setFormProducto({ ...formProducto, model: e.target.value })
                  }
                  placeholder="Blazer Lino 01"
                  className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="p-subcategory">Subcategoría</Label>
                <Input
                  id="p-subcategory"
                  value={formProducto.subcategory}
                  onChange={(e) =>
                    setFormProducto({
                      ...formProducto,
                      subcategory: e.target.value,
                    })
                  }
                  placeholder="Chaquetas"
                  className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                />
              </div>
              <div>
                <Label htmlFor="p-slug">Enlace (slug)</Label>
                <Input
                  id="p-slug"
                  value={formProducto.slug}
                  onChange={(e) =>
                    setFormProducto({ ...formProducto, slug: e.target.value })
                  }
                  placeholder="blazer-de-lino"
                  className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="p-desc">Descripción</Label>
              <Textarea
                id="p-desc"
                value={formProducto.specifications}
                onChange={(e) =>
                  setFormProducto({
                    ...formProducto,
                    specifications: e.target.value,
                  })
                }
                placeholder="Tejido, corte, cuidados…"
                className="mt-1.5 min-h-20 rounded-2xl border-input bg-background"
              />
            </div>
            <div>
              <Label htmlFor="p-image">Imagen *</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {formProducto.image ? (
                  <img
                    src={formProducto.image}
                    alt=""
                    className="h-16 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <span className="h-16 w-14 rounded-xl bg-secondary" />
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    id="p-image"
                    value={formProducto.image}
                    onChange={(e) =>
                      setFormProducto({ ...formProducto, image: e.target.value })
                    }
                    placeholder="https://…"
                    className="h-11 rounded-2xl border-input bg-background"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-camel-deep">
                    {subiendoImagen ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>Subir una imagen</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={subirImagen}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl bg-secondary/60 p-4 sm:grid-cols-3">
              <label className="flex items-center gap-2.5 text-[13px] font-medium">
                <Switch
                  checked={formProducto.onSale}
                  onCheckedChange={(v) =>
                    setFormProducto({ ...formProducto, onSale: v })
                  }
                />
                Oferta
              </label>
              <label className="flex items-center gap-2.5 text-[13px] font-medium">
                <Switch
                  checked={formProducto.topVentas}
                  onCheckedChange={(v) =>
                    setFormProducto({ ...formProducto, topVentas: v })
                  }
                />
                Populares
              </label>
              <label className="flex items-center gap-2.5 text-[13px] font-medium">
                <Switch
                  checked={formProducto.active}
                  onCheckedChange={(v) =>
                    setFormProducto({ ...formProducto, active: v })
                  }
                />
                Visible
              </label>
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setModalProducto(false)}
              className="h-10 rounded-full border-input bg-card"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void guardarProducto()}
              disabled={saving}
              className="h-10 rounded-full px-6"
            >
              {saving ? "Guardando…" : formProducto.id ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de categoría ── */}
      <Dialog open={modalCategoria} onOpenChange={setModalCategoria}>
        <DialogContent className="rounded-[1.6rem] bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formCategoria.id ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="c-name">Nombre *</Label>
              <Input
                id="c-name"
                value={formCategoria.name}
                onChange={(e) =>
                  setFormCategoria({ ...formCategoria, name: e.target.value })
                }
                placeholder="Mujer"
                className="mt-1.5 h-11 rounded-2xl border-input bg-background"
              />
            </div>
            <div>
              <Label htmlFor="c-order">Orden</Label>
              <Input
                id="c-order"
                value={formCategoria.sortOrder}
                onChange={(e) =>
                  setFormCategoria({
                    ...formCategoria,
                    sortOrder: e.target.value,
                  })
                }
                inputMode="numeric"
                className="mt-1.5 h-11 rounded-2xl border-input bg-background"
              />
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setModalCategoria(false)}
              className="h-10 rounded-full border-input bg-card"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void guardarCategoria()}
              disabled={saving}
              className="h-10 rounded-full px-6"
            >
              {saving ? "Guardando…" : formCategoria.id ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de solicitud ── */}
      <Dialog
        open={solicitud !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSolicitud(null);
            setDetalle(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.6rem] bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-base">{solicitud?.reference}</span>
              {solicitud && (
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold",
                    STATUS_STYLES[solicitud.status]
                  )}
                >
                  {STATUS_LABELS[solicitud.status] ?? solicitud.status}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {cargandoDetalle && (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando la solicitud…
            </p>
          )}

          {detalle && (
            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary/60 p-4 text-[13px] sm:grid-cols-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(detalle.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Productos</p>
                  <p className="font-medium">
                    {detalle.items.reduce((a, i) => a + i.quantity, 0)} uds.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Total estimado</p>
                  <p className="font-semibold">
                    {formatPriceLabel(detalle.estimatedTotalUsd ?? 0)}
                  </p>
                </div>
              </div>

              {/* Líneas */}
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Productos solicitados
                </p>
                <ul className="space-y-2.5">
                  {itemsEdicion.map((linea, indice) => (
                    <li
                      key={linea.productId}
                      className={cn(
                        "flex flex-wrap items-center gap-3 rounded-2xl border border-input bg-background p-3",
                        linea.quitar && "opacity-50"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">
                          {linea.productName}
                        </span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {linea.productId}
                        </span>
                      </span>
                      <QuantityStepper
                        size="sm"
                        value={linea.quantity}
                        min={1}
                        max={99}
                        onChange={(v) =>
                          setItemsEdicion((prev) =>
                            prev.map((l, i) =>
                              i === indice ? { ...l, quantity: v } : l
                            )
                          )
                        }
                      />
                      <span className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">USD</span>
                        <Input
                          value={linea.price}
                          onChange={(e) =>
                            setItemsEdicion((prev) =>
                              prev.map((l, i) =>
                                i === indice ? { ...l, price: e.target.value } : l
                              )
                            )
                          }
                          placeholder="0.00"
                          inputMode="decimal"
                          className="h-9 w-24 rounded-xl border-input bg-card"
                        />
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setItemsEdicion((prev) =>
                            prev.map((l, i) =>
                              i === indice ? { ...l, quitar: !l.quitar } : l
                            )
                          )
                        }
                        className="h-9 rounded-full border-input bg-card px-3 text-[12px]"
                      >
                        {linea.quitar ? "Reponer" : "Quitar"}
                      </Button>
                    </li>
                  ))}
                </ul>
                {detalle.removedItems.length > 0 && (
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    Líneas quitadas antes:{" "}
                    {detalle.removedItems.map((l) => l.productName).join(", ")}
                  </p>
                )}
              </div>

              {/* Resultado */}
              {detalle.status === "requested" ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setResultado("closed")}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                        resultado === "closed"
                          ? "border-[#4E5B48] bg-[#4E5B48]/10"
                          : "border-input bg-background hover:border-[#4E5B48]/50"
                      )}
                    >
                      <CheckCircle2 className="h-5 w-5 text-[#4E5B48]" />
                      <span>
                        <span className="block text-sm font-semibold">Vendida</span>
                        <span className="block text-[12px] text-muted-foreground">
                          Suma a las estadísticas de ventas.
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultado("cancelled")}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                        resultado === "cancelled"
                          ? "border-[#B3402E] bg-[#B3402E]/10"
                          : "border-input bg-background hover:border-[#B3402E]/50"
                      )}
                    >
                      <XCircle className="h-5 w-5 text-[#B3402E]" />
                      <span>
                        <span className="block text-sm font-semibold">Cancelada</span>
                        <span className="block text-[12px] text-muted-foreground">
                          Se conserva con su motivo, no suma ventas.
                        </span>
                      </span>
                    </button>
                  </div>

                  {resultado === "cancelled" && (
                    <div className="grid gap-4 rounded-2xl bg-secondary/60 p-4">
                      <div>
                        <Label>Motivo *</Label>
                        <Select value={motivo} onValueChange={setMotivo}>
                          <SelectTrigger className="mt-1.5 h-11 rounded-2xl border-input bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CANCELLATION_REASONS.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="cancel-note">Nota (opcional)</Label>
                        <Textarea
                          id="cancel-note"
                          value={nota}
                          onChange={(e) => setNota(e.target.value)}
                          placeholder="Detalle para el historial…"
                          className="mt-1.5 min-h-16 rounded-2xl border-input bg-background"
                        />
                      </div>
                    </div>
                  )}

                  {resultado === "closed" && haySinPrecio && (
                    <div className="rounded-2xl bg-camel/15 p-4">
                      <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-camel-deep">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        Hay productos sin precio: se guardarán como «consultar» y
                        no sumarán valor a las estadísticas.
                      </p>
                      <label className="mt-3 flex items-center gap-2.5 text-[13px] font-medium">
                        <input
                          type="checkbox"
                          checked={confirmarSinPrecio}
                          onChange={(e) => setConfirmarSinPrecio(e.target.checked)}
                          className="h-4 w-4 rounded border-input accent-[#B08968]"
                        />
                        Confirmo vender aunque falten precios
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-secondary/60 p-4 text-[13px]">
                  <p className="font-semibold">
                    {detalle.status === "closed"
                      ? "Solicitud vendida"
                      : "Solicitud cancelada"}
                    {detalle.closedAt ? ` · ${formatDate(detalle.closedAt)}` : ""}
                  </p>
                  {detalle.cancellationReason && (
                    <p className="mt-1 text-muted-foreground">
                      Motivo:{" "}
                      {CANCELLATION_REASONS.find(
                        (r) => r.id === detalle.cancellationReason
                      )?.label ?? detalle.cancellationReason}
                      {detalle.cancellationNote ? ` — ${detalle.cancellationNote}` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-muted-foreground">
                    Total: {formatPriceLabel(detalle.estimatedTotalUsd ?? 0)} ·
                    Original:{" "}
                    {formatPriceLabel(detalle.originalEstimatedTotalUsd ?? 0)}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSolicitud(null);
                setDetalle(null);
              }}
              className="h-10 rounded-full border-input bg-card"
            >
              Cerrar
            </Button>
            {detalle?.status === "requested" && (
              <Button
                onClick={() => void cerrarSolicitud()}
                disabled={saving}
                className="h-10 rounded-full px-6"
              >
                {saving
                  ? "Guardando…"
                  : resultado === "closed"
                    ? "Cerrar como vendida"
                    : "Cancelar solicitud"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
