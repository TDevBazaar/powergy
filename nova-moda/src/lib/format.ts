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

/* ── Envío ──────────────────────────────────────────────────────── */

export const SHIPPING_OPTIONS: {
  id: ShippingMethod;
  label: string;
  detail: string;
}[] = [
  {
    id: "estandar",
    label: "Envío estándar",
    detail:
      "Para hoy mismo, se le enviará una confirmación por WhatsApp con el precio del envío",
  },
];

/** Coste de envío: el precio se confirma por WhatsApp */
export function shippingCostFor(
  _subtotal: number,
  _method: ShippingMethod = "estandar"
): number {
  return 0;
}
