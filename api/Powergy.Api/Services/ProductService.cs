using Microsoft.EntityFrameworkCore;
using Powergy.Api.Contracts;
using Powergy.Api.Data;
using Powergy.Api.Exceptions;
using Powergy.Api.Models;
using Powergy.Api.Specifications;

namespace Powergy.Api.Services;

public sealed class ProductService(PowergyDbContext db, IAuditLogService audit) : IProductService
{
    public Task<PagedResponse<ProductResponse>> GetPublicPageAsync(
        ProductQueryRequest request,
        CancellationToken cancellationToken)
        => GetPageAsync(request, admin: false, cancellationToken);

    public Task<PagedResponse<ProductResponse>> GetAdminPageAsync(
        ProductQueryRequest request,
        CancellationToken cancellationToken)
        => GetPageAsync(request, admin: true, cancellationToken);

    public async Task<ProductResponse?> GetBySlugAsync(
        string slug,
        CancellationToken cancellationToken)
    {
        var specification = new ActiveProductBySlugSpecification(slug.Trim());
        var product = await SpecificationEvaluator
            .GetQuery(db.Products.AsNoTracking(), specification)
            .FirstOrDefaultAsync(cancellationToken);

        return product is null ? null : ProductResponse.From(product);
    }

    public async Task<ProductResponse> CreateAsync(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var slug = RequiredText(request.Slug, nameof(request.Slug));
        var id = string.IsNullOrWhiteSpace(request.Id)
            ? $"PRD-{Guid.NewGuid():N}"
            : RequiredText(request.Id, nameof(request.Id));

        if (!await db.Categories.AnyAsync(
                category => category.Id == request.CategoryId && category.IsActive,
                cancellationToken))
        {
            throw new ApiValidationException("La categoría no existe o está inactiva.");
        }

        if (await db.Products.AnyAsync(
                product => product.Slug == slug || product.Id == id,
                cancellationToken))
        {
            throw new ApiConflictException("El ID o slug ya está en uso.");
        }

        var product = new Product
        {
            Id = id,
            Slug = slug,
            CategoryId = request.CategoryId,
            Subcategory = RequiredText(request.Subcategory, nameof(request.Subcategory)),
            Brand = RequiredText(request.Brand, nameof(request.Brand)),
            Model = RequiredText(request.Model, nameof(request.Model)),
            Name = RequiredText(request.Name, nameof(request.Name)),
            PriceUsd = request.PriceUsd,
            Specifications = RequiredText(request.Specifications, nameof(request.Specifications)),
            PrimaryImage = RequiredText(request.PrimaryImage, nameof(request.PrimaryImage)),
            OnSale = request.OnSale,
            Warranty = request.Warranty,
            Transport = request.Transport,
            Invoice = request.Invoice,
            TopRank = request.TopRank
        };

        db.Products.Add(product);
        await db.SaveChangesAsync(cancellationToken);
        await db.Entry(product).Reference(item => item.Category).LoadAsync(cancellationToken);

        await audit.RecordAsync(
            AuditEntityTypes.Product,
            product.Id,
            AuditActions.Create,
            new AuditChangeSet()
                .Add("slug", null, product.Slug)
                .Add("categoryId", null, product.CategoryId)
                .Add("name", null, product.Name)
                .Add("brand", null, product.Brand)
                .Add("model", null, product.Model)
                .Add("subcategory", null, product.Subcategory)
                .Add("priceUsd", null, product.PriceUsd)
                .Add("primaryImage", null, product.PrimaryImage)
                .Add("onSale", null, product.OnSale)
                .Add("warranty", null, product.Warranty)
                .Add("transport", null, product.Transport)
                .Add("invoice", null, product.Invoice)
                .Add("topRank", null, product.TopRank)
                .Build(),
            cancellationToken);

        return ProductResponse.From(product);
    }

    public async Task<ProductResponse> UpdateAsync(
        string id,
        UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await db.Products
            .Include(item => item.Category)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró el producto.");

        var category = await db.Categories.FirstOrDefaultAsync(
            item => item.Id == request.CategoryId && item.IsActive,
            cancellationToken);
        if (category is null)
        {
            throw new ApiValidationException("La categoría no existe o está inactiva.");
        }

        var slug = RequiredText(request.Slug, nameof(request.Slug));
        if (await db.Products.AnyAsync(
                item => item.Id != id && item.Slug == slug,
                cancellationToken))
        {
            throw new ApiConflictException("El slug ya está en uso.");
        }

        var anterior = new
        {
            product.Slug,
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
            product.TopRank,
            product.IsActive
        };

        product.Slug = slug;
        product.CategoryId = request.CategoryId;
        product.Category = category;
        product.Subcategory = RequiredText(request.Subcategory, nameof(request.Subcategory));
        product.Brand = RequiredText(request.Brand, nameof(request.Brand));
        product.Model = RequiredText(request.Model, nameof(request.Model));
        product.Name = RequiredText(request.Name, nameof(request.Name));
        product.PriceUsd = request.PriceUsd;
        product.Specifications = RequiredText(request.Specifications, nameof(request.Specifications));
        product.PrimaryImage = RequiredText(request.PrimaryImage, nameof(request.PrimaryImage));
        product.OnSale = request.OnSale;
        product.Warranty = request.Warranty;
        product.Transport = request.Transport;
        product.Invoice = request.Invoice;
        product.TopRank = request.TopRank;
        product.IsActive = request.IsActive;

        await db.SaveChangesAsync(cancellationToken);

        await audit.RecordAsync(
            AuditEntityTypes.Product,
            product.Id,
            AuditActions.Update,
            new AuditChangeSet()
                .Add("slug", anterior.Slug, product.Slug)
                .Add("categoryId", anterior.CategoryId, product.CategoryId)
                .Add("subcategory", anterior.Subcategory, product.Subcategory)
                .Add("brand", anterior.Brand, product.Brand)
                .Add("model", anterior.Model, product.Model)
                .Add("name", anterior.Name, product.Name)
                .Add("priceUsd", anterior.PriceUsd, product.PriceUsd)
                .Add("specifications", Recortar(anterior.Specifications),
                    Recortar(product.Specifications))
                .Add("primaryImage", anterior.PrimaryImage, product.PrimaryImage)
                .Add("onSale", anterior.OnSale, product.OnSale)
                .Add("warranty", anterior.Warranty, product.Warranty)
                .Add("transport", anterior.Transport, product.Transport)
                .Add("invoice", anterior.Invoice, product.Invoice)
                .Add("topRank", anterior.TopRank, product.TopRank)
                .Add("isActive", anterior.IsActive, product.IsActive)
                .Build(),
            cancellationToken);

        return ProductResponse.From(product);
    }

    public async Task DeactivateAsync(string id, CancellationToken cancellationToken)
    {
        var product = await db.Products.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró el producto.");

        if (product.IsActive)
        {
            product.IsActive = false;
            await db.SaveChangesAsync(cancellationToken);

            await audit.RecordAsync(
                AuditEntityTypes.Product,
                product.Id,
                AuditActions.Deactivate,
                new AuditChangeSet().Add("isActive", true, false).Build(),
                cancellationToken);
        }
    }

    private static string? Recortar(string? value, int maximo = 500) =>
        value is null || value.Length <= maximo ? value : $"{value[..maximo]}…";

    private async Task<PagedResponse<ProductResponse>> GetPageAsync(
        ProductQueryRequest request,
        bool admin,
        CancellationToken cancellationToken)
    {
        var specification = new ProductCatalogSpecification(request, admin);
        var filteredQuery = SpecificationEvaluator.GetQuery(
            db.Products.AsNoTracking(),
            specification);

        var totalItems = await filteredQuery.CountAsync(cancellationToken);
        var items = await filteredQuery
            .OrderBy(product => product.TopRank)
            .ThenBy(product => product.Name)
            .ThenBy(product => product.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<ProductResponse>(
            items.Select(ProductResponse.From).ToArray(),
            request.Page,
            request.PageSize,
            totalItems,
            (int)Math.Ceiling(totalItems / (double)request.PageSize));
    }

    private static string RequiredText(string value, string fieldName)
    {
        var trimmed = value.Trim();
        return trimmed.Length > 0
            ? trimmed
            : throw new ApiValidationException($"El campo {fieldName} no puede estar vacío.");
    }
}
