# POWERGY API

ASP.NET Core 10 API with Entity Framework Core Code First and PostgreSQL on Supabase.

## Database tables

- `categories`: catalog categories, URL slug, display order and active state.
- `products`: catalog fields, nullable USD price, offer/service flags, image path, bestseller rank and active state.
- `admin_users`: allowlist of Supabase Auth user IDs authorized to administer the catalog.

The existing JSON catalog has 85 products across three categories. The initial migration creates the schema and seeds the three categories; it does not import products yet. Product IDs are strings so the current IDs can be preserved during the catalog import. `top_ventas` is represented by a nullable `top_rank` (a rank means featured); the JSON's duplicate `ecoflow-delta-2-max` slug must be made unique before importing.

## Local configuration

Set these environment variables before running the API:

```powershell
$env:ConnectionStrings__Supabase = "Host=db.<project-ref>.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=<database-password>;SSL Mode=Require;Trust Server Certificate=true"
$env:Supabase__Url = "https://<project-ref>.supabase.co"
dotnet run --project .\Powergy.Api
```

Do not commit database credentials. A Supabase direct database connection is preferred when creating migrations. If using the session pooler, use the exact connection details and username Supabase provides for that project.

## Publishing to Somee

The API is configured for IIS-style ASP.NET Core hosting and publishes as a framework-dependent .NET 10 application. Verify that the target Somee plan supports the ASP.NET Core 10 hosting bundle/runtime before uploading. Build the deployment package from PowerShell at the repository root:

```powershell
dotnet publish .\api\Powergy.Api\Powergy.Api.csproj `
  --configuration Release `
  --framework net10.0 `
  --self-contained false `
  --output .\api\publish\somee
```

The package is written to `api\publish\somee`. Upload the **contents** of that folder to the Somee application directory (including the generated `web.config`). The generated `web.config` starts the ASP.NET Core application; do not put database credentials in it.

Before starting the deployed app, edit the protected `appsettings.Production.json` on the server and set:

```json
{
  "ConnectionStrings": {
    "Supabase": "Host=...;Port=5432;Database=postgres;Username=...;Password=...;SSL Mode=Require;Timeout=30"
  },
  "Supabase": {
    "Url": "https://<project-ref>.supabase.co",
    "Audience": "authenticated"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://powergy.vercel.app"
    ]
  }
}
```

Replace the database and Supabase URL placeholders on the server only. The allowed origin must match the browser's `Origin` exactly: use `https://powergy.vercel.app` without a trailing slash, and add any custom production domain as a separate entry if used. Keep the password out of source control and out of the frontend. Ensure Somee blocks public downloads of `appsettings.Production.json`; if that file cannot be protected, do not deploy a real database password in it and use an application-settings/secret feature or a hosting plan that provides one. Production startup deliberately fails with a clear error if the database connection, HTTPS Supabase URL, or exact HTTPS frontend origin is missing/invalid. Configuration values supplied by the host's environment variables override JSON values (`ConnectionStrings__Supabase`, `Supabase__Url`, and `Cors__AllowedOrigins__0`). After changing server settings, restart/recycle the application in Somee.

The release package does not run EF migrations automatically. Apply migrations deliberately from a trusted development machine or CI environment before/alongside deployment. After deployment, verify `/health`, `/api/categories`, `/openapi/v1.json` only when running Development (OpenAPI is not exposed in Production), and the public frontend can call the API. Keep `ASPNETCORE_ENVIRONMENT` as `Production`.

For quick tests against the deployed Somee API, open `Powergy.Api.Somee.http` in VS Code with the REST Client extension and select **Send Request** above each request. `/health` checks both the API and database; the remaining requests exercise public routes and expected 400, 404 and 401 responses.

Restore the local EF command-line tool and apply the initial Code First migration after setting the connection string:

```powershell
dotnet tool restore
dotnet ef database update --project .\Powergy.Api
```

Create later migrations with:

```powershell
dotnet ef migrations add <MigrationName> --project .\Powergy.Api
```

Supabase is PostgreSQL, so EF Core Code First works through the Npgsql provider. Migration commands connect to the configured Supabase PostgreSQL database; the API does not automatically modify the schema at startup.

## Authentication and administrator setup

The API validates Supabase access tokens using the project's Auth OpenID metadata/JWKS endpoint. Use an asymmetric JWT signing key configuration exposed by the Supabase JWKS endpoint. Create administrators in Supabase Auth, then allowlist their Auth user UUID in `admin_users`:

```sql
INSERT INTO admin_users (id, supabase_user_id, email, role, is_active, created_at)
VALUES (gen_random_uuid(), '<auth-user-uuid>', '<admin-email>', 'admin', true, now());
```

Only an active allowlisted user with the `admin` role can create, update or deactivate catalog records. Public routes do not require a token.

The frontend admin panel is available at `/admin`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable/anon key only), and `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=powergy-product-images` in local `.env.local` and Vercel. Create the Auth user, add its UUID to `admin_users` as shown above, and run `Sql/powergy-product-storage.sql` in the Supabase SQL Editor. The script creates a publicly readable image bucket and uses a `SECURITY DEFINER` predicate against `admin_users` to restrict uploads, updates, and deletes to active admins. Never expose the Supabase `service_role` key in the browser.

Product POST requests accept an optional `id`; this allows importing the existing catalog without changing IDs used by the current browser cart. New products receive a generated ID when it is omitted. The `CategoryId` values are available from `GET /api/categories`.

## Routes

- `GET /api/categories` — active categories.
- `GET /api/products` — active catalog, paginated; supports `category`, `q`, `onSale`, `featured`, `page` and `pageSize`.
- `GET /api/products/{slug}` — active product.
- `GET /api/categories/admin` and `GET /api/products/admin` — admin catalog views.
- `POST`, `PUT` and `DELETE` under `/api/categories` and `/api/products` — admin-only category/product management. DELETE deactivates rather than permanently removing records.
- `GET /health` — API/database connectivity check.

Product response fields preserve the current frontend catalog names (`price_usd`, `primary_image`, `oferta`, `garantia`, `transporte`, `factura`, `top_ventas`, `top_rank`). The admin panel uploads product images to the `powergy-product-images` Supabase Storage bucket and saves their public URLs in `primary_image`.

## API structure and pagination

- `Contracts/` contains immutable request/response DTOs and request validation. Controllers do not expose EF entities.
- `Controllers/` handles HTTP binding, authorization attributes and status codes.
- `Services/` contains application logic, validation against persisted data, mapping and database access. Each service has an interface registered in dependency injection.
- `Specifications/` contains reusable product query filters and includes. `SpecificationEvaluator` composes them into EF Core `IQueryable` queries.
- `Middleware/ApiExceptionHandler.cs` maps expected application errors to RFC 7807 Problem Details.

`GET /api/products` and `GET /api/products/admin` run filters and a total count in PostgreSQL, then apply deterministic ordering, `Skip` and `Take` before loading the page. Parameters: `page` (1-based, default 1), `pageSize` (default 24, max 100), `category`, `q`, `onSale`, `featured`; admin additionally supports `includeInactive`. The response contains `items`, `page`, `pageSize`, `totalItems` and `totalPages`. Pagination bounds are validated before the service is called.
