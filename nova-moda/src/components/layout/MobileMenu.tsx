"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardList,
  Heart,
  Home,
  Mail,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Shirt,
  User,
  Watch,
  X,
} from "lucide-react";
import { href } from "@/lib/router";
import { cartCount, useCategories } from "@/lib/catalog";
import { useNova } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Icono del menú para cada categoría; el resto usa uno genérico. */
const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  mujer: User,
  hombre: Shirt,
  accesorios: Watch,
};

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const cart = useNova((s) => s.cart);
  const favs = useNova((s) => s.favorites);
  const categories = useCategories();
  const countFor = (to: string) =>
    to === "/carrito" ? cartCount(cart) : to === "/favoritos" ? favs.length : 0;

  const links = useMemo(
    () => [
      { label: "Inicio", to: "/", icon: Home },
      { label: "Catálogo", to: "/catalogo", icon: Sparkles },
      ...categories.map((c) => ({
        label: c.name,
        to: `/categoria/${c.slug}`,
        icon: CATEGORY_ICONS[c.slug] ?? Sparkles,
      })),
      { label: "Búsqueda y filtros", to: "/buscar", icon: Search },
      { label: "Favoritos", to: "/favoritos", icon: Heart },
      { label: "Carrito", to: "/carrito", icon: ShoppingBag },
      { label: "Mi pedido", to: "/pedido", icon: ClipboardList },
      { label: "Contacto", to: "/contacto", icon: Mail },
    ],
    [categories]
  );

  // Suscripción a sistemas externos: cierra el menú si la ruta del
  // navegador cambia (atrás/adelante) o si se pulsa Escape.
  useEffect(() => {
    if (!open) return;
    const onHashChange = () => onClose();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-background shadow-soft"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex flex-col leading-none">
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[13px] font-bold text-background">
                    N
                  </span>
                  <span className="text-sm font-bold tracking-[0.18em]">
                    NOVA MODA
                  </span>
                </span>
                <span className="mt-1 text-[8px] font-medium tracking-[0.4em] text-muted-foreground">
                  ROPA Y ACCESORIOS
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav
              aria-label="Menú móvil"
              className="nice-scroll flex-1 overflow-y-auto px-3 py-4"
            >
              {links.map(({ label, to, icon: Icon }) => {
                const n = countFor(to);
                return (
                  <a
                    key={to}
                    href={href(to)}
                    onClick={onClose}
                    className="mb-1 flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-medium transition hover:bg-secondary"
                  >
                    <Icon className="h-[18px] w-[18px] text-camel-deep" />
                    <span className="flex-1">{label}</span>
                    {n > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-camel px-1.5 text-[10px] font-semibold text-white">
                        {n}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>

            <div className="safe-bottom border-t border-border px-5 py-4">
              <a
                href={href("/admin")}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-full border border-input bg-card px-4 py-3 text-sm font-medium transition hover:border-camel"
                )}
              >
                <ShieldCheck className="h-4 w-4 text-camel-deep" />
                Panel de administración
              </a>
              <p className="mt-3 text-center text-[10.5px] leading-relaxed text-muted-foreground">
                Tienda online · cierre de pedidos por WhatsApp
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
