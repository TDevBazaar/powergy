-- =====================================================================
--  Categorías base de la tienda NOVA MODA
--  Migración equivalente: 20261017211644_SeedNovaModaCategories
--
--  Idempotente: se puede ejecutar varias veces sin duplicar filas. Si la
--  categoría ya existe (misma tienda y slug) no se toca nada.
-- =====================================================================

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017211644_SeedNovaModaCategories') THEN
    INSERT INTO categories (id, name, slug, store, sort_order, is_active, created_at, updated_at)
    VALUES
        ('078a6f95-ff52-4715-9399-f472c8947705', 'Mujer', 'mujer', 'nova-moda', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('9a487b54-817f-43c4-8d08-651cf02b2d4e', 'Hombre', 'hombre', 'nova-moda', 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('b9ec45c0-be58-4df9-a27a-d169d72a8140', 'Accesorios', 'accesorios', 'nova-moda', 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;

    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261017211644_SeedNovaModaCategories', '10.0.0');
    END IF;
END $EF$;

COMMIT;
