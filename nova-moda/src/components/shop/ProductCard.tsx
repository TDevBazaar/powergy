"use client";

import { Heart, ShoppingBag, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { LazyImage } from "@/components/shop/LazyImage";
import { useCatalogStore } from "@/lib/catalog";
import { formatPrice, formatPriceLabel } from "@/lib/format";
import { href, navigate } from "@/lib/router";
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
  const cartQty = useNova(
    (s) => s.cart.find((item) => item.productId === product.id)?.qty ?? 0
  );
  const sinPrecio = !(product.price > 0);
  const hasDiscount =
    product.onSale &&
    Boolean(product.discountPercent && product.discountPercent > 0) &&
    product.price > 0 &&
    product.originalPrice > product.price;

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    useCatalogStore.getState().registerProducts([product]);
    addToCart({ productId: product.id, qty: 1 });
    toast.success(`Añadido al carrito: ${product.name}`, {
      description: sinPrecio
        ? "El precio se confirma por WhatsApp."
        : `${formatPriceLabel(product.price)} · unidad`,
    });
  };

  const orderNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    useCatalogStore.getState().registerProducts([product]);
    if (cartQty === 0) {
      addToCart({ productId: product.id, qty: 1 });
    }
    navigate("/pedido");
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
            <LazyImage
              src={product.image}
              alt={product.name}
              showPulseDot
              wrapperClassName="h-full w-full"
              className="group-hover:scale-[1.06]"
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

          {/* Acciones rápidas: pedir directo o agregar al carrito */}
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 opacity-100 transition-all duration-300 md:translate-y-14 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={orderNow}
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-foreground/90"
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span className="truncate">Pedir</span>
            </button>
            <button
              type="button"
              onClick={quickAdd}
              aria-label={`Agregar ${product.name} al carrito`}
              title="Agregar al carrito"
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-card backdrop-blur transition hover:scale-105",
                cartQty > 0
                  ? "bg-camel text-white"
                  : "bg-background/95 text-foreground hover:bg-background"
              )}
            >
              <ShoppingCart className="h-4 w-4" />
              {cartQty > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background shadow-card">
                  {cartQty > 9 ? "9+" : cartQty}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 px-1">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                sinPrecio && "text-camel-deep",
                hasDiscount && "text-[#B3402E]"
              )}
            >
              {formatPriceLabel(product.price)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-xs text-muted-foreground line-through tabular-nums">
                  {formatPrice(product.originalPrice)}
                </span>
                <span className="rounded-full bg-[#B3402E]/12 px-1.5 py-0.5 text-[10.5px] font-bold leading-none text-[#B3402E] tabular-nums">
                  -{product.discountPercent}%
                </span>
              </>
            )}
          </div>
        </div>
      </a>
    </div>
  );
}
