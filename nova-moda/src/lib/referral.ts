import { ApiError, apiGet } from "./powergy-api";
import { normalizeWhatsAppPhone } from "./whatsapp";

/* ── Enlaces de referido por administrador ────────────────────────
   Cuando un cliente entra por ?v=codigo, se recuerda ese código en
   localStorage durante 7 días (último enlace visitado gana) y solo
   al confirmar un pedido el WhatsApp apunta al número de ese admin. */

export const REFERRAL_STORAGE_KEY = "nova-moda-seller-ref";
export const REFERRAL_QUERY_PARAM = "v";
/** Persistencia de 7 días para respetar el enlace compartido */
export const REFERRAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;
const FRESH_CHECKOUT_WINDOW_MS = 60 * 1000;

export interface PublicSellerResponse {
  referralCode: string;
  displayName: string;
  whatsAppPhone: string;
}

export interface StoredReferral {
  code: string;
  displayName?: string;
  whatsAppPhone?: string;
  capturedAt: number;
  expiresAt: number;
  resolvedAt?: number;
}

const VALID_CODE_RE = /^[a-z0-9][a-z0-9_-]{1,39}$/;

export function normalizeReferralCode(raw?: string | null): string | null {
  const clean = raw?.trim().toLowerCase() ?? "";
  return VALID_CODE_RE.test(clean) ? clean : null;
}

export function sanitizeReferralCodeInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[-_]+/, "")
    .slice(0, 40);
}

export function buildShareReferralUrl(
  code: string,
  path = "/",
  originOverride?: string
): string {
  const clean = normalizeReferralCode(code) ?? sanitizeReferralCodeInput(code);
  const origin =
    originOverride ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${cleanPath}?${REFERRAL_QUERY_PARAM}=${encodeURIComponent(clean)}`;
}

export function readStoredReferral(): StoredReferral | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredReferral> | null;
    const code = normalizeReferralCode(parsed?.code);
    if (
      !code ||
      typeof parsed?.expiresAt !== "number" ||
      !Number.isFinite(parsed.expiresAt)
    ) {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }

    const capturedAt =
      typeof parsed.capturedAt === "number" && Number.isFinite(parsed.capturedAt)
        ? parsed.capturedAt
        : Date.now();
    const resolvedAt =
      typeof parsed.resolvedAt === "number" && Number.isFinite(parsed.resolvedAt)
        ? parsed.resolvedAt
        : undefined;
    const displayName =
      typeof parsed.displayName === "string" && parsed.displayName.trim()
        ? parsed.displayName.trim()
        : undefined;
    const whatsAppPhone =
      normalizeWhatsAppPhone(parsed.whatsAppPhone) ?? undefined;

    return {
      code,
      displayName,
      whatsAppPhone,
      capturedAt,
      expiresAt: parsed.expiresAt,
      resolvedAt,
    };
  } catch {
    return null;
  }
}

function writeStoredReferral(entry: StoredReferral | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!entry) {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
    } else {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(entry));
    }
  } catch {
    /* Ignorar si el almacenamiento está restringido */
  }
}

const inFlightLookups = new Map<string, Promise<StoredReferral | null>>();

export function resolveSellerByCode(
  code: string
): Promise<StoredReferral | null> {
  const cleanCode = normalizeReferralCode(code);
  if (!cleanCode || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  const pending = inFlightLookups.get(cleanCode);
  if (pending) return pending;

  const task = (async (): Promise<StoredReferral | null> => {
    try {
      const seller = await apiGet<PublicSellerResponse>(
        `sellers/${encodeURIComponent(cleanCode)}`
      );
      const phone = normalizeWhatsAppPhone(seller.whatsAppPhone);
      const latest = readStoredReferral();
      // Si mientras cargaba el visitante entró por otro enlace, no pisamos el nuevo
      if (latest && latest.code !== cleanCode) {
        return latest;
      }

      if (!phone) {
        if (latest?.code === cleanCode) writeStoredReferral(null);
        return null;
      }

      const now = Date.now();
      const updated: StoredReferral = {
        code: cleanCode,
        displayName: seller.displayName?.trim() || cleanCode,
        whatsAppPhone: phone,
        capturedAt: latest?.code === cleanCode ? latest.capturedAt : now,
        expiresAt:
          latest?.code === cleanCode ? latest.expiresAt : now + REFERRAL_TTL_MS,
        resolvedAt: now,
      };
      writeStoredReferral(updated);
      return updated;
    } catch (error) {
      const latest = readStoredReferral();
      if (error instanceof ApiError && error.status === 404) {
        if (latest?.code === cleanCode) {
          writeStoredReferral(null);
        }
        return null;
      }
      return latest?.code === cleanCode ? latest : null;
    } finally {
      inFlightLookups.delete(cleanCode);
    }
  })();

  inFlightLookups.set(cleanCode, task);
  return task;
}

export function captureReferralFromUrl(): StoredReferral | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = normalizeReferralCode(params.get(REFERRAL_QUERY_PARAM));
  const existing = readStoredReferral();

  if (fromUrl) {
    const now = Date.now();
    const isSameCode = existing?.code === fromUrl;
    const entry: StoredReferral = {
      code: fromUrl,
      displayName: isSameCode ? existing.displayName : undefined,
      whatsAppPhone: isSameCode ? existing.whatsAppPhone : undefined,
      capturedAt: now,
      expiresAt: now + REFERRAL_TTL_MS,
      resolvedAt: isSameCode ? existing.resolvedAt : undefined,
    };
    writeStoredReferral(entry);
    void resolveSellerByCode(fromUrl);
    return entry;
  }

  if (existing) {
    const isStale =
      !existing.whatsAppPhone ||
      !existing.resolvedAt ||
      Date.now() - existing.resolvedAt > REVALIDATE_INTERVAL_MS;
    if (isStale) {
      void resolveSellerByCode(existing.code);
    }
    return existing;
  }

  return null;
}

export async function resolveActiveReferralForCheckout(
  timeoutMs = 1500
): Promise<StoredReferral | null> {
  if (typeof window === "undefined") return null;

  captureReferralFromUrl();
  const stored = readStoredReferral();
  if (!stored) return null;

  if (
    stored.whatsAppPhone &&
    stored.resolvedAt &&
    Date.now() - stored.resolvedAt < FRESH_CHECKOUT_WINDOW_MS
  ) {
    return stored;
  }

  return Promise.race([
    resolveSellerByCode(stored.code),
    new Promise<StoredReferral | null>((resolve) =>
      window.setTimeout(() => resolve(readStoredReferral()), timeoutMs)
    ),
  ]);
}
