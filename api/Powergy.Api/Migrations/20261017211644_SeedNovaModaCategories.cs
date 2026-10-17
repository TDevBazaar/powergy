using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Powergy.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeedNovaModaCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Categorías base de la tienda NOVA MODA. Idempotente: si ya existen
            // (misma tienda y slug) no se tocan.
            migrationBuilder.Sql(
                """
                INSERT INTO categories (id, name, slug, store, sort_order, is_active, created_at, updated_at)
                VALUES
                    ('078a6f95-ff52-4715-9399-f472c8947705', 'Mujer', 'mujer', 'nova-moda', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('9a487b54-817f-43c4-8d08-651cf02b2d4e', 'Hombre', 'hombre', 'nova-moda', 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    ('b9ec45c0-be58-4df9-a27a-d169d72a8140', 'Accesorios', 'accesorios', 'nova-moda', 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Solo se eliminan si ningún producto las está usando.
            migrationBuilder.Sql(
                """
                DELETE FROM categories
                WHERE store = 'nova-moda'
                    AND slug IN ('mujer', 'hombre', 'accesorios')
                    AND NOT EXISTS (
                        SELECT 1 FROM products WHERE products.category_id = categories.id
                    );
                """);
        }
    }
}
