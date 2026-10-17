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

    /// <summary>Cantidad solicitada originalmente, antes de los ajustes del administrador.</summary>
    public int OriginalQuantity { get; set; }

    public decimal? UnitPriceUsd { get; set; }

    /// <summary>Fecha en que un administrador quitó el producto de la solicitud.</summary>
    public DateTime? RemovedAt { get; set; }

    public Guid? RemovedByAdminUserId { get; set; }
    public AdminUser? RemovedByAdminUser { get; set; }
}
