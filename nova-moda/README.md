# NOVA MODA | Ropa y Accesorios

Tienda online de moda construida con **Next.js (App Router) + TypeScript +
Tailwind CSS**. El catálogo, las categorías y las solicitudes viven en el
**API de POWERGY** (`store = nova-moda`) compartiendo base de datos con la
tienda de energía; el carrito y los favoritos se guardan en el navegador.

## Qué incluye

| Página                  | Cómo se accede                | Qué hace |
|-------------------------|-------------------------------|----------|
| Inicio                  | menú o `#/`                   | Hero editorial, categorías reales, novedades y ofertas del catálogo |
| Catálogo                | `#/catalogo`                  | Todo el catálogo con búsqueda y filtros (categoría, precio, ofertas) |
| Categorías              | menú o `#/categoria/mujer`    | Catálogo por categoría, cargado desde el API |
| Detalle de producto     | tocando cualquier producto    | Imagen, descripción, cantidad, favoritos y añadir al carrito |
| Búsqueda                | icono de la lupa              | Buscador con sugerencias reales y filtros |
| Favoritos               | corazón del menú              | Lista de prendas guardadas en el navegador |
| Carrito                 | bolsa del menú                | Cantidades editables y barra de progreso de **envío gratis desde $75** |
| Formulario de pedido    | desde el carrito              | Registra la solicitud en el API (con `idempotencyKey`), muestra la referencia `NM-…` y abre **WhatsApp en una pestaña nueva** |
| Contacto                | menú                          | Datos de la tienda, FAQ y formulario que abre WhatsApp |
| Panel de administración | enlace **Admin** o `#/admin`  | Login con Supabase, KPIs, CRUD de productos y categorías, imágenes en Storage y cierre de solicitudes (vendida o cancelada) |

> NOVA MODA no publica tallas, colores, materiales, stock ni valoraciones: el
> catálogo del API solo guarda la ficha básica. Los productos con precio `0` o
> vacío se muestran como **«Consultar»** y se confirman por WhatsApp.

## Cómo ejecutarlo

Necesitas **Node.js 18 o superior**.

```bash
# 1) Dependencias (solo la primera vez)
npm install

# 2) Configura el entorno
copy .env.example .env.local

# 3) Arranca la tienda
npm run dev
```

Abre **http://localhost:3000**.

### Variables de entorno

| Variable | Para qué sirve |
|----------|----------------|
| `POWERGY_API_URL` | URL del API (por defecto `https://powergy.somee.com`). La usa el proxy del servidor. |
| `NEXT_PUBLIC_NOVA_STORE` | Tienda que se consulta en el API (por defecto `nova-moda`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Proyecto Supabase, para el login del panel `/admin`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon/publishable del proyecto. |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Bucket donde se suben las imágenes (por defecto `powergy-product-images`). |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | Número que recibe los pedidos (solo dígitos, con código de país). |

### Versión de producción

```bash
npm run build
npm start
```

## Cómo habla con el API

- **Un único proxy** en `src/app/api/powergy/[...path]/route.ts` reenvía todas
  las llamadas al API y añade `store=nova-moda`: así no hay que configurar CORS
  en el servidor y el token de Supabase del panel viaja tal cual.
- `src/lib/powergy-api.ts` tiene los contratos y el mapeo al modelo de la
  tienda; `src/lib/catalog-store.ts` guarda el catálogo en memoria (zustand) y
  `src/lib/admin-api.ts` reúne las llamadas del panel.
- Las categorías, los precios y los productos se cambian **desde el panel**
  (`/admin`) o desde el API; no hay catálogo local.
- `src/lib/category-media.ts` guarda solo los textos e imágenes decorativas de
  las categorías (tagline, descripción y banner); el nombre y el slug vienen
  del API.
- Al finalizar una solicitud en el panel, el API permite ajustar cantidades y
  precio final, quitar líneas y dejarla como vendida o cancelada con motivo.

## Estructura

```
nova-moda/
├── .env.example         # Plantilla de variables de entorno
├── src/
│   ├── app/             # App Router (layout, página y el proxy del API)
│   ├── components/
│   │   ├── views/       # Vistas de la tienda (una por página) + AdminView
│   │   ├── layout/      # Header, menú móvil y footer
│   │   ├── shop/        # Tarjetas, filtros, steppers…
│   │   └── ui/          # Componentes base (shadcn/ui)
│   └── lib/             # API, catálogo, filtros, carrito (zustand) y helpers
└── public/images/       # Fotografías incluidas
```

## Notas

- El carrito y los favoritos se guardan en `localStorage` (clave
  `nova-moda-v1`); el resto se lee siempre del API.
- Las categorías iniciales (Mujer, Hombre y Accesorios) las siembra la
  migración `20261017211644_SeedNovaModaCategories` del API; puedes renombrarlas
  o desactivarlas desde el panel.
- El pedido se registra en el API con su referencia (`NM-…`) y el mensaje de
  WhatsApp lleva el detalle y los datos de entrega escritos en el formulario.
