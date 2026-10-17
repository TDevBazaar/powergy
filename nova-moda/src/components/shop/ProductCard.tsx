"use client";

import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { href } from "@/lib/router";
import { formatPriceLabel } from "@/lib/format";
import { useNova } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<string, string> = {
  populares: "bg-camel text-white",
  oferta: "bg-[#B3402E] text-[#FBF6EE]",
};

const BADGE_LABELS: Record<string, string> = {
  populares: "Populares",
  oferta: "Oferta",
};

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const toggleFavorite = useNova((s) => s.toggleFavorite);
  const addToCart = useNova((s) => s.addToCart);
  const isFavorite = useNova((s) => s.favorites.includes(product.id));
  const sinPrecio = !(product.price > 0);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({ productId: product.id, qty: 1 });
    toast.success(`Añadido al carrito: ${product.name}`, {
      description: sinPrecio
        ? "El precio se confirma por WhatsApp."
        : `${formatPriceLabel(product.price)} · unidad`,
    });
  };

  return (
    <div className={cn("group", className)}>
      <a
        href={href(`/producto/${product.id}`)}
        className="block focus-visible:outline-none"
        aria-label={`Ver ${product.name}`}
      >
        <div className="relative overflow-hidden rounded-[1.6rem] bg-secondary aspect-[3/4] shadow-card">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : null}

          {product.badge && (
            <span
              className={cn(
                "absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide",
                BADGE_STYLES[product.badge]
              )}
            >
              {BADGE_LABELS[product.badge]}
            </span>
          )}

          {/* Favorito */}
          <button
            type="button"
            aria-label={
              isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(product.id);
              toast.success(
                isFavorite ? "Quitado de favoritos" : "Añadido a favoritos",
                { description: product.name }
              );
            }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-card backdrop-blur transition hover:scale-105"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition",
                isFavorite && "fill-[#B3402E] text-[#B3402E]"
              )}
            />
          </button>

          {/* Añadir rápido (hover desktop / visible en táctil) */}
          <button
            type="button"
            onClick={quickAdd}
            className="absolute inset-x-3 bottom-3 flex h-10 items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground opacity-100 shadow-card transition-all duration-300 hover:bg-foreground/90 md:translate-y-14 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          >
            <ShoppingBag className="h-4 w-4" />
            Añadir
          </button>
        </div>

        <div className="mt-3 px-1">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold",
                sinPrecio && "text-camel-deep"
              )}
            >
              {formatPriceLabel(product.price)}
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
