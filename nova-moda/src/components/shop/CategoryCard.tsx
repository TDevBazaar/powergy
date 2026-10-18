"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { href } from "@/lib/router";
import { useCatalog } from "@/lib/catalog";
import { categoryMedia } from "@/lib/category-media";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Tarjeta de categoría estilo referencia: etiqueta a la izquierda, imagen a la derecha */
export function CategoryCard({ category }: { category: Category }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const catalog = useCatalog();
  const media = categoryMedia(category.slug);
  const image =
    media.image ??
    catalog.find((p) => p.category === category.slug)?.image ??
    "";

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
        {!imgLoaded && image ? (
          <div className="absolute inset-0 animate-pulse bg-secondary/80" />
        ) : null}
        {image ? (
          <img
            src={image}
            alt={category.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={cn(
              "h-full w-full object-cover transition-all duration-700 group-hover:scale-105",
              imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
          />
        ) : (
          <div className="h-full w-full bg-secondary/50" />
        )}
      </div>
    </a>
  );
}
