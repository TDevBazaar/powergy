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
  referralCode?: string | null;
  referredByAdminName?: string | null;
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
  referralCode?: string | null;
  referredByAdminName?: string | null;
}

export interface AdminSellerProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  referralCode: string | null;
  whatsAppPhone: string | null;
}

export interface UpdateAdminSellerProfilePayload {
  displayName: string | null;
  referralCode: string | null;
  whatsAppPhone: string | null;
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

export interface AdminProductsQuery {
  term?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface AdminOrdersQuery {
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface OrderMetricsQuery {
  from?: string;
  to?: string;
  signal?: AbortSignal;
}

export function fetchAdminProducts(
  token: string,
  options: string | AdminProductsQuery = {}
): Promise<ApiPage<ApiProduct>> {
  const query = typeof options === "string" ? { term: options } : options;
  const params = new URLSearchParams({
    store: NOVA_STORE,
    includeInactive: "true",
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 20),
  });
  const cleanTerm = query.term?.trim();
  if (cleanTerm) {
    params.set("q", cleanTerm);
  }
  return apiGet<ApiPage<ApiProduct>>(
    `products/admin?${params.toString()}`,
    token,
    query.signal
  );
}

export function fetchAdminCategories(token: string): Promise<ApiCategory[]> {
  return apiGet<ApiCategory[]>(`categories/admin?${STORE_QUERY}`, token);
}

export function fetchAdminOrders(
  token: string,
  options: AdminOrdersQuery = {}
): Promise<ApiPage<AdminOrderListItem>> {
  const params = new URLSearchParams({
    store: NOVA_STORE,
    page: String(options.page ?? 1),
    pageSize: String(options.pageSize ?? 20),
  });
  if (options.status?.trim()) params.set("status", options.status.trim());
  if (options.from?.trim()) params.set("from", options.from.trim());
  if (options.to?.trim()) params.set("to", options.to.trim());
  return apiGet<ApiPage<AdminOrderListItem>>(
    `admin/orders?${params.toString()}`,
    token,
    options.signal
  );
}

export function fetchOrderMetrics(
  token: string,
  options: OrderMetricsQuery = {}
): Promise<OrderMetrics> {
  const params = new URLSearchParams({ store: NOVA_STORE });
  if (options.from?.trim()) params.set("from", options.from.trim());
  if (options.to?.trim()) params.set("to", options.to.trim());
  return apiGet<OrderMetrics>(
    `admin/orders/metrics?${params.toString()}`,
    token,
    options.signal
  );
}

export function fetchOrder(token: string, id: string): Promise<AdminOrder> {
  return apiGet<AdminOrder>(`admin/orders/${encodeURIComponent(id)}?${STORE_QUERY}`, token);
}

export function fetchAdminSellerProfile(
  token: string,
  signal?: AbortSignal
): Promise<AdminSellerProfile> {
  return apiGet<AdminSellerProfile>("admin/profile", token, signal);
}

export function updateAdminSellerProfile(
  token: string,
  payload: UpdateAdminSellerProfilePayload
): Promise<AdminSellerProfile> {
  return apiSend<AdminSellerProfile>("admin/profile", {
    method: "PUT",
    body: payload,
    token,
  });
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
