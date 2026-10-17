using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Powergy.Api.Models;

namespace Powergy.Api.Contracts;

public sealed record CreateCustomerOrderRequest
{
    [Required]
    public Guid IdempotencyKey { get; init; }

    /// <summary>Tienda que recibe la solicitud. Por defecto, POWERGY.</summary>
    [StringLength(40, MinimumLength = 2)]
    public string? Store { get; init; }

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
    /// Líneas finales a conservar (productId, cantidad y precio final opcional). Si es
    /// <c>null</c> se mantienen todas las líneas actuales. Solo se permite quitar
    /// productos o ajustar cantidades y precios de los ya solicitados, nunca agregar.
    /// </summary>
    [MaxLength(20)]
    public IReadOnlyList<CloseCustomerOrderLineRequest>? Items { get; init; }

    /// <summary>Motivo de cancelación, obligatorio cuando el resultado es "cancelled".</summary>
    [StringLength(40)]
    public string? CancellationReason { get; init; }

    /// <summary>Detalle libre del motivo de cancelación.</summary>
    [StringLength(500)]
    public string? CancellationNote { get; init; }
}

public sealed record CloseCustomerOrderLineRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string ProductId { get; init; }

    [Range(1, 99)]
    public int Quantity { get; init; }

    /// <summary>Precio unitario final fijado por el administrador, si se ajusta.</summary>
    [Range(typeof(decimal), "0", "9999999999.99")]
    public decimal? UnitPriceUsd { get; init; }
}

public sealed record CustomerOrderQueryRequest
{
    /// <summary>Tienda a consultar. Por defecto, POWERGY.</summary>
    [StringLength(40, MinimumLength = 2)]
    public string? Store { get; init; }

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
    /// <summary>Tienda a consultar. Por defecto, POWERGY.</summary>
    [StringLength(40, MinimumLength = 2)]
    public string? Store { get; init; }

    public DateTimeOffset? From { get; init; }
    public DateTimeOffset? To { get; init; }
}

public sealed record CustomerOrderLineResponse(
    string ProductId,
    string ProductName,
    string ProductSlug,
    string CategoryName,
    int Quantity,
    int OriginalQuantity,
    decimal? UnitPriceUsd,
    decimal? LineTotalUsd);

public sealed record CustomerOrderRemovedLineResponse(
    string ProductId,
    string ProductName,
    string ProductSlug,
    string CategoryName,
    int Quantity,
    int OriginalQuantity,
    decimal? UnitPriceUsd,
    DateTimeOffset? RemovedAt);

public sealed record CustomerOrderHistoryResponse(
    string? PreviousStatus,
    string Status,
    Guid? ChangedByAdminUserId,
    DateTimeOffset ChangedAt);

public sealed record CustomerOrderResponse(
    Guid Id,
    string Reference,
    string Status,
    string Store,
    decimal? EstimatedTotalUsd,
    decimal? OriginalEstimatedTotalUsd,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ClosedAt,
    Guid? ClosedByAdminUserId,
    string? CancellationReason,
    string? CancellationNote,
    bool HasUnpricedItems,
    IReadOnlyList<CustomerOrderLineResponse> Items,
    IReadOnlyList<CustomerOrderRemovedLineResponse> RemovedItems,
    IReadOnlyList<CustomerOrderHistoryResponse> History);

public sealed record CustomerOrderListItemResponse(
    Guid Id,
    string Reference,
    string Status,
    string Store,
    decimal? EstimatedTotalUsd,
    decimal? OriginalEstimatedTotalUsd,
    int ItemCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ClosedAt,
    Guid? ClosedByAdminUserId,
    string? CancellationReason,
    bool HasUnpricedItems,
    IReadOnlyList<CustomerOrderLineResponse> Items);

public sealed record CustomerOrderMetricsResponse(
    DateTimeOffset From,
    DateTimeOffset To,
    int Requests,
    int ClosedRequests,
    int CancelledRequests,
    int OpenRequests,
    decimal? EstimatedValueUsd,
    decimal? OriginalEstimatedValueUsd,
    decimal? ClosedEstimatedValueUsd,
    decimal? CancelledEstimatedValueUsd,
    int ClosedWithoutPriceRequests,
    decimal? CloseRate,
    int ClosedDuringPeriod);

public static class CustomerOrderMappings
{
    /// <summary>Un precio nulo, cero o negativo no cuenta como valor de venta.</summary>
    public static bool IsUnpriced(decimal? priceUsd) => priceUsd is null or <= 0;

    public static bool HasUnpricedItems(CustomerOrder order) =>
        order.Lines.Any(line => line.RemovedAt is null && IsUnpriced(line.UnitPriceUsd));

    public static CustomerOrderLineResponse ToResponse(CustomerOrderLine line) => new(
        line.ProductId,
        line.ProductName,
        line.ProductSlug,
        line.CategoryName,
        line.Quantity,
        CantidadOriginal(line),
        line.UnitPriceUsd,
        line.UnitPriceUsd * line.Quantity);

    public static CustomerOrderRemovedLineResponse ToRemovedResponse(CustomerOrderLine line) => new(
        line.ProductId,
        line.ProductName,
        line.ProductSlug,
        line.CategoryName,
        line.Quantity,
        CantidadOriginal(line),
        line.UnitPriceUsd,
        line.RemovedAt is null ? null : Utc(line.RemovedAt.Value));

    /// <summary>
    /// Cantidad pedida originalmente. Las solicitudes escritas por una versión anterior
    /// del API durante la migración pueden tener cero, así que se usa la cantidad actual.
    /// </summary>
    public static int CantidadOriginal(CustomerOrderLine line) =>
        line.OriginalQuantity > 0 ? line.OriginalQuantity : line.Quantity;

    public static CustomerOrderResponse ToResponse(CustomerOrder order) => new(
        order.Id,
        Reference(order),
        order.Status,
        order.Store,
        order.EstimatedTotalUsd,
        order.OriginalEstimatedTotalUsd,
        Utc(order.CreatedAt),
        order.ClosedAt is null ? null : Utc(order.ClosedAt.Value),
        order.ClosedByAdminUserId,
        order.CancellationReason,
        order.CancellationNote,
        HasUnpricedItems(order),
        order.Lines.Where(line => line.RemovedAt is null)
            .OrderBy(line => line.ProductName)
            .Select(ToResponse).ToArray(),
        order.Lines.Where(line => line.RemovedAt is not null)
            .OrderBy(line => line.RemovedAt)
            .Select(ToRemovedResponse).ToArray(),
        order.StatusHistory.OrderBy(history => history.ChangedAt)
            .Select(history => new CustomerOrderHistoryResponse(
                history.PreviousStatus,
                history.Status,
                history.ChangedByAdminUserId,
                Utc(history.ChangedAt))).ToArray());

    public static CustomerOrderListItemResponse ToListItem(CustomerOrder order)
    {
        var activas = order.Lines.Where(line => line.RemovedAt is null).ToArray();
        return new CustomerOrderListItemResponse(
            order.Id,
            Reference(order),
            order.Status,
            order.Store,
            order.EstimatedTotalUsd,
            order.OriginalEstimatedTotalUsd,
            activas.Sum(line => line.Quantity),
            Utc(order.CreatedAt),
            order.ClosedAt is null ? null : Utc(order.ClosedAt.Value),
            order.ClosedByAdminUserId,
            order.CancellationReason,
            activas.Any(line => IsUnpriced(line.UnitPriceUsd)),
            activas.OrderBy(line => line.ProductName).Select(ToResponse).ToArray());
    }

    public static string Reference(CustomerOrder order) =>
        Reference(order.Id, order.Store);

    public static string Reference(Guid id, string store) =>
        $"{StorePrefix(store)}-{id.ToString("N")[..8].ToUpperInvariant()}";

    /// <summary>Prefijo por tienda: POWERGY → PG, nova-moda → NM.</summary>
    private static string StorePrefix(string store)
    {
        if (StoreKeys.Powergy.Equals(store, StringComparison.OrdinalIgnoreCase))
        {
            return "PG";
        }

        var partes = store
            .Split(['-', '_'], StringSplitOptions.RemoveEmptyEntries)
            .Where(parte => char.IsAsciiLetterOrDigit(parte[0]))
            .ToArray();
        var prefijo = partes.Length > 1
            ? string.Concat(partes.Take(3).Select(parte => char.ToUpperInvariant(parte[0])))
            : new string(store.Where(char.IsAsciiLetterOrDigit).ToArray().Take(2).ToArray())
                .ToUpperInvariant();

        return prefijo.Length > 0 ? prefijo : "ST";
    }

    private static DateTimeOffset Utc(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}

/// <summary>Petición paginada del historial de auditoría administrativa.</summary>
public sealed record AdminAuditLogQueryRequest
{
    [StringLength(40)]
    public string? EntityType { get; init; }

    [StringLength(100)]
    public string? EntityId { get; init; }

    [Range(1, 1_000_000)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 20;
}

/// <summary>Entrada de auditoría tal como la devuelve el API.</summary>
public sealed record AdminAuditLogResponse(
    Guid Id,
    Guid? AdminUserId,
    string? AdminEmail,
    string EntityType,
    string EntityId,
    string Action,
    JsonElement Changes,
    DateTimeOffset CreatedAt);
