/* ── Presentación de categorías ──────────────────────────────────
   El API solo guarda nombre y slug de cada categoría. Las imágenes y los
   textos que usa el diseño se mantienen aquí, indexados por slug. */

const img = (id: string) => `/images/products/${id}`;

export interface CategoryMedia {
  tagline?: string;
  description?: string;
  image?: string;
  banner?: string;
}

export const CATEGORY_MEDIA: Record<string, CategoryMedia> = {
  mujer: {
    tagline: "Suave, cálido, versátil",
    description:
      "Punto, gabardinas y básicos en tonos arena para un armario fácil de combinar.",
    image: img("5882c58d7e14.jpg"),
    banner: img("730290d8138f.jpg"),
  },
  hombre: {
    tagline: "Esenciales relajados",
    description:
      "Lino, sobrecamisas y jerséis de silueta holgada en una paleta tierra.",
    image: img("6b3fcbb5d29c.jpg"),
    banner: img("ef2e994d2431.jpg"),
  },
  accesorios: {
    tagline: "El detalle que lo cambia todo",
    description:
      "Bolsos, gorras, relojes y complementos de cuero y tejidos naturales.",
    image: img("62415aa9613f.jpg"),
    banner: img("d024aed8980e.jpg"),
  },
};

export function categoryMedia(slug: string): CategoryMedia {
  return CATEGORY_MEDIA[slug] ?? {};
}
