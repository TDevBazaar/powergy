"use client";

import { Heart } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { EmptyState } from "@/components/shop/EmptyState";
import { SectionTitle } from "@/components/shop/Bits";
import { useCatalog, productById } from "@/lib/catalog";
import { useNova } from "@/lib/store";

export function FavoritesView() {
  const catalog = useCatalog();
  const favorites = useNova((s) => s.favorites);
  const favProducts = favorites
    .map((id) => productById(catalog, id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
          TU LISTA
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Favoritos
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Guarda aquí las piezas que más te gustan pulsando el corazón de
          cualquier tarjeta. La lista se conserva en tu navegador.
        </p>
      </header>

      {favProducts.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aún no tienes favoritos"
          description="Toca el corazón en cualquier producto para guardarlo aquí y encontrarlo fácilmente después."
          ctaLabel="Explorar catálogo"
          ctaHref="/catalogo"
        />
      ) : (
        <>
          <SectionTitle
            title={`${favProducts.length} ${
              favProducts.length === 1 ? "artículo guardado" : "artículos guardados"
            }`}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {favProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
