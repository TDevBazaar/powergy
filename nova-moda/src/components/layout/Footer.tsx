"use client";

import {
  Clock,
  Facebook,
  Instagram,
  MessageCircle,
  ShieldCheck,
  Twitter,
} from "lucide-react";
import { useMemo } from "react";
import { href } from "@/lib/router";
import { useCategories } from "@/lib/catalog";
import { WHATSAPP_PHONE } from "@/lib/whatsapp";

const HELP_LINKS = [
  { label: "Favoritos", to: "/favoritos" },
  { label: "Carrito", to: "/carrito" },
  { label: "Finalizar pedido", to: "/pedido" },
  { label: "Contacto", to: "/contacto" },
  { label: "Panel de administración", to: "/admin" },
];

export function Footer() {
  const categories = useCategories();

  const shopLinks = useMemo(
    () => [
      { label: "Catálogo completo", to: "/catalogo" },
      ...categories.map((c) => ({ label: c.name, to: `/categoria/${c.slug}` })),
      { label: "Buscar productos", to: "/buscar" },
    ],
    [categories]
  );

  return (
    <footer className="mt-auto border-t border-border bg-cream-deep/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {/* Marca */}
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
              N
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.18em]">
                NOVA MODA
              </span>
              <span className="mt-1 text-[8px] font-medium tracking-[0.4em] text-muted-foreground">
                ROPA Y ACCESORIOS
              </span>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Ropa y accesorios en una paleta cálida de crema, arena y camel.
            Compra online y cierra tu pedido por WhatsApp.
          </p>
          <div className="mt-5 flex gap-2">
            {[Instagram, Facebook, Twitter].map((Icon, i) => (
              <span
                key={i}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-card text-muted-foreground shadow-card transition hover:text-camel-deep"
                aria-label="Red social"
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>

        {/* Tienda */}
        <nav aria-label="Tienda">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tienda
          </p>
          <ul className="space-y-2.5">
            {shopLinks.map((l) => (
              <li key={l.to}>
                <a
                  href={href(l.to)}
                  className="text-[13px] transition hover:text-camel-deep"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Ayuda */}
        <nav aria-label="Ayuda">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ayuda
          </p>
          <ul className="space-y-2.5">
            {HELP_LINKS.map((l) => (
              <li key={l.to}>
                <a
                  href={href(l.to)}
                  className="text-[13px] transition hover:text-camel-deep"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contacto */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Contacto
          </p>
          <ul className="space-y-3 text-[13px] text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-camel-deep" />
              WhatsApp: +{WHATSAPP_PHONE}
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-camel-deep" />
              Atención de lunes a sábado
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-camel-deep" />
              Compra online · pedidos confirmados por WhatsApp
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-[11.5px] text-muted-foreground sm:flex-row sm:px-6">
          <p>© 2026 NOVA MODA · Todos los derechos reservados</p>
          <p>Next.js · TypeScript · Tailwind CSS</p>
        </div>
      </div>
    </footer>
  );
}
