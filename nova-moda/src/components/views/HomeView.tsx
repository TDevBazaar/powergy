"use client";

import { ArrowRight, Search, ShoppingBag, Sparkles, Truck, Undo2 } from "lucide-react";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { ProductCard } from "@/components/shop/ProductCard";
import { SectionTitle } from "@/components/shop/Bits";
import { CategoryGridSkeleton, ProductGridSkeleton } from "@/components/shop/Skeletons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCatalog, useCategories, useCategoriesStatus, useProductsStatus } from "@/lib/catalog";
import { formatPriceLabel } from "@/lib/format";
import { href, navigate } from "@/lib/router";

export function HomeView() {
  const catalog = useCatalog();
  const categories = useCategories();
  const categoriesStatus = useCategoriesStatus();
  const productsStatus = useProductsStatus();

  const featured = catalog.filter((p) => p.featured).slice(0, 8);
  const news = [...catalog]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6);
  const promo =
    catalog.find((p) => p.badge === "oferta") ??
    catalog.find((p) => p.featured) ??
    catalog[0];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mt-4 overflow-hidden rounded-[2rem] bg-cream-deep sm:mt-6">
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:p-14">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-camel-deep shadow-card">
              <Sparkles className="h-3.5 w-3.5" />
              COLECCIÓN OTOÑO
            </span>
            <h1 className="text-balance mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Ropa y accesorios que abrazan tu estilo
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Punto suave, gabardinas y complementos en una paleta cálida de
              crema, arena y camel. Explora la colección y cierra tu pedido
              por WhatsApp.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 rounded-full px-7 text-sm font-medium"
              >
                <a href={href("/catalogo")}>
                  Explorar catálogo
                  <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              {categories[0] && (
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-full border-foreground/25 bg-card px-7 text-sm font-medium hover:bg-card hover:border-foreground"
                >
                  <a href={href(`/categoria/${categories[0].slug}`)}>
                    Nuevo en {categories[0].name}
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[1.8rem] shadow-soft sm:aspect-[5/5]">
              <img
                src="/images/products/30cae5992ef4.jpg"
                alt="Editorial de moda NOVA MODA"
                className="h-full w-full object-cover"
              />
            </div>
            {promo && (
              <button
                type="button"
                onClick={() => navigate(`/producto/${promo.id}`)}
                className="absolute -bottom-4 left-2 flex items-center gap-3 rounded-3xl bg-card p-3 pr-5 text-left shadow-soft transition hover:scale-[1.02] sm:left-6"
              >
                <img
                  src={promo.images[0]}
                  alt={promo.name}
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <span>
                  <span className="block text-[13px] font-semibold">
                    {promo.name}
                  </span>
                  <span className="mt-0.5 block text-[13px] font-bold text-camel-deep">
                    {formatPriceLabel(promo.price)}
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Categorías (Carga rápida independiente) ──────────── */}
      <section className="mt-14">
        <SectionTitle
          title="Categorías"
          action={
            <a
              href={href("/catalogo")}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-camel-deep hover:underline"
            >
              Ver todo <ArrowRight className="h-3.5 w-3.5" />
            </a>
          }
        />
        {categoriesStatus === "loading" && categories.length === 0 ? (
          <CategoryGridSkeleton count={3} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        )}
      </section>

      {/* ── Lo más popular hoy ───────────────────────────────── */}
      <section className="mt-14">
        <SectionTitle title="The most popular clothes today" />
        <button
          type="button"
          onClick={() => navigate("/buscar")}
          className="mb-7 flex h-12 w-full items-center gap-3 rounded-full border border-input bg-card px-5 text-left text-sm text-muted-foreground shadow-card transition hover:border-camel"
          aria-label="Ir a la búsqueda de productos"
        >
          <Search className="h-4 w-4" />
          Buscar sudadera, gabardina, bolso…
        </button>

        {productsStatus === "loading" && featured.length === 0 ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── Novedades en scroll horizontal ───────────────────── */}
      <section className="mt-14">
        <SectionTitle
          title="Recién llegados"
          action={
            <a
              href={href("/catalogo")}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-camel-deep hover:underline"
            >
              Ver novedades <ArrowRight className="h-3.5 w-3.5" />
            </a>
          }
        />
        {productsStatus === "loading" && news.length === 0 ? (
          <ProductGridSkeleton count={4} columns="grid-cols-2 sm:grid-cols-4" />
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {news.map((p) => (
              <div
                key={p.id}
                className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[23%]"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Beneficios ───────────────────────────────────────── */}
      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Truck,
            title: "Envío estándar para hoy mismo",
            text: "Te confirmamos el costo exacto y entrega directamente por WhatsApp.",
          },
          {
            icon: Undo2,
            title: "Atención personalizada",
            text: "Escríbenos por WhatsApp y resolvemos todas tus dudas y pedidos.",
          },
          {
            icon: ShoppingBag,
            title: "Cierre por WhatsApp",
            text: "Registramos tu pedido y confirmamos pago y entrega en la conversación.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-[1.4rem] bg-card p-5 shadow-card"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Icon className="h-5 w-5 text-camel-deep" />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {text}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Editorial ────────────────────────────────────────── */}
      <section className="mt-14 grid gap-4 md:grid-cols-2">
        {[
          {
            title: "Esenciales Mujer",
            to: "/categoria/mujer",
            image: "/images/products/730290d8138f.jpg",
          },
          {
            title: "Esenciales Hombre",
            to: "/categoria/hombre",
            image: "/images/products/b590d2b4f137.jpg",
          },
        ].map((block) => (
          <a
            key={block.to}
            href={href(block.to)}
            className="group relative flex h-56 items-end overflow-hidden rounded-[1.8rem] shadow-card sm:h-64"
          >
            <img
              src={block.image}
              alt={block.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="relative flex w-full items-center justify-between p-6">
              <p className="text-lg font-semibold text-white">{block.title}</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground transition group-hover:translate-x-1">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        ))}
      </section>

      {/* ── Newsletter ───────────────────────────────────────── */}
      <section className="mt-14 overflow-hidden rounded-[2rem] bg-foreground px-6 py-12 text-center text-background sm:px-10">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Únete a la lista de NOVA
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-background/70">
          Recibe novedades y ofertas de la colección.
        </p>
        <form
          className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            (e.target as HTMLFormElement).reset();
            toast.success("¡Gracias por suscribirte!", {
              description: "Te avisaremos cuando lleguen novedades.",
            });
          }}
        >
          <input
            type="email"
            required
            placeholder="tu@correo.com"
            aria-label="Correo electrónico"
            className="h-12 flex-1 rounded-full border border-background/20 bg-background/10 px-5 text-sm text-background placeholder:text-background/50 focus:outline-none focus:ring-2 focus:ring-camel"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-background px-7 text-sm font-semibold text-foreground transition hover:bg-cream-deep"
          >
            Suscribirme
          </button>
        </form>
      </section>
    </div>
  );
}
