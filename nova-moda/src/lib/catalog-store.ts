"use client";

/* ── Store de catálogo: carga bajo demanda desde el API ─────────
   - Las categorías se cargan por separado (Header, Footer, Home).
   - Los productos se consultan según la vista: cursor / paginación
     en el catálogo, lote puntual para carrito/favoritos, ficha única
     por ID y resumen ligero en la portada.
   - Todo producto recibido se cachea en `productsById` para navegar
     entre tarjetas, ficha y carrito sin peticiones redundantes. */

import { useEffect, useMemo } from "react";
import { create } from "zustand";
import {
  fetchCatalogMeta,
  fetchProductById,
  fetchProductsByIds,
  fetchProductsPage,
  fetchStoreCategories,
  type ApiCatalogMeta,
  type CategoryMap,
  type CategoryView,
  type ProductView,
} from "./powergy-api";

export type Status = "idle" | "loading" | "ready" | "error";

interface HomeProducts {
  featured: ProductView[];
  news: ProductView[];
  promo: ProductView | null;
}

interface CatalogState {
  categories: CategoryView[];
  categoriesStatus: Status;
  categoriesError: string | null;

  meta: ApiCatalogMeta | null;
  metaStatus: Status;

  home: HomeProducts;
  homeStatus: Status;

  productsById: Record<string, ProductView>;
  unresolvedIds: Record<string, true>;
  categoryPreviews: Record<string, string>;
  version: number;

  loadCategories: (force?: boolean) => void;
  loadMeta: (force?: boolean) => void;
  loadHome: (force?: boolean) => void;
  registerProducts: (items: ProductView[]) => void;
  ensureProductsByIds: (ids: string[]) => void;
  ensureProductById: (id: string) => void;
  ensureCategoryPreview: (slug: string) => void;
  reload: () => void;
}

const inFlightIds = new Set<string>();
const inFlightCategoryPreviews = new Set<string>();

function buildCategoryMap(categories: CategoryView[]): CategoryMap {
  return new Map(
    categories.map((c) => [c.apiId, { slug: c.slug, name: c.name }])
  );
}

function mergeProducts(
  current: Record<string, ProductView>,
  items: ProductView[]
): Record<string, ProductView> {
  if (items.length === 0) return current;
  let changed = false;
  const next = { ...current };
  for (const item of items) {
    const prev = next[item.id];
    if (
      !prev ||
      prev.createdAt !== item.createdAt ||
      prev.price !== item.price ||
      prev.originalPrice !== item.originalPrice ||
      prev.discountPercent !== item.discountPercent ||
      prev.onSale !== item.onSale ||
      prev.image !== item.image ||
      prev.name !== item.name ||
      prev.category !== item.category
    ) {
      next[item.id] = item;
      changed = true;
    }
  }
  return changed ? next : current;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  categories: [],
  categoriesStatus: "idle",
  categoriesError: null,

  meta: null,
  metaStatus: "idle",

  home: { featured: [], news: [], promo: null },
  homeStatus: "idle",

  productsById: {},
  unresolvedIds: {},
  categoryPreviews: {},
  version: 0,

  loadCategories: (force = false) => {
    const { categoriesStatus } = get();
    if (!force && categoriesStatus !== "idle" && categoriesStatus !== "error") {
      return;
    }
    set({ categoriesStatus: "loading", categoriesError: null });

    fetchStoreCategories()
      .then((categories) => {
        set({
          categories,
          categoriesStatus: "ready",
          categoriesError: null,
        });
      })
      .catch((error: unknown) => {
        set({
          categoriesStatus: "error",
          categoriesError:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las categorías.",
        });
      });
  },

  loadMeta: (force = false) => {
    const { metaStatus } = get();
    if (!force && metaStatus !== "idle" && metaStatus !== "error") return;
    set({ metaStatus: "loading" });

    fetchCatalogMeta()
      .then((meta) => {
        set({ meta, metaStatus: "ready" });
      })
      .catch(() => {
        set({ metaStatus: "error" });
      });
  },

  loadHome: (force = false) => {
    const { homeStatus } = get();
    if (!force && homeStatus !== "idle" && homeStatus !== "error") return;
    set({ homeStatus: "loading" });

    const categories = get().categories;
    const catMap = buildCategoryMap(categories);

    Promise.all([
      fetchProductsPage(
        { featured: true, page: 1, pageSize: 8, sort: "destacados" },
        catMap
      ),
      fetchProductsPage({ page: 1, pageSize: 6, sort: "nuevos" }, catMap),
      fetchProductsPage(
        { onSale: true, page: 1, pageSize: 1, sort: "destacados" },
        catMap
      ),
    ])
      .then(([featuredRes, newsRes, promoRes]) => {
        const promo =
          promoRes.items[0] ?? featuredRes.items[0] ?? newsRes.items[0] ?? null;
        const all = [
          ...featuredRes.items,
          ...newsRes.items,
          ...(promo ? [promo] : []),
        ];
        set((state) => ({
          home: {
            featured: featuredRes.items,
            news: newsRes.items,
            promo,
          },
          homeStatus: "ready",
          productsById: mergeProducts(state.productsById, all),
        }));
      })
      .catch(() => {
        set({ homeStatus: "error" });
      });
  },

  registerProducts: (items) => {
    if (items.length === 0) return;
    set((state) => {
      const merged = mergeProducts(state.productsById, items);
      return merged === state.productsById ? state : { productsById: merged };
    });
  },

  ensureProductsByIds: (ids) => {
    const state = get();
    const missing = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].filter(
      (id) =>
        !state.productsById[id] &&
        !state.unresolvedIds[id] &&
        !inFlightIds.has(id)
    );
    if (missing.length === 0) return;

    for (const id of missing) inFlightIds.add(id);
    const catMap = buildCategoryMap(state.categories);

    fetchProductsByIds(missing, catMap)
      .then((found) => {
        const foundSet = new Set(found.map((item) => item.id));
        const notFound = missing.filter((id) => !foundSet.has(id));
        set((curr) => {
          const nextUnresolved = { ...curr.unresolvedIds };
          for (const id of notFound) nextUnresolved[id] = true;
          return {
            productsById: mergeProducts(curr.productsById, found),
            unresolvedIds: nextUnresolved,
          };
        });
      })
      .catch(() => {
        /* Deja reintentar en la siguiente consulta */
      })
      .finally(() => {
        for (const id of missing) inFlightIds.delete(id);
      });
  },

  ensureProductById: (id) => {
    const clean = id.trim();
    if (!clean) return;
    const state = get();
    if (
      state.productsById[clean] ||
      state.unresolvedIds[clean] ||
      inFlightIds.has(clean)
    ) {
      return;
    }

    inFlightIds.add(clean);
    const catMap = buildCategoryMap(state.categories);

    fetchProductById(clean, catMap)
      .then((product) => {
        set((curr) => {
          if (!product) {
            return {
              unresolvedIds: { ...curr.unresolvedIds, [clean]: true },
            };
          }
          return {
            productsById: mergeProducts(curr.productsById, [product]),
          };
        });
      })
      .catch(() => {
        set((curr) => ({
          unresolvedIds: { ...curr.unresolvedIds, [clean]: true },
        }));
      })
      .finally(() => {
        inFlightIds.delete(clean);
      });
  },

  ensureCategoryPreview: (slug) => {
    const clean = slug.trim();
    if (!clean) return;
    const state = get();
    if (
      state.categoryPreviews[clean] !== undefined ||
      inFlightCategoryPreviews.has(clean)
    ) {
      return;
    }

    inFlightCategoryPreviews.add(clean);
    const catMap = buildCategoryMap(state.categories);

    fetchProductsPage({ categories: [clean], page: 1, pageSize: 4 }, catMap)
      .then((res) => {
        const withImage =
          res.items.find((p) => Boolean(p.image?.trim())) ?? res.items[0];
        set((curr) => ({
          categoryPreviews: {
            ...curr.categoryPreviews,
            [clean]: withImage?.image ?? "",
          },
          productsById: withImage
            ? mergeProducts(curr.productsById, [withImage])
            : curr.productsById,
        }));
      })
      .catch(() => {
        /* Ignorar error puntual de miniatura */
      })
      .finally(() => {
        inFlightCategoryPreviews.delete(clean);
      });
  },

  reload: () => {
    set((state) => ({
      categoriesStatus: "idle",
      metaStatus: "idle",
      homeStatus: "idle",
      productsById: {},
      unresolvedIds: {},
      categoryPreviews: {},
      version: state.version + 1,
    }));
    get().loadCategories(true);
  },
}));

/** Categorías activas de la tienda (sin descargar productos) */
export function useCategories(): CategoryView[] {
  const status = useCatalogStore((s) => s.categoriesStatus);
  const load = useCatalogStore((s) => s.loadCategories);

  useEffect(() => {
    if (status === "idle") load();
  }, [status, load]);

  return useCatalogStore((s) => s.categories);
}

export function useCategoriesStatus(): Status {
  const status = useCatalogStore((s) => s.categoriesStatus);
  const load = useCatalogStore((s) => s.loadCategories);

  useEffect(() => {
    if (status === "idle") load();
  }, [status, load]);

  return status;
}

export function useCategoryMap(): CategoryMap {
  const categories = useCategories();
  return useMemo(() => buildCategoryMap(categories), [categories]);
}

export function useCatalogMeta(): ApiCatalogMeta | null {
  const status = useCatalogStore((s) => s.metaStatus);
  const load = useCatalogStore((s) => s.loadMeta);

  useEffect(() => {
    if (status === "idle") load();
  }, [status, load]);

  return useCatalogStore((s) => s.meta);
}

export function useHomeCatalog(): {
  featured: ProductView[];
  news: ProductView[];
  promo: ProductView | null;
  status: Status;
} {
  const status = useCatalogStore((s) => s.homeStatus);
  const load = useCatalogStore((s) => s.loadHome);

  useEffect(() => {
    if (status === "idle") load();
  }, [status, load]);

  const home = useCatalogStore((s) => s.home);
  return { ...home, status };
}

export function useProductsByIds(ids: string[]): {
  productsById: Record<string, ProductView>;
  pending: boolean;
} {
  const ensure = useCatalogStore((s) => s.ensureProductsByIds);
  const productsById = useCatalogStore((s) => s.productsById);
  const unresolvedIds = useCatalogStore((s) => s.unresolvedIds);
  const cleanIds = useMemo(
    () => [...new Set(ids.map((id) => id.trim()).filter(Boolean))],
    [ids]
  );
  const key = cleanIds.join(",");

  useEffect(() => {
    if (!key) return;
    ensure(key.split(","));
  }, [key, ensure]);

  const pending = cleanIds.some(
    (id) => !productsById[id] && !unresolvedIds[id]
  );

  return { productsById, pending };
}

export function useProductById(productId: string): {
  product: ProductView | undefined;
  loading: boolean;
} {
  const ensure = useCatalogStore((s) => s.ensureProductById);
  const productsById = useCatalogStore((s) => s.productsById);
  const unresolvedIds = useCatalogStore((s) => s.unresolvedIds);

  const product =
    productsById[productId] ??
    Object.values(productsById).find((p) => p.slug === productId);

  useEffect(() => {
    if (!product && !unresolvedIds[productId]) {
      ensure(productId);
    }
  }, [productId, product, unresolvedIds, ensure]);

  const loading = !product && !unresolvedIds[productId];
  return { product, loading };
}

export function useCategoryPreviewImage(slug: string, skip: boolean): string {
  const ensure = useCatalogStore((s) => s.ensureCategoryPreview);
  const preview = useCatalogStore((s) => s.categoryPreviews[slug]);

  useEffect(() => {
    if (!skip && preview === undefined) {
      ensure(slug);
    }
  }, [slug, skip, preview, ensure]);

  return preview ?? "";
}

export function useCatalogVersion(): number {
  return useCatalogStore((s) => s.version);
}

/** Vuelve a pedir los datos del catálogo al API tras cambios en admin */
export function reloadCatalog(): void {
  useCatalogStore.getState().reload();
}
