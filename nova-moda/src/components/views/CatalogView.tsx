"use client";

import { useEffect, useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { EmptyState } from "@/components/shop/EmptyState";
import { FilterControls } from "@/components/shop/FilterControls";
import { useFilterState } from "@/components/shop/useFilterState";
import {
  activeFilterCount,
  applyFilters,
  searchProducts,
} from "@/lib/catalog";
import { useCatalog, useCategories } from "@/lib/catalog";
import type { CategoryId } from "@/lib/types";
import { PackageSearch } from "lucide-react";

export function CatalogView({
  initialCat,
}: {
  initialCat?: string | null;
}) {
  const catalog = useCatalog();
  const categories = useCategories();
  const validCat = categories.some((c) => c.slug === initialCat)
    ? (initialCat as CategoryId)
    : undefined;
  const { filters, patch, reset } = useFilterState(
    validCat ? { cats: [validCat] } : undefined
  );

  // Si llega ?cat= desde el menú, sincroniza
  useEffect(() => {
    if (validCat) patch({ cats: [validCat] });
  }, [validCat, patch]);

  const results = useMemo(
    () => applyFilters(searchProducts(catalog, filters.q), filters),
    [catalog, filters]
  );
  const activeCount = activeFilterCount(filters);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
          NOVA MODA
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Catálogo completo
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Explora todas las prendas y accesorios de la tienda. Filtra por
          categoría y precio para encontrar tu estilo.
        </p>
      </header>

      {/* Móvil: hoja de filtros */}
      <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-muted-foreground">
          {results.length}{" "}
          {results.length === 1 ? "producto" : "productos"}
        </p>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-10 rounded-full border-input bg-card">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
              {activeCount > 0 && (
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-camel px-1 text-[10px] font-semibold text-white">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85%] max-w-sm overflow-y-auto">
            <SheetHeader className="p-0">
              <SheetTitle className="sr-only">Filtros</SheetTitle>
            </SheetHeader>
            <div className="px-1 pb-6">
              <FilterControls
                products={catalog}
                filters={filters}
                onChange={patch}
                onReset={reset}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        {/* Escritorio: barra lateral */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <FilterControls
              products={catalog}
              filters={filters}
              onChange={patch}
              onReset={reset}
            />
          </div>
        </aside>

        <div>
          <p className="mb-5 hidden text-sm text-muted-foreground lg:block">
            {results.length} {results.length === 1 ? "producto" : "productos"}
            {filters.cats.length > 0 &&
              ` · ${filters.cats
                .map(
                  (c) => categories.find((cat) => cat.slug === c)?.name ?? c
                )
                .join(", ")}`}
          </p>
          {results.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Sin resultados"
              description="Ningún producto coincide con los filtros elegidos. Prueba a ampliar el precio o quitar filtros."
              ctaLabel="Limpiar filtros"
              onCta={reset}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
