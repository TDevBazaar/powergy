using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Powergy.Api.Auth;
using Powergy.Api.Contracts;
using Powergy.Api.Services;

namespace Powergy.Api.Controllers;

/// <summary>Lets each signed-in administrator configure their referral link and WhatsApp number.</summary>
[ApiController]
[Route("api/admin/profile")]
[Authorize(Policy = "AdminOnly")]
[Produces("application/json")]
public sealed class AdminProfileController(
    ISellerService sellers,
    ICurrentAdminAccessor admins) : ControllerBase
{
    /// <summary>Returns the current administrator's referral link and WhatsApp settings.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(AdminSellerProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminSellerProfileResponse>> GetProfile(
        CancellationToken cancellationToken)
    {
        var adminUserId = await admins.GetAdminUserIdAsync(cancellationToken);
        if (adminUserId is null)
        {
            return Unauthorized();
        }

        return Ok(await sellers.GetAdminProfileAsync(adminUserId.Value, cancellationToken));
    }

    /// <summary>Updates the current administrator's display name, referral code and WhatsApp phone.</summary>
    [HttpPut]
    [ProducesResponseType(typeof(AdminSellerProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminSellerProfileResponse>> UpdateProfile(
        UpdateAdminSellerProfileRequest request,
        CancellationToken cancellationToken)
    {
        var adminUserId = await admins.GetAdminUserIdAsync(cancellationToken);
        if (adminUserId is null)
        {
            return Unauthorized();
        }

        return Ok(await sellers.UpdateAdminProfileAsync(
            adminUserId.Value,
            request,
            cancellationToken));
    }
}
