"use client";

import { useCallback } from "react";
import { PackageSearch, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { LazyImage } from "@/components/shop/LazyImage";
import { ProductGridSkeleton } from "@/components/shop/Skeletons";
import { EmptyState } from "@/components/shop/EmptyState";
import { FilterControls } from "@/components/shop/FilterControls";
import { PaginationControls } from "@/components/shop/PaginationControls";
import { useFilterState } from "@/components/shop/useFilterState";
import {
  activeFilterCount,
  priceCeilingFromMax,
  useCatalogMeta,
  useCategories,
  useCategoriesStatus,
} from "@/lib/catalog";
import { useCatalogFeed } from "@/lib/useCatalogFeed";
import { categoryMedia } from "@/lib/category-media";
import type { CategoryId } from "@/lib/types";

export function CategoryView({ categoryId }: { categoryId: CategoryId }) {
  const categories = useCategories();
  const categoriesStatus = useCategoriesStatus();
  const meta = useCatalogMeta();

  const category = categories.find((c) => c.slug === categoryId);
  const media = categoryMedia(categoryId);

  const { filters, patch, reset } = useFilterState();
  const feed = useCatalogFeed({
    filters,
    lockedCategory: categoryId,
    ready: Boolean(category) || categoriesStatus === "error",
    pageSize: 20,
  });

  const handlePageChange = useCallback(
    (nextPage: number) => {
      feed.setPage(nextPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [feed]
  );

  const activeCount = activeFilterCount(filters);
  const maxPriceCeiling = priceCeilingFromMax(meta?.maxPriceUsd);
  const totalDisplay = feed.totalItems ?? feed.items.length;

  /* Categorías todavía cargando */
  if (
    (categoriesStatus === "idle" || categoriesStatus === "loading") &&
    !category
  ) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <div className="h-44 w-full animate-pulse rounded-[2rem] bg-secondary sm:h-60" />
        <div className="mt-8">
          <ProductGridSkeleton
            count={6}
            columns="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
          />
        </div>
      </div>
    );
  }

  /* Categoría inexistente o desactivada */
  if (categoriesStatus === "ready" && !category) {
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
          <LazyImage
            src={media.banner}
            alt={`Categoría ${category?.name ?? ""}`}
            priority
            wrapperClassName="h-44 w-full bg-ink sm:h-60"
          />
        )}
        {!media.banner && <div className="h-44 w-full sm:h-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.3em] text-white/75">
            CATEGORÍA
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {category?.name ?? "Categoría"}
          </h1>
          {media.description && (
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-white/85">
              {media.description}
            </p>
          )}
        </div>
      </section>

      {/* Móvil: hoja de filtros */}
      <div className="mt-6 flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-muted-foreground">
          {feed.loadingInitial
            ? "Cargando prendas…"
            : `${totalDisplay} ${totalDisplay === 1 ? "producto" : "productos"}`}
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
          <SheetContent
            side="left"
            className="w-[88%] max-w-sm overflow-y-auto px-5 pt-12 pb-8"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <FilterControls
              maxPriceCeiling={maxPriceCeiling}
              filters={filters}
              onChange={patch}
              onReset={reset}
              hideCategories
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <FilterControls
              maxPriceCeiling={maxPriceCeiling}
              filters={filters}
              onChange={patch}
              onReset={reset}
              hideCategories
            />
          </div>
        </aside>

        <div>
          <p className="mb-5 hidden text-sm text-muted-foreground lg:block">
            {feed.loadingInitial
              ? "Cargando prendas…"
              : `${totalDisplay} ${totalDisplay === 1 ? "producto" : "productos"} en ${
                  category?.name ?? ""
                }`}
          </p>

          {feed.loadingInitial ? (
            <ProductGridSkeleton
              count={8}
              columns="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
            />
          ) : feed.error ? (
            <EmptyState
              icon={PackageSearch}
              title="No se pudieron cargar las prendas"
              description={feed.error}
              ctaLabel="Reintentar"
              onCta={feed.retry}
            />
          ) : feed.items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Nada por aquí"
              description="Ninguna prenda de esta categoría coincide con los filtros. Prueba a ampliar el precio o quitar filtros."
              ctaLabel="Limpiar filtros"
              onCta={reset}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
                {feed.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <PaginationControls
                page={feed.page}
                totalPages={feed.totalPages}
                totalItems={feed.totalItems ?? 0}
                pageSize={feed.pageSize}
                onPageChange={handlePageChange}
                disabled={feed.loadingInitial}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
