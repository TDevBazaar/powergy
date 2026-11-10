using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Powergy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminReferralWhatsApp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "referral_code",
                table: "customer_orders",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "referred_by_admin_user_id",
                table: "customer_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "display_name",
                table: "admin_users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "referral_code",
                table: "admin_users",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "whatsapp_phone",
                table: "admin_users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_referred_by_admin_user_id",
                table: "customer_orders",
                column: "referred_by_admin_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_admin_users_referral_code",
                table: "admin_users",
                column: "referral_code",
                unique: true,
                filter: "\"referral_code\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_customer_orders_admin_users_referred_by_admin_user_id",
                table: "customer_orders",
                column: "referred_by_admin_user_id",
                principalTable: "admin_users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_customer_orders_admin_users_referred_by_admin_user_id",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_customer_orders_referred_by_admin_user_id",
                table: "customer_orders");

            migrationBuilder.DropIndex(
                name: "IX_admin_users_referral_code",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "referral_code",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "referred_by_admin_user_id",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "display_name",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "referral_code",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "whatsapp_phone",
                table: "admin_users");
        }
    }
}
