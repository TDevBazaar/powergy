using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Powergy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_products_category_id_is_active",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_is_active_top_rank_name_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_slug",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_top_rank_name_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_closed_at",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_created_at_id",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_status_created_at_id",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_categories_slug",
                table: "categories");

            migrationBuilder.AddColumn<string>(
                name: "store",
                table: "products",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "powergy");

            migrationBuilder.AddColumn<string>(
                name: "store",
                table: "customer_orders",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "powergy");

            migrationBuilder.AddColumn<string>(
                name: "store",
                table: "categories",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "powergy");

            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("8db8a34e-0709-4f7a-b2a4-a226fc359570"),
                column: "store",
                value: "powergy");

            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("aa60039f-e0e0-4561-9b72-111fa7638575"),
                column: "store",
                value: "powergy");

            migrationBuilder.UpdateData(
                table: "categories",
                keyColumn: "id",
                keyValue: new Guid("f74535c2-37c1-401c-b67b-665818f36a2d"),
                column: "store",
                value: "powergy");

            migrationBuilder.CreateIndex(
                name: "IX_products_category_id",
                table: "products",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_products_store_category_id_is_active",
                table: "products",
                columns: new[] { "store", "category_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_products_store_is_active_top_rank_name_id",
                table: "products",
                columns: new[] { "store", "is_active", "top_rank", "name", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_products_store_slug",
                table: "products",
                columns: new[] { "store", "slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_store_top_rank_name_id",
                table: "products",
                columns: new[] { "store", "top_rank", "name", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_store_closed_at",
                table: "customer_orders",
                columns: new[] { "store", "closed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_store_created_at_id",
                table: "customer_orders",
                columns: new[] { "store", "created_at", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_store_status_created_at_id",
                table: "customer_orders",
                columns: new[] { "store", "status", "created_at", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_categories_store_slug",
                table: "categories",
                columns: new[] { "store", "slug" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_products_category_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_store_category_id_is_active",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_store_is_active_top_rank_name_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_store_slug",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_store_top_rank_name_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_store_closed_at",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_store_created_at_id",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_store_status_created_at_id",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_categories_store_slug",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "store",
                table: "products");

            migrationBuilder.DropColumn(
                name: "store",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "store",
                table: "categories");

            migrationBuilder.CreateIndex(
                name: "IX_products_category_id_is_active",
                table: "products",
                columns: new[] { "category_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_products_is_active_top_rank_name_id",
                table: "products",
                columns: new[] { "is_active", "top_rank", "name", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_products_slug",
                table: "products",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_top_rank_name_id",
                table: "products",
                columns: new[] { "top_rank", "name", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_closed_at",
                table: "customer_orders",
                column: "closed_at");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_created_at_id",
                table: "customer_orders",
                columns: new[] { "created_at", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_status_created_at_id",
                table: "customer_orders",
                columns: new[] { "status", "created_at", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_categories_slug",
                table: "categories",
                column: "slug",
                unique: true);
        }
    }
}
