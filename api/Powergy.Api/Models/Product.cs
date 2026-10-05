namespace Powergy.Api.Models;

public sealed class Product
{
    public required string Id { get; set; }
    public required string Slug { get; set; }
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public required string Subcategory { get; set; }
    public required string Brand { get; set; }
    public required string Model { get; set; }
    public required string Name { get; set; }
    public decimal? PriceUsd { get; set; }
    public required string Specifications { get; set; }
    public required string PrimaryImage { get; set; }
    public bool OnSale { get; set; }
    public bool Warranty { get; set; }
    public bool Transport { get; set; }
    public bool Invoice { get; set; }
    public int? TopRank { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
