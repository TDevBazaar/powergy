"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BadgeCheck,
  ClipboardList,
  MessageCircle,
  PartyPopper,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shop/EmptyState";
import {
  cartSubtotal,
  hasUnpricedLines,
  useCartLines,
} from "@/lib/catalog";
import {
  SHIPPING_OPTIONS,
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
import { whatsappUrl } from "@/lib/whatsapp";
import type { CartLine, Order } from "@/lib/types";

const checkoutSchema = z.object({
  name: z.string().min(2, "Escribe tu nombre completo"),
  phone: z
    .string()
    .min(6, "Escribe tu número de teléfono")
    .regex(/^[+\d][\d\s.-]{5,17}$/, "Número de teléfono no válido"),
  address: z.string().min(4, "Escribe tu dirección de entrega"),
  notes: z.string().max(300, "Máximo 300 caracteres").optional().or(z.literal("")),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

/** Mensaje de WhatsApp con el detalle del pedido y enlace directo para el admin */
function buildWhatsAppMessage(
  reference: string,
  values: CheckoutValues,
  lines: CartLine[],
  subtotal: number,
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
    "Hola NOVA MODA, acabo de registrar un pedido en la tienda.",
    "",
    `📋 Pedido: ${reference}`,
    `👤 Nombre: ${values.name}`,
    `📞 Teléfono: ${values.phone}`,
    `📍 Dirección: ${values.address}`,
    values.notes ? `📝 Notas: ${values.notes}` : null,
    "🚚 Envío: Envío estándar (confirmación hoy mismo con el precio)",
    "",
    "Artículos:",
    detalle,
    "",
    `Subtotal: ${formatPrice(subtotal)}`,
    "Envío: Por confirmar vía WhatsApp",
    `Total productos: ${formatPrice(subtotal)}`,
    "",
    `🔗 Enlace directo al pedido (Admin):`,
    adminUrl,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function CheckoutView() {
  const lines = useCartLines();
  const clearCart = useNova((s) => s.clearCart);
  const [confirmed, setConfirmed] = useState<Order | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const subtotal = cartSubtotal(lines);
  const sinPrecio = hasUnpricedLines(lines);
  const shippingCost = shippingCostFor(subtotal, "estandar");
  const total = subtotal + shippingCost;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

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
            Gracias, <span className="font-medium text-foreground">{confirmed.customer.name}</span>.
            Tu pedido <span className="font-mono font-semibold text-foreground">{confirmed.id}</span> quedó
            registrado. Te estamos redirigiendo a WhatsApp para confirmar el pago y la entrega...
          </p>
          <div className="mt-6 rounded-2xl bg-secondary/70 p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Artículos</span>
              <span className="font-medium">
                {confirmed.items.reduce((a, i) => a + i.qty, 0)}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted-foreground">Teléfono</span>
              <span className="font-medium">{confirmed.customer.phone}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted-foreground">Dirección</span>
              <span className="max-w-[65%] truncate text-right font-medium">
                {confirmed.customer.address}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span className="font-medium text-camel-deep">
                Confirmación por WhatsApp
              </span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{formatPrice(confirmed.total)}</span>
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
            onClick={() => navigate(`/admin?order=${encodeURIComponent(confirmed.id)}`)}
            className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition hover:text-foreground"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Ver pedido #{confirmed.id} en el panel de administración
          </button>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <EmptyState
          icon={ShoppingBag}
          title="No hay nada que pedir"
          description="Tu carrito está vacío. Añade algunos productos antes de completar el formulario de pedido."
          ctaLabel="Ir al catálogo"
          ctaHref="/catalogo"
        />
      </div>
    );
  }

  const onSubmit = async (values: CheckoutValues) => {
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
      const adminUrl = `${origin}/admin?order=${encodeURIComponent(respuesta.reference)}`;

      const order: Order = {
        id: respuesta.reference,
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        subtotal,
        shippingCost,
        total,
        customer: {
          name: values.name,
          phone: values.phone,
          address: values.address,
          notes: values.notes || undefined,
          shipping: "estandar",
        },
        status: respuesta.status,
        createdAt: respuesta.createdAt,
      };

      const mensaje = buildWhatsAppMessage(
        respuesta.reference,
        values,
        lines,
        subtotal,
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

  const fieldError = (msg?: string) =>
    msg ? <p className="mt-1.5 text-xs text-destructive">{msg}</p> : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
          ÚLTIMO PASO
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Formulario de pedido
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Completa tus datos: registramos tu pedido y continuamos por WhatsApp
          para confirmar el pago y la entrega.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* ── Columna izquierda: datos ── */}
          <div className="space-y-6">
            {/* Datos de entrega */}
            <section className="rounded-[1.5rem] bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <BadgeCheck className="h-4.5 w-4.5 text-camel-deep" />
                Datos de entrega
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    placeholder="Ana García"
                    className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                    {...register("name")}
                  />
                  {fieldError(errors.name?.message)}
                </div>
                <div>
                  <Label htmlFor="phone">Número de teléfono *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+34 600 000 000"
                    className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                    {...register("phone")}
                  />
                  {fieldError(errors.phone?.message)}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Dirección de entrega *</Label>
                  <Input
                    id="address"
                    placeholder="Calle Principal 123, Apto 4B"
                    className="mt-1.5 h-11 rounded-2xl border-input bg-background"
                    {...register("address")}
                  />
                  {fieldError(errors.address?.message)}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notas para el repartidor (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Detalles de entrega, horario preferido o indicaciones de llegada…"
                    className="mt-1.5 min-h-20 rounded-2xl border-input bg-background"
                    {...register("notes")}
                  />
                  {fieldError(errors.notes?.message)}
                </div>
              </div>
            </section>

            {/* Envío */}
            <section className="rounded-[1.5rem] bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Truck className="h-4.5 w-4.5 text-camel-deep" />
                Método de envío
              </h2>
              <div className="mt-4">
                <div className="flex items-center gap-3 rounded-2xl border border-camel bg-secondary/60 p-4">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-camel">
                    <span className="h-2 w-2 rounded-full bg-camel" />
                  </span>
                  <div className="flex-1">
                    <span className="block text-sm font-semibold">
                      {SHIPPING_OPTIONS[0]?.label ?? "Envío estándar"}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      Para hoy mismo se le enviará una confirmación por WhatsApp con el precio del envío
                    </span>
                  </div>
                  <span className="text-right text-xs font-semibold text-camel-deep">
                    Por confirmar
                  </span>
                </div>
              </div>
            </section>

            {/* Pago */}
            <section className="rounded-[1.5rem] border border-dashed border-camel bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <BadgeCheck className="h-4.5 w-4.5 text-camel-deep" />
                Pago por WhatsApp
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                Coordinamos el pago directamente en la conversación (transferencia, efectivo
                contra entrega o el medio que acordemos).
              </p>
            </section>
          </div>

          {/* ── Columna derecha: resumen ── */}
          <aside>
            <div className="sticky top-28 rounded-[1.5rem] bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold">Tu pedido</h2>
              <ul className="nice-scroll mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                {lines.map((l) => (
                  <li key={`${l.productId}`} className="flex items-center gap-3">
                    <span className="relative shrink-0">
                      <img
                        src={l.product.images[0]}
                        alt={l.product.name}
                        className="h-14 w-12 rounded-xl object-cover"
                      />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                        {l.qty}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {l.product.name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {l.product.categoryName}
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold">
                      {formatPriceLabel(l.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>

              <Separator className="my-4 bg-border" />

              <div className="space-y-2.5 text-sm">
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
                  <span className="font-semibold">Total productos</span>
                  <span className="font-bold">{formatPrice(subtotal)}</span>
                </div>
              </div>

              {sinPrecio && (
                <p className="mt-3 rounded-2xl bg-secondary/70 p-3 text-[12px] leading-relaxed text-muted-foreground">
                  Tu pedido incluye artículos sin precio publicado: los
                  confirmamos contigo por WhatsApp.
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
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
