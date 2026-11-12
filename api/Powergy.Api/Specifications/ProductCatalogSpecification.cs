using Microsoft.EntityFrameworkCore;
using Powergy.Api.Contracts;
using Powergy.Api.Models;

namespace Powergy.Api.Specifications;

public sealed class ProductCatalogSpecification : Specification<Product>
{
    public ProductCatalogSpecification(ProductQueryRequest request, bool admin, string store)
        : this(
            request.Category,
            request.Categories,
            request.OnSale,
            request.Featured,
            request.MaxPrice,
            request.IncludeInactive,
            admin ? request.IsActive : null,
            request.HasPrice,
            admin,
            store)
    {
    }

    public ProductCatalogSpecification(ProductCursorQueryRequest request, string store)
        : this(
            request.Category,
            request.Categories,
            request.OnSale,
            request.Featured,
            request.MaxPrice,
            includeInactive: false,
            isActive: null,
            hasPrice: null,
            admin: false,
            store)
    {
    }

    private ProductCatalogSpecification(
        string? category,
        string? categories,
        bool? onSale,
        bool? featured,
        decimal? maxPrice,
        bool includeInactive,
        bool? isActive,
        bool? hasPrice,
        bool admin,
        string store)
    {
        AddInclude(product => product.Category);

        var categorySlugs = ParseCategories(category, categories);
        var hasCategories = categorySlugs.Length > 0;
        var hasMaxPrice = maxPrice.HasValue && maxPrice.Value > 0;
        var maxPriceValue = maxPrice ?? 0m;

        Criteria = product =>
            product.Store == store
            && (admin
                ? (isActive.HasValue
                    ? product.IsActive == isActive.Value
                    : (includeInactive || product.IsActive))
                : product.IsActive && product.Category.IsActive)
            && (!hasCategories || categorySlugs.Contains(product.Category.Slug))
            && (!onSale.HasValue || product.OnSale == onSale.Value)
            && (!featured.HasValue || product.TopRank.HasValue == featured.Value)
            && (!hasPrice.HasValue
                || (hasPrice.Value
                    ? (product.PriceUsd.HasValue && product.PriceUsd.Value > 0)
                    : (!product.PriceUsd.HasValue || product.PriceUsd.Value <= 0)))
            && (!hasMaxPrice
                || (product.PriceUsd.HasValue
                    && product.PriceUsd.Value > 0
                    && (product.OnSale
                        && product.DiscountPercent != null
                        && product.DiscountPercent > 0
                        ? (Math.Round(product.PriceUsd.Value * (100m - product.DiscountPercent.Value) / 100m, 2) < 0.01m
                            ? 0.01m
                            : Math.Round(product.PriceUsd.Value * (100m - product.DiscountPercent.Value) / 100m, 2))
                        : product.PriceUsd.Value) <= maxPriceValue));
    }

    private static string[] ParseCategories(string? category, string? categories)
    {
        var list = new List<string>();
        if (!string.IsNullOrWhiteSpace(category))
        {
            list.Add(category.Trim().ToLowerInvariant());
        }

        if (!string.IsNullOrWhiteSpace(categories))
        {
            foreach (var part in categories.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (part.Length > 0)
                {
                    list.Add(part.ToLowerInvariant());
                }
            }
        }

        return list
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToArray();
    }
}

public sealed class ActiveProductBySlugSpecification : Specification<Product>
{
    public ActiveProductBySlugSpecification(string slug, string store)
    {
        AddInclude(product => product.Category);
        Criteria = product =>
            product.Slug == slug
            && product.Store == store
            && product.IsActive
            && product.Category.IsActive;
    }
}

public sealed class ActiveProductByIdSpecification : Specification<Product>
{
    public ActiveProductByIdSpecification(string id, string store)
    {
        AddInclude(product => product.Category);
        Criteria = product =>
            product.Id == id
            && product.Store == store
            && product.IsActive
            && product.Category.IsActive;
    }
}

public sealed class ActiveProductsByIdsSpecification : Specification<Product>
{
    public ActiveProductsByIdsSpecification(IReadOnlyCollection<string> ids, string store)
    {
        AddInclude(product => product.Category);
        Criteria = product =>
            ids.Contains(product.Id)
            && product.Store == store
            && product.IsActive
            && product.Category.IsActive;
    }
}
