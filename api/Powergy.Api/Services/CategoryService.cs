using Microsoft.EntityFrameworkCore;
using Powergy.Api.Contracts;
using Powergy.Api.Data;
using Powergy.Api.Exceptions;
using Powergy.Api.Models;

namespace Powergy.Api.Services;

public sealed class CategoryService(PowergyDbContext db, IAuditLogService audit) : ICategoryService
{
    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync(
        bool includeInactive,
        string? store,
        CancellationToken cancellationToken)
    {
        var tienda = StoreKeys.Resolve(store);
        var query = db.Categories
            .AsNoTracking()
            .Where(category => category.Store == tienda);
        if (!includeInactive)
        {
            query = query.Where(category => category.IsActive);
        }

        var categories = await query
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .ThenBy(category => category.Id)
            .ToListAsync(cancellationToken);

        return categories.Select(CategoryResponse.From).ToArray();
    }

    public async Task<CategoryResponse?> GetByIdAsync(
        Guid id,
        string? store,
        CancellationToken cancellationToken)
    {
        var tienda = StoreKeys.Resolve(store);
        var category = await db.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == id && item.Store == tienda && item.IsActive,
                cancellationToken);

        return category is null ? null : CategoryResponse.From(category);
    }

    public async Task<CategoryResponse> CreateAsync(
        CategoryRequest request,
        CancellationToken cancellationToken)
    {
        var slug = RequiredText(request.Slug, nameof(request.Slug));
        var store = StoreKeys.Resolve(request.Store);
        if (await db.Categories.AnyAsync(
                category => category.Store == store && category.Slug == slug,
                cancellationToken))
        {
            throw new ApiConflictException("El slug ya está en uso.");
        }

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = RequiredText(request.Name, nameof(request.Name)),
            Slug = slug,
            Store = store,
            SortOrder = request.SortOrder
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);

        await audit.RecordAsync(
            AuditEntityTypes.Category,
            category.Id.ToString(),
            AuditActions.Create,
            new AuditChangeSet()
                .Add("name", null, category.Name)
                .Add("slug", null, category.Slug)
                .Add("store", null, category.Store)
                .Add("sortOrder", null, category.SortOrder)
                .Build(),
            cancellationToken);

        return CategoryResponse.From(category);
    }

    public async Task<CategoryResponse> UpdateAsync(
        Guid id,
        CategoryRequest request,
        CancellationToken cancellationToken)
    {
        var store = StoreKeys.Resolve(request.Store);
        var category = await db.Categories.FirstOrDefaultAsync(
            item => item.Id == id && item.Store == store,
            cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró la categoría.");

        var slug = RequiredText(request.Slug, nameof(request.Slug));
        if (await db.Categories.AnyAsync(
                item => item.Id != id && item.Store == store && item.Slug == slug,
                cancellationToken))
        {
            throw new ApiConflictException("El slug ya está en uso.");
        }

        var anterior = new { category.Name, category.Slug, category.SortOrder, category.IsActive };

        category.Name = RequiredText(request.Name, nameof(request.Name));
        category.Slug = slug;
        category.SortOrder = request.SortOrder;
        category.IsActive = true;
        await db.SaveChangesAsync(cancellationToken);

        await audit.RecordAsync(
            AuditEntityTypes.Category,
            category.Id.ToString(),
            AuditActions.Update,
            new AuditChangeSet()
                .Add("name", anterior.Name, category.Name)
                .Add("slug", anterior.Slug, category.Slug)
                .Add("sortOrder", anterior.SortOrder, category.SortOrder)
                .Add("isActive", anterior.IsActive, category.IsActive)
                .Build(),
            cancellationToken);

        return CategoryResponse.From(category);
    }

    public async Task DeactivateAsync(
        Guid id,
        string? store,
        CancellationToken cancellationToken)
    {
        var tienda = StoreKeys.Resolve(store);
        var category = await db.Categories.FirstOrDefaultAsync(
            item => item.Id == id && item.Store == tienda,
            cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró la categoría.");

        if (category.IsActive)
        {
            category.IsActive = false;
            await db.SaveChangesAsync(cancellationToken);

            await audit.RecordAsync(
                AuditEntityTypes.Category,
                category.Id.ToString(),
                AuditActions.Deactivate,
                new AuditChangeSet().Add("isActive", true, false).Build(),
                cancellationToken);
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
