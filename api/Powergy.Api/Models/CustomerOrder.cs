namespace Powergy.Api.Models;

public sealed class CustomerOrder
{
    public Guid Id { get; set; }
    public Guid IdempotencyKey { get; set; }
    public string Status { get; set; } = CustomerOrderStatuses.Requested;
    public decimal? EstimatedTotalUsd { get; set; }

    /// <summary>Total estimado tal como se solicitó, antes de ajustes del administrador.</summary>
    public decimal? OriginalEstimatedTotalUsd { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>Fecha de finalización (venta cerrada o solicitud cancelada).</summary>
    public DateTime? ClosedAt { get; set; }

    public Guid? ClosedByAdminUserId { get; set; }
    public AdminUser? ClosedByAdminUser { get; set; }
    public string? CancellationReason { get; set; }
    public string? CancellationNote { get; set; }
    public ICollection<CustomerOrderLine> Lines { get; set; } = new List<CustomerOrderLine>();
    public ICollection<CustomerOrderStatusHistory> StatusHistory { get; set; } =
        new List<CustomerOrderStatusHistory>();
}

public static class CustomerOrderStatuses
{
    public const string Requested = "requested";
    public const string Closed = "closed";
    public const string Cancelled = "cancelled";

    public static readonly IReadOnlyList<string> All = [Requested, Closed, Cancelled];

    public static bool IsFinal(string status) => status is Closed or Cancelled;
}

public static class CustomerOrderCancellationReasons
{
    public const string Price = "price";
    public const string Stock = "stock";
    public const string NoResponse = "no_response";
    public const string Regret = "regret";
    public const string Other = "other";

    public static readonly IReadOnlyList<string> All =
        [Price, Stock, NoResponse, Regret, Other];

    public static string? Normalize(string? reason)
    {
        var value = reason?.Trim().ToLowerInvariant();
        return string.IsNullOrEmpty(value) ? null : value;
    }

    public static bool IsValid(string? reason) => reason is not null && All.Contains(reason);
}
