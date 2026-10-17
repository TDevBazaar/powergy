"use client";

/* ── Mini-router basado en hash ──────────────────────────────────
   El preview del entorno expone únicamente la ruta "/", así que la
   tienda completa navega con hashes (#/catalogo, #/carrito, …).
   Migrar a rutas reales del App Router es trivial: cada vista ya es
   un componente independiente (src/components/views/*). */

import { useSyncExternalStore } from "react";

export interface Route {
  /** p.ej. "/producto/mj-01" */
  path: string;
  /** p.ej. ["producto", "mj-01"] */
  segments: string[];
  query: URLSearchParams;
  raw: string;
}

function parse(rawHash: string): Route {
  let h = rawHash.replace(/^#/, "");
  if (!h.startsWith("/")) h = `/${h}`;
  const [pathPart, queryPart = ""] = h.split("?");
  const path = pathPart || "/";
  const segments = path.split("/").filter(Boolean);
  return { path, segments, query: new URLSearchParams(queryPart), raw: h };
}

let lastRaw = "";
let lastRoute: Route | null = null;

function getSnapshot(): Route {
  const raw = typeof window === "undefined" ? "#/" : window.location.hash;
  if (raw !== lastRaw || !lastRoute) {
    lastRaw = raw;
    lastRoute = parse(raw);
  }
  return lastRoute;
}

function getServerSnapshot(): Route {
  return parse("#/");
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

/** Hook reactivo al hash actual */
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Navega a una ruta interna, p.ej. navigate("/carrito") */
export function navigate(
  to: string,
  opts: { replace?: boolean; keepScroll?: boolean } = {}
) {
  const target = `#${to.startsWith("/") ? to : `/${to}`}`;
  if (opts.replace) {
    window.history.replaceState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = target;
  }
  if (!opts.keepScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

/** Enlace interno con <a href="#/..."> (accesible y clic con botón central) */
export function href(to: string): string {
  return `#${to.startsWith("/") ? to : `/${to}`}`;
}
