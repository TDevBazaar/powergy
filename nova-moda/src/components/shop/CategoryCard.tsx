"use client";

import { ChevronRight } from "lucide-react";
import { LazyImage } from "@/components/shop/LazyImage";
import { href } from "@/lib/router";
import { useCategoryPreviewImage } from "@/lib/catalog";
import { categoryMedia } from "@/lib/category-media";
import type { Category } from "@/lib/types";

/** Tarjeta de categoría estilo referencia: etiqueta a la izquierda, imagen a la derecha */
export function CategoryCard({ category }: { category: Category }) {
  const media = categoryMedia(category.slug);
  const fallbackPreview = useCategoryPreviewImage(
    category.slug,
    Boolean(media.image)
  );
  const image = media.image ?? fallbackPreview;

  return (
    <a
      href={href(`/categoria/${category.slug}`)}
      className="group flex items-center justify-between gap-4 overflow-hidden rounded-[1.6rem] bg-card p-4 pl-6 shadow-card transition hover:shadow-soft"
      aria-label={`Categoría ${category.name}`}
    >
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{category.name}</p>
        {media.tagline && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {media.tagline}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-camel-deep">
          Explorar
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-secondary sm:h-28 sm:w-36">
        {image ? (
          <LazyImage
            src={image}
            alt={category.name}
            wrapperClassName="h-full w-full"
            className="group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-secondary/50" />
        )}
      </div>
    </a>
  );
}
