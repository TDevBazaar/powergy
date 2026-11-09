import type { NextRequest } from "next/server";
import { renderOrderPreviewResponse } from "@/lib/order-preview-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ref: string }> }
) {
  const { ref } = await context.params;
  let cleanRef = "Pedido";
  try {
    cleanRef = decodeURIComponent(ref).trim() || "Pedido";
  } catch {
    cleanRef = ref.trim() || "Pedido";
  }
  const token = request.nextUrl.searchParams.get("d")?.trim() || "";
  return renderOrderPreviewResponse(cleanRef, token);
}

