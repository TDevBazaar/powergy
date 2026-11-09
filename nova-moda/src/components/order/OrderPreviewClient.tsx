"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  ExternalLink,
  Loader2,
  PackageOpen,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ImagePreviewModal,
  ZoomableThumb,
  type PreviewImageData,
} from "@/components/admin/ImagePreviewModal";
import { formatPrice, formatPriceLabel } from "@/lib/format";
import type { OrderPreviewData } from "@/lib/order-preview";
import { fetchProductsByIds } from "@/lib/powergy-api";

interface OrderPreviewClientProps {
  order: OrderPreviewData;
}

export function OrderPreviewClient({ order }: OrderPreviewClientProps) {
  const [data, setData] = useState<OrderPreviewData>(order);
  const [retrying, setRetrying] = useState(false);
  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(
    null
  );

  const hasMissing = data.lines.some((line) => !line.available);
  const adminHref = `/admin?order=${encodeURIComponent(data.reference)}`;

  const loadProductsByIds = async (
    missingIds: string[],
    signal?: AbortSignal
  ) => {
    if (missingIds.length === 0) return;

    setRetrying(true);
    try {
      const products = await fetchProductsByIds(missingIds, new Map(), signal);
      const byId = new Map(products.map((p) => [p.id, p]));
      setData((prev) => {
        const nextLines = prev.lines.map((line) => {
          const found = byId.get(line.productId);
          if (!found) return line;
          const unitPrice = found.price > 0 ? found.price : 0;
          return {
            productId: found.id,
            slug: found.slug || found.id,
            name: found.name,
            categoryName: found.categoryName || "NOVA MODA",
            brand: found.brand || "",
            model: found.model || "",
            image: found.image || found.images[0] || "",
            qty: line.qty,
            unitPrice,
            lineTotal: unitPrice * line.qty,
            available: true,
            hasSnapshot: true,
          };
        });
        return {
          ...prev,
          lines: nextLines,
          totalQty: nextLines.reduce((sum, l) => sum + l.qty, 0),
          subtotal: nextLines.reduce((sum, l) => sum + l.lineTotal, 0),
          hasUnpriced: nextLines.some((l) => l.unitPrice <= 0),
        };
      });
    } catch {
      /* El usuario puede reintentar manualmente con el botón superior */
    } finally {
      if (!signal?.aborted) setRetrying(false);
    }
  };

  useEffect(() => {
    const missingIds = order.lines
      .filter((l) => !l.available)
      .map((l) => l.productId);
    if (missingIds.length === 0) return;
    const controller = new AbortController();
    void loadProductsByIds(missingIds, controller.signal);
    return () => controller.abort();
  }, [order.lines]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      {/* Barra superior minimalista coherente con NOVA MODA */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-2.5 px-4 sm:px-6">
          <a
            href="/"
            className="flex min-w-0 items-center gap-2 transition hover:opacity-85 sm:gap-2.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
              N
            </span>
            <span className="truncate text-sm font-semibold tracking-[0.18em] sm:tracking-[0.26em]">
              NOVA MODA
            </span>
          </a>

          <a
            href="/catalogo"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-card transition hover:bg-secondary sm:px-3.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Ir a la tienda</span>
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        {/* Cabecera del pedido */}
        <section className="rounded-[1.6rem] bg-card p-5 shadow-card sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-camel-deep">
                VISTA RÁPIDA DE PEDIDO
              </p>
              <h1 className="mt-1.5 break-all font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                #{data.reference}
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Toca cualquier foto para ver el producto en tamaño grande.
              </p>
            </div>

            {data.lines.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-foreground">
                  <ShoppingBag className="h-3.5 w-3.5 text-camel-deep" />
                  {data.totalQty}{" "}
                  {data.totalQty === 1 ? "artículo" : "artículos"}
                </span>
                <span className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-background">
                  Total{" "}
                  {data.subtotal > 0
                    ? formatPrice(data.subtotal)
                    : "por confirmar"}
                </span>
              </div>
            )}
          </div>

          {hasMissing && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary/75 px-3.5 py-2.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                {retrying && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-camel-deep" />
                )}
                {retrying
                  ? "Cargando fotos y precios del catálogo…"
                  : "Algunas fotos tardaron en responder desde el servidor."}
              </span>
              {!retrying && (
                <button
                  type="button"
                  onClick={() =>
                    void loadProductsByIds(
                      data.lines
                        .filter((line) => !line.available)
                        .map((line) => line.productId)
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-foreground shadow-card transition hover:bg-background"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reintentar
                </button>
              )}
            </div>
          )}
        </section>

        {data.lines.length === 0 ? (
          <section className="mt-6 rounded-[1.6rem] bg-card px-6 py-14 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-camel-deep">
              <PackageOpen className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              No pudimos cargar los artículos de este enlace
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              El enlace está incompleto o los productos ya no están disponibles.
              Puedes abrir el pedido directamente en el panel de administración.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Button asChild className="h-11 rounded-full px-6 text-sm font-semibold">
                <a href={adminHref}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Abrir en Admin
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-input bg-card px-6 text-sm font-medium"
              >
                <a href="/catalogo">Explorar catálogo</a>
              </Button>
            </div>
          </section>
        ) : (
          <>
            {/* Lista visual de artículos */}
            <ul className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              {data.lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex w-full min-w-0 items-center gap-3.5 overflow-hidden rounded-[1.4rem] bg-card p-3.5 shadow-card sm:p-4"
                >
                  <div className="relative shrink-0">
                    <ZoomableThumb
                      src={line.image}
                      alt={line.name}
                      onPreview={setPreviewImage}
                      priority
                      className="h-28 w-24 rounded-xl sm:h-32 sm:w-28"
                    />
                    <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-bold text-background shadow-card">
                      ×{line.qty}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-0.5">
                    <div className="min-w-0">
                      <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.14em] text-camel-deep">
                        {line.categoryName}
                      </p>
                      <h2 className="mt-1 line-clamp-2 [overflow-wrap:anywhere] text-sm font-semibold leading-snug sm:text-[15px]">
                        {line.name}
                      </h2>
                      {(line.brand || line.model) && (
                        <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                          {[line.brand, line.model].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-bold leading-none text-foreground">
                          {formatPriceLabel(line.lineTotal)}
                        </p>
                        {line.qty > 1 && line.unitPrice > 0 && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatPrice(line.unitPrice)} c/u
                          </p>
                        )}
                      </div>

                      {line.available && (
                        <a
                          href={`/producto/${encodeURIComponent(line.slug)}`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent"
                        >
                          <span>Ficha</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Resumen y accesos */}
            <section className="mt-6 rounded-[1.5rem] bg-card p-5 shadow-card sm:p-6">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatPrice(data.subtotal)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="text-xs font-medium text-camel-deep">
                    Por confirmar por WhatsApp
                  </span>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-baseline justify-between gap-3 text-base">
                  <span className="font-semibold">Total productos</span>
                  <span className="font-bold">
                    {formatPrice(data.subtotal)}
                  </span>
                </div>
              </div>

              {data.hasUnpriced && (
                <p className="mt-3 rounded-2xl bg-secondary/70 p-3 text-[12px] leading-relaxed text-muted-foreground">
                  Incluye artículos sin precio publicado (se confirman por
                  WhatsApp).
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <Button
                  asChild
                  className="h-11 flex-1 rounded-full px-6 text-sm font-semibold"
                >
                  <a href={adminHref}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Abrir pedido en Admin
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-full border-input bg-card px-6 text-sm font-medium"
                >
                  <a href="/catalogo">Ir al catálogo</a>
                </Button>
              </div>
            </section>
          </>
        )}
      </main>

      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
