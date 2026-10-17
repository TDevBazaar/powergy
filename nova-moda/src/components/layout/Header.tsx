"use client";

import { Heart, Menu, Search, ShieldCheck, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import { href, navigate, useRoute } from "@/lib/router";
import { cartCount, useCategories } from "@/lib/catalog";
import { useNova } from "@/lib/store";
import { cn } from "@/lib/utils";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-camel px-1 text-[10px] font-semibold leading-none text-white shadow-card">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const route = useRoute();
  const categories = useCategories();
  const cart = useNova((s) => s.cart);
  const favs = useNova((s) => s.favorites);
  const count = cartCount(cart);

  const nav = useMemo(
    () => [
      { label: "Inicio", to: "/" },
      { label: "Catálogo", to: "/catalogo" },
      ...categories.map((c) => ({
        label: c.name,
        to: `/categoria/${c.slug}`,
      })),
      { label: "Contacto", to: "/contacto" },
    ],
    [categories]
  );

  const isActive = (to: string) =>
    to === "/" ? route.path === "/" : route.path.startsWith(to);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Izquierda: menú móvil / nav desktop */}
        <div className="flex flex-1 items-center gap-1">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menú"
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-secondary md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 md:flex"
          >
            {nav.map((item) => (
              <a
                key={item.to}
                href={href(item.to)}
                aria-current={isActive(item.to) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13px] font-medium transition",
                  isActive(item.to)
                    ? "bg-foreground text-background"
                    : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Centro: logotipo */}
        <a
          href={href("/")}
          className="flex shrink-0 flex-col items-center leading-none"
          aria-label="NOVA MODA — Inicio"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground font-display text-[13px] font-bold text-background">
              N
            </span>
            <span className="text-[15px] font-bold tracking-[0.18em]">
              NOVA MODA
            </span>
          </span>
          <span className="mt-1 text-[8.5px] font-medium tracking-[0.42em] text-muted-foreground">
            ROPA Y ACCESORIOS
          </span>
        </a>

        {/* Derecha: acciones */}
        <div className="flex flex-1 items-center justify-end gap-1">
          <button
            type="button"
            aria-label="Buscar productos"
            onClick={() => navigate("/buscar")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-secondary"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <a
            href={href("/favoritos")}
            aria-label={`Favoritos (${favs.length})`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-secondary"
          >
            <Heart className="h-[18px] w-[18px]" />
            <Badge count={favs.length} />
          </a>
          <a
            href={href("/carrito")}
            aria-label={`Carrito (${count} artículos)`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-secondary"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            <Badge count={count} />
          </a>
          <a
            href={href("/admin")}
            title="Panel de administración"
            className="ml-1 hidden h-9 items-center gap-1.5 rounded-full border border-input bg-card px-3 text-[12px] font-medium text-muted-foreground transition hover:border-camel hover:text-foreground lg:flex"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin
          </a>
        </div>
      </div>

      {/* Franja informativa */}
      <div className="bg-foreground px-4 py-1 text-center text-[10.5px] font-medium tracking-[0.22em] text-background/90">
        TIENDA ONLINE · CIERRE DE PEDIDOS POR WHATSAPP
      </div>
    </header>
  );
}
