CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE TABLE admin_users (
        id uuid NOT NULL,
        supabase_user_id uuid NOT NULL,
        email character varying(320),
        role character varying(40) NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT "PK_admin_users" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE TABLE categories (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        slug character varying(120) NOT NULL,
        sort_order integer NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT "PK_categories" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE TABLE products (
        id character varying(100) NOT NULL,
        slug character varying(180) NOT NULL,
        category_id uuid NOT NULL,
        subcategory character varying(120) NOT NULL,
        brand character varying(120) NOT NULL,
        model character varying(180) NOT NULL,
        name character varying(240) NOT NULL,
        price_usd numeric(12,2),
        specifications text NOT NULL,
        primary_image character varying(1000) NOT NULL,
        on_sale boolean NOT NULL,
        warranty boolean NOT NULL,
        transport boolean NOT NULL,
        invoice boolean NOT NULL,
        top_rank integer,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT "PK_products" PRIMARY KEY (id),
        CONSTRAINT "FK_products_categories_category_id" FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    INSERT INTO categories (id, created_at, is_active, name, slug, sort_order, updated_at)
    VALUES ('8db8a34e-0709-4f7a-b2a4-a226fc359570', TIMESTAMPTZ '2026-01-01T00:00:00Z', TRUE, 'Estaciones de energía', 'estaciones-de-energia', 1, TIMESTAMPTZ '2026-01-01T00:00:00Z');
    INSERT INTO categories (id, created_at, is_active, name, slug, sort_order, updated_at)
    VALUES ('aa60039f-e0e0-4561-9b72-111fa7638575', TIMESTAMPTZ '2026-01-01T00:00:00Z', TRUE, 'Plantas eléctricas', 'plantas-electricas', 2, TIMESTAMPTZ '2026-01-01T00:00:00Z');
    INSERT INTO categories (id, created_at, is_active, name, slug, sort_order, updated_at)
    VALUES ('f74535c2-37c1-401c-b67b-665818f36a2d', TIMESTAMPTZ '2026-01-01T00:00:00Z', TRUE, 'Paneles solares', 'paneles-solares', 3, TIMESTAMPTZ '2026-01-01T00:00:00Z');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE UNIQUE INDEX "IX_admin_users_supabase_user_id" ON admin_users (supabase_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE UNIQUE INDEX "IX_categories_slug" ON categories (slug);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE INDEX "IX_products_category_id_is_active" ON products (category_id, is_active);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE INDEX "IX_products_is_active_top_rank" ON products (is_active, top_rank);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE INDEX "IX_products_on_sale" ON products (on_sale);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    CREATE UNIQUE INDEX "IX_products_slug" ON products (slug);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261005163814_InitialCatalog') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261005163814_InitialCatalog', '10.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE TABLE customer_orders (
        id uuid NOT NULL,
        idempotency_key uuid NOT NULL,
        status character varying(20) NOT NULL,
        estimated_total_usd numeric(12,2),
        created_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        closed_at timestamp with time zone,
        closed_by_admin_user_id uuid,
        CONSTRAINT "PK_customer_orders" PRIMARY KEY (id),
        CONSTRAINT "FK_customer_orders_admin_users_closed_by_admin_user_id" FOREIGN KEY (closed_by_admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE TABLE customer_order_lines (
        id uuid NOT NULL,
        order_id uuid NOT NULL,
        product_id character varying(100) NOT NULL,
        product_name character varying(240) NOT NULL,
        product_slug character varying(180) NOT NULL,
        category_name character varying(100) NOT NULL,
        quantity integer NOT NULL,
        unit_price_usd numeric(12,2),
        CONSTRAINT "PK_customer_order_lines" PRIMARY KEY (id),
        CONSTRAINT "FK_customer_order_lines_customer_orders_order_id" FOREIGN KEY (order_id) REFERENCES customer_orders (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE TABLE customer_order_status_history (
        id uuid NOT NULL,
        order_id uuid NOT NULL,
        previous_status character varying(20),
        status character varying(20) NOT NULL,
        changed_by_admin_user_id uuid,
        changed_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT "PK_customer_order_status_history" PRIMARY KEY (id),
        CONSTRAINT "FK_customer_order_status_history_customer_orders_order_id" FOREIGN KEY (order_id) REFERENCES customer_orders (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE INDEX "IX_customer_order_lines_order_id" ON customer_order_lines (order_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE INDEX "IX_customer_order_status_history_order_id_changed_at" ON customer_order_status_history (order_id, changed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE INDEX "IX_customer_orders_closed_at" ON customer_orders (closed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE INDEX "IX_customer_orders_closed_by_admin_user_id" ON customer_orders (closed_by_admin_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE UNIQUE INDEX "IX_customer_orders_idempotency_key" ON customer_orders (idempotency_key);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    CREATE INDEX "IX_customer_orders_status_created_at" ON customer_orders (status, created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261013203133_AddCustomerOrderRequests') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261013203133_AddCustomerOrderRequests', '10.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014002244_OptimizeListIndexes') THEN
    DROP INDEX "IX_products_is_active_top_rank";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014002244_OptimizeListIndexes') THEN
    DROP INDEX "IX_customer_orders_status_created_at";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014002244_OptimizeListIndexes') THEN
    CREATE INDEX "IX_products_is_active_top_rank_name_id" ON products (is_active, top_rank, name, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014002244_OptimizeListIndexes') THEN
    CREATE INDEX "IX_products_top_rank_name_id" ON products (top_rank, name, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014002244_OptimizeListIndexes') THEN
    CREATE INDEX "IX_customer_orders_created_at_id" ON customer_orders (created_at, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014002244_OptimizeListIndexes') THEN
    CREATE INDEX "IX_customer_orders_status_created_at_id" ON customer_orders (status, created_at, id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261014002244_OptimizeListIndexes') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261014002244_OptimizeListIndexes', '10.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    ALTER TABLE customer_orders ADD cancellation_note character varying(500);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    ALTER TABLE customer_orders ADD cancellation_reason character varying(40);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    ALTER TABLE customer_orders ADD original_estimated_total_usd numeric(12,2);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    ALTER TABLE customer_order_lines ADD original_quantity integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    ALTER TABLE customer_order_lines ADD removed_at timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    ALTER TABLE customer_order_lines ADD removed_by_admin_user_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    UPDATE customer_order_lines
    SET original_quantity = quantity
    WHERE original_quantity = 0;

    UPDATE customer_orders
    SET original_estimated_total_usd = estimated_total_usd
    WHERE original_estimated_total_usd IS NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    CREATE TABLE admin_audit_log (
        id uuid NOT NULL,
        admin_user_id uuid,
        entity_type character varying(40) NOT NULL,
        entity_id character varying(100) NOT NULL,
        action character varying(20) NOT NULL,
        changes jsonb NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        CONSTRAINT "PK_admin_audit_log" PRIMARY KEY (id),
        CONSTRAINT "FK_admin_audit_log_admin_users_admin_user_id" FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    CREATE INDEX "IX_customer_order_lines_order_id_removed_at" ON customer_order_lines (order_id, removed_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    CREATE INDEX "IX_customer_order_lines_removed_by_admin_user_id" ON customer_order_lines (removed_by_admin_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    CREATE INDEX "IX_admin_audit_log_admin_user_id" ON admin_audit_log (admin_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    CREATE INDEX "IX_admin_audit_log_created_at" ON admin_audit_log (created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    CREATE INDEX "IX_admin_audit_log_entity_type_entity_id_created_at" ON admin_audit_log (entity_type, entity_id, created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    ALTER TABLE customer_order_lines ADD CONSTRAINT "FK_customer_order_lines_admin_users_removed_by_admin_user_id" FOREIGN KEY (removed_by_admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017182456_AddAuditOrderFinalizationAndPricing') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261017182456_AddAuditOrderFinalizationAndPricing', '10.0.0');
    END IF;
END $EF$;
COMMIT;

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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261017211644_SeedNovaModaCategories') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261017211644_SeedNovaModaCategories', '10.0.0');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    ALTER TABLE customer_orders ADD referral_code character varying(40);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    ALTER TABLE customer_orders ADD referred_by_admin_user_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    ALTER TABLE admin_users ADD display_name character varying(100);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    ALTER TABLE admin_users ADD referral_code character varying(40);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    ALTER TABLE admin_users ADD whatsapp_phone character varying(20);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    CREATE INDEX "IX_customer_orders_referred_by_admin_user_id" ON customer_orders (referred_by_admin_user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    CREATE UNIQUE INDEX "IX_admin_users_referral_code" ON admin_users (referral_code) WHERE "referral_code" IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    ALTER TABLE customer_orders ADD CONSTRAINT "FK_customer_orders_admin_users_referred_by_admin_user_id" FOREIGN KEY (referred_by_admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261110171835_AddAdminReferralWhatsApp') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261110171835_AddAdminReferralWhatsApp', '10.0.0');
    END IF;
END $EF$;
COMMIT;

