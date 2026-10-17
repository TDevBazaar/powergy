"use client";

/* ── Helpers de catálogo, carrito y filtros ───────────────────── */

import { useMemo } from "react";
import { useCatalog } from "./catalog-store";
import { useNova } from "./store";
import type {
  CartItem,
  CartLine,
  CategoryId,
  FilterState,
  Product,
  SortId,
} from "./types";

export {
  useCatalog,
  useCategories,
  useCatalogError,
  useCatalogStatus,
  reloadCatalog,
} from "./catalog-store";

export function productById(list: Product[], id: string): Product | undefined {
  return list.find((p) => p.id === id);
}

/** Convierte el carrito en líneas con producto resuelto y totales */
export function useCartLines(): CartLine[] {
  const cart = useNova((s) => s.cart);
  const catalog = useCatalog();
  return useMemo(() => {
    return cart
      .map((item) => {
        const product = productById(catalog, item.productId);
        if (!product) return null;
        return { ...item, product, lineTotal: product.price * item.qty };
      })
      .filter((l): l is CartLine => l !== null);
  }, [cart, catalog]);
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

/** Precio máximo disponible en el catálogo (para el deslizador) */
export function priceCeiling(list: Product[]): number {
  const max = list.reduce((acc, p) => Math.max(acc, p.price), 0);
  return Math.max(50, Math.ceil(max / 10) * 10);
}

/** Valor efectivo del filtro de precio: 0 significa "sin límite" */
export function effectiveMaxPrice(filters: FilterState, list: Product[]): number {
  return filters.maxPrice > 0 ? filters.maxPrice : priceCeiling(list);
}

export function activeFilterCount(f: FilterState): number {
  return (
    f.cats.length +
    (f.maxPrice > 0 ? 1 : 0) +
    (f.onlyOffers ? 1 : 0)
  );
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchProducts(list: Product[], q: string): Product[] {
  const term = normalize(q.trim());
  if (!term) return list;
  return list.filter((p) => {
    const haystack = normalize(
      [p.name, p.description, p.categoryName, ...p.tags].join(" ")
    );
    return term.split(/\s+/).every((w) => haystack.includes(w));
  });
}

export function applyFilters(
  list: Product[],
  f: FilterState,
  opts: { lockCategory?: CategoryId } = {}
): Product[] {
  let out = list;
  if (!opts.lockCategory && f.cats.length > 0) {
    out = out.filter((p) => f.cats.includes(p.category));
  }
  if (f.maxPrice > 0) {
    out = out.filter((p) => p.price > 0 && p.price <= f.maxPrice);
  }
  if (f.onlyOffers) {
    out = out.filter((p) => p.onSale);
  }
  switch (f.sort) {
    case "precio-asc":
      out = [...out].sort((a, b) => priceOf(a) - priceOf(b));
      break;
    case "precio-desc":
      out = [...out].sort((a, b) => priceOf(b) - priceOf(a));
      break;
    case "nuevos":
      out = [...out].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
      break;
    default:
      out = [...out].sort(
        (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      );
  }
  return out;
}

/** Los productos sin precio van al final al ordenar por precio */
function priceOf(product: Product): number {
  return product.price > 0 ? product.price : Number.MAX_SAFE_INTEGER;
}
