namespace Powergy.Api.Models;

public sealed class CustomerOrderStatusHistory
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public CustomerOrder Order { get; set; } = null!;
    public string? PreviousStatus { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? ChangedByAdminUserId { get; set; }
    public DateTime ChangedAt { get; set; }
}
