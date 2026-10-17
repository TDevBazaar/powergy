/* ── Formato de precios, fechas y costes de envío (demo) ─────── */
import type { ShippingMethod } from "./types";

/** Precio en formato "$45.99" */
export function formatPrice(n: number): string {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

/** Precio o "Consultar" cuando todavía no está definido (0) */
export function formatPriceLabel(n: number): string {
  return n > 0 ? formatPrice(n) : "Consultar";
}

/** Fecha corta en español, p.ej. "10 oct 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ── Envío (demo) ────────────────────────────────────────────── */

/** A partir de esta cantidad el envío estándar es gratis */
export const FREE_SHIPPING_FROM = 75;
export const STANDARD_SHIPPING_COST = 4.99;
export const EXPRESS_SHIPPING_COST = 9.99;

export const SHIPPING_OPTIONS: {
  id: ShippingMethod;
  label: string;
  detail: string;
}[] = [
  {
    id: "estandar",
    label: "Envío estándar",
    detail: "3 a 5 días laborables · Gratis a partir de $75",
  },
  {
    id: "express",
    label: "Envío express",
    detail: "24 a 48 h en la puerta de tu casa",
  },
  {
    id: "recogida",
    label: "Recogida en tienda",
    detail: "Retira tu pedido gratis cuando te venga bien",
  },
];

/** Coste de envío para un subtotal y método concreto */
export function shippingCostFor(
  subtotal: number,
  method: ShippingMethod
): number {
  switch (method) {
    case "estandar":
      return subtotal >= FREE_SHIPPING_FROM ? 0 : STANDARD_SHIPPING_COST;
    case "express":
      return EXPRESS_SHIPPING_COST;
    case "recogida":
      return 0;
    default:
      return STANDARD_SHIPPING_COST;
  }
}
