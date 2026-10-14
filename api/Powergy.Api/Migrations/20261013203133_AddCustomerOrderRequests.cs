using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Powergy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerOrderRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "customer_orders",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    idempotency_key = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    estimated_total_usd = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    closed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closed_by_admin_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_orders", x => x.id);
                    table.ForeignKey(
                        name: "FK_customer_orders_admin_users_closed_by_admin_user_id",
                        column: x => x.closed_by_admin_user_id,
                        principalTable: "admin_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "customer_order_lines",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    product_name = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    product_slug = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    category_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    unit_price_usd = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_order_lines", x => x.id);
                    table.ForeignKey(
                        name: "FK_customer_order_lines_customer_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "customer_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "customer_order_status_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    changed_by_admin_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    changed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_order_status_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_customer_order_status_history_customer_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "customer_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lines_order_id",
                table: "customer_order_lines",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_status_history_order_id_changed_at",
                table: "customer_order_status_history",
                columns: new[] { "order_id", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_closed_at",
                table: "customer_orders",
                column: "closed_at");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_closed_by_admin_user_id",
                table: "customer_orders",
                column: "closed_by_admin_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_idempotency_key",
                table: "customer_orders",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_status_created_at",
                table: "customer_orders",
                columns: new[] { "status", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_order_lines");

            migrationBuilder.DropTable(
                name: "customer_order_status_history");

            migrationBuilder.DropTable(
                name: "customer_orders");
        }
    }
}
