using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Powergy.Api.Contracts;
using Powergy.Api.Data;
using Powergy.Api.Services;

namespace Powergy.Api.Controllers;

/// <summary>Lists, reports and closes customer order requests for administrators.</summary>
[ApiController]
[Route("api/admin/orders")]
[Authorize(Policy = "AdminOnly")]
[Produces("application/json")]
public sealed class AdminCustomerOrdersController(
    ICustomerOrderService orders,
    PowergyDbContext db) : ControllerBase
{
    /// <summary>Returns a filtered page of order requests.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<CustomerOrderListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<CustomerOrderListItemResponse>>> GetOrders(
        [FromQuery] CustomerOrderQueryRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await orders.GetPageAsync(request, cancellationToken));
    }

    /// <summary>Returns request and closure counts for a period.</summary>
    [HttpGet("metrics")]
    [ProducesResponseType(typeof(CustomerOrderMetricsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CustomerOrderMetricsResponse>> GetMetrics(
        [FromQuery] CustomerOrderMetricsRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await orders.GetMetricsAsync(request, cancellationToken));
    }

    /// <summary>Returns an order request by its direct-link identifier.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CustomerOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerOrderResponse>> GetOrder(
        Guid id,
        CancellationToken cancellationToken)
    {
        var order = await orders.GetByIdAsync(id, cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }

    /// <summary>Finaliza una solicitud (vendida o cancelada) y registra al administrador.</summary>
    [HttpPost("{id:guid}/close")]
    [ProducesResponseType(typeof(CustomerOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerOrderResponse>> CloseOrder(
        Guid id,
        [FromBody] CloseCustomerOrderRequest? request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var supabaseUserId))
        {
            return Unauthorized();
        }

        // El token identifica al administrador por su usuario de Supabase, pero
        // closed_by_admin_user_id referencia admin_users.id, así que resolvemos
        // la clave interna antes de cerrar la solicitud.
        var adminUserId = await db.AdminUsers
            .Where(admin => admin.SupabaseUserId == supabaseUserId && admin.IsActive)
            .Select(admin => (Guid?)admin.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (adminUserId is null)
        {
            return Unauthorized();
        }

        return Ok(await orders.CloseAsync(
            id,
            adminUserId.Value,
            request ?? new CloseCustomerOrderRequest(),
            cancellationToken));
    }
}
