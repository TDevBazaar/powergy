using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Powergy.Api.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeListIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_products_is_active_top_rank",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_status_created_at",
                table: "customer_orders");

            migrationBuilder.CreateIndex(
                name: "IX_products_is_active_top_rank_name_id",
                table: "products",
                columns: new[] { "is_active", "top_rank", "name", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_products_top_rank_name_id",
                table: "products",
                columns: new[] { "top_rank", "name", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_created_at_id",
                table: "customer_orders",
                columns: new[] { "created_at", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_status_created_at_id",
                table: "customer_orders",
                columns: new[] { "status", "created_at", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_products_is_active_top_rank_name_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_top_rank_name_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_created_at_id",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_status_created_at_id",
                table: "customer_orders");

            migrationBuilder.CreateIndex(
                name: "IX_products_is_active_top_rank",
                table: "products",
                columns: new[] { "is_active", "top_rank" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_status_created_at",
                table: "customer_orders",
                columns: new[] { "status", "created_at" });
        }
    }
}
