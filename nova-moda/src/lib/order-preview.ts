import { STORAGE_BUCKET } from "@/lib/supabase";

export interface OrderPreviewItemInput {
  productId: string;
  qty: number;
  name?: string;
  price?: number;
  image?: string;
  categoryName?: string;
  slug?: string;
}

export interface OrderPreviewLine {
  productId: string;
  slug: string;
  name: string;
  categoryName: string;
  brand: string;
  model: string;
  image: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  hasSnapshot: boolean;
}

export interface OrderPreviewData {
  reference: string;
  lines: OrderPreviewLine[];
  totalQty: number;
  subtotal: number;
  hasUnpriced: boolean;
}

const MAX_PREVIEW_ITEMS = 30;
const MAX_QTY_PER_ITEM = 999;
const MAX_INLINE_SNAPSHOT_ITEMS = 12;
const V2_PREFIX = "v2\n";
const SB_PREFIX = "sb:";

function getSupabasePublicPrefix(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/`;
}

function compactImageUrl(raw?: string): string {
  const clean = raw?.trim() || "";
  if (!clean) return "";
  const prefix = getSupabasePublicPrefix();
  if (prefix && clean.startsWith(prefix)) {
    return `${SB_PREFIX}${clean.slice(prefix.length)}`;
  }
  return clean;
}

function expandImageUrl(compact?: string): string {
  const clean = compact?.trim() || "";
  if (!clean) return "";
  if (clean.startsWith(SB_PREFIX)) {
    const prefix = getSupabasePublicPrefix();
    return prefix ? `${prefix}${clean.slice(SB_PREFIX.length)}` : "";
  }
  return clean;
}

function cleanField(value?: string, maxLen = 120): string {
  return (value || "")
    .replace(/[\t\r\n]+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(token: string): Uint8Array {
  const normalized = token.trim().replace(/-/g, "+").replace(/_/g, "/");
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return new Uint8Array(0);
  }
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeEntries(
  items: ReadonlyArray<OrderPreviewItemInput>
): OrderPreviewItemInput[] {
  const merged = new Map<string, OrderPreviewItemInput>();
  for (const item of items) {
    const productId = item.productId?.trim();
    if (!productId) continue;
    const qty = Math.min(
      MAX_QTY_PER_ITEM,
      Math.max(1, Math.round(Number(item.qty) || 1))
    );
    const existing = merged.get(productId);
    if (!existing && merged.size >= MAX_PREVIEW_ITEMS) continue;

    if (existing) {
      merged.set(productId, {
        ...existing,
        qty: Math.min(MAX_QTY_PER_ITEM, existing.qty + qty),
      });
    } else {
      merged.set(productId, {
        productId,
        qty,
        name: item.name,
        price: item.price,
        image: item.image,
        categoryName: item.categoryName,
        slug: item.slug,
      });
    }
  }
  return Array.from(merged.values());
}

/** Codifica IDs, cantidades y snapshot compacto (nombre/precio/foto) en token URL-safe */
export function encodeOrderPreviewToken(
  items: ReadonlyArray<OrderPreviewItemInput>
): string {
  const entries = normalizeEntries(items);
  if (entries.length === 0) return "";

  const hasSnapshots = entries.some(
    (e) => Boolean(e.name?.trim()) || Boolean(e.image?.trim())
  );

  if (!hasSnapshots) {
    const rawV1 = entries
      .map(({ productId, qty }) => `${encodeURIComponent(productId)}:${qty}`)
      .join(",");
    return bytesToBase64Url(new TextEncoder().encode(rawV1));
  }

  const lines = entries.map((entry, idx) => {
    const includeDetails = idx < MAX_INLINE_SNAPSHOT_ITEMS;
    if (!includeDetails) {
      return `${cleanField(entry.productId, 80)}\t${entry.qty}`;
    }
    const priceNum =
      typeof entry.price === "number" && Number.isFinite(entry.price) && entry.price > 0
        ? Math.round(entry.price * 100) / 100
        : 0;
    return [
      cleanField(entry.productId, 80),
      String(entry.qty),
      cleanField(entry.name, 90),
      priceNum > 0 ? String(priceNum) : "",
      compactImageUrl(entry.image),
      cleanField(entry.categoryName, 40),
    ].join("\t");
  });

  const payload = `${V2_PREFIX}${lines.join("\n")}`;
  return bytesToBase64Url(new TextEncoder().encode(payload));
}

/** Decodifica de forma segura tokens v2 (con snapshot) o v1 (solo IDs) */
export function decodeOrderPreviewToken(
  token?: string | null
): OrderPreviewItemInput[] {
  const clean = token?.trim();
  if (!clean) return [];

  try {
    const bytes = base64UrlToBytes(clean);
    if (bytes.length === 0) return [];
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    if (text.startsWith(V2_PREFIX)) {
      const body = text.slice(V2_PREFIX.length);
      const rawEntries: OrderPreviewItemInput[] = [];
      for (const row of body.split("\n")) {
        if (!row) continue;
        const [productIdRaw, qtyRaw, nameRaw, priceRaw, imgRaw, catRaw] =
          row.split("\t");
        const productId = (productIdRaw || "").trim();
        const qty = Math.round(Number(qtyRaw));
        if (!productId || !Number.isFinite(qty) || qty < 1) continue;
        const parsedPrice = priceRaw ? Number(priceRaw) : 0;
        rawEntries.push({
          productId,
          qty,
          name: nameRaw?.trim() || undefined,
          price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0,
          image: expandImageUrl(imgRaw),
          categoryName: catRaw?.trim() || undefined,
        });
      }
      return normalizeEntries(rawEntries);
    }

    const rawEntries: OrderPreviewItemInput[] = [];
    for (const part of text.split(",")) {
      if (!part) continue;
      const sep = part.lastIndexOf(":");
      const encodedId = sep > 0 ? part.slice(0, sep) : part;
      const qtyStr = sep > 0 ? part.slice(sep + 1) : "1";
      const productId = decodeURIComponent(encodedId).trim();
      const qty = Math.round(Number(qtyStr));
      if (!productId || !Number.isFinite(qty) || qty < 1) continue;
      rawEntries.push({ productId, qty });
    }

    return normalizeEntries(rawEntries);
  } catch {
    return [];
  }
}

/** Ruta pública de vista previa visual del pedido (/p/[ref]?d=...) */
export function buildOrderPreviewPath(
  reference: string,
  items: ReadonlyArray<OrderPreviewItemInput>
): string {
  const basePath = `/p/${encodeURIComponent(reference.trim() || "pedido")}`;
  const token = encodeOrderPreviewToken(items);
  return token ? `${basePath}?d=${token}` : basePath;
}
