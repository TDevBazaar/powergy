import type { Metadata } from "next";
import { headers } from "next/headers";
import { OrderPreviewClient } from "@/components/order/OrderPreviewClient";
import { formatPrice } from "@/lib/format";
import {
  fetchPreviewOrderData,
  getRequestOrigin,
} from "@/lib/order-preview-server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ d?: string | string[] }>;
}

function safeDecodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { ref } = await params;
  const resolvedSearch = await searchParams;
  const rawD =
    typeof resolvedSearch.d === "string"
      ? resolvedSearch.d
      : Array.isArray(resolvedSearch.d)
        ? resolvedSearch.d[0] ?? ""
        : "";

  const cleanRef = safeDecodeParam(ref);
  const hdrs = await headers();
  const origin = getRequestOrigin(hdrs);

  const order = await fetchPreviewOrderData(cleanRef, rawD);
  const title = `Pedido #${order.reference} · NOVA MODA`;

  const description =
    order.lines.length > 0
      ? `${order.totalQty} ${order.totalQty === 1 ? "artículo" : "artículos"}${
          order.subtotal > 0 ? ` · Total ${formatPrice(order.subtotal)}` : ""
        } — ${order.lines
          .slice(0, 3)
          .map((l) => `${l.qty}× ${l.name}`)
          .join(", ")}${order.lines.length > 3 ? ` (+${order.lines.length - 3} más)` : ""}`
      : "Resumen visual del pedido en NOVA MODA. Toca para ver las fotos y el detalle.";

  const ogImagePath = `/api/order-preview/${encodeURIComponent(order.reference)}${
    rawD ? `?d=${encodeURIComponent(rawD)}` : ""
  }`;
  const ogImageUrl = origin ? `${origin}${ogImagePath}` : ogImagePath;

  const pagePath = `/p/${encodeURIComponent(order.reference)}${
    rawD ? `?d=${encodeURIComponent(rawD)}` : ""
  }`;
  const canonicalUrl = origin ? `${origin}${pagePath}` : pagePath;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "NOVA MODA",
      title,
      description,
      url: canonicalUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: `Fotos del pedido #${order.reference} en NOVA MODA`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OrderPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { ref } = await params;
  const resolvedSearch = await searchParams;
  const rawD =
    typeof resolvedSearch.d === "string"
      ? resolvedSearch.d
      : Array.isArray(resolvedSearch.d)
        ? resolvedSearch.d[0] ?? ""
        : "";

  const cleanRef = safeDecodeParam(ref);
  const order = await fetchPreviewOrderData(cleanRef, rawD);

  return <OrderPreviewClient order={order} />;
}
