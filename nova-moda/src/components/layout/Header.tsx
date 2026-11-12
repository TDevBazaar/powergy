"use client";

import { ChevronDown, Heart, Menu, Search, ShieldCheck, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { href, navigate, useRoute } from "@/lib/router";
import { cartCount, useCategories } from "@/lib/catalog";
import { useNova } from "@/lib/store";
import { cn } from "@/lib/utils";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-camel px-1 text-[10px] font-semibold leading-none text-white shadow-card">
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

  const navContainerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const catMenuWrapRef = useRef<HTMLDivElement>(null);
  const [collapseCategories, setCollapseCategories] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);

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

  const useCategoryDropdown = categories.length > 0 && collapseCategories;
  const isCategoryRouteActive = route.path.startsWith("/categoria/");

  useEffect(() => {
    const container = navContainerRef.current;
    const probe = probeRef.current;
    if (!container || !probe) return;

    const measure = () => {
      const available = container.clientWidth;
      if (available <= 0) return;
      const needed = probe.scrollWidth;
      setCollapseCategories(needed > available - 2);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(probe);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [nav]);

  useEffect(() => {
    if (!catMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        catMenuWrapRef.current &&
        !catMenuWrapRef.current.contains(event.target as Node)
      ) {
        setCatMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCatMenuOpen(false);
      }
    };
    const onRouteHistory = () => setCatMenuOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onRouteHistory);
    window.addEventListener("hashchange", onRouteHistory);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onRouteHistory);
      window.removeEventListener("hashchange", onRouteHistory);
    };
  }, [catMenuOpen]);

  const isActive = (to: string) =>
    to === "/"
      ? route.path === "/"
      : to === "/catalogo"
        ? route.path.startsWith("/catalogo") || route.path.startsWith("/buscar")
        : route.path.startsWith(to);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
        {/* Izquierda: menú móvil/tablet / nav desktop */}
        <div className="flex min-w-0 items-center gap-1 lg:w-full">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menú"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-secondary sm:h-10 sm:w-10 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div
            ref={navContainerRef}
            className="relative hidden min-w-0 flex-1 items-center lg:flex"
          >
            {/* Medición oculta para detectar desbordamiento al añadir muchas categorías */}
            <div
              ref={probeRef}
              aria-hidden="true"
              className="pointer-events-none invisible absolute top-0 left-0 flex items-center gap-0.5 whitespace-nowrap"
            >
              {nav.map((item) => (
                <span
                  key={item.to}
                  className="shrink-0 rounded-full px-2.5 py-2 text-[13px] font-medium xl:px-3"
                >
                  {item.label}
                </span>
              ))}
            </div>

            <nav
              aria-label="Navegación principal"
              className={cn(
                "flex min-w-0 items-center gap-0.5 whitespace-nowrap",
                !useCategoryDropdown && "overflow-hidden"
              )}
            >
              {useCategoryDropdown ? (
                <>
                  <a
                    href={href("/")}
                    aria-current={isActive("/") ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-2 text-[13px] font-medium transition xl:px-3",
                      isActive("/")
                        ? "bg-foreground text-background"
                        : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    Inicio
                  </a>
                  <a
                    href={href("/catalogo")}
                    aria-current={isActive("/catalogo") ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-2 text-[13px] font-medium transition xl:px-3",
                      isActive("/catalogo")
                        ? "bg-foreground text-background"
                        : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    Catálogo
                  </a>

                  <div ref={catMenuWrapRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setCatMenuOpen((prev) => !prev)}
                      aria-expanded={catMenuOpen}
                      aria-haspopup="menu"
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-2 text-[13px] font-medium transition xl:px-3",
                        isCategoryRouteActive
                          ? "bg-foreground text-background"
                          : catMenuOpen
                            ? "bg-secondary text-foreground"
                            : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      Categorías
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          catMenuOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {catMenuOpen && (
                      <div
                        role="menu"
                        aria-label="Categorías de la tienda"
                        className={cn(
                          "absolute top-[calc(100%+0.55rem)] left-0 z-50 rounded-[1.4rem] border border-border/80 bg-card p-2.5 shadow-soft",
                          categories.length > 6 ? "w-80" : "min-w-56 max-w-xs"
                        )}
                      >
                        <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Categorías ({categories.length})
                        </p>
                        <div
                          className={cn(
                            "nice-scroll grid max-h-[min(22rem,62vh)] gap-1 overflow-y-auto pr-0.5",
                            categories.length > 6 ? "grid-cols-2" : "grid-cols-1"
                          )}
                        >
                          {categories.map((c) => {
                            const to = `/categoria/${c.slug}`;
                            const active = isActive(to);
                            return (
                              <a
                                key={c.id}
                                role="menuitem"
                                href={href(to)}
                                onClick={() => setCatMenuOpen(false)}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "block truncate rounded-xl px-3 py-2 text-[13px] font-medium transition",
                                  active
                                    ? "bg-foreground text-background"
                                    : "text-foreground/85 hover:bg-secondary hover:text-foreground"
                                )}
                                title={c.name}
                              >
                                {c.name}
                              </a>
                            );
                          })}
                        </div>
                        <div className="mt-2 border-t border-border/70 pt-2">
                          <a
                            role="menuitem"
                            href={href("/catalogo")}
                            onClick={() => setCatMenuOpen(false)}
                            className="block rounded-xl px-3 py-1.5 text-center text-[12px] font-semibold text-camel-deep transition hover:bg-secondary"
                          >
                            Ver todo el catálogo
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <a
                    href={href("/contacto")}
                    aria-current={isActive("/contacto") ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-2 text-[13px] font-medium transition xl:px-3",
                      isActive("/contacto")
                        ? "bg-foreground text-background"
                        : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    Contacto
                  </a>
                </>
              ) : (
                nav.map((item) => (
                  <a
                    key={item.to}
                    href={href(item.to)}
                    aria-current={isActive(item.to) ? "page" : undefined}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-2 text-[13px] font-medium transition xl:px-3",
                      isActive(item.to)
                        ? "bg-foreground text-background"
                        : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </a>
                ))
              )}
            </nav>
          </div>
        </div>

        {/* Centro: logotipo */}
        <a
          href={href("/")}
          className="flex shrink-0 flex-col items-center leading-none lg:justify-self-center"
          aria-label="NOVA MODA — Inicio"
        >
          <span className="flex items-center gap-1.5 sm:gap-2">
            <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-foreground font-display text-[12px] font-bold text-background sm:h-7 sm:w-7 sm:text-[13px]">
              N
            </span>
            <span className="text-[13.5px] font-bold tracking-[0.14em] sm:text-[15px] sm:tracking-[0.18em]">
              NOVA MODA
            </span>
          </span>
          <span className="mt-1 text-[8px] font-medium tracking-[0.3em] text-muted-foreground sm:text-[8.5px] sm:tracking-[0.42em]">
            ROPA Y ACCESORIOS
          </span>
        </a>

        {/* Derecha: acciones */}
        <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1 lg:justify-self-end">
          <button
            type="button"
            aria-label="Buscar productos"
            onClick={() => {
              navigate("/catalogo");
              window.setTimeout(() => {
                document.getElementById("catalog-search")?.focus();
              }, 60);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-secondary sm:h-10 sm:w-10"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <a
            href={href("/favoritos")}
            aria-label={`Favoritos (${favs.length})`}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-secondary sm:h-10 sm:w-10"
          >
            <Heart className="h-[18px] w-[18px]" />
            <Badge count={favs.length} />
          </a>
          <a
            href={href("/carrito")}
            aria-label={`Carrito (${count} artículos)`}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-secondary sm:h-10 sm:w-10"
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
