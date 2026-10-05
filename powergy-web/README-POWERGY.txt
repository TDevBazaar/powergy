================================================================
POWERGY - Tienda online de energía renovable
================================================================

Tienda web: catálogo de equipos solares conectado al API .NET,
buscador, filtros por categoría, carrito de compras y pedido
directo por WhatsApp (+53 5974 9037). Sin registros ni pagos
online: el cliente arma su carrito y envía el pedido por WhatsApp.

Etiquetas del catálogo:
- MÁS VENDIDO (amarillo): los 15 productos top del proveedor.
- EN REBAJA (negro): los 22 productos marcados en oferta.

----------------------------------------------------------------
CÓMO EJECUTAR
----------------------------------------------------------------
Requisitos: Node.js 20 o superior (o Bun 1.x).

Con npm:
  1) npm install
  2) npm run dev
  3) Abrir http://localhost:3000

Con bun:
  1) bun install
  2) bun run dev

Para producción:
  npm run build
  npm start

----------------------------------------------------------------
DESPLIEGUE EN VERCEL
----------------------------------------------------------------
- Conecta el repositorio GitHub TDevBazaar/powergy a Vercel.
- Configura Root Directory como: powergy-web
- Framework Preset: Next.js
- Build Command: npm run build (o el predeterminado de Next.js)
- En Environment Variables define:
    NEXT_PUBLIC_POWERGY_API_URL=https://powergy.somee.com
    NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=powergy-product-images
- Haz un redeploy después de cambiar variables de entorno.
- Vercel hará los despliegues automáticos al hacer push a la rama
  de producción. GitHub Actions ejecuta lint y build en cada PR y
  push a main.
- En Somee, agrega a Cors:AllowedOrigins el dominio HTTPS exacto
  asignado por Vercel y cualquier dominio personalizado.

PANEL DE ADMINISTRACIÓN:
  Abre /admin e inicia sesión con un usuario creado en Supabase Auth.
  No habilites el registro público. El UUID debe estar autorizado en
  public.admin_users:
    INSERT INTO public.admin_users
      (id, supabase_user_id, email, role, is_active, created_at)
    VALUES
      (gen_random_uuid(), '<auth-user-uuid>', '<correo>', 'admin', true, now());
  Ejecuta api/Powergy.Api/Sql/powergy-product-storage.sql en Supabase SQL
  Editor. Crea el bucket público para lectura y restringe las subidas y
  cambios a usuarios administradores.
  Usa solo la publishable/anon key en NEXT_PUBLIC_SUPABASE_ANON_KEY.
  Nunca pongas la service_role key en Vercel ni en variables NEXT_PUBLIC_*.
  Para desarrollo local, copia .env.example como .env.local, completa los
  valores y reinicia el servidor Next.js.

URL del API:
  La tienda consulta https://powergy.somee.com por defecto.
  Para apuntar a otro entorno, define NEXT_PUBLIC_POWERGY_API_URL
  en powergy-web/.env.local para desarrollo local, o en la
  configuración de entorno del hosting del frontend; por ejemplo:
  NEXT_PUBLIC_POWERGY_API_URL=https://api.ejemplo.com
  Esta URL es pública y no debe contener claves ni contraseñas.
  El API debe permitir por CORS el origen exacto del frontend.

----------------------------------------------------------------
DÓNDE EDITAR LAS COSAS
----------------------------------------------------------------
- Productos y precios:
    Se administran/importan en PostgreSQL mediante el API .NET.
    src/data/catalogo-publico.json queda como fuente de importación
    inicial, no como fuente del catálogo publicado.
  Campos útiles por producto:
    name        → nombre visible
    price_usd   → precio en USD (null = "Consultar")
    specifications → texto descriptivo
    primary_image  → ruta de la imagen (dentro de /public)
    oferta      → true muestra la etiqueta EN REBAJA
    top_ventas  → true muestra MÁS VENDIDO (top_rank = orden 1..15)

- Número de WhatsApp y textos de los mensajes:
    src/lib/whatsapp.ts

- Logo e imágenes:
    public/logo-powergy-claro.png   (logo del header y hero)
    public/assets/                  (fotos de los productos)
    public/assets/hero-solar.jpg    (imagen del banner principal)

- Textos del banner principal:
    src/components/catalogo.tsx  (sección "Hero")

----------------------------------------------------------------
NOTAS
----------------------------------------------------------------
- El catálogo se carga desde GET /api/products, recorriendo las
  páginas que devuelve el API. Si el API falla, la interfaz muestra
  un mensaje y permite reintentar.
- El carrito se guarda en el navegador del cliente
  (localStorage) y se envía como lista lista para copiar en el
  mensaje de WhatsApp con el total estimado.
- Las imágenes de producto tienen fondo blanco y están optimizadas
  para web (JPEG).
- Los productos deben haberse importado a Supabase PostgreSQL
  para que aparezcan en el catálogo conectado al API.
