/* ── WhatsApp: cierre de la solicitud ───────────────────────────
   El API registra el pedido y la tienda abre WhatsApp en una pestaña
   nueva con el detalle y la referencia para continuar la conversación. */

export const WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.trim() || "5359749037";

/** Deja solo dígitos (7-15) para enlaces wa.me válidos; null si el formato es inválido. */
export function normalizeWhatsAppPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/[^0-9+\-().\s]/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

export function whatsappUrl(
  message: string,
  phoneOverride?: string | null
): string {
  const target = normalizeWhatsAppPhone(phoneOverride) ?? WHATSAPP_PHONE;
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

/** Abre WhatsApp en una pestaña nueva (nunca en la actual) */
export function openWhatsApp(
  message: string,
  phoneOverride?: string | null
): void {
  window.open(whatsappUrl(message, phoneOverride), "_blank", "noopener,noreferrer");
}
