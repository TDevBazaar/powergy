namespace Powergy.Api.Models;

public sealed class CustomerOrder
{
    public Guid Id { get; set; }
    public Guid IdempotencyKey { get; set; }
    public string Status { get; set; } = CustomerOrderStatuses.Requested;
    public decimal? EstimatedTotalUsd { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public Guid? ClosedByAdminUserId { get; set; }
    public AdminUser? ClosedByAdminUser { get; set; }
    public ICollection<CustomerOrderLine> Lines { get; set; } = new List<CustomerOrderLine>();
    public ICollection<CustomerOrderStatusHistory> StatusHistory { get; set; } =
        new List<CustomerOrderStatusHistory>();
}

public static class CustomerOrderStatuses
{
    public const string Requested = "requested";
    public const string Closed = "closed";
}
