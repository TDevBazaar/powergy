using Powergy.Api.Contracts;

namespace Powergy.Api.Services;

public interface IProductService
{
    Task<PagedResponse<ProductResponse>> GetPublicPageAsync(
        ProductQueryRequest request,
        CancellationToken cancellationToken);

    Task<ProductResponse?> GetBySlugAsync(
        string slug,
        CancellationToken cancellationToken);

    Task<PagedResponse<ProductResponse>> GetAdminPageAsync(
        ProductQueryRequest request,
        CancellationToken cancellationToken);

    Task<ProductResponse> CreateAsync(
        CreateProductRequest request,
        CancellationToken cancellationToken);

    Task<ProductResponse> UpdateAsync(
        string id,
        UpdateProductRequest request,
        CancellationToken cancellationToken);

    Task DeactivateAsync(string id, CancellationToken cancellationToken);
}
