"use client";

/* ── Router basado en rutas limpias del navegador (sin hash #) ────
   Soporta navegación instantánea mediante HTML5 History API (pushState/popstate),
   intercepción de clics en enlaces internos y compatibilidad retroactiva
   si un usuario aún llega con un hash antiguo (#/catalogo). */

import { useSyncExternalStore } from "react";

export interface Route {
  /** p.ej. "/producto/mj-01" */
  path: string;
  /** p.ej. ["producto", "mj-01"] */
  segments: string[];
  query: URLSearchParams;
  raw: string;
}

function parseLocation(): Route {
  if (typeof window === "undefined") {
    return {
      path: "/",
      segments: [],
      query: new URLSearchParams(),
      raw: "/",
    };
  }

  // Compatibilidad: Si se accede con hash antiguo (p.ej. #/catalogo o /#/admin),
  // se migra limpiamente a la ruta real sin hash.
  if (window.location.hash && window.location.hash.startsWith("#/")) {
    const cleanFromHash = window.location.hash.slice(1);
    window.history.replaceState(null, "", cleanFromHash);
  }

  const pathname = window.location.pathname || "/";
  const search = window.location.search || "";
  const raw = `${pathname}${search}`;
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const segments = path.split("/").filter(Boolean);

  return {
    path,
    segments,
    query: new URLSearchParams(queryPart),
    raw,
  };
}

let lastRaw = "";
let lastRoute: Route | null = null;

function getSnapshot(): Route {
  if (typeof window === "undefined") {
    return {
      path: "/",
      segments: [],
      query: new URLSearchParams(),
      raw: "/",
    };
  }

  const currentRaw = `${window.location.pathname}${window.location.search}`;
  if (currentRaw !== lastRaw || !lastRoute) {
    lastRaw = currentRaw;
    lastRoute = parseLocation();
  }
  return lastRoute;
}

function getServerSnapshot(): Route {
  return {
    path: "/",
    segments: [],
    query: new URLSearchParams(),
    raw: "/",
  };
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
  };
}

/** Hook reactivo a la ruta actual */
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Navega a una ruta interna, p.ej. navigate("/carrito") */
export function navigate(
  to: string,
  opts: { replace?: boolean; keepScroll?: boolean } = {}
) {
  if (typeof window === "undefined") return;

  const target = to.startsWith("/") ? to : `/${to}`;
  const current = `${window.location.pathname}${window.location.search}`;

  if (opts.replace) {
    window.history.replaceState(null, "", target);
  } else if (current !== target) {
    window.history.pushState(null, "", target);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));

  if (!opts.keepScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

/** Enlace interno limpio: href("/catalogo") => "/catalogo" */
export function href(to: string): string {
  if (!to) return "/";
  if (to.startsWith("#/")) return to.slice(1);
  return to.startsWith("/") ? to : `/${to}`;
}

// Interceptor global para que las etiquetas <a href="/..."> naveguen como SPA
if (typeof window !== "undefined") {
  window.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;

    const targetAttr = anchor.getAttribute("target");
    if (targetAttr && targetAttr !== "_self") return;
    if (anchor.hasAttribute("download")) return;

    const rawHref = anchor.getAttribute("href");
    if (!rawHref) return;

    // Solo enlaces internos relativos o del mismo origen
    if (rawHref.startsWith("/") && !rawHref.startsWith("//")) {
      event.preventDefault();
      navigate(rawHref);
    } else {
      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin === window.location.origin) {
          event.preventDefault();
          navigate(`${url.pathname}${url.search}${url.hash}`);
        }
      } catch {
        /* Ignorar urls externas o malformadas */
      }
    }
  });
}
