"use client";

import { ShoppingBag, Trash2, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LazyImage } from "@/components/shop/LazyImage";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { EmptyState } from "@/components/shop/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  cartSubtotal,
  hasUnpricedLines,
  useCartLinesState,
} from "@/lib/catalog";
import {
  formatPrice,
  formatPriceLabel,
} from "@/lib/format";
import { href } from "@/lib/router";
import { useNova } from "@/lib/store";

export function CartView() {
  const { lines, pending } = useCartLinesState();
  const setQty = useNova((s) => s.setQty);
  const removeItem = useNova((s) => s.removeItem);
  const clearCart = useNova((s) => s.clearCart);

  const subtotal = cartSubtotal(lines);
  const sinPrecio = hasUnpricedLines(lines);

  if (pending && lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 animate-pulse">
        <div className="mb-6 space-y-2 sm:mb-7">
          <div className="h-3 w-24 rounded-md bg-secondary" />
          <div className="h-9 w-40 rounded-md bg-secondary" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div className="min-w-0 space-y-3.5 sm:space-y-4">
            {[0, 1].map((idx) => (
              <div key={idx} className="h-32 rounded-[1.5rem] bg-secondary/70 shadow-card sm:h-36" />
            ))}
          </div>
          <div className="h-80 min-w-0 rounded-[1.5rem] bg-secondary/70 shadow-card" />
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <EmptyState
          icon={ShoppingBag}
          title="Tu carrito está vacío"
          description="Añade prendas y accesorios desde el catálogo para preparar tu pedido."
          ctaLabel="Descubrir productos"
          ctaHref="/catalogo"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
            TU COMPRA
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Carrito
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {lines.length} {lines.length === 1 ? "línea" : "líneas"} ·{" "}
            {lines.reduce((a, l) => a + l.qty, 0)} artículos
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearCart();
            toast.info("Carrito vaciado");
          }}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-muted-foreground transition hover:bg-secondary hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Vaciar carrito
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        {/* Líneas */}
        <ul className="min-w-0 space-y-3.5 sm:space-y-4">
          {lines.map((line) => (
            <li
              key={`${line.productId}`}
              className="flex min-w-0 gap-3 rounded-[1.5rem] bg-card p-3 shadow-card sm:gap-4 sm:p-4"
            >
              <a
                href={href(`/producto/${line.productId}`)}
                className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-secondary sm:h-32 sm:w-28"
              >
                <LazyImage
                  src={line.product.image}
                  alt={line.product.name}
                  fallbackIconSize="sm"
                  wrapperClassName="h-full w-full"
                />
              </a>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={href(`/producto/${line.productId}`)}
                      className="line-clamp-2 break-words text-[14px] font-semibold leading-snug hover:underline sm:text-[15px]"
                    >
                      {line.product.name}
                    </a>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {line.product.categoryName}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar ${line.product.name}`}
                    onClick={() => {
                      removeItem(line.productId);
                      toast.info("Producto eliminado");
                    }}
                    className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-destructive sm:mr-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex min-w-0 flex-wrap items-end justify-between gap-1.5 pt-2.5 sm:gap-3 sm:pt-3">
                  <QuantityStepper
                    size="sm"
                    value={line.qty}
                    min={1}
                    max={99}
                    onChange={(v) => setQty(line.productId, v)}
                    className="shrink-0"
                  />
                  <div className="ml-auto min-w-0 text-right">
                    <div className="flex flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5">
                      {line.product.onSale &&
                        line.product.discountPercent &&
                        line.product.discountPercent > 0 &&
                        line.product.price > 0 &&
                        line.product.originalPrice > line.product.price && (
                          <>
                            <span className="rounded-full bg-[#B3402E]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#B3402E] tabular-nums">
                              -{line.product.discountPercent}%
                            </span>
                            <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                              {formatPrice(line.product.originalPrice * line.qty)}
                            </span>
                          </>
                        )}
                      <p
                        className={
                          line.product.onSale &&
                          line.product.discountPercent &&
                          line.product.discountPercent > 0 &&
                          line.product.price > 0 &&
                          line.product.originalPrice > line.product.price
                            ? "text-[14px] font-bold text-[#B3402E] tabular-nums sm:text-[15px]"
                            : "text-[14px] font-bold tabular-nums sm:text-[15px]"
                        }
                      >
                        {formatPriceLabel(line.lineTotal)}
                      </p>
                    </div>
                    {line.qty > 1 && line.product.price > 0 && (
                      <p className="text-[10.5px] text-muted-foreground sm:text-[11px]">
                        {formatPrice(line.product.price)} / ud.
                      </p>
                    )}
                    {line.product.price <= 0 && (
                      <p className="text-[10.5px] text-camel-deep sm:text-[11px]">
                        Precio por confirmar
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Resumen */}
        <aside className="min-w-0">
          <div className="rounded-[1.5rem] bg-card p-4 shadow-card sm:p-6 lg:sticky lg:top-28">
            <h2 className="text-base font-semibold">Resumen del pedido</h2>

            {/* Info envío estándar */}
            <div className="mt-4 rounded-2xl bg-secondary/70 p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Truck className="h-3.5 w-3.5 shrink-0 text-camel-deep" />
                Envío estándar
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Para hoy mismo se le enviará una confirmación por WhatsApp con el precio del envío.
              </p>
            </div>

            <div className="mt-5 space-y-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="shrink-0 text-muted-foreground">Subtotal</span>
                <span className="text-right font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="shrink-0 text-muted-foreground">Envío</span>
                <span className="text-right text-xs font-medium text-camel-deep">
                  Por confirmar por WhatsApp
                </span>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-baseline justify-between gap-3 text-base">
                <span className="shrink-0 font-semibold">Total</span>
                <span className="text-right font-bold">{formatPrice(subtotal)}</span>
              </div>
            </div>

            {sinPrecio && (
              <p className="mt-3 rounded-2xl bg-secondary/70 p-3 text-[12px] leading-relaxed text-muted-foreground">
                Tu pedido incluye artículos sin precio publicado: los
                confirmamos contigo por WhatsApp.
              </p>
            )}

            <Button asChild className="mt-6 h-12 w-full rounded-full text-sm font-semibold">
              <a href={href("/pedido")}>Finalizar pedido</a>
            </Button>
            <Button asChild variant="ghost" className="mt-2 h-10 w-full rounded-full text-[13px]">
              <a href={href("/catalogo")}>Seguir comprando</a>
            </Button>
            <p className="mt-4 text-center text-[10.5px] leading-relaxed text-muted-foreground">
              Al confirmar te llevamos a WhatsApp para cerrar la compra.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
