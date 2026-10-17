"use client";

/* ── Catálogo real: se carga desde el API ───────────────────────
   Un único estado compartido evita repetir la descarga en cada vista. */

import { useEffect } from "react";
import { create } from "zustand";
import {
  fetchCatalog,
  type CategoryView,
  type ProductView,
} from "./powergy-api";

type Status = "idle" | "loading" | "ready" | "error";

interface CatalogState {
  products: ProductView[];
  categories: CategoryView[];
  status: Status;
  error: string | null;
  load: (force?: boolean) => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  categories: [],
  status: "idle",
  error: null,

  load: (force = false) => {
    const { status } = get();
    if (!force && status !== "idle" && status !== "error") return;
    set({ status: "loading", error: null });
    fetchCatalog()
      .then(({ products, categories }) =>
        set({ products, categories, status: "ready", error: null })
      )
      .catch((error: unknown) =>
        set({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el catálogo.",
        })
      );
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

export function useCatalogError(): string | null {
  return useCatalogStore((state) => state.error);
}

/** Vuelve a pedir el catálogo al API (por ejemplo tras editar en el panel) */
export function reloadCatalog(): void {
  useCatalogStore.getState().load(true);
}
