using Microsoft.AspNetCore.Mvc;
using Powergy.Api.Contracts;
using Powergy.Api.Services;

namespace Powergy.Api.Controllers;

/// <summary>Exposes the WhatsApp contact routing of active referral administrators.</summary>
[ApiController]
[Route("api/sellers")]
[Produces("application/json")]
public sealed class SellersController(ISellerService sellers) : ControllerBase
{
    /// <summary>Returns the WhatsApp routing data for an active referral code.</summary>
    [HttpGet("{code}")]
    [ProducesResponseType(typeof(PublicSellerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicSellerResponse>> GetByCode(
        string code,
        CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        var seller = await sellers.GetPublicByCodeAsync(code, cancellationToken);
        return seller is null ? NotFound() : Ok(seller);
    }
}
