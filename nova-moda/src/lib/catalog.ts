"use client";

/* ── Helpers de catálogo, carrito y filtros ───────────────────── */

import { useMemo } from "react";
import { useProductsByIds } from "./catalog-store";
import { useNova } from "./store";
import type {
  CartItem,
  CartLine,
  FilterState,
  Product,
  SortId,
} from "./types";

export {
  useCategories,
  useCategoriesStatus,
  useCategoryMap,
  useCatalogMeta,
  useHomeCatalog,
  useProductsByIds,
  useProductById,
  useCategoryPreviewImage,
  useCatalogVersion,
  useCatalogStore,
  reloadCatalog,
} from "./catalog-store";

export function productById(list: Product[], id: string): Product | undefined {
  return list.find((p) => p.id === id);
}

/** Convierte el carrito en líneas con estado de resolución del catálogo */
export function useCartLinesState(): { lines: CartLine[]; pending: boolean } {
  const cart = useNova((s) => s.cart);
  const ids = useMemo(() => cart.map((item) => item.productId), [cart]);
  const { productsById, pending } = useProductsByIds(ids);

  const lines = useMemo(() => {
    return cart
      .map((item) => {
        const product = productsById[item.productId];
        if (!product) return null;
        return { ...item, product, lineTotal: product.price * item.qty };
      })
      .filter((l): l is CartLine => l !== null);
  }, [cart, productsById]);

  return { lines, pending };
}

/** Convierte el carrito en líneas con producto resuelto y totales */
export function useCartLines(): CartLine[] {
  return useCartLinesState().lines;
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((acc, l) => acc + l.lineTotal, 0);
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((acc, c) => acc + c.qty, 0);
}

/** ¿El producto todavía no tiene precio? (0 = se confirma por WhatsApp) */
export function isUnpriced(product: Product): boolean {
  return !(product.price > 0);
}

export function hasUnpricedLines(lines: CartLine[]): boolean {
  return lines.some((line) => !(line.product.price > 0));
}

/* ── Filtros ──────────────────────────────────────────────────── */

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "destacados", label: "Destacados" },
  { id: "precio-asc", label: "Precio: menor a mayor" },
  { id: "precio-desc", label: "Precio: mayor a menor" },
  { id: "nuevos", label: "Novedades" },
];

export const DEFAULT_FILTERS: FilterState = {
  q: "",
  cats: [],
  maxPrice: 0,
  sort: "destacados",
  onlyOffers: false,
};

/** Precio máximo redondeado para el deslizador */
export function priceCeilingFromMax(maxPriceUsd: number | null | undefined): number {
  const max = maxPriceUsd && maxPriceUsd > 0 ? maxPriceUsd : 0;
  return Math.max(50, Math.ceil(max / 10) * 10);
}

/** Precio máximo disponible en una lista de productos (respaldo) */
export function priceCeiling(list: Product[]): number {
  const max = list.reduce((acc, p) => Math.max(acc, p.price), 0);
  return Math.max(50, Math.ceil(max / 10) * 10);
}

/** Valor efectivo del filtro de precio: 0 significa "sin límite" */
export function effectiveMaxPrice(filters: FilterState, ceiling: number): number {
  return filters.maxPrice > 0 ? filters.maxPrice : ceiling;
}

export function activeFilterCount(f: FilterState): number {
  return (
    f.cats.length +
    (f.maxPrice > 0 ? 1 : 0) +
    (f.onlyOffers ? 1 : 0)
  );
}
