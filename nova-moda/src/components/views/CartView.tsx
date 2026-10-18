"use client";

import { ShoppingBag, Trash2, Truck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { EmptyState } from "@/components/shop/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  cartSubtotal,
  hasUnpricedLines,
  useCartLines,
} from "@/lib/catalog";
import {
  formatPrice,
  formatPriceLabel,
} from "@/lib/format";
import { href } from "@/lib/router";
import { useNova } from "@/lib/store";

export function CartView() {
  const lines = useCartLines();
  const setQty = useNova((s) => s.setQty);
  const removeItem = useNova((s) => s.removeItem);
  const clearCart = useNova((s) => s.clearCart);

  const subtotal = cartSubtotal(lines);
  const sinPrecio = hasUnpricedLines(lines);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
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
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
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
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Vaciar carrito
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Líneas */}
        <ul className="space-y-4">
          {lines.map((line) => (
            <li
              key={`${line.productId}`}
              className="flex gap-4 rounded-[1.5rem] bg-card p-3.5 shadow-card sm:p-4"
            >
              <a
                href={href(`/producto/${line.productId}`)}
                className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-secondary sm:h-32 sm:w-28"
              >
                {line.product.image ? (
                  <img
                    src={line.product.image}
                    alt={line.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </a>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a
                      href={href(`/producto/${line.productId}`)}
                      className="block truncate text-[15px] font-semibold hover:underline"
                    >
                      {line.product.name}
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
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
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <QuantityStepper
                    size="sm"
                    value={line.qty}
                    min={1}
                    max={99}
                    onChange={(v) => setQty(line.productId, v)}
                  />
                  <div className="text-right">
                    <p className="text-[15px] font-bold">
                      {formatPriceLabel(line.lineTotal)}
                    </p>
                    {line.qty > 1 && line.product.price > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {formatPrice(line.product.price)} / ud.
                      </p>
                    )}
                    {line.product.price <= 0 && (
                      <p className="text-[11px] text-camel-deep">
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
        <aside>
          <div className="sticky top-28 rounded-[1.5rem] bg-card p-6 shadow-card">
            <h2 className="text-base font-semibold">Resumen del pedido</h2>

            {/* Info envío estándar */}
            <div className="mt-4 rounded-2xl bg-secondary/70 p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Truck className="h-3.5 w-3.5 text-camel-deep" />
                Envío estándar
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Para hoy mismo se le enviará una confirmación por WhatsApp con el precio del envío.
              </p>
            </div>

            <div className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Envío</span>
                <span className="text-xs font-medium text-camel-deep">
                  Por confirmar por WhatsApp
                </span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
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
