using System.ComponentModel.DataAnnotations;
using Powergy.Api.Models;

namespace Powergy.Api.Contracts;

public sealed record CreateCustomerOrderRequest
{
    [Required]
    public Guid IdempotencyKey { get; init; }

    [Required, MinLength(1), MaxLength(20)]
    public required IReadOnlyList<CustomerOrderLineRequest> Items { get; init; }
}

public sealed record CustomerOrderLineRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string ProductId { get; init; }

    [Range(1, 99)]
    public int Quantity { get; init; }
}

public sealed record CloseCustomerOrderRequest
{
    /// <summary>Resultado de la solicitud: "closed" (vendida) o "cancelled".</summary>
    [Required, RegularExpression("^(closed|cancelled)$")]
    public string Outcome { get; init; } = CustomerOrderStatuses.Closed;

    /// <summary>
    /// Líneas finales a conservar (productId y cantidad). Si es <c>null</c> se
    /// mantienen todas las líneas actuales. Solo se permite quitar productos o
    /// ajustar cantidades de los ya solicitados, nunca agregar nuevos.
    /// </summary>
    [MaxLength(20)]
    public IReadOnlyList<CustomerOrderLineRequest>? Items { get; init; }
}

public sealed record CustomerOrderQueryRequest
{
    public string? Status { get; init; }
    public DateTimeOffset? From { get; init; }
    public DateTimeOffset? To { get; init; }

    [Range(1, 1_000_000)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 25;
}

public sealed record CustomerOrderMetricsRequest
{
    public DateTimeOffset? From { get; init; }
    public DateTimeOffset? To { get; init; }
}

public sealed record CustomerOrderLineResponse(
    string ProductId,
    string ProductName,
    string ProductSlug,
    string CategoryName,
    int Quantity,
    decimal? UnitPriceUsd,
    decimal? LineTotalUsd);

public sealed record CustomerOrderHistoryResponse(
    string? PreviousStatus,
    string Status,
    Guid? ChangedByAdminUserId,
    DateTimeOffset ChangedAt);

public sealed record CustomerOrderResponse(
    Guid Id,
    string Reference,
    string Status,
    decimal? EstimatedTotalUsd,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ClosedAt,
    Guid? ClosedByAdminUserId,
    IReadOnlyList<CustomerOrderLineResponse> Items,
    IReadOnlyList<CustomerOrderHistoryResponse> History);

public sealed record CustomerOrderListItemResponse(
    Guid Id,
    string Reference,
    string Status,
    decimal? EstimatedTotalUsd,
    int ItemCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ClosedAt,
    Guid? ClosedByAdminUserId,
    IReadOnlyList<CustomerOrderLineResponse> Items);

public sealed record CustomerOrderMetricsResponse(
    DateTimeOffset From,
    DateTimeOffset To,
    int Requests,
    int ClosedRequests,
    int CancelledRequests,
    int OpenRequests,
    decimal? EstimatedValueUsd,
    decimal? ClosedEstimatedValueUsd,
    decimal? CancelledEstimatedValueUsd,
    decimal? CloseRate,
    int ClosedDuringPeriod);

public static class CustomerOrderMappings
{
    public static CustomerOrderLineResponse ToResponse(CustomerOrderLine line) => new(
        line.ProductId,
        line.ProductName,
        line.ProductSlug,
        line.CategoryName,
        line.Quantity,
        line.UnitPriceUsd,
        line.UnitPriceUsd * line.Quantity);

    public static CustomerOrderResponse ToResponse(CustomerOrder order) => new(
        order.Id,
        Reference(order.Id),
        order.Status,
        order.EstimatedTotalUsd,
        Utc(order.CreatedAt),
        order.ClosedAt is null ? null : Utc(order.ClosedAt.Value),
        order.ClosedByAdminUserId,
        order.Lines.OrderBy(line => line.ProductName)
            .Select(ToResponse).ToArray(),
        order.StatusHistory.OrderBy(history => history.ChangedAt)
            .Select(history => new CustomerOrderHistoryResponse(
                history.PreviousStatus,
                history.Status,
                history.ChangedByAdminUserId,
                Utc(history.ChangedAt))).ToArray());

    public static CustomerOrderListItemResponse ToListItem(CustomerOrder order) => new(
        order.Id,
        Reference(order.Id),
        order.Status,
        order.EstimatedTotalUsd,
        order.Lines.Sum(line => line.Quantity),
        Utc(order.CreatedAt),
        order.ClosedAt is null ? null : Utc(order.ClosedAt.Value),
        order.ClosedByAdminUserId,
        order.Lines.OrderBy(line => line.ProductName)
            .Select(ToResponse).ToArray());

    public static string Reference(Guid id) =>
        $"PG-{id.ToString("N")[..8].ToUpperInvariant()}";

    private static DateTimeOffset Utc(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
