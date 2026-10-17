START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    DROP INDEX "IX_products_category_id_is_active";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    DROP INDEX "IX_products_is_active_top_rank_name_id";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    DROP INDEX "IX_products_slug";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    DROP INDEX "IX_products_top_rank_name_id";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    DROP INDEX "IX_customer_orders_closed_at";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    DROP INDEX "IX_customer_orders_created_at_id";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    DROP INDEX "IX_customer_orders_status_created_at_id";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    DROP INDEX "IX_categories_slug";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    ALTER TABLE products ADD store character varying(40) NOT NULL DEFAULT 'powergy';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    ALTER TABLE customer_orders ADD store character varying(40) NOT NULL DEFAULT 'powergy';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    ALTER TABLE categories ADD store character varying(40) NOT NULL DEFAULT 'powergy';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    UPDATE categories SET store = 'powergy'
    WHERE id = '8db8a34e-0709-4f7a-b2a4-a226fc359570';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    UPDATE categories SET store = 'powergy'
    WHERE id = 'aa60039f-e0e0-4561-9b72-111fa7638575';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    UPDATE categories SET store = 'powergy'
    WHERE id = 'f74535c2-37c1-401c-b67b-665818f36a2d';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE INDEX "IX_products_category_id" ON products (category_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE INDEX "IX_products_store_category_id_is_active" ON products (store, category_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE INDEX "IX_products_store_is_active_top_rank_name_id" ON products (store, is_active, top_rank, name, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE UNIQUE INDEX "IX_products_store_slug" ON products (store, slug);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE INDEX "IX_products_store_top_rank_name_id" ON products (store, top_rank, name, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE INDEX "IX_customer_orders_store_closed_at" ON customer_orders (store, closed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE INDEX "IX_customer_orders_store_created_at_id" ON customer_orders (store, created_at, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE INDEX "IX_customer_orders_store_status_created_at_id" ON customer_orders (store, status, created_at, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    CREATE UNIQUE INDEX "IX_categories_store_slug" ON categories (store, slug);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017195305_AddStoreColumn') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261017195305_AddStoreColumn', '10.0.0');
    END IF;
END $EF$;
COMMIT;

