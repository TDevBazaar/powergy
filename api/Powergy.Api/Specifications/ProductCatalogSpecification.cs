using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Powergy.Api.Contracts;
using Powergy.Api.Models;

namespace Powergy.Api.Specifications;

public sealed class ProductCatalogSpecification : Specification<Product>
{
    public ProductCatalogSpecification(ProductQueryRequest request, bool admin, string store)
    {
        AddInclude(product => product.Category);

        var category = request.Category?.Trim();
        var term = request.Q?.Trim();

        Criteria = product =>
            product.Store == store
            && (admin
                ? request.IncludeInactive || product.IsActive
                : product.IsActive && product.Category.IsActive)
            && (string.IsNullOrEmpty(category) || product.Category.Slug == category)
            && (string.IsNullOrEmpty(term)
                || EF.Functions.ILike(product.Name, $"%{term}%")
                || EF.Functions.ILike(product.Brand, $"%{term}%")
                || EF.Functions.ILike(product.Model, $"%{term}%")
                || EF.Functions.ILike(product.Specifications, $"%{term}%"))
            && (!request.OnSale.HasValue || product.OnSale == request.OnSale.Value)
            && (!request.Featured.HasValue
                || product.TopRank.HasValue == request.Featured.Value);
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
