using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Powergy.Api.Contracts;
using Powergy.Api.Services;

namespace Powergy.Api.Controllers;

/// <summary>Reads and administers solar-energy catalog products.</summary>
[ApiController]
[Route("api/products")]
[Produces("application/json")]
public sealed class ProductsController(IProductService products) : ControllerBase
{
    /// <summary>Returns a filtered page of active catalog products.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<ProductResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<ProductResponse>>> GetProducts(
        [FromQuery] ProductQueryRequest request,
        CancellationToken cancellationToken)
    {
        var page = await products.GetPublicPageAsync(request, cancellationToken);
        return Ok(page);
    }

    /// <summary>Returns an active catalog product by slug.</summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductResponse>> GetProduct(
        string slug,
        CancellationToken cancellationToken)
    {
        var product = await products.GetBySlugAsync(slug, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    /// <summary>Returns a filtered page of products, including inactive records when requested.</summary>
    [HttpGet("admin")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(PagedResponse<ProductResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResponse<ProductResponse>>> GetAllProducts(
        [FromQuery] ProductQueryRequest request,
        CancellationToken cancellationToken)
    {
        var page = await products.GetAdminPageAsync(request, cancellationToken);
        return Ok(page);
    }

    /// <summary>Creates a product in the catalog.</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> CreateProduct(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await products.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetProduct), new { slug = product.Slug }, product);
    }

    /// <summary>Replaces a product's editable catalog fields.</summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> UpdateProduct(
        string id,
        UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await products.UpdateAsync(id, request, cancellationToken);
        return Ok(product);
    }

    /// <summary>Deactivates a product without permanently deleting its record.</summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivateProduct(
        string id,
        CancellationToken cancellationToken)
    {
        await products.DeactivateAsync(id, cancellationToken);
        return NoContent();
    }
}
