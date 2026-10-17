import { NextRequest } from "next/server";
import { NOVA_STORE } from "@/lib/powergy-api";

/* ── Proxy hacia el API de POWERGY ──────────────────────────────
   Todas las llamadas de la tienda salen por aquí: así el navegador no
   necesita CORS, el API recibe siempre la tienda "nova-moda" y el token
   de Supabase del panel admin se reenvía tal cual. */

const API_BASE = (
  process.env.POWERGY_API_URL?.trim() || "https://powergy.somee.com"
).replace(/\/+$/, "");

/** Rutas cuyo cuerpo admite la propiedad `store`. */
function acceptsStoreInBody(path: string[], method: string): boolean {
  const [root] = path;
  if (root === "orders") return path.length === 1 && method === "POST";
  if (root === "products" || root === "categories") {
    return (path.length === 1 && method === "POST") ||
      (path.length === 2 && method === "PUT");
  }
  return false;
}

async function forward(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const upstream = new URL(`${API_BASE}/api/${path.join("/")}`);
  upstream.search = request.nextUrl.search;
  if (!upstream.searchParams.has("store")) {
    upstream.searchParams.set("store", NOVA_STORE);
  }

  const headers = new Headers({ Accept: "application/json" });
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);

  let body: ArrayBuffer | string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const raw = await request.arrayBuffer();
    const contentType = request.headers.get("content-type") ?? "";
    if (raw.byteLength > 0 && acceptsStoreInBody(path, request.method)) {
      try {
        const payload = JSON.parse(new TextDecoder().decode(raw)) as Record<
          string,
          unknown
        >;
        if (!payload.store) payload.store = NOVA_STORE;
        body = JSON.stringify(payload);
        headers.set("Content-Type", "application/json");
      } catch {
        body = raw;
        if (contentType) headers.set("Content-Type", contentType);
      }
    } else {
      body = raw.byteLength > 0 ? raw : undefined;
      if (contentType) headers.set("Content-Type", contentType);
    }
  }

  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { detail: "No se pudo contactar con el servicio de la tienda." },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(request, context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(request, context.params);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(request, context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forward(request, context.params);
}
