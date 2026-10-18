"use client";

/* ── Catálogo real: se carga desde el API ───────────────────────
   Categorías y productos se solicitan por separado para que las
   categorías (que son muy ligeras) se muestren de inmediato con sus
   skeletons/templates correspondientes sin retrasar el renderizado. */

import { useEffect } from "react";
import { create } from "zustand";
import {
  fetchStoreCategories,
  fetchStoreProducts,
  type CategoryView,
  type ProductView,
} from "./powergy-api";

export type Status = "idle" | "loading" | "ready" | "error";

interface CatalogState {
  products: ProductView[];
  categories: CategoryView[];
  status: Status;
  categoriesStatus: Status;
  productsStatus: Status;
  error: string | null;
  load: (force?: boolean) => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  categories: [],
  status: "idle",
  categoriesStatus: "idle",
  productsStatus: "idle",
  error: null,

  load: (force = false) => {
    const { status } = get();
    if (!force && status !== "idle" && status !== "error") return;

    set({
      status: "loading",
      categoriesStatus: "loading",
      productsStatus: "loading",
      error: null,
    });

    // 1. Cargar categorías de inmediato
    fetchStoreCategories()
      .then((categories) => {
        set({ categories, categoriesStatus: "ready" });
        const categoriesById = new Map(
          categories.map((c) => [c.apiId, { slug: c.slug, name: c.name }])
        );
        // 2. Cargar productos con el mapa de categorías
        return fetchStoreProducts(categoriesById);
      })
      .then((products) => {
        set({
          products,
          productsStatus: "ready",
          status: "ready",
          error: null,
        });
      })
      .catch((error: unknown) => {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catálogo.";
        set((state) => ({
          status: "error",
          productsStatus: "error",
          categoriesStatus:
            state.categories.length > 0 ? "ready" : "error",
          error: errorMsg,
        }));
      });
  },
}));

/** Pide el catálogo la primera vez que una vista lo necesita */
function useEnsureCatalog(): void {
  const status = useCatalogStore((state) => state.status);
  const load = useCatalogStore((state) => state.load);

  useEffect(() => {
    if (status === "idle") load();
  }, [status, load]);
}

/** Catálogo activo de la tienda */
export function useCatalog(): ProductView[] {
  useEnsureCatalog();
  return useCatalogStore((state) => state.products);
}

/** Categorías activas de la tienda */
export function useCategories(): CategoryView[] {
  useEnsureCatalog();
  return useCatalogStore((state) => state.categories);
}

export function useCatalogStatus(): Status {
  useEnsureCatalog();
  return useCatalogStore((state) => state.status);
}

export function useCategoriesStatus(): Status {
  useEnsureCatalog();
  return useCatalogStore((state) => state.categoriesStatus);
}

export function useProductsStatus(): Status {
  useEnsureCatalog();
  return useCatalogStore((state) => state.productsStatus);
}

export function useCatalogError(): string | null {
  return useCatalogStore((state) => state.error);
}

/** Vuelve a pedir el catálogo al API */
export function reloadCatalog(): void {
  useCatalogStore.getState().load(true);
}
