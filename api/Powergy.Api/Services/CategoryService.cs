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
        CancellationToken cancellationToken)
    {
        var query = db.Categories.AsNoTracking().AsQueryable();
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
        CancellationToken cancellationToken)
    {
        var category = await db.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == id && item.IsActive,
                cancellationToken);

        return category is null ? null : CategoryResponse.From(category);
    }

    public async Task<CategoryResponse> CreateAsync(
        CategoryRequest request,
        CancellationToken cancellationToken)
    {
        var slug = RequiredText(request.Slug, nameof(request.Slug));
        if (await db.Categories.AnyAsync(
                category => category.Slug == slug,
                cancellationToken))
        {
            throw new ApiConflictException("El slug ya está en uso.");
        }

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = RequiredText(request.Name, nameof(request.Name)),
            Slug = slug,
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
        var category = await db.Categories.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken)
            ?? throw new ApiNotFoundException("No se encontró la categoría.");

        var slug = RequiredText(request.Slug, nameof(request.Slug));
        if (await db.Categories.AnyAsync(
                item => item.Id != id && item.Slug == slug,
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

    public async Task DeactivateAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FirstOrDefaultAsync(
            item => item.Id == id,
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
