"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BadgeDollarSign,
  Boxes,
  Calendar,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  X,
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
import {
  ImagePreviewModal,
  ZoomableThumb,
  type PreviewImageData,
} from "@/components/admin/ImagePreviewModal";
import { PaginationControls } from "@/components/shop/PaginationControls";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { formatDate, formatPrice, formatPriceLabel } from "@/lib/format";
import {
  ApiError,
  fetchCatalogMeta,
  fetchProductsByIds,
  slugify,
  type ApiCategory,
  type ApiProduct,
} from "@/lib/powergy-api";
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
  fetchAdminSellerProfile,
  fetchOrder,
  fetchOrderMetrics,
  updateAdminSellerProfile,
  updateCategory,
  updateProduct,
  type AdminOrder,
  type AdminOrderListItem,
  type AdminProductSort,
  type AdminProductVisibility,
  type AdminSellerProfile,
  type OrderMetrics,
} from "@/lib/admin-api";
import {
  buildShareReferralUrl,
  normalizeReferralCode,
  sanitizeReferralCodeInput,
} from "@/lib/referral";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";
import {
  DEFAULT_ORDER_DATE_FILTER,
  resolveOrderDateFilter,
  toLocalYmd,
  type OrderDateFilterState,
  type OrderDatePreset,
} from "@/lib/admin-dates";
import { STORAGE_BUCKET, getSupabaseClient } from "@/lib/supabase";
import { reloadCatalog } from "@/lib/catalog";
import { navigate, useRoute } from "@/lib/router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ADMIN_PAGE_SIZE = 20;

const DATE_PRESETS: { id: OrderDatePreset; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "month", label: "Este mes" },
  { id: "single", label: "Fecha" },
  { id: "range", label: "Rango" },
];

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-camel/15 text-camel-deep",
  closed: "bg-[#4E5B48]/15 text-[#4E5B48]",
  cancelled: "bg-[#B3402E]/12 text-[#B3402E]",
};

interface ProductForm {
  id: string | null;
  name: string;
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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
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

  const route = useRoute();
  const targetOrder = route.query.get("order");
  const tabsRef = useRef<HTMLDivElement | null>(null);

  /* ── Navegación y carga ─────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState(targetOrder ? "pedidos" : "productos");
  const [refreshTick, setRefreshTick] = useState(0);

  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [loadingCategoryId, setLoadingCategoryId] = useState<string | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  /* ── Datos principales ──────────────────────────────────────── */
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotalItems, setProductsTotalItems] = useState(0);
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [totalCatalogProducts, setTotalCatalogProducts] = useState<number | null>(
    null
  );
  const [activeProductsCount, setActiveProductsCount] = useState<number | null>(
    null
  );
  const [cargandoProductos, setCargandoProductos] = useState(false);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(false);

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalItems, setOrdersTotalItems] = useState(0);
  const [ordersUnfilteredTotal, setOrdersUnfilteredTotal] = useState<number | null>(
    null
  );
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [metrics, setMetrics] = useState<OrderMetrics | null>(null);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [dateFilter, setDateFilter] = useState<OrderDateFilterState>(
    DEFAULT_ORDER_DATE_FILTER
  );
  const [orderQuery, setOrderQuery] = useState("");
  const [debouncedOrderQuery, setDebouncedOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState<
    "all" | "requested" | "closed" | "cancelled"
  >("all");
  const [orderReferral, setOrderReferral] = useState("all");
  const [orderPriceFilter, setOrderPriceFilter] = useState<
    "all" | "unpriced" | "priced"
  >("all");
  const [knownReferrals, setKnownReferrals] = useState<Record<string, string>>(
    {}
  );

  const [panelError, setPanelError] = useState("");

  /* ── Enlace de vendedor del administrador ───────────────────── */
  const [sellerProfile, setSellerProfile] = useState<AdminSellerProfile | null>(null);
  const [sellerEndpointAvailable, setSellerEndpointAvailable] = useState(true);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilError, setPerfilError] = useState("");
  const [formPerfil, setFormPerfil] = useState({
    displayName: "",
    referralCode: "",
    whatsAppPhone: "",
  });

  /* ── Búsqueda, filtros y formularios ────────────────────────── */
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [productVisibility, setProductVisibility] =
    useState<AdminProductVisibility>("all");
  const [productCategory, setProductCategory] = useState("all");
  const [productPriceFilter, setProductPriceFilter] = useState<
    "all" | "priced" | "unpriced"
  >("all");
  const [productTagFilter, setProductTagFilter] = useState<
    "all" | "onSale" | "featured"
  >("all");
  const [productSort, setProductSort] =
    useState<AdminProductSort>("destacados");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryVisibility, setCategoryVisibility] =
    useState<AdminProductVisibility>("all");
  const [modalProducto, setModalProducto] = useState(false);
  const [formProducto, setFormProducto] = useState<ProductForm>(emptyProduct);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const [modalCategoria, setModalCategoria] = useState(false);
  const [formCategoria, setFormCategoria] = useState<CategoryForm>(emptyCategory);

  /* ── Vista detalle de solicitud & visor de imágenes ─────────── */
  const [solicitud, setSolicitud] = useState<AdminOrderListItem | null>(null);
  const [detalle, setDetalle] = useState<AdminOrder | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cargandoImagenesDetalle, setCargandoImagenesDetalle] = useState(false);
  const [itemsEdicion, setItemsEdicion] = useState<EditableLine[]>([]);
  const [resultado, setResultado] = useState<"closed" | "cancelled">("closed");
  const [motivo, setMotivo] = useState("price");
  const [nota, setNota] = useState("");
  const [confirmarSinPrecio, setConfirmarSinPrecio] = useState(false);

  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const productImagesRef = useRef<Record<string, string>>({});

  const mergeProductImages = useCallback((entries: Record<string, string>) => {
    const updates: Record<string, string> = {};
    for (const [id, src] of Object.entries(entries)) {
      const clean = src?.trim();
      if (id && clean && productImagesRef.current[id] !== clean) {
        updates[id] = clean;
      }
    }
    if (Object.keys(updates).length === 0) return;
    productImagesRef.current = { ...productImagesRef.current, ...updates };
    setProductImages(productImagesRef.current);
  }, []);

  const resolvedDates = useMemo(
    () => resolveOrderDateFilter(dateFilter),
    [dateFilter]
  );

  const cargando =
    cargandoProductos || cargandoCategorias || cargandoPedidos || cargandoPerfil;

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
    setProducts([]);
    setTotalCatalogProducts(null);
    setActiveProductsCount(null);
    setCategories([]);
    setOrders([]);
    setMetrics(null);
    setOrdersUnfilteredTotal(null);
    setKnownReferrals({});
    setQuery("");
    setDebouncedQuery("");
    setProductVisibility("all");
    setProductCategory("all");
    setProductPriceFilter("all");
    setProductTagFilter("all");
    setProductSort("destacados");
    setCategoryQuery("");
    setCategoryVisibility("all");
    setOrderQuery("");
    setDebouncedOrderQuery("");
    setOrderStatus("all");
    setOrderReferral("all");
    setOrderPriceFilter("all");
    setDateFilter(DEFAULT_ORDER_DATE_FILTER);
    setSellerProfile(null);
    setSellerEndpointAvailable(true);
    setPerfilError("");
    setFormPerfil({ displayName: "", referralCode: "", whatsAppPhone: "" });
  };

  const recargarTodo = useCallback((withCatalogSync = false) => {
    setRefreshTick((prev) => prev + 1);
    if (withCatalogSync) reloadCatalog();
  }, []);

  const hasProductCountFilter = Boolean(
    debouncedQuery ||
      productVisibility !== "all" ||
      productCategory !== "all" ||
      productPriceFilter !== "all" ||
      productTagFilter !== "all"
  );
  const hasProductCountFilterRef = useRef(hasProductCountFilter);
  useEffect(() => {
    hasProductCountFilterRef.current = hasProductCountFilter;
  }, [hasProductCountFilter]);

  const hasOrderListFilter = Boolean(
    debouncedOrderQuery ||
      orderStatus !== "all" ||
      orderReferral !== "all" ||
      orderPriceFilter !== "all"
  );

  /* ── Búsqueda con debounce (productos y solicitudes) ─────────── */
  useEffect(() => {
    const clean = query.trim();
    if (clean === debouncedQuery) return;
    const timer = window.setTimeout(() => {
      setDebouncedQuery(clean);
      setProductsPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, debouncedQuery]);

  useEffect(() => {
    const clean = orderQuery.trim();
    if (clean === debouncedOrderQuery) return;
    const timer = window.setTimeout(() => {
      setDebouncedOrderQuery(clean);
      setOrdersPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [orderQuery, debouncedOrderQuery]);

  /* ── Carga de categorías y resumen de catálogo ──────────────── */
  useEffect(() => {
    if (!token) return;
    let activo = true;
    const controller = new AbortController();
    setCargandoCategorias(true);

    const tasks: [
      Promise<ApiCategory[]>,
      Promise<{ totalActive: number }>,
      Promise<{ totalItems: number } | null>,
    ] = [
      fetchAdminCategories(token),
      fetchCatalogMeta(controller.signal),
      hasProductCountFilterRef.current
        ? fetchAdminProducts(token, {
            term: "",
            page: 1,
            pageSize: 1,
            signal: controller.signal,
          })
        : Promise.resolve(null),
    ];

    Promise.all(tasks)
      .then(([cats, meta, totalRes]) => {
        if (!activo) return;
        setCategories(cats);
        setActiveProductsCount(meta.totalActive);
        if (totalRes !== null) {
          setTotalCatalogProducts(totalRes.totalItems);
        }
      })
      .catch((error) => {
        if (!activo || isAbortError(error)) return;
        setPanelError(mensajeError(error));
      })
      .finally(() => {
        if (activo) setCargandoCategorias(false);
      });

    return () => {
      activo = false;
      controller.abort();
    };
  }, [token, refreshTick]);

  /* ── Carga paginada de productos ────────────────────────────── */
  useEffect(() => {
    if (!token) return;
    let activo = true;
    const controller = new AbortController();
    setCargandoProductos(true);
    setPanelError("");

    fetchAdminProducts(token, {
      term: debouncedQuery,
      category: productCategory === "all" ? undefined : productCategory,
      visibility: productVisibility,
      hasPrice:
        productPriceFilter === "priced"
          ? true
          : productPriceFilter === "unpriced"
            ? false
            : undefined,
      onSale: productTagFilter === "onSale" ? true : undefined,
      featured: productTagFilter === "featured" ? true : undefined,
      sort: productSort,
      page: productsPage,
      pageSize: ADMIN_PAGE_SIZE,
      signal: controller.signal,
    })
      .then((res) => {
        if (!activo) return;
        const safeTotalPages = Math.max(1, res.totalPages);
        if (productsPage > safeTotalPages) {
          setProductsPage(safeTotalPages);
          return;
        }
        setProducts(res.items);
        setProductsTotalItems(res.totalItems);
        setProductsTotalPages(safeTotalPages);
        if (!hasProductCountFilter) {
          setTotalCatalogProducts(res.totalItems);
        }
        const imageEntries: Record<string, string> = {};
        for (const p of res.items) {
          if (p.primary_image) {
            imageEntries[p.id] = p.primary_image;
          }
        }
        mergeProductImages(imageEntries);
      })
      .catch((error) => {
        if (!activo || isAbortError(error)) return;
        setPanelError(mensajeError(error));
      })
      .finally(() => {
        if (activo) setCargandoProductos(false);
      });

    return () => {
      activo = false;
      controller.abort();
    };
  }, [
    token,
    debouncedQuery,
    productCategory,
    productVisibility,
    productPriceFilter,
    productTagFilter,
    productSort,
    hasProductCountFilter,
    productsPage,
    refreshTick,
    mergeProductImages,
  ]);

  /* ── Estadísticas KPI de solicitudes por fecha ──────────────── */
  useEffect(() => {
    if (!token || resolvedDates.validationError) return;
    let activo = true;
    const controller = new AbortController();

    fetchOrderMetrics(token, {
      from: resolvedDates.metricsFrom,
      to: resolvedDates.metricsTo,
      signal: controller.signal,
    })
      .then((metricsRes) => {
        if (!activo) return;
        setMetrics(metricsRes);
      })
      .catch((error) => {
        if (!activo || isAbortError(error)) return;
        setPanelError(mensajeError(error));
      });

    return () => {
      activo = false;
      controller.abort();
    };
  }, [
    token,
    refreshTick,
    resolvedDates.metricsFrom,
    resolvedDates.metricsTo,
    resolvedDates.validationError,
  ]);

  /* ── Carga paginada de solicitudes ──────────────────────────── */
  useEffect(() => {
    if (!token || resolvedDates.validationError) return;
    let activo = true;
    const controller = new AbortController();
    setCargandoPedidos(true);
    setPanelError("");

    fetchAdminOrders(token, {
      status: orderStatus === "all" ? undefined : orderStatus,
      q: debouncedOrderQuery || undefined,
      referral: orderReferral === "all" ? undefined : orderReferral,
      hasUnpriced:
        orderPriceFilter === "unpriced"
          ? true
          : orderPriceFilter === "priced"
            ? false
            : undefined,
      from: resolvedDates.ordersFrom,
      to: resolvedDates.ordersTo,
      page: ordersPage,
      pageSize: ADMIN_PAGE_SIZE,
      signal: controller.signal,
    })
      .then((ordersRes) => {
        if (!activo) return;
        const safeTotalPages = Math.max(1, ordersRes.totalPages);
        if (ordersPage > safeTotalPages) {
          setOrdersPage(safeTotalPages);
          return;
        }
        setOrders(ordersRes.items);
        setOrdersTotalItems(ordersRes.totalItems);
        setOrdersTotalPages(safeTotalPages);
        if (!hasOrderListFilter) {
          setOrdersUnfilteredTotal(ordersRes.totalItems);
        }
        setKnownReferrals((prev) => {
          let next: Record<string, string> | null = null;
          for (const item of ordersRes.items) {
            if (!item.referralCode) continue;
            const code = item.referralCode;
            const label = item.referredByAdminName || code;
            if (prev[code] !== label) {
              if (!next) next = { ...prev };
              next[code] = label;
            }
          }
          return next ?? prev;
        });
      })
      .catch((error) => {
        if (!activo || isAbortError(error)) return;
        setPanelError(mensajeError(error));
      })
      .finally(() => {
        if (activo) setCargandoPedidos(false);
      });

    return () => {
      activo = false;
      controller.abort();
    };
  }, [
    token,
    ordersPage,
    refreshTick,
    orderStatus,
    debouncedOrderQuery,
    orderReferral,
    orderPriceFilter,
    hasOrderListFilter,
    resolvedDates.ordersFrom,
    resolvedDates.ordersTo,
    resolvedDates.validationError,
  ]);

  /* ── Perfil de enlace y WhatsApp del administrador actual ────── */
  useEffect(() => {
    if (!token) return;
    let activo = true;
    const controller = new AbortController();
    setCargandoPerfil(true);
    setPerfilError("");

    fetchAdminSellerProfile(token, controller.signal)
      .then((profile) => {
        if (!activo) return;
        setSellerEndpointAvailable(true);
        setSellerProfile(profile);
        setFormPerfil({
          displayName: profile.displayName ?? "",
          referralCode: profile.referralCode ?? "",
          whatsAppPhone: profile.whatsAppPhone ?? "",
        });
      })
      .catch((error) => {
        if (!activo || isAbortError(error)) return;
        if (
          error instanceof ApiError &&
          (error.status === 404 || error.status === 502)
        ) {
          setSellerEndpointAvailable(false);
          setSellerProfile(null);
          return;
        }
        setPerfilError(mensajeError(error));
      })
      .finally(() => {
        if (activo) setCargandoPerfil(false);
      });

    return () => {
      activo = false;
      controller.abort();
    };
  }, [token, refreshTick]);

  /* ── Resolución de miniaturas dentro de "Ver solicitud" ─────── */
  const resolverImagenesSolicitud = useCallback(
    async (currentToken: string, order: AdminOrder) => {
      const allLines = [...order.items, ...order.removedItems];
      const uniqueLines = new Map<string, { productId: string; productName: string }>();
      for (const line of allLines) {
        if (!productImagesRef.current[line.productId] && !uniqueLines.has(line.productId)) {
          uniqueLines.set(line.productId, {
            productId: line.productId,
            productName: line.productName,
          });
        }
      }
      if (uniqueLines.size === 0) return;

      setCargandoImagenesDetalle(true);
      try {
        const missingIds = [...uniqueLines.keys()];
        const resolved: Record<string, string> = {};

        try {
          const activeProducts = await fetchProductsByIds(missingIds);
          for (const prod of activeProducts) {
            if (prod.image) resolved[prod.id] = prod.image;
          }
        } catch {
          /* Respaldo con búsqueda admin si falla el lote público */
        }

        const remaining = missingIds
          .filter((id) => !resolved[id])
          .map((id) => uniqueLines.get(id)!);

        if (remaining.length > 0) {
          const searchResults = await Promise.allSettled(
            remaining
              .slice(0, 8)
              .map((item) =>
                fetchAdminProducts(currentToken, {
                  term: item.productName,
                  page: 1,
                  pageSize: 20,
                })
              )
          );
          for (const result of searchResults) {
            if (result.status !== "fulfilled") continue;
            for (const prod of result.value.items) {
              if (prod.primary_image) {
                resolved[prod.id] = prod.primary_image;
              }
            }
          }
        }

        const stillMissing = missingIds.filter((id) => !resolved[id]);
        if (stillMissing.length > 0) {
          try {
            const fallbackPage = await fetchAdminProducts(currentToken, {
              page: 1,
              pageSize: 100,
            });
            for (const prod of fallbackPage.items) {
              if (prod.primary_image && uniqueLines.has(prod.id)) {
                resolved[prod.id] = prod.primary_image;
              }
            }
          } catch {
            /* Ignorar si falla el respaldo final */
          }
        }

        mergeProductImages(resolved);
      } finally {
        setCargandoImagenesDetalle(false);
      }
    },
    [mergeProductImages]
  );

  const abrirSolicitud = useCallback(
    async (item: AdminOrderListItem) => {
      if (!token) return;
      setLoadingOrderId(item.id);
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
            price: linea.unitPriceUsd === null ? "" : String(linea.unitPriceUsd),
            quitar: false,
          }))
        );
        void resolverImagenesSolicitud(token, completa);
      } catch (error) {
        toast.error(mensajeError(error));
        setSolicitud(null);
      } finally {
        setCargandoDetalle(false);
        setLoadingOrderId(null);
      }
    },
    [token, resolverImagenesSolicitud]
  );

  const handledOrderRef = useRef<string | null>(null);

  useEffect(() => {
    if (targetOrder) {
      setActiveTab("pedidos");
    }
  }, [targetOrder]);

  useEffect(() => {
    if (
      !targetOrder ||
      handledOrderRef.current === targetOrder ||
      !token ||
      cargandoDetalle
    ) {
      return;
    }

    const found = orders.find(
      (o) =>
        o.reference.toLowerCase() === targetOrder.toLowerCase() ||
        o.id.toLowerCase() === targetOrder.toLowerCase()
    );

    if (found) {
      handledOrderRef.current = targetOrder;
      void abrirSolicitud(found);
      return;
    }

    if (isUuid(targetOrder)) {
      handledOrderRef.current = targetOrder;
      setLoadingOrderId(targetOrder);
      setCargandoDetalle(true);
      fetchOrder(token, targetOrder)
        .then((completa) => {
          setSolicitud({
            id: completa.id,
            reference: completa.reference,
            status: completa.status,
            store: completa.store,
            estimatedTotalUsd: completa.estimatedTotalUsd,
            originalEstimatedTotalUsd: completa.originalEstimatedTotalUsd,
            itemCount: completa.items.reduce((acc, i) => acc + i.quantity, 0),
            createdAt: completa.createdAt,
            closedAt: completa.closedAt,
            closedByAdminUserId: completa.closedByAdminUserId,
            cancellationReason: completa.cancellationReason,
            hasUnpricedItems: completa.hasUnpricedItems,
            items: completa.items,
            referralCode: completa.referralCode,
            referredByAdminName: completa.referredByAdminName,
          });
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
          setResultado("closed");
          setMotivo("price");
          setNota("");
          setConfirmarSinPrecio(false);
          void resolverImagenesSolicitud(token, completa);
        })
        .catch((error) => {
          toast.error(mensajeError(error));
        })
        .finally(() => {
          setCargandoDetalle(false);
          setLoadingOrderId(null);
        });
    }
  }, [
    targetOrder,
    orders,
    token,
    cargandoDetalle,
    abrirSolicitud,
    resolverImagenesSolicitud,
  ]);

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

  /* ── Acciones de paginación y fechas ────────────────────────── */
  const scrollTabsToTop = () => {
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cambiarPaginaProductos = (nextPage: number) => {
    setProductsPage(nextPage);
    scrollTabsToTop();
  };

  const cambiarPaginaSolicitudes = (nextPage: number) => {
    setOrdersPage(nextPage);
    scrollTabsToTop();
  };

  const seleccionarPresetFecha = (preset: OrderDatePreset) => {
    const hoy = toLocalYmd(new Date());
    setOrdersPage(1);
    setDateFilter((prev) => {
      if (preset === "single") {
        return {
          ...prev,
          preset,
          singleDate: prev.singleDate || hoy,
        };
      }
      if (preset === "range") {
        return {
          ...prev,
          preset,
        };
      }
      return {
        ...prev,
        preset,
      };
    });
  };

  const limpiarBusquedaProducto = () => {
    setQuery("");
    setDebouncedQuery("");
    setProductsPage(1);
  };

  const limpiarFiltrosProducto = () => {
    setQuery("");
    setDebouncedQuery("");
    setProductVisibility("all");
    setProductCategory("all");
    setProductPriceFilter("all");
    setProductTagFilter("all");
    setProductSort("destacados");
    setProductsPage(1);
  };

  const limpiarFiltrosCategoria = () => {
    setCategoryQuery("");
    setCategoryVisibility("all");
  };

  const limpiarFiltrosSolicitudes = () => {
    setOrderQuery("");
    setDebouncedOrderQuery("");
    setOrderStatus("all");
    setOrderReferral("all");
    setOrderPriceFilter("all");
    setDateFilter(DEFAULT_ORDER_DATE_FILTER);
    setOrdersPage(1);
  };

  const hasProductResettableFilters =
    Boolean(query.trim()) ||
    hasProductCountFilter ||
    productSort !== "destacados";

  const hasCategoryFilters =
    Boolean(categoryQuery.trim()) || categoryVisibility !== "all";

  /* ── Productos ──────────────────────────────────────────────── */
  const categoriasActivas = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const categoriesActiveCount = categoriasActivas.length;
  const categoriesHiddenCount = categories.length - categoriesActiveCount;

  const filteredCategories = useMemo(() => {
    const cleanQuery = categoryQuery.trim().toLowerCase();
    return categories.filter((c) => {
      if (categoryVisibility === "visible" && !c.isActive) return false;
      if (categoryVisibility === "hidden" && c.isActive) return false;
      if (!cleanQuery) return true;
      return (
        c.name.toLowerCase().includes(cleanQuery) ||
        c.slug.toLowerCase().includes(cleanQuery)
      );
    });
  }, [categories, categoryQuery, categoryVisibility]);

  const referralFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    const ownCode = normalizeReferralCode(sellerProfile?.referralCode);
    if (ownCode) {
      map.set(ownCode, sellerProfile?.displayName?.trim() || ownCode);
    }
    for (const [code, label] of Object.entries(knownReferrals)) {
      const clean = normalizeReferralCode(code);
      if (clean && !map.has(clean)) {
        map.set(clean, label || clean);
      }
    }
    return Array.from(map.entries())
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [sellerProfile?.referralCode, sellerProfile?.displayName, knownReferrals]);

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
    const slug = slugify(name);
    if (name.length < 3) {
      toast.error("El nombre necesita al menos 3 caracteres.");
      return;
    }
    if (!slug) {
      toast.error("El nombre debe contener letras o números.");
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
        mergeProductImages({ [formProducto.id]: payload.primaryImage });
        toast.success("Producto actualizado");
      } else {
        const created = await createProduct(token, payload);
        mergeProductImages({ [created.id]: created.primary_image });
        toast.success("Producto creado");
      }
      setModalProducto(false);
      recargarTodo(true);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  const alternarProducto = async (producto: ApiProduct) => {
    if (!token || loadingProductId) return;
    setLoadingProductId(producto.id);
    try {
      if (producto.isActive) {
        await deactivateProduct(token, producto.id);
        toast.info(`“${producto.name}” oculto de la tienda`);
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
      recargarTodo(true);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setLoadingProductId(null);
    }
  };

  const subirImagen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
    ) {
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
      recargarTodo(true);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  const alternarCategoria = async (categoria: ApiCategory) => {
    if (!token || loadingCategoryId) return;
    setLoadingCategoryId(categoria.id);
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
      recargarTodo(true);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setLoadingCategoryId(null);
    }
  };

  /* ── Solicitudes ────────────────────────────────────────────── */
  const cerrarDialogoSolicitud = () => {
    setSolicitud(null);
    setDetalle(null);
    if (route.query.has("order")) {
      navigate("/admin", { replace: true, keepScroll: true });
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
        resultado === "closed"
          ? "Solicitud marcada como vendida"
          : "Solicitud cancelada"
      );
      cerrarDialogoSolicitud();
      recargarTodo();
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSaving(false);
    }
  };

  /* ── Enlace de vendedor ─────────────────────────────────────── */
  const copiarEnlacePersonal = async (codigo?: string | null) => {
    const clean = normalizeReferralCode(codigo ?? sellerProfile?.referralCode);
    if (!clean) {
      setActiveTab("enlace");
      toast.info("Configura primero tu código y tu WhatsApp.");
      return;
    }
    const url = buildShareReferralUrl(clean, "/");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado", { description: url });
    } catch {
      toast.info("Copia manualmente tu enlace:", { description: url });
    }
  };

  const guardarPerfilVendedor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const displayName = formPerfil.displayName.trim() || null;
    const rawCode = formPerfil.referralCode.trim();
    const rawPhone = formPerfil.whatsAppPhone.trim();

    if (rawCode && !rawPhone) {
      toast.error("Ingresa tu número de WhatsApp para activar tu enlace.");
      return;
    }
    if (rawPhone && !rawCode) {
      toast.error("Define un código corto para tu enlace junto con tu WhatsApp.");
      return;
    }

    const referralCode = rawCode ? normalizeReferralCode(rawCode) : null;
    if (rawCode && !referralCode) {
      toast.error(
        "El código debe tener entre 2 y 40 caracteres (letras, números, - o _)."
      );
      return;
    }

    const whatsAppPhone = rawPhone ? normalizeWhatsAppPhone(rawPhone) : null;
    if (rawPhone && !whatsAppPhone) {
      toast.error(
        "Ingresa un número de WhatsApp válido con código de país (7 a 15 dígitos)."
      );
      return;
    }

    setGuardandoPerfil(true);
    setPerfilError("");
    try {
      const updated = await updateAdminSellerProfile(token, {
        displayName,
        referralCode,
        whatsAppPhone,
      });
      setSellerProfile(updated);
      setFormPerfil({
        displayName: updated.displayName ?? "",
        referralCode: updated.referralCode ?? "",
        whatsAppPhone: updated.whatsAppPhone ?? "",
      });
      toast.success(
        updated.referralCode
          ? "Enlace personal y WhatsApp guardados"
          : "Configuración guardada"
      );
    } catch (error) {
      const msg = mensajeError(error);
      setPerfilError(msg);
      toast.error(msg);
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const desactivarEnlaceVendedor = async () => {
    if (!token) return;
    setGuardandoPerfil(true);
    setPerfilError("");
    try {
      const updated = await updateAdminSellerProfile(token, {
        displayName: formPerfil.displayName.trim() || null,
        referralCode: null,
        whatsAppPhone: null,
      });
      setSellerProfile(updated);
      setFormPerfil({
        displayName: updated.displayName ?? "",
        referralCode: "",
        whatsAppPhone: "",
      });
      toast.info("Enlace personal desactivado");
    } catch (error) {
      const msg = mensajeError(error);
      setPerfilError(msg);
      toast.error(msg);
    } finally {
      setGuardandoPerfil(false);
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

  const totalProductosBadge = totalCatalogProducts ?? productsTotalItems;
  const activosDisplay =
    activeProductsCount ?? products.filter((p) => p.isActive).length;
  const filtroFechaActivo = dateFilter.preset !== "all";
  const hasOrderAnyFilter =
    filtroFechaActivo ||
    Boolean(orderQuery.trim()) ||
    orderStatus !== "all" ||
    orderReferral !== "all" ||
    orderPriceFilter !== "all";
  const ordersTotalBadge = hasOrderListFilter
    ? (metrics?.requests ?? ordersUnfilteredTotal ?? ordersTotalItems)
    : ordersTotalItems;

  return (
    <div className="mx-auto max-w-6xl px-3.5 pb-16 pt-6 sm:px-6 sm:pt-8">
      {/* Aviso del panel */}
      <div className="mb-6 flex flex-col gap-3 rounded-[1.4rem] border border-dashed border-camel bg-card p-4 shadow-card sm:mb-7 sm:flex-row sm:items-center sm:p-4.5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-camel-deep sm:mt-0" />
          <p className="min-w-0 flex-1 break-words text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              Panel conectado a la tienda real.
            </span>{" "}
            Los cambios se guardan en el API de NOVA MODA
            {sesionEmail ? ` · ${sesionEmail}` : ""}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void cerrarSesion()}
          className="h-9 w-full shrink-0 rounded-full border-input bg-card sm:w-auto"
        >
          Cerrar sesión
        </Button>
      </div>

      <header className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
            <ShieldCheck className="h-3.5 w-3.5" />
            NOVA MODA · ADMIN
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
            Panel de gestión
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {sellerEndpointAvailable &&
            (sellerProfile?.referralCode && sellerProfile?.whatsAppPhone ? (
              <Button
                variant="outline"
                onClick={() =>
                  void copiarEnlacePersonal(sellerProfile.referralCode)
                }
                className="h-10 w-full rounded-full border-camel/50 bg-card px-4 text-[13px] font-medium hover:border-camel sm:h-11 sm:w-auto"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5 text-camel-deep" />
                Copiar mi enlace
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setActiveTab("enlace")}
                className="h-10 w-full rounded-full border-input bg-card px-4 text-[13px] font-medium sm:h-11 sm:w-auto"
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5 text-camel-deep" />
                Mi enlace
              </Button>
            ))}
          <Button
            variant="outline"
            onClick={() => recargarTodo(true)}
            disabled={cargando}
            className="h-10 w-full rounded-full border-input bg-card px-5 text-[13px] font-medium sm:h-11 sm:w-auto"
          >
            {cargando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>
      </header>

      {panelError && (
        <p className="mb-6 rounded-2xl bg-destructive/10 p-3.5 text-[12.5px] leading-relaxed text-destructive">
          {panelError}
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          {
            icon: Boxes,
            label: "Productos activos",
            value: String(activosDisplay),
            sub: `${totalProductosBadge} en total`,
          },
          {
            icon: BadgeDollarSign,
            label: resolvedDates.periodLabel,
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
          <div
            key={label}
            className="min-w-0 rounded-[1.4rem] bg-card p-4 shadow-card sm:p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary sm:h-10 sm:w-10">
              <Icon className="h-4 w-4 text-camel-deep sm:h-4.5 sm:w-4.5" />
            </span>
            <p className="mt-2.5 truncate text-[11px] text-muted-foreground sm:mt-3 sm:text-[11.5px]">
              {label}
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight tabular-nums">
              {value}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] leading-relaxed text-muted-foreground">
        <p>
          Tasa de cierre:{" "}
          <span className="font-semibold text-foreground">{tasa}</span> · Cerradas
          sin precio:{" "}
          <span className="font-semibold text-foreground">
            {metrics?.closedWithoutPriceRequests ?? 0}
          </span>
        </p>
        {resolvedDates.filterSummary && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-camel/15 px-3 py-1 text-[11px] font-medium text-camel-deep">
            <Calendar className="h-3 w-3" />
            Estadísticas: {resolvedDates.filterSummary}
          </span>
        )}
      </div>

      {/* Pestañas */}
      <Tabs
        ref={tabsRef}
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-7 scroll-mt-24 sm:mt-8"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-secondary p-1 sm:inline-flex sm:w-fit sm:items-center sm:justify-center sm:rounded-full">
          <TabsTrigger
            value="productos"
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-medium sm:w-auto sm:flex-initial sm:rounded-full sm:px-5 sm:py-1.5 sm:text-[13px]"
          >
            Productos ({totalProductosBadge})
          </TabsTrigger>
          <TabsTrigger
            value="categorias"
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-medium sm:w-auto sm:flex-initial sm:rounded-full sm:px-5 sm:py-1.5 sm:text-[13px]"
          >
            Categorías ({categories.length})
          </TabsTrigger>
          <TabsTrigger
            value="pedidos"
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-medium sm:w-auto sm:flex-initial sm:rounded-full sm:px-5 sm:py-1.5 sm:text-[13px]"
          >
            Solicitudes ({ordersTotalBadge})
          </TabsTrigger>
          <TabsTrigger
            value="enlace"
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-medium sm:w-auto sm:flex-initial sm:rounded-full sm:px-5 sm:py-1.5 sm:text-[13px]"
          >
            Mi enlace
          </TabsTrigger>
        </TabsList>

        {/* ── Productos ── */}
        <TabsContent value="productos" className="mt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, marca, categoría o slug…"
                className="h-11 rounded-full border-input bg-card pr-10 pl-10"
              />
              {query && (
                <button
                  type="button"
                  onClick={limpiarBusquedaProducto}
                  aria-label="Limpiar búsqueda"
                  className="absolute top-1/2 right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              onClick={abrirNuevoProducto}
              disabled={categoriasActivas.length === 0}
              className="h-11 w-full rounded-full px-5 text-[13px] font-medium sm:w-auto"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>

          <div className="mb-4 rounded-[1.4rem] bg-card p-3.5 shadow-card sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5 text-camel-deep" />
                Filtros del catálogo
              </p>
              <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                {cargandoProductos && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-camel-deep" />
                )}
                <span>
                  {productsTotalItems}{" "}
                  {productsTotalItems === 1 ? "producto" : "productos"}
                </span>
                {hasProductResettableFilters && (
                  <button
                    type="button"
                    onClick={limpiarFiltrosProducto}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-secondary/80"
                  >
                    <X className="h-3 w-3" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Visibilidad de productos">
              {(
                [
                  { id: "all", label: "Todos", Icon: null },
                  { id: "visible", label: "Visibles", Icon: Eye },
                  { id: "hidden", label: "Ocultos", Icon: EyeOff },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = productVisibility === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setProductVisibility(id);
                      setProductsPage(1);
                    }}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition",
                      active
                        ? "bg-foreground text-background shadow-card"
                        : "border border-input bg-background text-foreground hover:border-camel"
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0">
                <Select
                  value={productCategory}
                  onValueChange={(v) => {
                    setProductCategory(v);
                    setProductsPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label="Filtrar por categoría"
                    className="w-full min-w-0 rounded-xl border-input bg-background text-xs data-[size=default]:h-10"
                  >
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.slug}>
                        {c.name}
                        {c.isActive ? "" : " (oculta)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0">
                <Select
                  value={productPriceFilter}
                  onValueChange={(v) => {
                    setProductPriceFilter(v as "all" | "priced" | "unpriced");
                    setProductsPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label="Filtrar por precio"
                    className="w-full min-w-0 rounded-xl border-input bg-background text-xs data-[size=default]:h-10"
                  >
                    <SelectValue placeholder="Precio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los precios</SelectItem>
                    <SelectItem value="priced">Con precio definido</SelectItem>
                    <SelectItem value="unpriced">Sin precio (consultar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0">
                <Select
                  value={productTagFilter}
                  onValueChange={(v) => {
                    setProductTagFilter(v as "all" | "onSale" | "featured");
                    setProductsPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label="Filtrar por etiqueta"
                    className="w-full min-w-0 rounded-xl border-input bg-background text-xs data-[size=default]:h-10"
                  >
                    <SelectValue placeholder="Etiqueta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las etiquetas</SelectItem>
                    <SelectItem value="onSale">En oferta</SelectItem>
                    <SelectItem value="featured">Populares</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0">
                <Select
                  value={productSort}
                  onValueChange={(v) => {
                    setProductSort(v as AdminProductSort);
                    setProductsPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label="Ordenar productos"
                    className="w-full min-w-0 rounded-xl border-input bg-background text-xs data-[size=default]:h-10"
                  >
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="destacados">Orden: Destacados</SelectItem>
                    <SelectItem value="nuevos">Orden: Más recientes</SelectItem>
                    <SelectItem value="precio-asc">Precio: menor a mayor</SelectItem>
                    <SelectItem value="precio-desc">Precio: mayor a menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {categoriasActivas.length === 0 && (
            <p className="mb-4 rounded-2xl bg-secondary/70 p-3.5 text-[12.5px] text-muted-foreground">
              Crea primero una categoría activa para poder publicar productos.
            </p>
          )}

          {/* Tabla (escritorio) */}
          <div className="hidden overflow-hidden rounded-[1.4rem] bg-card shadow-card md:block">
            <div className="overflow-x-auto">
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
                <tbody className={cn(cargandoProductos && "opacity-60 transition-opacity")}>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ZoomableThumb
                            src={p.primary_image}
                            alt={p.name}
                            onPreview={setPreviewImage}
                            className="h-12 w-10 rounded-lg"
                          />
                          <div className="min-w-0 max-w-xs lg:max-w-sm">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {p.slug}
                            </p>
                            {(p.oferta || p.top_ventas || p.top_rank !== null) && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {p.oferta && (
                                  <span className="rounded-full bg-camel/15 px-2 py-0.5 text-[10px] font-medium text-camel-deep">
                                    Oferta
                                  </span>
                                )}
                                {(p.top_ventas || p.top_rank !== null) && (
                                  <span className="rounded-full bg-[#4E5B48]/15 px-2 py-0.5 text-[10px] font-medium text-[#4E5B48]">
                                    Popular
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{p.category}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        {formatPriceLabel(p.price_usd ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          disabled={loadingProductId === p.id}
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
                            aria-label={`Editar ${p.name}`}
                            className="h-9 rounded-full border-input bg-card px-3"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loadingProductId === p.id}
                            onClick={() => void alternarProducto(p)}
                            className="h-9 rounded-full border-input bg-card px-3 text-muted-foreground transition"
                            aria-label={
                              p.isActive ? `Ocultar ${p.name}` : `Mostrar ${p.name}`
                            }
                          >
                            {loadingProductId === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-camel-deep" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {products.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {cargandoProductos ? (
                  <p>Cargando productos…</p>
                ) : hasProductResettableFilters ? (
                  <div className="space-y-3">
                    <p>
                      {debouncedQuery
                        ? `Sin resultados para “${debouncedQuery}” con los filtros activos.`
                        : "Ningún producto coincide con los filtros actuales."}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limpiarFiltrosProducto}
                      className="h-9 rounded-full border-input bg-card px-4 text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <p>Todavía no hay productos.</p>
                )}
              </div>
            )}
          </div>

          {/* Tarjetas (móvil) */}
          <div
            className={cn(
              "space-y-3 md:hidden",
              cargandoProductos && "opacity-65 transition-opacity"
            )}
          >
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-3 rounded-[1.3rem] bg-card p-3.5 shadow-card"
              >
                <ZoomableThumb
                  src={p.primary_image}
                  alt={p.name}
                  onPreview={setPreviewImage}
                  className="h-18 w-14 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">
                      {p.name}
                    </p>
                    {!p.isActive && (
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Oculto
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {p.category} ·{" "}
                    <span className="font-semibold text-foreground">
                      {formatPriceLabel(p.price_usd ?? 0)}
                    </span>
                  </p>
                  {(p.oferta || p.top_ventas || p.top_rank !== null) && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.oferta && (
                        <span className="rounded-full bg-camel/15 px-2 py-0.5 text-[10px] font-medium text-camel-deep">
                          Oferta
                        </span>
                      )}
                      {(p.top_ventas || p.top_rank !== null) && (
                        <span className="rounded-full bg-[#4E5B48]/15 px-2 py-0.5 text-[10px] font-medium text-[#4E5B48]">
                          Popular
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirEdicionProducto(p)}
                      className="h-9 rounded-full border-input bg-card px-3 text-[12px]"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingProductId === p.id}
                      onClick={() => void alternarProducto(p)}
                      className="h-9 rounded-full border-input bg-card px-3 text-[12px] text-muted-foreground"
                    >
                      {loadingProductId === p.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-camel-deep" />
                      ) : (
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      {p.isActive ? "Ocultar" : "Mostrar"}
                    </Button>
                    <Switch
                      className="ml-auto"
                      disabled={loadingProductId === p.id}
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
            {products.length === 0 && (
              <div className="rounded-[1.3rem] bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-card">
                {cargandoProductos ? (
                  <p>Cargando productos…</p>
                ) : hasProductResettableFilters ? (
                  <div className="space-y-3">
                    <p>
                      {debouncedQuery
                        ? `Sin resultados para “${debouncedQuery}” con los filtros activos.`
                        : "Ningún producto coincide con los filtros actuales."}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limpiarFiltrosProducto}
                      className="h-9 rounded-full border-input bg-card px-4 text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <p>Todavía no hay productos.</p>
                )}
              </div>
            )}
          </div>

          <PaginationControls
            page={productsPage}
            totalPages={productsTotalPages}
            totalItems={productsTotalItems}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={cambiarPaginaProductos}
            disabled={cargandoProductos}
            itemLabel="productos"
            className="mt-6"
          />
        </TabsContent>

        {/* ── Categorías ── */}
        <TabsContent value="categorias" className="mt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder="Buscar categoría por nombre o enlace…"
                className="h-11 rounded-full border-input bg-card pr-10 pl-10"
              />
              {categoryQuery && (
                <button
                  type="button"
                  onClick={() => setCategoryQuery("")}
                  aria-label="Limpiar búsqueda de categorías"
                  className="absolute top-1/2 right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              onClick={() => {
                setFormCategoria(emptyCategory);
                setModalCategoria(true);
              }}
              className="h-11 w-full rounded-full px-5 text-[13px] font-medium sm:w-auto"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva categoría
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[1.4rem] bg-card p-3.5 shadow-card sm:p-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Visibilidad de categorías">
              {(
                [
                  { id: "all", label: `Todas (${categories.length})`, Icon: null },
                  { id: "visible", label: `Visibles (${categoriesActiveCount})`, Icon: Eye },
                  { id: "hidden", label: `Ocultas (${categoriesHiddenCount})`, Icon: EyeOff },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = categoryVisibility === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategoryVisibility(id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition",
                      active
                        ? "bg-foreground text-background shadow-card"
                        : "border border-input bg-background text-foreground hover:border-camel"
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <span>
                {filteredCategories.length} de {categories.length}
              </span>
              {hasCategoryFilters && (
                <button
                  type="button"
                  onClick={limpiarFiltrosCategoria}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-secondary/80"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Tabla (escritorio) */}
          <div className="hidden overflow-hidden rounded-[1.4rem] bg-card shadow-card md:block">
            <div className="overflow-x-auto">
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
                  {filteredCategories.map((c) => (
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
                          disabled={loadingCategoryId === c.id}
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
                        <div className="flex justify-end gap-1.5">
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
                            aria-label={`Editar ${c.name}`}
                            className="h-9 rounded-full border-input bg-card px-3"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loadingCategoryId === c.id}
                            onClick={() => void alternarCategoria(c)}
                            className="h-9 rounded-full border-input bg-card px-3 text-muted-foreground transition"
                            aria-label={
                              c.isActive ? `Desactivar ${c.name}` : `Activar ${c.name}`
                            }
                          >
                            {loadingCategoryId === c.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-camel-deep" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCategories.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {cargandoCategorias && categories.length === 0 ? (
                  <p>Cargando categorías…</p>
                ) : hasCategoryFilters && categories.length > 0 ? (
                  <div className="space-y-3">
                    <p>Ninguna categoría coincide con el filtro actual.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limpiarFiltrosCategoria}
                      className="h-9 rounded-full border-input bg-card px-4 text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <p>Todavía no hay categorías.</p>
                )}
              </div>
            )}
          </div>

          {/* Tarjetas (móvil) */}
          <div className="space-y-3 md:hidden">
            {filteredCategories.map((c) => (
              <div
                key={c.id}
                className="rounded-[1.3rem] bg-card p-3.5 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      /{c.slug} · Orden {c.sortOrder}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium",
                      c.isActive
                        ? "bg-[#4E5B48]/15 text-[#4E5B48]"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {c.isActive ? "Activa" : "Oculta"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    className="h-9 rounded-full border-input bg-card px-3 text-[12px]"
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingCategoryId === c.id}
                    onClick={() => void alternarCategoria(c)}
                    className="h-9 rounded-full border-input bg-card px-3 text-[12px] text-muted-foreground"
                  >
                    {loadingCategoryId === c.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-camel-deep" />
                    ) : (
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                    )}
                    {c.isActive ? "Desactivar" : "Activar"}
                  </Button>
                  <Switch
                    className="ml-auto"
                    disabled={loadingCategoryId === c.id}
                    checked={c.isActive}
                    onCheckedChange={() => void alternarCategoria(c)}
                    aria-label={
                      c.isActive ? `Desactivar ${c.name}` : `Activar ${c.name}`
                    }
                  />
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="rounded-[1.3rem] bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-card">
                {cargandoCategorias && categories.length === 0 ? (
                  <p>Cargando categorías…</p>
                ) : hasCategoryFilters && categories.length > 0 ? (
                  <div className="space-y-3">
                    <p>Ninguna categoría coincide con el filtro actual.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limpiarFiltrosCategoria}
                      className="h-9 rounded-full border-input bg-card px-4 text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <p>Todavía no hay categorías.</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Solicitudes ── */}
        <TabsContent value="pedidos" className="mt-5">
          {/* Filtro por fecha/rango (afecta estadísticas y lista) + filtros operativos del listado */}
          <div className="mb-4 rounded-[1.4rem] bg-card p-3.5 shadow-card sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-camel-deep" />
                Filtrar por fecha o rango
              </p>
              <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                {cargandoPedidos && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-camel-deep" />
                )}
                <span>
                  {ordersTotalItems}{" "}
                  {ordersTotalItems === 1 ? "solicitud" : "solicitudes"}
                </span>
                {hasOrderAnyFilter && (
                  <button
                    type="button"
                    onClick={limpiarFiltrosSolicitudes}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-secondary/80"
                  >
                    <X className="h-3 w-3" />
                    Limpiar todo
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => {
                const active = dateFilter.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => seleccionarPresetFecha(preset.id)}
                    className={cn(
                      "h-9 rounded-full px-3.5 text-xs font-medium transition",
                      active
                        ? "bg-foreground text-background shadow-card"
                        : "border border-input bg-background text-foreground hover:border-camel"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {dateFilter.preset === "single" && (
              <div className="mt-3 grid max-w-xs gap-1.5">
                <Label htmlFor="orders-single-date" className="text-xs">
                  Día exacto
                </Label>
                <Input
                  id="orders-single-date"
                  type="date"
                  value={dateFilter.singleDate}
                  onChange={(e) => {
                    setOrdersPage(1);
                    setDateFilter((prev) => ({
                      ...prev,
                      singleDate: e.target.value,
                    }));
                  }}
                  className="h-10 rounded-xl border-input bg-background"
                />
              </div>
            )}

            {dateFilter.preset === "range" && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:max-w-lg sm:grid-cols-2">
                <div>
                  <Label htmlFor="orders-from-date" className="text-xs">
                    Desde
                  </Label>
                  <Input
                    id="orders-from-date"
                    type="date"
                    value={dateFilter.fromDate}
                    onChange={(e) => {
                      setOrdersPage(1);
                      setDateFilter((prev) => ({
                        ...prev,
                        fromDate: e.target.value,
                      }));
                    }}
                    className="mt-1 h-10 rounded-xl border-input bg-background"
                  />
                </div>
                <div>
                  <Label htmlFor="orders-to-date" className="text-xs">
                    Hasta
                  </Label>
                  <Input
                    id="orders-to-date"
                    type="date"
                    value={dateFilter.toDate}
                    onChange={(e) => {
                      setOrdersPage(1);
                      setDateFilter((prev) => ({
                        ...prev,
                        toDate: e.target.value,
                      }));
                    }}
                    className="mt-1 h-10 rounded-xl border-input bg-background"
                  />
                </div>
              </div>
            )}

            {resolvedDates.validationError ? (
              <p className="mt-2.5 text-xs text-destructive">
                {resolvedDates.validationError}
              </p>
            ) : (
              <p className="mt-2.5 text-[11.5px] text-muted-foreground">
                La fecha también actualiza las estadísticas mostradas arriba.
              </p>
            )}

            <div className="mt-4 border-t border-border/70 pt-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5 text-camel-deep" />
                Filtrar listado
              </p>

              <div
                className="mt-2.5 flex flex-wrap gap-1.5"
                role="group"
                aria-label="Estado de solicitudes"
              >
                {(
                  [
                    { id: "all", label: "Todas" },
                    { id: "requested", label: "Solicitadas" },
                    { id: "closed", label: "Vendidas" },
                    { id: "cancelled", label: "Canceladas" },
                  ] as const
                ).map(({ id, label }) => {
                  const active = orderStatus === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setOrderStatus(id);
                        setOrdersPage(1);
                      }}
                      className={cn(
                        "h-9 rounded-full px-3.5 text-xs font-medium transition",
                        active
                          ? "bg-foreground text-background shadow-card"
                          : "border border-input bg-background text-foreground hover:border-camel"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative min-w-0 sm:col-span-2">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    placeholder="Buscar por código (NM-…), producto o vendedor…"
                    className="h-10 rounded-xl border-input bg-background pr-9 pl-9 text-xs"
                  />
                  {orderQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderQuery("");
                        setDebouncedOrderQuery("");
                        setOrdersPage(1);
                      }}
                      aria-label="Limpiar búsqueda de solicitudes"
                      className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="min-w-0">
                  <Select
                    value={orderReferral}
                    onValueChange={(v) => {
                      setOrderReferral(v);
                      setOrdersPage(1);
                    }}
                  >
                    <SelectTrigger
                      aria-label="Filtrar por origen de enlace"
                      className="w-full min-w-0 rounded-xl border-input bg-background text-xs data-[size=default]:h-10"
                    >
                      <SelectValue placeholder="Origen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los orígenes</SelectItem>
                      <SelectItem value="any">Con enlace de vendedor</SelectItem>
                      <SelectItem value="none">Sin enlace (directas)</SelectItem>
                      {referralFilterOptions.map((opt) => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {opt.label} (?v={opt.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <Select
                    value={orderPriceFilter}
                    onValueChange={(v) => {
                      setOrderPriceFilter(v as "all" | "unpriced" | "priced");
                      setOrdersPage(1);
                    }}
                  >
                    <SelectTrigger
                      aria-label="Filtrar por precios de la solicitud"
                      className="w-full min-w-0 rounded-xl border-input bg-background text-xs data-[size=default]:h-10"
                    >
                      <SelectValue placeholder="Precios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Con o sin precio</SelectItem>
                      <SelectItem value="unpriced">
                        Con artículos sin precio
                      </SelectItem>
                      <SelectItem value="priced">Todos con precio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla (escritorio) */}
          <div className="hidden overflow-hidden rounded-[1.4rem] bg-card shadow-card md:block">
            <div className="overflow-x-auto">
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
                <tbody className={cn(cargandoPedidos && "opacity-60 transition-opacity")}>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-[13px] font-semibold">
                          {o.reference}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {o.hasUnpricedItems && o.status === "requested" && (
                            <span className="inline-block rounded-full bg-camel/15 px-2 py-0.5 text-[10px] font-medium text-camel-deep">
                              SIN PRECIO
                            </span>
                          )}
                          {o.referralCode && (
                            <span
                              className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                              title={`Enlace ?v=${o.referralCode}`}
                            >
                              Enlace: {o.referredByAdminName || o.referralCode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        {o.items.reduce((a, i) => a + i.quantity, 0)}
                      </td>
                      <td className="px-4 py-3.5 font-semibold whitespace-nowrap">
                        {formatPriceLabel(o.estimatedTotalUsd ?? 0)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
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
                          disabled={loadingOrderId === o.id}
                          onClick={() => void abrirSolicitud(o)}
                          className="h-9 rounded-full border-input bg-card px-4 text-[12px]"
                        >
                          {loadingOrderId === o.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-camel-deep" />
                          ) : null}
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {cargandoPedidos ? (
                  <p>Cargando solicitudes…</p>
                ) : hasOrderAnyFilter ? (
                  <div className="space-y-3">
                    <p>Ninguna solicitud coincide con los filtros actuales.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limpiarFiltrosSolicitudes}
                      className="h-9 rounded-full border-input bg-card px-4 text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <p>Todavía no hay solicitudes.</p>
                )}
              </div>
            )}
          </div>

          {/* Tarjetas (móvil) */}
          <div
            className={cn(
              "space-y-3 md:hidden",
              cargandoPedidos && "opacity-65 transition-opacity"
            )}
          >
            {orders.map((o) => {
              const totalUds = o.items.reduce((a, i) => a + i.quantity, 0);
              const resumenProductos = o.items
                .slice(0, 2)
                .map((item) => `${item.quantity}× ${item.productName}`)
                .join(", ");
              return (
                <div
                  key={o.id}
                  className="rounded-[1.3rem] bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold">
                          {o.reference}
                        </p>
                        {o.hasUnpricedItems && o.status === "requested" && (
                          <span className="rounded-full bg-camel/15 px-2 py-0.5 text-[10px] font-medium text-camel-deep">
                            SIN PRECIO
                          </span>
                        )}
                        {o.referralCode && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Enlace: {o.referredByAdminName || o.referralCode}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(o.createdAt)} · {totalUds}{" "}
                        {totalUds === 1 ? "artículo" : "artículos"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        STATUS_STYLES[o.status]
                      )}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </div>

                  {resumenProductos && (
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {resumenProductos}
                      {o.items.length > 2 ? ` (+${o.items.length - 2})` : ""}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <span className="text-sm font-bold">
                      {formatPriceLabel(o.estimatedTotalUsd ?? 0)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingOrderId === o.id}
                      onClick={() => void abrirSolicitud(o)}
                      className="h-9 rounded-full border-input bg-card px-4 text-[12px]"
                    >
                      {loadingOrderId === o.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-camel-deep" />
                      ) : (
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Ver solicitud
                    </Button>
                  </div>
                </div>
              );
            })}

            {orders.length === 0 && (
              <div className="rounded-[1.3rem] bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-card">
                {cargandoPedidos ? (
                  <p>Cargando solicitudes…</p>
                ) : hasOrderAnyFilter ? (
                  <div className="space-y-3">
                    <p>Ninguna solicitud coincide con los filtros actuales.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limpiarFiltrosSolicitudes}
                      className="h-9 rounded-full border-input bg-card px-4 text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <p>Todavía no hay solicitudes.</p>
                )}
              </div>
            )}
          </div>

          <PaginationControls
            page={ordersPage}
            totalPages={ordersTotalPages}
            totalItems={ordersTotalItems}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={cambiarPaginaSolicitudes}
            disabled={cargandoPedidos}
            itemLabel="solicitudes"
            className="mt-6"
          />

          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            Cada solicitud guarda los productos pedidos desde la tienda. Al
            finalizarla puedes ajustar cantidades y precios, quitar líneas y
            dejarla como vendida o cancelada con su motivo.
          </p>
        </TabsContent>

        {/* ── Mi enlace personalizado ── */}
        <TabsContent value="enlace" className="mt-5">
          {!sellerEndpointAvailable ? (
            <div className="rounded-[1.4rem] border border-dashed border-camel bg-card p-5 shadow-card sm:p-6">
              <h2 className="text-base font-semibold">
                Función pendiente de actualizar en el API
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                Ejecuta el script SQL{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[12px]">
                  Sql/20261110-admin-referral-whatsapp.sql
                </code>{" "}
                en Supabase y vuelve a publicar{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[12px]">
                  Powergy.Api
                </code>{" "}
                para activar los enlaces personalizados por administrador.
              </p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <form
                onSubmit={guardarPerfilVendedor}
                className="min-w-0 rounded-[1.5rem] bg-card p-5 shadow-card sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">
                      Tu enlace y WhatsApp de pedidos
                    </h2>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                      Quien entre por tu enlace verá la misma tienda y, al
                      confirmar un pedido, WhatsApp se abrirá con tu número.
                    </p>
                  </div>
                  {cargandoPerfil && (
                    <Loader2 className="h-4 w-4 animate-spin text-camel-deep" />
                  )}
                </div>

                {perfilError && (
                  <p className="mt-4 rounded-2xl bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive">
                    {perfilError}
                  </p>
                )}

                <div className="mt-5 grid min-w-0 gap-4">
                  <div className="min-w-0">
                    <Label htmlFor="seller-name">Nombre visible (opcional)</Label>
                    <Input
                      id="seller-name"
                      value={formPerfil.displayName}
                      onChange={(e) =>
                        setFormPerfil((prev) => ({
                          ...prev,
                          displayName: e.target.value,
                        }))
                      }
                      maxLength={100}
                      placeholder="Ej. Carlos Pérez"
                      className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                    />
                  </div>

                  <div className="min-w-0">
                    <Label htmlFor="seller-code">Código de tu enlace *</Label>
                    <Input
                      id="seller-code"
                      value={formPerfil.referralCode}
                      onChange={(e) =>
                        setFormPerfil((prev) => ({
                          ...prev,
                          referralCode: sanitizeReferralCodeInput(e.target.value),
                        }))
                      }
                      maxLength={40}
                      placeholder="carlos"
                      className="mt-1.5 h-11 rounded-2xl border-input bg-background font-mono text-sm"
                    />
                    <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                      De 2 a 40 caracteres en minúscula (letras, números,{" "}
                      <code className="font-mono">-</code> o{" "}
                      <code className="font-mono">_</code>).
                    </p>
                  </div>

                  <div className="min-w-0">
                    <Label htmlFor="seller-phone">
                      Número de WhatsApp (con código de país) *
                    </Label>
                    <Input
                      id="seller-phone"
                      value={formPerfil.whatsAppPhone}
                      onChange={(e) =>
                        setFormPerfil((prev) => ({
                          ...prev,
                          whatsAppPhone: e.target.value,
                        }))
                      }
                      maxLength={30}
                      inputMode="tel"
                      placeholder="5359749037"
                      className="mt-1.5 h-11 rounded-2xl border-input bg-background font-mono text-sm"
                    />
                    <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                      Solo se usa cuando el cliente finaliza un pedido. El
                      formulario de Contacto y el pie de página siguen usando el
                      número principal de la tienda.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Button
                    type="submit"
                    disabled={guardandoPerfil}
                    className="h-11 rounded-full px-6 text-[13px] font-semibold"
                  >
                    {guardandoPerfil ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando…
                      </>
                    ) : (
                      "Guardar enlace"
                    )}
                  </Button>
                  {sellerProfile?.referralCode && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={guardandoPerfil}
                      onClick={() => void desactivarEnlaceVendedor()}
                      className="h-11 rounded-full border-input bg-card px-5 text-[13px]"
                    >
                      Desactivar enlace
                    </Button>
                  )}
                </div>
              </form>

              <aside className="min-w-0 space-y-4">
                <div className="rounded-[1.5rem] bg-card p-5 shadow-card sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Link2 className="h-4 w-4 text-camel-deep" />
                      Enlace para compartir
                    </h3>
                    {sellerProfile?.referralCode &&
                    sellerProfile?.whatsAppPhone ? (
                      <span className="rounded-full bg-[#4E5B48]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#4E5B48]">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Sin activar
                      </span>
                    )}
                  </div>

                  {sellerProfile?.referralCode && sellerProfile?.whatsAppPhone ? (
                    <>
                      <div className="mt-3 rounded-2xl bg-secondary/70 p-3 font-mono text-[12px] break-all text-foreground">
                        {buildShareReferralUrl(sellerProfile.referralCode, "/")}
                      </div>
                      <Button
                        type="button"
                        onClick={() =>
                          void copiarEnlacePersonal(sellerProfile.referralCode)
                        }
                        className="mt-3 h-10 w-full rounded-full text-[13px] font-medium"
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copiar mi enlace
                      </Button>
                      {(formPerfil.referralCode.trim() !==
                        (sellerProfile.referralCode ?? "") ||
                        normalizeWhatsAppPhone(formPerfil.whatsAppPhone) !==
                          (sellerProfile.whatsAppPhone ?? null)) && (
                        <p className="mt-2.5 text-[11.5px] text-camel-deep">
                          Tienes cambios sin guardar en el formulario.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-secondary/60 p-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {formPerfil.referralCode.trim() ? (
                        <>
                          Vista previa:{" "}
                          <span className="font-mono break-all text-foreground">
                            {buildShareReferralUrl(
                              formPerfil.referralCode.trim(),
                              "/"
                            )}
                          </span>
                          . Pulsa <strong>Guardar enlace</strong> para activarlo.
                        </>
                      ) : (
                        "Define tu código corto y tu número de WhatsApp para generar tu enlace personal."
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-[1.5rem] bg-card p-5 shadow-card sm:p-6">
                  <h3 className="text-sm font-semibold">¿Cómo funciona?</h3>
                  <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
                    <li>
                      • Cualquier página admite tu parámetro (por ejemplo,{" "}
                      <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px] text-foreground">
                        /catalogo?v=
                        {sellerProfile?.referralCode || "codigo"}
                      </code>
                      ).
                    </li>
                    <li>
                      • Cuando el cliente entra por tu enlace, queda asociado en
                      su navegador durante <strong>7 días</strong> aunque cierre
                      o siga navegando por la tienda.
                    </li>
                    <li>
                      • Si entra después por el enlace de otro administrador, se
                      actualiza al más reciente.
                    </li>
                    <li>
                      • Las solicitudes registradas con tu enlace también quedan
                      marcadas aquí en <strong>Solicitudes</strong>.
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Diálogo de producto ── */}
      <Dialog open={modalProducto} onOpenChange={setModalProducto}>
        <DialogContent className="rounded-[1.6rem] bg-card p-4 sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {formProducto.id ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-w-0 flex-col gap-3.5 sm:gap-4">
            <div className="min-w-0">
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
            <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <Label>Categoría *</Label>
                <Select
                  value={formProducto.categoryId}
                  onValueChange={(v) =>
                    setFormProducto({ ...formProducto, categoryId: v })
                  }
                >
                  <SelectTrigger className="mt-1.5 h-11 w-full min-w-0 rounded-2xl border-input bg-background">
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
              <div className="min-w-0">
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
            <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
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
              <div className="min-w-0">
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
            <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
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
              <div className="min-w-0">
                <Label htmlFor="p-slug">Enlace (slug)</Label>
                <Input
                  id="p-slug"
                  value={slugify(formProducto.name)}
                  readOnly
                  placeholder="blazer-de-lino"
                  className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                />
              </div>
            </div>
            <div className="min-w-0">
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
            <div className="min-w-0">
              <Label htmlFor="p-image">Imagen *</Label>
              <div className="mt-1.5 flex min-w-0 items-center gap-3">
                <ZoomableThumb
                  src={formProducto.image}
                  alt={formProducto.name || "Imagen del producto"}
                  onPreview={setPreviewImage}
                  priority
                  className="h-16 w-14 rounded-xl"
                />
                <div className="min-w-0 flex-1 space-y-2">
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
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl bg-secondary/60 p-3.5 sm:grid sm:grid-cols-3 sm:gap-3 sm:p-4">
              <label className="flex shrink-0 items-center gap-2 text-[12.5px] font-medium sm:text-[13px]">
                <Switch
                  checked={formProducto.onSale}
                  onCheckedChange={(v) =>
                    setFormProducto({ ...formProducto, onSale: v })
                  }
                />
                Oferta
              </label>
              <label className="flex shrink-0 items-center gap-2 text-[12.5px] font-medium sm:text-[13px]">
                <Switch
                  checked={formProducto.topVentas}
                  onCheckedChange={(v) =>
                    setFormProducto({ ...formProducto, topVentas: v })
                  }
                />
                Populares
              </label>
              <label className="flex shrink-0 items-center gap-2 text-[12.5px] font-medium sm:text-[13px]">
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
              {saving
                ? "Guardando…"
                : formProducto.id
                  ? "Guardar cambios"
                  : "Crear producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de categoría ── */}
      <Dialog open={modalCategoria} onOpenChange={setModalCategoria}>
        <DialogContent className="rounded-[1.6rem] bg-card p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {formCategoria.id ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="min-w-0">
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
            <div className="min-w-0">
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
              {saving
                ? "Guardando…"
                : formCategoria.id
                  ? "Guardar cambios"
                  : "Crear categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de solicitud ── */}
      <Dialog
        open={solicitud !== null}
        onOpenChange={(open) => {
          if (!open) {
            cerrarDialogoSolicitud();
          }
        }}
      >
        <DialogContent className="rounded-[1.6rem] bg-card p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2.5">
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
            <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
              <div className="grid min-w-0 grid-cols-2 gap-3 rounded-2xl bg-secondary/60 p-3.5 text-[13px] sm:grid-cols-3 sm:p-4">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Fecha</p>
                  <p className="font-medium break-words">{formatDate(detalle.createdAt)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Productos</p>
                  <p className="font-medium">
                    {detalle.items.reduce((a, i) => a + i.quantity, 0)} uds.
                  </p>
                </div>
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="text-[11px] text-muted-foreground">
                    Total estimado
                  </p>
                  <p className="font-semibold">
                    {formatPriceLabel(detalle.estimatedTotalUsd ?? 0)}
                  </p>
                </div>
                {detalle.referralCode && (
                  <div className="col-span-2 min-w-0 sm:col-span-3">
                    <p className="text-[11px] text-muted-foreground">
                      Enlace de vendedor
                    </p>
                    <p className="font-medium break-words">
                      {detalle.referredByAdminName
                        ? `${detalle.referredByAdminName} (?v=${detalle.referralCode})`
                        : `?v=${detalle.referralCode}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Líneas */}
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Productos solicitados
                  </p>
                  {cargandoImagenesDetalle && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Cargando fotos…
                    </span>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {itemsEdicion.map((linea, indice) => {
                    const thumbSrc = productImages[linea.productId];
                    const esAbierta = detalle.status === "requested";
                    const parsedPrice = Number.parseFloat(
                      linea.price.replace(",", ".")
                    );
                    const displayPrice = Number.isFinite(parsedPrice)
                      ? parsedPrice
                      : 0;

                    return (
                      <li
                        key={linea.productId}
                        className={cn(
                          "flex min-w-0 flex-col gap-3 rounded-2xl border border-input bg-background p-3 sm:flex-row sm:items-center",
                          linea.quitar && "opacity-50"
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <ZoomableThumb
                            src={thumbSrc}
                            alt={linea.productName}
                            onPreview={setPreviewImage}
                            priority
                            className="h-14 w-12 rounded-xl"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13.5px] font-medium leading-snug">
                              {linea.productName}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                              {linea.productId}
                            </p>
                          </div>
                        </div>

                        {esAbierta ? (
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 sm:shrink-0 sm:justify-end sm:border-t-0 sm:pt-0">
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
                              <span className="text-[11px] text-muted-foreground">
                                USD
                              </span>
                              <Input
                                value={linea.price}
                                onChange={(e) =>
                                  setItemsEdicion((prev) =>
                                    prev.map((l, i) =>
                                      i === indice
                                        ? { ...l, price: e.target.value }
                                        : l
                                    )
                                  )
                                }
                                placeholder="0.00"
                                inputMode="decimal"
                                className="h-9 w-20 rounded-xl border-input bg-card sm:w-24"
                              />
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setItemsEdicion((prev) =>
                                  prev.map((l, i) =>
                                    i === indice
                                      ? { ...l, quitar: !l.quitar }
                                      : l
                                  )
                                )
                              }
                              className="ml-auto h-9 rounded-full border-input bg-card px-3 text-[12px] sm:ml-0"
                            >
                              {linea.quitar ? "Reponer" : "Quitar"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2 text-xs text-muted-foreground sm:shrink-0 sm:border-t-0 sm:pt-0 sm:text-right">
                            <span>
                              {linea.quantity}{" "}
                              {linea.quantity === 1 ? "ud." : "uds."}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {formatPriceLabel(displayPrice)}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {detalle.removedItems.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-secondary/45 p-3">
                    <p className="mb-2 text-[11.5px] font-medium text-muted-foreground">
                      Líneas quitadas antes:
                    </p>
                    <ul className="space-y-1.5">
                      {detalle.removedItems.map((l) => (
                        <li
                          key={`${l.productId}-${l.removedAt ?? "removed"}`}
                          className="flex min-w-0 items-center gap-2.5 text-xs text-muted-foreground"
                        >
                          <ZoomableThumb
                            src={productImages[l.productId]}
                            alt={l.productName}
                            onPreview={setPreviewImage}
                            priority
                            className="h-10 w-8 rounded-lg"
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground/80">
                            {l.productName}
                          </span>
                          <span className="shrink-0">
                            {l.quantity} {l.quantity === 1 ? "ud." : "uds."}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Resultado */}
              {detalle.status === "requested" ? (
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setResultado("closed")}
                      className={cn(
                        "flex min-w-0 items-center gap-3 rounded-2xl border p-3.5 text-left transition sm:p-4",
                        resultado === "closed"
                          ? "border-[#4E5B48] bg-[#4E5B48]/10"
                          : "border-input bg-background hover:border-[#4E5B48]/50"
                      )}
                    >
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4E5B48]" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          Vendida
                        </span>
                        <span className="block text-[12px] text-muted-foreground">
                          Suma a las estadísticas de ventas.
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultado("cancelled")}
                      className={cn(
                        "flex min-w-0 items-center gap-3 rounded-2xl border p-3.5 text-left transition sm:p-4",
                        resultado === "cancelled"
                          ? "border-[#B3402E] bg-[#B3402E]/10"
                          : "border-input bg-background hover:border-[#B3402E]/50"
                      )}
                    >
                      <XCircle className="h-5 w-5 shrink-0 text-[#B3402E]" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          Cancelada
                        </span>
                        <span className="block text-[12px] text-muted-foreground">
                          Se conserva con su motivo, no suma ventas.
                        </span>
                      </span>
                    </button>
                  </div>

                  {resultado === "cancelled" && (
                    <div className="flex min-w-0 flex-col gap-4 rounded-2xl bg-secondary/60 p-3.5 sm:p-4">
                      <div className="min-w-0">
                        <Label>Motivo *</Label>
                        <Select value={motivo} onValueChange={setMotivo}>
                          <SelectTrigger className="mt-1.5 h-11 w-full min-w-0 rounded-2xl border-input bg-background">
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
                      <div className="min-w-0">
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
                    <div className="rounded-2xl bg-camel/15 p-3.5 sm:p-4">
                      <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-camel-deep">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        Hay productos sin precio: se guardarán como «consultar» y
                        no sumarán valor a las estadísticas.
                      </p>
                      <label className="mt-3 flex items-center gap-2.5 text-[13px] font-medium">
                        <input
                          type="checkbox"
                          checked={confirmarSinPrecio}
                          onChange={(e) =>
                            setConfirmarSinPrecio(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-input accent-[#B08968]"
                        />
                        Confirmo vender aunque falten precios
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-secondary/60 p-3.5 text-[13px] sm:p-4">
                  <p className="font-semibold">
                    {detalle.status === "closed"
                      ? "Solicitud vendida"
                      : "Solicitud cancelada"}
                    {detalle.closedAt ? ` · ${formatDate(detalle.closedAt)}` : ""}
                  </p>
                  {detalle.cancellationReason && (
                    <p className="mt-1 break-words text-muted-foreground">
                      Motivo:{" "}
                      {CANCELLATION_REASONS.find(
                        (r) => r.id === detalle.cancellationReason
                      )?.label ?? detalle.cancellationReason}
                      {detalle.cancellationNote
                        ? ` — ${detalle.cancellationNote}`
                        : ""}
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
              onClick={cerrarDialogoSolicitud}
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

      {/* ── Visor ampliado de imagen ── */}
      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
