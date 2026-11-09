import type { NextRequest } from "next/server";
import { renderOrderPreviewResponse } from "@/lib/order-preview-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref")?.trim() || "Pedido";
  const token = request.nextUrl.searchParams.get("d")?.trim() || "";
  return renderOrderPreviewResponse(ref, token);
}
