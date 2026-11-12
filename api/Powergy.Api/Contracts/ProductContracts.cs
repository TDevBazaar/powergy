using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Powergy.Api.Exceptions;
using Powergy.Api.Models;

namespace Powergy.Api.Contracts;

/// <summary>Supported catalog sort modes.</summary>
public static class ProductSortModes
{
    public const string Destacados = "destacados";
    public const string PrecioAsc = "precio-asc";
    public const string PrecioDesc = "precio-desc";
    public const string Nuevos = "nuevos";

    public static string Resolve(string? sort)
    {
        var value = sort?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(value))
        {
            return Destacados;
        }

        return value switch
        {
            Destacados or PrecioAsc or PrecioDesc or Nuevos => value,
            _ => throw new ApiValidationException("El criterio de ordenación no es válido.")
        };
    }
}

/// <summary>Parameters used to filter and page through catalog products.</summary>
public sealed record ProductQueryRequest
{
    /// <summary>Optional category slug.</summary>
    [StringLength(120)]
    public string? Category { get; init; }

    /// <summary>Optional comma-separated category slugs.</summary>
    [StringLength(500)]
    public string? Categories { get; init; }

    /// <summary>Tienda a consultar. Por defecto, el catálogo de POWERGY.</summary>
    [StringLength(40, MinimumLength = 2)]
    public string? Store { get; init; }

    /// <summary>Optional text searched in product name, brand, model and specifications.</summary>
    [StringLength(120)]
    public string? Q { get; init; }

    /// <summary>Optional sale status filter.</summary>
    public bool? OnSale { get; init; }

    /// <summary>Optional featured-product filter.</summary>
    public bool? Featured { get; init; }

    /// <summary>Optional maximum USD price filter (excludes unpriced products).</summary>
    [Range(typeof(decimal), "0", "9999999999.99")]
    public decimal? MaxPrice { get; init; }

    /// <summary>Optional sort order: destacados, precio-asc, precio-desc, nuevos.</summary>
    [StringLength(30)]
    public string? Sort { get; init; }

    /// <summary>One-based page number.</summary>
    [Range(1, 1_000_000)]
    public int Page { get; init; } = 1;

    /// <summary>Maximum number of products per page.</summary>
    [Range(1, 100)]
    public int PageSize { get; init; } = 24;

    /// <summary>Whether inactive products are included in the admin list.</summary>
    public bool IncludeInactive { get; init; } = true;

    /// <summary>Optional visibility filter for the admin list: true = visible only, false = hidden only.</summary>
    public bool? IsActive { get; init; }

    /// <summary>Optional price availability filter: true = priced (&gt; 0), false = unpriced.</summary>
    public bool? HasPrice { get; init; }
}

/// <summary>Parameters used for cursor-based infinite scroll through catalog products.</summary>
public sealed record ProductCursorQueryRequest
{
    /// <summary>Optional category slug.</summary>
    [StringLength(120)]
    public string? Category { get; init; }

    /// <summary>Optional comma-separated category slugs.</summary>
    [StringLength(500)]
    public string? Categories { get; init; }

    /// <summary>Tienda a consultar. Por defecto, el catálogo de POWERGY.</summary>
    [StringLength(40, MinimumLength = 2)]
    public string? Store { get; init; }

    /// <summary>Optional text searched in product name, brand, model and specifications.</summary>
    [StringLength(120)]
    public string? Q { get; init; }

    /// <summary>Optional sale status filter.</summary>
    public bool? OnSale { get; init; }

    /// <summary>Optional featured-product filter.</summary>
    public bool? Featured { get; init; }

    /// <summary>Optional maximum USD price filter (excludes unpriced products).</summary>
    [Range(typeof(decimal), "0", "9999999999.99")]
    public decimal? MaxPrice { get; init; }

    /// <summary>Optional sort order: destacados, precio-asc, precio-desc, nuevos.</summary>
    [StringLength(30)]
    public string? Sort { get; init; }

    /// <summary>Opaque keyset cursor returned by the previous response.</summary>
    [StringLength(1000)]
    public string? Cursor { get; init; }

    /// <summary>Maximum number of products per cursor batch.</summary>
    [Range(1, 100)]
    public int Limit { get; init; } = 12;
}

/// <summary>Validated payload used to create a catalog product.</summary>
public sealed record CreateProductRequest
{
    /// <summary>Optional existing product ID, primarily for catalog imports.</summary>
    [StringLength(100, MinimumLength = 1)]
    public string? Id { get; init; }

    /// <summary>Unique URL slug.</summary>
    [Required, StringLength(180, MinimumLength = 1)]
    [RegularExpression(
        "^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$",
        ErrorMessage = "El slug solo admite letras, números y guiones simples.")]
    public required string Slug { get; init; }

    /// <summary>ID of an active category.</summary>
    [Required]
    public Guid CategoryId { get; init; }

    /// <summary>Tienda propietaria del producto. Por defecto, POWERGY.</summary>
    [StringLength(40, MinimumLength = 2)]
    public string? Store { get; init; }

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
    [Required, StringLength(5000, MinimumLength = 1)]
    public required string Specifications { get; init; }

    /// <summary>Image path or URL.</summary>
    [Required, StringLength(1000, MinimumLength = 1)]
    public required string PrimaryImage { get; init; }

    /// <summary>Whether the product is on sale.</summary>
    public bool OnSale { get; init; }

    /// <summary>Optional discount percentage (0-99) when the product is on sale.</summary>
    [Range(0, 99, ErrorMessage = "El porcentaje de rebaja debe estar entre 0 y 99.")]
    public int? DiscountPercent { get; init; }

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
    [RegularExpression(
        "^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$",
        ErrorMessage = "El slug solo admite letras, números y guiones simples.")]
    public required string Slug { get; init; }

    /// <summary>ID of an active category.</summary>
    [Required]
    public Guid CategoryId { get; init; }

    /// <summary>Tienda propietaria del producto. Por defecto, POWERGY.</summary>
    [StringLength(40, MinimumLength = 2)]
    public string? Store { get; init; }

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
    [Required, StringLength(5000, MinimumLength = 1)]
    public required string Specifications { get; init; }

    /// <summary>Image path or URL.</summary>
    [Required, StringLength(1000, MinimumLength = 1)]
    public required string PrimaryImage { get; init; }

    /// <summary>Whether the product is on sale.</summary>
    public bool OnSale { get; init; }

    /// <summary>Optional discount percentage (0-99) when the product is on sale.</summary>
    [Range(0, 99, ErrorMessage = "El porcentaje de rebaja debe estar entre 0 y 99.")]
    public int? DiscountPercent { get; init; }

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
    [property: JsonPropertyName("original_price_usd")] decimal? OriginalPriceUsd,
    [property: JsonPropertyName("discount_percent")] int? DiscountPercent,
    string Specifications,
    [property: JsonPropertyName("primary_image")] string PrimaryImage,
    [property: JsonPropertyName("oferta")] bool OnSale,
    [property: JsonPropertyName("garantia")] bool Warranty,
    [property: JsonPropertyName("transporte")] bool Transport,
    [property: JsonPropertyName("factura")] bool Invoice,
    [property: JsonPropertyName("top_ventas")] bool TopVentas,
    [property: JsonPropertyName("top_rank")] int? TopRank,
    bool IsActive,
    string Store,
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
        ProductPricing.GetEffectivePriceUsd(product),
        product.PriceUsd,
        ProductPricing.GetActiveDiscountPercent(product),
        product.Specifications,
        product.PrimaryImage,
        product.OnSale,
        product.Warranty,
        product.Transport,
        product.Invoice,
        product.TopRank.HasValue,
        product.TopRank,
        product.IsActive,
        product.Store,
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

/// <summary>A batch of cursor-paged results and continuation metadata.</summary>
public sealed record CursorPagedResponse<T>(
    IReadOnlyList<T> Items,
    string? NextCursor,
    bool HasMore,
    int PageSize,
    int? TotalItems);

/// <summary>Summary metadata for a store's active catalog.</summary>
public sealed record ProductCatalogMetaResponse(
    int TotalActive,
    decimal? MaxPriceUsd);
