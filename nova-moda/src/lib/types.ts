/* ── Tipos compartidos de NOVA MODA ───────────────────────────── */

import type { CategoryView, ProductView } from "./powergy-api";

/** Categoría de la tienda (slug del API, p.ej. "mujer") */
export type CategoryId = string;

/** Producto de la tienda tal como lo devuelve el API */
export type Product = ProductView;

/** Categoría de la tienda */
export type Category = CategoryView;

export type SortId = "destacados" | "precio-asc" | "precio-desc" | "nuevos";

export interface FilterState {
  q: string;
  cats: CategoryId[];
  /** 0 = sin límite de precio */
  maxPrice: number;
  sort: SortId;
  onlyOffers: boolean;
}

/* ── Carrito y pedidos ───────────────────────────────────────── */

export interface CartItem {
  productId: string;
  qty: number;
}

export interface CartLine extends CartItem {
  product: Product;
  lineTotal: number;
}

export type ShippingMethod = "estandar" | "express" | "recogida";

export interface OrderCustomer {
  name: string;
  email?: string;
  phone?: string;
  address: string;
  city?: string;
  zip?: string;
  notes?: string;
  shipping: ShippingMethod;
}

export interface OrderItem {
  productId: string;
  qty: number;
}

export interface Order {
  /** Referencia que devuelve el API */
  id: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  customer: OrderCustomer;
  status: string;
  createdAt: string;
}
