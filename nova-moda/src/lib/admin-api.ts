/* ── Administración de la tienda contra el API ───────────────────
   Reúne las llamadas del panel: catálogo completo (incluye inactivos),
   categorías, solicitudes y métricas. Todo el tráfico pasa por el proxy
   del sitio, que añade la tienda y reenvía el token de Supabase. */

import {
  NOVA_STORE,
  apiGet,
  apiSend,
  type ApiCategory,
  type ApiPage,
  type ApiProduct,
} from "./powergy-api";

export const STORE_QUERY = `store=${encodeURIComponent(NOVA_STORE)}`;

/* ── Contraindicaciones del API ────────────────────────────────── */

export interface AdminOrderLine {
  productId: string;
  productName: string;
  productSlug: string;
  categoryName: string;
  quantity: number;
  originalQuantity: number;
  unitPriceUsd: number | null;
  lineTotalUsd: number | null;
}

export interface AdminRemovedLine extends AdminOrderLine {
  removedAt: string | null;
}

export interface AdminOrderHistory {
  previousStatus: string | null;
  status: string;
  changedByAdminUserId: string | null;
  changedAt: string;
}

export interface AdminOrderListItem {
  id: string;
  reference: string;
  status: "requested" | "closed" | "cancelled";
  store: string;
  estimatedTotalUsd: number | null;
  originalEstimatedTotalUsd: number | null;
  itemCount: number;
  createdAt: string;
  closedAt: string | null;
  closedByAdminUserId: string | null;
  cancellationReason: string | null;
  hasUnpricedItems: boolean;
  items: AdminOrderLine[];
}

export interface AdminOrder {
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
  items: AdminOrderLine[];
  removedItems: AdminRemovedLine[];
  history: AdminOrderHistory[];
}

export interface OrderMetrics {
  from: string;
  to: string;
  requests: number;
  closedRequests: number;
  cancelledRequests: number;
  openRequests: number;
  estimatedValueUsd: number | null;
  originalEstimatedValueUsd: number | null;
  closedEstimatedValueUsd: number | null;
  cancelledEstimatedValueUsd: number | null;
  closedWithoutPriceRequests: number;
  closeRate: number | null;
  closedDuringPeriod: number;
}

export interface ProductPayload {
  id?: string;
  slug: string;
  categoryId: string;
  subcategory: string;
  brand: string;
  model: string;
  name: string;
  priceUsd: number | null;
  specifications: string;
  primaryImage: string;
  onSale: boolean;
  warranty: boolean;
  transport: boolean;
  invoice: boolean;
  topRank: number | null;
  isActive: boolean;
}

export interface CategoryPayload {
  name: string;
  slug: string;
  sortOrder: number;
}

export interface CloseOrderPayload {
  outcome: "closed" | "cancelled";
  items?: { productId: string; quantity: number; unitPriceUsd?: number | null }[];
  cancellationReason?: string | null;
  cancellationNote?: string | null;
}

/* ── Llamadas ─────────────────────────────────────────────────── */

export function fetchAdminProducts(
  token: string,
  term = ""
): Promise<ApiPage<ApiProduct>> {
  const q = term.trim() ? `&q=${encodeURIComponent(term.trim())}` : "";
  return apiGet<ApiPage<ApiProduct>>(
    `products/admin?${STORE_QUERY}&includeInactive=true&page=1&pageSize=100${q}`,
    token
  );
}

export function fetchAdminCategories(token: string): Promise<ApiCategory[]> {
  return apiGet<ApiCategory[]>(`categories/admin?${STORE_QUERY}`, token);
}

export function fetchAdminOrders(token: string): Promise<
  ApiPage<AdminOrderListItem>
> {
  return apiGet<ApiPage<AdminOrderListItem>>(
    `admin/orders?${STORE_QUERY}&page=1&pageSize=100`,
    token
  );
}

export function fetchOrderMetrics(token: string): Promise<OrderMetrics> {
  return apiGet<OrderMetrics>(`admin/orders/metrics?${STORE_QUERY}`, token);
}

export function fetchOrder(token: string, id: string): Promise<AdminOrder> {
  return apiGet<AdminOrder>(`admin/orders/${id}?${STORE_QUERY}`, token);
}

export function createProduct(
  token: string,
  payload: ProductPayload
): Promise<ApiProduct> {
  return apiSend<ApiProduct>("products", { body: payload, token });
}

export function updateProduct(
  token: string,
  id: string,
  payload: ProductPayload
): Promise<ApiProduct> {
  return apiSend<ApiProduct>(`products/${id}?${STORE_QUERY}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deactivateProduct(token: string, id: string): Promise<void> {
  return apiSend<void>(`products/${id}?${STORE_QUERY}`, {
    method: "DELETE",
    token,
  });
}

export function createCategory(
  token: string,
  payload: CategoryPayload
): Promise<ApiCategory> {
  return apiSend<ApiCategory>("categories", { body: payload, token });
}

export function updateCategory(
  token: string,
  id: string,
  payload: CategoryPayload
): Promise<ApiCategory> {
  return apiSend<ApiCategory>(`categories/${id}?${STORE_QUERY}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deactivateCategory(token: string, id: string): Promise<void> {
  return apiSend<void>(`categories/${id}?${STORE_QUERY}`, {
    method: "DELETE",
    token,
  });
}

export function closeOrder(
  token: string,
  id: string,
  payload: CloseOrderPayload
): Promise<AdminOrder> {
  return apiSend<AdminOrder>(`admin/orders/${id}/close?${STORE_QUERY}`, {
    method: "POST",
    body: payload,
    token,
  });
}

/* ── Textos compartidos ───────────────────────────────────────── */

export const CANCELLATION_REASONS: { id: string; label: string }[] = [
  { id: "price", label: "Precio (no le interesó)" },
  { id: "stock", label: "Sin existencias" },
  { id: "no_response", label: "No respondió" },
  { id: "regret", label: "Se arrepintió" },
  { id: "other", label: "Otro motivo" },
];

export const STATUS_LABELS: Record<string, string> = {
  requested: "Solicitada",
  closed: "Vendida",
  cancelled: "Cancelada",
};
