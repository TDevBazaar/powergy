/* ── WhatsApp: cierre de la solicitud ───────────────────────────
   El API registra el pedido y la tienda abre WhatsApp en una pestaña
   nueva con el detalle y la referencia para continuar la conversación. */

export const WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.trim() || "5359749037";

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

/** Abre WhatsApp en una pestaña nueva (nunca en la actual) */
export function openWhatsApp(message: string): void {
  window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
}
