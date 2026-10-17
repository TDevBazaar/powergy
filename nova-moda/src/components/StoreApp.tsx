"use client";

import { useState, useSyncExternalStore } from "react";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Footer } from "@/components/layout/Footer";
import { HomeView } from "@/components/views/HomeView";
import { CatalogView } from "@/components/views/CatalogView";
import { CategoryView } from "@/components/views/CategoryView";
import { ProductDetailView } from "@/components/views/ProductDetailView";
import { SearchView } from "@/components/views/SearchView";
import { FavoritesView } from "@/components/views/FavoritesView";
import { CartView } from "@/components/views/CartView";
import { CheckoutView } from "@/components/views/CheckoutView";
import { ContactView } from "@/components/views/ContactView";
import { AdminView } from "@/components/views/AdminView";
import { EmptyState } from "@/components/shop/EmptyState";
import { useRoute } from "@/lib/router";
import { Compass } from "lucide-react";

function NotFoundView() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <EmptyState
        icon={Compass}
        title="Página no encontrada"
        description="La dirección que buscas no existe. Vuelve al inicio para seguir explorando la tienda."
        ctaLabel="Volver al inicio"
        ctaHref="/"
      />
    </div>
  );
}

function CurrentView() {
  const route = useRoute();
  const [root, second] = route.segments;

  switch (root) {
    case undefined:
      return <HomeView />;
    case "catalogo":
      return <CatalogView initialCat={route.query.get("cat")} />;
    case "buscar":
      return <SearchView initialQuery={route.query.get("q") ?? ""} />;
    case "categoria": {
      const id = second;
      return id ? <CategoryView categoryId={id} /> : <NotFoundView />;
    }
    case "producto":
      return second ? <ProductDetailView productId={second} /> : <NotFoundView />;
    case "favoritos":
      return <FavoritesView />;
    case "carrito":
      return <CartView />;
    case "pedido":
      return <CheckoutView />;
    case "contacto":
      return <ContactView />;
    case "admin":
      return <AdminView />;
    default:
      return <NotFoundView />;
  }
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function StoreApp() {
  const [menuOpen, setMenuOpen] = useState(false);
  // true solo en cliente: evita desajustes de hidratación con el estado
  // persistido (carrito, favoritos) de Zustand.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  // Evita desajustes de hidratación con el estado persistido (carrito, favoritos)
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-foreground text-lg font-bold text-background">
            N
          </span>
          <span className="text-[11px] font-medium tracking-[0.35em] text-muted-foreground">
            NOVA MODA
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header onOpenMenu={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex-1">
        <CurrentView />
      </main>
      <Footer />
    </div>
  );
}
