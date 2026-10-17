namespace Powergy.Api.Models;

public sealed class Category
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }

    /// <summary>Tienda a la que pertenece la categoría.</summary>
    public string Store { get; set; } = StoreKeys.Default;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
