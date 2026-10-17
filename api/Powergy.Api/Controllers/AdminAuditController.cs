using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Powergy.Api.Contracts;
using Powergy.Api.Services;

namespace Powergy.Api.Controllers;

/// <summary>Exposes the administrative audit trail of catalog and category changes.</summary>
[ApiController]
[Route("api/admin/audit")]
[Authorize(Policy = "AdminOnly")]
[Produces("application/json")]
public sealed class AdminAuditController(IAuditLogService audit) : ControllerBase
{
    /// <summary>Returns a filtered page of audit entries, newest first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<AdminAuditLogResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResponse<AdminAuditLogResponse>>> GetLogs(
        [FromQuery] AdminAuditLogQueryRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await audit.GetPageAsync(request, cancellationToken));
    }
}
