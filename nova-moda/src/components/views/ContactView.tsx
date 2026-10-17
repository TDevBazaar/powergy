"use client";

import { useState } from "react";
import {
  Clock,
  HelpCircle,
  MessageSquare,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { openWhatsApp, WHATSAPP_PHONE } from "@/lib/whatsapp";
import { toast } from "sonner";

const SUBJECTS = [
  "Consulta sobre un producto",
  "Estado de mi pedido",
  "Devoluciones y cambios",
  "Envíos y entregas",
  "Otro asunto",
];

const FAQ = [
  {
    q: "¿Cómo hago un pedido?",
    a: "Añade las piezas que te gusten al carrito y completa el formulario en «Finalizar pedido». Registramos tu solicitud con una referencia y enseguida abrimos WhatsApp para confirmar el pago y la entrega.",
  },
  {
    q: "¿Cómo se realiza el pago?",
    a: "Coordinamos el pago en la conversación de WhatsApp: transferencia, efectivo contra entrega o el medio que acordemos. Nunca compartas datos de tarjeta por chat.",
  },
  {
    q: "¿Cuánto cuesta el envío?",
    a: "Los pedidos superiores a $75,00 tienen envío estándar gratis. Para el resto de casos te confirmamos el coste y el tiempo estimado por WhatsApp antes de cerrar el pedido.",
  },
  {
    q: "¿Dónde se guardan mis datos?",
    a: "El carrito y los favoritos se guardan en tu navegador. Los datos de entrega que escribes en el formulario solo se envían en el mensaje de WhatsApp junto a la referencia de tu pedido.",
  },
  {
    q: "¿Puedo cambiar o devolver un artículo?",
    a: "Sí: escríbenos por WhatsApp dentro de los 30 días posteriores a la entrega y gestionamos el cambio o la devolución contigo.",
  },
];

export function ContactView() {
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const datos = new FormData(form);
    const nombre = String(datos.get("nombre") ?? "").trim();
    const correo = String(datos.get("correo") ?? "").trim();
    const asunto = String(datos.get("asunto") ?? "").trim();
    const mensaje = String(datos.get("mensaje") ?? "").trim();

    const texto = [
      "Hola NOVA MODA, escribo desde la web.",
      "",
      `Asunto: ${asunto}`,
      `Nombre: ${nombre}`,
      `Correo: ${correo}`,
      "",
      mensaje,
    ].join("\n");

    form.reset();
    setSent(true);
    openWhatsApp(texto);
    toast.success("Abriendo WhatsApp…", {
      description: "Envía el mensaje desde la conversación para que lo recibamos.",
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
          ESTAMOS PARA AYUDARTE
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Contacto
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Escríbenos por cualquier duda sobre productos, pedidos o cambios. El
          formulario abre WhatsApp con tu mensaje listo para enviar.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Formulario */}
        <section className="rounded-[1.5rem] bg-card p-6 shadow-card sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-5 w-5 text-camel-deep" />
            Envíanos un mensaje
          </h2>
          {sent && (
            <p className="mt-4 rounded-2xl bg-[#4E5B48]/12 p-3.5 text-[13px] font-medium text-[#4E5B48]">
              Abrimos WhatsApp con tu mensaje. Envíalo desde la conversación y
              te responderemos lo antes posible.
            </p>
          )}
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            <div>
              <Label htmlFor="c-name">Nombre *</Label>
              <Input
                id="c-name"
                name="nombre"
                required
                minLength={3}
                placeholder="Tu nombre"
                className="mt-1.5 h-11 rounded-2xl border-input bg-background"
              />
            </div>
            <div>
              <Label htmlFor="c-email">Correo *</Label>
              <Input
                id="c-email"
                name="correo"
                type="email"
                required
                placeholder="tu@correo.com"
                className="mt-1.5 h-11 rounded-2xl border-input bg-background"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="c-subject">Asunto *</Label>
              <select
                id="c-subject"
                name="asunto"
                required
                defaultValue=""
                className="mt-1.5 h-11 w-full rounded-2xl border border-input bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-camel/40"
              >
                <option value="" disabled>
                  Selecciona un asunto…
                </option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="c-msg">Mensaje *</Label>
              <Textarea
                id="c-msg"
                name="mensaje"
                required
                minLength={10}
                placeholder="Cuéntanos en qué podemos ayudarte…"
                className="mt-1.5 min-h-32 rounded-2xl border-input bg-background"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="h-12 rounded-full px-8 text-sm font-semibold">
                <Send className="mr-2 h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            </div>
          </form>
        </section>

        {/* Info de contacto */}
        <aside className="space-y-4">
          {[
            {
              icon: Phone,
              title: "WhatsApp",
              lines: [`+${WHATSAPP_PHONE}`, "Pedidos, cambios y consultas"],
            },
            {
              icon: Clock,
              title: "Horario",
              lines: ["Lunes a viernes: 9:00 – 18:00", "Sábados: 10:00 – 14:00"],
            },
            {
              icon: RotateCcw,
              title: "Cambios y devoluciones",
              lines: ["30 días desde la entrega", "Gestionados por WhatsApp"],
            },
            {
              icon: ShieldCheck,
              title: "Compra segura",
              lines: ["Pago coordinado por WhatsApp", "No compartas datos de tarjeta"],
            },
          ].map(({ icon: Icon, title, lines }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-[1.4rem] bg-card p-5 shadow-card"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Icon className="h-5 w-5 text-camel-deep" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                {lines.map((l) => (
                  <p key={l} className="mt-0.5 text-[13px] text-muted-foreground">
                    {l}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <HelpCircle className="h-5 w-5 text-camel-deep" />
          Preguntas frecuentes
        </h2>
        <Accordion type="single" collapsible className="rounded-[1.4rem] bg-card px-5 shadow-card">
          {FAQ.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`faq-${i}`}
              className={i === FAQ.length - 1 ? "border-b-0" : "border-border/70"}
            >
              <AccordionTrigger className="text-left text-sm font-semibold">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[13px] leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
