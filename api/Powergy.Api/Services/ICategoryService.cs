using Powergy.Api.Contracts;

namespace Powergy.Api.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryResponse>> GetAllAsync(
        bool includeInactive,
        CancellationToken cancellationToken);

    Task<CategoryResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<CategoryResponse> CreateAsync(
        CategoryRequest request,
        CancellationToken cancellationToken);

    Task<CategoryResponse> UpdateAsync(
        Guid id,
        CategoryRequest request,
        CancellationToken cancellationToken);

    Task DeactivateAsync(Guid id, CancellationToken cancellationToken);
}
