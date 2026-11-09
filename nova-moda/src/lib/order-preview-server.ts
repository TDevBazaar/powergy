import {
  NOVA_STORE,
  type ApiProduct,
} from "@/lib/powergy-api";
import {
  decodeOrderPreviewToken,
  type OrderPreviewData,
  type OrderPreviewItemInput,
  type OrderPreviewLine,
} from "@/lib/order-preview";

const DEFAULT_POWERGY_API = "https://powergy.somee.com";
const MAX_OG_IMAGE_BYTES = 5 * 1024 * 1024;

export function getPowergyApiBase(): string {
  return (
    process.env.POWERGY_API_URL?.trim() || DEFAULT_POWERGY_API
  ).replace(/\/+$/, "");
}

function firstHeaderValue(raw: string | null): string {
  return raw?.split(",")[0]?.trim() ?? "";
}

/** Construye el origen absoluto (https://...) a partir de las cabeceras de la petición */
export function getRequestOrigin(hdrs: Headers): string {
  const host =
    firstHeaderValue(hdrs.get("x-forwarded-host")) ||
    firstHeaderValue(hdrs.get("host")) ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";

  if (!host) return "";

  const cleanHost = host.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const forwardedProto = firstHeaderValue(hdrs.get("x-forwarded-proto"));
  const isLocal =
    cleanHost.startsWith("localhost") ||
    cleanHost.startsWith("127.0.0.1") ||
    cleanHost.startsWith("[::1]");
  const proto = forwardedProto || (isLocal ? "http" : "https");

  return `${proto}://${cleanHost}`;
}

function entryHasSnapshot(entry: OrderPreviewItemInput): boolean {
  return Boolean(entry.name?.trim());
}

/** Consulta en lote al API de POWERGY y fusiona con el snapshot embebido en el enlace */
export async function fetchPreviewOrderData(
  reference: string,
  rawToken?: string | null
): Promise<OrderPreviewData> {
  const cleanRef = reference.trim() || "Pedido";
  const entries = decodeOrderPreviewToken(rawToken);
  if (entries.length === 0) {
    return {
      reference: cleanRef,
      lines: [],
      totalQty: 0,
      subtotal: 0,
      hasUnpriced: false,
    };
  }

  const allHaveSnapshot = entries.every(entryHasSnapshot);
  const productMap = new Map<string, ApiProduct>();
  const apiBase = getPowergyApiBase();
  const ids = entries.map((e) => e.productId);

  // Si todos los artículos ya traen foto/nombre en el enlace, damos presupuesto rápido al API (1.6s)
  // para no retrasar WhatsApp ni mostrar fallbacks vacíos cuando Somee tarda en despertar.
  const attemptTimeoutMs = allHaveSnapshot ? 1600 : 4000;
  const maxAttempts = allHaveSnapshot ? 1 : 2;

  try {
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const params = new URLSearchParams({
        store: NOVA_STORE,
        ids: chunk.join(","),
      });
      const url = `${apiBase}/api/products/batch?${params.toString()}`;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const res = await fetch(url, {
            headers: { Accept: "application/json", Connection: "close" },
            next: { revalidate: 120 },
            signal: AbortSignal.timeout(attemptTimeoutMs),
          });
          if (!res.ok) continue;
          const items = (await res.json()) as ApiProduct[];
          for (const item of items) {
            if (item?.id) productMap.set(item.id, item);
          }
          break;
        } catch {
          /* Respaldo automático con el snapshot embebido en el enlace */
        }
      }
    }
  } catch {
    /* Si falla el API, usamos snapshot embebido o respaldo seguro */
  }

  const lines: OrderPreviewLine[] = entries.map((entry) => {
    const product = productMap.get(entry.productId);
    const hasSnapshot = entryHasSnapshot(entry);

    if (product) {
      const unitPrice =
        typeof product.price_usd === "number" && product.price_usd > 0
          ? product.price_usd
          : 0;
      return {
        productId: product.id,
        slug: product.slug || product.id,
        name: product.name?.trim() || entry.name || `Artículo ${product.id}`,
        categoryName: product.category?.trim() || entry.categoryName || "NOVA MODA",
        brand: product.brand?.trim() || "",
        model: product.model?.trim() || "",
        image: product.primary_image?.trim() || entry.image || "",
        qty: entry.qty,
        unitPrice,
        lineTotal: unitPrice * entry.qty,
        available: true,
        hasSnapshot,
      };
    }

    if (hasSnapshot) {
      const unitPrice =
        typeof entry.price === "number" && entry.price > 0 ? entry.price : 0;
      return {
        productId: entry.productId,
        slug: entry.slug || entry.productId,
        name: entry.name?.trim() || `Artículo ${entry.productId}`,
        categoryName: entry.categoryName?.trim() || "NOVA MODA",
        brand: "",
        model: "",
        image: entry.image?.trim() || "",
        qty: entry.qty,
        unitPrice,
        lineTotal: unitPrice * entry.qty,
        available: true,
        hasSnapshot: true,
      };
    }

    return {
      productId: entry.productId,
      slug: entry.productId,
      name: `Artículo ${entry.productId}`,
      categoryName: "Catálogo",
      brand: "",
      model: "",
      image: "",
      qty: entry.qty,
      unitPrice: 0,
      lineTotal: 0,
      available: false,
      hasSnapshot: false,
    };
  });

  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const hasUnpriced = lines.some((l) => l.unitPrice <= 0);

  return {
    reference: cleanRef,
    lines,
    totalQty,
    subtotal,
    hasUnpriced,
  };
}

function detectSupportedOgImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: GIF8
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }

  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

function isAllowedRemoteImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "::1" ||
      host === "[::1]" ||
      host.startsWith("127.") ||
      host.startsWith("169.254.") ||
      host === "0.0.0.0"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Pre-descarga una imagen remota y la valida por magic bytes para ImageResponse (PNG/JPEG/WebP/GIF) */
export async function fetchSafeOgDataUri(
  rawUrl?: string | null
): Promise<string | null> {
  const clean = rawUrl?.trim();
  if (!clean || !isAllowedRemoteImageUrl(clean)) return null;

  try {
    const response = await fetch(clean, {
      headers: {
        Accept: "image/jpeg,image/png,image/webp,image/gif,*/*;q=0.5",
      },
      signal: AbortSignal.timeout(3500),
      cache: "force-cache",
    });
    if (!response.ok) return null;

    const declaredLen = Number(response.headers.get("content-length") || "0");
    if (declaredLen > MAX_OG_IMAGE_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_OG_IMAGE_BYTES) return null;

    const mime = detectSupportedOgImageMime(buffer);
    if (!mime) return null;

    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
