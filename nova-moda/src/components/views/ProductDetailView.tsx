"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Heart,
  PackageOpen,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "@/components/shop/ProductCard";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { SectionTitle } from "@/components/shop/Bits";
import { EmptyState } from "@/components/shop/EmptyState";
import { useCatalog, productById } from "@/lib/catalog";
import { categoryMedia } from "@/lib/category-media";
import { formatPriceLabel } from "@/lib/format";
import { href, navigate } from "@/lib/router";
import { useNova } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProductDetailView({ productId }: { productId: string }) {
  const catalog = useCatalog();
  const product = productById(catalog, productId);

  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);

  const toggleFavorite = useNova((s) => s.toggleFavorite);
  const addToCart = useNova((s) => s.addToCart);
  const isFavorite = useNova((s) => s.favorites.includes(productId));

  const related = useMemo(
    () =>
      product
        ? catalog
            .filter((p) => p.category === product.category && p.id !== product.id)
            .slice(0, 4)
        : [],
    [catalog, product]
  );

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <EmptyState
          icon={PackageOpen}
          title="Producto no encontrado"
          description="Este artículo ya no está disponible. Explora el catálogo para descubrir más piezas."
          ctaLabel="Ir al catálogo"
          ctaHref="/catalogo"
        />
      </div>
    );
  }

  const sinPrecio = !(product.price > 0);
  const media = categoryMedia(product.category);

  const handleAdd = () => {
    addToCart({ productId: product.id, qty });
    toast.success("Añadido al carrito", {
      description: sinPrecio
        ? `${product.name} · el precio se confirma por WhatsApp`
        : `${product.name} · ${formatPriceLabel(product.price)}`,
      action: {
        label: "Ver carrito",
        onClick: () => navigate("/carrito"),
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      {/* Volver + ruta */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-4 py-2 text-[13px] font-medium shadow-card transition hover:border-camel"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <nav aria-label="Ruta" className="hidden text-xs text-muted-foreground sm:block">
          <a href={href("/")} className="hover:text-foreground">Inicio</a>
          <span className="mx-1.5">/</span>
          <a href={href(`/categoria/${product.category}`)} className="hover:text-foreground">
            {product.categoryName}
          </a>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* ── Galería ───────────────────────────────────────── */}
        <div>
          <div className="relative overflow-hidden rounded-[2rem] bg-secondary aspect-[4/5] shadow-card">
            {product.images.length > 0 ? (
              <img
                key={imgIndex}
                src={product.images[imgIndex]}
                alt={`${product.name} — imagen ${imgIndex + 1}`}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImgIndex(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  className={cn(
                    "h-20 w-16 overflow-hidden rounded-2xl border-2 transition sm:h-24 sm:w-20",
                    i === imgIndex
                      ? "border-camel-deep"
                      : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Información ───────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold tracking-wide">
              {product.categoryName}
              {media.tagline && ` · ${media.tagline}`}
            </span>
            {product.badge && (
              <span className="rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold text-background">
                {product.badge === "populares" ? "Populares" : "Oferta"}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {product.brand && <span>{product.brand}</span>}
            {product.brand && product.model && <span>·</span>}
            {product.model && <span>{product.model}</span>}
            {product.subcategory && (
              <>
                <span>·</span>
                <span className="capitalize">{product.subcategory}</span>
              </>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span
              className={cn(
                "text-3xl font-bold tracking-tight",
                sinPrecio && "text-camel-deep"
              )}
            >
              {formatPriceLabel(product.price)}
            </span>
          </div>
          {sinPrecio && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              Te confirmamos el precio por WhatsApp antes de cerrar la compra.
            </p>
          )}

          <p className="mt-5 text-[14.5px] leading-relaxed text-foreground/80">
            {product.description}
          </p>

          {/* Cantidad + acciones */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={99} />
            <button
              type="button"
              onClick={handleAdd}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-foreground/90 min-w-52"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              Añadir al carrito
            </button>
            <button
              type="button"
              onClick={() => {
                toggleFavorite(product.id);
                toast.success(
                  isFavorite ? "Quitado de favoritos" : "Añadido a favoritos"
                );
              }}
              aria-label="Alternar favorito"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-input bg-card shadow-card transition hover:border-camel"
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  isFavorite && "fill-[#B3402E] text-[#B3402E]"
                )}
              />
            </button>
          </div>

          {/* Información adicional */}
          <Accordion type="single" collapsible className="mt-8 rounded-[1.4rem] bg-card px-5 shadow-card">
            <AccordionItem value="detalles" className="border-border/70">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-camel-deep" /> Detalles del producto
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-[13px] leading-relaxed text-muted-foreground">
                <dl className="space-y-1.5">
                  <div className="flex gap-2">
                    <dt className="min-w-28 text-foreground/70">Categoría</dt>
                    <dd>{product.categoryName}</dd>
                  </div>
                  {product.subcategory && (
                    <div className="flex gap-2">
                      <dt className="min-w-28 text-foreground/70">Subcategoría</dt>
                      <dd className="capitalize">{product.subcategory}</dd>
                    </div>
                  )}
                  {product.brand && (
                    <div className="flex gap-2">
                      <dt className="min-w-28 text-foreground/70">Marca</dt>
                      <dd>{product.brand}</dd>
                    </div>
                  )}
                  {product.model && (
                    <div className="flex gap-2">
                      <dt className="min-w-28 text-foreground/70">Modelo</dt>
                      <dd>{product.model}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="min-w-28 text-foreground/70">Referencia</dt>
                    <dd className="font-mono text-[12px]">{product.id}</dd>
                  </div>
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="envio" className="border-border/70">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-camel-deep" /> Envíos y devoluciones
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-[13px] leading-relaxed text-muted-foreground">
                Coordinamos la entrega por WhatsApp al confirmar tu pedido.
                Consulta disponibilidad, tiempos y forma de pago en la misma
                conversación.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* ── Relacionados ──────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="mt-16">
          <SectionTitle title="También te puede gustar" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
