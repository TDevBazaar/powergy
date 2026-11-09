"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ClipboardList,
  MessageCircle,
  PartyPopper,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ImagePreviewModal,
  ZoomableThumb,
  type PreviewImageData,
} from "@/components/admin/ImagePreviewModal";
import { EmptyState } from "@/components/shop/EmptyState";
import {
  cartSubtotal,
  hasUnpricedLines,
  useCartLinesState,
} from "@/lib/catalog";
import {
  formatPrice,
  formatPriceLabel,
  shippingCostFor,
} from "@/lib/format";
import { navigate } from "@/lib/router";
import { useNova } from "@/lib/store";
import {
  NOVA_STORE,
  apiSend,
  type ApiOrder,
} from "@/lib/powergy-api";
import { buildOrderPreviewPath } from "@/lib/order-preview";
import { whatsappUrl } from "@/lib/whatsapp";
import type { CartLine, Order } from "@/lib/types";

/** Mensaje de WhatsApp con el detalle del pedido, vista previa visual y enlace directo para el admin */
function buildWhatsAppMessage(
  reference: string,
  lines: CartLine[],
  subtotal: number,
  previewUrl: string,
  adminUrl: string
): string {
  const detalle = lines
    .map(
      (l) =>
        `• ${l.qty} × ${l.product.name} — ${
          l.product.price > 0 ? formatPrice(l.lineTotal) : "precio por confirmar"
        }`
    )
    .join("\n");

  return [
    "Hola NOVA MODA, estoy interesado en estos productos.",
    "",
    `📋 Pedido: ${reference}`,
    "",
    "Artículos:",
    detalle,
    "",
    `Subtotal: ${formatPrice(subtotal)}`,
    "Envío: Por confirmar vía WhatsApp",
    `Total productos: ${formatPrice(subtotal)}`,
    "",
    "🖼️ Vista previa con fotos:",
    previewUrl,
    "",
    "🔗 Enlace directo al pedido (Admin):",
    adminUrl,
  ].join("\n");
}

export function CheckoutView() {
  const { lines, pending } = useCartLinesState();
  const clearCart = useNova((s) => s.clearCart);
  const [confirmed, setConfirmed] = useState<Order | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(null);

  const subtotal = cartSubtotal(lines);
  const sinPrecio = hasUnpricedLines(lines);
  const shippingCost = shippingCostFor(subtotal, "estandar");
  const total = subtotal + shippingCost;

  // Redirigir automáticamente a WhatsApp en cuanto se confirma el pedido
  useEffect(() => {
    if (confirmed && whatsappLink) {
      // Redirección directa para evitar bloqueos de ventanas emergentes (popups)
      const timer = setTimeout(() => {
        window.location.href = whatsappLink;
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [confirmed, whatsappLink]);

  if (confirmed) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-20 pt-12 text-center sm:px-6">
        <div className="rounded-[2rem] bg-card p-8 shadow-card sm:p-10">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#4E5B48]/15">
            <PartyPopper className="h-9 w-9 text-[#4E5B48]" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
            ¡Pedido registrado!
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Tu pedido{" "}
            <span className="font-mono font-semibold text-foreground">
              {confirmed.id}
            </span>{" "}
            quedó registrado. Te estamos redirigiendo a WhatsApp para confirmar el
            pago y la entrega...
          </p>
          <div className="mt-6 rounded-2xl bg-secondary/70 p-4 text-left text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Artículos</span>
              <span className="text-right font-medium">
                {confirmed.items.reduce((a, i) => a + i.qty, 0)}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Envío</span>
              <span className="text-right text-xs font-medium text-camel-deep">
                Confirmación por WhatsApp
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Total</span>
              <span className="text-right font-bold">
                {formatPrice(confirmed.total)}
              </span>
            </div>
          </div>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button asChild className="h-11 rounded-full px-6 text-sm font-medium">
              <a href={whatsappLink || whatsappUrl("Hola NOVA MODA")}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Continuar en WhatsApp
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/catalogo")}
              className="h-11 rounded-full border-input bg-card px-6 text-sm font-medium"
            >
              Seguir comprando
            </Button>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(`/admin?order=${encodeURIComponent(confirmed.id)}`)
            }
            className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition hover:text-foreground"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Ver pedido #{confirmed.id} en el panel de administración
          </button>
        </div>
      </div>
    );
  }

  if (pending && lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 animate-pulse">
        <div className="mb-6 space-y-2 sm:mb-7">
          <div className="h-3 w-28 rounded-md bg-secondary" />
          <div className="h-9 w-56 rounded-md bg-secondary" />
        </div>
        <div className="h-96 rounded-[1.5rem] bg-secondary/70 shadow-card" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <EmptyState
          icon={ShoppingBag}
          title="No hay nada que pedir"
          description="Tu carrito está vacío. Añade algunos productos antes de completar el pedido."
          ctaLabel="Ir al catálogo"
          ctaHref="/catalogo"
        />
      </div>
    );
  }

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError("");
    try {
      const respuesta = await apiSend<ApiOrder>("orders", {
        method: "POST",
        body: {
          store: NOVA_STORE,
          idempotencyKey: crypto.randomUUID(),
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.qty,
          })),
        },
      });

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const previewUrl = `${origin}${buildOrderPreviewPath(
        respuesta.reference,
        lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          name: l.product.name,
          price: l.product.price,
          image: l.product.images[0] || l.product.image,
          categoryName: l.product.categoryName,
          slug: l.product.slug,
        }))
      )}`;
      const adminUrl = `${origin}/admin?order=${encodeURIComponent(respuesta.reference)}`;

      const order: Order = {
        id: respuesta.reference,
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        subtotal,
        shippingCost,
        total,
        customer: {
          shipping: "estandar",
        },
        status: respuesta.status,
        createdAt: respuesta.createdAt,
      };

      const mensaje = buildWhatsAppMessage(
        respuesta.reference,
        lines,
        subtotal,
        previewUrl,
        adminUrl
      );
      const urlWa = whatsappUrl(mensaje);
      setWhatsappLink(urlWa);

      clearCart();
      setConfirmed(order);
      window.scrollTo({ top: 0 });

      // Intento inmediato de apertura (y si el navegador bloquea el pop-up, el useEffect redirige automáticamente)
      try {
        window.location.href = urlWa;
      } catch {
        /* Redirección respaldada por useEffect */
      }
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "No pudimos registrar el pedido. Inténtalo de nuevo."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <header className="mb-6 sm:mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
          ÚLTIMO PASO
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Formulario de pedido
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Revisa tu selección y confirma para registrar el pedido y continuar
          por WhatsApp.
        </p>
      </header>

      <form onSubmit={handleConfirm} noValidate>
        <section className="rounded-[1.5rem] bg-card p-4 shadow-card sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Tu pedido</h2>
            <span className="text-xs text-muted-foreground">
              {lines.reduce((a, l) => a + l.qty, 0)}{" "}
              {lines.reduce((a, l) => a + l.qty, 0) === 1
                ? "artículo"
                : "artículos"}
            </span>
          </div>

          <ul className="nice-scroll mt-4 max-h-[26rem] space-y-3 overflow-y-auto pt-1.5 pr-1">
            {lines.map((l) => (
              <li
                key={`${l.productId}`}
                className="flex min-w-0 items-center gap-3"
              >
                <span className="relative shrink-0">
                  <ZoomableThumb
                    src={l.product.images[0]}
                    alt={l.product.name}
                    onPreview={setPreviewImage}
                    priority
                    className="h-16 w-14 rounded-xl"
                  />
                  <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background shadow-card">
                    {l.qty}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 break-words text-[13.5px] font-medium leading-snug sm:text-[14px]">
                    {l.product.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {l.product.categoryName}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[13.5px] font-semibold sm:text-sm">
                  {formatPriceLabel(l.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <Separator className="my-4 bg-border" />

          <div className="space-y-2.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Subtotal</span>
              <span className="text-right font-medium">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Envío</span>
              <span className="text-right text-xs font-medium text-camel-deep">
                Por confirmar por WhatsApp
              </span>
            </div>
            <Separator className="bg-border" />
            <div className="flex items-baseline justify-between gap-3 text-base">
              <span className="shrink-0 font-semibold">Total productos</span>
              <span className="text-right font-bold">
                {formatPrice(subtotal)}
              </span>
            </div>
          </div>

          {sinPrecio && (
            <p className="mt-3 rounded-2xl bg-secondary/70 p-3 text-[12px] leading-relaxed text-muted-foreground">
              Tu pedido incluye artículos sin precio publicado: los confirmamos
              contigo por WhatsApp.
            </p>
          )}

          {sendError && (
            <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive">
              {sendError}
            </p>
          )}

          <Button
            type="submit"
            disabled={sending}
            className="mt-6 h-12 w-full rounded-full text-sm font-semibold"
          >
            {sending ? "Registrando pedido…" : "Confirmar y abrir WhatsApp"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/carrito")}
            className="mt-2 h-10 w-full rounded-full text-[13px]"
          >
            Volver al carrito
          </Button>
        </section>
      </form>

      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
