/* ── Cliente del API de POWERGY ──────────────────────────────────
   NOVA MODA comparte la base de datos con el catálogo de POWERGY y se
   identifica con su propia tienda (por defecto "nova-moda"). El catálogo,
   las categorías y las solicitudes viven en el API; lo único local es el
   carrito y los favoritos del navegador. */

/** Tienda con la que se consulta el API */
export const NOVA_STORE =
  process.env.NEXT_PUBLIC_NOVA_STORE?.trim() || "nova-moda";

/** Base del API. En el navegador siempre se pasa por el proxy /api/powergy. */
export const API_BASE = "/api/powergy";

/* ── Contratos del API (tal como los devuelve) ────────────────── */

export interface ApiProduct {
  id: string;
  slug: string;
  /** Nombre de la categoría */
  category: string;
  categoryId: string;
  subcategory: string;
  brand: string;
  model: string;
  name: string;
  /** Precio en USD; null o 0 significa "consultar" */
  price_usd: number | null;
  specifications: string;
  primary_image: string;
  oferta: boolean;
  garantia: boolean;
  transporte: boolean;
  factura: boolean;
  top_ventas: boolean;
  top_rank: number | null;
  isActive: boolean;
  store: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  store: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiCursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  totalItems: number | null;
}

export interface ApiCatalogMeta {
  totalActive: number;
  maxPriceUsd: number | null;
}

export interface ApiOrderLine {
  productId: string;
  productName: string;
  productSlug: string;
  categoryName: string;
  quantity: number;
  originalQuantity: number;
  unitPriceUsd: number | null;
  lineTotalUsd: number | null;
}

export interface ApiOrder {
  id: string;
  reference: string;
  status: "requested" | "closed" | "cancelled";
  store: string;
  estimatedTotalUsd: number | null;
  originalEstimatedTotalUsd: number | null;
  createdAt: string;
  closedAt: string | null;
  closedByAdminUserId: string | null;
  cancellationReason: string | null;
  cancellationNote: string | null;
  hasUnpricedItems: boolean;
  items: ApiOrderLine[];
  removedItems?: ApiOrderLine[];
  referralCode?: string | null;
  referredByAdminName?: string | null;
}

/* ── Mapeo al modelo de la tienda ─────────────────────────────── */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Convierte una categoría del API en la categoría de la tienda */
export function mapCategory(category: ApiCategory): CategoryView {
  return {
    id: category.slug,
    apiId: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  };
}

/** Producto del API con el modelo que usan las vistas */
export function mapProduct(
  product: ApiProduct,
  categoriesById: Map<string, { slug: string; name: string }> = new Map()
): ProductView {
  const category = categoriesById.get(product.categoryId);
  const categorySlug = category?.slug ?? slugify(product.category);
  const categoryName = category?.name ?? product.category;
  const image = product.primary_image?.trim() ?? "";

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price_usd ?? 0,
    category: categorySlug,
    categoryName,
    categoryId: product.categoryId,
    brand: product.brand,
    model: product.model,
    subcategory: product.subcategory,
    description: product.specifications,
    image,
    images: image ? [image] : [],
    tags: [product.brand, product.model, product.subcategory]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
    badge: product.oferta
      ? "oferta"
      : product.top_ventas || product.top_rank !== null
        ? "populares"
        : undefined,
    featured: product.top_ventas || product.top_rank !== null,
    onSale: product.oferta,
    isActive: product.isActive,
    createdAt: product.createdAt,
  };
}

/** Categoría tal como la consumen las vistas */
export interface CategoryView {
  /** slug: se usa en las rutas (#/categoria/mujer) */
  id: string;
  apiId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

/** Producto tal como lo consumen las vistas */
export interface ProductView {
  id: string;
  slug: string;
  name: string;
  /** 0 = precio por confirmar ("Consultar") */
  price: number;
  /** slug de la categoría */
  category: string;
  categoryName: string;
  categoryId: string;
  brand: string;
  model: string;
  subcategory: string;
  description: string;
  image: string;
  images: string[];
  tags: string[];
  badge?: "oferta" | "populares";
  featured?: boolean;
  onSale: boolean;
  isActive: boolean;
  createdAt: string;
}

/* ── Llamadas al API (siempre por el proxy del propio sitio) ──── */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      detail?: string;
      title?: string;
      errors?: Record<string, string[]>;
    };
    if (data.detail) return data.detail;
    if (data.errors) {
      const first = Object.values(data.errors)[0];
      if (first?.[0]) return first[0];
    }
    if (data.title) return data.title;
  } catch {
    /* respuesta sin JSON */
  }
  return `Error ${response.status}`;
}

export async function apiGet<T>(
  path: string,
  token?: string | null,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return (await response.json()) as T;
}

export async function apiSend<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const { method = "POST", body, token } = options;
  const response = await fetch(`${API_BASE}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Categorías de la tienda (rápido, solo 1 petición) */
export async function fetchStoreCategories(
  signal?: AbortSignal
): Promise<CategoryView[]> {
  const categories = (
    await apiGet<ApiCategory[]>(
      "categories?store=" + encodeURIComponent(NOVA_STORE),
      undefined,
      signal
    )
  ).map(mapCategory);
  return categories;
}

export type CategoryMap = Map<string, { slug: string; name: string }>;

export interface ProductQueryOptions {
  categories?: string[];
  q?: string;
  maxPrice?: number;
  onSale?: boolean;
  featured?: boolean;
  sort?: "destacados" | "precio-asc" | "precio-desc" | "nuevos";
  page?: number;
  pageSize?: number;
  cursor?: string | null;
  limit?: number;
}

function buildProductSearchParams(opts: ProductQueryOptions): URLSearchParams {
  const params = new URLSearchParams({ store: NOVA_STORE });

  const cats = (opts.categories ?? []).map((c) => c.trim()).filter(Boolean);
  if (cats.length === 1) {
    params.set("category", cats[0]);
  } else if (cats.length > 1) {
    params.set("categories", cats.join(","));
  }

  const q = opts.q?.trim();
  if (q) params.set("q", q);

  if (opts.maxPrice && opts.maxPrice > 0) {
    params.set("maxPrice", String(opts.maxPrice));
  }
  if (opts.onSale) params.set("onSale", "true");
  if (opts.featured !== undefined) params.set("featured", String(opts.featured));
  if (opts.sort) params.set("sort", opts.sort);

  return params;
}

/** Página tradicional de productos (p.ej. 20 por página cuando hay categoría) */
export async function fetchProductsPage(
  opts: ProductQueryOptions,
  categoriesById: CategoryMap = new Map(),
  signal?: AbortSignal
): Promise<ApiPage<ProductView>> {
  const params = buildProductSearchParams(opts);
  params.set("page", String(opts.page ?? 1));
  params.set("pageSize", String(opts.pageSize ?? 20));

  const result = await apiGet<ApiPage<ApiProduct>>(
    `products?${params.toString()}`,
    undefined,
    signal
  );

  return {
    ...result,
    items: result.items.map((item) => mapProduct(item, categoriesById)),
  };
}

/** Lote por cursor para scroll infinito (sin categoría marcada) */
export async function fetchProductsCursor(
  opts: ProductQueryOptions,
  categoriesById: CategoryMap = new Map(),
  signal?: AbortSignal
): Promise<ApiCursorPage<ProductView>> {
  const params = buildProductSearchParams(opts);
  params.set("limit", String(opts.limit ?? 12));
  if (opts.cursor) params.set("cursor", opts.cursor);

  const result = await apiGet<ApiCursorPage<ApiProduct>>(
    `products/cursor?${params.toString()}`,
    undefined,
    signal
  );

  return {
    ...result,
    items: result.items.map((item) => mapProduct(item, categoriesById)),
  };
}

/** Metadatos del catálogo activo (total y precio máximo) */
export async function fetchCatalogMeta(
  signal?: AbortSignal
): Promise<ApiCatalogMeta> {
  return apiGet<ApiCatalogMeta>(
    `products/meta?store=${encodeURIComponent(NOVA_STORE)}`,
    undefined,
    signal
  );
}

/** Producto individual por ID (con respaldo por slug si llega uno) */
export async function fetchProductById(
  id: string,
  categoriesById: CategoryMap = new Map(),
  signal?: AbortSignal
): Promise<ProductView | null> {
  const clean = id.trim();
  if (!clean) return null;

  try {
    const item = await apiGet<ApiProduct>(
      `products/by-id/${encodeURIComponent(clean)}?store=${encodeURIComponent(NOVA_STORE)}`,
      undefined,
      signal
    );
    return mapProduct(item, categoriesById);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      try {
        const bySlug = await apiGet<ApiProduct>(
          `products/${encodeURIComponent(clean)}?store=${encodeURIComponent(NOVA_STORE)}`,
          undefined,
          signal
        );
        return mapProduct(bySlug, categoriesById);
      } catch (slugError) {
        if (slugError instanceof ApiError && slugError.status === 404) {
          return null;
        }
        throw slugError;
      }
    }
    throw error;
  }
}

/** Lote puntual de productos por IDs (carrito y favoritos) */
export async function fetchProductsByIds(
  ids: string[],
  categoriesById: CategoryMap = new Map(),
  signal?: AbortSignal
): Promise<ProductView[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const results: ProductView[] = [];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const params = new URLSearchParams({
      store: NOVA_STORE,
      ids: chunk.join(","),
    });
    const items = await apiGet<ApiProduct[]>(
      `products/batch?${params.toString()}`,
      undefined,
      signal
    );
    results.push(...items.map((item) => mapProduct(item, categoriesById)));
  }
  return results;
}

/** Productos de la tienda (hasta 5 páginas) */
export async function fetchStoreProducts(
  categoriesById: CategoryMap = new Map()
): Promise<ProductView[]> {
  const products: ProductView[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const result = await apiGet<ApiPage<ApiProduct>>(
      `products?store=${encodeURIComponent(NOVA_STORE)}&page=${page}&pageSize=100`
    );
    products.push(
      ...result.items.map((item) => mapProduct(item, categoriesById))
    );
    if (page >= result.totalPages || result.items.length === 0) break;
  }
  return products;
}

/** Catálogo completo */
export async function fetchCatalog(): Promise<{
  products: ProductView[];
  categories: CategoryView[];
}> {
  const categories = await fetchStoreCategories();
  const categoriesById = new Map(
    categories.map((category) => [
      category.apiId,
      { slug: category.slug, name: category.name },
    ])
  );
  const products = await fetchStoreProducts(categoriesById);
  return { products, categories };
}
