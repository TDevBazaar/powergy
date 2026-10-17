# NOVA MODA | Ropa y Accesorios — Tienda Demo (v1)

Tienda online de moda **completa y funcional**, construida con
**Next.js (App Router) + TypeScript + Tailwind CSS**, con diseño responsive
(móvil y escritorio), imágenes incluidas y **productos 100 % ficticios**.

> Proyecto de demostración: no hay pagos reales, ni stock real, ni envíos reales.

## Qué incluye

| Página                  | Cómo se accede                | Qué hace |
|-------------------------|-------------------------------|----------|
| Inicio                  | menú o `#/`                   | Hero editorial, producto destacado, categorías, ofertas y mejores valorados |
| Catálogo                | `#/catalogo`                  | Los 26 productos con búsqueda y filtros (talla, color, precio, ofertas) |
| Mujer / Hombre / Accesorios | menú o `#/mujer`, `#/hombre`, `#/accesorios` | Catálogo por categoría |
| Detalle de producto     | tocando cualquier producto    | Galería, selector de **talla y color**, cantidad, favoritos, añadir al carrito |
| Búsqueda                | icono de la lupa              | Buscador con filtros |
| Favoritos               | corazón del menú              | Lista de prendas guardadas |
| Carrito                 | bolsa del menú                | Cantidades editables, barra de progreso de **envío gratis desde $75** |
| Formulario de pedido    | desde el carrito              | Validación completa, métodos de envío, pedido registrado (demo) |
| Contacto                | menú                          | Datos de la tienda y FAQ |
| Panel de administración | enlace **Admin** o `#/admin`  | KPIs, gestión de productos (crear, stock, activar/desactivar) y pedidos demo |

Extras: menú móvil deslizante, contador de carrito y favoritos visible,
toasts de confirmación, todo guardado en el navegador (localStorage) con
botón **Restablecer demo** en el panel admin.

## Cómo ejecutarlo

Necesitas **Node.js 18 o superior** (descárgalo de https://nodejs.org).

```bash
# 1) Descomprime el ZIP y entra en la carpeta
cd nova-moda-v1

# 2) Instala las dependencias (solo la primera vez)
npm install

# 3) Arranca la tienda
npm run dev
```

Abre **http://localhost:3000** en tu navegador. Listo.

### Versión de producción

```bash
npm run build
npm start
```

## Imágenes

Las 42 fotografías van incluidas en `public/images/products/`, así que la
tienda se ve completa **sin internet** y puedes personalizarlas sustituyendo
los archivos por tus propias fotos (mismo nombre de archivo) o editando
`src/lib/products.ts`.

## Estructura

```
nova-moda-v1/
├── package.json
├── next.config.ts
├── src/
│   ├── app/            # Entrada del App Router (layout, página, estilos)
│   ├── components/
│   │   ├── views/      # Las 10 vistas de la tienda (una por página)
│   │   ├── layout/     # Header, menú móvil y footer
│   │   ├── shop/       # Tarjetas de producto, filtros, steppers…
│   │   └── ui/         # Componentes base (shadcn/ui)
│   ├── hooks/
│   └── lib/            # Catálogo, filtros, carrito (zustand) y helpers
└── public/images/      # Fotografías incluidas
```

## Notas

- El estado (carrito, favoritos, pedidos y cambios del admin) se guarda en
  `localStorage` bajo la clave `nova-moda-demo-v1`. Borra los datos del
  navegador o usa "Restablecer demo" para volver al estado inicial.
- Los pedidos se registran solo en tu navegador; para recibirlos de verdad
  habría que conectar un backend y una base de datos.
