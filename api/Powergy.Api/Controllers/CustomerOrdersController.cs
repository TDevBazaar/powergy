using Microsoft.AspNetCore.Mvc;
using Powergy.Api.Contracts;
using Powergy.Api.Services;

namespace Powergy.Api.Controllers;

/// <summary>Records a catalog order request before the customer opens WhatsApp.</summary>
[ApiController]
[Route("api/orders")]
[Produces("application/json")]
public sealed class CustomerOrdersController(ICustomerOrderService orders) : ControllerBase
{
    /// <summary>Creates or returns an idempotent WhatsApp order request.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CustomerOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CustomerOrderResponse>> CreateOrder(
        CreateCustomerOrderRequest request,
        CancellationToken cancellationToken)
    {
        var order = await orders.CreateAsync(request, cancellationToken);
        return Ok(order);
    }
}
