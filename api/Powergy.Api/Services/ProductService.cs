using System.Buffers.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Powergy.Api.Contracts;
using Powergy.Api.Data;
using Powergy.Api.Exceptions;
using Powergy.Api.Models;
using Powergy.Api.Specifications;

namespace Powergy.Api.Services;

public sealed class ProductService(PowergyDbContext db, IAuditLogService audit) : IProductService
{
    private sealed record ProductCursorToken(
        string Sort,
        string Id,
        int? TopRank,
        string Name,
        decimal EffectivePrice,
        bool IsUnpriced,
        DateTime CreatedAt);

    public Task<PagedResponse<ProductResponse>> GetPublicPageAsync(
        ProductQueryRequest request,
        CancellationToken cancellationToken)
        => GetPageAsync(request, admin: false, cancellationToken);

    public async Task<CursorPagedResponse<ProductResponse>> GetPublicCursorPageAsync(
        ProductCursorQueryRequest request,
        CancellationToken cancellationToken)
    {
        var sort = ProductSortModes.Resolve(request.Sort);
        var store = StoreKeys.Resolve(request.Store);
        var cursor = string.IsNullOrWhiteSpace(request.Cursor)
            ? null
            : DecodeCursor(request.Cursor.Trim(), sort);

        var specification = new ProductCatalogSpecification(request, store);
        var filteredQuery = ApplySearchTerms(
            SpecificationEvaluator.GetQuery(db.Products.AsNoTracking(), specification),
            request.Q);

        int? totalItems = cursor is null
            ? await filteredQuery.CountAsync(cancellationToken)
            : null;

        if (cursor is not null)
        {
            filteredQuery = ApplyCursor(filteredQuery, sort, cursor);
        }

        var rows = await ApplyOrdering(filteredQuery, sort)
            .Take(request.Limit + 1)
            .ToListAsync(cancellationToken);

        var hasMore = rows.Count > request.Limit;
        var pageItems = hasMore ? rows.Take(request.Limit).ToArray() : rows.ToArray();
        var nextCursor = hasMore
            ? EncodeCursor(sort, pageItems[^1])
            : null;

        return new CursorPagedResponse<ProductResponse>(
            pageItems.Select(ProductResponse.From).ToArray(),
            nextCursor,
            hasMore,
            request.Limit,
            totalItems);
    }

    public async Task<ProductCatalogMetaResponse> GetCatalogMetaAsync(
        string? store,
        CancellationToken cancellationToken)
    {
        var tienda = StoreKeys.Resolve(store);
        var activeQuery = db.Products
            .AsNoTracking()
            .Where(product =>
                product.Store == tienda
                && product.IsActive
                && product.Category.IsActive);

        var totalActive = await activeQuery.CountAsync(cancellationToken);
        var maxPriceUsd = await activeQuery.MaxAsync(
            product => (decimal?)product.PriceUsd,
            cancellationToken);

        return new ProductCatalogMetaResponse(totalActive, maxPriceUsd);
    }

    public Task<PagedResponse<ProductResponse>> GetAdminPageAsync(
        ProductQueryRequest request,
        CancellationToken cancellationToken)
        => GetPageAsync(request, admin: true, cancellationToken);

    public async Task<ProductResponse?> GetBySlugAsync(
        string slug,
        string? store,
        CancellationToken cancellationToken)
    {
        var specification = new ActiveProductBySlugSpecification(
            slug.Trim(),
            StoreKeys.Resolve(store));
        var product = await SpecificationEvaluator
            .GetQuery(db.Products.AsNoTracking(), specification)
            .FirstOrDefaultAsync(cancellationToken);

        return product is null ? null : ProductResponse.From(product);
    }

    public async Task<ProductResponse?> GetByIdAsync(
        string id,
        string? store,
        CancellationToken cancellationToken)
    {
        var trimmed = id.Trim();
        if (trimmed.Length == 0)
        {
            return null;
        }

        var specification = new ActiveProductByIdSpecification(
            trimmed,
            StoreKeys.Resolve(store));
        var product = await SpecificationEvaluator
            .GetQuery(db.Products.AsNoTracking(), specification)
            .FirstOrDefaultAsync(cancellationToken);

        return product is null ? null : ProductResponse.From(product);
    }

    public async Task<IReadOnlyList<ProductResponse>> GetByIdsAsync(
        IReadOnlyList<string> ids,
        string? store,
        CancellationToken cancellationToken)
    {
        var cleanIds = ids
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .Take(50)
            .ToArray();

        if (cleanIds.Length == 0)
        {
            return [];
        }

        var specification = new ActiveProductsByIdsSpecification(
            cleanIds,
            StoreKeys.Resolve(store));
        var products = await SpecificationEvaluator
            .GetQuery(db.Products.AsNoTracking(), specification)
            .ToListAsync(cancellationToken);

        return products.Select(ProductResponse.From).ToArray();
    }

    public async Task<ProductResponse> CreateAsync(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var slug = RequiredText(request.Slug, nameof(request.Slug));
        var store = StoreKeys.Resolve(request.Store);
        var id = string.IsNullOrWhiteSpace(request.Id)
            ? $"PRD-{Guid.NewGuid():N}"
            : RequiredText(request.Id, nameof(request.Id));

        if (!await db.Categories.AnyAsync(
                category => category.Id == request.CategoryId
                    && category.IsActive
                    && category.Store == store,
                cancellationToken))
        {
            throw new ApiValidationException("La categoría no existe o está inactiva.");
        }

        if (await db.Products.AnyAsync(
                product => product.Id == id
                    || (product.Store == store && product.Slug == slug),
                cancellationToken))
        {
            throw new ApiConflictException("El ID o slug ya está en uso.");
        }

        var product = new Product
        {
            Id = id,
            Slug = slug,
            Store = store,
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
        var store = StoreKeys.Resolve(request.Store);
        var product = await db.Products
            .Include(item => item.Category)
            .FirstOrDefaultAsync(
                item => item.Id == id && item.Store == store,
                cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró el producto.");

        var category = await db.Categories.FirstOrDefaultAsync(
            item => item.Id == request.CategoryId
                && item.IsActive
                && item.Store == store,
            cancellationToken);
        if (category is null)
        {
            throw new ApiValidationException("La categoría no existe o está inactiva.");
        }

        var slug = RequiredText(request.Slug, nameof(request.Slug));
        if (await db.Products.AnyAsync(
                item => item.Id != id && item.Store == store && item.Slug == slug,
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

    public async Task DeactivateAsync(
        string id,
        string? store,
        CancellationToken cancellationToken)
    {
        var tienda = StoreKeys.Resolve(store);
        var product = await db.Products.FirstOrDefaultAsync(
            item => item.Id == id && item.Store == tienda,
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
        var sort = ProductSortModes.Resolve(request.Sort);
        var specification = new ProductCatalogSpecification(
            request,
            admin,
            StoreKeys.Resolve(request.Store));
        var filteredQuery = ApplySearchTerms(
            SpecificationEvaluator.GetQuery(db.Products.AsNoTracking(), specification),
            request.Q);

        var totalItems = await filteredQuery.CountAsync(cancellationToken);
        var items = await ApplyOrdering(filteredQuery, sort)
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

    private static IQueryable<Product> ApplySearchTerms(
        IQueryable<Product> query,
        string? rawQuery)
    {
        var trimmed = rawQuery?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return query;
        }

        var tokens = trimmed
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Take(6);

        foreach (var token in tokens)
        {
            var pattern = $"%{EscapeLike(token)}%";
            query = query.Where(product =>
                EF.Functions.ILike(product.Name, pattern, "\\")
                || EF.Functions.ILike(product.Slug, pattern, "\\")
                || EF.Functions.ILike(product.Brand, pattern, "\\")
                || EF.Functions.ILike(product.Model, pattern, "\\")
                || EF.Functions.ILike(product.Subcategory, pattern, "\\")
                || EF.Functions.ILike(product.Specifications, pattern, "\\")
                || EF.Functions.ILike(product.Category.Name, pattern, "\\"));
        }

        return query;
    }

    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);

    private static IQueryable<Product> ApplyOrdering(
        IQueryable<Product> query,
        string sort) =>
        sort switch
        {
            ProductSortModes.PrecioAsc => query
                .OrderBy(product => product.PriceUsd == null || product.PriceUsd <= 0)
                .ThenBy(product => product.PriceUsd ?? 0m)
                .ThenBy(product => product.Name)
                .ThenBy(product => product.Id),
            ProductSortModes.PrecioDesc => query
                .OrderBy(product => product.PriceUsd == null || product.PriceUsd <= 0)
                .ThenByDescending(product => product.PriceUsd ?? 0m)
                .ThenBy(product => product.Name)
                .ThenBy(product => product.Id),
            ProductSortModes.Nuevos => query
                .OrderByDescending(product => product.CreatedAt)
                .ThenBy(product => product.Id),
            _ => query
                .OrderBy(product => product.TopRank)
                .ThenBy(product => product.Name)
                .ThenBy(product => product.Id)
        };

    private static IQueryable<Product> ApplyCursor(
        IQueryable<Product> query,
        string sort,
        ProductCursorToken cursor)
    {
        switch (sort)
        {
            case ProductSortModes.PrecioAsc:
                if (!cursor.IsUnpriced)
                {
                    return query.Where(product =>
                        product.PriceUsd == null
                        || product.PriceUsd <= 0
                        || (product.PriceUsd > 0
                            && ((product.PriceUsd ?? 0m) > cursor.EffectivePrice
                                || ((product.PriceUsd ?? 0m) == cursor.EffectivePrice
                                    && (string.Compare(product.Name, cursor.Name) > 0
                                        || (product.Name == cursor.Name
                                            && string.Compare(product.Id, cursor.Id) > 0))))));
                }

                return query.Where(product =>
                    (product.PriceUsd == null || product.PriceUsd <= 0)
                    && (string.Compare(product.Name, cursor.Name) > 0
                        || (product.Name == cursor.Name
                            && string.Compare(product.Id, cursor.Id) > 0)));

            case ProductSortModes.PrecioDesc:
                if (!cursor.IsUnpriced)
                {
                    return query.Where(product =>
                        product.PriceUsd == null
                        || product.PriceUsd <= 0
                        || (product.PriceUsd > 0
                            && ((product.PriceUsd ?? 0m) < cursor.EffectivePrice
                                || ((product.PriceUsd ?? 0m) == cursor.EffectivePrice
                                    && (string.Compare(product.Name, cursor.Name) > 0
                                        || (product.Name == cursor.Name
                                            && string.Compare(product.Id, cursor.Id) > 0))))));
                }

                return query.Where(product =>
                    (product.PriceUsd == null || product.PriceUsd <= 0)
                    && (string.Compare(product.Name, cursor.Name) > 0
                        || (product.Name == cursor.Name
                            && string.Compare(product.Id, cursor.Id) > 0)));

            case ProductSortModes.Nuevos:
                return query.Where(product =>
                    product.CreatedAt < cursor.CreatedAt
                    || (product.CreatedAt == cursor.CreatedAt
                        && string.Compare(product.Id, cursor.Id) > 0));

            default:
                if (cursor.TopRank.HasValue)
                {
                    var rank = cursor.TopRank.Value;
                    return query.Where(product =>
                        product.TopRank == null
                        || product.TopRank > rank
                        || (product.TopRank == rank
                            && (string.Compare(product.Name, cursor.Name) > 0
                                || (product.Name == cursor.Name
                                    && string.Compare(product.Id, cursor.Id) > 0))));
                }

                return query.Where(product =>
                    product.TopRank == null
                    && (string.Compare(product.Name, cursor.Name) > 0
                        || (product.Name == cursor.Name
                            && string.Compare(product.Id, cursor.Id) > 0)));
        }
    }

    private static string EncodeCursor(string sort, Product product)
    {
        var isUnpriced = product.PriceUsd is null or <= 0;
        var token = new ProductCursorToken(
            sort,
            product.Id,
            product.TopRank,
            product.Name,
            isUnpriced ? 0m : product.PriceUsd!.Value,
            isUnpriced,
            DateTime.SpecifyKind(product.CreatedAt, DateTimeKind.Utc));

        var bytes = JsonSerializer.SerializeToUtf8Bytes(token);
        return Base64Url.EncodeToString(bytes);
    }

    private static ProductCursorToken DecodeCursor(string encoded, string expectedSort)
    {
        try
        {
            var bytes = Base64Url.DecodeFromChars(encoded);
            var token = JsonSerializer.Deserialize<ProductCursorToken>(bytes);
            if (token is null
                || string.IsNullOrWhiteSpace(token.Id)
                || token.Name is null
                || token.Sort != expectedSort)
            {
                throw new ApiValidationException("El cursor de paginación no es válido.");
            }

            return token with
            {
                CreatedAt = DateTime.SpecifyKind(
                    token.CreatedAt.ToUniversalTime(),
                    DateTimeKind.Utc)
            };
        }
        catch (Exception exception) when (exception is FormatException or JsonException or ArgumentException)
        {
            throw new ApiValidationException("El cursor de paginación no es válido.");
        }
    }

    private static string RequiredText(string value, string fieldName)
    {
        var trimmed = value.Trim();
        return trimmed.Length > 0
            ? trimmed
            : throw new ApiValidationException($"El campo {fieldName} no puede estar vacío.");
    }
}
