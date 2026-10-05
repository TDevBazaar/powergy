using System.ComponentModel.DataAnnotations;
using Powergy.Api.Models;

namespace Powergy.Api.Contracts;

/// <summary>Validated payload used to create or update a category.</summary>
public sealed record CategoryRequest
{
    /// <summary>Display name.</summary>
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Name { get; init; }

    /// <summary>Unique URL slug.</summary>
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Slug { get; init; }

    /// <summary>Position in category lists.</summary>
    [Range(0, 100000)]
    public int SortOrder { get; init; }
}

/// <summary>Represents a category returned by the API.</summary>
public sealed record CategoryResponse(
    Guid Id,
    string Name,
    string Slug,
    int SortOrder,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    /// <summary>Maps a persisted category entity to the API contract.</summary>
    public static CategoryResponse From(Category category) => new(
        category.Id,
        category.Name,
        category.Slug,
        category.SortOrder,
        category.IsActive,
        new DateTimeOffset(DateTime.SpecifyKind(category.CreatedAt, DateTimeKind.Utc)),
        new DateTimeOffset(DateTime.SpecifyKind(category.UpdatedAt, DateTimeKind.Utc)));
}
