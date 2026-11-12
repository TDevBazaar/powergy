using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Powergy.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductDiscountPercent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "discount_percent",
                table: "products",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "discount_percent",
                table: "products");
        }
    }
}
