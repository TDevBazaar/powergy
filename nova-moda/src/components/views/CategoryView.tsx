"use client";

import { useMemo } from "react";
import { SlidersHorizontal, PackageSearch } from "lucide-react";
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
  useCatalog,
  useCatalogStatus,
  useCategories,
} from "@/lib/catalog";
import { categoryMedia } from "@/lib/category-media";
import type { CategoryId } from "@/lib/types";

export function CategoryView({ categoryId }: { categoryId: CategoryId }) {
  const catalog = useCatalog();
  const categories = useCategories();
  const status = useCatalogStatus();
  const category = categories.find((c) => c.slug === categoryId);
  const media = categoryMedia(categoryId);

  const categoryProducts = useMemo(
    () => catalog.filter((p) => p.category === categoryId),
    [catalog, categoryId]
  );
  const { filters, patch, reset } = useFilterState();
  const results = useMemo(
    () => applyFilters(categoryProducts, filters, { lockCategory: categoryId }),
    [categoryProducts, filters, categoryId]
  );
  const activeCount = activeFilterCount(filters);

  /* Catálogo todavía en camino */
  if (status !== "ready") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <EmptyState
          icon={PackageSearch}
          title="Cargando la colección…"
          description="Estamos preparando los productos de esta categoría."
        />
      </div>
    );
  }

  /* Categoría inexistente o desactivada */
  if (!category) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <EmptyState
          icon={PackageSearch}
          title="Categoría no encontrada"
          description="Esta categoría ya no está disponible. Explora el catálogo completo para seguir comprando."
          ctaLabel="Ir al catálogo"
          ctaHref="/catalogo"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      {/* Banner de categoría */}
      <section className="relative overflow-hidden rounded-[2rem] bg-ink shadow-card">
        {media.banner && (
          <img
            src={media.banner}
            alt={`Categoría ${category.name}`}
            className="h-44 w-full object-cover sm:h-60"
          />
        )}
        {!media.banner && <div className="h-44 w-full sm:h-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.3em] text-white/75">
            CATEGORÍA
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {category.name}
          </h1>
          {media.description && (
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-white/85">
              {media.description}
            </p>
          )}
        </div>
      </section>

      {/* Móvil: filtros en hoja */}
      <div className="mb-6 mt-6 flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? "producto" : "productos"}
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
                products={categoryProducts}
                filters={filters}
                onChange={patch}
                onReset={reset}
                hideCategories
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <FilterControls
              products={categoryProducts}
              filters={filters}
              onChange={patch}
              onReset={reset}
              hideCategories
            />
          </div>
        </aside>

        <div>
          <p className="mb-5 hidden text-sm text-muted-foreground lg:block">
            {results.length} {results.length === 1 ? "producto" : "productos"} en{" "}
            {category.name}
          </p>
          {results.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Nada por aquí"
              description="Ninguna prenda de esta categoría coincide con los filtros. Prueba a ampliar el precio o quitar filtros."
              ctaLabel="Limpiar filtros"
              onCta={reset}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
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
