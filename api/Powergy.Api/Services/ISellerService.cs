using Powergy.Api.Contracts;

namespace Powergy.Api.Services;

public interface ISellerService
{
    Task<PublicSellerResponse?> GetPublicByCodeAsync(
        string code,
        CancellationToken cancellationToken);

    Task<AdminSellerProfileResponse> GetAdminProfileAsync(
        Guid adminUserId,
        CancellationToken cancellationToken);

    Task<AdminSellerProfileResponse> UpdateAdminProfileAsync(
        Guid adminUserId,
        UpdateAdminSellerProfileRequest request,
        CancellationToken cancellationToken);
}
