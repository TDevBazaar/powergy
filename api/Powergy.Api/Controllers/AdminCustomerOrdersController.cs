using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Powergy.Api.Contracts;
using Powergy.Api.Services;

namespace Powergy.Api.Controllers;

/// <summary>Lists, reports and closes customer order requests for administrators.</summary>
[ApiController]
[Route("api/admin/orders")]
[Authorize(Policy = "AdminOnly")]
[Produces("application/json")]
public sealed class AdminCustomerOrdersController(ICustomerOrderService orders) : ControllerBase
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

    /// <summary>Closes a request and records the authenticated administrator and timestamp.</summary>
    [HttpPost("{id:guid}/close")]
    [ProducesResponseType(typeof(CustomerOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerOrderResponse>> CloseOrder(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("sub"), out var adminUserId))
        {
            return Unauthorized();
        }

        return Ok(await orders.CloseAsync(id, adminUserId, cancellationToken));
    }
}
