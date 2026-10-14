namespace Powergy.Api.Models;

public sealed class CustomerOrderLine
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public CustomerOrder Order { get; set; } = null!;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ProductSlug { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal? UnitPriceUsd { get; set; }
}
