using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Powergy.Api.Models;

namespace Powergy.Api.Contracts;

/// <summary>Parameters used to filter and page through catalog products.</summary>
public sealed record ProductQueryRequest
{
    /// <summary>Optional category slug.</summary>
    public string? Category { get; init; }

    /// <summary>Optional text searched in product name, brand, model and specifications.</summary>
    public string? Q { get; init; }

    /// <summary>Optional sale status filter.</summary>
    public bool? OnSale { get; init; }

    /// <summary>Optional featured-product filter.</summary>
    public bool? Featured { get; init; }

    /// <summary>One-based page number.</summary>
    [Range(1, 1_000_000)]
    public int Page { get; init; } = 1;

    /// <summary>Maximum number of products per page.</summary>
    [Range(1, 100)]
    public int PageSize { get; init; } = 24;

    /// <summary>Whether inactive products are included in the admin list.</summary>
    public bool IncludeInactive { get; init; } = true;
}

/// <summary>Validated payload used to create a catalog product.</summary>
public sealed record CreateProductRequest
{
    /// <summary>Optional existing product ID, primarily for catalog imports.</summary>
    [StringLength(100, MinimumLength = 1)]
    public string? Id { get; init; }

    /// <summary>Unique URL slug.</summary>
    [Required, StringLength(180, MinimumLength = 1)]
    public required string Slug { get; init; }

    /// <summary>ID of an active category.</summary>
    [Required]
    public Guid CategoryId { get; init; }

    /// <summary>Product subcategory.</summary>
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Subcategory { get; init; }

    /// <summary>Product brand.</summary>
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Brand { get; init; }

    /// <summary>Product model.</summary>
    [Required, StringLength(180, MinimumLength = 1)]
    public required string Model { get; init; }

    /// <summary>Display name.</summary>
    [Required, StringLength(240, MinimumLength = 1)]
    public required string Name { get; init; }

    /// <summary>USD price, or null when the price must be confirmed.</summary>
    [Range(typeof(decimal), "0", "9999999999.99")]
    public decimal? PriceUsd { get; init; }

    /// <summary>Product specifications shown in the catalog.</summary>
    [Required]
    public required string Specifications { get; init; }

    /// <summary>Image path or URL.</summary>
    [Required, StringLength(1000, MinimumLength = 1)]
    public required string PrimaryImage { get; init; }

    /// <summary>Whether the product is on sale.</summary>
    public bool OnSale { get; init; }

    /// <summary>Whether warranty is offered.</summary>
    public bool Warranty { get; init; }

    /// <summary>Whether transport is offered.</summary>
    public bool Transport { get; init; }

    /// <summary>Whether an invoice is offered.</summary>
    public bool Invoice { get; init; }

    /// <summary>Optional rank for bestseller placement.</summary>
    [Range(1, 100000)]
    public int? TopRank { get; init; }
}

/// <summary>Validated payload used to replace an existing catalog product.</summary>
public sealed record UpdateProductRequest
{
    /// <summary>Unique URL slug.</summary>
    [Required, StringLength(180, MinimumLength = 1)]
    public required string Slug { get; init; }

    /// <summary>ID of an active category.</summary>
    [Required]
    public Guid CategoryId { get; init; }

    /// <summary>Product subcategory.</summary>
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Subcategory { get; init; }

    /// <summary>Product brand.</summary>
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Brand { get; init; }

    /// <summary>Product model.</summary>
    [Required, StringLength(180, MinimumLength = 1)]
    public required string Model { get; init; }

    /// <summary>Display name.</summary>
    [Required, StringLength(240, MinimumLength = 1)]
    public required string Name { get; init; }

    /// <summary>USD price, or null when the price must be confirmed.</summary>
    [Range(typeof(decimal), "0", "9999999999.99")]
    public decimal? PriceUsd { get; init; }

    /// <summary>Product specifications shown in the catalog.</summary>
    [Required]
    public required string Specifications { get; init; }

    /// <summary>Image path or URL.</summary>
    [Required, StringLength(1000, MinimumLength = 1)]
    public required string PrimaryImage { get; init; }

    /// <summary>Whether the product is on sale.</summary>
    public bool OnSale { get; init; }

    /// <summary>Whether warranty is offered.</summary>
    public bool Warranty { get; init; }

    /// <summary>Whether transport is offered.</summary>
    public bool Transport { get; init; }

    /// <summary>Whether an invoice is offered.</summary>
    public bool Invoice { get; init; }

    /// <summary>Optional rank for bestseller placement.</summary>
    [Range(1, 100000)]
    public int? TopRank { get; init; }

    /// <summary>Whether the product is visible in the public catalog.</summary>
    public bool IsActive { get; init; } = true;
}

/// <summary>Represents a product returned by the API.</summary>
public sealed record ProductResponse(
    string Id,
    string Slug,
    string Category,
    Guid CategoryId,
    string Subcategory,
    string Brand,
    string Model,
    string Name,
    [property: JsonPropertyName("price_usd")] decimal? PriceUsd,
    string Specifications,
    [property: JsonPropertyName("primary_image")] string PrimaryImage,
    [property: JsonPropertyName("oferta")] bool OnSale,
    [property: JsonPropertyName("garantia")] bool Warranty,
    [property: JsonPropertyName("transporte")] bool Transport,
    [property: JsonPropertyName("factura")] bool Invoice,
    [property: JsonPropertyName("top_ventas")] bool TopVentas,
    [property: JsonPropertyName("top_rank")] int? TopRank,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    /// <summary>Maps a persisted product entity to the public API contract.</summary>
    public static ProductResponse From(Product product) => new(
        product.Id,
        product.Slug,
        product.Category.Name,
        product.CategoryId,
        product.Subcategory,
        product.Brand,
        product.Model,
        product.Name,
        product.PriceUsd,
        product.Specifications,
        product.PrimaryImage,
        product.OnSale,
        product.Warranty,
        product.Transport,
        product.Invoice,
        product.TopRank.HasValue,
        product.TopRank,
        product.IsActive,
        new DateTimeOffset(DateTime.SpecifyKind(product.CreatedAt, DateTimeKind.Utc)),
        new DateTimeOffset(DateTime.SpecifyKind(product.UpdatedAt, DateTimeKind.Utc)));
}

/// <summary>A page of results and its paging metadata.</summary>
public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);
