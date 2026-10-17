using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Powergy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditOrderFinalizationAndPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "cancellation_note",
                table: "customer_orders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cancellation_reason",
                table: "customer_orders",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "original_estimated_total_usd",
                table: "customer_orders",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "original_quantity",
                table: "customer_order_lines",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "removed_at",
                table: "customer_order_lines",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "removed_by_admin_user_id",
                table: "customer_order_lines",
                type: "uuid",
                nullable: true);

            // Retrocompatibilidad: las líneas y solicitudes existentes no tenían
            // cantidad ni total originales, así que se toman los valores actuales.
            migrationBuilder.Sql(
                """
                UPDATE customer_order_lines
                SET original_quantity = quantity
                WHERE original_quantity = 0;

                UPDATE customer_orders
                SET original_estimated_total_usd = estimated_total_usd
                WHERE original_estimated_total_usd IS NULL;
                """);

            migrationBuilder.CreateTable(
                name: "admin_audit_log",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    admin_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    entity_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    entity_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    action = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    changes = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_audit_log", x => x.id);
                    table.ForeignKey(
                        name: "FK_admin_audit_log_admin_users_admin_user_id",
                        column: x => x.admin_user_id,
                        principalTable: "admin_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lines_order_id_removed_at",
                table: "customer_order_lines",
                columns: new[] { "order_id", "removed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_lines_removed_by_admin_user_id",
                table: "customer_order_lines",
                column: "removed_by_admin_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_log_admin_user_id",
                table: "admin_audit_log",
                column: "admin_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_log_created_at",
                table: "admin_audit_log",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_log_entity_type_entity_id_created_at",
                table: "admin_audit_log",
                columns: new[] { "entity_type", "entity_id", "created_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_customer_order_lines_admin_users_removed_by_admin_user_id",
                table: "customer_order_lines",
                column: "removed_by_admin_user_id",
                principalTable: "admin_users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_customer_order_lines_admin_users_removed_by_admin_user_id",
                table: "customer_order_lines");

            migrationBuilder.DropTable(
                name: "admin_audit_log");

            migrationBuilder.DropIndex(
                name: "IX_customer_order_lines_order_id_removed_at",
                table: "customer_order_lines");

            migrationBuilder.DropIndex(
                name: "IX_customer_order_lines_removed_by_admin_user_id",
                table: "customer_order_lines");

            migrationBuilder.DropColumn(
                name: "cancellation_note",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "cancellation_reason",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "original_estimated_total_usd",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "original_quantity",
                table: "customer_order_lines");

            migrationBuilder.DropColumn(
                name: "removed_at",
                table: "customer_order_lines");

            migrationBuilder.DropColumn(
                name: "removed_by_admin_user_id",
                table: "customer_order_lines");
        }
    }
}
