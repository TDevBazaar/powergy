"use client";

/* ── Estado global de la tienda ──────────────────────────────────
   Zustand + localStorage para lo único que vive en el navegador: el
   carrito y los favoritos. El catálogo, las categorías y las solicitudes
   vienen del API (ver catalog-store.ts). */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "./types";

interface NovaState {
  cart: CartItem[];
  favorites: string[];

  addToCart: (item: CartItem) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;

  toggleFavorite: (productId: string) => void;
}

export const useNova = create<NovaState>()(
  persist(
    (set) => ({
      cart: [],
      favorites: [],

      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find(
            (line) => line.productId === item.productId
          );
          if (existing) {
            return {
              cart: state.cart.map((line) =>
                line.productId === item.productId
                  ? { ...line, qty: line.qty + item.qty }
                  : line
              ),
            };
          }
          return { cart: [...state.cart, item] };
        }),

      setQty: (productId, qty) =>
        set((state) => ({
          cart: state.cart
            .map((line) =>
              line.productId === productId
                ? { ...line, qty: Math.max(0, qty) }
                : line
            )
            .filter((line) => line.qty > 0),
        })),

      removeItem: (productId) =>
        set((state) => ({
          cart: state.cart.filter((line) => line.productId !== productId),
        })),

      clearCart: () => set({ cart: [] }),

      toggleFavorite: (productId) =>
        set((state) => ({
          favorites: state.favorites.includes(productId)
            ? state.favorites.filter((id) => id !== productId)
            : [...state.favorites, productId],
        })),
    }),
    {
      name: "nova-moda-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    }
  )
);
